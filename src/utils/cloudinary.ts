/**
 * Service Cloudinary - Upload et gestion des images
 * Configuration centralisée pour l'upload des avatars et médias
 */

import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

// Validation des variables d'environnement Cloudinary
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Variables d\'environnement Cloudinary manquantes (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)');
  }
  console.warn('⚠️ Variables Cloudinary non configurées - les uploads ne fonctionneront pas');
}

// Configuration Cloudinary
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

/**
 * Upload une image sur Cloudinary
 * @param imageData - Data URL base64 ou URL de l'image
 * @param folder - Dossier de destination sur Cloudinary
 * @param publicId - ID public optionnel (pour mise à jour)
 */
export const uploadImage = async (
  imageData: string,
  folder: string = 'avatars',
  publicId?: string
): Promise<UploadResult> => {
  try {
    const options: Record<string, any> = {
      folder: `lpp/${folder}`,
      resource_type: 'image',
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
      overwrite: true,
    };

    if (publicId) {
      options.public_id = publicId;
    }

    const result: UploadApiResponse = await cloudinary.uploader.upload(imageData, options);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    const cloudinaryError = error as UploadApiErrorResponse;
    console.error('Erreur upload Cloudinary:', cloudinaryError.message || error);
    throw new Error(`Erreur lors de l'upload de l'image: ${cloudinaryError.message || 'Erreur inconnue'}`);
  }
};

/**
 * Upload un avatar utilisateur sur Cloudinary
 * @param imageData - Data URL base64 de l'avatar
 * @param userId - ID de l'utilisateur (utilisé comme public_id)
 */
export const uploadAvatar = async (
  imageData: string,
  userId: string
): Promise<string> => {
  const result = await uploadImage(imageData, 'avatars', `avatar_${userId}`);
  return result.url;
};

/**
 * Supprimer une image de Cloudinary
 * @param publicId - ID public de l'image à supprimer
 */
export const deleteImage = async (publicId: string): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('Erreur suppression Cloudinary:', error);
    return false;
  }
};

/**
 * Générer une URL optimisée pour un avatar
 * @param publicId - ID public de l'image
 * @param size - Taille souhaitée
 */
export const getOptimizedAvatarUrl = (publicId: string, size: number = 200): string => {
  return cloudinary.url(publicId, {
    width: size,
    height: size,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto',
    fetch_format: 'auto',
  });
};

// Types MIME autorisés (whitelist stricte)
const ALLOWED_IMAGE_MIMES = [
  'data:image/jpeg;',
  'data:image/jpg;',
  'data:image/png;',
  'data:image/webp;',
  'data:image/gif;',
  'data:image/heic;',
  'data:image/heif;',
];

const ALLOWED_VIDEO_MIMES = [
  'data:video/mp4;',
  'data:video/quicktime;',
  'data:video/webm;',
];

// Taille max par type (en bytes décodés du base64)
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB

/**
 * Estimer la taille en bytes d'un data URL base64
 */
const estimateBase64Size = (dataUrl: string): number => {
  const base64Part = dataUrl.split(',')[1];
  if (!base64Part) return 0;
  return Math.ceil(base64Part.length * 3 / 4);
};

/**
 * Vérifier si une chaîne est une data URL base64 avec un type MIME image autorisé
 * Inclut validation de taille
 */
export const isBase64DataUrl = (str: string): boolean => {
  if (!ALLOWED_IMAGE_MIMES.some((mime) => str.startsWith(mime))) return false;
  // RED-18: Vérifier la taille
  if (estimateBase64Size(str) > MAX_IMAGE_SIZE) return false;
  return true;
};

/**
 * Vérifier si une chaîne est une data URL base64 avec un type MIME vidéo autorisé
 * Inclut validation de taille
 */
export const isBase64VideoDataUrl = (str: string): boolean => {
  if (!ALLOWED_VIDEO_MIMES.some((mime) => str.startsWith(mime))) return false;
  // RED-18: Vérifier la taille
  if (estimateBase64Size(str) > MAX_VIDEO_SIZE) return false;
  return true;
};

/**
 * Vérifier si une chaîne est une data URL base64 avec un type MIME autorisé (image ou vidéo)
 */
export const isBase64MediaDataUrl = (str: string): boolean => {
  return isBase64DataUrl(str) || isBase64VideoDataUrl(str);
};

/**
 * Vérifier si une chaîne est une URL HTTP(S) valide
 */
export const isHttpUrl = (str: string): boolean => {
  return str.startsWith('http://') || str.startsWith('https://');
};

/**
 * Upload un média (image ou vidéo) pour une publication
 * @param mediaData - Data URL base64 du média
 * @param publicationId - ID de la publication (utilisé comme public_id)
 */
export const uploadPublicationMedia = async (
  mediaData: string,
  publicationId: string
): Promise<string> => {
  try {
    const isVideo = mediaData.startsWith('data:video/');

    const options: Record<string, any> = {
      folder: 'lpp/publications',
      public_id: `pub_${publicationId}_${Date.now()}`,
      resource_type: isVideo ? 'video' : 'image',
      overwrite: true,
    };

    // Transformations différentes pour images et vidéos
    if (!isVideo) {
      options.transformation = [
        { width: 1080, height: 1080, crop: 'limit' },
        { quality: 'auto', fetch_format: 'auto' },
      ];
    } else {
      options.transformation = [
        { width: 1080, height: 1920, crop: 'limit' },
        { quality: 'auto' },
      ];
    }

    const result: UploadApiResponse = await cloudinary.uploader.upload(mediaData, options);
    return result.secure_url;
  } catch (error) {
    const cloudinaryError = error as UploadApiErrorResponse;
    console.error('Erreur upload média Cloudinary:', cloudinaryError.message || error);
    throw new Error(`Erreur lors de l'upload du média: ${cloudinaryError.message || 'Erreur inconnue'}`);
  }
};

/**
 * Upload un seul média pour publication avec retour enrichi (type + thumbnail)
 * @param mediaData - Data URL base64 du média
 * @param publicationId - ID de la publication
 * @param index - Index du média dans le tableau
 */
const uploadSinglePublicationMedia = async (
  mediaData: string,
  publicationId: string,
  index: number
): Promise<MediaUploadResult> => {
  const isVideo = mediaData.startsWith('data:video/');

  const options: Record<string, any> = {
    folder: 'lpp/publications',
    public_id: `pub_${publicationId}_${index}_${Date.now()}`,
    resource_type: isVideo ? 'video' : 'image',
    overwrite: true,
  };

  if (!isVideo) {
    options.transformation = [
      { width: 1080, height: 1080, crop: 'limit' },
      { quality: 'auto', fetch_format: 'auto' },
    ];
  } else {
    options.transformation = [
      { width: 1080, height: 1920, crop: 'limit' },
      { quality: 'auto' },
    ];
  }

  const result: UploadApiResponse = await cloudinary.uploader.upload(mediaData, options);

  // Générer thumbnail pour les vidéos
  let thumbnailUrl: string | undefined;
  if (isVideo && result.public_id) {
    thumbnailUrl = cloudinary.url(result.public_id, {
      resource_type: 'video',
      format: 'jpg',
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'auto' },
        { quality: 'auto' },
        { start_offset: '0' },
      ],
    });
  }

  return {
    type: isVideo ? 'video' : 'image',
    url: result.secure_url,
    thumbnailUrl,
  };
};

/**
 * Upload plusieurs médias (images et vidéos) pour une publication
 * Uploads en parallèle avec limite de concurrence
 * @param mediasData - Tableau de Data URLs base64
 * @param publicationId - ID de la publication
 * @param concurrencyLimit - Nombre d'uploads simultanés max (défaut: 3)
 */
export const uploadPublicationMedias = async (
  mediasData: string[],
  publicationId: string,
  concurrencyLimit: number = 3
): Promise<MediaUploadResult[]> => {
  if (!mediasData.length) {
    return [];
  }

  const results: MediaUploadResult[] = new Array(mediasData.length);
  const errors: Error[] = [];

  // Traitement par lots pour limiter la concurrence
  for (let i = 0; i < mediasData.length; i += concurrencyLimit) {
    const batch = mediasData.slice(i, i + concurrencyLimit);
    const batchPromises = batch.map(async (mediaData, batchIndex) => {
      const actualIndex = i + batchIndex;
      try {
        const result = await uploadSinglePublicationMedia(mediaData, publicationId, actualIndex);
        results[actualIndex] = result;
      } catch (error) {
        errors.push(new Error(`Erreur upload média ${actualIndex + 1}: ${(error as Error).message}`));
      }
    });

    await Promise.all(batchPromises);
  }

  if (errors.length > 0) {
    throw new Error(`Erreur(s) lors de l'upload: ${errors.map(e => e.message).join('; ')}`);
  }

  return results;
};

/**
 * Résultat d'upload pour les médias de publication
 */
export interface MediaUploadResult {
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
}

/**
 * Résultat d'upload pour les stories (avec thumbnail pour vidéos)
 */
export interface StoryUploadResult {
  url: string;
  thumbnailUrl?: string;
}

/**
 * Upload un média (image ou vidéo) pour une story
 * Génère automatiquement une thumbnail pour les vidéos
 * @param mediaData - Data URL base64 du média
 * @param storyId - ID de la story (utilisé comme public_id)
 */
export const uploadStoryMedia = async (
  mediaData: string,
  storyId: string
): Promise<StoryUploadResult> => {
  try {
    const isVideo = mediaData.startsWith('data:video/');

    const options: Record<string, any> = {
      folder: 'lpp/stories',
      public_id: `story_${storyId}_${Date.now()}`,
      resource_type: isVideo ? 'video' : 'image',
      overwrite: true,
    };

    // Transformations pour stories (format 9:16 pour mobile)
    if (!isVideo) {
      options.transformation = [
        { width: 1080, height: 1920, crop: 'limit' },
        { quality: 'auto', fetch_format: 'auto' },
      ];
    } else {
      options.transformation = [
        { width: 1080, height: 1920, crop: 'limit' },
        { quality: 'auto' },
      ];
    }

    const result: UploadApiResponse = await cloudinary.uploader.upload(mediaData, options);

    // Pour les vidéos, générer l'URL de la thumbnail
    let thumbnailUrl: string | undefined;
    if (isVideo && result.public_id) {
      // Cloudinary permet de générer une thumbnail en remplaçant l'extension par .jpg
      // et en ajoutant des transformations
      thumbnailUrl = cloudinary.url(result.public_id, {
        resource_type: 'video',
        format: 'jpg',
        transformation: [
          { width: 400, height: 711, crop: 'fill', gravity: 'auto' },
          { quality: 'auto' },
          { start_offset: '0' }, // Première frame
        ],
      });
    }

    return {
      url: result.secure_url,
      thumbnailUrl,
    };
  } catch (error) {
    const cloudinaryError = error as UploadApiErrorResponse;
    console.error('Erreur upload story Cloudinary:', cloudinaryError.message || error);
    throw new Error(`Erreur lors de l'upload de la story: ${cloudinaryError.message || 'Erreur inconnue'}`);
  }
};

export default cloudinary;
