/**
 * security/health.ts
 * Analyse complete de la sante du backend en temps reel
 */
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import os from 'os';
import SecurityEvent from '../../models/SecurityEvent.js';
import BlockedIP from '../../models/BlockedIP.js';
import Utilisateur from '../../models/Utilisateur.js';
import Publication from '../../models/Publication.js';
import Commentaire from '../../models/Commentaire.js';
import Projet from '../../models/Projet.js';
import Message from '../../models/Message.js';
import Report from '../../models/Report.js';
import AuditLog from '../../models/AuditLog.js';

// Collections critiques a verifier avec leurs index attendus
const COLLECTIONS_CRITIQUES = [
  { nom: 'utilisateurs', model: Utilisateur, indexCritiques: ['email_1'] },
  { nom: 'publications', model: Publication, indexCritiques: [] },
  { nom: 'commentaires', model: Commentaire, indexCritiques: [] },
  { nom: 'projets', model: Projet, indexCritiques: [] },
  { nom: 'messages', model: Message, indexCritiques: [] },
  { nom: 'reports', model: Report, indexCritiques: [] },
  { nom: 'audit_logs', model: AuditLog, indexCritiques: [] },
  { nom: 'security_events', model: SecurityEvent, indexCritiques: ['type_1', 'ip_1'] },
  { nom: 'blocked_ips', model: BlockedIP, indexCritiques: ['ip_1'] },
];

// Variables d'environnement critiques (sans exposer les valeurs)
const ENV_VARS_REQUISES = [
  'MONGODB_URI',
  'JWT_SECRET',
  'MESSAGE_ENCRYPTION_KEY',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'CLIENT_URL',
];

const ENV_VARS_OPTIONNELLES = [
  'LOCAL_MODERATION_ORIGINS',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'EMAIL_HOST',
  'EMAIL_USER',
  'NODE_ENV',
  'PORT',
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
  const jours = Math.floor(seconds / 86400);
  const heures = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (jours > 0) parts.push(`${jours}j`);
  if (heures > 0) parts.push(`${heures}h`);
  parts.push(`${minutes}min`);
  return parts.join(' ');
}

/**
 * GET /api/admin/security/health
 * Analyse complete de la sante du backend en temps reel
 */
export const getBackendHealth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const startTime = Date.now();
    const now = new Date();
    const derniere1h = new Date(now.getTime() - 60 * 60 * 1000);
    const derniere24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // ============ 1. ETAT MONGODB ============
    const mongoState = mongoose.connection.readyState;
    const mongoStateLabels: Record<number, string> = {
      0: 'deconnecte',
      1: 'connecte',
      2: 'connexion_en_cours',
      3: 'deconnexion_en_cours',
    };

    let dbPingMs = -1;
    let dbStats: any = null;
    try {
      const pingStart = Date.now();
      await mongoose.connection.db!.admin().ping();
      dbPingMs = Date.now() - pingStart;

      dbStats = await mongoose.connection.db!.stats();
    } catch {
      dbPingMs = -1;
    }

    // ============ 2. VERIFICATION COLLECTIONS ============
    const collectionsResults = await Promise.all(
      COLLECTIONS_CRITIQUES.map(async (col) => {
        try {
          const countStart = Date.now();
          const count = await col.model.estimatedDocumentCount();
          const latenceMs = Date.now() - countStart;

          // Recuperer les index
          let indexes: string[] = [];
          try {
            const rawIndexes = await col.model.collection.indexes();
            indexes = rawIndexes.map((idx: any) => Object.keys(idx.key).join('_'));
          } catch {
            indexes = [];
          }

          // Verifier les index critiques
          const indexManquants = col.indexCritiques.filter(
            (idx) => !indexes.some((i) => i.includes(idx.replace('_1', '')))
          );

          return {
            nom: col.nom,
            statut: 'ok' as const,
            documents: count,
            latenceMs,
            indexes: indexes.length,
            indexManquants: indexManquants.length > 0 ? indexManquants : undefined,
          };
        } catch (err: any) {
          return {
            nom: col.nom,
            statut: 'erreur' as const,
            erreur: err.message?.slice(0, 200),
            documents: 0,
            latenceMs: -1,
            indexes: 0,
          };
        }
      })
    );

    // ============ 3. VARIABLES D'ENVIRONNEMENT ============
    const envCheck = {
      requises: ENV_VARS_REQUISES.map((v) => ({
        nom: v,
        present: !!process.env[v],
        longueur: process.env[v] ? process.env[v]!.length : 0,
      })),
      optionnelles: ENV_VARS_OPTIONNELLES.map((v) => ({
        nom: v,
        present: !!process.env[v],
      })),
      manquantes: ENV_VARS_REQUISES.filter((v) => !process.env[v]),
    };

    // ============ 4. MEMOIRE & SYSTEME ============
    const memUsage = process.memoryUsage();
    const systemInfo = {
      plateforme: os.platform(),
      architecture: os.arch(),
      nodeVersion: process.version,
      uptime: {
        processus: Math.floor(process.uptime()),
        systeme: Math.floor(os.uptime()),
        formatProcessus: formatUptime(process.uptime()),
        formatSysteme: formatUptime(os.uptime()),
      },
      memoire: {
        rss: formatBytes(memUsage.rss),
        heapTotal: formatBytes(memUsage.heapTotal),
        heapUsed: formatBytes(memUsage.heapUsed),
        external: formatBytes(memUsage.external),
        heapUsagePct: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
        rssRaw: memUsage.rss,
        heapUsedRaw: memUsage.heapUsed,
        heapTotalRaw: memUsage.heapTotal,
      },
      cpus: os.cpus().length,
      memoireSysteme: {
        total: formatBytes(os.totalmem()),
        libre: formatBytes(os.freemem()),
        usagePct: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
      },
      pid: process.pid,
    };

    // ============ 5. ANALYSE DE SECURITE EN COURS ============
    const [
      eventsLastHour,
      criticalEventsLastHour,
      blockedIPsActifs,
      activeAttacksCount,
      injectionAttempts24h,
      bruteForceAttempts24h,
      suspiciousSignups24h,
      recentSecurityEvents,
    ] = await Promise.all([
      SecurityEvent.countDocuments({ dateCreation: { $gte: derniere1h } }),
      SecurityEvent.countDocuments({ dateCreation: { $gte: derniere1h }, severity: 'critical' }),
      BlockedIP.countDocuments({ actif: true }),
      SecurityEvent.countDocuments({
        dateCreation: { $gte: derniere1h },
        severity: { $in: ['critical', 'high'] },
        blocked: false,
      }),
      SecurityEvent.countDocuments({
        dateCreation: { $gte: derniere24h },
        type: 'injection_attempt',
      }),
      SecurityEvent.countDocuments({
        dateCreation: { $gte: derniere24h },
        type: 'brute_force',
      }),
      SecurityEvent.countDocuments({
        dateCreation: { $gte: derniere24h },
        type: 'suspicious_signup',
      }),
      SecurityEvent.find({ dateCreation: { $gte: derniere1h } })
        .sort({ dateCreation: -1 })
        .limit(10)
        .select('type severity ip details blocked dateCreation')
        .lean(),
    ]);

    // ============ 6. VERIFICATION INTEGRITE DONNEES ============
    const [
      usersWithoutEmail,
      usersWithSuspiciousRoles,
      orphanedReports,
      recentAuditCount,
    ] = await Promise.all([
      // Utilisateurs sans email (anomalie grave)
      Utilisateur.countDocuments({ email: { $exists: false } }).catch(() => -1),
      // Utilisateurs avec role admin non-attendu (possible injection)
      Utilisateur.countDocuments({
        role: { $in: ['super_admin', 'admin_modo'] },
      }).catch(() => -1),
      // Reports sans auteur (possible corruption)
      Report.countDocuments({ auteur: { $exists: false } }).catch(() => -1),
      // Activite audit (si 0 en 24h, possible dysfonctionnement)
      AuditLog.countDocuments({ dateCreation: { $gte: derniere24h } }).catch(() => -1),
    ]);

    const integriteChecks = [
      {
        nom: 'Utilisateurs sans email',
        statut: usersWithoutEmail === 0 ? 'ok' : 'alerte',
        valeur: usersWithoutEmail,
        description: usersWithoutEmail > 0
          ? `${usersWithoutEmail} utilisateur(s) sans email detecte(s) - possible corruption de donnees`
          : 'Tous les utilisateurs ont un email valide',
      },
      {
        nom: 'Comptes administrateurs',
        statut: usersWithSuspiciousRoles <= 5 ? 'ok' : 'alerte',
        valeur: usersWithSuspiciousRoles,
        description: usersWithSuspiciousRoles > 5
          ? `${usersWithSuspiciousRoles} comptes admin detectes - verifier si c\'est normal`
          : `${usersWithSuspiciousRoles} compte(s) admin - nombre normal`,
      },
      {
        nom: 'Reports orphelins',
        statut: orphanedReports === 0 ? 'ok' : 'alerte',
        valeur: orphanedReports,
        description: orphanedReports > 0
          ? `${orphanedReports} report(s) sans auteur - possible suppression de compte`
          : 'Tous les signalements ont un auteur',
      },
      {
        nom: 'Activite audit 24h',
        statut: recentAuditCount > 0 ? 'ok' : 'info',
        valeur: recentAuditCount,
        description: recentAuditCount === 0
          ? 'Aucune action moderee en 24h - normal si pas d\'activite'
          : `${recentAuditCount} action(s) de moderation enregistree(s)`,
      },
    ];

    // ============ 7. CALCUL SCORE SANTE GLOBAL ============
    let healthScore = 100;
    const problemes: string[] = [];

    // MongoDB
    if (mongoState !== 1) { healthScore -= 50; problemes.push('Base de donnees non connectee'); }
    if (dbPingMs > 500) { healthScore -= 10; problemes.push(`Latence DB elevee: ${dbPingMs}ms`); }
    if (dbPingMs > 1000) { healthScore -= 10; problemes.push('Latence DB critique'); }

    // Collections
    const collectionsEnErreur = collectionsResults.filter((c) => c.statut === 'erreur');
    if (collectionsEnErreur.length > 0) {
      healthScore -= collectionsEnErreur.length * 10;
      problemes.push(`${collectionsEnErreur.length} collection(s) en erreur`);
    }

    // Index manquants
    const totalIndexManquants = collectionsResults.reduce(
      (sum, c) => sum + (c.indexManquants?.length || 0), 0
    );
    if (totalIndexManquants > 0) {
      healthScore -= totalIndexManquants * 5;
      problemes.push(`${totalIndexManquants} index manquant(s)`);
    }

    // Variables d'env
    if (envCheck.manquantes.length > 0) {
      healthScore -= envCheck.manquantes.length * 5;
      problemes.push(`${envCheck.manquantes.length} variable(s) d'environnement manquante(s)`);
    }

    // Memoire
    if (systemInfo.memoire.heapUsagePct > 85) {
      healthScore -= 15;
      problemes.push(`Memoire heap elevee: ${systemInfo.memoire.heapUsagePct}%`);
    } else if (systemInfo.memoire.heapUsagePct > 70) {
      healthScore -= 5;
      problemes.push(`Memoire heap moderee: ${systemInfo.memoire.heapUsagePct}%`);
    }

    // Securite
    if (criticalEventsLastHour > 0) {
      healthScore -= 15;
      problemes.push(`${criticalEventsLastHour} evenement(s) critique(s) cette heure`);
    }
    if (activeAttacksCount > 0) {
      healthScore -= 10;
      problemes.push(`${activeAttacksCount} attaque(s) non bloquee(s) cette heure`);
    }
    if (injectionAttempts24h > 10) {
      healthScore -= 5;
      problemes.push(`${injectionAttempts24h} tentatives d'injection en 24h`);
    }

    // Integrite
    const integritePbs = integriteChecks.filter((c) => c.statut === 'alerte');
    if (integritePbs.length > 0) {
      healthScore -= integritePbs.length * 5;
      problemes.push(...integritePbs.map((c) => c.description));
    }

    healthScore = Math.max(0, Math.min(100, healthScore));

    let healthStatus: 'sain' | 'degrade' | 'critique' = 'sain';
    if (healthScore < 50) healthStatus = 'critique';
    else if (healthScore < 80) healthStatus = 'degrade';

    const dureeMs = Date.now() - startTime;

    res.json({
      succes: true,
      data: {
        score: healthScore,
        statut: healthStatus,
        timestamp: now.toISOString(),
        dureeAnalyseMs: dureeMs,
        problemes,

        baseDeDonnees: {
          etat: mongoStateLabels[mongoState] || 'inconnu',
          pingMs: dbPingMs,
          nom: dbStats?.db || 'inconnu',
          taille: dbStats ? formatBytes(dbStats.dataSize || 0) : 'inconnu',
          tailleIndex: dbStats ? formatBytes(dbStats.indexSize || 0) : 'inconnu',
          collections: dbStats?.collections || 0,
          objets: dbStats?.objects || 0,
        },

        collectionsDetails: collectionsResults,

        environnement: envCheck,

        systeme: systemInfo,

        securiteEnCours: {
          evenementsHeure: eventsLastHour,
          evenementsCritiquesHeure: criticalEventsLastHour,
          ipsBloquees: blockedIPsActifs,
          attaquesNonBloquees: activeAttacksCount,
          injections24h: injectionAttempts24h,
          bruteForce24h: bruteForceAttempts24h,
          inscriptionsSuspectes24h: suspiciousSignups24h,
          derniersEvenements: recentSecurityEvents,
        },

        integrite: integriteChecks,
      },
    });
  } catch (error) {
    next(error);
  }
};
