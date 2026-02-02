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
 *   --checkpoint=FILE Fichier de checkpoint (défaut: .migration-checkpoint.json)
 *
 * Exemple:
 *   npx ts-node scripts/migrate-encryption-v2.ts --dry-run
 *   npx ts-node scripts/migrate-encryption-v2.ts --batch-size=50 --delay=2000
 *   npx ts-node scripts/migrate-encryption-v2.ts --resume
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
  checkpointFile: string;
}

interface Checkpoint {
  lastProcessedId: string | null;
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
    checkpointFile: '.migration-checkpoint.json',
  };

  for (const arg of args) {
    if (arg === '--dry-run') {
      config.dryRun = true;
    } else if (arg === '--resume') {
      config.resume = true;
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
    return JSON.parse(data) as Checkpoint;
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
}

const createStats = (): MigrationStats => ({
  total: 0,
  v1: 0,
  v2: 0,
  unencrypted: 0,
  migrated: 0,
  errors: 0,
  skipped: 0,
});

// ============================================
// MIGRATION
// ============================================

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const migrateMessage = async (
  messageId: mongoose.Types.ObjectId,
  contenuCrypte: string,
  dryRun: boolean,
  stats: MigrationStats
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

    // Vérifier que le déchiffrement fonctionne (roundtrip test)
    try {
      const decrypted = dechiffrerMessage(newContent);
      if (!decrypted) {
        console.error(`\n[ERROR] Message ${messageId}: déchiffrement v2 retourne vide`);
        stats.errors++;
        return false;
      }
    } catch (decryptError) {
      console.error(`\n[ERROR] Message ${messageId}: échec roundtrip test`);
      stats.errors++;
      return false;
    }

    if (dryRun) {
      // En dry-run, on ne log pas chaque message pour éviter le spam
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
    // Ne pas logger le contenu du message (sensible)
    console.error(`\n[ERROR] Message ${messageId}: migration échouée`);
    stats.errors++;
    return false;
  }
};

const migrateBatch = async (
  lastId: string | null,
  limit: number,
  dryRun: boolean,
  stats: MigrationStats
): Promise<{ messages: { _id: mongoose.Types.ObjectId; contenuCrypte: string }[]; lastId: string | null }> => {
  // Requête optimisée: filtre les messages qui ne sont PAS déjà en v2
  // v2 commence par "v2:" donc on exclut ceux-là
  const query: Record<string, unknown> = {
    contenuCrypte: { $not: /^v2:/ }, // Exclure les messages déjà en v2
  };

  // Si on a un lastId, on continue après celui-ci (cursor-based pagination)
  if (lastId) {
    query._id = { $gt: new mongoose.Types.ObjectId(lastId) };
  }

  const messages = await Message.find(query, { _id: 1, contenuCrypte: 1 })
    .sort({ _id: 1 }) // Tri par _id pour pagination stable
    .limit(limit)
    .lean();

  let newLastId: string | null = null;

  for (const msg of messages) {
    await migrateMessage(msg._id, msg.contenuCrypte, dryRun, stats);
    stats.total++;
    newLastId = msg._id.toString();
  }

  return { messages, lastId: newLastId };
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
  const existingCheckpoint = config.resume ? loadCheckpoint(config.checkpointFile) : null;

  if (existingCheckpoint && config.resume) {
    console.log(`Reprise depuis le checkpoint: ${existingCheckpoint.processedCount} messages déjà traités`);
    checkpoint = existingCheckpoint;
  } else {
    checkpoint = {
      lastProcessedId: null,
      processedCount: 0,
      stats: createStats(),
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Compter les messages à migrer (non-v2)
  const v1Count = await Message.countDocuments({ contenuCrypte: { $not: /^v2:/ } });
  const totalMessages = await Message.countDocuments();
  const v2Count = totalMessages - v1Count;

  console.log(`Total messages en base: ${totalMessages}`);
  console.log(`  - Déjà en v2 (GCM): ${v2Count}`);
  console.log(`  - À migrer (v1/v0): ${v1Count}`);
  console.log('');

  if (v1Count === 0) {
    console.log('✅ Tous les messages sont déjà en v2. Rien à migrer.');
    await mongoose.disconnect();
    deleteCheckpoint(config.checkpointFile);
    return;
  }

  // Migration par batch avec cursor-based pagination
  const maxToProcess = config.limit || v1Count;
  let processedInSession = 0;

  while (processedInSession < maxToProcess) {
    const batchLimit = Math.min(config.batchSize, maxToProcess - processedInSession);
    const { messages, lastId } = await migrateBatch(
      checkpoint.lastProcessedId,
      batchLimit,
      config.dryRun,
      checkpoint.stats
    );

    if (messages.length === 0) {
      break; // Plus de messages à migrer
    }

    processedInSession += messages.length;
    checkpoint.processedCount += messages.length;
    checkpoint.lastProcessedId = lastId;

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

    // Délai entre batchs pour ne pas surcharger la DB
    if (processedInSession < maxToProcess && messages.length === batchLimit) {
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
  console.log('='.repeat(60));

  if (config.dryRun) {
    console.log('');
    console.log('⚠️  Mode DRY-RUN: aucune modification effectuée.');
    console.log('    Relancez sans --dry-run pour appliquer les migrations.');
  } else if (checkpoint.stats.errors === 0 && processedInSession > 0) {
    // Migration réussie, supprimer le checkpoint
    deleteCheckpoint(config.checkpointFile);
    console.log('');
    console.log('✅ Checkpoint supprimé (migration terminée avec succès).');
  } else if (checkpoint.stats.errors > 0) {
    console.log('');
    console.log(`⚠️  ${checkpoint.stats.errors} erreurs. Checkpoint conservé pour reprise.`);
    console.log(`    Relancez avec --resume pour continuer.`);
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
    // Ne pas logger de données sensibles
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('Erreur fatale:', message);
    process.exit(1);
  }
};

main();
