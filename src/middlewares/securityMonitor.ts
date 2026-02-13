import { Request, Response, NextFunction } from 'express';
import SecurityEvent, { SecurityEventType, SeverityLevel } from '../models/SecurityEvent.js';

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
  // Fire-and-forget pour ne pas ralentir la requete
  SecurityEvent.create({
    type,
    severity,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: (req.headers['user-agent'] || '').slice(0, 500),
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
      return { type: 'injection_attempt', detail: `NoSQL injection detectee: ${pattern.source}` };
    }
  }
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(value)) {
      return { type: 'injection_attempt', detail: `XSS detecte: ${pattern.source}` };
    }
  }
  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(value)) {
      return { type: 'injection_attempt', detail: `Path traversal detecte: ${pattern.source}` };
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

  // --- 2. Scanner les payloads entrants ---
  // URL + query params
  const urlCheck = checkPayload(req.originalUrl);
  if (urlCheck) {
    logSecurityEvent(urlCheck.type, 'critical', req, 0, urlCheck.detail, {
      source: 'url',
      payload: req.originalUrl.slice(0, 200),
    }, true);
  }

  // Body (POST/PUT/PATCH)
  if (req.body && typeof req.body === 'object') {
    const bodyCheck = deepScanValue(req.body);
    if (bodyCheck) {
      logSecurityEvent(bodyCheck.type, 'critical', req, 0, bodyCheck.detail, {
        source: 'body',
        payload: JSON.stringify(req.body).slice(0, 500),
      }, true);
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
