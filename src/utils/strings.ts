/**
 * Utilitaires chaines de caracteres partages
 */

/**
 * Echappe les caracteres speciaux regex pour eviter les attaques ReDoS.
 * Utilise dans tous les endpoints de recherche.
 */
export const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * PENTEST-04: Supprime les balises HTML et les patterns XSS des champs texte.
 */
export const stripHtml = (val: string): string =>
  val.replace(/<[^>]*>/g, '').replace(/javascript\s*:/gi, '').replace(/on\w+\s*=/gi, '');
