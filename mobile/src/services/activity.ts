/**
 * Service Activity - Logging des actions utilisateur
 * Permet de traquer les partages, vues, etc. pour l'audit
 */

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

/**
 * Logger un partage de publication
 * Envoie l'info au backend pour l'audit (fail silently si l'endpoint n'existe pas encore)
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

export default {
  logShare,
};
