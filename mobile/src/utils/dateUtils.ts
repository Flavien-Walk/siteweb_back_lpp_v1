/**
 * Utilitaires de formatage de date
 * Extraits pour éviter la recréation à chaque render
 */

/**
 * Formate une date en texte relatif (Il y a X min/h/j) ou date complète
 * @param dateStr - Date ISO string
 * @returns String formatée
 */
export const formatRelativeDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'A l\'instant';
  if (minutes < 60) return `Il y a ${minutes}min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days < 7) return `Il y a ${days}j`;
  return date.toLocaleDateString('fr-FR');
};

/**
 * Formate le temps vidéo en mm:ss
 * @param millis - Temps en millisecondes
 * @returns String formatée mm:ss
 */
export const formatVideoTime = (millis: number): string => {
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};
