/**
 * Configuration de l'application
 */

// URL de l'API backend
// En développement, utiliser l'IP locale de la machine
// En production, utiliser l'URL de déploiement
export const API_URL = __DEV__
  ? 'https://siteweb-back-lpp-v1.onrender.com/api'
  : 'https://siteweb-back-lpp-v1.onrender.com/api';

// Clés de stockage
export const STORAGE_KEYS = {
  TOKEN: 'lpp_token',
  UTILISATEUR: 'lpp_utilisateur',
};

// Timeouts
export const TIMEOUTS = {
  API: 15000, // 15 secondes
  DEBOUNCE: 300,
};
