/**
 * Script de migration du chiffrement des messages vers AES-256-GCM (v2)
 *
 * Ce script migre les messages chiffrés en v1 (CBC) vers v2 (GCM) par batch.
 * Il est conçu pour être exécuté de manière sécurisée en production.
 *
 * Usage:
 *   npx ts-node scripts/migrate-encryption-v2.ts [options]
 *
 * Options:
 *   --dry-run         Affiche ce qui serait migré sans modifier la DB
 *   --batch-size=N    Nombre de messages par batch (défaut: 100)
 *   --delay=N         Délai en ms entre les batchs (défaut: 1000)
 *   --limit=N         Nombre max de messages à migrer (défaut: illimité)
 *   --resume          Reprendre depuis le dernier checkpoint
 *   --retry-failed    Réessayer uniquement les messages en erreur
 *   --checkpoint=FILE Fichier de checkpoint (défaut: .migration-checkpoint.json)
 *
 * Exemple:
 *   npx ts-node scripts/migrate-encryption-v2.ts --dry-run
 *   npx ts-node scripts/migrate-encryption-v2.ts --batch-size=50 --delay=2000
 *   npx ts-node scripts/migrate-encryption-v2.ts --resume
 *   npx ts-node scripts/migrate-encryption-v2.ts --retry-failed
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Message } from '../src/models/Message.js';
import {
  detectVersion,
  migrateToV2,
  dechiffrerMessage,
} from '../src/utils/cryptoMessage.js';

dotenv.config();

// ============================================
// CONFIGURATION
// ============================================

interface MigrationConfig {
  dryRun: boolean;
  batchSize: number;
  delayMs: number;
  limit: number | null;
  resume: boolean;
  retryFailed: boolean;
  checkpointFile: string;
}

interface Checkpoint {
  lastSuccessId: string | null; // Dernier ID migré avec SUCCÈS
  failedIds: string[];          // IDs en erreur à réessayer
  processedCount: number;
  stats: MigrationStats;
  startedAt: string;
  updatedAt: string;
}

const parseArgs = (): MigrationConfig => {
  const args = process.argv.slice(2);
  const config: MigrationConfig = {
    dryRun: false,
    batchSize: 100,
    delayMs: 1000,
    limit: null,
    resume: false,
    retryFailed: false,
    checkpointFile: '.migration-checkpoint.json',
  };

  for (const arg of args) {
    if (arg === '--dry-run') {
      config.dryRun = true;
    } else if (arg === '--resume') {
      config.resume = true;
    } else if (arg === '--retry-failed') {
      config.retryFailed = true;
    } else if (arg.startsWith('--batch-size=')) {
      config.batchSize = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--delay=')) {
      config.delayMs = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--limit=')) {
      config.limit = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--checkpoint=')) {
      config.checkpointFile = arg.split('=')[1];
    }
  }

  return config;
};

// ============================================
// CHECKPOINT MANAGEMENT
// ============================================

const loadCheckpoint = (filePath: string): Checkpoint | null => {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  try {
    const data = fs.readFileSync(fullPath, 'utf-8');
    const checkpoint = JSON.parse(data) as Checkpoint;
    // Migration: ancien format sans failedIds
    if (!checkpoint.failedIds) {
      checkpoint.failedIds = [];
    }
    // Migration: ancien format lastProcessedId -> lastSuccessId
    if ((checkpoint as unknown as { lastProcessedId?: string }).lastProcessedId && !checkpoint.lastSuccessId) {
      checkpoint.lastSuccessId = (checkpoint as unknown as { lastProcessedId: string }).lastProcessedId;
    }
    return checkpoint;
  } catch {
    console.warn(`[WARN] Impossible de lire le checkpoint: ${fullPath}`);
    return null;
  }
};

const saveCheckpoint = (filePath: string, checkpoint: Checkpoint): void => {
  const fullPath = path.resolve(filePath);
  checkpoint.updatedAt = new Date().toISOString();
  fs.writeFileSync(fullPath, JSON.stringify(checkpoint, null, 2));
};

const deleteCheckpoint = (filePath: string): void => {
  const fullPath = path.resolve(filePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};

// ============================================
// STATISTIQUES
// ============================================

interface MigrationStats {
  total: number;
  v1: number;
  v2: number;
  unencrypted: number;
  migrated: number;
  errors: number;
  skipped: number;
  retried: number;
}

const createStats = (): MigrationStats => ({
  total: 0,
  v1: 0,
  v2: 0,
  unencrypted: 0,
  migrated: 0,
  errors: 0,
  skipped: 0,
  retried: 0,
});

// ============================================
// MIGRATION
// ============================================

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Migre un seul message
 * @returns true si succès ou skip, false si erreur
 */
const migrateMessage = async (
  messageId: mongoose.Types.ObjectId,
  contenuCrypte: string | null | undefined,
  dryRun: boolean,
  stats: MigrationStats
): Promise<boolean> => {
  try {
    // Gestion des cas null/undefined
    if (contenuCrypte === null || contenuCrypte === undefined) {
      console.warn(`\n[WARN] Message ${messageId}: contenuCrypte est null/undefined`);
      stats.skipped++;
      return true; // On considère comme traité (pas d'erreur à retry)
    }

    if (typeof contenuCrypte !== 'string') {
      console.warn(`\n[WARN] Message ${messageId}: contenuCrypte n'est pas une string`);
      stats.skipped++;
      return true;
    }

    const version = detectVersion(contenuCrypte);

    if (version === 2) {
      stats.v2++;
      stats.skipped++;
      return true; // Déjà en v2
    }

    if (version === 0) {
      stats.unencrypted++;
      stats.skipped++;
      return true; // Non chiffré
    }

    stats.v1++;

    // Tenter la migration
    const newContent = migrateToV2(contenuCrypte);
    if (!newContent) {
      stats.skipped++;
      return true;
    }

    // Vérifier que le déchiffrement fonctionne (roundtrip test)
    try {
      const decrypted = dechiffrerMessage(newContent);
      if (!decrypted) {
        console.error(`\n[ERROR] Message ${messageId}: déchiffrement v2 retourne vide`);
        stats.errors++;
        return false;
      }
    } catch {
      console.error(`\n[ERROR] Message ${messageId}: échec roundtrip test`);
      stats.errors++;
      return false;
    }

    if (dryRun) {
      stats.migrated++;
      return true;
    }

    // Mise à jour en base
    await Message.updateOne(
      { _id: messageId },
      { $set: { contenuCrypte: newContent } }
    );

    stats.migrated++;
    return true;
  } catch {
    console.error(`\n[ERROR] Message ${messageId}: migration échouée`);
    stats.errors++;
    return false;
  }
};

/**
 * Réessaye les messages en erreur
 */
const retryFailedMessages = async (
  failedIds: string[],
  dryRun: boolean,
  stats: MigrationStats
): Promise<string[]> => {
  if (failedIds.length === 0) {
    return [];
  }

  console.log(`\nRéessai de ${failedIds.length} messages en erreur...`);
  const stillFailed: string[] = [];

  for (const idStr of failedIds) {
    try {
      const msg = await Message.findById(idStr, { _id: 1, contenuCrypte: 1 }).lean();
      if (!msg) {
        console.warn(`\n[WARN] Message ${idStr}: introuvable (peut-être supprimé)`);
        continue; // Ne pas remettre en failedIds
      }

      const success = await migrateMessage(msg._id, msg.contenuCrypte, dryRun, stats);
      if (success) {
        stats.retried++;
      } else {
        stillFailed.push(idStr);
      }
    } catch {
      stillFailed.push(idStr);
    }
  }

  return stillFailed;
};

/**
 * Filtre MongoDB robuste pour les messages non-v2
 */
const buildNonV2Query = (lastSuccessId: string | null): Record<string, unknown> => {
  const query: Record<string, unknown> = {
    // Filtre robuste: string uniquement, pas null/undefined, pas déjà v2
    contenuCrypte: {
      $type: 'string',
      $not: /^v2:/,
    },
  };

  // Si on a un lastSuccessId, on continue après celui-ci
  if (lastSuccessId) {
    query._id = { $gt: new mongoose.Types.ObjectId(lastSuccessId) };
  }

  return query;
};

/**
 * Migre un batch de messages
 * IMPORTANT: lastSuccessId n'avance que si le message est migré avec succès
 */
const migrateBatch = async (
  checkpoint: Checkpoint,
  limit: number,
  dryRun: boolean
): Promise<{ processedCount: number; hasMore: boolean }> => {
  const query = buildNonV2Query(checkpoint.lastSuccessId);

  const messages = await Message.find(query, { _id: 1, contenuCrypte: 1 })
    .sort({ _id: 1 })
    .limit(limit)
    .lean();

  if (messages.length === 0) {
    return { processedCount: 0, hasMore: false };
  }

  let processedCount = 0;

  for (const msg of messages) {
    const success = await migrateMessage(msg._id, msg.contenuCrypte, dryRun, checkpoint.stats);
    checkpoint.stats.total++;
    processedCount++;

    if (success) {
      // SUCCÈS: on avance le curseur
      checkpoint.lastSuccessId = msg._id.toString();
      // Retirer des failedIds si présent
      const failedIndex = checkpoint.failedIds.indexOf(msg._id.toString());
      if (failedIndex !== -1) {
        checkpoint.failedIds.splice(failedIndex, 1);
      }
    } else {
      // ÉCHEC: on ajoute aux failedIds (sans avancer le curseur pour ce message)
      // Mais on continue quand même avec le prochain message
      if (!checkpoint.failedIds.includes(msg._id.toString())) {
        checkpoint.failedIds.push(msg._id.toString());
      }
      // On avance quand même le curseur pour ne pas reboucler sur le même
      // Les failedIds seront réessayés séparément
      checkpoint.lastSuccessId = msg._id.toString();
    }
  }

  return { processedCount, hasMore: messages.length === limit };
};

const runMigration = async (config: MigrationConfig) => {
  console.log('='.repeat(60));
  console.log('Migration du chiffrement vers AES-256-GCM (v2)');
  console.log('='.repeat(60));
  console.log(`Mode: ${config.dryRun ? 'DRY-RUN (aucune modification)' : 'PRODUCTION'}`);
  console.log(`Batch size: ${config.batchSize}`);
  console.log(`Délai entre batchs: ${config.delayMs}ms`);
  console.log(`Limite: ${config.limit || 'Aucune'}`);
  console.log(`Checkpoint: ${config.checkpointFile}`);
  console.log(`Resume: ${config.resume ? 'Oui' : 'Non'}`);
  console.log(`Retry failed: ${config.retryFailed ? 'Oui' : 'Non'}`);
  console.log('='.repeat(60));
  console.log('');

  // Connexion MongoDB
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI manquant dans les variables d\'environnement');
  }

  console.log('Connexion à MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connecté.');
  console.log('');

  // Charger ou créer le checkpoint
  let checkpoint: Checkpoint;
  const existingCheckpoint = (config.resume || config.retryFailed) ? loadCheckpoint(config.checkpointFile) : null;

  if (existingCheckpoint && (config.resume || config.retryFailed)) {
    console.log(`Reprise depuis le checkpoint:`);
    console.log(`  - ${existingCheckpoint.processedCount} messages traités`);
    console.log(`  - ${existingCheckpoint.failedIds.length} messages en erreur`);
    checkpoint = existingCheckpoint;
  } else {
    checkpoint = {
      lastSuccessId: null,
      failedIds: [],
      processedCount: 0,
      stats: createStats(),
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Compter les messages à migrer (filtre robuste)
  const v1Count = await Message.countDocuments({
    contenuCrypte: { $type: 'string', $not: /^v2:/ },
  });
  const totalMessages = await Message.countDocuments();

  console.log(`Total messages en base: ${totalMessages}`);
  console.log(`  - À migrer (v1/v0): ${v1Count}`);
  console.log(`  - En erreur (failedIds): ${checkpoint.failedIds.length}`);
  console.log('');

  // Mode --retry-failed: uniquement réessayer les erreurs
  if (config.retryFailed && checkpoint.failedIds.length > 0) {
    console.log('Mode RETRY-FAILED: réessai des messages en erreur uniquement');
    const stillFailed = await retryFailedMessages(
      checkpoint.failedIds,
      config.dryRun,
      checkpoint.stats
    );
    checkpoint.failedIds = stillFailed;

    if (!config.dryRun) {
      saveCheckpoint(config.checkpointFile, checkpoint);
    }

    console.log('\n');
    console.log('='.repeat(60));
    console.log('RÉSULTATS RETRY');
    console.log('='.repeat(60));
    console.log(`Réessayés avec succès: ${checkpoint.stats.retried}`);
    console.log(`Encore en erreur: ${stillFailed.length}`);
    console.log('='.repeat(60));

    await mongoose.disconnect();
    return;
  }

  if (v1Count === 0 && checkpoint.failedIds.length === 0) {
    console.log('✅ Tous les messages sont déjà en v2. Rien à migrer.');
    await mongoose.disconnect();
    deleteCheckpoint(config.checkpointFile);
    return;
  }

  // Migration par batch
  const maxToProcess = config.limit || v1Count;
  let processedInSession = 0;

  while (processedInSession < maxToProcess) {
    const batchLimit = Math.min(config.batchSize, maxToProcess - processedInSession);
    const { processedCount, hasMore } = await migrateBatch(
      checkpoint,
      batchLimit,
      config.dryRun
    );

    if (processedCount === 0) {
      break;
    }

    processedInSession += processedCount;
    checkpoint.processedCount += processedCount;

    // Sauvegarder le checkpoint (sauf en dry-run)
    if (!config.dryRun) {
      saveCheckpoint(config.checkpointFile, checkpoint);
    }

    // Affichage progression
    const percent = ((processedInSession / maxToProcess) * 100).toFixed(1);
    process.stdout.write(
      `\rProgression: ${processedInSession}/${maxToProcess} (${percent}%) - ` +
      `Migrés: ${checkpoint.stats.migrated} - Erreurs: ${checkpoint.stats.errors}`
    );

    // Délai entre batchs
    if (hasMore && processedInSession < maxToProcess) {
      await sleep(config.delayMs);
    }
  }

  console.log('\n');
  console.log('='.repeat(60));
  console.log('RÉSULTATS');
  console.log('='.repeat(60));
  console.log(`Messages analysés cette session: ${processedInSession}`);
  console.log(`Total depuis le début: ${checkpoint.processedCount}`);
  console.log(`  - Détectés v1 (CBC): ${checkpoint.stats.v1}`);
  console.log(`  - Détectés v2 (GCM): ${checkpoint.stats.v2}`);
  console.log(`  - Non chiffrés: ${checkpoint.stats.unencrypted}`);
  console.log(`Migrés v1 → v2: ${checkpoint.stats.migrated}`);
  console.log(`Ignorés: ${checkpoint.stats.skipped}`);
  console.log(`Erreurs: ${checkpoint.stats.errors}`);
  console.log(`Messages en erreur (failedIds): ${checkpoint.failedIds.length}`);
  console.log('='.repeat(60));

  if (config.dryRun) {
    console.log('');
    console.log('⚠️  Mode DRY-RUN: aucune modification effectuée.');
    console.log('    Relancez sans --dry-run pour appliquer les migrations.');
  } else if (checkpoint.failedIds.length === 0 && checkpoint.stats.errors === 0) {
    deleteCheckpoint(config.checkpointFile);
    console.log('');
    console.log('✅ Checkpoint supprimé (migration terminée avec succès).');
  } else if (checkpoint.failedIds.length > 0) {
    console.log('');
    console.log(`⚠️  ${checkpoint.failedIds.length} messages en erreur.`);
    console.log('    Relancez avec --retry-failed pour réessayer.');
    console.log('    Relancez avec --resume pour continuer la migration normale.');
  }

  await mongoose.disconnect();
  console.log('');
  console.log('Migration terminée.');
};

// ============================================
// MAIN
// ============================================

const main = async () => {
  const config = parseArgs();

  try {
    await runMigration(config);
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('Erreur fatale:', message);
    process.exit(1);
  }
};

main();
