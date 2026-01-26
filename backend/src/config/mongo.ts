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
