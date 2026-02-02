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
 *   --dry-run       Affiche ce qui serait migré sans modifier la DB
 *   --batch-size=N  Nombre de messages par batch (défaut: 100)
 *   --delay=N       Délai en ms entre les batchs (défaut: 1000)
 *   --limit=N       Nombre max de messages à migrer (défaut: illimité)
 *
 * Exemple:
 *   npx ts-node scripts/migrate-encryption-v2.ts --dry-run
 *   npx ts-node scripts/migrate-encryption-v2.ts --batch-size=50 --delay=2000
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
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
}

const parseArgs = (): MigrationConfig => {
  const args = process.argv.slice(2);
  const config: MigrationConfig = {
    dryRun: false,
    batchSize: 100,
    delayMs: 1000,
    limit: null,
  };

  for (const arg of args) {
    if (arg === '--dry-run') {
      config.dryRun = true;
    } else if (arg.startsWith('--batch-size=')) {
      config.batchSize = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--delay=')) {
      config.delayMs = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--limit=')) {
      config.limit = parseInt(arg.split('=')[1], 10);
    }
  }

  return config;
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
}

const stats: MigrationStats = {
  total: 0,
  v1: 0,
  v2: 0,
  unencrypted: 0,
  migrated: 0,
  errors: 0,
  skipped: 0,
};

// ============================================
// MIGRATION
// ============================================

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const migrateMessage = async (
  messageId: mongoose.Types.ObjectId,
  contenuCrypte: string,
  dryRun: boolean
): Promise<boolean> => {
  try {
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

    // Vérifier que le déchiffrement fonctionne
    const decrypted = dechiffrerMessage(newContent);
    if (!decrypted) {
      console.error(`[ERROR] Message ${messageId}: déchiffrement v2 échoué`);
      stats.errors++;
      return false;
    }

    if (dryRun) {
      console.log(`[DRY-RUN] Message ${messageId}: v1 -> v2 (${contenuCrypte.length} -> ${newContent.length} chars)`);
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
  } catch (error) {
    console.error(`[ERROR] Message ${messageId}:`, error);
    stats.errors++;
    return false;
  }
};

const migrateBatch = async (
  skip: number,
  limit: number,
  dryRun: boolean
): Promise<number> => {
  const messages = await Message.find({}, { _id: 1, contenuCrypte: 1 })
    .skip(skip)
    .limit(limit)
    .lean();

  for (const msg of messages) {
    await migrateMessage(msg._id, msg.contenuCrypte, dryRun);
    stats.total++;
  }

  return messages.length;
};

const runMigration = async (config: MigrationConfig) => {
  console.log('='.repeat(60));
  console.log('Migration du chiffrement vers AES-256-GCM (v2)');
  console.log('='.repeat(60));
  console.log(`Mode: ${config.dryRun ? 'DRY-RUN (aucune modification)' : 'PRODUCTION'}`);
  console.log(`Batch size: ${config.batchSize}`);
  console.log(`Délai entre batchs: ${config.delayMs}ms`);
  console.log(`Limite: ${config.limit || 'Aucune'}`);
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

  // Compter les messages
  const totalMessages = await Message.countDocuments();
  console.log(`Total messages en base: ${totalMessages}`);
  console.log('');

  // Migration par batch
  let skip = 0;
  let processedCount = 0;
  const maxToProcess = config.limit || totalMessages;

  while (processedCount < maxToProcess) {
    const batchLimit = Math.min(config.batchSize, maxToProcess - processedCount);
    const processed = await migrateBatch(skip, batchLimit, config.dryRun);

    if (processed === 0) {
      break; // Plus de messages
    }

    processedCount += processed;
    skip += processed;

    // Affichage progression
    const percent = ((processedCount / maxToProcess) * 100).toFixed(1);
    process.stdout.write(
      `\rProgression: ${processedCount}/${maxToProcess} (${percent}%) - ` +
      `Migrés: ${stats.migrated} - Erreurs: ${stats.errors}`
    );

    // Délai entre batchs pour ne pas surcharger la DB
    if (processedCount < maxToProcess) {
      await sleep(config.delayMs);
    }
  }

  console.log('\n');
  console.log('='.repeat(60));
  console.log('RÉSULTATS');
  console.log('='.repeat(60));
  console.log(`Messages analysés: ${stats.total}`);
  console.log(`  - Déjà en v2 (GCM): ${stats.v2}`);
  console.log(`  - En v1 (CBC): ${stats.v1}`);
  console.log(`  - Non chiffrés: ${stats.unencrypted}`);
  console.log(`Migrés v1 → v2: ${stats.migrated}`);
  console.log(`Ignorés: ${stats.skipped}`);
  console.log(`Erreurs: ${stats.errors}`);
  console.log('='.repeat(60));

  if (config.dryRun) {
    console.log('');
    console.log('⚠️  Mode DRY-RUN: aucune modification effectuée.');
    console.log('    Relancez sans --dry-run pour appliquer les migrations.');
  }

  // Déconnexion
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
    console.error('Erreur fatale:', error);
    process.exit(1);
  }
};

main();
