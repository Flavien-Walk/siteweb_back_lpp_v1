import { Request, Response, NextFunction } from 'express';
import Utilisateur from '../models/Utilisateur.js';
import { genererToken } from '../utils/tokens.js';
import { schemaInscription, schemaConnexion } from '../utils/validation.js';
import { ErreurAPI } from '../middlewares/gestionErreurs.js';

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

    if (utilisateurExistant) {
      if (utilisateurExistant.provider !== 'local') {
        throw new ErreurAPI(
          `Un compte existe deja avec cet email via ${utilisateurExistant.provider}. Veuillez vous connecter avec ${utilisateurExistant.provider} ou utiliser un autre email.`,
          409
        );
      }
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

    // Generer le token JWT
    const token = genererToken(utilisateur);

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
          role: utilisateur.role,
          statut: utilisateur.statut,
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

    // Rechercher l'utilisateur avec le mot de passe
    const utilisateur = await Utilisateur.findOne({ email: donnees.email }).select(
      '+motDePasse'
    );

    // Verifier si l'utilisateur existe
    if (!utilisateur) {
      throw new ErreurAPI('Email ou mot de passe incorrect.', 401);
    }

    // Verifier si l'utilisateur a un mot de passe (compte local ou lie)
    if (!utilisateur.motDePasse) {
      throw new ErreurAPI(
        `Ce compte utilise la connexion ${utilisateur.provider}. Veuillez utiliser ce mode de connexion.`,
        400
      );
    }

    // Verifier le mot de passe
    const motDePasseValide = await utilisateur.comparerMotDePasse(donnees.motDePasse);
    if (!motDePasseValide) {
      throw new ErreurAPI('Email ou mot de passe incorrect.', 401);
    }

    // Generer le token JWT
    const token = genererToken(utilisateur);

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
          role: utilisateur.role,
          statut: utilisateur.statut,
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

    res.status(200).json({
      succes: true,
      data: {
        utilisateur: {
          id: utilisateur._id,
          prenom: utilisateur.prenom,
          nom: utilisateur.nom,
          email: utilisateur.email,
          avatar: utilisateur.avatar,
          role: utilisateur.role,
          statut: utilisateur.statut,
          provider: utilisateur.provider,
          dateCreation: utilisateur.dateCreation,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Callback OAuth - genere le token et redirige vers le frontend
 */
export const callbackOAuth = (req: Request, res: Response): void => {
  try {
    const utilisateur = req.user as any;

    if (!utilisateur) {
      res.redirect(`${process.env.CLIENT_URL}/connexion?erreur=oauth_echec`);
      return;
    }

    // Generer le token JWT
    const token = genererToken(utilisateur);

    // Rediriger vers le frontend avec le token
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
  } catch (error) {
    console.error('Erreur callback OAuth:', error);
    res.redirect(`${process.env.CLIENT_URL}/connexion?erreur=oauth_erreur`);
  }
};