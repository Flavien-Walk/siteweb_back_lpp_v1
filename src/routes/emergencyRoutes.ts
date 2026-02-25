/**
 * Routes d'urgence - Deblocage IP/Device
 * Protege par EMERGENCY_TOKEN (variable d'environnement Render)
 * Place AVANT le security middleware pour etre accessible meme si IP bloquee
 */

import { Router } from 'express';
import BlockedIP from '../models/BlockedIP.js';
import BannedDevice, { generateDeviceFingerprint } from '../models/BannedDevice.js';
import { invalidateBlockedIPCache } from '../middlewares/security/index.js';

const router = Router();

router.post('/unblock', async (req, res) => {
  try {
    const token = req.headers['x-emergency-token'] || req.query.token;
    const expectedToken = process.env.EMERGENCY_TOKEN;

    if (!expectedToken || token !== expectedToken) {
      res.status(404).json({ succes: false, message: 'Route non trouvee.' });
      return;
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const ua = req.headers['user-agent'] || '';

    const results: string[] = [];

    // 1. Debloquer l'IP
    const ipResult = await BlockedIP.deleteMany({ ip });
    if (ipResult.deletedCount > 0) {
      results.push(`IP ${ip}: ${ipResult.deletedCount} blocage(s) supprime(s)`);
      invalidateBlockedIPCache(ip);
    } else {
      results.push(`IP ${ip}: aucun blocage trouve`);
    }

    // 2. Debannir l'appareil
    if (ua && ua.length >= 5) {
      const fingerprint = generateDeviceFingerprint(ua);
      const deviceResult = await BannedDevice.deleteMany({ fingerprint });
      if (deviceResult.deletedCount > 0) {
        results.push(`Appareil (${fingerprint.slice(0, 12)}...): ${deviceResult.deletedCount} ban(s) supprime(s)`);
      } else {
        results.push(`Appareil: aucun ban trouve`);
      }
    }

    console.log(`[EMERGENCY] Deblocage par ${ip}:`, results);
    res.status(200).json({ succes: true, message: 'Deblocage effectue', details: results, ip });
  } catch (error) {
    console.error('[EMERGENCY] Erreur deblocage:', error);
    res.status(500).json({ succes: false, message: 'Erreur interne' });
  }
});

export default router;
