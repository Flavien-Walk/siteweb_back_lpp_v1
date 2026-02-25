// accountLinking.ts - Liaison de comptes OAuth avec comptes locaux
// Confirmation par mot de passe ou code OTP email

import { Request, Response, NextFunction } from 'express';
import Utilisateur from '../../models/Utilisateur.js';
import { genererToken } from '../../utils/tokens.js';
import { ErreurAPI } from '../../middlewares/gestionErreurs.js';
import {
  peekLinkToken,
  validateLinkToken,
  updateLinkTokenOTP,
} from '../../utils/oauthStore.js';
import bcrypt from 'bcryptjs';
import { genererCodeVerification, envoyerEmailVerification } from '../../services/emailService.js';

/**
 * Confirmer la liaison d'un compte Google avec mot de passe
 * POST /api/auth/link/google/confirm
 *
 * L'utilisateur prouve qu'il possede le compte local en fournissant son mot de passe.
 * Le linkToken est consomme (usage unique).
 */
export const confirmLinkWithPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { linkToken, motDePasse } = req.body;

    if (!linkToken || !motDePasse) {
      throw new ErreurAPI('Token de liaison et mot de passe requis.', 400);
    }

    // Valider et consommer le linkToken (single-use)
    const linkData = validateLinkToken(linkToken);
    if (!linkData) {
      throw new ErreurAPI('Lien de liaison expire ou invalide. Reconnecte-toi avec Google.', 400);
    }

    // Recuperer l'utilisateur avec le mot de passe
    const utilisateur = await Utilisateur.findById(linkData.userId).select('+motDePasse');
    if (!utilisateur) {
      throw new ErreurAPI('Compte introuvable.', 404);
    }

    // Verifier ban/suspend
    if (utilisateur.isBanned && utilisateur.isBanned()) {
      throw new ErreurAPI('Ce compte est banni.', 403);
    }
    if (utilisateur.isSuspended && utilisateur.isSuspended()) {
      throw new ErreurAPI('Ce compte est temporairement suspendu.', 403);
    }

    // Verifier que le compte a un mot de passe (pas un compte OAuth pur)
    if (!utilisateur.motDePasse) {
      throw new ErreurAPI('Ce compte n\'a pas de mot de passe. Utilise le code par email.', 400);
    }

    // Verifier le mot de passe
    const motDePasseValide = await bcrypt.compare(motDePasse, utilisateur.motDePasse);
    if (!motDePasseValide) {
      throw new ErreurAPI('Mot de passe incorrect.', 401);
    }

    // Lier le compte Google
    utilisateur.provider = 'google';
    utilisateur.providerId = linkData.googleId;
    utilisateur.emailVerifie = true;
    if (linkData.googleAvatar && !utilisateur.avatar) {
      utilisateur.avatar = linkData.googleAvatar;
    }
    await utilisateur.save();

    // Generer le token JWT
    const token = genererToken(utilisateur);
    const isStaff = utilisateur.isStaff();
    const effectivePermissions = utilisateur.getEffectivePermissions();

    console.log(`[OAuth Link] Compte ${utilisateur.email} lie a Google (via mot de passe)`);

    res.status(200).json({
      succes: true,
      message: 'Compte lie avec succes.',
      data: {
        token,
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
          preferenceTheme: utilisateur.preferenceTheme || 'light',
          nbAmis: utilisateur.amis?.length || 0,
          emailVerifie: utilisateur.emailVerifie,
          isStaff,
          permissions: effectivePermissions,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Envoyer un code OTP par email pour la liaison de compte
 * POST /api/auth/link/google/send-code
 *
 * Genere un code 6 chiffres, le hash avec bcrypt, le stocke sur le linkToken.
 * Le linkToken est lu SANS etre consomme (peek).
 */
export const sendLinkCode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { linkToken } = req.body;

    if (!linkToken) {
      throw new ErreurAPI('Token de liaison requis.', 400);
    }

    // Lire le linkToken SANS le consommer
    const linkData = peekLinkToken(linkToken);
    if (!linkData) {
      throw new ErreurAPI('Lien de liaison expire ou invalide. Reconnecte-toi avec Google.', 400);
    }

    // Recuperer l'utilisateur pour le prenom (email de personnalisation)
    const utilisateur = await Utilisateur.findById(linkData.userId);
    if (!utilisateur) {
      throw new ErreurAPI('Compte introuvable.', 404);
    }

    // Generer le code OTP 6 chiffres
    const code = genererCodeVerification();

    // Hasher le code avec bcrypt
    const otpHash = await bcrypt.hash(code, 10);
    const otpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Stocker le hash sur le linkToken
    const updated = updateLinkTokenOTP(linkToken, otpHash, otpExpire);
    if (!updated) {
      throw new ErreurAPI('Lien de liaison expire. Reconnecte-toi avec Google.', 400);
    }

    // Envoyer l'email avec le code
    await envoyerEmailVerification(linkData.email, utilisateur.prenom, code);

    // Masquer partiellement l'email dans la reponse
    const emailMasque = linkData.email.replace(
      /^(.{2})(.*)(@.*)$/,
      (_, start, middle, end) => start + '*'.repeat(Math.min(middle.length, 5)) + end
    );

    console.log(`[OAuth Link] Code OTP envoye a ${linkData.email} pour liaison Google`);

    res.status(200).json({
      succes: true,
      message: `Code envoye a ${emailMasque}`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verifier le code OTP et completer la liaison du compte Google
 * POST /api/auth/link/google/verify-code
 *
 * Verifie le code OTP hashe, puis lie le compte Google.
 * Le linkToken est consomme apres verification reussie (usage unique).
 */
export const verifyLinkCode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { linkToken, code } = req.body;

    if (!linkToken || !code) {
      throw new ErreurAPI('Token de liaison et code requis.', 400);
    }

    // Valider le format du code (6 chiffres)
    if (!/^\d{6}$/.test(code)) {
      throw new ErreurAPI('Le code doit etre compose de 6 chiffres.', 400);
    }

    // Lire le linkToken SANS le consommer (on le consomme seulement si le code est bon)
    const linkData = peekLinkToken(linkToken);
    if (!linkData) {
      throw new ErreurAPI('Lien de liaison expire ou invalide. Reconnecte-toi avec Google.', 400);
    }

    // Verifier que le OTP a ete envoye
    if (!linkData.otpHash || !linkData.otpExpire) {
      throw new ErreurAPI('Aucun code n\'a ete envoye. Demande un code d\'abord.', 400);
    }

    // Verifier l'expiration du OTP
    if (Date.now() > linkData.otpExpire) {
      throw new ErreurAPI('Le code a expire. Demande un nouveau code.', 400);
    }

    // Verifier le code OTP
    const codeValide = await bcrypt.compare(code, linkData.otpHash);
    if (!codeValide) {
      throw new ErreurAPI('Code incorrect.', 401);
    }

    // Code valide — consommer le linkToken (single-use)
    validateLinkToken(linkToken);

    // Recuperer l'utilisateur
    const utilisateur = await Utilisateur.findById(linkData.userId);
    if (!utilisateur) {
      throw new ErreurAPI('Compte introuvable.', 404);
    }

    // Verifier ban/suspend
    if (utilisateur.isBanned && utilisateur.isBanned()) {
      throw new ErreurAPI('Ce compte est banni.', 403);
    }
    if (utilisateur.isSuspended && utilisateur.isSuspended()) {
      throw new ErreurAPI('Ce compte est temporairement suspendu.', 403);
    }

    // Lier le compte Google
    utilisateur.provider = 'google';
    utilisateur.providerId = linkData.googleId;
    utilisateur.emailVerifie = true;
    if (linkData.googleAvatar && !utilisateur.avatar) {
      utilisateur.avatar = linkData.googleAvatar;
    }
    await utilisateur.save();

    // Generer le token JWT
    const token = genererToken(utilisateur);
    const isStaff = utilisateur.isStaff();
    const effectivePermissions = utilisateur.getEffectivePermissions();

    console.log(`[OAuth Link] Compte ${utilisateur.email} lie a Google (via code OTP)`);

    res.status(200).json({
      succes: true,
      message: 'Compte lie avec succes.',
      data: {
        token,
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
          preferenceTheme: utilisateur.preferenceTheme || 'light',
          nbAmis: utilisateur.amis?.length || 0,
          emailVerifie: utilisateur.emailVerifie,
          isStaff,
          permissions: effectivePermissions,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
