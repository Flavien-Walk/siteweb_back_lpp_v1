import { Request, Response, NextFunction } from 'express';
import SecurityEvent, { SecurityEventType, SeverityLevel } from '../models/SecurityEvent.js';
import BlockedIP from '../models/BlockedIP.js';
import { isDeviceBanned, generateDeviceFingerprint } from '../models/BannedDevice.js';

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

  // 1. Verification IP bloquee
  if (await isIPBlocked(ip)) {
    logSecurityEvent('ip_blocked', 'high', req, 403, `Requete bloquee - IP bannie: ${ip}`, {
      originalPath: req.originalUrl,
    }, true);

    res.status(403).json({
      succes: false,
      message: 'Acces refuse. Votre adresse IP a ete bloquee.',
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

      res.status(403).json({
        succes: false,
        message: 'Acces refuse. Votre appareil a ete bloque.',
      });
      return;
    }
  }

  next();
};

// ============================================
// COMPTEUR D'ATTAQUES PAR IP (auto-blocage)
// ============================================
const ipAttackCounts = new Map<string, { count: number; window: number }>();
const ATTACK_BLOCK_THRESHOLD = 5; // 5 injections detectees -> blocage auto
const ATTACK_WINDOW = 10 * 60 * 1000; // fenetre de 10 minutes

const trackAttack = async (ip: string, req: Request): Promise<void> => {
  const now = Date.now();
  const data = ipAttackCounts.get(ip) || { count: 0, window: now };
  if (now - data.window > ATTACK_WINDOW) {
    data.count = 0;
    data.window = now;
  }
  data.count++;
  ipAttackCounts.set(ip, data);

  // Auto-blocage apres ATTACK_BLOCK_THRESHOLD tentatives d'injection
  if (data.count >= ATTACK_BLOCK_THRESHOLD) {
    try {
      const existing = await BlockedIP.findOne({ ip }).lean();
      if (!existing) {
        await BlockedIP.create({
          ip,
          raison: `Auto-bloque: ${data.count} tentatives d'injection en ${ATTACK_WINDOW / 60000} min`,
          bloquePar: 'system_auto',
          actif: true,
        });
        // Invalider le cache pour prise en compte immediate
        invalidateBlockedIPCache(ip);
        logSecurityEvent('ip_blocked', 'critical', req, 403,
          `IP ${ip} auto-bloquee apres ${data.count} injections detectees`, {
            attackCount: data.count,
            autoBlocked: true,
          }, true);
      }
    } catch {
      // Silencieux en cas d'erreur DB
    }
  }
};

// Nettoyage periodique des compteurs d'attaque
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipAttackCounts.entries()) {
    if (now - data.window > ATTACK_WINDOW * 2) {
      ipAttackCounts.delete(ip);
    }
  }
}, ATTACK_WINDOW);

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
    logSecurityEvent('unauthorized_access', 'medium', req, 404,
      `Tentative d'acces admin sans token: ${req.originalUrl}`, {
        source: 'admin_enumeration',
      });
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
      } else if (isTokenIssue) {
        logSecurityEvent('token_forgery', 'high', req, 401, `Token invalide: ${body?.message || 'inconnu'}`, {
          authHeader: (req.headers.authorization || '').slice(0, 50) + '...',
        });
      } else {
        logSecurityEvent('unauthorized_access', 'medium', req, 401, `Acces non autorise: ${req.originalUrl}`, {});
      }
    }

    // 403 - Permission insuffisante
    if (statusCode === 403) {
      logSecurityEvent('forbidden_access', 'high', req, 403, `Permission refusee: ${body?.requiredPermission || req.originalUrl}`, {
        requiredPermission: body?.requiredPermission,
      });
    }

    // 429 - Rate limit
    if (statusCode === 429) {
      logSecurityEvent('rate_limit_hit', 'medium', req, 429, `Rate limit declenche sur ${req.originalUrl}`, {});

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
