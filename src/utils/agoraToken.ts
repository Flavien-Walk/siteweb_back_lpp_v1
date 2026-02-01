/**
 * Utilitaires pour la génération de tokens Agora RTC
 * Documentation: https://docs.agora.io/en/video-calling/develop/authentication-workflow
 */

import { RtcTokenBuilder, RtcRole } from 'agora-token';

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

// Durée de validité du token (en secondes) - 1 heure
const TOKEN_EXPIRATION_SECONDS = 3600;

export type AgoraRole = 'publisher' | 'subscriber';

/**
 * Génère un token Agora RTC pour un canal donné
 * @param channelName - Nom du canal Agora
 * @param uid - UID utilisateur Agora (number)
 * @param role - Rôle: 'publisher' (peut diffuser) ou 'subscriber' (peut regarder)
 * @returns Token RTC valide pendant 1 heure
 */
export const generateAgoraToken = (
  channelName: string,
  uid: number,
  role: AgoraRole
): string => {
  if (!APP_ID || !APP_CERTIFICATE) {
    throw new Error('Configuration Agora manquante (AGORA_APP_ID ou AGORA_APP_CERTIFICATE)');
  }

  const agoraRole = role === 'publisher'
    ? RtcRole.PUBLISHER
    : RtcRole.SUBSCRIBER;

  // Timestamp d'expiration (en secondes depuis l'epoch Unix)
  const privilegeExpiredTs = Math.floor(Date.now() / 1000) + TOKEN_EXPIRATION_SECONDS;

  return RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    uid,
    agoraRole,
    privilegeExpiredTs,
    privilegeExpiredTs
  );
};

/**
 * Génère un nom de canal unique pour un live
 * Format: live_{userId}_{timestamp}_{random}
 * @param userId - ID MongoDB de l'utilisateur
 * @returns Nom de canal unique
 */
export const generateChannelName = (userId: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `live_${userId}_${timestamp}_${random}`;
};

/**
 * Convertit un userId MongoDB en UID Agora (number)
 * Agora requiert un UID numérique entre 0 et 2^32-1
 * On utilise les 8 derniers caractères de l'ObjectId converti en nombre
 * @param userId - ID MongoDB (ObjectId en string)
 * @returns UID numérique pour Agora
 */
export const userIdToAgoraUid = (userId: string): number => {
  // Utiliser les 8 derniers caractères de l'ObjectId comme base hexadécimale
  const hexPart = userId.slice(-8);
  // Convertir en nombre et s'assurer qu'il est dans la plage valide
  return parseInt(hexPart, 16) % 2147483647; // Max safe int pour Agora
};

/**
 * Récupère l'App ID Agora (safe pour le client)
 * @returns App ID ou undefined si non configuré
 */
export const getAgoraAppId = (): string | undefined => {
  return APP_ID;
};
