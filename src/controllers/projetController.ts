import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Projet, { IProjet, IMembreEquipe, IDocumentProjet, IMediaGalerie, IMetrique } from '../models/Projet.js';
import { uploadPublicationMedias, uploadPublicationMedia, isBase64MediaDataUrl } from '../utils/cloudinary.js';

/**
 * GET /api/projets
 * Liste des projets publiés avec filtres (endpoint public)
 */
export const listerProjets = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categorie, secteur, maturite, q, page = '1', limit = '20' } = req.query;

    // Par défaut, ne montrer que les projets publiés
    const filtre: Record<string, unknown> = { statut: 'published' };
    if (categorie) filtre.categorie = categorie;
    if (secteur) filtre.secteur = secteur;
    if (maturite) filtre.maturite = maturite;
    if (q) {
      filtre.$text = { $search: q as string };
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [projets, total] = await Promise.all([
      Projet.find(filtre)
        .sort({ datePublication: -1, dateCreation: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('porteur', 'prenom nom avatar')
        .populate('equipe.utilisateur', 'prenom nom avatar'),
      Projet.countDocuments(filtre),
    ]);

    res.json({
      succes: true,
      data: {
        projets,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Erreur listerProjets:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * GET /api/projets/:id
 * Détail d'un projet (brouillons visibles uniquement par le porteur)
 */
export const detailProjet = async (req: Request, res: Response): Promise<void> => {
  try {
    const projet = await Projet.findById(req.params.id)
      .populate('porteur', 'prenom nom avatar statut')
      .populate('equipe.utilisateur', 'prenom nom avatar')
      .populate('followers', 'prenom nom avatar');

    if (!projet) {
      res.status(404).json({ succes: false, message: 'Projet non trouvé.' });
      return;
    }

    // Si le projet est en brouillon, seul le porteur peut le voir
    const userId = req.utilisateur?._id;
    if (projet.statut === 'draft') {
      if (!userId || !projet.porteur._id.equals(userId)) {
        res.status(404).json({ succes: false, message: 'Projet non trouvé.' });
        return;
      }
    }

    // Filtrer les documents privés si l'utilisateur n'est pas le porteur
    let documentsFiltered = projet.documents;
    if (!userId || !projet.porteur._id.equals(userId)) {
      documentsFiltered = projet.documents.filter(d => d.visibilite === 'public');
    }

    const projetData = projet.toObject();
    projetData.documents = documentsFiltered;

    // Indiquer si l'utilisateur suit le projet
    const suivi = userId ? projet.followers.some((f: any) => f._id.equals(userId)) : false;

    res.json({
      succes: true,
      data: {
        projet: projetData,
        suivi,
        isOwner: userId ? projet.porteur._id.equals(userId) : false,
      },
    });
  } catch (error) {
    console.error('Erreur detailProjet:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * POST /api/projets/:id/suivre
 * Suivre / ne plus suivre un projet (toggle)
 */
export const toggleSuivreProjet = async (req: Request, res: Response): Promise<void> => {
  try {
    const projet = await Projet.findById(req.params.id);
    if (!projet) {
      res.status(404).json({ succes: false, message: 'Projet non trouvé.' });
      return;
    }

    const userId = req.utilisateur!._id;
    const index = projet.followers.findIndex((id) => id.equals(userId));

    if (index === -1) {
      projet.followers.push(userId);
    } else {
      projet.followers.splice(index, 1);
    }

    await projet.save();

    res.json({
      succes: true,
      data: {
        suivi: index === -1,
        totalFollowers: projet.followers.length,
      },
    });
  } catch (error) {
    console.error('Erreur toggleSuivreProjet:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * GET /api/projets/suivis
 * Mes projets suivis
 */
export const mesProjets = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const projets = await Projet.find({ followers: userId, statut: 'published' })
      .sort({ dateMiseAJour: -1 })
      .populate('porteur', 'prenom nom avatar');

    res.json({ succes: true, data: { projets } });
  } catch (error) {
    console.error('Erreur mesProjets:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// =====================================================
// ENDPOINTS ENTREPRENEUR
// =====================================================

/**
 * GET /api/projets/entrepreneur/mes-projets
 * Liste des projets de l'entrepreneur connecté (brouillons + publiés)
 */
export const mesProjetsEntrepreneur = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const { statut } = req.query;

    const filtre: Record<string, unknown> = { porteur: userId };
    if (statut && ['draft', 'published'].includes(statut as string)) {
      filtre.statut = statut;
    }

    const projets = await Projet.find(filtre)
      .sort({ dateMiseAJour: -1 })
      .populate('equipe.utilisateur', 'prenom nom avatar');

    // Statistiques
    const stats = {
      total: projets.length,
      drafts: projets.filter(p => p.statut === 'draft').length,
      published: projets.filter(p => p.statut === 'published').length,
      totalFollowers: projets.reduce((sum, p) => sum + p.followers.length, 0),
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
      statut: 'draft',
      maturite: req.body.maturite || 'idee',
      progression: 0,
    };

    const projet = new Projet(projetData);
    await projet.save();

    res.status(201).json({
      succes: true,
      message: 'Projet créé en brouillon.',
      data: { projet },
    });
  } catch (error) {
    console.error('Erreur creerProjet:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * PUT /api/projets/entrepreneur/:id
 * Modifier un projet existant (toutes les étapes du wizard)
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

    // Vérifier que l'utilisateur est le porteur
    if (!projet.porteur.equals(userId)) {
      res.status(403).json({ succes: false, message: 'Accès non autorisé.' });
      return;
    }

    // Champs modifiables (Étapes A-E)
    const champsModifiables = [
      // Étape A - Identité
      'nom', 'description', 'pitch', 'logo', 'categorie', 'secteur', 'tags', 'localisation',
      // Étape B - Équipe
      'equipe',
      // Étape C - Proposition de valeur
      'probleme', 'solution', 'avantageConcurrentiel', 'cible',
      // Étape D - Traction & business
      'maturite', 'businessModel', 'metriques', 'objectifFinancement', 'montantLeve', 'progression', 'objectif',
      // Étape E - Médias & documents
      'image', 'pitchVideo', 'galerie', 'documents',
    ];

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

    // Validation avant publication
    const erreurs: string[] = [];
    if (!projet.nom) erreurs.push('Le nom est requis');
    if (!projet.description || projet.description.length < 50) erreurs.push('La description doit faire au moins 50 caractères');
    if (!projet.pitch) erreurs.push('Le pitch est requis');
    if (!projet.image) erreurs.push('Une image de couverture est requise');

    if (erreurs.length > 0) {
      res.status(400).json({
        succes: false,
        message: 'Le projet n\'est pas prêt à être publié.',
        erreurs,
      });
      return;
    }

    projet.statut = 'published';
    projet.datePublication = new Date();
    await projet.save();

    res.json({
      succes: true,
      message: 'Projet publié avec succès.',
      data: { projet },
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

    await Projet.findByIdAndDelete(projetId);

    res.json({ succes: true, message: 'Projet supprimé.' });
  } catch (error) {
    console.error('Erreur supprimerProjet:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * POST /api/projets/entrepreneur/:id/upload-media
 * Upload de médias (images/vidéos) pour un projet
 * Body: { medias: string[] } - tableau de data URLs base64
 */
export const uploadMediaProjet = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const projetId = req.params.id;
    const { medias, type } = req.body; // type: 'galerie' | 'logo' | 'cover' | 'pitchVideo'

    const projet = await Projet.findById(projetId);
    if (!projet) {
      res.status(404).json({ succes: false, message: 'Projet non trouvé.' });
      return;
    }

    if (!projet.porteur.equals(userId)) {
      res.status(403).json({ succes: false, message: 'Accès non autorisé.' });
      return;
    }

    if (!medias || !Array.isArray(medias) || medias.length === 0) {
      res.status(400).json({ succes: false, message: 'Aucun média fourni.' });
      return;
    }

    // Filtrer les médias valides (base64 data URLs)
    const mediasValides = medias.filter((m: string) => isBase64MediaDataUrl(m));
    if (mediasValides.length === 0) {
      res.status(400).json({ succes: false, message: 'Aucun média valide fourni.' });
      return;
    }

    // Upload sur Cloudinary
    const uploadResults = await uploadPublicationMedias(mediasValides, projetId);

    // Mettre à jour le projet selon le type
    if (type === 'logo' && uploadResults.length > 0) {
      projet.logo = uploadResults[0].url;
    } else if (type === 'cover' && uploadResults.length > 0) {
      projet.image = uploadResults[0].url;
    } else if (type === 'pitchVideo' && uploadResults.length > 0) {
      projet.pitchVideo = uploadResults[0].url;
    } else {
      // Galerie - ajouter les médias
      const nouveauxMedias: IMediaGalerie[] = uploadResults.map((r, index) => ({
        url: r.url,
        type: r.type,
        thumbnailUrl: r.thumbnailUrl,
        ordre: projet.galerie.length + index,
      }));
      projet.galerie.push(...nouveauxMedias);
    }

    await projet.save();

    res.json({
      succes: true,
      message: 'Médias uploadés.',
      data: { urls: uploadResults.map(r => r.url) },
    });
  } catch (error) {
    console.error('Erreur uploadMediaProjet:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * POST /api/projets/entrepreneur/:id/upload-document
 * Upload d'un document pour un projet
 * Body: { document: string (base64), nom: string, type: string, visibilite: string }
 */
export const uploadDocumentProjet = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const projetId = req.params.id;
    const { document, nom, type = 'other', visibilite = 'private' } = req.body;

    const projet = await Projet.findById(projetId);
    if (!projet) {
      res.status(404).json({ succes: false, message: 'Projet non trouvé.' });
      return;
    }

    if (!projet.porteur.equals(userId)) {
      res.status(403).json({ succes: false, message: 'Accès non autorisé.' });
      return;
    }

    if (!document || !nom) {
      res.status(400).json({ succes: false, message: 'Document et nom requis.' });
      return;
    }

    // Upload sur Cloudinary (traité comme média)
    const url = await uploadPublicationMedia(document, `${projetId}_doc`);

    const nouveauDocument: IDocumentProjet = {
      nom: nom.trim(),
      url,
      type: type as IDocumentProjet['type'],
      visibilite: visibilite as IDocumentProjet['visibilite'],
      dateAjout: new Date(),
    };

    projet.documents.push(nouveauDocument);
    await projet.save();

    res.json({
      succes: true,
      message: 'Document uploadé.',
      data: { document: nouveauDocument },
    });
  } catch (error) {
    console.error('Erreur uploadDocumentProjet:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};
