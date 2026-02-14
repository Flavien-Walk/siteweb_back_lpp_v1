import { Request, Response, NextFunction } from 'express';
import SecurityEvent, { SecurityEventType, SeverityLevel } from '../models/SecurityEvent.js';
import BlockedIP from '../models/BlockedIP.js';
import BannedDevice, { isDeviceBanned, generateDeviceFingerprint } from '../models/BannedDevice.js';

// ============================================
// PATTERNS DE DETECTION
// ============================================

// Patterns d'injection NoSQL
const NOSQL_PATTERNS = [
  /\$(?:ne|gt|lt|gte|lte|in|nin|or|and|not|nor|exists|regex|where|elemMatch)\b/i,
  /\{\s*"\$(?:ne|gt|lt|gte|lte|in|nin|or|and|not|nor|exists|regex|where)"/i,
];

// Patterns XSS
const XSS_PATTERNS = [
  /<script[\s>]/i,
  /javascript\s*:/i,
  /on(?:error|load|click|mouseover|focus)\s*=/i,
  /<(?:img|svg|iframe|object|embed|link)\b[^>]*\bon\w+\s*=/i,
];

// Patterns path traversal
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.[\\/]/,
  /\.\.%2[fF]/,
  /%2[eE]%2[eE][\\/]/,
  /etc\/(?:passwd|shadow|hosts)/i,
  /proc\/self/i,
  /\.env\b/,
];

// Patterns SQL injection (meme si NoSQL, certains bots tentent quand meme)
const SQL_PATTERNS = [
  /(?:UNION\s+SELECT|SELECT\s+.*FROM|INSERT\s+INTO|DELETE\s+FROM|DROP\s+TABLE|ALTER\s+TABLE)/i,
  /(?:OR|AND)\s+['"]?\d+['"]?\s*=\s*['"]?\d+/i,
  /;\s*(?:DROP|DELETE|INSERT|UPDATE|ALTER)\b/i,
];

// Patterns command injection
const CMD_INJECTION_PATTERNS = [
  /;\s*(?:ls|cat|rm|wget|curl|bash|sh|nc|netcat|python|perl|ruby)\b/i,
  /\|\s*(?:ls|cat|rm|wget|curl|bash|sh|nc|netcat)\b/i,
  /`[^`]*(?:ls|cat|rm|wget|curl|bash|sh)\b[^`]*`/i,
  /\$\([^)]*(?:ls|cat|rm|wget|curl|bash|sh)\b/i,
];

// ============================================
// PARSING USER-AGENT (leger, sans dependance)
// ============================================
interface ParsedUA {
  navigateur: string;
  os: string;
  appareil: string;
}

const parseUserAgent = (ua: string): ParsedUA => {
  if (!ua) return { navigateur: 'Inconnu', os: 'Inconnu', appareil: 'Inconnu' };

  // --- Navigateur ---
  let navigateur = 'Inconnu';
  if (/Edg(?:e|A|iOS)?\/(\d+)/i.test(ua)) {
    navigateur = `Edge ${RegExp.$1}`;
  } else if (/OPR\/(\d+)/i.test(ua) || /Opera\/(\d+)/i.test(ua)) {
    navigateur = `Opera ${RegExp.$1}`;
  } else if (/Brave/i.test(ua)) {
    navigateur = 'Brave';
  } else if (/Vivaldi\/(\d+)/i.test(ua)) {
    navigateur = `Vivaldi ${RegExp.$1}`;
  } else if (/SamsungBrowser\/(\d+)/i.test(ua)) {
    navigateur = `Samsung Browser ${RegExp.$1}`;
  } else if (/Chrome\/(\d+)/i.test(ua) && !/Chromium/i.test(ua)) {
    navigateur = `Chrome ${RegExp.$1}`;
  } else if (/Firefox\/(\d+)/i.test(ua)) {
    navigateur = `Firefox ${RegExp.$1}`;
  } else if (/Safari\/(\d+)/i.test(ua) && /Version\/(\d+)/i.test(ua)) {
    navigateur = `Safari ${RegExp.$1}`;
  } else if (/MSIE\s(\d+)/i.test(ua) || /Trident.*rv:(\d+)/i.test(ua)) {
    navigateur = `Internet Explorer ${RegExp.$1}`;
  } else if (/curl/i.test(ua)) {
    navigateur = 'curl (outil CLI)';
  } else if (/wget/i.test(ua)) {
    navigateur = 'wget (outil CLI)';
  } else if (/python/i.test(ua)) {
    navigateur = 'Python (script)';
  } else if (/postman/i.test(ua)) {
    navigateur = 'Postman (test API)';
  } else if (/httpie/i.test(ua)) {
    navigateur = 'HTTPie (outil CLI)';
  } else if (/insomnia/i.test(ua)) {
    navigateur = 'Insomnia (test API)';
  } else if (/bot|crawl|spider|scrape/i.test(ua)) {
    navigateur = 'Bot/Crawler';
  }

  // --- OS ---
  let os = 'Inconnu';
  if (/Windows NT 10\.0/i.test(ua)) {
    os = 'Windows 10/11';
  } else if (/Windows NT 6\.3/i.test(ua)) {
    os = 'Windows 8.1';
  } else if (/Windows NT 6\.2/i.test(ua)) {
    os = 'Windows 8';
  } else if (/Windows NT 6\.1/i.test(ua)) {
    os = 'Windows 7';
  } else if (/Windows/i.test(ua)) {
    os = 'Windows';
  } else if (/Mac OS X (\d+[._]\d+)/i.test(ua)) {
    os = `macOS ${RegExp.$1.replace(/_/g, '.')}`;
  } else if (/Android (\d+(\.\d+)?)/i.test(ua)) {
    os = `Android ${RegExp.$1}`;
  } else if (/iPhone OS (\d+[._]\d+)/i.test(ua) || /iPad.*OS (\d+[._]\d+)/i.test(ua)) {
    os = `iOS ${RegExp.$1.replace(/_/g, '.')}`;
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
  } else if (/CrOS/i.test(ua)) {
    os = 'Chrome OS';
  } else if (/FreeBSD/i.test(ua)) {
    os = 'FreeBSD';
  }

  // --- Appareil ---
  let appareil = 'Ordinateur';
  if (/Mobile|Android.*Mobile|iPhone|iPod/i.test(ua)) {
    appareil = 'Smartphone';
  } else if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) {
    appareil = 'Tablette';
  } else if (/Smart-?TV|TV|BRAVIA|LG Browser|NetCast|webOS|Tizen/i.test(ua)) {
    appareil = 'Smart TV';
  } else if (/bot|crawl|spider|scrape|curl|wget|python|postman|httpie|insomnia/i.test(ua)) {
    appareil = 'Outil/Bot';
  }

  return { navigateur, os, appareil };
};

// ============================================
// WHITELIST IPs (dev, monitoring, CI)
// Variable d'environnement: WHITELISTED_IPS=1.2.3.4,5.6.7.8
// ============================================
const WHITELISTED_IPS = new Set(
  (process.env.WHITELISTED_IPS || '').split(',').map(s => s.trim()).filter(Boolean)
);

const isWhitelistedIP = (ip: string): boolean => {
  if (WHITELISTED_IPS.size === 0) return false;
  return WHITELISTED_IPS.has(ip);
};

// ============================================
// CACHE BLOCAGE IP (evite des queries a chaque requete)
// ============================================
const blockedIPCache = new Map<string, { blocked: boolean; checkedAt: number }>();
const BLOCKED_CACHE_TTL = 30 * 1000; // 30 secondes

const isIPBlocked = async (ip: string): Promise<boolean> => {
  const cached = blockedIPCache.get(ip);
  if (cached && Date.now() - cached.checkedAt < BLOCKED_CACHE_TTL) {
    return cached.blocked;
  }
  try {
    const found = await BlockedIP.findOne({ ip, actif: true }).lean();
    const blocked = !!found;
    blockedIPCache.set(ip, { blocked, checkedAt: Date.now() });
    return blocked;
  } catch {
    return false;
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
const ipRequestCounts = new Map<string, { count: number; window: number; errors: number }>();
const ANOMALY_THRESHOLD = 50; // requetes par minute
const ERROR_THRESHOLD = 20; // erreurs par minute
const CLEANUP_INTERVAL = 60 * 1000; // 1 min

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
const logSecurityEvent = (
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
// DETECTION DE PAYLOADS MALVEILLANTS
// ============================================
const checkPayload = (value: string): { type: SecurityEventType; detail: string } | null => {
  for (const pattern of NOSQL_PATTERNS) {
    if (pattern.test(value)) {
      return { type: 'injection_attempt', detail: `Injection NoSQL detectee: ${pattern.source}` };
    }
  }
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(value)) {
      return { type: 'injection_attempt', detail: `Attaque XSS detectee: ${pattern.source}` };
    }
  }
  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(value)) {
      return { type: 'injection_attempt', detail: `Traversee de chemin detectee: ${pattern.source}` };
    }
  }
  for (const pattern of SQL_PATTERNS) {
    if (pattern.test(value)) {
      return { type: 'injection_attempt', detail: `Injection SQL detectee: ${pattern.source}` };
    }
  }
  for (const pattern of CMD_INJECTION_PATTERNS) {
    if (pattern.test(value)) {
      return { type: 'injection_attempt', detail: `Injection de commande detectee: ${pattern.source}` };
    }
  }
  return null;
};

const deepScanValue = (obj: unknown, depth = 0): { type: SecurityEventType; detail: string } | null => {
  if (depth > 5) return null;
  if (typeof obj === 'string') {
    return checkPayload(obj);
  }
  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      // Clef elle-meme suspecte
      const keyCheck = checkPayload(key);
      if (keyCheck) return keyCheck;
      // Valeur
      const valCheck = deepScanValue((obj as Record<string, unknown>)[key], depth + 1);
      if (valCheck) return valCheck;
    }
  }
  return null;
};

// ============================================
// MIDDLEWARE VERIFICATION IP BLOQUEE
// ============================================
export const checkBlockedIP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  // 0. Whitelist : IPs de confiance (devs, monitoring) passent toujours
  if (isWhitelistedIP(ip)) {
    next();
    return;
  }

  // 1. Verification IP bloquee
  if (await isIPBlocked(ip)) {
    logSecurityEvent('ip_blocked', 'high', req, 403, `Requete bloquee - IP bannie: ${ip}`, {
      originalPath: req.originalUrl,
    }, true);

    // PAS d'escalade : on ne bannit plus le device juste parce que l'IP revient
    // Ca evite la cascade ou un dev se retrouve banni partout

    res.status(403).json({
      succes: false,
      message: 'Acces refuse.',
    });
    return;
  }

  // 2. Verification appareil banni (contourne les IP dynamiques)
  const ua = req.headers['user-agent'] || '';
  if (ua && ua.length >= 10) {
    const bannedDevice = await isDeviceBanned(ua);
    if (bannedDevice) {
      logSecurityEvent('ip_blocked', 'high', req, 403,
        `Requete bloquee - Appareil banni: ${bannedDevice.navigateur} / ${bannedDevice.os}`, {
          originalPath: req.originalUrl,
          fingerprint: generateDeviceFingerprint(ua),
          deviceBan: true,
        }, true);

      // PAS d'escalade : on ne bloque plus l'IP juste parce que le device est banni

      res.status(403).json({
        succes: false,
        message: 'Acces refuse.',
      });
      return;
    }
  }

  // 3. Detection proxy/VPN (AVANT tout traitement)
  const proxyDetection = detectProxy(req);
  if (proxyDetection) {
    logSecurityEvent('unauthorized_access', 'critical', req, 403,
      `PROXY/VPN DETECTE: ${proxyDetection}`, {
        source: 'proxy_detection',
        headers: {
          via: req.headers['via'],
          forwarded: req.headers['forwarded'],
          xForwardedFor: req.headers['x-forwarded-for'],
        },
      }, true);
    trackAttack(ip, req, 'proxy');

    res.status(403).json({
      succes: false,
      message: 'Acces refuse.',
    });
    return;
  }

  // 4. Detection outils de hacking (nikto, sqlmap, nmap, etc.)
  if (ua) {
    const maliciousUA = detectMaliciousUA(ua);
    if (maliciousUA) {
      logSecurityEvent('injection_attempt', 'critical', req, 403,
        `OUTIL MALVEILLANT: ${maliciousUA}`, {
          source: 'malicious_ua',
          userAgent: ua.slice(0, 300),
        }, true);
      trackAttack(ip, req, 'suspicious_ua');

      res.status(403).json({
        succes: false,
        message: 'Acces refuse.',
      });
      return;
    }

    // 5. Outils CLI sur routes sensibles (curl, python, etc.)
    if (isCLIToolOnSensitiveRoute(ua, req.originalUrl)) {
      logSecurityEvent('unauthorized_access', 'high', req, 403,
        `Outil CLI sur route sensible: ${ua.slice(0, 80)} -> ${req.originalUrl}`, {
          source: 'cli_tool_sensitive',
          userAgent: ua.slice(0, 300),
        }, true);
      trackAttack(ip, req, 'suspicious_ua');

      res.status(403).json({
        succes: false,
        message: 'Acces refuse.',
      });
      return;
    }
  }

  // 6. Pas de User-Agent du tout = suspect (bots basiques)
  if (!ua || ua.length < 5) {
    logSecurityEvent('unauthorized_access', 'medium', req, 403,
      `Requete sans User-Agent depuis ${ip}: ${req.originalUrl}`, {
        source: 'missing_ua',
      }, true);
    trackAttack(ip, req, 'suspicious_ua');

    res.status(403).json({
      succes: false,
      message: 'Acces refuse.',
    });
    return;
  }

  next();
};

// ============================================
// SYSTEME AUTO-PROTECTION STRICT (tolerance zero)
// ============================================

// Types de menaces
// Bans PERMANENTS : uniquement pour les vraies attaques (injection, hacking tools, proxy)
// Bans TEMPORAIRES : pour les comportements suspects (brute force, rate abuse, 403 repetes)
type ThreatType = 'injection' | 'brute_force' | 'admin_enum' | 'rate_abuse' | 'anomaly' | 'forbidden' | 'proxy' | 'suspicious_ua';

interface ThreatConfig {
  threshold: number;       // nombre de tentatives avant blocage
  window: number;          // fenetre de temps (ms)
  permanent: boolean;      // ban permanent (true = pas d'expiry)
  duration: number;        // duree du ban temporaire (ms) - ignore si permanent=true
  banDevice: boolean;      // bannir aussi l'appareil (reserve aux vraies attaques)
}

const THREAT_CONFIGS: Record<ThreatType, ThreatConfig> = {
  // INJECTION: 1 seule tentative = ban permanent IP + device (vraie attaque)
  injection: {
    threshold: 1,
    window: 60 * 60 * 1000,
    permanent: true,
    duration: 0,
    banDevice: true,
  },
  // BRUTE FORCE: 10 echecs login = ban temporaire 1h (IP seulement)
  brute_force: {
    threshold: 10,
    window: 15 * 60 * 1000,         // 15 min
    permanent: false,
    duration: 60 * 60 * 1000,       // 1h
    banDevice: false,
  },
  // ADMIN ENUM: 5 tentatives = ban temporaire 1h (IP seulement)
  admin_enum: {
    threshold: 5,
    window: 10 * 60 * 1000,
    permanent: false,
    duration: 60 * 60 * 1000,       // 1h
    banDevice: false,
  },
  // RATE ABUSE: 15 hits 429 = ban temporaire 30min (IP seulement)
  rate_abuse: {
    threshold: 15,
    window: 15 * 60 * 1000,
    permanent: false,
    duration: 30 * 60 * 1000,       // 30min
    banDevice: false,
  },
  // ANOMALIE / DDoS: seuil atteint = ban temporaire 30min (IP seulement)
  anomaly: {
    threshold: 1,
    window: 60 * 1000,
    permanent: false,
    duration: 30 * 60 * 1000,       // 30min
    banDevice: false,
  },
  // FORBIDDEN 403 repetes: 20 acces = ban temporaire 30min (IP seulement)
  // Seuil eleve car les 403 applicatifs (permission refusee) sont normaux pour le staff
  forbidden: {
    threshold: 20,
    window: 10 * 60 * 1000,
    permanent: false,
    duration: 30 * 60 * 1000,       // 30min
    banDevice: false,
  },
  // PROXY/VPN detecte: ban permanent IP + device (vraie attaque)
  proxy: {
    threshold: 1,
    window: 60 * 60 * 1000,
    permanent: true,
    duration: 0,
    banDevice: true,
  },
  // UA suspect (outils hacking): ban permanent IP + device (vraie attaque)
  suspicious_ua: {
    threshold: 1,
    window: 60 * 60 * 1000,
    permanent: true,
    duration: 0,
    banDevice: true,
  },
};

// ============================================
// DETECTION PROXY / VPN / TOR
// ============================================

// Headers SUSPECTS (pas ceux ajoutes par Render/Cloudflare qui sont normaux)
// x-forwarded-for, x-forwarded-host, x-forwarded-proto, x-real-ip, forwarded, via
// sont ajoutes par l'infra Render/Cloudflare -> NE PAS LES BLOQUER
const PROXY_HEADERS = [
  'x-proxy-id',
  'proxy-connection',
  'x-originating-ip',
  'x-remote-ip',
  'x-remote-addr',
  'x-proxy-connection',
  'proxy-authorization',
];

// User-Agents d'outils de hacking / scanning
const MALICIOUS_UA_PATTERNS = [
  /nikto/i, /sqlmap/i, /nmap/i, /masscan/i, /zap\//i, /burp/i,
  /dirbuster/i, /gobuster/i, /wfuzz/i, /ffuf/i, /nuclei/i,
  /hydra/i, /metasploit/i, /nessus/i, /openvas/i, /acunetix/i,
  /arachni/i, /w3af/i, /skipfish/i, /wpscan/i, /joomscan/i,
  /havij/i, /commix/i, /xerxes/i, /slowloris/i, /hulk/i,
  /siege/i, /wreckuests/i, /loic/i, /hoic/i,
];

// User-Agents d'outils CLI suspects (bloques sur routes sensibles seulement)
const CLI_UA_PATTERNS = [
  /^curl\//i, /^wget\//i, /python-requests/i, /python-urllib/i,
  /node-fetch/i, /axios\//i, /^Go-http-client/i, /^Ruby/i,
  /^Perl/i, /^PHP\//i, /^Java\//i, /^Apache-HttpClient/i,
  /httpie/i, /insomnia/i, /postman/i,
];

// Routes sensibles ou les outils CLI sont interdits
const SENSITIVE_ROUTES = [
  '/api/auth/',
  '/api/admin/',
  '/api/moderation/',
  '/api/profil/',
  '/api/messagerie/',
  '/api/notifications/',
];

const detectProxy = (req: Request): string | null => {
  // 1. Headers proxy classiques
  for (const header of PROXY_HEADERS) {
    if (req.headers[header]) {
      return `Header proxy detecte: ${header}=${String(req.headers[header]).slice(0, 100)}`;
    }
  }

  // 2. Chaine X-Forwarded-For suspecte (multiple proxies)
  // Cloudflare + Render = 2 IPs normal. > 4 = chaine proxy suspecte
  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    const ips = String(xff).split(',').map(s => s.trim());
    if (ips.length > 4) {
      return `Chaine proxy detectee: X-Forwarded-For contient ${ips.length} IPs`;
    }
  }

  return null;
};

const detectMaliciousUA = (ua: string): string | null => {
  for (const pattern of MALICIOUS_UA_PATTERNS) {
    if (pattern.test(ua)) {
      return `Outil de hacking detecte: ${ua.slice(0, 100)}`;
    }
  }
  return null;
};

const isCLIToolOnSensitiveRoute = (ua: string, path: string): boolean => {
  const isSensitive = SENSITIVE_ROUTES.some(route => path.startsWith(route));
  if (!isSensitive) return false;
  return CLI_UA_PATTERNS.some(pattern => pattern.test(ua));
};

// ============================================
// COMPTEURS ET LOGIQUE DE BLOCAGE
// ============================================

const threatCounters = new Map<string, { count: number; window: number; blocked: boolean }>();

const getThreatKey = (ip: string, type: ThreatType): string => `${ip}:${type}`;

const autoBlockIP = async (ip: string, req: Request, raison: string, duration?: number): Promise<void> => {
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

const autoBanDevice = async (ip: string, req: Request, raison: string): Promise<void> => {
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

const trackAttack = async (ip: string, req: Request, threatType: ThreatType = 'injection'): Promise<void> => {
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

// ============================================
// MIDDLEWARE SANITISATION QUERY PARAMS (PENTEST-01)
// ============================================
const stripMongoOperators = (obj: unknown, path = ''): { cleaned: unknown; stripped: string[] } => {
  const stripped: string[] = [];
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      if (key.startsWith('$')) {
        stripped.push(`${path}.${key}`);
        continue;
      }
      const sub = stripMongoOperators(val, `${path}.${key}`);
      stripped.push(...sub.stripped);
      result[key] = sub.cleaned;
    }
    return { cleaned: result, stripped };
  }
  if (Array.isArray(obj)) {
    const arr: unknown[] = [];
    for (let i = 0; i < obj.length; i++) {
      const sub = stripMongoOperators(obj[i], `${path}[${i}]`);
      stripped.push(...sub.stripped);
      arr.push(sub.cleaned);
    }
    return { cleaned: arr, stripped };
  }
  return { cleaned: obj, stripped };
};

export const sanitizeQueryParams = (req: Request, res: Response, next: NextFunction): void => {
  if (req.query && typeof req.query === 'object') {
    const { cleaned, stripped } = stripMongoOperators(req.query, 'query');
    if (stripped.length > 0) {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      logSecurityEvent('injection_attempt', 'critical', req, 200,
        `Injection NoSQL via query params detectee et nettoyee: ${stripped.join(', ')}`, {
          source: 'query_params',
          strippedKeys: stripped,
          originalQuery: JSON.stringify(req.query).slice(0, 500),
        }, false);
      trackAttack(ip, req);
      req.query = cleaned as any;
    }
  }
  next();
};

// ============================================
// MIDDLEWARE MASQUAGE ADMIN (PENTEST-03)
// ============================================
export const hideAdminRoutes = (req: Request, res: Response, next: NextFunction): void => {
  // Si pas de token Authorization sur les routes admin, retourner 404 au lieu de 401
  if (!req.headers.authorization) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    logSecurityEvent('unauthorized_access', 'medium', req, 404,
      `Tentative d'acces admin sans token: ${req.originalUrl}`, {
        source: 'admin_enumeration',
      });
    // Tracker pour auto-blocage apres repetition
    trackAttack(ip, req, 'admin_enum');
    res.status(404).json({
      succes: false,
      message: `Route ${req.method} ${req.originalUrl} non trouvée.`,
    });
    return;
  }
  next();
};

// ============================================
// MIDDLEWARE PRINCIPAL
// ============================================
export const securityMonitor = (req: Request, res: Response, next: NextFunction): void => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  // --- 1. Compteur de requetes par IP (detection anomalie / DDoS) ---
  const ipData = ipRequestCounts.get(ip) || { count: 0, window: now, errors: 0 };
  if (now - ipData.window > CLEANUP_INTERVAL) {
    ipData.count = 0;
    ipData.errors = 0;
    ipData.window = now;
  }
  ipData.count++;
  ipRequestCounts.set(ip, ipData);

  if (ipData.count === ANOMALY_THRESHOLD) {
    logSecurityEvent('anomaly', 'high', req, 0, `Trafic anormal: ${ANOMALY_THRESHOLD} req/min depuis ${ip}`, {
      requestCount: ipData.count,
    });
    // Auto-blocage DDoS / scraping
    trackAttack(ip, req, 'anomaly');
  }

  // --- 2. Scanner les payloads entrants et BLOQUER si injection detectee ---
  // URL + query params
  const urlCheck = checkPayload(req.originalUrl);
  if (urlCheck) {
    logSecurityEvent(urlCheck.type, 'critical', req, 403, urlCheck.detail, {
      source: 'url',
      payload: req.originalUrl.slice(0, 200),
    }, true);

    // Tracker l'attaque pour auto-blocage
    trackAttack(ip, req);

    // BLOQUER la requete
    res.status(403).json({
      succes: false,
      message: 'Requete bloquee : contenu malveillant detecte.',
    });
    return;
  }

  // Body (POST/PUT/PATCH)
  if (req.body && typeof req.body === 'object') {
    const bodyCheck = deepScanValue(req.body);
    if (bodyCheck) {
      logSecurityEvent(bodyCheck.type, 'critical', req, 403, bodyCheck.detail, {
        source: 'body',
        payload: JSON.stringify(req.body).slice(0, 500),
      }, true);

      // Tracker l'attaque pour auto-blocage
      trackAttack(ip, req);

      // BLOQUER la requete
      res.status(403).json({
        succes: false,
        message: 'Requete bloquee : contenu malveillant detecte.',
      });
      return;
    }
  }

  // --- 3. Intercepter la reponse pour logger les echecs ---
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    const statusCode = res.statusCode;

    // 401 - Acces non autorise
    if (statusCode === 401) {
      const isLoginPath = req.path.includes('/connexion');
      const isTokenIssue = body?.message?.includes('Token');

      if (isLoginPath) {
        logSecurityEvent('brute_force', 'medium', req, 401, `Echec login: ${body?.message || 'inconnu'}`, {
          email: req.body?.email ? req.body.email.slice(0, 50) : 'N/A',
        });
        // Tracker brute force pour auto-blocage (ban temporaire, pas permanent)
        trackAttack(ip, req, 'brute_force');
      } else if (isTokenIssue) {
        logSecurityEvent('token_forgery', 'medium', req, 401, `Token invalide: ${body?.message || 'inconnu'}`, {
          authHeader: (req.headers.authorization || '').slice(0, 50) + '...',
        });
        // Token expire/invalide = brute force, PAS injection
        // Un JWT expire est un cas normal (session expiree), pas une attaque
        trackAttack(ip, req, 'brute_force');
      } else {
        logSecurityEvent('unauthorized_access', 'medium', req, 401, `Acces non autorise: ${req.originalUrl}`, {});
      }
    }

    // 403 - Permission insuffisante
    // On logue mais on ne track PAS comme menace
    // Les 403 applicatifs (permission refusee par l'app) sont normaux pour le staff
    // Seuls les 403 du security middleware (deja traites dans checkBlockedIP) sont des menaces
    if (statusCode === 403) {
      logSecurityEvent('forbidden_access', 'medium', req, 403, `Permission refusee: ${body?.requiredPermission || req.originalUrl}`, {
        requiredPermission: body?.requiredPermission,
      });
      // PAS de trackAttack ici - les 403 applicatifs ne sont pas des attaques
    }

    // 429 - Rate limit
    if (statusCode === 429) {
      logSecurityEvent('rate_limit_hit', 'medium', req, 429, `Rate limit declenche sur ${req.originalUrl}`, {});
      // Tracker abus rate limit pour auto-blocage
      trackAttack(ip, req, 'rate_abuse');

      // Mettre a jour les erreurs IP
      const ipD = ipRequestCounts.get(ip);
      if (ipD) {
        ipD.errors++;
        if (ipD.errors === ERROR_THRESHOLD) {
          logSecurityEvent('anomaly', 'critical', req, 429, `IP ${ip} a atteint ${ERROR_THRESHOLD} erreurs/min`, {
            errorCount: ipD.errors,
          });
        }
      }
    }

    // Inscription suspecte (pattern bot: inscription rapide sans UA classique)
    if (req.path.includes('/inscription') && req.method === 'POST' && statusCode === 201) {
      const ua = req.headers['user-agent'] || '';
      if (!ua || ua.length < 10 || /curl|wget|python|httpie|postman/i.test(ua)) {
        logSecurityEvent('suspicious_signup', 'high', req, 201, `Inscription suspecte (UA: ${ua.slice(0, 100)})`, {
          email: req.body?.email ? req.body.email.slice(0, 50) : 'N/A',
          userAgent: ua.slice(0, 200),
        });
      }
    }

    return originalJson(body);
  };

  next();
};

// ============================================
// PURGE AUTO-BLOCKS AU DEMARRAGE
// ============================================
// Appeler cette fonction au demarrage du serveur pour purger les blocages automatiques.
// Utile quand un dev se retrouve bloque par le systeme de securite.
// Active via la variable d'environnement SECURITY_RESET=true
export const purgeAutoBlocks = async (): Promise<void> => {
  if (process.env.SECURITY_RESET !== 'true') return;

  try {
    const ipResult = await BlockedIP.deleteMany({ bloquePar: 'system_auto' });
    const deviceResult = await BannedDevice.deleteMany({ bloquePar: 'system_auto' });
    invalidateBlockedIPCache();
    threatCounters.clear();
    ipRequestCounts.clear();
    console.log(`[SECURITY] PURGE AUTO-BLOCKS: ${ipResult.deletedCount} IP(s), ${deviceResult.deletedCount} appareil(s) supprime(s)`);
    console.log('[SECURITY] Pensez a retirer SECURITY_RESET=true apres le redemarrage');
  } catch (err) {
    console.error('[SECURITY] Erreur purge auto-blocks:', err);
  }
};
