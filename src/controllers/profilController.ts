import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Utilisateur from '../models/Utilisateur.js';
import Notification from '../models/Notification.js';
import Publication from '../models/Publication.js';
import Commentaire from '../models/Commentaire.js';
import { Message, Conversation } from '../models/Message.js';
import { ErreurAPI } from '../middlewares/gestionErreurs.js';
import { uploadAvatar, isBase64DataUrl, isHttpUrl } from '../utils/cloudinary.js';

// Avatars par défaut (PNG format pour meilleure compatibilité React Native)
export const AVATARS_DEFAUT = [
  // Shapes - formes géométriques colorées
  'https://api.dicebear.com/7.x/shapes/png?seed=lpp1&backgroundColor=6366f1&size=128',
  'https://api.dicebear.com/7.x/shapes/png?seed=lpp2&backgroundColor=10b981&size=128',
  'https://api.dicebear.com/7.x/shapes/png?seed=lpp3&backgroundColor=f59e0b&size=128',
  'https://api.dicebear.com/7.x/shapes/png?seed=lpp4&backgroundColor=ef4444&size=128',
  'https://api.dicebear.com/7.x/shapes/png?seed=lpp5&backgroundColor=8b5cf6&size=128',
  'https://api.dicebear.com/7.x/shapes/png?seed=lpp6&backgroundColor=06b6d4&size=128',
  // Identicon - motifs symétriques
  'https://api.dicebear.com/7.x/identicon/png?seed=lpp1&backgroundColor=6366f1&size=128',
  'https://api.dicebear.com/7.x/identicon/png?seed=lpp2&backgroundColor=10b981&size=128',
  'https://api.dicebear.com/7.x/identicon/png?seed=lpp3&backgroundColor=f59e0b&size=128',
  'https://api.dicebear.com/7.x/identicon/png?seed=lpp4&backgroundColor=ef4444&size=128',
  // Thumbs - empreintes sympas
  'https://api.dicebear.com/7.x/thumbs/png?seed=lpp1&backgroundColor=6366f1&size=128',
  'https://api.dicebear.com/7.x/thumbs/png?seed=lpp2&backgroundColor=10b981&size=128',
  'https://api.dicebear.com/7.x/thumbs/png?seed=lpp3&backgroundColor=f59e0b&size=128',
  'https://api.dicebear.com/7.x/thumbs/png?seed=lpp4&backgroundColor=ec4899&size=128',
  // Bottts - robots mignons
  'https://api.dicebear.com/7.x/bottts/png?seed=lpp1&backgroundColor=6366f1&size=128',
  'https://api.dicebear.com/7.x/bottts/png?seed=lpp2&backgroundColor=10b981&size=128',
  'https://api.dicebear.com/7.x/bottts/png?seed=lpp3&backgroundColor=f59e0b&size=128',
  'https://api.dicebear.com/7.x/bottts/png?seed=lpp4&backgroundColor=ef4444&size=128',
  // Fun Emoji
  'https://api.dicebear.com/7.x/fun-emoji/png?seed=lpp1&backgroundColor=6366f1&size=128',
  'https://api.dicebear.com/7.x/fun-emoji/png?seed=lpp2&backgroundColor=10b981&size=128',
  'https://api.dicebear.com/7.x/fun-emoji/png?seed=lpp3&backgroundColor=f59e0b&size=128',
  'https://api.dicebear.com/7.x/fun-emoji/png?seed=lpp4&backgroundColor=ec4899&size=128',
  // Lorelei neutral - personnages neutres
  'https://api.dicebear.com/7.x/lorelei-neutral/png?seed=lpp1&backgroundColor=6366f1&size=128',
  'https://api.dicebear.com/7.x/lorelei-neutral/png?seed=lpp2&backgroundColor=10b981&size=128',
  'https://api.dicebear.com/7.x/lorelei-neutral/png?seed=lpp3&backgroundColor=f59e0b&size=128',
  'https://api.dicebear.com/7.x/lorelei-neutral/png?seed=lpp4&backgroundColor=8b5cf6&size=128',
];

// Avatar par défaut pour les nouveaux utilisateurs
export const AVATAR_DEFAUT = 'https://api.dicebear.com/7.x/thumbs/png?seed=default&backgroundColor=6366f1&size=128';

// Schéma de validation pour la mise à jour du profil
const schemaModifierProfil = z.object({
  prenom: z
    .string()
    .min(2, 'Le prénom doit contenir au moins 2 caractères')
    .max(50, 'Le prénom ne peut pas dépasser 50 caractères')
    .trim()
    .optional(),
  nom: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères')
    .trim()
    .optional(),
  email: z
    .string()
    .email('Veuillez fournir un email valide')
    .toLowerCase()
    .trim()
    .optional(),
  bio: z
    .string()
    .max(150, 'La bio ne peut pas dépasser 150 caractères')
    .trim()
    .optional(),
});

// Schéma de validation pour le changement de mot de passe
const schemaChangerMotDePasse = z.object({
  motDePasseActuel: z.string().min(1, 'Le mot de passe actuel est requis'),
  nouveauMotDePasse: z
    .string()
    .min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'
    ),
  confirmationMotDePasse: z.string(),
}).refine((data) => data.nouveauMotDePasse === data.confirmationMotDePasse, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmationMotDePasse'],
});

// Schéma pour la suppression de compte
const schemaSupprimerCompte = z.object({
  motDePasse: z.string().optional(),
  confirmation: z.literal('SUPPRIMER MON COMPTE'),
});

/**
 * PATCH /api/profil
 * Modifier le profil de l'utilisateur
 */
export const modifierProfil = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const donnees = schemaModifierProfil.parse(req.body);
    const userId = req.utilisateur!._id;

    // RED-07: Block direct email change — not allowed without verification
    if (donnees.email) {
      throw new ErreurAPI(
        'Le changement d\'email n\'est pas autorisé via cette route. Contactez le support.',
        403
      );
    }

    // Mettre à jour l'utilisateur (email excluded by guard above)
    const utilisateur = await Utilisateur.findByIdAndUpdate(
      userId,
      { $set: donnees },
      { new: true, runValidators: true }
    );

    if (!utilisateur) {
      throw new ErreurAPI('Utilisateur non trouvé.', 404);
    }

    res.json({
      succes: true,
      message: 'Profil mis à jour avec succès.',
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
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/profil/mot-de-passe
 * Changer le mot de passe
 */
export const changerMotDePasse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const donnees = schemaChangerMotDePasse.parse(req.body);
    const userId = req.utilisateur!._id;

    // Récupérer l'utilisateur avec le mot de passe
    const utilisateur = await Utilisateur.findById(userId).select('+motDePasse');

    if (!utilisateur) {
      throw new ErreurAPI('Utilisateur non trouvé.', 404);
    }

    // Vérifier si l'utilisateur a un compte local
    if (utilisateur.provider !== 'local' && !utilisateur.motDePasse) {
      throw new ErreurAPI(
        `Impossible de changer le mot de passe pour un compte ${utilisateur.provider}.`,
        400
      );
    }

    // Vérifier le mot de passe actuel
    const motDePasseValide = await utilisateur.comparerMotDePasse(donnees.motDePasseActuel);
    if (!motDePasseValide) {
      throw new ErreurAPI('Mot de passe actuel incorrect.', 401);
    }

    // Mettre à jour le mot de passe
    utilisateur.motDePasse = donnees.nouveauMotDePasse;
    await utilisateur.save();

    res.json({
      succes: true,
      message: 'Mot de passe changé avec succès.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/profil
 * Supprimer le compte
 */
export const supprimerCompte = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const donnees = schemaSupprimerCompte.parse(req.body);
    const userId = req.utilisateur!._id;

    // Récupérer l'utilisateur avec le mot de passe
    const utilisateur = await Utilisateur.findById(userId).select('+motDePasse');

    if (!utilisateur) {
      throw new ErreurAPI('Utilisateur non trouvé.', 404);
    }

    // Pour les comptes locaux, vérifier le mot de passe
    if (utilisateur.provider === 'local' && utilisateur.motDePasse) {
      if (!donnees.motDePasse) {
        throw new ErreurAPI('Le mot de passe est requis pour supprimer le compte.', 400);
      }

      const motDePasseValide = await utilisateur.comparerMotDePasse(donnees.motDePasse);
      if (!motDePasseValide) {
        throw new ErreurAPI('Mot de passe incorrect.', 401);
      }
    }

    // Supprimer toutes les données liées à l'utilisateur
    await Promise.all([
      // Notifications (reçues)
      Notification.deleteMany({ destinataire: userId }),
      // Notifications créées par l'utilisateur (data.userId)
      Notification.deleteMany({ 'data.userId': userId.toString() }),
      // Publications de l'utilisateur
      Publication.deleteMany({ auteur: userId, auteurType: 'Utilisateur' }),
      // Commentaires de l'utilisateur
      Commentaire.deleteMany({ auteur: userId }),
      // Retirer les likes de l'utilisateur sur les publications
      Publication.updateMany(
        { likes: userId },
        { $pull: { likes: userId } }
      ),
      // Retirer les likes de l'utilisateur sur les commentaires
      Commentaire.updateMany(
        { likes: userId },
        { $pull: { likes: userId } }
      ),
      // Messages envoyés par l'utilisateur
      Message.deleteMany({ expediteur: userId }),
      // Retirer l'utilisateur des lecteurs de messages
      Message.updateMany(
        { lecteurs: userId },
        { $pull: { lecteurs: userId } }
      ),
    ]);

    // Gérer les conversations
    // Pour les conversations 1-1 où l'utilisateur participe : supprimer
    // Pour les groupes : retirer l'utilisateur des participants
    const conversationsUtilisateur = await Conversation.find({ participants: userId });

    for (const conv of conversationsUtilisateur) {
      if (!conv.estGroupe) {
        // Conversation privée : supprimer la conversation et ses messages
        await Message.deleteMany({ conversation: conv._id });
        await Conversation.findByIdAndDelete(conv._id);
      } else {
        // Groupe : retirer l'utilisateur des participants et admins
        conv.participants = conv.participants.filter(
          (p) => p.toString() !== userId.toString()
        );
        conv.admins = conv.admins?.filter(
          (a) => a.toString() !== userId.toString()
        );
        conv.muetPar = conv.muetPar?.filter(
          (m) => m.toString() !== userId.toString()
        );

        // Si plus de participants, supprimer le groupe
        if (conv.participants.length === 0) {
          await Message.deleteMany({ conversation: conv._id });
          await Conversation.findByIdAndDelete(conv._id);
        } else {
          // Transférer le créateur si nécessaire
          if (conv.createur?.toString() === userId.toString() && conv.participants.length > 0) {
            conv.createur = conv.participants[0];
            if (!conv.admins?.includes(conv.participants[0])) {
              conv.admins = [...(conv.admins || []), conv.participants[0]];
            }
          }
          await conv.save();
        }
      }
    }

    // Retirer l'utilisateur des listes d'amis des autres utilisateurs
    await Utilisateur.updateMany(
      { amis: userId },
      { $pull: { amis: userId } }
    );
    await Utilisateur.updateMany(
      { demandesAmisRecues: userId },
      { $pull: { demandesAmisRecues: userId } }
    );
    await Utilisateur.updateMany(
      { demandesAmisEnvoyees: userId },
      { $pull: { demandesAmisEnvoyees: userId } }
    );

    // Supprimer l'utilisateur
    await Utilisateur.findByIdAndDelete(userId);

    res.json({
      succes: true,
      message: 'Compte supprimé avec succès. Nous sommes tristes de te voir partir.',
    });
  } catch (error) {
    next(error);
  }
};

// Schéma pour l'avatar (accepte URL ou data URL base64)
const schemaModifierAvatar = z.object({
  avatar: z.string().nullable().refine(
    (val) => val === null || val === '' || isBase64DataUrl(val) || isHttpUrl(val),
    { message: 'Avatar doit être une URL valide ou une image base64' }
  ),
});

/**
 * GET /api/profil/avatars
 * Liste des avatars par défaut disponibles
 */
export const getAvatarsDefaut = async (
  _req: Request,
  res: Response
): Promise<void> => {
  res.json({
    succes: true,
    data: {
      avatars: AVATARS_DEFAUT,
    },
  });
};

/**
 * PATCH /api/profil/avatar
 * Modifier l'avatar de l'utilisateur
 * Supporte: URL HTTP(S), data URL base64, null (suppression)
 */
export const modifierAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const donnees = schemaModifierAvatar.parse(req.body);
    const userId = req.utilisateur!._id;

    let avatarUrl: string | null = donnees.avatar;

    // Si c'est une data URL base64, uploader sur Cloudinary
    if (avatarUrl && isBase64DataUrl(avatarUrl)) {
      try {
        avatarUrl = await uploadAvatar(avatarUrl, userId.toString());
        console.log('Avatar uploadé sur Cloudinary:', avatarUrl);
      } catch (uploadError) {
        console.error('Erreur upload Cloudinary:', uploadError);
        throw new ErreurAPI('Erreur lors de l\'upload de l\'image. Veuillez réessayer.', 500);
      }
    }

    const utilisateur = await Utilisateur.findByIdAndUpdate(
      userId,
      { avatar: avatarUrl },
      { new: true }
    );

    if (!utilisateur) {
      throw new ErreurAPI('Utilisateur non trouvé.', 404);
    }

    res.json({
      succes: true,
      message: 'Avatar mis à jour avec succès.',
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
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Schéma pour le statut
const schemaModifierStatut = z.object({
  statut: z.enum(['visiteur', 'entrepreneur']),
});

/**
 * PATCH /api/profil/statut
 * Modifier le statut de l'utilisateur (visiteur ou entrepreneur)
 */
export const modifierStatut = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const donnees = schemaModifierStatut.parse(req.body);
    const userId = req.utilisateur!._id;

    const utilisateur = await Utilisateur.findByIdAndUpdate(
      userId,
      { statut: donnees.statut },
      { new: true }
    );

    if (!utilisateur) {
      throw new ErreurAPI('Utilisateur non trouvé.', 404);
    }

    res.json({
      succes: true,
      message: 'Statut mis à jour avec succès.',
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
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Générer un avatar par défaut basé sur l'ID utilisateur
 */
export const genererAvatarDefaut = (userId: string): string => {
  // Utilise le hash de l'ID pour choisir un avatar de façon déterministe
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATARS_DEFAUT[hash % AVATARS_DEFAUT.length];
};
