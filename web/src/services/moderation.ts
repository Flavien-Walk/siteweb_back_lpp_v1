import api from './api';
import type { ReponseAPI } from './api';

export const hidePublication = async (id: string, reason: string): Promise<ReponseAPI<{ message: string }>> => {
  return api.post(`/moderation/content/publication/${id}/hide`, { reason }, true);
};

export const unhidePublication = async (id: string): Promise<ReponseAPI<{ message: string }>> => {
  return api.post(`/moderation/content/publication/${id}/unhide`, {}, true);
};

export const deletePublicationModo = async (id: string): Promise<ReponseAPI<{ message: string }>> => {
  return api.delete(`/moderation/content/publication/${id}`, true);
};

export const deleteCommentaireModo = async (id: string): Promise<ReponseAPI<{ message: string }>> => {
  return api.delete(`/moderation/content/commentaire/${id}`, true);
};

export const warnUser = async (id: string, reason: string, postId?: string): Promise<ReponseAPI<{ message: string }>> => {
  return api.post(`/moderation/users/${id}/warn`, { reason, postId }, true);
};

export const suspendUser = async (id: string, reason: string, durationHours: number, postId?: string): Promise<ReponseAPI<{ message: string }>> => {
  return api.post(`/moderation/users/${id}/suspend`, { reason, durationHours, postId }, true);
};

export const banUser = async (id: string, reason: string, postId?: string): Promise<ReponseAPI<{ message: string }>> => {
  return api.post(`/moderation/users/${id}/ban`, { reason, postId }, true);
};
