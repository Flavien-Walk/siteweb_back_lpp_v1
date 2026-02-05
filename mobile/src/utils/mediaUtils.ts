/**
 * Utilitaires pour la gestion des médias
 * Fonctions pures extraites pour éviter la recréation à chaque render
 */

/**
 * Génère l'URL thumbnail Cloudinary pour une vidéo
 * @param videoUrl - URL de la vidéo Cloudinary
 * @returns URL de la thumbnail au format JPG
 */
export const getVideoThumbnail = (videoUrl: string): string => {
  // Cloudinary video URL: https://res.cloudinary.com/xxx/video/upload/v123/folder/file.mp4
  // Thumbnail URL: https://res.cloudinary.com/xxx/video/upload/so_0,w_600,h_600,c_limit/v123/folder/file.jpg
  if (videoUrl.includes('cloudinary.com') && videoUrl.includes('/video/upload/')) {
    return videoUrl
      .replace('/video/upload/', '/video/upload/so_0,w_600,h_600,c_limit,f_jpg/')
      .replace(/\.(mp4|mov|webm|avi)$/i, '.jpg');
  }
  // Fallback: retourner l'URL originale (ne marchera pas mais évite le crash)
  return videoUrl;
};

/**
 * Vérifie si une URL pointe vers une vidéo
 * @param url - URL du média
 * @returns true si c'est une vidéo
 */
export const isVideoUrl = (url: string): boolean => {
  return url.includes('.mp4') ||
    url.includes('.mov') ||
    url.includes('.webm') ||
    url.includes('video');
};
