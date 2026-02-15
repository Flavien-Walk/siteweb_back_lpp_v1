import { Request, Response } from 'express';
import ParcoursUtilisateur, {
  NIVEAUX_VISITEUR,
  NIVEAUX_ENTREPRENEUR,
  getNiveauInfo,
  calculerNiveau,
  NiveauConfig,
} from '../models/ParcoursUtilisateur.js';
import DefiSemaine from '../models/DefiSemaine.js';
import Utilisateur from '../models/Utilisateur.js';

// === CONFIGURATION XP PAR ACTION ===

const XP_PAR_ACTION: Record<string, number> = {
  follow_projet: 10,
  like_publication: 5,
  comment_publication: 15,
  create_publication: 20,
  visit_projet: 5,
  create_projet: 50,
  complete_profil: 30,
  first_message: 15,
  add_friend: 10,
};

// Mapping action → type de defi
const ACTION_TO_DEFI_TYPE: Record<string, string> = {
  follow_projet: 'follow',
  like_publication: 'like',
  comment_publication: 'comment',
  create_publication: 'publish',
  visit_projet: 'visit_projet',
};

// === CONFIGURATION QUETES ===

interface QueteConfig {
  id: string;
  titre: string;
  description: string;
  xp: number;
  icone: string;
  type: 'visiteur' | 'entrepreneur' | 'tous';
  action: string;
  countRequis: number;
}

const QUETES: QueteConfig[] = [
  // Quetes pour tous
  {
    id: 'premier_follow',
    titre: 'Premier soutien',
    description: 'Suis ton premier projet',
    xp: 20,
    icone: 'heart-outline',
    type: 'tous',
    action: 'follow_projet',
    countRequis: 1,
  },
  {
    id: 'premier_like',
    titre: 'Premiere reaction',
    description: 'Like une publication',
    xp: 10,
    icone: 'thumbs-up-outline',
    type: 'tous',
    action: 'like_publication',
    countRequis: 1,
  },
  {
    id: 'premier_commentaire',
    titre: 'Ta voix compte',
    description: 'Commente une publication',
    xp: 20,
    icone: 'chatbubble-outline',
    type: 'tous',
    action: 'comment_publication',
    countRequis: 1,
  },
  {
    id: 'decouvrir_3_projets',
    titre: 'Explorateur',
    description: 'Visite 3 projets differents',
    xp: 30,
    icone: 'compass-outline',
    type: 'tous',
    action: 'visit_projet',
    countRequis: 3,
  },
  {
    id: 'suivre_5_projets',
    titre: 'Fan inconditionnel',
    description: 'Suis 5 projets',
    xp: 50,
    icone: 'star-outline',
    type: 'tous',
    action: 'follow_projet',
    countRequis: 5,
  },
  {
    id: 'premier_ami',
    titre: 'Premiere connexion',
    description: 'Ajoute un ami',
    xp: 15,
    icone: 'people-outline',
    type: 'tous',
    action: 'add_friend',
    countRequis: 1,
  },
  {
    id: 'profil_complet',
    titre: "Carte d'identite",
    description: 'Complete ton profil (avatar + bio)',
    xp: 30,
    icone: 'person-circle-outline',
    type: 'tous',
    action: 'complete_profil',
    countRequis: 1,
  },
  // Quetes entrepreneur
  {
    id: 'premier_projet',
    titre: 'Premiere pierre',
    description: 'Cree ton premier projet',
    xp: 50,
    icone: 'rocket-outline',
    type: 'entrepreneur',
    action: 'create_projet',
    countRequis: 1,
  },
  {
    id: 'premiere_publication',
    titre: 'Prise de parole',
    description: 'Publie ton premier post',
    xp: 30,
    icone: 'megaphone-outline',
    type: 'entrepreneur',
    action: 'create_publication',
    countRequis: 1,
  },
  {
    id: 'premier_message',
    titre: 'Contact direct',
    description: 'Envoie un premier message',
    xp: 15,
    icone: 'mail-outline',
    type: 'entrepreneur',
    action: 'first_message',
    countRequis: 1,
  },
];

// === HELPERS ===

function getDebutSemaine(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const debut = new Date(now.setDate(diff));
  debut.setHours(0, 0, 0, 0);
  return debut;
}

function getFinSemaine(): Date {
  const debut = getDebutSemaine();
  const fin = new Date(debut);
  fin.setDate(fin.getDate() + 6);
  fin.setHours(23, 59, 59, 999);
  return fin;
}

function isToday(date: Date | null): boolean {
  if (!date) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isYesterday(date: Date | null): boolean {
  if (!date) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  );
}

function getNiveaux(statut: string): NiveauConfig[] {
  return statut === 'entrepreneur' ? NIVEAUX_ENTREPRENEUR : NIVEAUX_VISITEUR;
}

// Defis par defaut qui se creent automatiquement quand il n'y en a pas
const DEFIS_PAR_DEFAUT = [
  {
    titre: 'Decouvre la communaute',
    description: 'Suis 3 projets pour decouvrir les entrepreneurs de La Premiere Pierre',
    type: 'follow' as const,
    objectif: 3,
    xpRecompense: 50,
    icone: 'people-outline',
    couleur: '#7C5CFF',
  },
  {
    titre: 'Reagis au contenu',
    description: 'Like 5 publications de la communaute',
    type: 'like' as const,
    objectif: 5,
    xpRecompense: 40,
    icone: 'heart-outline',
    couleur: '#FF4D6D',
  },
  {
    titre: 'Partage ton avis',
    description: 'Commente 3 publications',
    type: 'comment' as const,
    objectif: 3,
    xpRecompense: 60,
    icone: 'chatbubbles-outline',
    couleur: '#2DE2E6',
  },
];

async function getOuCreerDefiActif(): Promise<typeof DefiSemaine.prototype | null> {
  const now = new Date();

  // Chercher un defi actif
  let defi = await DefiSemaine.findOne({
    actif: true,
    dateFin: { $gte: now },
    dateDebut: { $lte: now },
  }).lean();

  if (defi) return defi;

  // Pas de defi actif → en creer un par defaut (rotation)
  const totalDefis = await DefiSemaine.countDocuments();
  const defiIndex = totalDefis % DEFIS_PAR_DEFAUT.length;
  const template = DEFIS_PAR_DEFAUT[defiIndex];

  const nouveauDefi = await DefiSemaine.create({
    ...template,
    dateDebut: getDebutSemaine(),
    dateFin: getFinSemaine(),
    actif: true,
    participants: 0,
    completions: 0,
  });

  return nouveauDefi.toObject();
}

// === ENDPOINTS ===

/**
 * GET /api/parcours/moi
 * Retourne le parcours de l'utilisateur connecte + defi actif + quetes disponibles
 */
export const getMonParcours = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const utilisateur = await Utilisateur.findById(userId).select('statut').lean();
    const statut = utilisateur?.statut || 'visiteur';

    // Trouver ou creer le parcours
    let parcours = await ParcoursUtilisateur.findOne({ utilisateur: userId });
    if (!parcours) {
      parcours = await ParcoursUtilisateur.create({
        utilisateur: userId,
        xp: 0,
        niveau: 1,
        quetesCompletees: [],
        defis: [],
        streak: 0,
        lastActivityDate: null,
      });
    }

    const niveaux = getNiveaux(statut);
    const niveauInfo = getNiveauInfo(parcours.xp, niveaux);

    // Defi actif
    const defiActif = await getOuCreerDefiActif();
    let defiProgression = null;

    if (defiActif) {
      const progressionExistante = parcours.defis.find(
        d => d.defiId.toString() === defiActif._id.toString()
      );
      defiProgression = {
        _id: defiActif._id.toString(),
        titre: defiActif.titre,
        description: defiActif.description,
        objectif: defiActif.objectif,
        progression: progressionExistante?.progression || 0,
        complete: progressionExistante?.complete || false,
        xpRecompense: defiActif.xpRecompense,
        dateFin: defiActif.dateFin.toISOString(),
        participants: defiActif.participants,
        completions: defiActif.completions,
        icone: defiActif.icone,
        couleur: defiActif.couleur,
      };
    }

    // Quetes disponibles (non completees, filtrees par statut)
    const quetesCompleteesIds = new Set(parcours.quetesCompletees.map(q => q.queteId));
    const quetesDisponibles = QUETES
      .filter(q => q.type === 'tous' || q.type === statut)
      .filter(q => !quetesCompleteesIds.has(q.id))
      .map(q => ({
        id: q.id,
        titre: q.titre,
        description: q.description,
        xp: q.xp,
        icone: q.icone,
        type: q.type,
      }));

    res.json({
      succes: true,
      data: {
        parcours: {
          xp: parcours.xp,
          ...niveauInfo,
          streak: parcours.streak,
          quetesCompletees: parcours.quetesCompletees.map(q => q.queteId),
        },
        defiActif: defiProgression,
        quetesDisponibles,
      },
    });
  } catch (error) {
    console.error('Erreur getMonParcours:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * POST /api/parcours/action
 * Enregistre une action gamifiee et attribue l'XP
 */
export const enregistrerAction = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const { action, targetId } = req.body;

    if (!action || !XP_PAR_ACTION[action]) {
      res.status(400).json({ succes: false, message: 'Action invalide.' });
      return;
    }

    const utilisateur = await Utilisateur.findById(userId).select('statut').lean();
    const statut = utilisateur?.statut || 'visiteur';
    const niveaux = getNiveaux(statut);

    // Trouver ou creer le parcours
    let parcours = await ParcoursUtilisateur.findOne({ utilisateur: userId });
    if (!parcours) {
      parcours = await ParcoursUtilisateur.create({
        utilisateur: userId,
        xp: 0,
        niveau: 1,
        quetesCompletees: [],
        defis: [],
        streak: 0,
        lastActivityDate: null,
      });
    }

    const ancienNiveau = parcours.niveau;
    let xpGagne = XP_PAR_ACTION[action];
    let queteCompletee: string | null = null;

    // Verifier les quetes
    const quetesCompleteesIds = new Set(parcours.quetesCompletees.map(q => q.queteId));
    const quetesEligibles = QUETES.filter(
      q => (q.type === 'tous' || q.type === statut) &&
           q.action === action &&
           !quetesCompleteesIds.has(q.id)
    );

    for (const quete of quetesEligibles) {
      // Compter combien de fois cette action a ete faite (quetes completees de meme action + 1 pour celle-ci)
      const countPrecedent = parcours.quetesCompletees.filter(
        qc => QUETES.find(q => q.id === qc.queteId)?.action === action
      ).length;
      // +1 pour l'action actuelle
      const countTotal = countPrecedent + 1;

      // Heuristique simplifiee : on compte le nombre d'actions de ce type deja enregistrees
      // Pour les quetes multi-actions (follow 5 projets), on verifie via le nombre d'actions similaires completees
      // Pour simplifier, on verifie juste si l'action courante est suffisante
      if (quete.countRequis <= 1 || countTotal >= quete.countRequis) {
        // Quete completee !
        parcours.quetesCompletees.push({
          queteId: quete.id,
          completedAt: new Date(),
          xpGagne: quete.xp,
        });
        xpGagne += quete.xp;
        queteCompletee = quete.id;
        break; // Une seule quete completee par action
      }
    }

    // Ajouter l'XP
    parcours.xp += xpGagne;

    // Verifier level up
    const nouveauNiveau = calculerNiveau(parcours.xp, niveaux);
    parcours.niveau = nouveauNiveau;
    const levelUp = nouveauNiveau > ancienNiveau;

    // Mettre a jour le streak
    if (!isToday(parcours.lastActivityDate)) {
      if (isYesterday(parcours.lastActivityDate)) {
        parcours.streak += 1;
      } else {
        // Streak casse ou premier jour
        parcours.streak = 1;
      }
      parcours.lastActivityDate = new Date();
    }

    // Progression du defi actif
    let defiProgression = null;
    const defiActif = await getOuCreerDefiActif();

    if (defiActif) {
      const defiType = ACTION_TO_DEFI_TYPE[action];

      if (defiType && defiType === defiActif.type) {
        // Cette action progresse dans le defi
        let progDefi = parcours.defis.find(
          d => d.defiId.toString() === defiActif._id.toString()
        );

        if (!progDefi) {
          // Premier engagement dans ce defi
          parcours.defis.push({
            defiId: defiActif._id,
            progression: 0,
            objectif: defiActif.objectif,
            complete: false,
          });
          progDefi = parcours.defis[parcours.defis.length - 1];

          // Incrementer le compteur de participants (atomique)
          await DefiSemaine.updateOne(
            { _id: defiActif._id },
            { $inc: { participants: 1 } }
          );
        }

        if (!progDefi.complete) {
          progDefi.progression += 1;

          if (progDefi.progression >= progDefi.objectif) {
            progDefi.complete = true;
            progDefi.completedAt = new Date();
            // Bonus XP pour le defi
            parcours.xp += defiActif.xpRecompense;
            xpGagne += defiActif.xpRecompense;
            // Recalculer le niveau avec le bonus
            parcours.niveau = calculerNiveau(parcours.xp, niveaux);

            // Incrementer le compteur de completions
            await DefiSemaine.updateOne(
              { _id: defiActif._id },
              { $inc: { completions: 1 } }
            );
          }
        }

        defiProgression = {
          progression: progDefi.progression,
          objectif: progDefi.objectif,
          complete: progDefi.complete,
        };
      }
    }

    await parcours.save();

    const niveauInfo = getNiveauInfo(parcours.xp, niveaux);

    res.json({
      succes: true,
      data: {
        xpGagne,
        totalXp: parcours.xp,
        niveau: parcours.niveau,
        levelUp,
        niveauNom: niveauInfo.niveauNom,
        queteCompletee,
        defiProgression,
      },
    });
  } catch (error) {
    console.error('Erreur enregistrerAction:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * GET /api/parcours/quetes
 * Liste complete des quetes avec statut
 */
export const getQuetes = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const utilisateur = await Utilisateur.findById(userId).select('statut').lean();
    const statut = utilisateur?.statut || 'visiteur';

    const parcours = await ParcoursUtilisateur.findOne({ utilisateur: userId }).lean();
    const quetesCompleteesIds = new Set(
      (parcours?.quetesCompletees || []).map(q => q.queteId)
    );

    const quetes = QUETES
      .filter(q => q.type === 'tous' || q.type === statut)
      .map(q => ({
        id: q.id,
        titre: q.titre,
        description: q.description,
        xp: q.xp,
        icone: q.icone,
        type: q.type,
        completee: quetesCompleteesIds.has(q.id),
      }));

    res.json({
      succes: true,
      data: { quetes },
    });
  } catch (error) {
    console.error('Erreur getQuetes:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};
