import dotenv from 'dotenv';

// Charger les variables d'environnement en premier
dotenv.config();

import { creerApp } from './app.js';
import { connecterMongo, fermerMongo } from './config/mongo.js';

const PORT = process.env.PORT || 5000;

/**
 * Démarrer le serveur
 */
const demarrerServeur = async (): Promise<void> => {
  try {
    // Connexion à MongoDB
    await connecterMongo();

    // Créer l'application Express
    const app = creerApp();

    // Démarrer le serveur
    const serveur = app.listen(PORT, () => {
      console.log('');
      console.log('🪨 ════════════════════════════════════════');
      console.log('   LA PREMIÈRE PIERRE - Backend API');
      console.log('════════════════════════════════════════');
      console.log(`✅ Serveur démarré sur le port ${PORT}`);
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
      console.log('════════════════════════════════════════');
      console.log('');
    });

    // Gestion de l'arrêt propre du serveur
    const arreterProprement = async (signal: string): Promise<void> => {
      console.log(`\n⚠️ Signal ${signal} reçu. Arrêt en cours...`);

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
