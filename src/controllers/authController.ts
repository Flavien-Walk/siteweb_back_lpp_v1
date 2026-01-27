import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import Utilisateur from '../models/Utilisateur.js';
import { genererToken } from '../utils/tokens.js';
import { schemaInscription, schemaConnexion } from '../utils/validation.js';
import { ErreurAPI } from '../middlewares/gestionErreurs.js';
import { envoyerEmailVerification } from '../services/email.js';

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
    // Valider les données d'entrée
    const donnees = schemaInscription.parse(req.body);

    // Vérifier si l'email existe déjà
    const utilisateurExistant = await Utilisateur.findOne({ email: donnees.email });

    if (utilisateurExistant) {
      if (utilisateurExistant.provider !== 'local') {
        throw new ErreurAPI(
          `Un compte existe déjà avec cet email via ${utilisateurExistant.provider}. Veuillez vous connecter avec ${utilisateurExistant.provider} ou utiliser un autre email.`,
          409
        );
      }
      throw new ErreurAPI('Cette adresse email est déjà utilisée.', 409);
    }

    // Créer le nouvel utilisateur
    const utilisateur = await Utilisateur.create({
      prenom: donnees.prenom,
      nom: donnees.nom,
      email: donnees.email,
      motDePasse: donnees.motDePasse,
      cguAcceptees: donnees.cguAcceptees,
      provider: 'local',
    });

    // Générer et envoyer l'email de vérification
    const tokenVerification = utilisateur.genererTokenVerificationEmail();
    await utilisateur.save({ validateBeforeSave: false });

    try {
      await envoyerEmailVerification(utilisateur.email, utilisateur.prenom, tokenVerification);
    } catch (erreurEmail) {
      console.error(`[EMAIL] Échec envoi vérification pour ${utilisateur.email}:`, erreurEmail);
    }

    // Générer le token JWT
    const token = genererToken(utilisateur);

    // Répondre avec l'utilisateur et le token
    res.status(201).json({
      succes: true,
      message: 'Inscription réussie. Un email de vérification a été envoyé.',
      data: {
        utilisateur: {
          id: utilisateur._id,
          prenom: utilisateur.prenom,
          nom: utilisateur.nom,
          email: utilisateur.email,
          avatar: utilisateur.avatar,
          provider: utilisateur.provider,
          emailVerifie: utilisateur.emailVerifie,
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
    // Valider les données d'entrée
    const donnees = schemaConnexion.parse(req.body);

    // Rechercher l'utilisateur avec le mot de passe
    const utilisateur = await Utilisateur.findOne({ email: donnees.email }).select(
      '+motDePasse'
    );

    // Vérifier si l'utilisateur existe
    if (!utilisateur) {
      throw new ErreurAPI('Email ou mot de passe incorrect.', 401);
    }

    // Vérifier si l'utilisateur a un mot de passe (compte local ou lié)
    if (!utilisateur.motDePasse) {
      throw new ErreurAPI(
        `Ce compte utilise la connexion ${utilisateur.provider}. Veuillez utiliser ce mode de connexion.`,
        400
      );
    }

    // Vérifier le mot de passe
    const motDePasseValide = await utilisateur.comparerMotDePasse(donnees.motDePasse);
    if (!motDePasseValide) {
      throw new ErreurAPI('Email ou mot de passe incorrect.', 401);
    }

    // Générer le token JWT
    const token = genererToken(utilisateur);

    // Répondre avec l'utilisateur et le token
    res.status(200).json({
      succes: true,
      message: 'Connexion réussie. Content de te revoir !',
      data: {
        utilisateur: {
          id: utilisateur._id,
          prenom: utilisateur.prenom,
          nom: utilisateur.nom,
          email: utilisateur.email,
          avatar: utilisateur.avatar,
          provider: utilisateur.provider,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer l'utilisateur connecté
 * GET /api/auth/moi
 */
export const moi = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // L'utilisateur est déjà attaché par le middleware verifierJwt
    const utilisateur = req.utilisateur;

    if (!utilisateur) {
      throw new ErreurAPI('Utilisateur non trouvé.', 404);
    }

    res.status(200).json({
      succes: true,
      data: {
        utilisateur: {
          id: utilisateur._id,
          prenom: utilisateur.prenom,
          nom: utilisateur.nom,
          email: utilisateur.email,
          avatar: utilisateur.avatar,
          provider: utilisateur.provider,
          emailVerifie: utilisateur.emailVerifie,
          dateCreation: utilisateur.dateCreation,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Vérifier l'email via token
 * POST /api/auth/verify-email
 */
export const verifierEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      throw new ErreurAPI('Token de vérification manquant.', 400);
    }

    // Hasher le token reçu pour le comparer à celui en DB
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const utilisateur = await Utilisateur.findOne({
      emailVerificationToken: tokenHash,
      emailVerificationExpires: { $gt: new Date() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!utilisateur) {
      throw new ErreurAPI('Token invalide ou expiré.', 400);
    }

    // Marquer email comme vérifié et supprimer le token
    utilisateur.emailVerifie = true;
    utilisateur.emailVerificationToken = undefined;
    utilisateur.emailVerificationExpires = undefined;
    await utilisateur.save({ validateBeforeSave: false });

    res.status(200).json({
      succes: true,
      message: 'Adresse email vérifiée avec succès.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Renvoyer l'email de vérification
 * POST /api/auth/resend-verification
 */
export const renvoyerVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      throw new ErreurAPI('Email requis.', 400);
    }

    // Message générique pour ne pas révéler si l'email existe
    const messageSucces = 'Si un compte existe avec cet email, un nouveau lien de vérification a été envoyé.';

    const utilisateur = await Utilisateur.findOne({ email: email.toLowerCase() });

    if (!utilisateur || utilisateur.emailVerifie) {
      // Ne pas révéler si le compte existe ou est déjà vérifié
      res.status(200).json({ succes: true, message: messageSucces });
      return;
    }

    const tokenVerification = utilisateur.genererTokenVerificationEmail();
    await utilisateur.save({ validateBeforeSave: false });

    try {
      await envoyerEmailVerification(utilisateur.email, utilisateur.prenom, tokenVerification);
    } catch {
      throw new ErreurAPI('Impossible d\'envoyer l\'email. Réessayez plus tard.', 500);
    }

    res.status(200).json({ succes: true, message: messageSucces });
  } catch (error) {
    next(error);
  }
};

/**
 * Callback OAuth - génère le token et redirige vers le frontend
 */
export const callbackOAuth = (req: Request, res: Response): void => {
  try {
    const utilisateur = req.user as any;

    if (!utilisateur) {
      res.redirect(`${process.env.CLIENT_URL}/connexion?erreur=oauth_echec`);
      return;
    }

    // Générer le token JWT
    const token = genererToken(utilisateur);

    // Rediriger vers le frontend avec le token
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
  } catch (error) {
    console.error('Erreur callback OAuth:', error);
    res.redirect(`${process.env.CLIENT_URL}/connexion?erreur=oauth_erreur`);
  }
};
