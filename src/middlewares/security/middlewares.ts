import { Request, Response, NextFunction } from 'express';
import BlockedIP from '../../models/BlockedIP.js';
import BannedDevice, { isDeviceBanned, generateDeviceFingerprint } from '../../models/BannedDevice.js';
import { checkPayload, deepScanValue, detectProxy, detectMaliciousUA, isCLIToolOnSensitiveRoute } from './detectionPatterns.js';
import {
  isWhitelistedIP,
  isIPBlocked,
  invalidateBlockedIPCache,
  ipRequestCounts,
  ANOMALY_THRESHOLD,
  ERROR_THRESHOLD,
  CLEANUP_INTERVAL,
  logSecurityEvent,
  threatCounters,
  autoBlockIP,
  autoBanDevice,
  trackAttack,
} from './ipCache.js';

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
  const ipStatus = await isIPBlocked(ip);
  if (ipStatus.blocked) {
    console.warn(`[SECURITY] BLOCKED IP=${ip} path=${req.originalUrl} permanent=${ipStatus.permanent}`);
    logSecurityEvent('ip_blocked', 'high', req, 403, `Requete bloquee - IP bannie: ${ip}`, {
      originalPath: req.originalUrl,
      permanent: ipStatus.permanent,
    }, true);

    // ESCALADE seulement si le ban est PERMANENT (vraie attaque: injection, proxy, hacking)
    // Les bans temporaires (brute force, rate limit) ne declenchent PAS de ban device
    if (ipStatus.permanent) {
      autoBanDevice(ip, req, `[ESCALADE] IP ${ip} bannie definitivement, tentative de contournement`);
    }

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
      console.warn(`[SECURITY] BLOCKED DEVICE IP=${ip} ua=${ua.slice(0, 80)} nav=${bannedDevice.navigateur} os=${bannedDevice.os}`);
      logSecurityEvent('ip_blocked', 'high', req, 403,
        `Requete bloquee - Appareil banni: ${bannedDevice.navigateur} / ${bannedDevice.os}`, {
          originalPath: req.originalUrl,
          fingerprint: generateDeviceFingerprint(ua),
          deviceBan: true,
        }, true);

      // ESCALADE : appareil banni sur nouvelle IP = bloquer cette IP aussi (permanent)
      // Les device bans sont TOUJOURS permanents (uniquement pour vraies attaques)
      autoBlockIP(ip, req, `[ESCALADE] Appareil banni detecte sur nouvelle IP ${ip}`);

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
    console.warn(`[SECURITY] PROXY DETECTED IP=${ip} reason=${proxyDetection}`);
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
      console.warn(`[SECURITY] MALICIOUS UA IP=${ip} ua=${ua.slice(0, 100)}`);
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
      console.warn(`[SECURITY] CLI TOOL ON SENSITIVE ROUTE IP=${ip} ua=${ua.slice(0, 80)} path=${req.originalUrl}`);
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
    console.warn(`[SECURITY] NO USER-AGENT IP=${ip} path=${req.originalUrl} ua="${ua}"`);
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
      const msg = body?.message || '';
      const isTokenExpired = msg.includes('invalide') || msg.includes('expiré') || msg.includes('expire');
      const isTokenMissing = msg.includes('manquant') || msg.includes('Session terminée');

      if (isLoginPath) {
        logSecurityEvent('brute_force', 'medium', req, 401, `Echec login: ${msg || 'inconnu'}`, {
          email: req.body?.email ? req.body.email.slice(0, 50) : 'N/A',
        });
        // Tracker brute force pour auto-blocage (ban temporaire, pas permanent)
        trackAttack(ip, req, 'brute_force');
      } else if (isTokenExpired) {
        logSecurityEvent('token_forgery', 'medium', req, 401, `Token invalide: ${msg || 'inconnu'}`, {
          authHeader: (req.headers.authorization || '').slice(0, 50) + '...',
        });
        // Token falsifie ou expire = brute force
        trackAttack(ip, req, 'brute_force');
      } else if (isTokenMissing) {
        // Token absent = erreur client (pas une attaque), on logue sans tracker
        logSecurityEvent('unauthorized_access', 'low', req, 401, `Token manquant: ${req.originalUrl}`, {});
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
