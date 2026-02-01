/**
 * Script de migration: admin → admin_modo
 *
 * Ce script migre les utilisateurs avec l'ancien rôle "admin" vers "admin_modo".
 * Il est idempotent et peut être exécuté plusieurs fois sans risque.
 *
 * Usage: npm run migrate:admin-role
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Types minimaux pour le script (évite d'importer les modèles complets)
interface UserDoc {
  _id: mongoose.Types.ObjectId;
  prenom: string;
  nom: string;
  email: string;
  role: string;
}

async function migrateAdminRoles(): Promise<void> {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI non définie dans .env');
    process.exit(1);
  }

  console.log('🚀 Démarrage de la migration admin → admin_modo...\n');

  try {
    // Connexion à MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB\n');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Base de données non disponible');
    }

    const usersCollection = db.collection('utilisateurs');
    const auditCollection = db.collection('auditlogs');

    // Trouver tous les utilisateurs avec role: "admin"
    const adminUsers = await usersCollection.find({ role: 'admin' }).toArray() as unknown as UserDoc[];

    if (adminUsers.length === 0) {
      console.log('ℹ️  Aucun utilisateur avec role: "admin" trouvé.');
      console.log('   La migration a peut-être déjà été effectuée.\n');
      await mongoose.disconnect();
      console.log('✅ Migration terminée (rien à faire)');
      return;
    }

    console.log(`📋 ${adminUsers.length} utilisateur(s) avec role: "admin" trouvé(s):\n`);

    for (const user of adminUsers) {
      console.log(`   - ${user.prenom} ${user.nom} (${user.email})`);
    }
    console.log('');

    // ID système pour l'acteur de migration
    const systemActorId = new mongoose.Types.ObjectId('000000000000000000000000');

    // Migrer chaque utilisateur
    let migratedCount = 0;
    let auditLogsCreated = 0;

    for (const user of adminUsers) {
      // Mettre à jour le rôle
      const updateResult = await usersCollection.updateOne(
        { _id: user._id, role: 'admin' }, // Condition pour idempotence
        {
          $set: {
            role: 'admin_modo',
            dateMiseAJour: new Date()
          }
        }
      );

      if (updateResult.modifiedCount > 0) {
        migratedCount++;
        console.log(`✅ Migré: ${user.prenom} ${user.nom} (${user.email})`);

        // Créer un audit log
        try {
          await auditCollection.insertOne({
            actor: systemActorId,
            actorRole: 'system',
            action: 'user:role_change',
            targetType: 'utilisateur',
            targetId: user._id,
            reason: 'Migration automatique: admin → admin_modo (script migrate-admin-role)',
            metadata: {
              migrationType: 'legacy_admin_migration',
              scriptVersion: '1.0.0',
            },
            snapshot: {
              before: { role: 'admin' },
              after: { role: 'admin_modo' },
            },
            dateCreation: new Date(),
          });
          auditLogsCreated++;
        } catch (auditError) {
          console.log(`   ⚠️  Audit log non créé pour ${user.email}: ${auditError}`);
        }
      } else {
        console.log(`⏭️  Déjà migré ou non trouvé: ${user.email}`);
      }
    }

    console.log('\n────────────────────────────────────────');
    console.log('📊 Résumé de la migration:');
    console.log(`   - Utilisateurs migrés: ${migratedCount}/${adminUsers.length}`);
    console.log(`   - Audit logs créés: ${auditLogsCreated}`);
    console.log('────────────────────────────────────────\n');

    await mongoose.disconnect();
    console.log('✅ Migration terminée avec succès!');

  } catch (error) {
    console.error('\n❌ Erreur durant la migration:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Exécuter le script
migrateAdminRoles();
