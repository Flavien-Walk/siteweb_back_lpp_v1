import { Router } from 'express';
import { verifierJwt } from '../middlewares/verifierJwt.js';
import { checkUserStatus } from '../middlewares/checkUserStatus.js';
import {
  creerTicket,
  listerMesTickets,
  getMonTicket,
  ajouterMessageUtilisateur,
} from '../controllers/supportTicketController.js';

const router = Router();

// Toutes les routes necessitent authentification + compte actif
router.use(verifierJwt, checkUserStatus);

// POST /api/support - Creer un ticket
router.post('/', creerTicket);

// GET /api/support - Lister mes tickets
router.get('/', listerMesTickets);

// GET /api/support/:id - Detail d'un ticket
router.get('/:id', getMonTicket);

// POST /api/support/:id/messages - Ajouter un message
router.post('/:id/messages', ajouterMessageUtilisateur);

export default router;
