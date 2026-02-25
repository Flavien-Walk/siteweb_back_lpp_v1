/**
 * Profil Controller — Avatar Functions
 * getAvatarsDefaut, modifierAvatar, AVATARS_DEFAUT, AVATAR_DEFAUT, genererAvatarDefaut
 */
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Utilisateur from '../../models/Utilisateur.js';
import { ErreurAPI } from '../../middlewares/gestionErreurs.js';
import { uploadAvatar, isBase64DataUrl, isHttpUrl } from '../../utils/cloudinary.js';

// Avatars par defaut (PNG format pour meilleure compatibilite React Native)
export const AVATARS_DEFAUT = [
  // Shapes - formes geometriques colorees
  'https://api.dicebear.com/7.x/shapes/png?seed=lpp1&backgroundColor=6366f1&size=128',
  'https://api.dicebear.com/7.x/shapes/png?seed=lpp2&backgroundColor=10b981&size=128',
  'https://api.dicebear.com/7.x/shapes/png?seed=lpp3&backgroundColor=f59e0b&size=128',
  'https://api.dicebear.com/7.x/shapes/png?seed=lpp4&backgroundColor=ef4444&size=128',
  'https://api.dicebear.com/7.x/shapes/png?seed=lpp5&backgroundColor=8b5cf6&size=128',
  'https://api.dicebear.com/7.x/shapes/png?seed=lpp6&backgroundColor=06b6d4&size=128',
  // Identicon - motifs symetriques
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

// Avatar par defaut pour les nouveaux utilisateurs
export const AVATAR_DEFAUT = 'https://api.dicebear.com/7.x/thumbs/png?seed=default&backgroundColor=6366f1&size=128';

/**
 * Generer un avatar par defaut base sur l'ID utilisateur
 */
export const genererAvatarDefaut = (userId: string): string => {
  // Utilise le hash de l'ID pour choisir un avatar de facon deterministe
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATARS_DEFAUT[hash % AVATARS_DEFAUT.length];
};

// Schema pour l'avatar (accepte URL ou data URL base64)
const schemaModifierAvatar = z.object({
  avatar: z.string().nullable().refine(
    (val) => val === null || val === '' || isBase64DataUrl(val) || isHttpUrl(val),
    { message: 'Avatar doit être une URL valide ou une image base64' }
  ),
});

/**
 * GET /api/profil/avatars
 * Liste des avatars par defaut disponibles
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
          avatar: utilisateur.avatar,
          bio: utilisateur.bio,
          statut: utilisateur.statut,
          provider: utilisateur.provider,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
