import Utilisateur from '../models/Utilisateur.js';
import UserPreferences from '../models/UserPreferences.js';
import Projet from '../models/Projet.js';
import { envoyerPushNotification } from './pushService.js';

const SIX_HOURS = 6 * 60 * 60 * 1000;
const TWELVE_HOURS = 12 * 60 * 60 * 1000;

let intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Cron de rétention : envoie des push de re-engagement aux utilisateurs inactifs
 * - Exécution toutes les 6h
 * - Max 1-2 push par jour par user
 * - 3 types : nouveau projet matching, projet tendance, recommandation perso
 */
async function executerRetentionPush(): Promise<void> {
  try {
    console.log('[RETENTION PUSH] Début du cron de rétention...');

    // Trouver les utilisateurs avec des push tokens qui ont la préférence recommandations activée
    const usersAvecTokens = await Utilisateur.find({
      'pushTokens.0': { $exists: true },
    })
      .select('_id prenom')
      .lean();

    if (usersAvecTokens.length === 0) {
      console.log('[RETENTION PUSH] Aucun utilisateur avec push tokens.');
      return;
    }

    const userIds = usersAvecTokens.map((u) => u._id.toString());

    // Charger les préférences pour filtrer ceux qui ont désactivé les recommandations
    const preferences = await UserPreferences.find({
      utilisateur: { $in: userIds },
    }).lean();

    const prefsMap = new Map(
      preferences.map((p) => [p.utilisateur.toString(), p])
    );

    // Filtrer : recommandations activées + pas de push rétention récent (12h)
    const maintenant = new Date();
    const eligibles = usersAvecTokens.filter((user) => {
      const pref = prefsMap.get(user._id.toString()) as any;
      if (pref?.notificationsPush?.recommandations === false) return false;
      if (pref?.dernierPushRetention) {
        const dernierPush = new Date(pref.dernierPushRetention);
        if (maintenant.getTime() - dernierPush.getTime() < TWELVE_HOURS) return false;
      }
      return true;
    });

    if (eligibles.length === 0) {
      console.log('[RETENTION PUSH] Aucun utilisateur éligible.');
      return;
    }

    // Trouver un projet tendance récent (créé dans les 7 derniers jours, avec le plus de likes)
    const septJoursAvant = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const projetTendance = await Projet.findOne({
      dateCreation: { $gte: septJoursAvant },
      statut: { $ne: 'supprime' },
    })
      .sort({ dateCreation: -1 })
      .select('nom categorie')
      .lean();

    // Envoyer les push (max 50 par cycle pour ne pas surcharger)
    const batch = eligibles.slice(0, 50);
    let envoyees = 0;

    for (const user of batch) {
      const userId = user._id.toString();

      let message: string;
      let type: string;
      const data: Record<string, string> = {};

      if (projetTendance) {
        message = `Découvrez "${projetTendance.nom}" — un projet tendance cette semaine !`;
        type = 'retention_tendance';
        data.projetId = projetTendance._id.toString();
      } else {
        message = 'De nouveaux projets vous attendent. Venez les découvrir !';
        type = 'retention_general';
      }

      envoyerPushNotification(userId, {
        titre: 'La Première Pierre',
        message,
        type,
        data,
        categorie: 'recommandations',
        skipSmartDelivery: true,
      }).catch(() => {});

      // Marquer le dernier push rétention
      UserPreferences.findOneAndUpdate(
        { utilisateur: userId },
        { $set: { dernierPushRetention: maintenant } },
        { upsert: true }
      ).catch(() => {});

      envoyees++;
    }

    console.log(`[RETENTION PUSH] ${envoyees} push de rétention envoyées.`);
  } catch (error) {
    console.error('[RETENTION PUSH] Erreur:', error);
  }
}

/**
 * Démarrer le cron de rétention push (toutes les 6h)
 */
export function startRetentionPushCron(): void {
  if (intervalId) return;
  console.log('[RETENTION PUSH] Cron démarré (toutes les 6h).');
  intervalId = setInterval(executerRetentionPush, SIX_HOURS);
}

/**
 * Arrêter le cron
 */
export function stopRetentionPushCron(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
