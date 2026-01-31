import { Router } from 'express';
import {
  getConversations,
  getMessages,
  envoyerMessage,
  marquerConversationLue,
  getNombreNonLus,
  creerGroupe,
  modifierGroupe,
  ajouterParticipants,
  retirerParticipant,
  toggleMuet,
  getOuCreerConversationPrivee,
  rechercherUtilisateurs,
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
 * GET /api/messagerie/conversations/:conversationId
 * Messages d'une conversation
 */
router.get('/conversations/:conversationId', getMessages);

/**
 * PATCH /api/messagerie/conversations/:conversationId/lire
 * Marquer une conversation comme lue
 */
router.patch('/conversations/:conversationId/lire', marquerConversationLue);

/**
 * PATCH /api/messagerie/conversations/:conversationId/muet
 * Toggle sourdine sur une conversation
 */
router.patch('/conversations/:conversationId/muet', toggleMuet);

/**
 * POST /api/messagerie/envoyer
 * Envoyer un message
 */
router.post('/envoyer', envoyerMessage);

/**
 * GET /api/messagerie/non-lus
 * Nombre de messages non lus
 */
router.get('/non-lus', getNombreNonLus);

/**
 * GET /api/messagerie/conversation-privee/:userId
 * Obtenir ou créer une conversation privée avec un utilisateur
 */
router.get('/conversation-privee/:userId', getOuCreerConversationPrivee);

/**
 * GET /api/messagerie/rechercher-utilisateurs
 * Rechercher des utilisateurs pour démarrer une conversation
 */
router.get('/rechercher-utilisateurs', rechercherUtilisateurs);

// ===== Routes groupes =====

/**
 * POST /api/messagerie/groupes
 * Créer un groupe
 */
router.post('/groupes', creerGroupe);

/**
 * PATCH /api/messagerie/groupes/:groupeId
 * Modifier un groupe
 */
router.patch('/groupes/:groupeId', modifierGroupe);

/**
 * POST /api/messagerie/groupes/:groupeId/participants
 * Ajouter des participants à un groupe
 */
router.post('/groupes/:groupeId/participants', ajouterParticipants);

/**
 * DELETE /api/messagerie/groupes/:groupeId/participants/:participantId
 * Retirer un participant d'un groupe (ou quitter soi-même)
 */
router.delete('/groupes/:groupeId/participants/:participantId', retirerParticipant);

export default router;
