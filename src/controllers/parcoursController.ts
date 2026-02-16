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
import Story from '../models/Story.js';

// === CONFIGURATION XP PAR ACTION ===

const XP_PAR_ACTION: Record<string, number> = {
  follow_projet: 10,
  like_publication: 5,
  comment_publication: 15,
  create_publication: 20,
  visit_projet: 5,
  create_projet: 50,
  complete_profil: 30,
  complete_avatar: 15,
  first_message: 15,
  add_friend: 10,
  create_story: 15,
  view_story: 3,
};

// Mapping action → type de defi
const ACTION_TO_DEFI_TYPE: Record<string, string> = {
  follow_projet: 'follow',
  like_publication: 'like',
  comment_publication: 'comment',
  create_publication: 'publish',
  visit_projet: 'visit_projet',
  create_story: 'create_story',
  add_friend: 'add_friend',
};

// === CONFIGURATION QUETES PAR CHAPITRES ===

interface QueteConfig {
  id: string;
  titre: string;
  description: string;
  xp: number;
  icone: string;
  type: 'visiteur' | 'entrepreneur' | 'tous';
  action: string;
  countRequis: number;
  niveauRequis: number;
  chapitre: string;
}

const QUETES: QueteConfig[] = [
  // ========================================
  // CHAPITRE 1 : DECOUVERTE (Niveau 1)
  // Apprendre les bases de l'application
  // ========================================
  {
    id: 'premier_like',
    titre: 'Premiere reaction',
    description: 'Like une publication pour encourager un createur',
    xp: 10,
    icone: 'heart-outline',
    type: 'tous',
    action: 'like_publication',
    countRequis: 1,
    niveauRequis: 1,
    chapitre: 'Decouverte',
  },
  {
    id: 'premier_follow',
    titre: 'Premier soutien',
    description: 'Suis ton premier projet',
    xp: 20,
    icone: 'heart-outline',
    type: 'tous',
    action: 'follow_projet',
    countRequis: 1,
    niveauRequis: 1,
    chapitre: 'Decouverte',
  },
  {
    id: 'decouvrir_3_projets',
    titre: 'Explorateur curieux',
    description: 'Visite 3 projets differents',
    xp: 30,
    icone: 'compass-outline',
    type: 'tous',
    action: 'visit_projet',
    countRequis: 3,
    niveauRequis: 1,
    chapitre: 'Decouverte',
  },
  {
    id: 'profil_avatar',
    titre: 'Ton visage',
    description: 'Ajoute un avatar a ton profil',
    xp: 15,
    icone: 'camera-outline',
    type: 'tous',
    action: 'complete_avatar',
    countRequis: 1,
    niveauRequis: 1,
    chapitre: 'Decouverte',
  },
  {
    id: 'premiere_story_vue',
    titre: 'Spectateur',
    description: 'Regarde une story',
    xp: 10,
    icone: 'play-circle-outline',
    type: 'tous',
    action: 'view_story',
    countRequis: 1,
    niveauRequis: 1,
    chapitre: 'Decouverte',
  },
  {
    id: 'premier_projet',
    titre: 'Premiere pierre',
    description: 'Cree ton premier projet',
    xp: 50,
    icone: 'rocket-outline',
    type: 'entrepreneur',
    action: 'create_projet',
    countRequis: 1,
    niveauRequis: 1,
    chapitre: 'Decouverte',
  },

  // ========================================
  // CHAPITRE 2 : ENGAGEMENT (Niveau 2)
  // Participer activement a la communaute
  // ========================================
  {
    id: 'premier_commentaire',
    titre: 'Ta voix compte',
    description: 'Commente une publication',
    xp: 20,
    icone: 'chatbubble-outline',
    type: 'tous',
    action: 'comment_publication',
    countRequis: 1,
    niveauRequis: 2,
    chapitre: 'Engagement',
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
    niveauRequis: 2,
    chapitre: 'Engagement',
  },
  {
    id: 'suivre_5_projets',
    titre: 'Fan inconditionnel',
    description: 'Suis 5 projets',
    xp: 40,
    icone: 'star-outline',
    type: 'tous',
    action: 'follow_projet',
    countRequis: 5,
    niveauRequis: 2,
    chapitre: 'Engagement',
  },
  {
    id: 'liker_10_publications',
    titre: 'Genereux en likes',
    description: 'Like 10 publications',
    xp: 25,
    icone: 'thumbs-up-outline',
    type: 'tous',
    action: 'like_publication',
    countRequis: 10,
    niveauRequis: 2,
    chapitre: 'Engagement',
  },
  {
    id: 'premiere_story',
    titre: 'Premiere scene',
    description: 'Cree ta premiere story',
    xp: 25,
    icone: 'videocam-outline',
    type: 'tous',
    action: 'create_story',
    countRequis: 1,
    niveauRequis: 2,
    chapitre: 'Engagement',
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
    niveauRequis: 2,
    chapitre: 'Engagement',
  },

  // ========================================
  // CHAPITRE 3 : CONNEXION (Niveau 3)
  // Tisser des liens avec la communaute
  // ========================================
  {
    id: 'premier_ami',
    titre: 'Premiere connexion',
    description: 'Ajoute un ami',
    xp: 20,
    icone: 'people-outline',
    type: 'tous',
    action: 'add_friend',
    countRequis: 1,
    niveauRequis: 3,
    chapitre: 'Connexion',
  },
  {
    id: 'premier_message',
    titre: 'Contact direct',
    description: 'Envoie ton premier message',
    xp: 20,
    icone: 'mail-outline',
    type: 'tous',
    action: 'first_message',
    countRequis: 1,
    niveauRequis: 3,
    chapitre: 'Connexion',
  },
  {
    id: 'commenter_3_publications',
    titre: 'Debatteur',
    description: 'Commente 3 publications differentes',
    xp: 30,
    icone: 'chatbubbles-outline',
    type: 'tous',
    action: 'comment_publication',
    countRequis: 3,
    niveauRequis: 3,
    chapitre: 'Connexion',
  },
  {
    id: 'ajouter_3_amis',
    titre: 'Cercle interieur',
    description: 'Ajoute 3 amis',
    xp: 30,
    icone: 'people-circle-outline',
    type: 'tous',
    action: 'add_friend',
    countRequis: 3,
    niveauRequis: 3,
    chapitre: 'Connexion',
  },
  {
    id: 'publier_3_fois',
    titre: 'Voix reguliere',
    description: 'Publie 3 posts',
    xp: 40,
    icone: 'newspaper-outline',
    type: 'entrepreneur',
    action: 'create_publication',
    countRequis: 3,
    niveauRequis: 3,
    chapitre: 'Connexion',
  },

  // ========================================
  // CHAPITRE 4 : CONTRIBUTION (Niveau 4)
  // Laisser sa marque dans la communaute
  // ========================================
  {
    id: 'suivre_10_projets',
    titre: 'Investisseur passionne',
    description: 'Suis 10 projets',
    xp: 50,
    icone: 'trending-up-outline',
    type: 'tous',
    action: 'follow_projet',
    countRequis: 10,
    niveauRequis: 4,
    chapitre: 'Contribution',
  },
  {
    id: 'creer_5_stories',
    titre: 'Conteur',
    description: 'Cree 5 stories',
    xp: 40,
    icone: 'film-outline',
    type: 'tous',
    action: 'create_story',
    countRequis: 5,
    niveauRequis: 4,
    chapitre: 'Contribution',
  },
  {
    id: 'ajouter_5_amis',
    titre: 'Reseau solide',
    description: 'Ajoute 5 amis',
    xp: 40,
    icone: 'globe-outline',
    type: 'tous',
    action: 'add_friend',
    countRequis: 5,
    niveauRequis: 4,
    chapitre: 'Contribution',
  },
  {
    id: 'publier_10_fois',
    titre: 'Influenceur',
    description: 'Publie 10 posts',
    xp: 60,
    icone: 'megaphone-outline',
    type: 'entrepreneur',
    action: 'create_publication',
    countRequis: 10,
    niveauRequis: 4,
    chapitre: 'Contribution',
  },
  {
    id: 'deuxieme_projet',
    titre: 'Serial entrepreneur',
    description: 'Cree un deuxieme projet',
    xp: 60,
    icone: 'business-outline',
    type: 'entrepreneur',
    action: 'create_projet',
    countRequis: 2,
    niveauRequis: 4,
    chapitre: 'Contribution',
  },

  // ========================================
  // CHAPITRE 5 : MAITRISE (Niveau 5)
  // Inspirer et guider les autres
  // ========================================
  {
    id: 'commenter_10_publications',
    titre: 'Mentor',
    description: 'Commente 10 publications',
    xp: 50,
    icone: 'school-outline',
    type: 'tous',
    action: 'comment_publication',
    countRequis: 10,
    niveauRequis: 5,
    chapitre: 'Maitrise',
  },
  {
    id: 'liker_50_publications',
    titre: 'Coeur de la communaute',
    description: 'Like 50 publications',
    xp: 50,
    icone: 'heart-circle-outline',
    type: 'tous',
    action: 'like_publication',
    countRequis: 50,
    niveauRequis: 5,
    chapitre: 'Maitrise',
  },
  {
    id: 'ajouter_10_amis',
    titre: 'Leader social',
    description: 'Ajoute 10 amis',
    xp: 50,
    icone: 'shield-checkmark-outline',
    type: 'tous',
    action: 'add_friend',
    countRequis: 10,
    niveauRequis: 5,
    chapitre: 'Maitrise',
  },
  {
    id: 'creer_10_stories',
    titre: 'Realisateur',
    description: 'Cree 10 stories',
    xp: 50,
    icone: 'film-outline',
    type: 'tous',
    action: 'create_story',
    countRequis: 10,
    niveauRequis: 5,
    chapitre: 'Maitrise',
  },
  {
    id: 'publier_25_fois',
    titre: 'Legende vivante',
    description: 'Publie 25 posts',
    xp: 80,
    icone: 'diamond-outline',
    type: 'entrepreneur',
    action: 'create_publication',
    countRequis: 25,
    niveauRequis: 5,
    chapitre: 'Maitrise',
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

// === DEFIS ADAPTATIFS PAR NIVEAU ===

interface DefiTemplate {
  titre: string;
  description: string;
  type: string;
  objectif: number;
  xpRecompense: number;
  icone: string;
  couleur: string;
  niveauMin: number;
  niveauMax: number;
}

const DEFIS_PAR_NIVEAU: DefiTemplate[] = [
  // Niveau 1-2 : Decouverte
  {
    titre: 'Decouvre la communaute',
    description: 'Suis 3 projets cette semaine',
    type: 'follow',
    objectif: 3,
    xpRecompense: 40,
    icone: 'people-outline',
    couleur: '#7C5CFF',
    niveauMin: 1,
    niveauMax: 2,
  },
  {
    titre: 'Reagis au contenu',
    description: 'Like 5 publications cette semaine',
    type: 'like',
    objectif: 5,
    xpRecompense: 30,
    icone: 'heart-outline',
    couleur: '#FF4D6D',
    niveauMin: 1,
    niveauMax: 2,
  },
  {
    titre: 'Premiere exploration',
    description: 'Visite 5 projets differents',
    type: 'visit_projet',
    objectif: 5,
    xpRecompense: 35,
    icone: 'compass-outline',
    couleur: '#10B981',
    niveauMin: 1,
    niveauMax: 2,
  },
  // Niveau 2-3 : Engagement
  {
    titre: 'Partage ton avis',
    description: 'Commente 3 publications cette semaine',
    type: 'comment',
    objectif: 3,
    xpRecompense: 50,
    icone: 'chatbubbles-outline',
    couleur: '#2DE2E6',
    niveauMin: 2,
    niveauMax: 3,
  },
  {
    titre: 'Createur de stories',
    description: 'Cree 2 stories cette semaine',
    type: 'create_story',
    objectif: 2,
    xpRecompense: 45,
    icone: 'videocam-outline',
    couleur: '#F59E0B',
    niveauMin: 2,
    niveauMax: 3,
  },
  // Niveau 3-4 : Connexion
  {
    titre: 'Connecte-toi',
    description: 'Ajoute 2 amis cette semaine',
    type: 'add_friend',
    objectif: 2,
    xpRecompense: 50,
    icone: 'people-circle-outline',
    couleur: '#8B5CF6',
    niveauMin: 3,
    niveauMax: 4,
  },
  {
    titre: 'Soutien massif',
    description: 'Suis 5 projets cette semaine',
    type: 'follow',
    objectif: 5,
    xpRecompense: 60,
    icone: 'star-outline',
    couleur: '#FFBD59',
    niveauMin: 3,
    niveauMax: 4,
  },
  {
    titre: 'Prends la parole',
    description: 'Commente 5 publications',
    type: 'comment',
    objectif: 5,
    xpRecompense: 65,
    icone: 'megaphone-outline',
    couleur: '#EC4899',
    niveauMin: 3,
    niveauMax: 4,
  },
  // Niveau 4-5 : Contribution
  {
    titre: 'Ambassadeur',
    description: 'Like 15 publications cette semaine',
    type: 'like',
    objectif: 15,
    xpRecompense: 70,
    icone: 'ribbon-outline',
    couleur: '#F97316',
    niveauMin: 4,
    niveauMax: 5,
  },
  {
    titre: 'Conteur passionne',
    description: 'Cree 3 stories cette semaine',
    type: 'create_story',
    objectif: 3,
    xpRecompense: 65,
    icone: 'film-outline',
    couleur: '#06B6D4',
    niveauMin: 4,
    niveauMax: 5,
  },
  // Niveau 5 : Maitrise
  {
    titre: 'Pilier communautaire',
    description: 'Commente 10 publications cette semaine',
    type: 'comment',
    objectif: 10,
    xpRecompense: 80,
    icone: 'trophy-outline',
    couleur: '#EAB308',
    niveauMin: 5,
    niveauMax: 5,
  },
  {
    titre: 'Legende sociale',
    description: 'Suis 5 projets cette semaine',
    type: 'follow',
    objectif: 5,
    xpRecompense: 80,
    icone: 'diamond-outline',
    couleur: '#A855F7',
    niveauMin: 5,
    niveauMax: 5,
  },
];

async function getOuCreerDefiActif(niveauUtilisateur: number = 1): Promise<typeof DefiSemaine.prototype | null> {
  const now = new Date();

  // Chercher un defi actif
  let defi = await DefiSemaine.findOne({
    actif: true,
    dateFin: { $gte: now },
    dateDebut: { $lte: now },
  }).lean();

  if (defi) return defi;

  // Pas de defi actif → en creer un adapte au niveau
  let defisNiveau = DEFIS_PAR_NIVEAU.filter(
    d => niveauUtilisateur >= d.niveauMin && niveauUtilisateur <= d.niveauMax
  );

  // Fallback si aucun defi pour ce niveau
  if (defisNiveau.length === 0) {
    const maxMin = Math.max(...DEFIS_PAR_NIVEAU.map(d => d.niveauMin));
    defisNiveau = DEFIS_PAR_NIVEAU.filter(d => d.niveauMin === maxMin);
  }

  const totalDefis = await DefiSemaine.countDocuments();
  const template = defisNiveau[totalDefis % defisNiveau.length];

  const nouveauDefi = await DefiSemaine.create({
    titre: template.titre,
    description: template.description,
    type: template.type,
    objectif: template.objectif,
    xpRecompense: template.xpRecompense,
    icone: template.icone,
    couleur: template.couleur,
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
 * Compter le nombre reel d'occurrences d'une action pour un utilisateur.
 * Utilise pour les quetes multi-count (countRequis > 1).
 */
async function compterActionsReelles(
  userId: mongoose.Types.ObjectId,
  action: string
): Promise<number> {
  switch (action) {
    case 'follow_projet':
      return Projet.countDocuments({ followers: userId });
    case 'like_publication':
      return Publication.countDocuments({ likes: userId });
    case 'comment_publication':
      return Commentaire.countDocuments({ auteur: userId });
    case 'create_publication':
      return Publication.countDocuments({ auteur: userId });
    case 'create_projet':
      return Projet.countDocuments({ porteur: userId });
    case 'add_friend': {
      const user = await Utilisateur.findById(userId).select('amis').lean();
      return user?.amis?.length || 0;
    }
    case 'create_story':
      return Story.countDocuments({ auteur: userId });
    default:
      // Pour visit_projet, view_story, etc. : pas de tracking direct, on retourne 1
      return 1;
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

  // Compter les projets suivis
  const projetsSuivis = await Projet.countDocuments({ followers: userId });
  xp += projetsSuivis * XP_PAR_ACTION.follow_projet;

  if (projetsSuivis >= 1) {
    quetesCompletees.push({ queteId: 'premier_follow', completedAt: now, xpGagne: 20 });
    xp += 20;
  }
  if (projetsSuivis >= 5) {
    quetesCompletees.push({ queteId: 'suivre_5_projets', completedAt: now, xpGagne: 40 });
    xp += 40;
  }
  if (projetsSuivis >= 10) {
    quetesCompletees.push({ queteId: 'suivre_10_projets', completedAt: now, xpGagne: 50 });
    xp += 50;
  }

  // Compter les likes donnes
  const likesCount = await Publication.countDocuments({ likes: userId });
  xp += likesCount * XP_PAR_ACTION.like_publication;
  if (likesCount >= 1) {
    quetesCompletees.push({ queteId: 'premier_like', completedAt: now, xpGagne: 10 });
    xp += 10;
  }
  if (likesCount >= 10) {
    quetesCompletees.push({ queteId: 'liker_10_publications', completedAt: now, xpGagne: 25 });
    xp += 25;
  }
  if (likesCount >= 50) {
    quetesCompletees.push({ queteId: 'liker_50_publications', completedAt: now, xpGagne: 50 });
    xp += 50;
  }

  // Compter les commentaires
  const commentairesCount = await Commentaire.countDocuments({ auteur: userId });
  xp += commentairesCount * XP_PAR_ACTION.comment_publication;
  if (commentairesCount >= 1) {
    quetesCompletees.push({ queteId: 'premier_commentaire', completedAt: now, xpGagne: 20 });
    xp += 20;
  }
  if (commentairesCount >= 3) {
    quetesCompletees.push({ queteId: 'commenter_3_publications', completedAt: now, xpGagne: 30 });
    xp += 30;
  }
  if (commentairesCount >= 10) {
    quetesCompletees.push({ queteId: 'commenter_10_publications', completedAt: now, xpGagne: 50 });
    xp += 50;
  }

  // Compter les publications creees
  const pubsCreees = await Publication.countDocuments({ auteur: userId });
  xp += pubsCreees * XP_PAR_ACTION.create_publication;
  if (pubsCreees >= 1 && statut === 'entrepreneur') {
    quetesCompletees.push({ queteId: 'premiere_publication', completedAt: now, xpGagne: 30 });
    xp += 30;
  }
  if (pubsCreees >= 3 && statut === 'entrepreneur') {
    quetesCompletees.push({ queteId: 'publier_3_fois', completedAt: now, xpGagne: 40 });
    xp += 40;
  }
  if (pubsCreees >= 10 && statut === 'entrepreneur') {
    quetesCompletees.push({ queteId: 'publier_10_fois', completedAt: now, xpGagne: 60 });
    xp += 60;
  }
  if (pubsCreees >= 25 && statut === 'entrepreneur') {
    quetesCompletees.push({ queteId: 'publier_25_fois', completedAt: now, xpGagne: 80 });
    xp += 80;
  }

  // Compter les amis
  const user = await Utilisateur.findById(userId).select('amis avatar bio').lean();
  const nbAmis = user?.amis?.length || 0;
  xp += nbAmis * XP_PAR_ACTION.add_friend;
  if (nbAmis >= 1) {
    quetesCompletees.push({ queteId: 'premier_ami', completedAt: now, xpGagne: 20 });
    xp += 20;
  }
  if (nbAmis >= 3) {
    quetesCompletees.push({ queteId: 'ajouter_3_amis', completedAt: now, xpGagne: 30 });
    xp += 30;
  }
  if (nbAmis >= 5) {
    quetesCompletees.push({ queteId: 'ajouter_5_amis', completedAt: now, xpGagne: 40 });
    xp += 40;
  }
  if (nbAmis >= 10) {
    quetesCompletees.push({ queteId: 'ajouter_10_amis', completedAt: now, xpGagne: 50 });
    xp += 50;
  }

  // Avatar
  if (user?.avatar) {
    quetesCompletees.push({ queteId: 'profil_avatar', completedAt: now, xpGagne: 15 });
    xp += 15 + XP_PAR_ACTION.complete_avatar;
  }

  // Profil complet (avatar + bio)
  if (user?.avatar && user?.bio) {
    quetesCompletees.push({ queteId: 'profil_complet', completedAt: now, xpGagne: 30 });
    xp += 30 + XP_PAR_ACTION.complete_profil;
  }

  // Projets crees (entrepreneur)
  if (statut === 'entrepreneur') {
    const projetsCreees = await Projet.countDocuments({ porteur: userId });
    xp += projetsCreees * XP_PAR_ACTION.create_projet;
    if (projetsCreees >= 1) {
      quetesCompletees.push({ queteId: 'premier_projet', completedAt: now, xpGagne: 50 });
      xp += 50;
    }
    if (projetsCreees >= 2) {
      quetesCompletees.push({ queteId: 'deuxieme_projet', completedAt: now, xpGagne: 60 });
      xp += 60;
    }
  }

  // Stories creees
  const storiesCreees = await Story.countDocuments({ auteur: userId });
  xp += storiesCreees * XP_PAR_ACTION.create_story;
  if (storiesCreees >= 1) {
    quetesCompletees.push({ queteId: 'premiere_story', completedAt: now, xpGagne: 25 });
    xp += 25;
  }
  if (storiesCreees >= 5) {
    quetesCompletees.push({ queteId: 'creer_5_stories', completedAt: now, xpGagne: 40 });
    xp += 40;
  }
  if (storiesCreees >= 10) {
    quetesCompletees.push({ queteId: 'creer_10_stories', completedAt: now, xpGagne: 50 });
    xp += 50;
  }

  // Conversations existantes (premier message)
  const conversationsCount = await Conversation.countDocuments({
    participants: userId,
  });
  if (conversationsCount >= 1) {
    xp += XP_PAR_ACTION.first_message;
    quetesCompletees.push({ queteId: 'premier_message', completedAt: now, xpGagne: 20 });
    xp += 20;
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

      // Cache niveau sur l'utilisateur
      const infoInit = getNiveauInfo(xpInitial, niveaux);
      Utilisateur.updateOne(
        { _id: userId },
        { niveauNom: infoInit.niveauNom, niveauIcone: infoInit.niveauIcone }
      ).catch(() => {});

      if (xpInitial > 0) {
        await creerNotifGamification(
          userId,
          'Bienvenue dans le Parcours du Batisseur !',
          `Ton historique te donne ${xpInitial} XP - tu es deja niveau ${infoInit.niveauNom} !`
        );
      }
    } else if (!parcours.initialise) {
      const { xp: xpInitial, quetesCompletees } = await calculerXpInitial(userId, statut);
      const niveauInitial = calculerNiveau(xpInitial, niveaux);

      parcours.xp = xpInitial;
      parcours.niveau = niveauInitial;
      parcours.quetesCompletees = quetesCompletees;
      parcours.lastActivityDate = new Date();
      parcours.initialise = true;
      await parcours.save();

      // Cache niveau sur l'utilisateur
      const infoInit2 = getNiveauInfo(xpInitial, niveaux);
      Utilisateur.updateOne(
        { _id: userId },
        { niveauNom: infoInit2.niveauNom, niveauIcone: infoInit2.niveauIcone }
      ).catch(() => {});

      if (xpInitial > 0) {
        await creerNotifGamification(
          userId,
          'Bienvenue dans le Parcours du Batisseur !',
          `Ton historique te donne ${xpInitial} XP - tu es deja niveau ${infoInit2.niveauNom} !`
        );
      }
    }

    const p = parcours!;
    const niveauInfo = getNiveauInfo(p.xp, niveaux);

    // Defi actif (adapte au niveau)
    const defiActif = await getOuCreerDefiActif(p.niveau);
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

    // Quetes disponibles (filtrees par statut ET par niveau)
    const quetesCompleteesIds = new Set(p.quetesCompletees.map(q => q.queteId));
    const quetesDisponibles = QUETES
      .filter(q => q.type === 'tous' || q.type === statut)
      .filter(q => !quetesCompleteesIds.has(q.id))
      .filter(q => q.niveauRequis <= p.niveau)
      .map(q => ({
        id: q.id,
        titre: q.titre,
        description: q.description,
        xp: q.xp,
        icone: q.icone,
        type: q.type,
        chapitre: q.chapitre,
        niveauRequis: q.niveauRequis,
      }));

    // Streak en danger : activite hier mais pas encore aujourd'hui, streak >= 3
    const streakEnDanger = p.streak >= 3 &&
      isYesterday(p.lastActivityDate) &&
      !isToday(p.lastActivityDate);

    // Multiplicateur streak actuel
    let streakMultiplier = 1;
    if (p.streak >= 30) streakMultiplier = 2;
    else if (p.streak >= 7) streakMultiplier = 1.5;

    res.json({
      succes: true,
      data: {
        parcours: {
          xp: p.xp,
          ...niveauInfo,
          streak: p.streak,
          streakEnDanger,
          streakMultiplier: streakMultiplier > 1 ? streakMultiplier : undefined,
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
    let xpBase = XP_PAR_ACTION[action];

    // Multiplicateur streak : x1.5 a 7j, x2 a 30j
    let streakMultiplier = 1;
    if (parcours.streak >= 30) {
      streakMultiplier = 2;
    } else if (parcours.streak >= 7) {
      streakMultiplier = 1.5;
    }
    let xpGagne = Math.round(xpBase * streakMultiplier);

    let queteCompletee: string | null = null;
    let queteCompleteeInfo: QueteConfig | null = null;

    // Verifier les quetes (filtrees par niveau)
    const quetesCompleteesIds = new Set(parcours.quetesCompletees.map(q => q.queteId));
    const quetesEligibles = QUETES.filter(
      q => (q.type === 'tous' || q.type === statut) &&
           q.action === action &&
           !quetesCompleteesIds.has(q.id) &&
           q.niveauRequis <= parcours!.niveau
    );

    for (const quete of quetesEligibles) {
      if (quete.countRequis <= 1) {
        // Quete simple : complete immediatement
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

      // Quete multi-count : compter via la vraie source de donnees
      const actualCount = await compterActionsReelles(userId, action);
      if (actualCount >= quete.countRequis) {
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

    // Progression du defi actif (adapte au niveau)
    let defiProgression = null;
    let defiComplete = false;
    const defiActif = await getOuCreerDefiActif(parcours.niveau);

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

    // Mettre a jour le cache niveau sur l'utilisateur (fire & forget)
    if (levelUp) {
      Utilisateur.updateOne(
        { _id: userId },
        { niveauNom: niveauInfo.niveauNom, niveauIcone: niveauInfo.niveauIcone }
      ).catch(() => {});
    }

    // === NOTIFICATIONS (fire & forget) ===
    if (queteCompleteeInfo) {
      creerNotifGamification(
        userId,
        `Quete completee : ${queteCompleteeInfo.titre}`,
        `Bravo ! Tu as gagne +${queteCompleteeInfo.xp} XP bonus. ${queteCompleteeInfo.description}`
      );
    }

    if (levelUp) {
      creerNotifGamification(
        userId,
        `Niveau superieur : ${niveauInfo.niveauNom} !`,
        `Felicitations ! Tu es passe au niveau ${nouveauNiveau} (${niveauInfo.niveauNom}). De nouvelles quetes sont disponibles !`
      );
    }

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
        streakMultiplier: streakMultiplier > 1 ? streakMultiplier : undefined,
      },
    });
  } catch (error) {
    console.error('Erreur enregistrerAction:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * GET /api/parcours/quetes
 * Liste complete des quetes avec statut (filtrees par niveau)
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
    const niveauActuel = parcours?.niveau || 1;

    const quetes = QUETES
      .filter(q => q.type === 'tous' || q.type === statut)
      .filter(q => q.niveauRequis <= niveauActuel)
      .map(q => ({
        id: q.id,
        titre: q.titre,
        description: q.description,
        xp: q.xp,
        icone: q.icone,
        type: q.type,
        chapitre: q.chapitre,
        niveauRequis: q.niveauRequis,
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
      const statut = utilisateur.statut || 'visiteur';
      const niveaux = getNiveaux(statut);
      const info = getNiveauInfo(0, niveaux);
      res.json({
        succes: true,
        data: {
          parcours: {
            xp: 0,
            ...info,
            streak: 0,
          },
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
        parcours: {
          xp: parcours.xp,
          ...niveauInfo,
          streak: parcours.streak,
        },
      },
    });
  } catch (error) {
    console.error('Erreur getParcoursPublic:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};
