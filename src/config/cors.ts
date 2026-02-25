/**
 * Configuration CORS centralisee
 * Utilisee par app.ts (Express) et socket/index.ts (Socket.io)
 */

import cors from 'cors';

// Regex pour les previews Vercel du projet frontend
const vercelPreviewRegex =
  /^https:\/\/siteweb-front-lpp-v100-[a-z0-9-]+\.vercel\.app$/i;

/**
 * Construit la liste des origins autorisees depuis les variables d'environnement
 */
export const getAllowedOrigins = (): string[] => {
  const prodOrigins = [
    process.env.CLIENT_URL, // ex: https://siteweb-front-lpp-v100.vercel.app
  ].filter(Boolean) as string[];

  // Origins de l'outil de moderation local (ex: "http://localhost:5173,http://127.0.0.1:5173")
  const localModerationOrigins = process.env.LOCAL_MODERATION_ORIGINS
    ? process.env.LOCAL_MODERATION_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : [];

  return [...prodOrigins, ...localModerationOrigins];
};

/**
 * Verifie si une origin est autorisee
 */
export const isOriginAllowed = (origin: string | undefined): boolean => {
  // Requetes sans Origin (apps mobiles natives, Postman en dev)
  if (!origin) return true;

  // Origins explicitement autorisees
  if (getAllowedOrigins().includes(origin)) return true;

  // Previews Vercel du frontend
  if (vercelPreviewRegex.test(origin)) return true;

  return false;
};

/**
 * Callback CORS partage entre Express et Socket.io
 */
const originCallback = (
  origin: string | undefined,
  cb: (err: Error | null, allow?: boolean) => void
): void => {
  if (isOriginAllowed(origin)) {
    return cb(null, true);
  }
  console.warn(`[CORS] Origin refusee: ${origin}`);
  return cb(new Error(`Origin non autorisee: ${origin}`));
};

/**
 * Options CORS pour Express (app.use(cors(corsOptions)))
 */
export const corsOptions: cors.CorsOptions = {
  origin: originCallback,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Event-Id'], // P0-1: X-Event-Id pour idempotency
};

/**
 * Options CORS pour Socket.io
 */
export const socketCorsOptions = {
  origin: originCallback,
  methods: ['GET', 'POST'],
  credentials: true,
};
