/**
 * Seed V2 - 17 nouveaux comptes + projets publies + posts avec photos + interactions
 * Usage: node scripts/seed-v2.js
 */

const API = 'https://siteweb-back-lpp-v1.onrender.com/api';
const MDP = 'DemoLpp2025!';

// ============ HELPERS ============

async function api(endpoint, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${endpoint}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !data.message?.includes('existe')) {
    console.error(`  [ERR] ${method} ${endpoint} → ${res.status}: ${data.message || ''}`);
  }
  return data;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function log(msg) { console.log(`\n✦ ${msg}`); }
function ok(msg) { console.log(`  ✓ ${msg}`); }
function info(msg) { console.log(`  → ${msg}`); }

// ============ 17 NOUVEAUX USERS ============

const USERS = [
  {
    prenom: 'Mehdi', nom: 'Amrani',
    email: 'mehdi.amrani@demo.lpp.fr',
    bio: 'CEO & co-fondateur de GreenLoop. On transforme les dechets plastiques en materiaux de construction. Impact x Tech.',
    statut: 'entrepreneur',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face&q=80',
  },
  {
    prenom: 'Clara', nom: 'Fontaine',
    email: 'clara.fontaine@demo.lpp.fr',
    bio: 'Designer UX/UI freelance. J\'aide les startups a creer des produits que les gens adorent utiliser. Portfolio: 40+ apps.',
    statut: 'visiteur',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face&q=80',
  },
  {
    prenom: 'Antoine', nom: 'Roche',
    email: 'antoine.roche@demo.lpp.fr',
    bio: 'Fondateur de Colis Vert. Livraison dernier kilometre 100% velo cargo. Ex-logisticien chez Amazon.',
    statut: 'entrepreneur',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face&q=80',
  },
  {
    prenom: 'Fatou', nom: 'Diallo',
    email: 'fatou.diallo@demo.lpp.fr',
    bio: 'Fondatrice de SolanaBio. Cosmetiques bio fabriques au Senegal avec des ingredients locaux. Fiere de mes racines.',
    statut: 'entrepreneur',
    avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop&crop=face&q=80',
  },
  {
    prenom: 'Maxime', nom: 'Leroy',
    email: 'maxime.leroy@demo.lpp.fr',
    bio: 'Business Angel & mentor. 15 ans dans la tech, 8 exits. J\'investis dans les startups impact positif pre-seed/seed.',
    statut: 'visiteur',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face&q=80',
  },
  {
    prenom: 'Lea', nom: 'Nguyen',
    email: 'lea.nguyen@demo.lpp.fr',
    bio: 'CTO chez EduSpark. On rend l\'education accessible grace a l\'IA. Avant : lead dev chez Doctolib.',
    statut: 'entrepreneur',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face&q=80',
  },
  {
    prenom: 'Samir', nom: 'Benali',
    email: 'samir.benali@demo.lpp.fr',
    bio: 'Growth marketer specialise SaaS B2B. J\'ai aide 12 startups a passer de 0 a 10k users. Obsede par les metrics.',
    statut: 'visiteur',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face&q=80',
  },
  {
    prenom: 'Camille', nom: 'Durand',
    email: 'camille.durand@demo.lpp.fr',
    bio: 'Cofondatrice de PetitPlat. App anti-gaspi qui connecte restaurants et consommateurs. +50 000 repas sauves !',
    statut: 'entrepreneur',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face&q=80',
  },
  {
    prenom: 'Julien', nom: 'Petit',
    email: 'julien.petit@demo.lpp.fr',
    bio: 'Developpeur blockchain & Web3. Smart contracts, DeFi, tokenisation. Je construis l\'internet de demain.',
    statut: 'visiteur',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=face&q=80',
  },
  {
    prenom: 'Amira', nom: 'Khelifi',
    email: 'amira.khelifi@demo.lpp.fr',
    bio: 'Avocate specialisee droit des startups. Je protege vos innovations. CGV, RGPD, levees de fonds, pactes d\'associes.',
    statut: 'visiteur',
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop&crop=face&q=80',
  },
  {
    prenom: 'Thomas', nom: 'Garcia',
    email: 'thomas.garcia@demo.lpp.fr',
    bio: 'Fondateur de SportPulse. Plateforme de coaching sportif personnalise par IA. +5 000 athletes accompagnes.',
    statut: 'entrepreneur',
    avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&h=400&fit=crop&crop=face&q=80',
  },
  {
    prenom: 'Marie', nom: 'Lambert',
    email: 'marie.lambert@demo.lpp.fr',
    bio: 'Etudiante en data science a Polytechnique. Passionnee d\'IA appliquee a la sante. Hackathon addict.',
    statut: 'visiteur',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face&q=80',
  },
  {
    prenom: 'Youssef', nom: 'El Mansouri',
    email: 'youssef.elmansouri@demo.lpp.fr',
    bio: 'Fondateur de Dar Solar. Panneaux solaires accessibles pour les zones rurales au Maroc. Energie propre pour tous.',
    statut: 'entrepreneur',
    avatar: 'https://images.unsplash.com/photo-1548372290-8d01b6c8e78c?w=400&h=400&fit=crop&crop=face&q=80',
  },
  {
    prenom: 'Sophie', nom: 'Martin',
    email: 'sophie.martin@demo.lpp.fr',
    bio: 'Directrice marketing chez une licorne French Tech. Je partage mes tips growth & branding pour les startups.',
    statut: 'visiteur',
    avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&h=400&fit=crop&crop=face&q=80',
  },
  {
    prenom: 'Romain', nom: 'Leclerc',
    email: 'romain.leclerc@demo.lpp.fr',
    bio: 'Cofondateur AgroTech Solutions. Capteurs IoT + IA pour une agriculture plus durable et rentable. Y Combinator W24.',
    statut: 'entrepreneur',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=400&fit=crop&crop=face&q=80',
  },
  {
    prenom: 'Nadia', nom: 'Bensaid',
    email: 'nadia.bensaid@demo.lpp.fr',
    bio: 'Venture Capital Associate chez Partech. J\'investis dans les startups early-stage tech en Europe et Afrique.',
    statut: 'visiteur',
    avatar: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&h=400&fit=crop&crop=face&q=80',
  },
  {
    prenom: 'Lucas', nom: 'Morel',
    email: 'lucas.morel@demo.lpp.fr',
    bio: 'Ex-CTO, maintenant coach technique pour fondateurs non-tech. Je t\'aide a recruter, choisir ton stack et scaler.',
    statut: 'visiteur',
    avatar: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=400&h=400&fit=crop&crop=face&q=80',
  },
];

// ============ 5 PROJETS (avec images) ============

const PROJETS = [
  {
    ownerEmail: 'mehdi.amrani@demo.lpp.fr',
    data: {
      nom: 'GreenLoop',
      pitch: 'Transformer les dechets plastiques en materiaux de construction durables',
      description: 'GreenLoop collecte les dechets plastiques urbains et les transforme en briques, dalles et panneaux de construction via un procede brevete de compression-fusion. Nos materiaux sont 40% moins chers que le beton traditionnel et 100% recycles. Nous operons deja 3 centres de collecte a Casablanca.',
      categorie: 'environnement',
      secteur: 'CleanTech / Construction',
      maturite: 'lancement',
      localisation: { ville: 'Casablanca', lat: 33.5731, lng: -7.5898 },
      tags: ['Recyclage', 'Construction', 'Economie circulaire'],
      probleme: '8 millions de tonnes de plastique finissent dans les oceans chaque annee. En Afrique du Nord, moins de 10% des dechets plastiques sont recycles.',
      solution: 'Un procede industriel low-cost qui transforme le plastique non recyclable en materiaux de construction certifies, creant des emplois locaux.',
      cible: 'Entreprises BTP, collectivites locales, promoteurs immobiliers au Maroc et en Afrique de l\'Ouest',
      businessModel: 'Vente de materiaux (marge 35%) + licence du procede aux industriels locaux + credits carbone',
      objectifFinancement: 350000,
      montantLeve: 85000,
      progression: 24,
      metriques: [
        { label: 'Tonnes recyclees', valeur: '120' },
        { label: 'Emplois crees', valeur: '18' },
        { label: 'Centres', valeur: '3' },
      ],
    },
    image: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&h=500&fit=crop&q=80',
  },
  {
    ownerEmail: 'fatou.diallo@demo.lpp.fr',
    data: {
      nom: 'SolanaBio',
      pitch: 'Cosmetiques bio premium fabriques au Senegal avec des ingredients locaux',
      description: 'SolanaBio cree des soins visage, corps et cheveux a base de beurre de karite, baobab, moringa et bissap. Tous nos produits sont certifies bio, cruelty-free et fabriques dans notre atelier a Dakar. Nous employons 12 femmes du quartier de Medina.',
      categorie: 'culture',
      secteur: 'Beaute / Cosmetique',
      maturite: 'croissance',
      localisation: { ville: 'Dakar', lat: 14.7167, lng: -17.4677 },
      tags: ['Cosmetique bio', 'Made in Africa', 'Femmes'],
      probleme: 'Les cosmetiques bio sont souvent importes et inabordables en Afrique. Les savoir-faire locaux sont sous-valorises.',
      solution: 'Des soins premium a prix accessible en valorisant les ingredients africains et le savoir-faire local.',
      cible: 'Femmes 20-45 ans, Afrique de l\'Ouest + diaspora en Europe',
      businessModel: 'Vente en ligne (D2C) + distribution en boutiques partenaires + abonnement box mensuelle',
      objectifFinancement: 200000,
      montantLeve: 145000,
      progression: 72,
      metriques: [
        { label: 'Produits vendus', valeur: '8 200' },
        { label: 'Clientes', valeur: '3 100' },
        { label: 'Note moyenne', valeur: '4.8/5' },
      ],
    },
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&h=500&fit=crop&q=80',
  },
  {
    ownerEmail: 'lea.nguyen@demo.lpp.fr',
    data: {
      nom: 'EduSpark',
      pitch: 'L\'IA qui personnalise l\'education pour chaque eleve',
      description: 'EduSpark est une plateforme d\'apprentissage adaptatif qui utilise l\'intelligence artificielle pour creer des parcours pedagogiques personnalises. Notre algorithme analyse le niveau, le rythme et le style d\'apprentissage de chaque eleve pour adapter les exercices en temps reel.',
      categorie: 'education',
      secteur: 'EdTech / IA',
      maturite: 'prototype',
      localisation: { ville: 'Paris', lat: 48.8566, lng: 2.3522 },
      tags: ['EdTech', 'Intelligence artificielle', 'Education'],
      probleme: '30% des eleves decrochent car l\'enseignement classique ne s\'adapte pas a leur rythme. Les profs manquent d\'outils pour personnaliser.',
      solution: 'Un assistant IA pour les enseignants qui genere automatiquement des exercices adaptes au niveau de chaque eleve.',
      cible: 'Colleges et lycees en France, enseignants de maths et sciences',
      businessModel: 'Abonnement par etablissement (SaaS B2B) + version freemium pour les particuliers',
      objectifFinancement: 600000,
      montantLeve: 50000,
      progression: 8,
      metriques: [
        { label: 'Ecoles pilotes', valeur: '12' },
        { label: 'Eleves testes', valeur: '850' },
        { label: 'Amelioration', valeur: '+23%' },
      ],
    },
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=500&fit=crop&q=80',
  },
  {
    ownerEmail: 'antoine.roche@demo.lpp.fr',
    data: {
      nom: 'Colis Vert',
      pitch: 'Livraison dernier kilometre 100% velo cargo en ville',
      description: 'Colis Vert remplace les camionnettes diesel par des velos cargos electriques pour la livraison en centre-ville. Plus rapide (pas de bouchons), moins cher et zero emission. Nous livrons deja 800 colis/jour a Lyon.',
      categorie: 'environnement',
      secteur: 'Logistique verte',
      maturite: 'croissance',
      localisation: { ville: 'Lyon', lat: 45.7640, lng: 4.8357 },
      tags: ['Logistique', 'Velo cargo', 'Zero emission'],
      probleme: 'La livraison dernier kilometre represente 25% des emissions CO2 urbaines. Les camionnettes bloquent le trafic.',
      solution: 'Un reseau de micro-hubs urbains + flotte de velos cargos electriques. Livraison en 2h, 100% decarbonee.',
      cible: 'E-commercants, enseignes retail, restaurateurs en zone urbaine dense',
      businessModel: 'Tarification au colis (2-5€) + abonnement mensuel pour les pros (volume)',
      objectifFinancement: 400000,
      montantLeve: 280000,
      progression: 70,
      metriques: [
        { label: 'Colis/jour', valeur: '800' },
        { label: 'Villes', valeur: '3' },
        { label: 'Tonnes CO2 evitees', valeur: '45' },
      ],
    },
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=500&fit=crop&q=80',
  },
  {
    ownerEmail: 'youssef.elmansouri@demo.lpp.fr',
    data: {
      nom: 'Dar Solar',
      pitch: 'Panneaux solaires accessibles pour les zones rurales au Maroc',
      description: 'Dar Solar propose des kits solaires plug-and-play avec paiement en mensualites via mobile money. Chaque kit alimente une maison complete : eclairage, charge telephone, TV, ventilateur. Installation en 1h, pas besoin de technicien.',
      categorie: 'energie',
      secteur: 'SolarTech / Pay-as-you-go',
      maturite: 'lancement',
      localisation: { ville: 'Marrakech', lat: 31.6295, lng: -7.9811 },
      tags: ['Solaire', 'Pay-as-you-go', 'Energie rurale'],
      probleme: 'Au Maroc, 500 000 foyers ruraux n\'ont pas acces a l\'electricite fiable. Le raccordement au reseau coute trop cher.',
      solution: 'Kits solaires a 15€/mois pendant 24 mois via mobile money. Le client devient proprietaire a la fin.',
      cible: 'Foyers ruraux non electrifies au Maroc, puis Tunisie et Mauritanie',
      businessModel: 'Pay-as-you-go (leasing solaire) + vente de kits premium + maintenance',
      objectifFinancement: 250000,
      montantLeve: 60000,
      progression: 24,
      metriques: [
        { label: 'Foyers equipes', valeur: '340' },
        { label: 'kWh produits', valeur: '52 000' },
        { label: 'Villages', valeur: '28' },
      ],
    },
    image: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=500&fit=crop&q=80',
  },
];

// ============ POSTS AVEC PHOTOS ============

const POSTS = [
  // Mehdi
  { userEmail: 'mehdi.amrani@demo.lpp.fr', contenu: "On vient d'inaugurer notre 3eme centre de collecte GreenLoop a Casablanca ! 120 tonnes de plastique transformees en materiaux de construction depuis le lancement.\n\nLe plus beau : 18 emplois crees dans des quartiers ou le taux de chomage depasse 40%.\n\nL'economie circulaire, c'est pas juste un buzzword. C'est des vrais jobs, un vrai impact.", medias: ['https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&h=500&fit=crop&q=80'] },

  // Clara
  { userEmail: 'clara.fontaine@demo.lpp.fr', contenu: "Nouveau projet en portfolio ! Redesign complet de l'app d'une startup HealthTech.\n\nAvant → apres : taux de completion du onboarding passe de 23% a 71%.\n\nLe secret ? Ecouter les utilisateurs. J'ai fait 15 interviews avant de toucher un seul pixel.\n\nLe design, c'est pas faire joli. C'est resoudre des problemes.", medias: ['https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=500&fit=crop&q=80'] },

  // Antoine
  { userEmail: 'antoine.roche@demo.lpp.fr', contenu: "800 colis livres aujourd'hui a Lyon, 100% en velo cargo. Zero emission. Pas un seul retard.\n\nQuand j'ai quitte Amazon pour lancer Colis Vert, tout le monde m'a dit que c'etait impossible. \"Les velos, ca scale pas.\"\n\n3 villes, 25 livreurs, 800 colis/jour. On prouve que la logistique verte, ca marche.", medias: ['https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=500&fit=crop&q=80'] },

  // Fatou
  { userEmail: 'fatou.diallo@demo.lpp.fr', contenu: "Shooting photo pour la nouvelle gamme SolanaBio ! Nos soins au beurre de karite et moringa, fabriques a Dakar par des femmes incroyables.\n\nChaque pot vendu, c'est un salaire decent, une formation et de la fierte.\n\nLe luxe accessible, made in Africa.", medias: ['https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&h=500&fit=crop&q=80'] },

  // Maxime
  { userEmail: 'maxime.leroy@demo.lpp.fr', contenu: "Apres 15 ans dans la tech et 8 exits, voici les 5 erreurs que je vois chez TOUS les fondateurs early-stage :\n\n1. Lever trop tot (validez d'abord votre marche)\n2. Recruter trop vite (restez lean)\n3. Ignorer la distribution (le produit ne suffit pas)\n4. Sous-estimer le legal (structurez des le debut)\n5. Oublier de prendre soin de soi\n\nLe numero 5 est celui qui tue le plus de startups. Prenez soin de vous.", medias: ['https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=500&fit=crop&q=80'] },

  // Lea
  { userEmail: 'lea.nguyen@demo.lpp.fr', contenu: "EduSpark vient de finir son premier pilote dans 12 colleges ! Les resultats sont bluffants :\n\n+23% de progression en maths sur 3 mois. Et le plus fou : les eleves en difficulte progressent 2x plus vite que les autres.\n\nL'IA au service de l'egalite des chances, c'est possible. On cherche 50 ecoles pour la phase 2.", medias: ['https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=500&fit=crop&q=80'] },

  // Samir
  { userEmail: 'samir.benali@demo.lpp.fr', contenu: "Framework growth que j'utilise avec toutes les startups que j'accompagne :\n\n1. AARRR (Acquisition, Activation, Retention, Revenue, Referral)\n2. Identifier LE metric qui compte (North Star Metric)\n3. Lancer 5 experiences/semaine minimum\n4. Mesurer tout, intuiter rien\n\nLe growth, c'est pas de la magie. C'est de la methode + de l'execution.\n\nQuel est votre North Star Metric ? Dites-le en commentaire.", medias: ['https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=500&fit=crop&q=80'] },

  // Camille
  { userEmail: 'camille.durand@demo.lpp.fr', contenu: "50 000 repas sauves du gaspillage grace a PetitPlat ! Merci a nos 200 restaurants partenaires et a vous, notre communaute.\n\nChaque repas sauve, c'est 2.5kg de CO2 evites. On a donc evite 125 tonnes de CO2.\n\nProchain objectif : 100 000 repas avant la fin de l'annee. On y va ensemble ?", medias: ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=500&fit=crop&q=80'] },

  // Thomas
  { userEmail: 'thomas.garcia@demo.lpp.fr', contenu: "5 000 athletes accompagnes par SportPulse ! Notre IA analyse les performances, la recuperation et la nutrition pour creer des plans d'entrainement sur mesure.\n\nFun fact : nos utilisateurs progressent 35% plus vite qu'avec un coaching classique.\n\nLe sport, c'est de la data. Et la data, c'est du progres.", medias: ['https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=500&fit=crop&q=80'] },

  // Marie
  { userEmail: 'marie.lambert@demo.lpp.fr', contenu: "Week-end hackathon IA x Sante a Polytechnique ! En 48h, on a construit un modele qui detecte les signes precoces de depression a partir de l'activite smartphone (avec consentement).\n\nPrecision : 87%. C'est prometteur mais il y a encore du boulot sur l'ethique et la vie privee.\n\nL'IA en sante, c'est un equilibre constant entre innovation et responsabilite.", medias: ['https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=500&fit=crop&q=80'] },

  // Youssef
  { userEmail: 'youssef.elmansouri@demo.lpp.fr', contenu: "340 foyers ruraux equipes en solaire grace a Dar Solar ! Installation dans le village d'Ait Benhaddou cette semaine.\n\nQuand la lumiere s'allume pour la premiere fois dans une maison, les enfants crient de joie. C'est pour ces moments qu'on fait tout ca.\n\n15€/mois pendant 2 ans. Apres, l'energie est gratuite a vie.", medias: ['https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=500&fit=crop&q=80'] },

  // Sophie
  { userEmail: 'sophie.martin@demo.lpp.fr', contenu: "Lecon de branding que j'aurais aime apprendre plus tot :\n\nVotre marque, c'est pas votre logo. C'est ce que les gens disent de vous quand vous n'etes pas dans la piece.\n\n3 questions a vous poser :\n→ Quelle emotion je veux provoquer ?\n→ Quelle promesse je fais ?\n→ Est-ce que je la tiens a chaque interaction ?\n\nLa coherence bat la creativite. Toujours.", medias: ['https://images.unsplash.com/photo-1523726491678-bf852e717f6a?w=800&h=500&fit=crop&q=80'] },

  // Romain
  { userEmail: 'romain.leclerc@demo.lpp.fr', contenu: "AgroTech Solutions sort du Y Combinator W24 ! 3 mois intenses a San Francisco. Ce qu'on en retient :\n\n→ Speed > Perfection\n→ Talk to users every single day\n→ Revenue is the ultimate validation\n\nNos capteurs IoT sont deployes sur 200 exploitations en France. L'agriculture de precision, c'est maintenant.", medias: ['https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800&h=500&fit=crop&q=80'] },

  // Nadia
  { userEmail: 'nadia.bensaid@demo.lpp.fr', contenu: "Apres avoir vu 500+ decks de startups cette annee chez Partech, voici ce qui fait qu'un pitch deck capte mon attention en 30 secondes :\n\n1. Un probleme que je comprends immediatement\n2. Des chiffres, pas des adjectifs\n3. Un team slide qui montre POURQUOI cette equipe\n4. Un ask clair (combien, pour quoi faire)\n\nArretez les decks de 40 slides. 10 suffisent. Max.", medias: ['https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=500&fit=crop&q=80'] },

  // Lucas
  { userEmail: 'lucas.morel@demo.lpp.fr', contenu: "Question que me posent 90% des fondateurs non-tech : \"Quel langage choisir pour mon MVP ?\"\n\nMa reponse : celui que ton dev maitrise le mieux.\n\nSerieusement. A ce stade, la techno n'a aucune importance. Ce qui compte :\n→ Vitesse de dev\n→ Fiabilite\n→ Capacite a iterer vite\n\nUn MVP en PHP qui marche bat un MVP en Rust qui n'est jamais fini.", medias: ['https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=500&fit=crop&q=80'] },

  // Amira
  { userEmail: 'amira.khelifi@demo.lpp.fr', contenu: "Les 3 erreurs juridiques les plus frequentes que je vois chez les startups :\n\n1. Pas de pacte d'associes → divorce sanglant garanti\n2. CGV copier-coller → non conformes RGPD = amende\n3. Propriete intellectuelle non protegee → un concurrent vous copie\n\nUn bon avocat ne coute pas cher. Un mauvais avocat, ca coute une startup.\n\nDM ouverts si vous avez des questions juridiques.", medias: ['https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=500&fit=crop&q=80'] },

  // Julien
  { userEmail: 'julien.petit@demo.lpp.fr', contenu: "Web3 n'est pas mort, il mute.\n\nOui, le hype est passe. Tant mieux. Maintenant on construit des vrais produits :\n→ Tokenisation d'actifs reels (immobilier, art)\n→ Identite decentralisee\n→ Supply chain transparente\n\nLes meilleurs projets Web3 de 2025, vous ne savez meme pas qu'ils utilisent la blockchain. Et c'est exactement le point.", medias: ['https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=500&fit=crop&q=80'] },

  // Post supplementaire Yasmine (existante)
  { userEmail: 'yasmine.belkacem@demo.lpp.fr', contenu: "NovaPay vient de signer un partenariat avec Orange Money pour couvrir le Senegal et la Cote d'Ivoire !\n\nCe partenariat nous permet d'atteindre 15 millions d'utilisateurs potentiels. On passe d'une app a un ecosysteme.\n\nLa route est longue mais chaque pas compte. Stay tuned.", medias: ['https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=500&fit=crop&q=80'] },

  // Post supplementaire Hugo (existant)
  { userEmail: 'hugo.carpentier@demo.lpp.fr', contenu: "Viens de terminer un projet React Native pour une startup foodtech. 12 semaines, 45 ecrans, de zero a l'App Store.\n\nStack : Expo + TypeScript + Node.js + MongoDB\n\nLecon principale : investissez dans votre architecture des le debut. Refactorer a la semaine 10, ca fait mal.", medias: ['https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=500&fit=crop&q=80'] },

  // Post supplementaire Ines (existante)
  { userEmail: 'ines.moreau@demo.lpp.fr', contenu: "Mon premier prototype de marque de mode durable est pret ! 3 t-shirts en coton bio, fabriques au Portugal, prix entre 29 et 39€.\n\nJ'ai galere 4 mois pour trouver un atelier ethique a prix correct. Mais le resultat est la.\n\nProchaine etape : tester la demande avec un drop limite a 100 pieces. Qui serait interesse ?", medias: ['https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&h=500&fit=crop&q=80'] },
];

// ============ COMMENTAIRES ============

const COMMENTS = [
  { postIdx: 0, userEmail: 'maxime.leroy@demo.lpp.fr', contenu: "Bravo Mehdi ! L'economie circulaire dans le BTP c'est un marche enorme. Tu as pense a lever pour accelerer ?" },
  { postIdx: 0, userEmail: 'nadia.bensaid@demo.lpp.fr', contenu: "On regarde exactement ce type de projets chez Partech. Je t'envoie un message." },
  { postIdx: 1, userEmail: 'lea.nguyen@demo.lpp.fr', contenu: "15 interviews utilisateurs avant de designer, c'est la bonne methode. Chez EduSpark on fait pareil. Top travail Clara !" },
  { postIdx: 2, userEmail: 'camille.durand@demo.lpp.fr', contenu: "On utilise Colis Vert pour les livraisons PetitPlat a Lyon. Service impeccable, les clients adorent le cote ecolo !" },
  { postIdx: 3, userEmail: 'clara.fontaine@demo.lpp.fr', contenu: "Les visuels sont magnifiques Fatou ! Si tu as besoin d'aide pour le design de ton site e-commerce, n'hesite pas." },
  { postIdx: 3, userEmail: 'sophie.martin@demo.lpp.fr', contenu: "Le positionnement est top. Luxe accessible + made in Africa + empowerment feminin = combo gagnant. Go !" },
  { postIdx: 4, userEmail: 'romain.leclerc@demo.lpp.fr', contenu: "Le point 3 est tellement vrai. La distribution, c'est 80% du succes. Le meilleur produit du monde ne sert a rien si personne ne le connait." },
  { postIdx: 4, userEmail: 'samir.benali@demo.lpp.fr', contenu: "J'ajouterais un 6eme : ne pas tracker ses metrics des le jour 1. Si tu ne mesures pas, tu ne sais pas." },
  { postIdx: 5, userEmail: 'marie.lambert@demo.lpp.fr', contenu: "+23% c'est enorme ! Vous utilisez quel type de modele ? Transformer-based ou plus classique ?" },
  { postIdx: 6, userEmail: 'thomas.garcia@demo.lpp.fr', contenu: "Le framework AARRR m'a sauve la vie pour SportPulse. Notre North Star c'est le nombre de sessions d'entrainement completees par semaine." },
  { postIdx: 7, userEmail: 'antoine.roche@demo.lpp.fr', contenu: "125 tonnes de CO2 evitees, respect ! Chez Colis Vert on est a 45 tonnes. On devrait collaborer." },
  { postIdx: 8, userEmail: 'samir.benali@demo.lpp.fr', contenu: "35% plus rapide que du coaching classique ? Tu as les stats detaillees ? J'adorerais voir la retention." },
  { postIdx: 9, userEmail: 'julien.petit@demo.lpp.fr', contenu: "Le sujet ethique est crucial. Avez-vous pense a utiliser du federated learning pour garder les donnees sur device ?" },
  { postIdx: 10, userEmail: 'mehdi.amrani@demo.lpp.fr', contenu: "Ca me touche cette histoire Youssef. L'acces a l'energie, c'est fondamental. Si tu veux echanger sur nos approches respectives au Maroc, DM." },
  { postIdx: 11, userEmail: 'camille.durand@demo.lpp.fr', contenu: "Tellement vrai. Chez PetitPlat notre promesse c'est 'zero gaspillage, zero compromis sur le gout'. Et on s'y tient a chaque repas." },
  { postIdx: 12, userEmail: 'maxime.leroy@demo.lpp.fr', contenu: "YC, le Saint Graal ! Bravo Romain. 'Revenue is the ultimate validation' → tatouez-vous ca." },
  { postIdx: 13, userEmail: 'lucas.morel@demo.lpp.fr', contenu: "10 slides max, 100% d'accord. J'ajouterais : un deck c'est une histoire, pas une these de doctorat." },
  { postIdx: 14, userEmail: 'amira.khelifi@demo.lpp.fr', contenu: "Je confirme que 'celui que ton dev maitrise' est le meilleur conseil tech qu'on peut donner a un fondateur." },
  { postIdx: 16, userEmail: 'nadia.bensaid@demo.lpp.fr', contenu: "Completement. La tokenisation d'actifs reels est le vrai game changer. On commence a financer des startups dans ce domaine." },
  { postIdx: 17, userEmail: 'fatou.diallo@demo.lpp.fr', contenu: "Orange Money c'est enorme Yasmine ! On utilise leur plateforme pour les paiements SolanaBio au Senegal. Ca change tout." },
  { postIdx: 18, userEmail: 'lea.nguyen@demo.lpp.fr', contenu: "12 semaines de zero a l'App Store, c'est impressionnant. Le choix Expo est malin pour la vitesse." },
  { postIdx: 19, userEmail: 'clara.fontaine@demo.lpp.fr', contenu: "29-39€ pour du coton bio ethique, c'est le bon prix ! Si tu as besoin d'aide sur le branding/packaging, fais signe." },
];

// ============ LIKES (chaque user like 4-6 posts au hasard) ============

function generateLikes(nbUsers) {
  const likes = [];
  for (let u = 0; u < nbUsers; u++) {
    // Chaque user like 5 posts aleatoires (pas les siens)
    const possiblePosts = [];
    for (let p = 0; p < POSTS.length; p++) {
      if (POSTS[p].userEmail !== USERS[u]?.email) {
        possiblePosts.push(p);
      }
    }
    // Shuffle et prendre les 5 premiers
    const shuffled = possiblePosts.sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(5, shuffled.length); i++) {
      likes.push({ postIdx: shuffled[i], userIdx: u });
    }
  }
  return likes;
}

// ============ MAIN ============

async function main() {
  console.log('========================================');
  console.log('  SEED V2 - LPP Demo Data');
  console.log('  17 users + 5 projets + 20 posts');
  console.log('========================================\n');

  // ---------- CONNEXION DES 3 COMPTES EXISTANTS ----------
  log('ETAPE 0 : Connexion des 3 comptes existants');
  const existingEmails = [
    'yasmine.belkacem@demo.lpp.fr',
    'hugo.carpentier@demo.lpp.fr',
    'ines.moreau@demo.lpp.fr',
  ];
  const tokenMap = {}; // email → token
  const idMap = {};    // email → userId

  for (const email of existingEmails) {
    const res = await api('/auth/connexion', 'POST', { email, motDePasse: MDP });
    if (res.succes) {
      tokenMap[email] = res.data.token;
      idMap[email] = res.data.utilisateur.id;
      ok(`${email} connecte`);
    } else {
      console.error(`  ✗ ${email}: ${res.message}`);
    }
  }

  // ---------- 1. CREER LES 17 NOUVEAUX COMPTES ----------
  log('ETAPE 1 : Inscription de 17 nouveaux comptes');
  for (const user of USERS) {
    info(`${user.prenom} ${user.nom}...`);
    const res = await api('/auth/inscription', 'POST', {
      prenom: user.prenom,
      nom: user.nom,
      email: user.email,
      motDePasse: MDP,
      confirmationMotDePasse: MDP,
      cguAcceptees: true,
    });

    if (res.succes) {
      tokenMap[user.email] = res.data.token;
      idMap[user.email] = res.data.utilisateur.id;
      ok(`Inscrit → ${res.data.utilisateur.id}`);
    } else if (res.message?.includes('existe')) {
      info('Deja existant, connexion...');
      const login = await api('/auth/connexion', 'POST', { email: user.email, motDePasse: MDP });
      if (login.succes) {
        tokenMap[user.email] = login.data.token;
        idMap[user.email] = login.data.utilisateur.id;
        ok(`Connecte → ${login.data.utilisateur.id}`);
      }
    }
    await sleep(300);
  }

  // ---------- 2. PROFILS ----------
  log('ETAPE 2 : Mise a jour des profils');
  for (const user of USERS) {
    const token = tokenMap[user.email];
    if (!token) continue;
    await api('/profil', 'PATCH', { bio: user.bio }, token);
    await api('/profil/statut', 'PATCH', { statut: user.statut }, token);
    await api('/profil/avatar', 'PATCH', { avatar: user.avatar }, token);
    ok(`${user.prenom} ${user.nom} → ${user.statut}`);
    await sleep(200);
  }

  // ---------- 3. PROJETS ----------
  log('ETAPE 3 : Creation et publication des 5 projets');
  const projetIds = [];

  for (const proj of PROJETS) {
    const token = tokenMap[proj.ownerEmail];
    if (!token) { info(`Token manquant pour ${proj.ownerEmail}, skip`); projetIds.push(null); continue; }

    info(`Creation de ${proj.data.nom}...`);
    const res = await api('/projets/entrepreneur/creer', 'POST', proj.data, token);
    let projetId = null;

    if (res.succes) {
      projetId = res.data?.projet?._id || res.data?._id;
      ok(`${proj.data.nom} cree → ${projetId}`);

      // Ajouter l'image via PUT (contourne la restriction base64 de upload-media)
      info('Ajout image de couverture...');
      await api(`/projets/entrepreneur/${projetId}`, 'PUT', { image: proj.image }, token);
      ok('Image ajoutee');

      // Publier
      info('Publication...');
      const pubRes = await api(`/projets/entrepreneur/${projetId}/publier`, 'POST', {}, token);
      if (pubRes.succes) {
        ok(`${proj.data.nom} publie !`);
      } else {
        info(`Publication: ${pubRes.message}`);
      }
    } else {
      info(`${proj.data.nom}: ${res.message}`);
    }

    projetIds.push(projetId);
    await sleep(500);
  }

  // Aussi fixer NovaPay (projet existant de Yasmine)
  info('Fix NovaPay (ajout image + publication)...');
  const yasmineToken = tokenMap['yasmine.belkacem@demo.lpp.fr'];
  if (yasmineToken) {
    const mesProjets = await api('/projets/entrepreneur/mes-projets', 'GET', null, yasmineToken);
    if (mesProjets.succes && mesProjets.data?.length > 0) {
      const novapay = mesProjets.data.find(p => p.nom === 'NovaPay');
      if (novapay) {
        await api(`/projets/entrepreneur/${novapay._id}`, 'PUT', { image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=500&fit=crop&q=80' }, yasmineToken);
        const pubRes = await api(`/projets/entrepreneur/${novapay._id}/publier`, 'POST', {}, yasmineToken);
        if (pubRes.succes) ok('NovaPay publie !');
        else info(`NovaPay: ${pubRes.message}`);
      }
    }
  }

  // ---------- 4. POSTS AVEC PHOTOS ----------
  log('ETAPE 4 : Creation des 20 posts avec photos');
  const postIds = [];

  for (const post of POSTS) {
    const token = tokenMap[post.userEmail];
    if (!token) { info(`Token manquant pour ${post.userEmail}`); postIds.push(null); continue; }

    const prenom = USERS.find(u => u.email === post.userEmail)?.prenom
      || existingEmails.includes(post.userEmail) ? post.userEmail.split('.')[0] : '?';

    const res = await api('/publications', 'POST', {
      contenu: post.contenu,
      type: 'post',
      medias: post.medias || [],
    }, token);

    if (res.succes) {
      const id = res.data?.publication?._id || res.data?._id;
      postIds.push(id);
      ok(`Post de ${prenom} → ${id}`);
    } else {
      postIds.push(null);
      info(`Post: ${res.message}`);
    }
    await sleep(400);
  }

  // ---------- 5. COMMENTAIRES ----------
  log('ETAPE 5 : Commentaires croises');
  let commentCount = 0;
  for (const c of COMMENTS) {
    const postId = postIds[c.postIdx];
    if (!postId) continue;
    const token = tokenMap[c.userEmail];
    if (!token) continue;

    const res = await api(`/publications/${postId}/commentaires`, 'POST', { contenu: c.contenu }, token);
    if (res.succes) commentCount++;
    await sleep(200);
  }
  ok(`${commentCount} commentaires ajoutes`);

  // ---------- 6. LIKES ----------
  log('ETAPE 6 : Likes');
  const allEmails = [...existingEmails, ...USERS.map(u => u.email)];
  const LIKES = generateLikes(USERS.length);
  // Aussi les 3 users existants likent des posts
  for (const email of existingEmails) {
    for (let p = 0; p < Math.min(6, POSTS.length); p++) {
      if (POSTS[p].userEmail !== email) {
        LIKES.push({ postIdx: p, userEmail: email });
      }
    }
  }

  let likeCount = 0;
  for (const like of LIKES) {
    const postId = postIds[like.postIdx];
    if (!postId) continue;
    const email = like.userEmail || USERS[like.userIdx]?.email;
    const token = tokenMap[email];
    if (!token) continue;

    await api(`/publications/${postId}/like`, 'POST', {}, token);
    likeCount++;
    await sleep(100);
  }
  ok(`${likeCount} likes ajoutes`);

  // ---------- 7. FOLLOW PROJETS ----------
  log('ETAPE 7 : Follow des projets');
  let followCount = 0;
  // Chaque non-owner suit 2-3 projets au hasard
  for (const email of allEmails) {
    const token = tokenMap[email];
    if (!token) continue;

    for (const [i, proj] of PROJETS.entries()) {
      if (proj.ownerEmail === email) continue;
      if (Math.random() > 0.5) continue; // 50% de chance de follow
      const pid = projetIds[i];
      if (!pid) continue;

      await api(`/projets/${pid}/suivre`, 'POST', {}, token);
      followCount++;
      await sleep(100);
    }
  }
  ok(`${followCount} follows`);

  // ---------- RESUME ----------
  console.log('\n========================================');
  console.log('  SEED V2 TERMINE !');
  console.log('========================================');
  console.log(`  17 nouveaux comptes (20 total)`);
  console.log(`  5 projets crees + publies avec images`);
  console.log(`  + NovaPay corrige et publie`);
  console.log(`  ${POSTS.length} posts avec photos Unsplash`);
  console.log(`  ${commentCount} commentaires`);
  console.log(`  ${likeCount} likes`);
  console.log(`  ${followCount} follows sur les projets`);
  console.log(`\n  Mot de passe commun : ${MDP}`);
  console.log('');
}

main().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
