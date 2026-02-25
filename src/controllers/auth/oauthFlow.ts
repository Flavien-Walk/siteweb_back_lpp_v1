// oauthFlow.ts - Flux OAuth (callback, exchange code, get token)
// Gestion du flow OAuth Google/Facebook/Apple (redirect, code temporaire, cookie)

import { Request, Response, NextFunction } from 'express';
import Utilisateur from '../../models/Utilisateur.js';
import { genererToken } from '../../utils/tokens.js';
import {
  validateOAuthState,
  generateTemporaryCode,
  validateTemporaryCode,
  generateLinkToken,
} from '../../utils/oauthStore.js';

// Scheme de l'app mobile pour deep linking
const MOBILE_SCHEME = process.env.MOBILE_SCHEME || 'lpp';

/**
 * Callback OAuth - SECURISE
 *
 * Securite implementee:
 * 1. Validation du state CSRF (nonce stocke cote serveur)
 * 2. Mobile: code temporaire one-time (pas de token dans l'URL)
 * 3. Web: token via cookie httpOnly securise
 *
 * Le mobile doit ensuite appeler /auth/exchange-code pour obtenir le token
 */
export const callbackOAuth = (req: Request, res: Response): void => {
  try {
    // 1. VALIDATION CSRF - Verifier le state OAuth
    const state = req.query.state as string;
    const stateData = state ? validateOAuthState(state) : null;

    if (!stateData) {
      // State invalide ou expire = possible attaque CSRF
      console.warn('[OAuth] State CSRF invalide ou expire');
      res.redirect(`${process.env.CLIENT_URL}/connexion?erreur=oauth_csrf_invalide`);
      return;
    }

    const isMobile = stateData.platform === 'mobile';

    // URL de retour mobile (dynamique depuis Linking.createURL cote Expo)
    // Fallback vers le scheme statique si non fourni
    const mobileBaseUrl = stateData.redirectUrl || `${MOBILE_SCHEME}://auth/callback`;

    // Helper pour construire l'URL mobile avec query params
    const mobileRedirect = (params: string): string => {
      const sep = mobileBaseUrl.includes('?') ? '&' : '?';
      return `${mobileBaseUrl}${sep}${params}`;
    };

    // 2. Gerer link_required (email collision — compte local existant)
    if (!req.user && (req as any).linkData) {
      const { userId, email, googleId, googleName, googleAvatar } = (req as any).linkData;
      const linkToken = generateLinkToken({
        userId,
        email,
        googleId,
        googleName,
        googleAvatar,
      });

      if (isMobile) {
        res.redirect(mobileRedirect(`status=link_required&linkToken=${linkToken}&email=${encodeURIComponent(email)}`));
      } else {
        res.redirect(`${process.env.CLIENT_URL}/auth/link-account?linkToken=${linkToken}&email=${encodeURIComponent(email)}`);
      }
      return;
    }

    const utilisateur = req.user as any;

    // 3. Verifier que l'utilisateur est authentifie
    if (!utilisateur) {
      if (isMobile) {
        res.redirect(mobileRedirect('erreur=oauth_echec'));
      } else {
        res.redirect(`${process.env.CLIENT_URL}/connexion?erreur=oauth_echec`);
      }
      return;
    }

    // 3. Verifier si le compte est banni
    if (utilisateur.isBanned && utilisateur.isBanned()) {
      if (isMobile) {
        res.redirect(mobileRedirect('erreur=compte_banni'));
      } else {
        res.redirect(`${process.env.CLIENT_URL}/connexion?erreur=compte_banni`);
      }
      return;
    }

    // 4. Verifier si le compte est suspendu
    if (utilisateur.isSuspended && utilisateur.isSuspended()) {
      if (isMobile) {
        res.redirect(mobileRedirect('erreur=compte_suspendu'));
      } else {
        res.redirect(`${process.env.CLIENT_URL}/connexion?erreur=compte_suspendu`);
      }
      return;
    }

    // 5. Gerer selon la plateforme
    if (isMobile) {
      // MOBILE: Generer un code temporaire (one-time, 5 min TTL)
      // Le token n'est JAMAIS expose dans l'URL
      const code = generateTemporaryCode(utilisateur._id.toString());
      res.redirect(mobileRedirect(`code=${code}`));
      return;
    }

    // WEB: Definir le token dans un cookie httpOnly securise
    const token = genererToken(utilisateur);
    res.cookie('oauth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000, // 5 minutes
      path: '/',
    });

    res.redirect(`${process.env.CLIENT_URL}/auth/callback`);
  } catch (error) {
    console.error('Erreur callback OAuth:', error);
    res.redirect(`${process.env.CLIENT_URL}/connexion?erreur=oauth_erreur`);
  }
};

/**
 * Echanger un code temporaire contre un token JWT
 * POST /api/auth/exchange-code
 *
 * Securite:
 * - Code usage unique (supprime apres utilisation)
 * - TTL 5 minutes
 * - Pas de token dans l'URL
 */
export const exchangeOAuthCode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      res.status(400).json({
        succes: false,
        message: 'Code manquant ou invalide',
      });
      return;
    }

    // Valider et consommer le code (usage unique)
    const userId = validateTemporaryCode(code);

    if (!userId) {
      res.status(401).json({
        succes: false,
        message: 'Code invalide ou expire',
        code: 'INVALID_CODE',
      });
      return;
    }

    // Recuperer l'utilisateur
    const utilisateur = await Utilisateur.findById(userId);

    if (!utilisateur) {
      res.status(404).json({
        succes: false,
        message: 'Utilisateur non trouve',
      });
      return;
    }

    // Verifier le statut du compte
    if (utilisateur.isBanned()) {
      res.status(403).json({
        succes: false,
        message: 'Votre compte a ete suspendu definitivement.',
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

    // Generer le token JWT
    const token = genererToken(utilisateur);

    // Calculer les permissions
    const effectivePermissions = utilisateur.getEffectivePermissions();
    const isStaff = utilisateur.isStaff();

    res.status(200).json({
      succes: true,
      message: 'Authentification reussie',
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
          preferenceTheme: utilisateur.preferenceTheme || 'light',
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
