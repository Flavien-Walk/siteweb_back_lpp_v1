// coreAuth.ts - Inscription, connexion, deconnexion, verification email
// Fonctions d'authentification principales (local / email+password)

import { Request, Response, NextFunction } from 'express';
import Utilisateur from '../../models/Utilisateur.js';
import { genererToken, extraireTokenDuHeader } from '../../utils/tokens.js';
import { blacklistToken } from '../../models/TokenBlacklist.js';
import jwt from 'jsonwebtoken';
import { schemaInscription, schemaConnexion } from '../../utils/validation.js';
import { ErreurAPI } from '../../middlewares/gestionErreurs.js';
import { genererCodeVerification, envoyerEmailVerification } from '../../services/emailService.js';
import { BruteForceGuard } from '../../utils/inMemoryRateLimit.js';

// SEC-AUTH-03: Lockout brute force - 5 echecs = blocage 30 min
const loginGuard = new BruteForceGuard(5, 30 * 60 * 1000);

/**
 * Inscription d'un nouvel utilisateur
 * POST /api/auth/inscription
 */
export const inscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Valider les donnees d'entree
    const donnees = schemaInscription.parse(req.body);

    // Verifier si l'email existe deja
    const utilisateurExistant = await Utilisateur.findOne({ email: donnees.email });

    // SEC-AUTH-02: Message generique pour ne pas reveler le provider
    if (utilisateurExistant) {
      throw new ErreurAPI('Cette adresse email est deja utilisee.', 409);
    }

    // Creer le nouvel utilisateur
    const utilisateur = await Utilisateur.create({
      prenom: donnees.prenom,
      nom: donnees.nom,
      email: donnees.email,
      motDePasse: donnees.motDePasse,
      cguAcceptees: donnees.cguAcceptees,
      provider: 'local',
    });

    // Generer le code de verification email
    const code = genererCodeVerification();
    utilisateur.codeVerification = code;
    utilisateur.codeVerificationExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await utilisateur.save();

    // Envoyer l'email de verification (fire & forget)
    envoyerEmailVerification(utilisateur.email, utilisateur.prenom, code)
      .catch(err => console.error('[EMAIL] Erreur envoi verification:', err));

    // Generer le token JWT
    const token = genererToken(utilisateur);

    // Calculer les permissions (sera vide pour un nouvel utilisateur)
    const effectivePermissions = utilisateur.getEffectivePermissions();
    const isStaff = utilisateur.isStaff();

    // Repondre avec l'utilisateur et le token
    res.status(201).json({
      succes: true,
      message: 'Inscription reussie. Bienvenue !',
      data: {
        utilisateur: {
          id: utilisateur._id,
          prenom: utilisateur.prenom,
          nom: utilisateur.nom,
          email: utilisateur.email,
          avatar: utilisateur.avatar,
          bio: utilisateur.bio,
          role: utilisateur.role,
          statut: utilisateur.statut,
          provider: utilisateur.provider,
          profilPublic: utilisateur.profilPublic ?? true,
          nbAmis: utilisateur.amis?.length || 0,
          emailVerifie: utilisateur.emailVerifie,
          isStaff,
          permissions: effectivePermissions,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Connexion d'un utilisateur
 * POST /api/auth/connexion
 */
export const connexion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Valider les donnees d'entree
    const donnees = schemaConnexion.parse(req.body);

    // SEC-AUTH-03: Verifier lockout avant toute tentative
    const lockoutStatus = loginGuard.checkLockout(donnees.email);
    if (lockoutStatus.locked) {
      const minutesRestantes = Math.ceil((lockoutStatus.remainingMs || 0) / 60000);
      throw new ErreurAPI(
        `Trop de tentatives echouees. Reessayez dans ${minutesRestantes} minute(s).`,
        429
      );
    }

    // Rechercher l'utilisateur avec le mot de passe
    const utilisateur = await Utilisateur.findOne({ email: donnees.email }).select(
      '+motDePasse'
    );

    // Verifier si l'utilisateur existe
    if (!utilisateur) {
      loginGuard.recordFailure(donnees.email);
      throw new ErreurAPI('Email ou mot de passe incorrect.', 401);
    }

    // SEC-AUTH-02: Message generique pour ne pas reveler le provider OAuth
    if (!utilisateur.motDePasse) {
      loginGuard.recordFailure(donnees.email);
      throw new ErreurAPI('Email ou mot de passe incorrect.', 401);
    }

    // Verifier le mot de passe
    const motDePasseValide = await utilisateur.comparerMotDePasse(donnees.motDePasse);
    if (!motDePasseValide) {
      loginGuard.recordFailure(donnees.email);
      throw new ErreurAPI('Email ou mot de passe incorrect.', 401);
    }

    // Connexion reussie: effacer le compteur d'echecs
    loginGuard.clear(donnees.email);

    // Vérifier si le compte est banni
    if (utilisateur.isBanned()) {
      res.status(403).json({
        succes: false,
        message: 'Votre compte a été suspendu définitivement.',
        code: 'ACCOUNT_BANNED',
        reason: utilisateur.banReason || undefined,
      });
      return;
    }

    // Vérifier si le compte est suspendu temporairement
    if (utilisateur.isSuspended()) {
      res.status(403).json({
        succes: false,
        message: 'Votre compte est temporairement suspendu.',
        code: 'ACCOUNT_SUSPENDED',
        reason: utilisateur.suspendReason || undefined,
        suspendedUntil: utilisateur.suspendedUntil?.toISOString(),
      });
      return;
    }

    // Auto-verifier l'email pour les comptes existants (crees avant l'ajout de la verification)
    // Si le compte a plus de 24h et n'est pas verifie, c'est un ancien compte → on le verifie
    if (!utilisateur.emailVerifie && utilisateur.dateCreation) {
      const ageCompte = Date.now() - new Date(utilisateur.dateCreation).getTime();
      if (ageCompte > 24 * 60 * 60 * 1000) {
        utilisateur.emailVerifie = true;
        await utilisateur.save();
      }
    }

    // Generer le token JWT
    const token = genererToken(utilisateur);

    // Calculer les permissions effectives pour les clients (comme dans /moi)
    const effectivePermissions = utilisateur.getEffectivePermissions();
    const isStaff = utilisateur.isStaff();

    // Repondre avec l'utilisateur et le token
    res.status(200).json({
      succes: true,
      message: 'Connexion reussie. Content de te revoir !',
      data: {
        utilisateur: {
          id: utilisateur._id,
          prenom: utilisateur.prenom,
          nom: utilisateur.nom,
          email: utilisateur.email,
          avatar: utilisateur.avatar,
          bio: utilisateur.bio,
          role: utilisateur.role,
          statut: utilisateur.statut,
          provider: utilisateur.provider,
          profilPublic: utilisateur.profilPublic ?? true,
          nbAmis: utilisateur.amis?.length || 0,
          emailVerifie: utilisateur.emailVerifie,
          isStaff,
          permissions: effectivePermissions,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Recuperer l'utilisateur connecte
 * GET /api/auth/moi
 */
export const moi = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // L'utilisateur est deja attache par le middleware verifierJwt
    const utilisateur = req.utilisateur;

    if (!utilisateur) {
      throw new ErreurAPI('Utilisateur non trouve.', 404);
    }

    // IMPORTANT: Vérifier le statut du compte (banni/suspendu)
    // Cet endpoint est utilisé par le mobile pour revalider le statut au foreground
    if (utilisateur.isBanned()) {
      res.status(403).json({
        succes: false,
        message: 'Votre compte a été suspendu définitivement.',
        code: 'ACCOUNT_BANNED',
        reason: utilisateur.banReason || undefined,
      });
      return;
    }

    if (utilisateur.isSuspended()) {
      res.status(403).json({
        succes: false,
        message: 'Votre compte est temporairement suspendu.',
        code: 'ACCOUNT_SUSPENDED',
        reason: utilisateur.suspendReason || undefined,
        suspendedUntil: utilisateur.suspendedUntil?.toISOString(),
      });
      return;
    }

    // Calculer les permissions effectives pour les clients
    const effectivePermissions = utilisateur.getEffectivePermissions();
    const isStaff = utilisateur.isStaff();

    res.status(200).json({
      succes: true,
      data: {
        utilisateur: {
          id: utilisateur._id,
          prenom: utilisateur.prenom,
          nom: utilisateur.nom,
          email: utilisateur.email,
          avatar: utilisateur.avatar,
          bio: utilisateur.bio,
          role: utilisateur.role,
          statut: utilisateur.statut,
          provider: utilisateur.provider,
          profilPublic: utilisateur.profilPublic ?? true,
          dateCreation: utilisateur.dateCreation,
          nbAmis: utilisateur.amis?.length || 0,
          emailVerifie: utilisateur.emailVerifie,
          // Données staff (pour mobile et moderation tool)
          isStaff,
          permissions: effectivePermissions,
          // Statut du compte (pour le mobile)
          accountStatus: 'active',
          // LPP+ (certification)
          isVerified: (utilisateur as any).lppPlus?.status === 'active',
          lppPlus: (utilisateur as any).lppPlus ? {
            status: (utilisateur as any).lppPlus.status || 'inactive',
            currentPeriodEnd: (utilisateur as any).lppPlus.currentPeriodEnd || null,
            cancelAtPeriodEnd: (utilisateur as any).lppPlus.cancelAtPeriodEnd || false,
          } : { status: 'inactive', currentPeriodEnd: null, cancelAtPeriodEnd: false },
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verifier l'email avec un code 6 chiffres
 * POST /api/auth/verifier-email
 */
export const verifierEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string' || code.length !== 6) {
      throw new ErreurAPI('Code invalide. Entrez le code a 6 chiffres recu par email.', 400);
    }

    const utilisateur = await Utilisateur.findById(req.utilisateur!._id)
      .select('+codeVerification +codeVerificationExpire');

    if (!utilisateur) {
      throw new ErreurAPI('Utilisateur non trouve.', 404);
    }

    if (utilisateur.emailVerifie) {
      res.status(200).json({ succes: true, message: 'Email deja verifie.' });
      return;
    }

    if (!utilisateur.codeVerification || !utilisateur.codeVerificationExpire) {
      throw new ErreurAPI('Aucun code en attente. Renvoyez un nouveau code.', 400);
    }

    if (utilisateur.codeVerificationExpire < new Date()) {
      throw new ErreurAPI('Code expire. Renvoyez un nouveau code.', 400);
    }

    if (utilisateur.codeVerification !== code) {
      throw new ErreurAPI('Code incorrect.', 400);
    }

    utilisateur.emailVerifie = true;
    utilisateur.codeVerification = undefined;
    utilisateur.codeVerificationExpire = undefined;
    await utilisateur.save();

    res.status(200).json({
      succes: true,
      message: 'Email verifie avec succes !',
      data: { emailVerifie: true },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Renvoyer un code de verification
 * POST /api/auth/renvoyer-code
 */
export const renvoyerCodeVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const utilisateur = await Utilisateur.findById(req.utilisateur!._id);

    if (!utilisateur) {
      throw new ErreurAPI('Utilisateur non trouve.', 404);
    }

    if (utilisateur.emailVerifie) {
      res.status(200).json({ succes: true, message: 'Email deja verifie.' });
      return;
    }

    const code = genererCodeVerification();
    utilisateur.codeVerification = code;
    utilisateur.codeVerificationExpire = new Date(Date.now() + 10 * 60 * 1000);
    await utilisateur.save();

    await envoyerEmailVerification(utilisateur.email, utilisateur.prenom, code);

    res.status(200).json({
      succes: true,
      message: 'Nouveau code envoye par email.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deconnexion - Invalider le token JWT actuel
 * POST /api/auth/deconnexion
 *
 * Securite:
 * - Blackliste le token actuel dans MongoDB (TTL auto-suppression)
 * - Le token ne pourra plus etre utilise meme s'il n'est pas expire
 */
export const deconnexion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extraireTokenDuHeader(req.headers.authorization);

    if (token) {
      try {
        // Decoder le token pour recuperer la date d'expiration
        const decoded = jwt.decode(token) as { exp?: number; id?: string } | null;
        if (decoded?.exp) {
          const expiresAt = new Date(decoded.exp * 1000);
          const userId = req.utilisateur?._id?.toString() || decoded.id || '';
          await blacklistToken(token, userId, expiresAt);
        }
      } catch (err) {
        // Log l'echec du blacklist — le token reste valide jusqu'a expiration naturelle
        console.error('[AUTH] Echec blacklist token lors de la deconnexion:', err instanceof Error ? err.message : err);
      }
    }

    res.json({
      succes: true,
      message: 'Deconnexion reussie.',
    });
  } catch (error) {
    next(error);
  }
};
