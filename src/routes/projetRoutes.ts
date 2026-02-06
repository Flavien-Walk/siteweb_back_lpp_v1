import { Router } from 'express';
import {
  listerProjets,
  detailProjet,
  toggleSuivreProjet,
  mesProjets,
  mesProjetsEntrepreneur,
  creerProjet,
  modifierProjet,
  publierProjet,
  depublierProjet,
  gererEquipeProjet,
  supprimerProjet,
  uploadMediaProjet,
  uploadDocumentProjet,
} from '../controllers/projetController.js';
import { verifierJwt, chargerUtilisateurOptionnel } from '../middlewares/verifierJwt.js';
import { checkUserStatus } from '../middlewares/checkUserStatus.js';
import { checkEntrepreneur } from '../middlewares/checkEntrepreneur.js';

const router = Router();

// =====================================================
// ROUTES ENTREPRENEUR (doivent être avant /:id)
// =====================================================

/**
 * GET /api/projets/entrepreneur/mes-projets
 * Liste des projets de l'entrepreneur connecté
 */
router.get('/entrepreneur/mes-projets', verifierJwt, checkUserStatus, checkEntrepreneur, mesProjetsEntrepreneur);

/**
 * POST /api/projets/entrepreneur/creer
 * Créer un nouveau projet
 */
router.post('/entrepreneur/creer', verifierJwt, checkUserStatus, checkEntrepreneur, creerProjet);

/**
 * PUT /api/projets/entrepreneur/:id
 * Modifier un projet
 */
router.put('/entrepreneur/:id', verifierJwt, checkUserStatus, checkEntrepreneur, modifierProjet);

/**
 * POST /api/projets/entrepreneur/:id/publier
 * Publier un projet
 */
router.post('/entrepreneur/:id/publier', verifierJwt, checkUserStatus, checkEntrepreneur, publierProjet);

/**
 * POST /api/projets/entrepreneur/:id/depublier
 * Dépublier un projet (repasser en brouillon)
 */
router.post('/entrepreneur/:id/depublier', verifierJwt, checkUserStatus, checkEntrepreneur, depublierProjet);

/**
 * PATCH /api/projets/entrepreneur/:id/equipe
 * Gérer l'équipe d'un projet (ajouter/retirer des membres)
 */
router.patch('/entrepreneur/:id/equipe', verifierJwt, checkUserStatus, checkEntrepreneur, gererEquipeProjet);

/**
 * DELETE /api/projets/entrepreneur/:id
 * Supprimer un projet
 */
router.delete('/entrepreneur/:id', verifierJwt, checkUserStatus, checkEntrepreneur, supprimerProjet);

/**
 * POST /api/projets/entrepreneur/:id/upload-media
 * Upload de médias (images/vidéos) pour un projet
 */
router.post('/entrepreneur/:id/upload-media', verifierJwt, checkUserStatus, checkEntrepreneur, uploadMediaProjet);

/**
 * POST /api/projets/entrepreneur/:id/upload-document
 * Upload d'un document pour un projet
 */
router.post('/entrepreneur/:id/upload-document', verifierJwt, checkUserStatus, checkEntrepreneur, uploadDocumentProjet);

// =====================================================
// ROUTES PUBLIQUES / UTILISATEURS
// =====================================================

/**
 * GET /api/projets/suivis
 * Mes projets suivis
 */
router.get('/suivis', verifierJwt, checkUserStatus, mesProjets);

/**
 * GET /api/projets
 * Liste des projets publiés avec filtres
 */
router.get('/', listerProjets);

/**
 * GET /api/projets/:id
 * Détail d'un projet (avec auth optionnelle pour voir si owner)
 */
router.get('/:id', chargerUtilisateurOptionnel, detailProjet);

/**
 * POST /api/projets/:id/suivre
 * Suivre / ne plus suivre un projet
 */
router.post('/:id/suivre', verifierJwt, checkUserStatus, toggleSuivreProjet);

export default router;
