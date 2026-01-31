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

/**
 * Vérifier si une chaîne est une data URL base64 (image)
 */
export const isBase64DataUrl = (str: string): boolean => {
  return str.startsWith('data:image/');
};

/**
 * Vérifier si une chaîne est une data URL base64 (vidéo)
 */
export const isBase64VideoDataUrl = (str: string): boolean => {
  return str.startsWith('data:video/');
};

/**
 * Vérifier si une chaîne est une data URL base64 (image ou vidéo)
 */
export const isBase64MediaDataUrl = (str: string): boolean => {
  return str.startsWith('data:image/') || str.startsWith('data:video/');
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

export default cloudinary;
