import { Request } from 'express';
import SecurityEvent, { SecurityEventType, SeverityLevel } from '../../models/SecurityEvent.js';
import BlockedIP from '../../models/BlockedIP.js';
import BannedDevice, { generateDeviceFingerprint } from '../../models/BannedDevice.js';
import { parseUserAgent } from './userAgentParser.js';
import { ThreatType, THREAT_CONFIGS } from './detectionPatterns.js';

// ============================================
// WHITELIST IPs (dev, monitoring, CI)
// Variable d'environnement: WHITELISTED_IPS=1.2.3.4,5.6.7.8
// ============================================
const WHITELISTED_IPS = new Set(
  (process.env.WHITELISTED_IPS || '').split(',').map(s => s.trim()).filter(Boolean)
);

export const isWhitelistedIP = (ip: string): boolean => {
  if (WHITELISTED_IPS.size === 0) return false;
  return WHITELISTED_IPS.has(ip);
};

// ============================================
// CACHE BLOCAGE IP (evite des queries a chaque requete)
// ============================================
const blockedIPCache = new Map<string, { blocked: boolean; checkedAt: number; permanent?: boolean }>();
export const BLOCKED_CACHE_TTL = 30 * 1000; // 30 secondes

export interface BlockedIPInfo {
  blocked: boolean;
  permanent: boolean; // true = ban permanent (vraie attaque), false = ban temporaire
}

export const isIPBlocked = async (ip: string): Promise<BlockedIPInfo> => {
  const cached = blockedIPCache.get(ip);
  if (cached && Date.now() - cached.checkedAt < BLOCKED_CACHE_TTL) {
    return { blocked: cached.blocked, permanent: cached.permanent ?? false };
  }
  try {
    const found = await BlockedIP.findOne({ ip, actif: true }).lean();
    const blocked = !!found;
    const permanent = blocked && !found?.expireAt; // pas d'expiration = permanent
    blockedIPCache.set(ip, { blocked, checkedAt: Date.now(), permanent });
    return { blocked, permanent };
  } catch {
    return { blocked: false, permanent: false };
  }
};

// Expose pour forcer la mise a jour du cache (apres block/unblock)
export const invalidateBlockedIPCache = (ip?: string): void => {
  if (ip) {
    blockedIPCache.delete(ip);
  } else {
    blockedIPCache.clear();
  }
};

// Compteur in-memory pour detection temps reel (evite trop de queries)
export const ipRequestCounts = new Map<string, { count: number; window: number; errors: number }>();
export const ANOMALY_THRESHOLD = 50; // requetes par minute
export const ERROR_THRESHOLD = 20; // erreurs par minute
export const CLEANUP_INTERVAL = 60 * 1000; // 1 min

// Nettoyage periodique
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipRequestCounts.entries()) {
    if (now - data.window > CLEANUP_INTERVAL) {
      ipRequestCounts.delete(ip);
    }
  }
  // Nettoyage cache blocked IPs aussi
  for (const [ip, data] of blockedIPCache.entries()) {
    if (now - data.checkedAt > BLOCKED_CACHE_TTL * 2) {
      blockedIPCache.delete(ip);
    }
  }
}, CLEANUP_INTERVAL);

// ============================================
// FONCTION DE LOG ASYNCHRONE (non-bloquante)
// ============================================
export const logSecurityEvent = (
  type: SecurityEventType,
  severity: SeverityLevel,
  req: Request,
  statusCode: number,
  details: string,
  metadata: Record<string, unknown> = {},
  blocked = false
): void => {
  const ua = req.headers['user-agent'] || '';
  const parsed = parseUserAgent(ua);

  // Fire-and-forget pour ne pas ralentir la requete
  SecurityEvent.create({
    type,
    severity,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: ua.slice(0, 500),
    navigateur: parsed.navigateur,
    os: parsed.os,
    appareil: parsed.appareil,
    method: req.method,
    path: req.originalUrl.slice(0, 500),
    statusCode,
    details,
    metadata,
    userId: (req as any).utilisateur?._id?.toString() || null,
    blocked,
  }).catch(() => {
    // Silencieux en cas d'erreur DB - on ne veut pas planter le serveur pour du monitoring
  });
};

// ============================================
// COMPTEURS ET LOGIQUE DE BLOCAGE
// ============================================

export const threatCounters = new Map<string, { count: number; window: number; blocked: boolean }>();

const getThreatKey = (ip: string, type: ThreatType): string => `${ip}:${type}`;

export const autoBlockIP = async (ip: string, req: Request, raison: string, duration?: number): Promise<void> => {
  try {
    if (isWhitelistedIP(ip)) return; // jamais bloquer une IP whitelistee

    const existing = await BlockedIP.findOne({ ip, actif: true }).lean();
    if (!existing) {
      const expireAt = duration ? new Date(Date.now() + duration) : null;
      await BlockedIP.create({
        ip,
        raison,
        bloquePar: 'system_auto',
        actif: true,
        expireAt,
      });
      invalidateBlockedIPCache(ip);
      const durLabel = duration ? `${Math.round(duration / 60000)} min` : 'PERMANENT';
      logSecurityEvent('ip_blocked', 'critical', req, 403,
        `IP ${ip} BLOQUEE (${durLabel}): ${raison}`, {
          autoBlocked: true,
          permanent: !duration,
          duration: duration || null,
        }, true);
    }
  } catch { /* silencieux */ }
};

export const autoBanDevice = async (ip: string, req: Request, raison: string): Promise<void> => {
  const ua = req.headers['user-agent'] || '';
  if (!ua || ua.length < 5) return;
  try {
    const fingerprint = generateDeviceFingerprint(ua);
    const existing = await BannedDevice.findOne({ fingerprint, actif: true }).lean();
    if (!existing) {
      const parsed = parseUserAgent(ua);
      await BannedDevice.create({
        fingerprint,
        userAgentRaw: ua.slice(0, 500),
        navigateur: parsed.navigateur,
        os: parsed.os,
        appareil: parsed.appareil,
        raison,
        bloquePar: 'system_auto',
        actif: true,
        ipsConnues: [ip],
        expireAt: null, // PERMANENT
      });
      logSecurityEvent('ip_blocked', 'critical', req, 403,
        `APPAREIL BANNI DEFINITIVEMENT: ${parsed.navigateur} / ${parsed.os} - ${raison}`, {
          fingerprint,
          navigateur: parsed.navigateur,
          os: parsed.os,
          permanent: true,
        }, true);
    } else {
      // Appareil deja banni - ajouter l'IP a la liste connue
      const ips = (existing as any).ipsConnues || [];
      if (!ips.includes(ip)) {
        await BannedDevice.updateOne({ _id: existing._id }, { $addToSet: { ipsConnues: ip } });
      }
    }
  } catch { /* silencieux */ }
};

export const trackAttack = async (ip: string, req: Request, threatType: ThreatType = 'injection'): Promise<void> => {
  const config = THREAT_CONFIGS[threatType];
  const key = getThreatKey(ip, threatType);
  const now = Date.now();

  const data = threatCounters.get(key) || { count: 0, window: now, blocked: false };
  if (now - data.window > config.window) {
    data.count = 0;
    data.window = now;
    data.blocked = false;
  }
  data.count++;
  threatCounters.set(key, data);

  // Deja bloque dans cette fenetre
  if (data.blocked) return;

  // Seuil atteint -> BLOQUER
  if (data.count >= config.threshold) {
    data.blocked = true;
    const durLabel = config.permanent ? 'PERMANENT' : `${Math.round(config.duration / 60000)} min`;
    const raison = `[AUTO] ${threatType}: ${data.count} tentative(s) en ${Math.round(config.window / 60000)} min (ban ${durLabel})`;

    console.warn(`[SECURITY] AUTO-BLOCK TRIGGERED IP=${ip} threat=${threatType} count=${data.count}/${config.threshold} ban=${durLabel} path=${req.originalUrl}`);

    await autoBlockIP(ip, req, raison, config.permanent ? undefined : config.duration);

    // Bannir l'appareil SEULEMENT pour les vraies attaques (injection, proxy, hacking tools)
    if (config.banDevice) {
      await autoBanDevice(ip, req, raison);
    }
  }
};

// Nettoyage periodique des compteurs
const THREAT_CLEANUP_INTERVAL = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of threatCounters.entries()) {
    if (now - data.window > 30 * 60 * 1000) {
      threatCounters.delete(key);
    }
  }
}, THREAT_CLEANUP_INTERVAL);
