import Utilisateur from '../models/Utilisateur.js';
import UserPreferences from '../models/UserPreferences.js';
import { isUserConnected } from '../socket/emitters.js';

// === TYPES ===

type PushCategorie = 'messages' | 'activite' | 'recommandations';

interface PushOptions {
  titre: string;
  message: string;
  type: string;
  data?: Record<string, string>;
  categorie: PushCategorie;
  badge?: number;
  sound?: 'default' | null;
  skipSmartDelivery?: boolean; // Forcer l'envoi même si user connecté
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

// === ANTI-SPAM ===

// Cache anti-spam : userId -> { type -> timestamps[] }
const antiSpamCache = new Map<string, Map<string, number[]>>();
const ANTI_SPAM_MAX = 3; // Max push du même type
const ANTI_SPAM_WINDOW = 60_000; // en 1 minute

function isAntiSpamBlocked(userId: string, type: string): boolean {
  const userCache = antiSpamCache.get(userId);
  if (!userCache) return false;

  const timestamps = userCache.get(type);
  if (!timestamps) return false;

  const now = Date.now();
  // Nettoyer les anciens
  const recent = timestamps.filter((t) => now - t < ANTI_SPAM_WINDOW);
  userCache.set(type, recent);

  return recent.length >= ANTI_SPAM_MAX;
}

function recordPush(userId: string, type: string): void {
  if (!antiSpamCache.has(userId)) {
    antiSpamCache.set(userId, new Map());
  }
  const userCache = antiSpamCache.get(userId)!;
  if (!userCache.has(type)) {
    userCache.set(type, []);
  }
  userCache.get(type)!.push(Date.now());
}

// Nettoyage périodique du cache anti-spam (toutes les 5 min)
setInterval(() => {
  const now = Date.now();
  for (const [userId, userCache] of antiSpamCache) {
    for (const [type, timestamps] of userCache) {
      const recent = timestamps.filter((t) => now - t < ANTI_SPAM_WINDOW);
      if (recent.length === 0) {
        userCache.delete(type);
      } else {
        userCache.set(type, recent);
      }
    }
    if (userCache.size === 0) {
      antiSpamCache.delete(userId);
    }
  }
}, 5 * 60_000);

// === EXPO PUSH API ===

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

async function sendToExpo(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
  if (messages.length === 0) return [];

  // Expo accepte max 100 messages par requête
  const chunks: ExpoPushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  const allTickets: ExpoPushTicket[] = [];

  for (const chunk of chunks) {
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      const result = (await response.json()) as { data?: ExpoPushTicket[] };
      if (result.data) {
        allTickets.push(...result.data);
      }
    } catch (error) {
      console.error('[PUSH] Erreur envoi Expo:', error);
    }
  }

  return allTickets;
}

// === PURGE TOKENS INVALIDES ===

async function purgeInvalidTokens(userId: string, invalidTokens: string[]): Promise<void> {
  if (invalidTokens.length === 0) return;

  try {
    await Utilisateur.updateOne(
      { _id: userId },
      { $pull: { pushTokens: { token: { $in: invalidTokens } } } }
    );
    console.log(`[PUSH] Purgé ${invalidTokens.length} token(s) invalide(s) pour user ${userId}`);
  } catch (error) {
    console.error('[PUSH] Erreur purge tokens:', error);
  }
}

// === FONCTION PRINCIPALE ===

/**
 * Envoyer une push notification à un utilisateur
 * Fire-and-forget : ne jamais await dans le chemin HTTP
 */
export async function envoyerPushNotification(
  userId: string,
  options: PushOptions
): Promise<void> {
  try {
    // Smart delivery : skip si user connecté via socket
    if (!options.skipSmartDelivery && isUserConnected(userId)) {
      return;
    }

    // Anti-spam
    if (isAntiSpamBlocked(userId, options.type)) {
      return;
    }

    // Vérifier préférences utilisateur
    const prefs = await UserPreferences.findOne({ utilisateur: userId }).lean();
    if (prefs) {
      const pushPrefs = (prefs as any).notificationsPush;
      if (pushPrefs && pushPrefs[options.categorie] === false) {
        return;
      }
    }

    // Charger les push tokens du user
    const user = await Utilisateur.findById(userId).select('+pushTokens').lean();
    if (!user || !user.pushTokens || user.pushTokens.length === 0) {
      return;
    }

    // Construire les messages
    const messages: ExpoPushMessage[] = user.pushTokens.map((pt: any) => ({
      to: pt.token,
      title: options.titre,
      body: options.message,
      data: { type: options.type, ...options.data },
      sound: options.sound ?? 'default',
      badge: options.badge,
      channelId: 'default',
    }));

    // Envoyer
    const tickets = await sendToExpo(messages);

    // Traiter les erreurs (purger tokens invalides)
    const invalidTokens: string[] = [];
    tickets.forEach((ticket, index) => {
      if (
        ticket.status === 'error' &&
        ticket.details?.error === 'DeviceNotRegistered'
      ) {
        invalidTokens.push(messages[index].to);
      }
    });

    if (invalidTokens.length > 0) {
      purgeInvalidTokens(userId, invalidTokens).catch(() => {});
    }

    // Enregistrer dans l'anti-spam
    recordPush(userId, options.type);
  } catch (error) {
    console.error('[PUSH] Erreur envoyerPushNotification:', error);
  }
}

/**
 * Envoyer une push groupée (ex: "Vous avez 5 nouveaux likes")
 */
export async function envoyerPushGroupe(
  userId: string,
  type: string,
  count: number,
  message: string,
  categorie: PushCategorie = 'activite'
): Promise<void> {
  await envoyerPushNotification(userId, {
    titre: 'La Première Pierre',
    message,
    type,
    data: { count: String(count) },
    categorie,
    skipSmartDelivery: true,
  });
}
