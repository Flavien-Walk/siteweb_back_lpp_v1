/**
 * Utilitaires de validation pour les modèles Mongoose
 */

/**
 * Valide qu'une chaîne est une URL valide (http, https, ou data URL)
 */
export const isValidUrl = (value: string | null | undefined): boolean => {
  if (!value || value === '') return true; // Champs optionnels autorisés

  // Accepter les data URLs (base64)
  if (value.startsWith('data:')) return true;

  // Accepter les URLs HTTP/HTTPS
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Validateur Mongoose pour les URLs
 */
export const urlValidator = {
  validator: isValidUrl,
  message: 'L\'URL fournie n\'est pas valide',
};

/**
 * Valide les coordonnées GPS
 */
export const isValidLatitude = (value: number): boolean => {
  return value >= -90 && value <= 90;
};

export const isValidLongitude = (value: number): boolean => {
  return value >= -180 && value <= 180;
};

export const latitudeValidator = {
  validator: isValidLatitude,
  message: 'La latitude doit être entre -90 et 90',
};

export const longitudeValidator = {
  validator: isValidLongitude,
  message: 'La longitude doit être entre -180 et 180',
};
