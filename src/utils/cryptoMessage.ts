import crypto from 'crypto';

/**
 * Module de chiffrement des messages - AES-256-GCM (authentifié)
 *
 * SÉCURITÉ:
 * - v2 (actuel): AES-256-GCM avec IV 12 bytes + authTag 16 bytes
 * - v1 (legacy): AES-256-CBC - déchiffrement uniquement pour rétro-compatibilité
 *
 * FORMAT DE STOCKAGE:
 * - v2: "v2:{iv_base64}:{ciphertext_base64}:{authTag_base64}"
 * - v1: "{iv_hex}:{ciphertext_hex}" (ancien format)
 *
 * VARIABLES D'ENVIRONNEMENT:
 * - MESSAGE_ENCRYPTION_KEY_BASE64: Clé 32 bytes encodée en base64 (recommandé)
 * - MESSAGE_ENCRYPTION_KEY: Fallback pour compatibilité (deprecated)
 */

// ============================================
// CONFIGURATION
// ============================================

const GCM_IV_LENGTH = 12; // Recommandé pour GCM
const GCM_AUTH_TAG_LENGTH = 16;
const CBC_IV_LENGTH = 16; // Pour compatibilité v1

// Version actuelle du chiffrement
const CURRENT_VERSION = 2;

// ============================================
// GESTION DE LA CLÉ
// ============================================

/**
 * Récupère la clé de chiffrement depuis les variables d'environnement
 * Priorité: MESSAGE_ENCRYPTION_KEY_BASE64 > MESSAGE_ENCRYPTION_KEY (avec KDF)
 */
const getEncryptionKey = (): Buffer => {
  // Option 1: Clé directe en base64 (recommandé)
  const keyBase64 = process.env.MESSAGE_ENCRYPTION_KEY_BASE64;
  if (keyBase64) {
    const key = Buffer.from(keyBase64, 'base64');
    if (key.length !== 32) {
      throw new Error(
        `MESSAGE_ENCRYPTION_KEY_BASE64 doit être exactement 32 bytes (256 bits). ` +
        `Reçu: ${key.length} bytes. Générez une clé avec: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
      );
    }
    return key;
  }

  // Option 2: Fallback avec dérivation (pour compatibilité avec anciennes configs)
  const legacyKey = process.env.MESSAGE_ENCRYPTION_KEY;
  const salt = process.env.MESSAGE_ENCRYPTION_SALT;

  if (legacyKey) {
    if (!salt) {
      console.warn(
        '[CryptoMessage] ⚠️  MESSAGE_ENCRYPTION_KEY utilisé sans MESSAGE_ENCRYPTION_SALT. ' +
        'Utilisation d\'un salt par défaut (NON RECOMMANDÉ). ' +
        'Migrez vers MESSAGE_ENCRYPTION_KEY_BASE64.'
      );
    }
    // Utiliser scrypt avec un salt configurable (ou default pour compatibilité)
    return crypto.scryptSync(legacyKey, salt || 'salt', 32);
  }

  throw new Error(
    'Clé de chiffrement manquante. Définissez MESSAGE_ENCRYPTION_KEY_BASE64 (recommandé) ' +
    'ou MESSAGE_ENCRYPTION_KEY dans les variables d\'environnement.'
  );
};

// Clé mise en cache au démarrage
let encryptionKey: Buffer | null = null;

const getKey = (): Buffer => {
  if (!encryptionKey) {
    encryptionKey = getEncryptionKey();
  }
  return encryptionKey;
};

// ============================================
// CHIFFREMENT V2 (GCM - Authentifié)
// ============================================

/**
 * Chiffre un message avec AES-256-GCM
 * @param plaintext - Le texte en clair
 * @returns Le texte chiffré au format "v2:{iv}:{ciphertext}:{tag}"
 */
export const encryptGCM = (plaintext: string): string => {
  const key = getKey();
  const iv = crypto.randomBytes(GCM_IV_LENGTH);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Format: v2:iv:ciphertext:tag (tout en base64)
  return `v2:${iv.toString('base64')}:${encrypted}:${authTag.toString('base64')}`;
};

/**
 * Déchiffre un message chiffré avec AES-256-GCM
 * @param ciphertext - Le texte chiffré au format v2
 * @returns Le texte en clair
 * @throws Error si le tag d'authentification est invalide (tampered data)
 */
export const decryptGCM = (ciphertext: string): string => {
  const parts = ciphertext.split(':');
  if (parts.length !== 4 || parts[0] !== 'v2') {
    throw new Error('Format v2 invalide');
  }

  const [, ivBase64, encryptedBase64, tagBase64] = parts;

  const key = getKey();
  const iv = Buffer.from(ivBase64, 'base64');
  const encrypted = Buffer.from(encryptedBase64, 'base64');
  const authTag = Buffer.from(tagBase64, 'base64');

  // Validation des longueurs
  if (iv.length !== GCM_IV_LENGTH) {
    throw new Error(`IV invalide: attendu ${GCM_IV_LENGTH} bytes, reçu ${iv.length}`);
  }
  if (authTag.length !== GCM_AUTH_TAG_LENGTH) {
    throw new Error(`AuthTag invalide: attendu ${GCM_AUTH_TAG_LENGTH} bytes, reçu ${authTag.length}`);
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, undefined, 'utf8');
  decrypted += decipher.final('utf8'); // Throws si authTag invalide

  return decrypted;
};

// ============================================
// DÉCHIFFREMENT V1 (CBC - Legacy)
// ============================================

/**
 * Déchiffre un message au format v1 (AES-256-CBC legacy)
 * @param ciphertext - Le texte chiffré au format "{iv_hex}:{encrypted_hex}"
 * @returns Le texte en clair
 */
export const decryptCBC = (ciphertext: string): string => {
  const colonIndex = ciphertext.indexOf(':');
  if (colonIndex === -1) {
    throw new Error('Format v1 invalide: pas de séparateur');
  }

  const ivHex = ciphertext.substring(0, colonIndex);
  const encryptedHex = ciphertext.substring(colonIndex + 1);

  // Validation du format hex
  if (ivHex.length !== CBC_IV_LENGTH * 2 || !/^[0-9a-fA-F]+$/.test(ivHex)) {
    throw new Error('IV v1 invalide');
  }
  if (!encryptedHex || !/^[0-9a-fA-F]+$/.test(encryptedHex)) {
    throw new Error('Ciphertext v1 invalide');
  }

  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

// ============================================
// API PUBLIQUE
// ============================================

/**
 * Chiffre un message (toujours en v2/GCM)
 * @param plaintext - Le texte en clair
 * @returns Le texte chiffré
 */
export const chiffrerMessage = (plaintext: string): string => {
  return encryptGCM(plaintext);
};

/**
 * Déchiffre un message avec détection automatique de version
 * - v2: AES-256-GCM (authentifié)
 * - v1: AES-256-CBC (legacy, déprécié)
 * - Texte brut: retourné tel quel (données très anciennes)
 *
 * @param ciphertext - Le texte chiffré
 * @returns Le texte en clair
 */
export const dechiffrerMessage = (ciphertext: string): string => {
  // Validation basique
  if (!ciphertext || typeof ciphertext !== 'string') {
    throw new Error('Contenu chiffré manquant');
  }

  // Détection v2 (GCM)
  if (ciphertext.startsWith('v2:')) {
    return decryptGCM(ciphertext);
  }

  // Détection v1 (CBC legacy)
  const colonIndex = ciphertext.indexOf(':');
  if (colonIndex !== -1) {
    const potentialIv = ciphertext.substring(0, colonIndex);
    // IV CBC = 16 bytes = 32 hex chars
    if (potentialIv.length === 32 && /^[0-9a-fA-F]+$/.test(potentialIv)) {
      try {
        return decryptCBC(ciphertext);
      } catch (error) {
        // Si échec CBC, peut-être texte brut avec ':'
        console.warn('[CryptoMessage] Échec déchiffrement v1, tentative texte brut');
      }
    }
  }

  // Fallback: texte non chiffré (données très anciennes ou corruption)
  console.warn('[CryptoMessage] Format non reconnu, retour du texte brut');
  return ciphertext;
};

/**
 * Détecte la version de chiffrement d'un message
 * @param ciphertext - Le texte chiffré
 * @returns 2 pour GCM, 1 pour CBC, 0 pour non chiffré
 */
export const detectVersion = (ciphertext: string): 0 | 1 | 2 => {
  if (!ciphertext || typeof ciphertext !== 'string') {
    return 0;
  }

  if (ciphertext.startsWith('v2:')) {
    return 2;
  }

  const colonIndex = ciphertext.indexOf(':');
  if (colonIndex !== -1) {
    const potentialIv = ciphertext.substring(0, colonIndex);
    if (potentialIv.length === 32 && /^[0-9a-fA-F]+$/.test(potentialIv)) {
      return 1;
    }
  }

  return 0;
};

/**
 * Migre un message de v1 vers v2 (re-chiffrement)
 * @param v1Ciphertext - Le texte chiffré en v1
 * @returns Le texte chiffré en v2, ou null si déjà en v2
 */
export const migrateToV2 = (v1Ciphertext: string): string | null => {
  const version = detectVersion(v1Ciphertext);

  if (version === 2) {
    return null; // Déjà en v2
  }

  // Déchiffrer puis re-chiffrer en v2
  const plaintext = dechiffrerMessage(v1Ciphertext);
  return encryptGCM(plaintext);
};

/**
 * Génère une nouvelle clé de chiffrement (pour setup initial)
 * @returns Clé 32 bytes en base64
 */
export const generateKey = (): string => {
  return crypto.randomBytes(32).toString('base64');
};

// ============================================
// EXPORTS POUR TESTS
// ============================================

export const _internal = {
  GCM_IV_LENGTH,
  GCM_AUTH_TAG_LENGTH,
  CBC_IV_LENGTH,
  CURRENT_VERSION,
  getKey,
  encryptGCM,
  decryptGCM,
  decryptCBC,
};
