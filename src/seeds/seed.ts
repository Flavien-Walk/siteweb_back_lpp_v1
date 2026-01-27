import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Projet from '../models/Projet.js';
import Publication from '../models/Publication.js';
import Evenement from '../models/Evenement.js';
import Notification from '../models/Notification.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lpp';

const projetsData = [
  {
    nom: 'GreenBox',
    description: 'GreenBox développe des composteurs connectés pour les immeubles urbains. Chaque composteur est équipé de capteurs IoT qui mesurent la température, l\'humidité et le niveau de remplissage. Les résidents suivent leur impact via une app mobile.',
    pitch: 'Composteurs connectés pour immeubles urbains',
    categorie: 'environnement' as const,
    secteur: 'CleanTech',
    maturite: 'lancement' as const,
    localisation: { ville: 'Lyon', lat: 45.764, lng: 4.8357 },
    progression: 72,
    objectif: '150 000 €',
    montant: 108000,
    image: '/projets/greenbox.svg',
    tags: ['IoT', 'Écologie', 'Urbain'],
  },
  {
    nom: 'Miam Local',
    description: 'Application de livraison 100% producteurs locaux. Miam Local connecte les agriculteurs et artisans directement aux consommateurs urbains, sans intermédiaire. Circuit court garanti, livraison en vélo cargo.',
    pitch: 'App de livraison 100% producteurs locaux',
    categorie: 'food' as const,
    secteur: 'FoodTech',
    maturite: 'croissance' as const,
    localisation: { ville: 'Nantes', lat: 47.2184, lng: -1.5536 },
    progression: 89,
    objectif: '200 000 €',
    montant: 178000,
    image: '/projets/miam-local.svg',
    tags: ['Circuit court', 'Livraison', 'Local'],
  },
  {
    nom: 'MediConnect',
    description: 'Plateforme de télémédecine dédiée aux zones rurales. MediConnect permet aux patients éloignés des centres médicaux d\'accéder à des consultations vidéo avec des médecins généralistes et spécialistes.',
    pitch: 'Télémédecine pour zones rurales',
    categorie: 'sante' as const,
    secteur: 'HealthTech',
    maturite: 'prototype' as const,
    localisation: { ville: 'Toulouse', lat: 43.6047, lng: 1.4442 },
    progression: 45,
    objectif: '300 000 €',
    montant: 135000,
    image: '/projets/mediconnect.svg',
    tags: ['Santé', 'Rural', 'Télémédecine'],
  },
  {
    nom: 'CodeMentor',
    description: 'Plateforme de mentorat tech qui met en relation des développeurs expérimentés avec des juniors et reconvertis. Sessions de pair programming, revue de code, et accompagnement carrière personnalisé.',
    pitch: 'Mentorat tech entre développeurs',
    categorie: 'education' as const,
    secteur: 'EdTech',
    maturite: 'lancement' as const,
    localisation: { ville: 'Paris', lat: 48.8566, lng: 2.3522 },
    progression: 63,
    objectif: '120 000 €',
    montant: 75600,
    image: '/projets/codementor.svg',
    tags: ['Mentorat', 'Tech', 'Éducation'],
  },
  {
    nom: 'ArtLocal',
    description: 'Galerie virtuelle pour artistes émergents. ArtLocal offre une vitrine numérique aux créateurs locaux : expositions virtuelles en 3D, ventes directes, et mise en relation avec des collectionneurs.',
    pitch: 'Galerie virtuelle pour artistes émergents',
    categorie: 'culture' as const,
    secteur: 'Art & Culture',
    maturite: 'idee' as const,
    localisation: { ville: 'Bordeaux', lat: 44.8378, lng: -0.5792 },
    progression: 34,
    objectif: '80 000 €',
    montant: 27200,
    image: '/projets/artlocal.svg',
    tags: ['Art', 'Galerie', 'NFT'],
  },
  {
    nom: 'EnergyShare',
    description: 'Plateforme de partage d\'énergie solaire entre voisins. EnergyShare permet aux propriétaires de panneaux solaires de revendre leur surplus à leurs voisins directs, créant des micro-réseaux énergétiques locaux.',
    pitch: 'Partage d\'énergie solaire entre voisins',
    categorie: 'energie' as const,
    secteur: 'EnergyTech',
    maturite: 'croissance' as const,
    localisation: { ville: 'Marseille', lat: 43.2965, lng: 5.3698 },
    progression: 81,
    objectif: '250 000 €',
    montant: 202500,
    image: '/projets/energyshare.svg',
    tags: ['Solaire', 'P2P', 'Énergie'],
  },
  {
    nom: 'UrbanFarm',
    description: 'Fermes urbaines verticales en conteneurs recyclés. UrbanFarm installe des micro-fermes hydroponiques dans les quartiers, produisant fruits et légumes frais à moins de 500m des consommateurs.',
    pitch: 'Fermes verticales en conteneurs recyclés',
    categorie: 'environnement' as const,
    secteur: 'AgriTech',
    maturite: 'prototype' as const,
    localisation: { ville: 'Lille', lat: 50.6292, lng: 3.0573 },
    progression: 52,
    objectif: '180 000 €',
    montant: 93600,
    image: '/projets/greenbox.svg',
    tags: ['Agriculture', 'Urbain', 'Hydroponie'],
  },
  {
    nom: 'SafeRide',
    description: 'Application de covoiturage sécurisé pour trajets nocturnes. SafeRide vérifie l\'identité des conducteurs, partage le trajet en temps réel avec des proches, et propose un bouton d\'alerte intégré.',
    pitch: 'Covoiturage sécurisé pour trajets nocturnes',
    categorie: 'tech' as const,
    secteur: 'MobilityTech',
    maturite: 'lancement' as const,
    localisation: { ville: 'Strasbourg', lat: 48.5734, lng: 7.7521 },
    progression: 58,
    objectif: '140 000 €',
    montant: 81200,
    image: '/projets/codementor.svg',
    tags: ['Mobilité', 'Sécurité', 'Covoiturage'],
  },
  {
    nom: 'LearnLang',
    description: 'Apprentissage des langues par immersion virtuelle. LearnLang utilise la réalité augmentée pour placer l\'apprenant dans des situations du quotidien : commander au restaurant, demander son chemin, négocier.',
    pitch: 'Langues par immersion en réalité augmentée',
    categorie: 'education' as const,
    secteur: 'EdTech',
    maturite: 'idee' as const,
    localisation: { ville: 'Nice', lat: 43.7102, lng: 7.262 },
    progression: 18,
    objectif: '100 000 €',
    montant: 18000,
    image: '/projets/codementor.svg',
    tags: ['Langues', 'AR', 'Éducation'],
  },
  {
    nom: 'PetCare+',
    description: 'Plateforme de garde et soins d\'animaux entre particuliers. PetCare+ met en relation les propriétaires d\'animaux avec des gardiens vérifiés dans leur quartier. Assurance incluse, suivi photo en temps réel.',
    pitch: 'Garde d\'animaux entre voisins de confiance',
    categorie: 'autre' as const,
    secteur: 'PetTech',
    maturite: 'prototype' as const,
    localisation: { ville: 'Montpellier', lat: 43.6108, lng: 3.8767 },
    progression: 41,
    objectif: '90 000 €',
    montant: 36900,
    image: '/projets/miam-local.svg',
    tags: ['Animaux', 'Communauté', 'Services'],
  },
];

const publicationsData = [
  {
    type: 'annonce' as const,
    contenu: 'Bienvenue sur La Première Pierre ! Notre plateforme est désormais ouverte. Découvrez les premiers projets et rejoignez la communauté.',
    auteurType: 'Projet' as const,
  },
  {
    type: 'update' as const,
    contenu: 'GreenBox vient de franchir le cap des 100 composteurs installés à Lyon ! Merci à toute la communauté pour votre soutien. Prochaine étape : Villeurbanne.',
  },
  {
    type: 'update' as const,
    contenu: 'Miam Local lance son nouveau service de paniers hebdomadaires. Abonnez-vous pour recevoir chaque semaine des produits frais de nos producteurs partenaires.',
  },
  {
    type: 'editorial' as const,
    contenu: 'Comment choisir un projet à suivre ? Notre guide pour comprendre les indicateurs de maturité et faire des choix éclairés sur La Première Pierre.',
    auteurType: 'Projet' as const,
  },
  {
    type: 'update' as const,
    contenu: 'MediConnect a obtenu son agrément ARS pour déployer la télémédecine dans 3 départements ruraux. Un pas de géant pour l\'accès aux soins !',
  },
  {
    type: 'live-extrait' as const,
    contenu: 'Extrait du live avec l\'équipe EnergyShare : "Notre objectif est de créer 50 micro-réseaux solaires d\'ici fin 2026. Chaque quartier peut devenir producteur d\'énergie."',
  },
  {
    type: 'annonce' as const,
    contenu: 'Nouveau : retrouvez désormais les lives et replays directement dans votre espace. Ne manquez plus aucun événement !',
    auteurType: 'Projet' as const,
  },
  {
    type: 'update' as const,
    contenu: 'CodeMentor a accompagné 200 développeurs juniors ce trimestre. 85% ont trouvé un emploi dans les 3 mois suivant leur mentorat.',
  },
];

const now = new Date();
const jour = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

const evenementsData = [
  {
    titre: 'Live Q/R — GreenBox : bilan 2026',
    description: 'Session de questions/réponses avec le fondateur de GreenBox. Bilan de l\'année, prochaines étapes et opportunités.',
    type: 'live' as const,
    date: jour(3),
    duree: 60,
    statut: 'a-venir' as const,
  },
  {
    titre: 'Présentation Miam Local — Expansion nationale',
    description: 'Miam Local présente sa stratégie d\'expansion nationale. Découvrez les nouvelles villes et les partenariats en cours.',
    type: 'live' as const,
    date: jour(7),
    duree: 45,
    statut: 'a-venir' as const,
  },
  {
    titre: 'Replay — MediConnect : la télémédecine rurale',
    description: 'Retour sur le live de présentation de MediConnect et les enjeux de la télémédecine en zone rurale.',
    type: 'replay' as const,
    date: jour(-10),
    duree: 55,
    lienVideo: 'https://www.youtube.com/watch?v=example1',
    statut: 'termine' as const,
  },
  {
    titre: 'Session Q/R — EnergyShare : questions investisseurs',
    description: 'Session dédiée aux questions des membres sur le modèle économique d\'EnergyShare et les perspectives de croissance.',
    type: 'qr' as const,
    date: jour(14),
    duree: 40,
    statut: 'a-venir' as const,
  },
  {
    titre: 'Replay — Comment suivre un projet sur LPP',
    description: 'Tutoriel complet sur l\'utilisation de la plateforme : suivre des projets, recevoir des notifications, interagir avec la communauté.',
    type: 'replay' as const,
    date: jour(-5),
    duree: 30,
    lienVideo: 'https://www.youtube.com/watch?v=example2',
    statut: 'termine' as const,
  },
  {
    titre: 'Live — UrbanFarm : visite virtuelle de la ferme',
    description: 'Visitez en direct la première ferme urbaine UrbanFarm installée à Lille. Découvrez le fonctionnement de l\'hydroponie en conteneur.',
    type: 'live' as const,
    date: jour(1),
    duree: 50,
    statut: 'a-venir' as const,
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connecté à MongoDB');

    // Nettoyer les collections (sauf Utilisateur)
    await Promise.all([
      Projet.deleteMany({}),
      Publication.deleteMany({}),
      Evenement.deleteMany({}),
      Notification.deleteMany({}),
    ]);
    console.log('Collections nettoyées');

    // Insérer les projets
    const projets = await Projet.insertMany(projetsData);
    console.log(`${projets.length} projets insérés`);

    // Insérer les publications avec référence aux projets
    const pubs = publicationsData.map((pub, i) => ({
      ...pub,
      auteur: projets[i % projets.length]._id,
      auteurType: pub.auteurType || ('Projet' as const),
      projet: pub.type !== 'annonce' && pub.type !== 'editorial' ? projets[i % projets.length]._id : undefined,
    }));
    const publications = await Publication.insertMany(pubs);
    console.log(`${publications.length} publications insérées`);

    // Insérer les événements avec référence aux projets
    const evts = evenementsData.map((evt, i) => ({
      ...evt,
      projet: projets[i % projets.length]._id,
    }));
    const evenements = await Evenement.insertMany(evts);
    console.log(`${evenements.length} événements insérés`);

    console.log('Seed terminé avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('Erreur seed:', error);
    process.exit(1);
  }
}

seed();
