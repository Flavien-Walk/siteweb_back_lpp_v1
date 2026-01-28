import { Router } from 'express';
import {
  getConversations,
  getMessages,
  envoyerMessage,
  marquerConversationLue,
  getNombreNonLus,
} from '../controllers/messagerieController.js';
import { verifierJwt } from '../middlewares/verifierJwt.js';

const router = Router();

// Toutes les routes de messagerie nécessitent une authentification
router.use(verifierJwt);

/**
 * GET /api/messagerie/conversations
 * Liste des conversations de l'utilisateur
 */
router.get('/conversations', getConversations);

/**
 * GET /api/messagerie/conversations/:userId
 * Messages d'une conversation avec un utilisateur spécifique
 */
router.get('/conversations/:userId', getMessages);

/**
 * POST /api/messagerie/envoyer
 * Envoyer un message
 */
router.post('/envoyer', envoyerMessage);

/**
 * PATCH /api/messagerie/conversations/:conversationId/lire
 * Marquer une conversation comme lue
 */
router.patch('/conversations/:conversationId/lire', marquerConversationLue);

/**
 * GET /api/messagerie/non-lus
 * Nombre de messages non lus
 */
router.get('/non-lus', getNombreNonLus);

export default router;
