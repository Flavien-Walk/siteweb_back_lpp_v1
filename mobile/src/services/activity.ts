/**
 * Service Activity - Logging des actions utilisateur
 * Permet de traquer les partages, vues, etc. pour l'audit
 */

import { Share, Platform } from 'react-native';
import api, { ReponseAPI } from './api';

// Types
export interface ShareActivityData {
  publicationId: string;
  source: 'mobile';
}

export interface ActivityLogResponse {
  logged: boolean;
  activityId?: string;
}

export interface ShareResult {
  shared: boolean;
  logged: boolean;
  error?: string;
}

/**
 * Logger un partage de publication vers le backend
 * Fail silently si l'endpoint n'existe pas encore
 */
export const logShare = async (
  publicationId: string
): Promise<ReponseAPI<ActivityLogResponse>> => {
  try {
    return await api.post<ActivityLogResponse>(
      '/activity/share',
      { publicationId, source: 'mobile' },
      true
    );
  } catch {
    // Fail silently - le tracking n'est pas critique
    return { succes: false, message: 'Activity logging unavailable' };
  }
};

/**
 * Partager une publication et logger l'action
 * Gère les différences iOS/Android:
 * - iOS: Share.sharedAction est fiable
 * - Android: Le résultat n'est pas toujours fiable, on log si l'action n'est pas dismissedAction
 *
 * @param publicationId - ID de la publication
 * @param auteurNom - Nom complet de l'auteur
 * @param contenu - Contenu texte de la publication (optionnel)
 * @returns ShareResult avec statut du partage et du log
 */
export const sharePublication = async (
  publicationId: string,
  auteurNom: string,
  contenu?: string
): Promise<ShareResult> => {
  // Construire le message de partage
  const contenuExtrait = contenu
    ? `"${contenu.substring(0, 100)}${contenu.length > 100 ? '...' : ''}"\n\n`
    : '';

  const message = `Découvre ce post de ${auteurNom} sur LPP !\n\n${contenuExtrait}Télécharge LPP pour suivre les startups innovantes !`;

  try {
    const result = await Share.share({
      message,
      title: `Post de ${auteurNom}`,
    });

    // Déterminer si l'utilisateur a partagé
    // iOS: sharedAction est fiable
    // Android: sharedAction n'est pas toujours fiable, on considère partagé si pas dismissed
    const wasShared =
      Platform.OS === 'ios'
        ? result.action === Share.sharedAction
        : result.action !== Share.dismissedAction;

    // Logger uniquement si partage effectif (ou probable sur Android)
    let logged = false;
    if (wasShared) {
      const logResult = await logShare(publicationId);
      logged = logResult.succes === true;
    }

    return {
      shared: wasShared,
      logged,
    };
  } catch (error) {
    return {
      shared: false,
      logged: false,
      error: error instanceof Error ? error.message : 'Erreur de partage',
    };
  }
};

export default {
  logShare,
  sharePublication,
};
