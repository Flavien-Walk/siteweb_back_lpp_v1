"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.purgeAutoBlocks = exports.securityMonitor = exports.hideAdminRoutes = exports.sanitizeQueryParams = exports.checkBlockedIP = void 0;
const BlockedIP_js_1 = __importDefault(require("../../models/BlockedIP.js"));
const BannedDevice_js_1 = __importStar(require("../../models/BannedDevice.js"));
const detectionPatterns_js_1 = require("./detectionPatterns.js");
const ipCache_js_1 = require("./ipCache.js");
// ============================================
// MIDDLEWARE VERIFICATION IP BLOQUEE
// ============================================
const checkBlockedIP = async (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    // 0. Whitelist : IPs de confiance (devs, monitoring) passent toujours
    if ((0, ipCache_js_1.isWhitelistedIP)(ip)) {
        next();
        return;
    }
    // 1. Verification IP bloquee
    const ipStatus = await (0, ipCache_js_1.isIPBlocked)(ip);
    if (ipStatus.blocked) {
        console.warn(`[SECURITY] BLOCKED IP=${ip} path=${req.originalUrl} permanent=${ipStatus.permanent}`);
        (0, ipCache_js_1.logSecurityEvent)('ip_blocked', 'high', req, 403, `Requete bloquee - IP bannie: ${ip}`, {
            originalPath: req.originalUrl,
            permanent: ipStatus.permanent,
        }, true);
        // ESCALADE seulement si le ban est PERMANENT (vraie attaque: injection, proxy, hacking)
        // Les bans temporaires (brute force, rate limit) ne declenchent PAS de ban device
        if (ipStatus.permanent) {
            (0, ipCache_js_1.autoBanDevice)(ip, req, `[ESCALADE] IP ${ip} bannie definitivement, tentative de contournement`);
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
        const bannedDevice = await (0, BannedDevice_js_1.isDeviceBanned)(ua);
        if (bannedDevice) {
            console.warn(`[SECURITY] BLOCKED DEVICE IP=${ip} ua=${ua.slice(0, 80)} nav=${bannedDevice.navigateur} os=${bannedDevice.os}`);
            (0, ipCache_js_1.logSecurityEvent)('ip_blocked', 'high', req, 403, `Requete bloquee - Appareil banni: ${bannedDevice.navigateur} / ${bannedDevice.os}`, {
                originalPath: req.originalUrl,
                fingerprint: (0, BannedDevice_js_1.generateDeviceFingerprint)(ua),
                deviceBan: true,
            }, true);
            // ESCALADE : appareil banni sur nouvelle IP = bloquer cette IP aussi (permanent)
            // Les device bans sont TOUJOURS permanents (uniquement pour vraies attaques)
            (0, ipCache_js_1.autoBlockIP)(ip, req, `[ESCALADE] Appareil banni detecte sur nouvelle IP ${ip}`);
            res.status(403).json({
                succes: false,
                message: 'Acces refuse.',
            });
            return;
        }
    }
    // 3. Detection proxy/VPN (AVANT tout traitement)
    const proxyDetection = (0, detectionPatterns_js_1.detectProxy)(req);
    if (proxyDetection) {
        console.warn(`[SECURITY] PROXY DETECTED IP=${ip} reason=${proxyDetection}`);
        (0, ipCache_js_1.logSecurityEvent)('unauthorized_access', 'critical', req, 403, `PROXY/VPN DETECTE: ${proxyDetection}`, {
            source: 'proxy_detection',
            headers: {
                via: req.headers['via'],
                forwarded: req.headers['forwarded'],
                xForwardedFor: req.headers['x-forwarded-for'],
            },
        }, true);
        (0, ipCache_js_1.trackAttack)(ip, req, 'proxy');
        res.status(403).json({
            succes: false,
            message: 'Acces refuse.',
        });
        return;
    }
    // 4. Detection outils de hacking (nikto, sqlmap, nmap, etc.)
    if (ua) {
        const maliciousUA = (0, detectionPatterns_js_1.detectMaliciousUA)(ua);
        if (maliciousUA) {
            console.warn(`[SECURITY] MALICIOUS UA IP=${ip} ua=${ua.slice(0, 100)}`);
            (0, ipCache_js_1.logSecurityEvent)('injection_attempt', 'critical', req, 403, `OUTIL MALVEILLANT: ${maliciousUA}`, {
                source: 'malicious_ua',
                userAgent: ua.slice(0, 300),
            }, true);
            (0, ipCache_js_1.trackAttack)(ip, req, 'suspicious_ua');
            res.status(403).json({
                succes: false,
                message: 'Acces refuse.',
            });
            return;
        }
        // 5. Outils CLI sur routes sensibles (curl, python, etc.)
        if ((0, detectionPatterns_js_1.isCLIToolOnSensitiveRoute)(ua, req.originalUrl)) {
            console.warn(`[SECURITY] CLI TOOL ON SENSITIVE ROUTE IP=${ip} ua=${ua.slice(0, 80)} path=${req.originalUrl}`);
            (0, ipCache_js_1.logSecurityEvent)('unauthorized_access', 'high', req, 403, `Outil CLI sur route sensible: ${ua.slice(0, 80)} -> ${req.originalUrl}`, {
                source: 'cli_tool_sensitive',
                userAgent: ua.slice(0, 300),
            }, true);
            (0, ipCache_js_1.trackAttack)(ip, req, 'suspicious_ua');
            res.status(403).json({
                succes: false,
                message: 'Acces refuse.',
            });
            return;
        }
    }
    // 6. Pas de User-Agent du tout = suspect (bots basiques)
    // NOTE: Les apps mobiles natives (React Native/Expo) n'envoient pas toujours
    // de User-Agent via fetch. On logue un warning mais on laisse passer.
    if (!ua || ua.length < 5) {
        console.warn(`[SECURITY] NO USER-AGENT IP=${ip} path=${req.originalUrl} ua="${ua}" (warning only)`);
        (0, ipCache_js_1.logSecurityEvent)('unauthorized_access', 'low', req, 0, `Requete sans User-Agent depuis ${ip}: ${req.originalUrl}`, {
            source: 'missing_ua',
        });
    }
    next();
};
exports.checkBlockedIP = checkBlockedIP;
// ============================================
// MIDDLEWARE SANITISATION QUERY PARAMS (PENTEST-01)
// ============================================
const stripMongoOperators = (obj, path = '') => {
    const stripped = [];
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        const result = {};
        for (const [key, val] of Object.entries(obj)) {
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
        const arr = [];
        for (let i = 0; i < obj.length; i++) {
            const sub = stripMongoOperators(obj[i], `${path}[${i}]`);
            stripped.push(...sub.stripped);
            arr.push(sub.cleaned);
        }
        return { cleaned: arr, stripped };
    }
    return { cleaned: obj, stripped };
};
const sanitizeQueryParams = (req, res, next) => {
    if (req.query && typeof req.query === 'object') {
        const { cleaned, stripped } = stripMongoOperators(req.query, 'query');
        if (stripped.length > 0) {
            const ip = req.ip || req.socket.remoteAddress || 'unknown';
            (0, ipCache_js_1.logSecurityEvent)('injection_attempt', 'critical', req, 200, `Injection NoSQL via query params detectee et nettoyee: ${stripped.join(', ')}`, {
                source: 'query_params',
                strippedKeys: stripped,
                originalQuery: JSON.stringify(req.query).slice(0, 500),
            }, false);
            (0, ipCache_js_1.trackAttack)(ip, req);
            req.query = cleaned;
        }
    }
    next();
};
exports.sanitizeQueryParams = sanitizeQueryParams;
// ============================================
// MIDDLEWARE MASQUAGE ADMIN (PENTEST-03)
// ============================================
const hideAdminRoutes = (req, res, next) => {
    // Si pas de token Authorization sur les routes admin, retourner 404 au lieu de 401
    if (!req.headers.authorization) {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        (0, ipCache_js_1.logSecurityEvent)('unauthorized_access', 'medium', req, 404, `Tentative d'acces admin sans token: ${req.originalUrl}`, {
            source: 'admin_enumeration',
        });
        // Tracker pour auto-blocage apres repetition
        (0, ipCache_js_1.trackAttack)(ip, req, 'admin_enum');
        res.status(404).json({
            succes: false,
            message: `Route ${req.method} ${req.originalUrl} non trouvée.`,
        });
        return;
    }
    next();
};
exports.hideAdminRoutes = hideAdminRoutes;
// ============================================
// MIDDLEWARE PRINCIPAL
// ============================================
const securityMonitor = (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    // --- 1. Compteur de requetes par IP (detection anomalie / DDoS) ---
    const ipData = ipCache_js_1.ipRequestCounts.get(ip) || { count: 0, window: now, errors: 0 };
    if (now - ipData.window > ipCache_js_1.CLEANUP_INTERVAL) {
        ipData.count = 0;
        ipData.errors = 0;
        ipData.window = now;
    }
    ipData.count++;
    ipCache_js_1.ipRequestCounts.set(ip, ipData);
    if (ipData.count === ipCache_js_1.ANOMALY_THRESHOLD) {
        (0, ipCache_js_1.logSecurityEvent)('anomaly', 'high', req, 0, `Trafic anormal: ${ipCache_js_1.ANOMALY_THRESHOLD} req/min depuis ${ip}`, {
            requestCount: ipData.count,
        });
        // Auto-blocage DDoS / scraping
        (0, ipCache_js_1.trackAttack)(ip, req, 'anomaly');
    }
    // --- 2. Scanner les payloads entrants et BLOQUER si injection detectee ---
    // URL + query params
    const urlCheck = (0, detectionPatterns_js_1.checkPayload)(req.originalUrl);
    if (urlCheck) {
        (0, ipCache_js_1.logSecurityEvent)(urlCheck.type, 'critical', req, 403, urlCheck.detail, {
            source: 'url',
            payload: req.originalUrl.slice(0, 200),
        }, true);
        // Tracker l'attaque pour auto-blocage
        (0, ipCache_js_1.trackAttack)(ip, req);
        // BLOQUER la requete
        res.status(403).json({
            succes: false,
            message: 'Requete bloquee : contenu malveillant detecte.',
        });
        return;
    }
    // Body (POST/PUT/PATCH)
    if (req.body && typeof req.body === 'object') {
        const bodyCheck = (0, detectionPatterns_js_1.deepScanValue)(req.body);
        if (bodyCheck) {
            (0, ipCache_js_1.logSecurityEvent)(bodyCheck.type, 'critical', req, 403, bodyCheck.detail, {
                source: 'body',
                payload: JSON.stringify(req.body).slice(0, 500),
            }, true);
            // Tracker l'attaque pour auto-blocage
            (0, ipCache_js_1.trackAttack)(ip, req);
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
    res.json = function (body) {
        const statusCode = res.statusCode;
        // 401 - Acces non autorise
        if (statusCode === 401) {
            const isLoginPath = req.path.includes('/connexion');
            const msg = body?.message || '';
            const isTokenExpired = msg.includes('invalide') || msg.includes('expiré') || msg.includes('expire');
            const isTokenMissing = msg.includes('manquant') || msg.includes('Session terminée');
            if (isLoginPath) {
                (0, ipCache_js_1.logSecurityEvent)('brute_force', 'medium', req, 401, `Echec login: ${msg || 'inconnu'}`, {
                    email: req.body?.email ? req.body.email.slice(0, 50) : 'N/A',
                });
                // Tracker brute force pour auto-blocage (ban temporaire, pas permanent)
                (0, ipCache_js_1.trackAttack)(ip, req, 'brute_force');
            }
            else if (isTokenExpired) {
                (0, ipCache_js_1.logSecurityEvent)('token_forgery', 'medium', req, 401, `Token invalide: ${msg || 'inconnu'}`, {
                    authHeader: (req.headers.authorization || '').slice(0, 50) + '...',
                });
                // Token falsifie ou expire = brute force
                (0, ipCache_js_1.trackAttack)(ip, req, 'brute_force');
            }
            else if (isTokenMissing) {
                // Token absent = erreur client (pas une attaque), on logue sans tracker
                (0, ipCache_js_1.logSecurityEvent)('unauthorized_access', 'low', req, 401, `Token manquant: ${req.originalUrl}`, {});
            }
            else {
                (0, ipCache_js_1.logSecurityEvent)('unauthorized_access', 'medium', req, 401, `Acces non autorise: ${req.originalUrl}`, {});
            }
        }
        // 403 - Permission insuffisante
        // On logue mais on ne track PAS comme menace
        // Les 403 applicatifs (permission refusee par l'app) sont normaux pour le staff
        // Seuls les 403 du security middleware (deja traites dans checkBlockedIP) sont des menaces
        if (statusCode === 403) {
            (0, ipCache_js_1.logSecurityEvent)('forbidden_access', 'medium', req, 403, `Permission refusee: ${body?.requiredPermission || req.originalUrl}`, {
                requiredPermission: body?.requiredPermission,
            });
            // PAS de trackAttack ici - les 403 applicatifs ne sont pas des attaques
        }
        // 429 - Rate limit
        if (statusCode === 429) {
            (0, ipCache_js_1.logSecurityEvent)('rate_limit_hit', 'medium', req, 429, `Rate limit declenche sur ${req.originalUrl}`, {});
            // Tracker abus rate limit pour auto-blocage
            (0, ipCache_js_1.trackAttack)(ip, req, 'rate_abuse');
            // Mettre a jour les erreurs IP
            const ipD = ipCache_js_1.ipRequestCounts.get(ip);
            if (ipD) {
                ipD.errors++;
                if (ipD.errors === ipCache_js_1.ERROR_THRESHOLD) {
                    (0, ipCache_js_1.logSecurityEvent)('anomaly', 'critical', req, 429, `IP ${ip} a atteint ${ipCache_js_1.ERROR_THRESHOLD} erreurs/min`, {
                        errorCount: ipD.errors,
                    });
                }
            }
        }
        // Inscription suspecte (pattern bot: inscription rapide sans UA classique)
        if (req.path.includes('/inscription') && req.method === 'POST' && statusCode === 201) {
            const ua = req.headers['user-agent'] || '';
            if (!ua || ua.length < 10 || /curl|wget|python|httpie|postman/i.test(ua)) {
                (0, ipCache_js_1.logSecurityEvent)('suspicious_signup', 'high', req, 201, `Inscription suspecte (UA: ${ua.slice(0, 100)})`, {
                    email: req.body?.email ? req.body.email.slice(0, 50) : 'N/A',
                    userAgent: ua.slice(0, 200),
                });
            }
        }
        return originalJson(body);
    };
    next();
};
exports.securityMonitor = securityMonitor;
// ============================================
// PURGE AUTO-BLOCKS AU DEMARRAGE
// ============================================
// Appeler cette fonction au demarrage du serveur pour purger les blocages automatiques.
// Utile quand un dev se retrouve bloque par le systeme de securite.
// Active via la variable d'environnement SECURITY_RESET=true
const purgeAutoBlocks = async () => {
    if (process.env.SECURITY_RESET !== 'true')
        return;
    try {
        const ipResult = await BlockedIP_js_1.default.deleteMany({ bloquePar: 'system_auto' });
        const deviceResult = await BannedDevice_js_1.default.deleteMany({ bloquePar: 'system_auto' });
        (0, ipCache_js_1.invalidateBlockedIPCache)();
        ipCache_js_1.threatCounters.clear();
        ipCache_js_1.ipRequestCounts.clear();
        console.log(`[SECURITY] PURGE AUTO-BLOCKS: ${ipResult.deletedCount} IP(s), ${deviceResult.deletedCount} appareil(s) supprime(s)`);
        console.log('[SECURITY] Pensez a retirer SECURITY_RESET=true apres le redemarrage');
    }
    catch (err) {
        console.error('[SECURITY] Erreur purge auto-blocks:', err);
    }
};
exports.purgeAutoBlocks = purgeAutoBlocks;
//# sourceMappingURL=middlewares.js.map