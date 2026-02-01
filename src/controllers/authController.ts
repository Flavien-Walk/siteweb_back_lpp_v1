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
          bio: utilisateur.bio,
          role: utilisateur.role,
          statut: utilisateur.statut,
          provider: utilisateur.provider,
          nbAmis: utilisateur.amis?.length || 0,
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
          bio: utilisateur.bio,
          role: utilisateur.role,
          statut: utilisateur.statut,
          provider: utilisateur.provider,
          nbAmis: utilisateur.amis?.length || 0,
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
          bio: utilisateur.bio,
          role: utilisateur.role,
          statut: utilisateur.statut,
          provider: utilisateur.provider,
          dateCreation: utilisateur.dateCreation,
          nbAmis: utilisateur.amis?.length || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Scheme de l'app mobile pour deep linking
const MOBILE_SCHEME = process.env.MOBILE_SCHEME || 'lpp';

/**
 * Detecter si la requete provient d'un client mobile
 */
const isMobileClient = (req: Request): boolean => {
  // Verifier le state OAuth qui contient platform=mobile
  const state = req.query.state as string;
  if (state) {
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      if (stateData.platform === 'mobile') return true;
    } catch {
      // State non parsable, continuer avec d'autres checks
    }
  }

  // Fallback: verifier le User-Agent
  const userAgent = req.headers['user-agent'] || '';
  return /expo|react-native|okhttp/i.test(userAgent);
};

/**
 * Callback OAuth - genere le token et redirige vers le frontend
 * Web: token via cookie httpOnly securise
 * Mobile: token via deep link URL
 */
export const callbackOAuth = (req: Request, res: Response): void => {
  try {
    const utilisateur = req.user as any;

    if (!utilisateur) {
      const isMobile = isMobileClient(req);
      if (isMobile) {
        res.redirect(`${MOBILE_SCHEME}://auth/callback?erreur=oauth_echec`);
      } else {
        res.redirect(`${process.env.CLIENT_URL}/connexion?erreur=oauth_echec`);
      }
      return;
    }

    // Generer le token JWT
    const token = genererToken(utilisateur);

    // Verifier si c'est un client mobile
    if (isMobileClient(req)) {
      // Mobile: redirection via deep link avec token dans l'URL
      // C'est securise car le deep link n'est interceptable que par l'app native
      res.redirect(`${MOBILE_SCHEME}://auth/callback?token=${token}`);
      return;
    }

    // Web: Definir le token dans un cookie httpOnly securise
    res.cookie('oauth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000, // 5 minutes - juste le temps de recuperer le token
      path: '/',
    });

    // Rediriger vers le frontend (le token sera recupere via le cookie)
    res.redirect(`${process.env.CLIENT_URL}/auth/callback`);
  } catch (error) {
    console.error('Erreur callback OAuth:', error);
    const isMobile = isMobileClient(req);
    if (isMobile) {
      res.redirect(`${MOBILE_SCHEME}://auth/callback?erreur=oauth_erreur`);
    } else {
      res.redirect(`${process.env.CLIENT_URL}/connexion?erreur=oauth_erreur`);
    }
  }
};

/**
 * Recuperer le token OAuth depuis le cookie httpOnly
 * GET /api/auth/oauth/token
 */
export const getOAuthToken = (req: Request, res: Response): void => {
  try {
    const token = req.cookies?.oauth_token;

    if (!token) {
      res.status(401).json({
        succes: false,
        message: 'Aucun token OAuth disponible',
      });
      return;
    }

    // Supprimer le cookie apres recuperation (usage unique)
    res.clearCookie('oauth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    res.status(200).json({
      succes: true,
      data: { token },
    });
  } catch (error) {
    console.error('Erreur recuperation token OAuth:', error);
    res.status(500).json({
      succes: false,
      message: 'Erreur lors de la recuperation du token',
    });
  }
};