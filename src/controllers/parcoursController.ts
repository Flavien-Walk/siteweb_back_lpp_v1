import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ParcoursUtilisateur, {
  NIVEAUX_VISITEUR,
  NIVEAUX_ENTREPRENEUR,
  getNiveauInfo,
  calculerNiveau,
  NiveauConfig,
} from '../models/ParcoursUtilisateur.js';
import DefiSemaine from '../models/DefiSemaine.js';
import Utilisateur from '../models/Utilisateur.js';
import Notification from '../models/Notification.js';
import Projet from '../models/Projet.js';
import Publication from '../models/Publication.js';
import { Conversation } from '../models/Message.js';
import Commentaire from '../models/Commentaire.js';

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

/**
 * Creer une notification gamification pour l'utilisateur
 */
async function creerNotifGamification(
  userId: mongoose.Types.ObjectId,
  titre: string,
  message: string
): Promise<void> {
  try {
    await Notification.create({
      destinataire: userId,
      type: 'interaction',
      titre,
      message,
      lue: false,
    });
  } catch (err) {
    console.error('[Parcours] Erreur creation notification:', err);
  }
}

/**
 * Calculer l'XP initial en scannant l'historique d'un utilisateur existant.
 * Appele une seule fois lors de la premiere creation du parcours.
 */
async function calculerXpInitial(
  userId: mongoose.Types.ObjectId,
  statut: string
): Promise<{ xp: number; quetesCompletees: { queteId: string; completedAt: Date; xpGagne: number }[] }> {
  let xp = 0;
  const quetesCompletees: { queteId: string; completedAt: Date; xpGagne: number }[] = [];
  const now = new Date();

  // Compter les projets suivis par cet utilisateur
  const projetsSuivis = await Projet.countDocuments({ followers: userId });
  xp += projetsSuivis * XP_PAR_ACTION.follow_projet;

  // Quete premier_follow
  if (projetsSuivis >= 1) {
    quetesCompletees.push({ queteId: 'premier_follow', completedAt: now, xpGagne: 20 });
    xp += 20;
  }
  // Quete suivre_5_projets
  if (projetsSuivis >= 5) {
    quetesCompletees.push({ queteId: 'suivre_5_projets', completedAt: now, xpGagne: 50 });
    xp += 50;
  }

  // Compter les likes donnes
  const likesCount = await Publication.countDocuments({ likes: userId });
  xp += likesCount * XP_PAR_ACTION.like_publication;
  if (likesCount >= 1) {
    quetesCompletees.push({ queteId: 'premier_like', completedAt: now, xpGagne: 10 });
    xp += 10;
  }

  // Compter les commentaires
  const commentairesCount = await Commentaire.countDocuments({ auteur: userId });
  xp += commentairesCount * XP_PAR_ACTION.comment_publication;
  if (commentairesCount >= 1) {
    quetesCompletees.push({ queteId: 'premier_commentaire', completedAt: now, xpGagne: 20 });
    xp += 20;
  }

  // Compter les publications creees
  const pubsCreees = await Publication.countDocuments({ auteur: userId });
  xp += pubsCreees * XP_PAR_ACTION.create_publication;
  if (pubsCreees >= 1 && statut === 'entrepreneur') {
    quetesCompletees.push({ queteId: 'premiere_publication', completedAt: now, xpGagne: 30 });
    xp += 30;
  }

  // Compter les amis
  const user = await Utilisateur.findById(userId).select('amis avatar bio').lean();
  const nbAmis = user?.amis?.length || 0;
  xp += nbAmis * XP_PAR_ACTION.add_friend;
  if (nbAmis >= 1) {
    quetesCompletees.push({ queteId: 'premier_ami', completedAt: now, xpGagne: 15 });
    xp += 15;
  }

  // Profil complet (avatar + bio)
  if (user?.avatar && user?.bio) {
    quetesCompletees.push({ queteId: 'profil_complet', completedAt: now, xpGagne: 30 });
    xp += 30;
  }

  // Compter les projets crees (entrepreneur)
  if (statut === 'entrepreneur') {
    const projetsCreees = await Projet.countDocuments({ porteur: userId });
    xp += projetsCreees * XP_PAR_ACTION.create_projet;
    if (projetsCreees >= 1) {
      quetesCompletees.push({ queteId: 'premier_projet', completedAt: now, xpGagne: 50 });
      xp += 50;
    }
  }

  // Conversations existantes (premier message)
  const conversationsCount = await Conversation.countDocuments({
    participants: userId,
  });
  if (conversationsCount >= 1) {
    xp += XP_PAR_ACTION.first_message;
    if (statut === 'entrepreneur') {
      quetesCompletees.push({ queteId: 'premier_message', completedAt: now, xpGagne: 15 });
      xp += 15;
    }
  }

  return { xp, quetesCompletees };
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
    const niveaux = getNiveaux(statut);

    // Trouver ou creer le parcours
    let parcours = await ParcoursUtilisateur.findOne({ utilisateur: userId });

    if (!parcours) {
      // Premiere creation → scanner l'historique pour XP initial
      const { xp: xpInitial, quetesCompletees } = await calculerXpInitial(userId, statut);
      const niveauInitial = calculerNiveau(xpInitial, niveaux);

      parcours = await ParcoursUtilisateur.create({
        utilisateur: userId,
        xp: xpInitial,
        niveau: niveauInitial,
        quetesCompletees,
        defis: [],
        streak: 1,
        lastActivityDate: new Date(),
        initialise: true,
      });

      if (xpInitial > 0) {
        const info = getNiveauInfo(xpInitial, niveaux);
        await creerNotifGamification(
          userId,
          'Bienvenue dans le Parcours du Batisseur !',
          `Ton historique te donne ${xpInitial} XP - tu es deja niveau ${info.niveauNom} !`
        );
      }
    } else if (!parcours.initialise) {
      // Parcours cree avant le fix → recalculer une seule fois puis marquer initialise
      const { xp: xpInitial, quetesCompletees } = await calculerXpInitial(userId, statut);
      const niveauInitial = calculerNiveau(xpInitial, niveaux);

      parcours.xp = xpInitial;
      parcours.niveau = niveauInitial;
      parcours.quetesCompletees = quetesCompletees;
      parcours.lastActivityDate = new Date();
      parcours.initialise = true;
      await parcours.save();

      if (xpInitial > 0) {
        const info = getNiveauInfo(xpInitial, niveaux);
        await creerNotifGamification(
          userId,
          'Bienvenue dans le Parcours du Batisseur !',
          `Ton historique te donne ${xpInitial} XP - tu es deja niveau ${info.niveauNom} !`
        );
      }
    }

    // A ce stade, parcours est garanti non-null (cree ou mis a jour ci-dessus)
    const p = parcours!;
    const niveauInfo = getNiveauInfo(p.xp, niveaux);

    // Defi actif
    const defiActif = await getOuCreerDefiActif();
    let defiProgression = null;

    if (defiActif) {
      const progressionExistante = p.defis.find(
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
    const quetesCompleteesIds = new Set(p.quetesCompletees.map(q => q.queteId));
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
          xp: p.xp,
          ...niveauInfo,
          streak: p.streak,
          quetesCompletees: p.quetesCompletees.map(q => q.queteId),
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

    const utilisateur = await Utilisateur.findById(userId).select('statut prenom').lean();
    const statut = utilisateur?.statut || 'visiteur';
    const niveaux = getNiveaux(statut);

    // Trouver ou creer le parcours
    let parcours = await ParcoursUtilisateur.findOne({ utilisateur: userId });
    if (!parcours) {
      const { xp: xpInitial, quetesCompletees } = await calculerXpInitial(userId, statut);
      parcours = await ParcoursUtilisateur.create({
        utilisateur: userId,
        xp: xpInitial,
        niveau: calculerNiveau(xpInitial, niveaux),
        quetesCompletees,
        defis: [],
        streak: 1,
        lastActivityDate: new Date(),
        initialise: true,
      });
    } else if (!parcours.initialise) {
      const { xp: xpInitial, quetesCompletees } = await calculerXpInitial(userId, statut);
      parcours.xp = xpInitial;
      parcours.niveau = calculerNiveau(xpInitial, niveaux);
      parcours.quetesCompletees = quetesCompletees;
      parcours.lastActivityDate = new Date();
      parcours.initialise = true;
      await parcours.save();
    }

    const ancienNiveau = parcours.niveau;
    let xpGagne = XP_PAR_ACTION[action];
    let queteCompletee: string | null = null;
    let queteCompleteeInfo: QueteConfig | null = null;

    // Verifier les quetes
    const quetesCompleteesIds = new Set(parcours.quetesCompletees.map(q => q.queteId));
    const quetesEligibles = QUETES.filter(
      q => (q.type === 'tous' || q.type === statut) &&
           q.action === action &&
           !quetesCompleteesIds.has(q.id)
    );

    for (const quete of quetesEligibles) {
      // Compter combien de fois cette action a ete faite
      const countPrecedent = parcours.quetesCompletees.filter(
        qc => QUETES.find(q => q.id === qc.queteId)?.action === action
      ).length;
      const countTotal = countPrecedent + 1;

      if (quete.countRequis <= 1 || countTotal >= quete.countRequis) {
        parcours.quetesCompletees.push({
          queteId: quete.id,
          completedAt: new Date(),
          xpGagne: quete.xp,
        });
        xpGagne += quete.xp;
        queteCompletee = quete.id;
        queteCompleteeInfo = quete;
        break;
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
        parcours.streak = 1;
      }
      parcours.lastActivityDate = new Date();
    }

    // Progression du defi actif
    let defiProgression = null;
    let defiComplete = false;
    const defiActif = await getOuCreerDefiActif();

    if (defiActif) {
      const defiType = ACTION_TO_DEFI_TYPE[action];

      if (defiType && defiType === defiActif.type) {
        let progDefi = parcours.defis.find(
          d => d.defiId.toString() === defiActif._id.toString()
        );

        if (!progDefi) {
          parcours.defis.push({
            defiId: defiActif._id,
            progression: 0,
            objectif: defiActif.objectif,
            complete: false,
          });
          progDefi = parcours.defis[parcours.defis.length - 1];

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
            defiComplete = true;
            parcours.xp += defiActif.xpRecompense;
            xpGagne += defiActif.xpRecompense;
            parcours.niveau = calculerNiveau(parcours.xp, niveaux);

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

    // === NOTIFICATIONS (fire & forget) ===
    // Quete completee
    if (queteCompleteeInfo) {
      creerNotifGamification(
        userId,
        `Quete completee : ${queteCompleteeInfo.titre}`,
        `Bravo ! Tu as gagne +${queteCompleteeInfo.xp} XP bonus. ${queteCompleteeInfo.description}`
      );
    }

    // Level up
    if (levelUp) {
      creerNotifGamification(
        userId,
        `Niveau superieur : ${niveauInfo.niveauNom} !`,
        `Felicitations ! Tu es passe au niveau ${nouveauNiveau} (${niveauInfo.niveauNom}). Continue comme ca !`
      );
    }

    // Defi complete
    if (defiComplete && defiActif) {
      creerNotifGamification(
        userId,
        `Defi complete : ${defiActif.titre}`,
        `Tu as termine le defi de la semaine et gagne +${defiActif.xpRecompense} XP bonus !`
      );
    }

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

/**
 * GET /api/parcours/utilisateur/:id
 * Retourne le parcours public d'un utilisateur (pour afficher sur le profil)
 * Accessible par tout utilisateur connecte
 */
export const getParcoursPublic = async (req: Request, res: Response): Promise<void> => {
  try {
    const targetUserId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      res.status(400).json({ succes: false, message: 'ID invalide.' });
      return;
    }

    const utilisateur = await Utilisateur.findById(targetUserId)
      .select('statut prenom nom profilPublic amis')
      .lean();

    if (!utilisateur) {
      res.status(404).json({ succes: false, message: 'Utilisateur non trouve.' });
      return;
    }

    // Verifier la visibilite : profil public OU ami du demandeur
    const requesterId = req.utilisateur!._id.toString();
    const isOwner = requesterId === targetUserId;
    const isFriend = utilisateur.amis?.some(
      (id: mongoose.Types.ObjectId) => id.toString() === requesterId
    );

    if (!isOwner && !utilisateur.profilPublic && !isFriend) {
      res.status(403).json({ succes: false, message: 'Profil prive.' });
      return;
    }

    const parcours = await ParcoursUtilisateur.findOne({
      utilisateur: targetUserId,
    }).lean();

    if (!parcours) {
      // Pas encore de parcours → retourner niveau 1 par defaut
      const statut = utilisateur.statut || 'visiteur';
      const niveaux = getNiveaux(statut);
      const info = getNiveauInfo(0, niveaux);
      res.json({
        succes: true,
        data: {
          xp: 0,
          ...info,
          streak: 0,
        },
      });
      return;
    }

    const statut = utilisateur.statut || 'visiteur';
    const niveaux = getNiveaux(statut);
    const niveauInfo = getNiveauInfo(parcours.xp, niveaux);

    res.json({
      succes: true,
      data: {
        xp: parcours.xp,
        ...niveauInfo,
        streak: parcours.streak,
      },
    });
  } catch (error) {
    console.error('Erreur getParcoursPublic:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};