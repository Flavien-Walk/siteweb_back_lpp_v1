import { Request } from 'express';
import { SecurityEventType } from '../../models/SecurityEvent.js';

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
// DETECTION DE PAYLOADS MALVEILLANTS
// ============================================
export const checkPayload = (value: string): { type: SecurityEventType; detail: string } | null => {
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

export const deepScanValue = (obj: unknown, depth = 0): { type: SecurityEventType; detail: string } | null => {
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
// SYSTEME AUTO-PROTECTION STRICT (tolerance zero)
// ============================================

// Types de menaces
// Bans PERMANENTS : uniquement pour les vraies attaques (injection, hacking tools, proxy)
// Bans TEMPORAIRES : pour les comportements suspects (brute force, rate abuse, 403 repetes)
export type ThreatType = 'injection' | 'brute_force' | 'admin_enum' | 'rate_abuse' | 'anomaly' | 'forbidden' | 'proxy' | 'suspicious_ua';

export interface ThreatConfig {
  threshold: number;       // nombre de tentatives avant blocage
  window: number;          // fenetre de temps (ms)
  permanent: boolean;      // ban permanent (true = pas d'expiry)
  duration: number;        // duree du ban temporaire (ms) - ignore si permanent=true
  banDevice: boolean;      // bannir aussi l'appareil (reserve aux vraies attaques)
}

export const THREAT_CONFIGS: Record<ThreatType, ThreatConfig> = {
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
export const MALICIOUS_UA_PATTERNS = [
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

export const detectProxy = (req: Request): string | null => {
  // 1. Headers proxy classiques
  for (const header of PROXY_HEADERS) {
    if (req.headers[header]) {
      return `Header proxy detecte: ${header}=${String(req.headers[header]).slice(0, 100)}`;
    }
  }

  // 2. Chaine X-Forwarded-For suspecte (multiple proxies)
  // Render = 1-2 IPs normal. Carrier NAT/CDN = 3-6 possible.
  // > 8 = chaine proxy deliberee (Tor, multi-hop VPN)
  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    const ips = String(xff).split(',').map(s => s.trim());
    if (ips.length > 8) {
      return `Chaine proxy detectee: X-Forwarded-For contient ${ips.length} IPs`;
    }
  }

  return null;
};

export const detectMaliciousUA = (ua: string): string | null => {
  for (const pattern of MALICIOUS_UA_PATTERNS) {
    if (pattern.test(ua)) {
      return `Outil de hacking detecte: ${ua.slice(0, 100)}`;
    }
  }
  return null;
};

export const isCLIToolOnSensitiveRoute = (ua: string, path: string): boolean => {
  const isSensitive = SENSITIVE_ROUTES.some(route => path.startsWith(route));
  if (!isSensitive) return false;
  return CLI_UA_PATTERNS.some(pattern => pattern.test(ua));
};
