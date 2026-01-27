import mongoose from 'mongoose';

/**
 * Connexion à la base de données MongoDB
 */
export const connecterMongo = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('❌ MONGODB_URI non défini dans les variables d\'environnement');
    process.exit(1);
  }

  try {
    const connexion = await mongoose.connect(mongoUri);

    console.log(`✅ MongoDB connecté: ${connexion.connection.host}`);

    // Nettoyage de l'ancien index composé provider+providerId (sparse)
    // qui causait des erreurs 11000 pour les comptes locaux sans providerId
    try {
      const collection = connexion.connection.db?.collection('utilisateurs');
      if (collection) {
        const indexes = await collection.indexes();
        const ancienIndex = indexes.find(
          (idx: any) =>
            idx.key?.provider === 1 &&
            idx.key?.providerId === 1 &&
            idx.sparse === true
        );
        if (ancienIndex && ancienIndex.name) {
          await collection.dropIndex(ancienIndex.name);
          console.log('✅ Ancien index sparse provider+providerId supprimé');
        }
      }
    } catch (errIndex) {
      // Pas grave si l'index n'existe pas ou est déjà supprimé
      console.log('ℹ️ Nettoyage index:', (errIndex as Error).message);
    }

    // Gestion des événements de connexion
    mongoose.connection.on('error', (err) => {
      console.error('❌ Erreur MongoDB:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB déconnecté');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnecté');
    });

  } catch (error) {
    console.error('❌ Erreur de connexion MongoDB:', error);
    process.exit(1);
  }
};

/**
 * Fermeture propre de la connexion MongoDB
 */
export const fermerMongo = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log('✅ Connexion MongoDB fermée proprement');
  } catch (error) {
    console.error('❌ Erreur lors de la fermeture MongoDB:', error);
  }
};
