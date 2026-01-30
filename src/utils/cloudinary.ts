/**
 * Service Cloudinary - Upload et gestion des images
 * Configuration centralisée pour l'upload des avatars et médias
 */

import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dbhj82fxc',
  api_key: process.env.CLOUDINARY_API_KEY || '121574816385623',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'gNASnDK5Ivxp9BZpni7SNrq_t24',
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
 * Vérifier si une chaîne est une data URL base64
 */
export const isBase64DataUrl = (str: string): boolean => {
  return str.startsWith('data:image/');
};

/**
 * Vérifier si une chaîne est une URL HTTP(S) valide
 */
export const isHttpUrl = (str: string): boolean => {
  return str.startsWith('http://') || str.startsWith('https://');
};

export default cloudinary;
