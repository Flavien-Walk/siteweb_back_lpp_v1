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
    // Générer le token JWT
    const token = genererToken(utilisateur);

    // Répondre avec l'utilisateur et le token
    res.status(201).json({
      succes: true,
      message: 'Inscription réussie. Bienvenue sur La Première Pierre !',
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
