import Utilisateur from '../models/Utilisateur.js';
import {
  envoyerEmailLppFin,
  envoyerEmailLppRenouvellement,
} from './emailService.js';

/**
 * Cron job pour gerer les abonnements LPP+
 * Execute toutes les heures
 *
 * Actions:
 * 1. Renouveler les abonnements actifs dont la periode est terminee
 * 2. Desactiver les abonnements resilies dont la periode est terminee
 */
const processSubscriptions = async (): Promise<void> => {
  const now = new Date();
  console.log(`[LPP+ CRON] Execution a ${now.toISOString()}`);

  try {
    // 1. Renouveler les abonnements actifs (non resilies) dont la periode est terminee
    const aRenouveler = await Utilisateur.find({
      'lppPlus.status': 'active',
      'lppPlus.cancelAtPeriodEnd': false,
      'lppPlus.currentPeriodEnd': { $lte: now },
    }).select('email prenom lppPlus');

    for (const user of aRenouveler) {
      try {
        const newPeriodEnd = new Date(now);
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

        (user as any).lppPlus.currentPeriodEnd = newPeriodEnd;
        (user as any).lppPlus.renewalCount = ((user as any).lppPlus.renewalCount || 0) + 1;
        await user.save();

        // Email de renouvellement (fire & forget)
        const dateFinStr = newPeriodEnd.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
        envoyerEmailLppRenouvellement(user.email, user.prenom, dateFinStr)
          .catch(err => console.error(`[LPP+ CRON] Erreur email renouvellement ${user.email}:`, err));

        console.log(`[LPP+ CRON] Renouvele: ${user.email} -> ${newPeriodEnd.toISOString()}`);
      } catch (err) {
        console.error(`[LPP+ CRON] Erreur renouvellement ${user.email}:`, err);
      }
    }

    // 2. Desactiver les abonnements resilies dont la periode est terminee
    const aDesactiver = await Utilisateur.find({
      'lppPlus.status': 'canceled',
      'lppPlus.cancelAtPeriodEnd': true,
      'lppPlus.currentPeriodEnd': { $lte: now },
    }).select('email prenom lppPlus');

    for (const user of aDesactiver) {
      try {
        (user as any).lppPlus.status = 'inactive';
        (user as any).lppPlus.cancelAtPeriodEnd = false;
        await user.save();

        // Email de fin d'abonnement (fire & forget)
        envoyerEmailLppFin(user.email, user.prenom)
          .catch(err => console.error(`[LPP+ CRON] Erreur email fin ${user.email}:`, err));

        console.log(`[LPP+ CRON] Desactive: ${user.email}`);
      } catch (err) {
        console.error(`[LPP+ CRON] Erreur desactivation ${user.email}:`, err);
      }
    }

    console.log(`[LPP+ CRON] Termine: ${aRenouveler.length} renouveles, ${aDesactiver.length} desactives`);
  } catch (error) {
    console.error('[LPP+ CRON] Erreur globale:', error);
  }
};

/**
 * Demarrer le cron job LPP+
 * Verifie toutes les heures
 */
export const startSubscriptionCron = (): void => {
  // Premiere execution 30s apres le demarrage
  setTimeout(() => {
    processSubscriptions().catch(err => console.error('[LPP+ CRON] Erreur init:', err));
  }, 30_000);

  // Puis toutes les heures
  setInterval(() => {
    processSubscriptions().catch(err => console.error('[LPP+ CRON] Erreur interval:', err));
  }, 60 * 60 * 1000);

  console.log('[LPP+ CRON] Cron job demarre (toutes les heures)');
};
