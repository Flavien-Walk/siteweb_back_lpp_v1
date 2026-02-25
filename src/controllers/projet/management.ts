import { Request, Response } from 'express';
import Projet, { IProjet } from '../../models/Projet.js';
import Notification from '../../models/Notification.js';
import Report from '../../models/Report.js';
import AuditLog from '../../models/AuditLog.js';
import { applyGamificationEvent } from '../../services/gamificationEngine.js';
import { INCUBATEURS_FR } from '../../constants/incubateurs.js';
import mongoose from 'mongoose';
import { canEditProject } from '../../utils/projetHelpers.js';

// =====================================================
// ENDPOINTS ENTREPRENEUR
// =====================================================

/**
 * GET /api/projets/entrepreneur/mes-projets
 * Liste des projets de l'entrepreneur connecté (brouillons + publiés)
 * Inclut les projets où l'utilisateur est porteur OU membre de l'équipe
 */
export const mesProjetsEntrepreneur = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const { statut } = req.query;

    // Chercher les projets où l'utilisateur est porteur OU membre de l'équipe
    const filtre: Record<string, unknown> = {
      $or: [
        { porteur: userId },
        { 'equipe.utilisateur': userId },
      ],
    };
    if (statut && ['draft', 'published'].includes(statut as string)) {
      filtre.statut = statut;
    }

    const projets = await Projet.find(filtre)
      .sort({ dateMiseAJour: -1 })
      .populate('porteur', 'prenom nom avatar')
      .populate('equipe.utilisateur', 'prenom nom avatar');

    // Séparer les projets où je suis porteur vs membre
    const mesProjetsOwner = projets.filter(p => p.porteur._id.equals(userId));
    const mesProjetsEquipe = projets.filter(p => !p.porteur._id.equals(userId));

    // Statistiques (basées sur mes projets en tant que porteur)
    const stats = {
      total: mesProjetsOwner.length,
      drafts: mesProjetsOwner.filter(p => p.statut === 'draft').length,
      published: mesProjetsOwner.filter(p => p.statut === 'published').length,
      totalFollowers: mesProjetsOwner.reduce((sum, p) => sum + p.followers.length, 0),
      projetsEquipe: mesProjetsEquipe.length,
    };

    res.json({ succes: true, data: { projets, stats } });
  } catch (error) {
    console.error('Erreur mesProjetsEntrepreneur:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * POST /api/projets/entrepreneur/creer
 * Créer un nouveau projet (brouillon par défaut)
 */
export const creerProjet = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;

    // Données minimales requises pour créer un brouillon
    const {
      nom,
      pitch,
      categorie,
      localisation,
    } = req.body;

    if (!nom || !pitch || !categorie || !localisation?.ville) {
      res.status(400).json({
        succes: false,
        message: 'Données manquantes: nom, pitch, categorie et localisation.ville sont requis.',
      });
      return;
    }

    // Créer le projet avec les champs de base
    const projetData: Partial<IProjet> = {
      nom: nom.trim(),
      description: req.body.description || '',
      pitch: pitch.trim(),
      categorie,
      secteur: req.body.secteur || '',
      tags: req.body.tags || [],
      localisation: {
        ville: localisation.ville,
        lat: localisation.lat || 0,
        lng: localisation.lng || 0,
      },
      porteur: userId,
      equipe: [],
      metriques: [],
      galerie: [],
      documents: [],
      liens: [],
      statut: 'draft',
      maturite: req.body.maturite || 'idee',
      progression: 0,
    };

    // Incubateur optionnel — valider contre la liste
    if (req.body.incubateur) {
      const inc = String(req.body.incubateur).trim();
      if (INCUBATEURS_FR.includes(inc)) {
        projetData.incubateur = inc;
      }
    }

    const projet = new Projet(projetData);
    await projet.save();

    // Gamification: XP pour creation de projet
    const gamification = await applyGamificationEvent(userId.toString(), 'create_project', projet._id.toString()).catch(() => null);

    res.status(201).json({
      succes: true,
      message: 'Projet créé en brouillon.',
      data: { projet },
      ...(gamification ? { gamification } : {}),
    });
  } catch (error) {
    console.error('Erreur creerProjet:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * PUT /api/projets/entrepreneur/:id
 * Modifier un projet existant (toutes les étapes du wizard)
 * Accessible au porteur ET aux membres de l'équipe
 */
export const modifierProjet = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const projetId = req.params.id;

    const projet = await Projet.findById(projetId);
    if (!projet) {
      res.status(404).json({ succes: false, message: 'Projet non trouvé.' });
      return;
    }

    // Vérifier que l'utilisateur est le porteur OU membre de l'équipe
    if (!canEditProject(projet, userId)) {
      res.status(403).json({ succes: false, message: 'Accès non autorisé.' });
      return;
    }

    // Séparer les droits owner vs membre d'équipe
    const isOwner = projet.porteur.equals(userId);

    // Membres d'équipe: uniquement médias, documents, liens, métriques
    const champsMembre = [
      'galerie', 'documents', 'liens', 'metriques', 'pitchVideo',
    ];

    // Owner: tous les champs
    const champsOwner = [
      // Étape A - Identité
      'nom', 'description', 'pitch', 'logo', 'categorie', 'secteur', 'tags', 'localisation', 'incubateur',
      // Étape C - Proposition de valeur
      'probleme', 'solution', 'avantageConcurrentiel', 'cible',
      // Étape D - Traction & business
      'maturite', 'businessModel', 'objectifFinancement', 'montantLeve', 'progression', 'objectif',
      // Étape E - Médias (partagé avec membres)
      ...champsMembre,
      // Gestion d'équipe (owner uniquement)
      'image', 'equipe',
    ];

    const champsModifiables = isOwner ? champsOwner : champsMembre;

    // Appliquer les modifications
    for (const champ of champsModifiables) {
      if (req.body[champ] !== undefined) {
        (projet as any)[champ] = req.body[champ];
      }
    }

    await projet.save();

    res.json({
      succes: true,
      message: 'Projet mis à jour.',
      data: { projet },
    });
  } catch (error) {
    console.error('Erreur modifierProjet:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * POST /api/projets/entrepreneur/:id/publier
 * Publier un projet (passe de draft à published)
 * Retourne une erreur détaillée avec les champs manquants
 */
export const publierProjet = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const projetId = req.params.id;

    const projet = await Projet.findById(projetId);
    if (!projet) {
      res.status(404).json({ succes: false, message: 'Projet non trouvé.' });
      return;
    }

    if (!projet.porteur.equals(userId)) {
      res.status(403).json({ succes: false, message: 'Accès non autorisé.' });
      return;
    }

    if (projet.statut === 'published') {
      res.status(400).json({ succes: false, message: 'Le projet est déjà publié.' });
      return;
    }

    // Validation avant publication - champs requis pour publier
    const missing: string[] = [];
    const details: Record<string, string> = {};

    // Étape A - Identité (obligatoires)
    if (!projet.nom || projet.nom.trim().length === 0) {
      missing.push('nom');
      details.nom = 'Le nom du projet est requis';
    }
    if (!projet.pitch || projet.pitch.trim().length === 0) {
      missing.push('pitch');
      details.pitch = 'Le pitch (slogan) est requis';
    }
    if (!projet.categorie) {
      missing.push('categorie');
      details.categorie = 'La catégorie est requise';
    }
    if (!projet.localisation?.ville || projet.localisation.ville.trim().length === 0) {
      missing.push('localisation');
      details.localisation = 'La ville est requise';
    }

    // Étape C - Proposition de valeur (au moins problème OU solution)
    // Optionnel pour publication mais recommandé

    // Étape E - Médias (image de couverture requise)
    if (!projet.image || projet.image.trim().length === 0) {
      missing.push('image');
      details.image = 'Une image de couverture est requise';
    }

    // Description optionnelle (pas de minimum requis pour publication)

    if (missing.length > 0) {
      res.status(400).json({
        succes: false,
        message: 'Projet incomplet',
        missing,
        details,
      });
      return;
    }

    projet.statut = 'published';
    projet.datePublication = new Date();
    await projet.save();

    // Log d'audit
    try {
      await AuditLog.create({
        action: 'content:other',
        targetType: 'publication',
        targetId: projet._id,
        performedBy: userId,
        metadata: { type: 'project_published', nom: projet.nom },
        source: 'api',
      });
    } catch (auditError) {
      console.error('Erreur audit log:', auditError);
    }

    // Gamification: XP pour publication de projet
    const gamification = await applyGamificationEvent(userId.toString(), 'publish_project', projet._id.toString()).catch(() => null);

    res.json({
      succes: true,
      message: 'Projet publié avec succès.',
      data: { projet },
      ...(gamification ? { gamification } : {}),
    });
  } catch (error) {
    console.error('Erreur publierProjet:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * POST /api/projets/entrepreneur/:id/depublier
 * Dépublier un projet (repasse en brouillon)
 */
export const depublierProjet = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const projetId = req.params.id;

    const projet = await Projet.findById(projetId);
    if (!projet) {
      res.status(404).json({ succes: false, message: 'Projet non trouvé.' });
      return;
    }

    if (!projet.porteur.equals(userId)) {
      res.status(403).json({ succes: false, message: 'Accès non autorisé.' });
      return;
    }

    if (projet.statut === 'draft') {
      res.status(400).json({ succes: false, message: 'Le projet est déjà en brouillon.' });
      return;
    }

    projet.statut = 'draft';
    await projet.save();

    res.json({
      succes: true,
      message: 'Projet dépublié.',
      data: { projet },
    });
  } catch (error) {
    console.error('Erreur depublierProjet:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * DELETE /api/projets/entrepreneur/:id
 * Supprimer un projet
 */
export const supprimerProjet = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const projetId = req.params.id;

    const projet = await Projet.findById(projetId);
    if (!projet) {
      res.status(404).json({ succes: false, message: 'Projet non trouvé.' });
      return;
    }

    if (!projet.porteur.equals(userId)) {
      res.status(403).json({ succes: false, message: 'Accès non autorisé.' });
      return;
    }

    // RED-03: Cascade delete — clean up all references to this project
    await Promise.all([
      Projet.findByIdAndDelete(projetId),
      // Remove all notifications referencing this project
      Notification.deleteMany({ 'data.projetId': projetId }),
      // Remove all reports targeting this project
      Report.deleteMany({ targetType: 'projet', targetId: projetId }),
    ]);

    // Audit log
    try {
      await AuditLog.create({
        action: 'content:other',
        targetType: 'publication',
        targetId: projetId,
        performedBy: userId,
        metadata: { type: 'project_deleted', nom: projet.nom },
        source: 'api',
      });
    } catch (auditErr) {
      console.error('Erreur audit log suppression projet:', auditErr);
    }

    res.json({ succes: true, message: 'Projet supprimé.' });
  } catch (error) {
    console.error('Erreur supprimerProjet:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};
