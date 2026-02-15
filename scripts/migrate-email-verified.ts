/**
 * Migration one-shot : marquer tous les utilisateurs existants comme emailVerifie=true
 * pour ne pas les bloquer apres le deploiement.
 *
 * Usage : npx tsx scripts/migrate-email-verified.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI manquant dans .env');
  process.exit(1);
}

async function migrate() {
  await mongoose.connect(MONGODB_URI!);
  console.log('Connecte a MongoDB');

  const result = await mongoose.connection.db!.collection('utilisateurs').updateMany(
    { emailVerifie: { $ne: true } },
    { $set: { emailVerifie: true } }
  );

  console.log(`Migration terminee : ${result.modifiedCount} utilisateur(s) mis a jour`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Erreur migration:', err);
  process.exit(1);
});
