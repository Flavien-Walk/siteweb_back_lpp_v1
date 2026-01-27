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

    // Nettoyage des anciens index problématiques
    try {
      const collection = connexion.connection.db?.collection('utilisateurs');
      if (collection) {
        const indexes = await collection.indexes();
        console.log('📋 Index actuels:', JSON.stringify(indexes.map((i: any) => ({ name: i.name, key: i.key, sparse: i.sparse, unique: i.unique }))));

        for (const idx of indexes) {
          const idxAny = idx as any;
          // Supprimer l'ancien index composé sparse provider+providerId
          if (idxAny.key?.provider === 1 && idxAny.key?.providerId === 1 && idxAny.sparse === true) {
            await collection.dropIndex(idxAny.name);
            console.log('✅ Ancien index sparse composé supprimé:', idxAny.name);
          }
          // Supprimer l'ancien index simple sparse providerId_1
          if (idxAny.key?.providerId === 1 && idxAny.sparse === true && !idxAny.key?.provider) {
            await collection.dropIndex(idxAny.name);
            console.log('✅ Ancien index sparse providerId_1 supprimé:', idxAny.name);
          }
        }
      }
    } catch (errIndex) {
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
