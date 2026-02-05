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
  modifierMessage,
  supprimerMessage,
  supprimerGroupe,
  reagirMessage,
} from '../controllers/messagerieController.js';
import { verifierJwt } from '../middlewares/verifierJwt.js';
import { checkUserStatus } from '../middlewares/checkUserStatus.js';

const router = Router();

// Toutes les routes de messagerie nécessitent une authentification
// et vérification du statut (banni/suspendu)
router.use(verifierJwt);
router.use(checkUserStatus);

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
 * PATCH /api/messagerie/conversations/:conversationId/messages/:messageId
 * Modifier un message (expediteur uniquement, 15 min max)
 */
router.patch('/conversations/:conversationId/messages/:messageId', modifierMessage);

/**
 * DELETE /api/messagerie/conversations/:conversationId/messages/:messageId
 * Supprimer un message (expediteur uniquement)
 */
router.delete('/conversations/:conversationId/messages/:messageId', supprimerMessage);

/**
 * POST /api/messagerie/messages/:messageId/react
 * Ajouter ou supprimer une réaction sur un message
 */
router.post('/messages/:messageId/react', reagirMessage);

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

/**
 * DELETE /api/messagerie/groupes/:groupeId
 * Supprimer un groupe entier (createur ou admin uniquement)
 */
router.delete('/groupes/:groupeId', supprimerGroupe);

export default router;
