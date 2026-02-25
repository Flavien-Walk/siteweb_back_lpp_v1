import dotenv from 'dotenv';

// Charger les variables d'environnement en premier
dotenv.config();

import http from 'http';
import { creerApp } from './app.js';
import { connecterMongo, fermerMongo } from './config/mongo.js';
import { initializeSocket, getConnectedUsersCount } from './socket/index.js';
import { purgeAutoBlocks } from './middlewares/security/index.js';
import { startSubscriptionCron } from './services/subscriptionCron.js';
import { startTrendingRefresh, stopTrendingRefresh } from './services/trending/index.js';

const PORT = process.env.PORT || 5000;

/**
 * Variables d'environnement requises en production
 */
const REQUIRED_ENV_VARS = [
  'MONGODB_URI',
  'JWT_SECRET',
  'MESSAGE_ENCRYPTION_KEY',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
] as const;

/**
 * Valider les variables d'environnement requises
 */
const validerEnvVars = (): void => {
  const manquantes: string[] = [];

  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      manquantes.push(varName);
    }
  }

  if (manquantes.length > 0) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `Variables d'environnement manquantes en production: ${manquantes.join(', ')}`
      );
    }
    console.warn(
      `⚠️ Variables d'environnement manquantes (dev): ${manquantes.join(', ')}`
    );
  }
};

/**
 * Démarrer le serveur
 */
const demarrerServeur = async (): Promise<void> => {
  try {
    // Valider les variables d'environnement
    validerEnvVars();

    // Connexion à MongoDB
    await connecterMongo();

    // Purge des auto-blocks si SECURITY_RESET=true
    // Utile quand un dev est bloque par le systeme de securite
    await purgeAutoBlocks();

    // Créer l'application Express
    const app = creerApp();

    // Créer le serveur HTTP
    const serveur = http.createServer(app);

    // Initialiser Socket.io
    const io = initializeSocket(serveur);

    // Démarrer le cron job LPP+
    startSubscriptionCron();

    // Démarrer le refresh periodique du trending
    startTrendingRefresh();

    // Démarrer le serveur
    serveur.listen(PORT, () => {
      console.log('');
      console.log('🪨 ════════════════════════════════════════');
      console.log('   LA PREMIÈRE PIERRE - Backend API');
      console.log('════════════════════════════════════════');
      console.log(`✅ Serveur démarré sur le port ${PORT}`);
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔌 Socket.io: activé`);
      console.log('════════════════════════════════════════');
      console.log('');
    });

    // Gestion de l'arrêt propre du serveur
    const arreterProprement = async (signal: string): Promise<void> => {
      console.log(`\n⚠️ Signal ${signal} reçu. Arrêt en cours...`);
      stopTrendingRefresh();

      serveur.close(async () => {
        console.log('✅ Serveur HTTP fermé');
        await fermerMongo();
        process.exit(0);
      });

      // Forcer l'arrêt après 10 secondes
      setTimeout(() => {
        console.error('❌ Arrêt forcé après timeout');
        process.exit(1);
      }, 10000);
    };

    // Écouter les signaux d'arrêt
    process.on('SIGTERM', () => arreterProprement('SIGTERM'));
    process.on('SIGINT', () => arreterProprement('SIGINT'));

    // Gestion des erreurs non capturées
    process.on('uncaughtException', (err) => {
      console.error('❌ Exception non capturée:', err);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Promesse rejetée non gérée:', reason);
    });

  } catch (error) {
    console.error('❌ Erreur au démarrage du serveur:', error);
    process.exit(1);
  }
};

// Démarrer le serveur
demarrerServeur();
