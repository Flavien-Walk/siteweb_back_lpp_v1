import { Request, Response, NextFunction } from 'express';
import Utilisateur from '../models/Utilisateur.js';
import { genererToken } from '../utils/tokens.js';
import { schemaInscription, schemaConnexion } from '../utils/validation.js';
import { ErreurAPI } from '../middlewares/gestionErreurs.js';
import {
  validateOAuthState,
  generateTemporaryCode,
  validateTemporaryCode,
} from '../utils/oauthStore.js';
import { getLatestSanctionNotification } from '../utils/sanctionNotification.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';

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
          // Données staff (cohérence avec /connexion et /moi)
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
          // Données staff (pour que le mobile ait les permissions immédiatement)
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
          // Données staff (pour mobile et moderation tool)
          isStaff,
          permissions: effectivePermissions,
          // Statut du compte (pour le mobile)
          accountStatus: 'active',
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
    const utilisateur = req.user as any;

    // 2. Verifier que l'utilisateur est authentifie
    if (!utilisateur) {
      if (isMobile) {
        res.redirect(`${MOBILE_SCHEME}://auth/callback?erreur=oauth_echec`);
      } else {
        res.redirect(`${process.env.CLIENT_URL}/connexion?erreur=oauth_echec`);
      }
      return;
    }

    // 3. Verifier si le compte est banni
    if (utilisateur.isBanned && utilisateur.isBanned()) {
      if (isMobile) {
        res.redirect(`${MOBILE_SCHEME}://auth/callback?erreur=compte_banni`);
      } else {
        res.redirect(`${process.env.CLIENT_URL}/connexion?erreur=compte_banni`);
      }
      return;
    }

    // 4. Verifier si le compte est suspendu
    if (utilisateur.isSuspended && utilisateur.isSuspended()) {
      if (isMobile) {
        res.redirect(`${MOBILE_SCHEME}://auth/callback?erreur=compte_suspendu`);
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
      res.redirect(`${MOBILE_SCHEME}://auth/callback?code=${code}`);
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
          nbAmis: utilisateur.amis?.length || 0,
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

/**
 * Recuperer les informations de sanction d'un utilisateur
 * GET /api/auth/sanction-info
 *
 * Accessible meme si le compte est banni/suspendu (pas de checkUserStatus)
 * Permet au client mobile d'afficher la raison et le post concerne
 */
export const getSanctionInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const utilisateur = req.utilisateur!;

    // Determiner le statut de restriction
    const isBanned = utilisateur.isBanned();
    const isSuspended = utilisateur.isSuspended();

    if (!isBanned && !isSuspended) {
      // Pas de sanction active
      res.status(200).json({
        succes: true,
        data: {
          isRestricted: false,
        },
      });
      return;
    }

    // Recuperer la derniere notification de sanction
    const notification = await getLatestSanctionNotification(utilisateur._id);

    // Construire la reponse
    const sanctionInfo: Record<string, unknown> = {
      isRestricted: true,
      type: isBanned ? 'ACCOUNT_BANNED' : 'ACCOUNT_SUSPENDED',
      reason: isBanned ? utilisateur.banReason : utilisateur.suspendReason,
      bannedAt: isBanned ? utilisateur.bannedAt?.toISOString() : undefined,
      suspendedUntil: isSuspended ? utilisateur.suspendedUntil?.toISOString() : undefined,
    };

    // Ajouter les infos de la notification si presente
    if (notification) {
      sanctionInfo.notificationId = notification._id;
      sanctionInfo.notificationDate = notification.dateCreation;

      // Ajouter les infos du staff qui a pris la decision
      if (notification.data?.actorRole) {
        sanctionInfo.actorRole = notification.data.actorRole;
      }

      // Ajouter le snapshot du post si disponible
      if (notification.data?.postSnapshot) {
        sanctionInfo.postSnapshot = notification.data.postSnapshot;
        sanctionInfo.postId = notification.data.postId;
      }
    }

    res.status(200).json({
      succes: true,
      data: sanctionInfo,
    });
  } catch (error) {
    next(error);
  }
};

// Mapping des roles pour affichage
const roleLabels: Record<string, string> = {
  user: 'Utilisateur',
  modo_test: 'Moderateur',
  modo: 'Moderateur',
  admin_modo: 'Administrateur',
  super_admin: 'Fondateur',
  admin: 'Administrateur',
};

/**
 * Mapping AuditLog action -> type court pour mobile
 */
const auditActionToSanctionType: Record<string, string> = {
  'user:warn': 'warn',
  'user:warn_remove': 'unwarn',
  'user:suspend': 'suspend',
  'user:unsuspend': 'unsuspend',
  'user:ban': 'ban',
  'user:unban': 'unban',
};

/**
 * Mapping type court -> titre lisible
 */
const sanctionTypeTitles: Record<string, string> = {
  ban: 'Bannissement',
  unban: 'Compte retabli',
  suspend: 'Suspension',
  unsuspend: 'Suspension levee',
  warn: 'Avertissement',
  unwarn: 'Avertissement retire',
};

/**
 * Recuperer l'historique des sanctions de l'utilisateur
 * GET /api/auth/my-sanctions
 * Accessible meme si banni/suspendu (pas de checkUserStatus)
 *
 * Combine les donnees de:
 * 1. Notifications de type sanction (nouveau systeme)
 * 2. AuditLog (historique complet des sanctions)
 */
export const getMySanctions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const utilisateur = req.utilisateur!;

    // === 1. Recuperer depuis les Notifications (nouveau systeme) ===
    const sanctionNotifTypes = [
      'sanction_ban',
      'sanction_suspend',
      'sanction_warn',
      'sanction_unban',
      'sanction_unsuspend',
      'sanction_unwarn',
    ];

    const notifications = await Notification.find({
      destinataire: utilisateur._id,
      type: { $in: sanctionNotifTypes },
    })
      .sort({ dateCreation: -1 })
      .lean();

    // Transformer les notifications
    const sanctionsFromNotifications = notifications.map((notif) => {
      const shortType = notif.type.replace('sanction_', '');
      return {
        type: shortType,
        createdAt: notif.dateCreation,
        titre: notif.titre,
        message: notif.message,
        reason: notif.data?.reason || null,
        actorRole: notif.data?.actorRole || null,
        suspendedUntil: notif.data?.suspendedUntil || null,
        postSnapshot: notif.data?.postSnapshot || null,
        postId: notif.data?.postId || null,
        source: 'notification' as const,
      };
    });

    // === 2. Recuperer depuis l'AuditLog (historique complet) ===
    const auditActions = [
      'user:warn',
      'user:warn_remove',
      'user:suspend',
      'user:unsuspend',
      'user:ban',
      'user:unban',
    ];

    const auditLogs = await AuditLog.find({
      targetType: 'utilisateur',
      targetId: utilisateur._id,
      action: { $in: auditActions },
    })
      .sort({ dateCreation: -1 })
      .lean();

    // Transformer les audit logs
    const sanctionsFromAuditLog = auditLogs.map((log) => {
      const shortType = auditActionToSanctionType[log.action] || 'warn';
      const titre = sanctionTypeTitles[shortType] || 'Sanction';

      // Generer un message descriptif
      let message = titre;
      if (log.reason) {
        message += ` - Raison: ${log.reason}`;
      }

      return {
        type: shortType,
        createdAt: log.dateCreation,
        titre,
        message,
        reason: log.reason || null,
        actorRole: log.actorRole || null,
        suspendedUntil: log.metadata?.suspendedUntil as string || null,
        postSnapshot: log.metadata?.postSnapshot as { contenu?: string; mediaUrl?: string } || null,
        postId: log.metadata?.postId as string || null,
        source: 'auditlog' as const,
      };
    });

    // === 3. Fusionner et dedupliquer ===
    // Type pour une sanction avec source
    type SanctionWithSource = {
      type: string;
      createdAt: Date;
      titre: string;
      message: string;
      reason: string | null;
      actorRole: string | null;
      suspendedUntil: string | null;
      postSnapshot: { contenu?: string; mediaUrl?: string } | null;
      postId: string | null;
      source: 'notification' | 'auditlog';
    };

    // On utilise une Map avec cle basee sur (type + date arrondie a la MINUTE)
    // pour eviter les doublons entre notifications et audit logs
    // Une sanction du meme type dans la meme minute = probablement la meme sanction
    const sanctionsMap = new Map<string, SanctionWithSource>();

    // D'abord ajouter les notifications (prioritaires car plus detaillees)
    for (const s of sanctionsFromNotifications) {
      // Tronquer a la minute (slice(0, 16) = YYYY-MM-DDTHH:MM)
      const dateKey = new Date(s.createdAt).toISOString().slice(0, 16);
      const key = `${s.type}-${dateKey}`;
      sanctionsMap.set(key, s as SanctionWithSource);
    }

    // Ensuite ajouter les audit logs seulement si pas deja present
    for (const s of sanctionsFromAuditLog) {
      const dateKey = new Date(s.createdAt).toISOString().slice(0, 16);
      const key = `${s.type}-${dateKey}`;
      if (!sanctionsMap.has(key)) {
        sanctionsMap.set(key, s);
      }
    }

    // Convertir en array et trier par date decroissante
    const sanctions = Array.from(sanctionsMap.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(({ source, ...rest }) => rest); // Retirer le champ source avant envoi

    res.status(200).json({
      succes: true,
      data: {
        sanctions,
        total: sanctions.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Recuperer le statut de moderation de l'utilisateur connecte
 * GET /api/auth/moderation-status
 *
 * Accessible meme si banni/suspendu (pas de checkUserStatus)
 * Permet au mobile d'afficher le compteur d'avertissements (ex: "2/3")
 *
 * Retourne:
 * - status: 'active' | 'suspended' | 'banned'
 * - warnCountSinceLastAutoSuspension: nombre de warnings depuis derniere auto-suspension
 * - warningsBeforeNextSanction: nombre de warnings restants avant prochaine sanction auto (3 - count)
 * - autoSuspensionsCount: 0 si jamais auto-suspendu, 1 si deja auto-suspendu
 * - nextAutoAction: 'suspend' si autoSuspensionsCount=0, 'ban' si autoSuspensionsCount=1
 */
export const getModerationStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const utilisateur = req.utilisateur!;

    // Determiner le statut actuel
    let status: 'active' | 'suspended' | 'banned' = 'active';
    if (utilisateur.isBanned()) {
      status = 'banned';
    } else if (utilisateur.isSuspended()) {
      status = 'suspended';
    }

    // Recuperer les donnees de moderation
    const moderation = utilisateur.moderation || {
      warnCountSinceLastAutoSuspension: 0,
      autoSuspensionsCount: 0,
    };

    const warnCount = moderation.warnCountSinceLastAutoSuspension || 0;
    const autoSuspensions = moderation.autoSuspensionsCount || 0;

    // Calculer le nombre de warnings restants avant prochaine sanction auto
    const WARNINGS_BEFORE_AUTO_SUSPENSION = 3;
    const warningsBeforeNextSanction = Math.max(0, WARNINGS_BEFORE_AUTO_SUSPENSION - warnCount);

    // Determiner quelle sera la prochaine action auto
    // Si pas encore auto-suspendu (0), prochaine action = suspend
    // Si deja auto-suspendu (1), prochaine action = ban
    const nextAutoAction = autoSuspensions === 0 ? 'suspend' : 'ban';

    res.status(200).json({
      succes: true,
      data: {
        status,
        warnCountSinceLastAutoSuspension: warnCount,
        warningsBeforeNextSanction,
        autoSuspensionsCount: autoSuspensions,
        nextAutoAction,
        // Infos supplementaires si suspendu
        ...(status === 'suspended' && {
          suspendedUntil: utilisateur.suspendedUntil?.toISOString(),
          suspendReason: utilisateur.suspendReason,
        }),
        // Infos supplementaires si banni
        ...(status === 'banned' && {
          bannedAt: utilisateur.bannedAt?.toISOString(),
          banReason: utilisateur.banReason,
        }),
      },
    });
  } catch (error) {
    next(error);
  }
};