/**
 * Constantes Boutique
 * Donnees statiques, mocks marketplace, helpers de prix
 * Extraits de services/boutique.ts
 */

import type { CertificationPlan, BoostGoal, BoostBundle, MarketplaceCategoryItem, MarketplaceProduct, MarketplaceCategory, PriceBreakdown } from '../types/boutique';

// ============ CERTIFICATION (LPP+) ============

export const CERTIFICATION_PLAN: CertificationPlan = {
  id: 'lpp-plus',
  name: 'LPP+',
  price: 2.99,
  currency: 'EUR',
  interval: 'month',
  benefits: [
    { icon: 'checkmark-circle', text: 'Badge Verifie visible sur votre profil' },
    { icon: 'shield-checkmark', text: 'Confirme votre identite aupres de la communaute' },
    { icon: 'stats-chart', text: 'Acces aux statistiques detaillees de vos publications' },
    { icon: 'pricetag', text: '-10% sur toutes les mises en avant' },
    { icon: 'headset', text: 'Support prioritaire en cas de besoin' },
  ],
};

// ============ BOOST GOALS (3 objectifs, 3 intensites chacun) ============

export const BOOST_GOALS: BoostGoal[] = [
  {
    id: 'publication',
    titre: 'Exposer un contenu',
    sousTitre: 'Placez votre publication en vitrine aupres de la communaute',
    icon: 'easel-outline',
    color: '#6366F1',
    intensities: [
      { id: 'pub-decouverte', name: 'Decouverte', label: 'Un coup de pouce rapide', duree: '24h', jours: 1, prix: 2.99, devise: 'EUR', estimateLabel: '~quelques centaines de vues' },
      { id: 'pub-croissance', name: 'Croissance', label: 'Visibilite soutenue sur une semaine', duree: '7 jours', jours: 7, prix: 7.99, devise: 'EUR', estimateLabel: '~davantage de portee', recommended: true },
      { id: 'pub-impact', name: 'Impact', label: 'Visibilite maximale sur un mois', duree: '30 jours', jours: 30, prix: 19.99, devise: 'EUR', estimateLabel: '~portee etendue' },
    ],
  },
  {
    id: 'profil',
    titre: 'Presenter votre profil',
    sousTitre: 'Positionnez-vous aupres de nouveaux membres',
    icon: 'podium-outline',
    color: '#8B5CF6',
    intensities: [
      { id: 'profil-decouverte', name: 'Decouverte', label: 'Un coup de pouce rapide', duree: '24h', jours: 1, prix: 3.99, devise: 'EUR', estimateLabel: '~quelques dizaines de visites' },
      { id: 'profil-croissance', name: 'Croissance', label: 'Visibilite soutenue sur une semaine', duree: '7 jours', jours: 7, prix: 9.99, devise: 'EUR', estimateLabel: '~davantage de visites', recommended: true },
      { id: 'profil-impact', name: 'Impact', label: 'Visibilite maximale sur un mois', duree: '30 jours', jours: 30, prix: 24.99, devise: 'EUR', estimateLabel: '~portee etendue' },
    ],
  },
  {
    id: 'projet',
    titre: 'Poser la premiere pierre',
    sousTitre: 'Faites decouvrir votre projet a la communaute',
    icon: 'cube-outline',
    color: '#A78BFA',
    intensities: [
      { id: 'projet-decouverte', name: 'Decouverte', label: 'Un coup de pouce rapide', duree: '24h', jours: 1, prix: 4.99, devise: 'EUR', estimateLabel: '~premiers retours' },
      { id: 'projet-croissance', name: 'Croissance', label: 'Visibilite soutenue sur une semaine', duree: '7 jours', jours: 7, prix: 12.99, devise: 'EUR', estimateLabel: '~davantage de decouvertes', recommended: true },
      { id: 'projet-impact', name: 'Impact', label: 'Visibilite maximale sur un mois', duree: '30 jours', jours: 30, prix: 29.99, devise: 'EUR', estimateLabel: '~portee etendue' },
    ],
  },
];

// ============ BUNDLES ============

export const BOOST_BUNDLES: BoostBundle[] = [
  {
    id: 'bundle-lancement',
    titre: 'Pack Lancement',
    description: 'Publication + Profil — 7 jours',
    contenu: ['Boost publication Croissance (7j)', 'Boost profil Croissance (7j)'],
    prixSepare: 17.98,
    prixPack: 14.99,
    devise: 'EUR',
    economie: 17,
    icon: 'layers-outline',
    color: '#6366F1',
  },
  {
    id: 'bundle-projet',
    titre: 'Pack Projet',
    description: 'Projet + Publication — 7 jours',
    contenu: ['Boost projet Croissance (7j)', 'Boost publication Croissance (7j)'],
    prixSepare: 20.98,
    prixPack: 17.99,
    devise: 'EUR',
    economie: 14,
    icon: 'construct-outline',
    color: '#A78BFA',
  },
];

// ============ DISCOUNTS ============

export const WELCOME_DISCOUNT = 0.50; // -50%
export const LPP_PLUS_DISCOUNT = 0.10; // -10%

/** Calculer le prix final avec reductions */
export function calculatePrice(
  basePrice: number,
  isFirstBoost: boolean,
  isLppPlus: boolean,
): PriceBreakdown {
  let current = basePrice;
  const welcomeAmount = isFirstBoost ? current * WELCOME_DISCOUNT : 0;
  current -= welcomeAmount;
  const lppPlusAmount = isLppPlus ? current * LPP_PLUS_DISCOUNT : 0;
  current -= lppPlusAmount;

  return {
    base: basePrice,
    welcomeDiscount: Math.round(welcomeAmount * 100) / 100,
    lppPlusDiscount: Math.round(lppPlusAmount * 100) / 100,
    total: Math.round(current * 100) / 100,
    hasWelcome: isFirstBoost,
    hasLppPlus: isLppPlus,
  };
}

/** Calculer le prix bundle avec reduction LPP+ */
export function calculateBundlePrice(
  bundle: BoostBundle,
  isLppPlus: boolean,
): { total: number; lppPlusDiscount: number } {
  const base = bundle.prixPack;
  const lppPlusAmount = isLppPlus ? base * LPP_PLUS_DISCOUNT : 0;
  return {
    total: Math.round((base - lppPlusAmount) * 100) / 100,
    lppPlusDiscount: Math.round(lppPlusAmount * 100) / 100,
  };
}

// ============ MARKETPLACE CATEGORIES ============

export const MARKETPLACE_CATEGORIES: MarketplaceCategoryItem[] = [
  { id: 'tous', label: 'Tous', icon: 'grid-outline' },
  { id: 'service', label: 'Services', icon: 'briefcase-outline' },
  { id: 'formation', label: 'Formations', icon: 'school-outline' },
  { id: 'produit', label: 'Produits', icon: 'cube-outline' },
  { id: 'outil', label: 'Outils', icon: 'construct-outline' },
  { id: 'accompagnement', label: 'Accompagnement', icon: 'people-outline' },
];

// ============ MOCK MARKETPLACE PRODUCTS ============

const mockCreateur = (id: string, nom: string, avatar?: string, note = 4.8, ventes = 42, reponse = '< 2h', completion = 98, depuis = 'Mars 2025') => ({
  id, nom, avatar, note, ventesRealisees: ventes, tempsReponse: reponse, tauxCompletion: completion, membreDepuis: depuis,
});

export const MOCK_MARKETPLACE_PRODUCTS: MarketplaceProduct[] = [
  {
    id: 'mp-1',
    nom: 'Coaching lancement startup',
    description: '4 sessions individuelles pour structurer votre projet et definir votre strategie.',
    descriptionLongue: 'Vous avez une idee de startup mais vous ne savez pas par ou commencer ?\n\nJe vous propose 4 sessions individuelles de coaching pour :\n\n- Clarifier votre vision et votre proposition de valeur\n- Valider votre marche avec des methodes concretes (interviews, landing page test)\n- Definir votre strategie de lancement et votre MVP\n- Preparer votre pitch pour convaincre partenaires et investisseurs\n\nChaque session dure 1h en visio. Un compte-rendu ecrit vous est envoye apres chaque session avec un plan d\'action clair.',
    categorie: 'accompagnement',
    prix: 149.00,
    devise: 'EUR',
    image: 'https://picsum.photos/seed/startup-coaching/400/300',
    gallery: ['https://picsum.photos/seed/coaching-2/400/300', 'https://picsum.photos/seed/coaching-3/400/300'],
    createur: mockCreateur('u-1', 'Amelie Durand', 'https://picsum.photos/seed/amelie-d/100/100', 4.9, 67, '< 1h', 100, 'Janvier 2025'),
    tags: ['Coaching', 'Startup', 'Strategie'],
    estNouveau: true,
    delaiLivraison: '7 jours',
    commandesRealisees: 67,
    noteGlobale: 4.9,
    nombreAvis: 23,
    reviews: [
      { id: 'r-1a', auteur: 'Sophie L.', note: 5, commentaire: 'Amelie est incroyable. Elle m\'a aide a structurer mon projet en 4 sessions. Je recommande vivement.', date: '2025-12-15' },
      { id: 'r-1b', auteur: 'Karim B.', avatar: 'https://picsum.photos/seed/karim/100/100', note: 5, commentaire: 'Tres professionnel. Les comptes-rendus ecrits sont un vrai plus.', date: '2025-11-28' },
      { id: 'r-1c', auteur: 'Marie P.', note: 4, commentaire: 'Bon coaching, j\'aurais aime une session supplementaire sur le pitch.', date: '2025-10-10' },
    ],
    options: [
      { id: 'opt-1a', label: 'Session supplementaire', description: '1 session de suivi apres le programme', prix: 49.00, devise: 'EUR' },
      { id: 'opt-1b', label: 'Relecture business plan', description: 'Relecture et feedback detaille sur votre BP', prix: 39.00, devise: 'EUR' },
    ],
    faq: [
      { question: 'Quel est le format des sessions ?', answer: 'Visio 1h via Google Meet ou Zoom, selon votre preference.' },
      { question: 'Peut-on etaler les sessions ?', answer: 'Oui, le rythme est flexible. La plupart des clients font 1 session par semaine.' },
    ],
  },
  {
    id: 'mp-2',
    nom: 'Creation site web vitrine',
    description: 'Site web professionnel cle en main, responsive et optimise SEO.',
    descriptionLongue: 'Je cree votre site web vitrine professionnel de A a Z.\n\nCe que vous obtenez :\n- Design sur mesure adapte a votre identite visuelle\n- Site responsive (mobile, tablette, desktop)\n- Optimisation SEO de base (balises, meta, sitemap)\n- Formulaire de contact fonctionnel\n- Integration Google Analytics\n- 2 allers-retours de modifications inclus\n\nLivraison sous 2 semaines. Je travaille avec WordPress ou des solutions modernes (Next.js, Webflow) selon vos besoins.',
    categorie: 'service',
    prix: 499.00,
    devise: 'EUR',
    image: 'https://picsum.photos/seed/web-design/400/300',
    gallery: ['https://picsum.photos/seed/web-2/400/300', 'https://picsum.photos/seed/web-3/400/300', 'https://picsum.photos/seed/web-4/400/300'],
    createur: mockCreateur('u-2', 'Thomas Martin', 'https://picsum.photos/seed/thomas-m/100/100', 4.8, 124, '< 3h', 97, 'Novembre 2024'),
    tags: ['Web', 'Design', 'SEO'],
    delaiLivraison: '14 jours',
    commandesRealisees: 124,
    noteGlobale: 4.8,
    nombreAvis: 52,
    reviews: [
      { id: 'r-2a', auteur: 'Claire D.', avatar: 'https://picsum.photos/seed/claire/100/100', note: 5, commentaire: 'Site livre en avance, design superbe. Thomas est tres reactif.', date: '2026-01-20' },
      { id: 'r-2b', auteur: 'Jean M.', note: 5, commentaire: 'Excellent travail. Mon site est exactement ce que je voulais.', date: '2025-12-08' },
      { id: 'r-2c', auteur: 'Fatima A.', note: 4, commentaire: 'Tres bon resultat. Le delai a ete legerement depasse mais le resultat en vaut la peine.', date: '2025-11-15' },
    ],
    options: [
      { id: 'opt-2a', label: 'Page supplementaire', description: 'Ajout d\'une page au site', prix: 79.00, devise: 'EUR' },
      { id: 'opt-2b', label: 'Blog integre', description: 'Section blog avec CMS', prix: 149.00, devise: 'EUR' },
      { id: 'opt-2c', label: 'Maintenance 3 mois', description: 'Mises a jour et support pendant 3 mois', prix: 99.00, devise: 'EUR' },
    ],
    faq: [
      { question: 'Quel CMS utilisez-vous ?', answer: 'WordPress par defaut. Webflow ou Next.js sur demande (supplement possible).' },
      { question: 'Le nom de domaine est-il inclus ?', answer: 'Non, mais je vous guide pour l\'achat et la configuration.' },
    ],
  },
  {
    id: 'mp-3',
    nom: 'Formation reseaux sociaux',
    description: '8 modules video pour maitriser Instagram, LinkedIn et TikTok.',
    descriptionLongue: 'Formez-vous aux reseaux sociaux avec 8 modules video progressifs.\n\nProgramme :\n1. Definir sa strategie de contenu\n2. Instagram : optimiser son profil et creer des Reels\n3. LinkedIn : personal branding et networking\n4. TikTok : comprendre l\'algorithme\n5. Calendrier editorial : planifier 1 mois de contenu\n6. Hashtags et SEO social\n7. Analyser ses performances\n8. Monetiser sa communaute\n\nChaque module inclut des exercices pratiques et des templates telechargeables.',
    categorie: 'formation',
    prix: 79.00,
    devise: 'EUR',
    image: 'https://picsum.photos/seed/social-media/400/300',
    createur: mockCreateur('u-3', 'Sarah Benali', undefined, 4.7, 89, '< 4h', 99, 'Fevrier 2025'),
    tags: ['Marketing', 'Reseaux sociaux', 'Formation'],
    estNouveau: true,
    delaiLivraison: 'Acces immediat',
    commandesRealisees: 89,
    noteGlobale: 4.7,
    nombreAvis: 34,
    reviews: [
      { id: 'r-3a', auteur: 'Luc R.', note: 5, commentaire: 'Formation tres complete. J\'ai double mes abonnes en 2 mois.', date: '2026-01-05' },
      { id: 'r-3b', auteur: 'Emma G.', avatar: 'https://picsum.photos/seed/emma/100/100', note: 4, commentaire: 'Bon contenu, les templates sont un vrai gain de temps.', date: '2025-12-22' },
    ],
    faq: [
      { question: 'Les modules sont-ils accessibles a vie ?', answer: 'Oui, une fois achetee la formation est accessible sans limite de temps.' },
    ],
  },
  {
    id: 'mp-4',
    nom: 'Template business plan',
    description: 'Modele professionnel en Notion et Google Docs avec guide.',
    descriptionLongue: 'Un business plan professionnel pret a remplir.\n\nVous recevez :\n- Template Notion complet (duplicable)\n- Version Google Docs (modifiable)\n- Guide de remplissage section par section\n- 3 exemples de business plans remplis dans differents secteurs\n- Checklist des erreurs a eviter\n\nIdeal pour presenter votre projet a des investisseurs, banques ou concours.',
    categorie: 'outil',
    prix: 29.00,
    devise: 'EUR',
    image: 'https://picsum.photos/seed/business-plan/400/300',
    createur: mockCreateur('u-4', 'Marc Petit', 'https://picsum.photos/seed/marc-p/100/100', 4.6, 203, '< 6h', 96, 'Septembre 2024'),
    tags: ['Business plan', 'Template', 'Notion'],
    delaiLivraison: 'Acces immediat',
    commandesRealisees: 203,
    noteGlobale: 4.6,
    nombreAvis: 78,
    reviews: [
      { id: 'r-4a', auteur: 'Antoine V.', note: 5, commentaire: 'Exactement ce qu\'il me fallait. Les exemples sont tres utiles.', date: '2026-02-01' },
      { id: 'r-4b', auteur: 'Nadia K.', note: 4, commentaire: 'Bon template, le guide est clair.', date: '2025-11-30' },
    ],
  },
  {
    id: 'mp-5',
    nom: 'Design logo et identite visuelle',
    description: 'Logo vectoriel + charte graphique complete.',
    descriptionLongue: 'Je cree votre identite visuelle complete.\n\nLe pack inclut :\n- 3 propositions de logo\n- Logo final en vectoriel (SVG, AI, PDF)\n- Declinaisons (couleur, N&B, icone)\n- Charte graphique : typographies, palette couleurs, regles d\'utilisation\n- Fichiers prets pour le web et l\'impression\n\nRetouches illimitees jusqu\'a satisfaction. Je travaille a partir d\'un brief detaille que nous remplissons ensemble.',
    categorie: 'service',
    prix: 199.00,
    devise: 'EUR',
    image: 'https://picsum.photos/seed/logo-branding/400/300',
    gallery: ['https://picsum.photos/seed/logo-2/400/300', 'https://picsum.photos/seed/logo-3/400/300'],
    createur: mockCreateur('u-5', 'Julie Chen', undefined, 4.9, 156, '< 2h', 99, 'Juillet 2024'),
    tags: ['Design', 'Branding', 'Logo'],
    delaiLivraison: '5 jours',
    commandesRealisees: 156,
    noteGlobale: 4.9,
    nombreAvis: 61,
    reviews: [
      { id: 'r-5a', auteur: 'Pierre L.', avatar: 'https://picsum.photos/seed/pierre/100/100', note: 5, commentaire: 'Julie a un talent fou. Mon logo est parfait.', date: '2026-01-18' },
      { id: 'r-5b', auteur: 'Alexia M.', note: 5, commentaire: 'Tres satisfaite. Retouches rapides et communication top.', date: '2025-12-05' },
    ],
    faq: [
      { question: 'Combien de retouches sont incluses ?', answer: 'Retouches illimitees jusqu\'a votre satisfaction.' },
      { question: 'Quels formats de fichiers ?', answer: 'SVG, AI, PDF, PNG haute resolution.' },
    ],
  },
  {
    id: 'mp-6',
    nom: 'Mentorat entrepreneur 3 mois',
    description: 'Accompagnement personnalise avec un entrepreneur experimente.',
    descriptionLongue: 'Un accompagnement sur mesure pendant 3 mois.\n\nLe programme :\n- 2 sessions individuelles par mois (1h en visio)\n- Acces a un groupe prive de mentores (entraide, partage)\n- Support par message entre les sessions\n- Suivi de vos objectifs avec tableaux de bord\n\nJe suis entrepreneur depuis 12 ans et j\'ai accompagne plus de 50 porteurs de projets. Mon approche est pragmatique : on se concentre sur les actions qui generent des resultats.',
    categorie: 'accompagnement',
    prix: null,
    devise: 'EUR',
    image: 'https://picsum.photos/seed/mentoring/400/300',
    createur: mockCreateur('u-6', 'David Moreau', 'https://picsum.photos/seed/david-m/100/100', 5.0, 31, '< 1h', 100, 'Mars 2025'),
    tags: ['Mentorat', 'Suivi', 'Entrepreneur'],
    delaiLivraison: 'Debut sous 7 jours',
    commandesRealisees: 31,
    noteGlobale: 5.0,
    nombreAvis: 18,
    reviews: [
      { id: 'r-6a', auteur: 'Romain T.', note: 5, commentaire: 'David est un mentor exceptionnel. Son experience fait toute la difference.', date: '2026-02-10' },
      { id: 'r-6b', auteur: 'Laura F.', avatar: 'https://picsum.photos/seed/laura/100/100', note: 5, commentaire: 'Le groupe prive est une mine d\'or. Merci David.', date: '2025-12-20' },
    ],
  },
  {
    id: 'mp-7',
    nom: 'Shooting photo professionnel',
    description: 'Seance photo 2h, 15 photos retouchees livrees sous 5 jours.',
    descriptionLongue: 'Shooting photo professionnel pour entrepreneurs et porteurs de projets.\n\nLa seance comprend :\n- 2h de shooting en studio ou en exterieur (Paris/IDF)\n- Direction artistique et conseil posing\n- 15 photos retouchees (colorimetrie, peau, cadrage)\n- Livraison haute resolution + versions web optimisees\n- Droit d\'utilisation commercial inclus\n\nIdeal pour votre profil LinkedIn, votre site web et vos reseaux sociaux.',
    categorie: 'service',
    prix: 89.00,
    devise: 'EUR',
    image: 'https://picsum.photos/seed/photo-shoot/400/300',
    gallery: ['https://picsum.photos/seed/photo-2/400/300', 'https://picsum.photos/seed/photo-3/400/300'],
    createur: mockCreateur('u-7', 'Camille Roy', undefined, 4.8, 95, '< 3h', 98, 'Octobre 2024'),
    tags: ['Photo', 'Image', 'Portrait'],
    estNouveau: true,
    delaiLivraison: '5 jours',
    commandesRealisees: 95,
    noteGlobale: 4.8,
    nombreAvis: 41,
    reviews: [
      { id: 'r-7a', auteur: 'Hugo D.', note: 5, commentaire: 'Photos magnifiques. Camille met tres a l\'aise.', date: '2026-01-25' },
      { id: 'r-7b', auteur: 'Ines S.', note: 4, commentaire: 'Belles photos, bon rapport qualite-prix.', date: '2025-11-18' },
    ],
    options: [
      { id: 'opt-7a', label: '+10 photos', description: '10 photos retouchees supplementaires', prix: 49.00, devise: 'EUR' },
      { id: 'opt-7b', label: 'Video 30s', description: 'Clip video portrait anime', prix: 69.00, devise: 'EUR' },
    ],
  },
  {
    id: 'mp-8',
    nom: 'Formation copywriting',
    description: 'Apprenez a ecrire des textes qui convertissent.',
    descriptionLongue: '6 modules pour maitriser le copywriting.\n\nProgramme :\n1. Les fondamentaux : AIDA, PAS, Before/After/Bridge\n2. Pages de vente : structure et techniques\n3. Emails marketing : sequences qui convertissent\n4. Posts LinkedIn : devenir visible et credible\n5. Fiches produit : transformer les visiteurs en acheteurs\n6. Headlines : ecrire des titres irresistibles\n\nChaque module inclut :\n- Video (20-30 min)\n- Exercice pratique avec correction type\n- Templates a reutiliser',
    categorie: 'formation',
    prix: 59.00,
    devise: 'EUR',
    image: 'https://picsum.photos/seed/copywriting/400/300',
    createur: mockCreateur('u-8', 'Lucas Fontaine', 'https://picsum.photos/seed/lucas-f/100/100', 4.7, 145, '< 5h', 97, 'Aout 2024'),
    tags: ['Copywriting', 'Marketing', 'Ecriture'],
    delaiLivraison: 'Acces immediat',
    commandesRealisees: 145,
    noteGlobale: 4.7,
    nombreAvis: 56,
    reviews: [
      { id: 'r-8a', auteur: 'Mathilde V.', avatar: 'https://picsum.photos/seed/mathilde/100/100', note: 5, commentaire: 'Excellente formation. Les templates sont un vrai gain de temps.', date: '2026-02-05' },
      { id: 'r-8b', auteur: 'Yann C.', note: 4, commentaire: 'Contenu solide, j\'aurais voulu plus d\'exemples concrets.', date: '2025-12-12' },
    ],
  },
  {
    id: 'mp-9',
    nom: 'Audit SEO complet',
    description: 'Analyse technique et semantique avec plan d\'action.',
    descriptionLongue: 'Audit SEO complet de votre site web.\n\nCe que vous recevez :\n- Analyse technique (vitesse, mobile, crawl)\n- Audit semantique (mots-cles, contenu, structure)\n- Analyse de la concurrence (top 5 concurrents)\n- Rapport detaille (20-30 pages)\n- Plan d\'action priorise avec quick wins\n- 1 session de debrief en visio (30 min)\n\nOutils utilises : SEMrush, Screaming Frog, Google Search Console, PageSpeed Insights.',
    categorie: 'service',
    prix: 149.00,
    devise: 'EUR',
    image: 'https://picsum.photos/seed/seo-audit/400/300',
    createur: mockCreateur('u-9', 'Nina Kovac', undefined, 4.8, 72, '< 2h', 99, 'Decembre 2024'),
    tags: ['SEO', 'Audit', 'Marketing'],
    delaiLivraison: '7 jours',
    commandesRealisees: 72,
    noteGlobale: 4.8,
    nombreAvis: 29,
    reviews: [
      { id: 'r-9a', auteur: 'Olivier B.', note: 5, commentaire: 'Rapport tres detaille et actionnable. Nina connait son sujet.', date: '2026-01-30' },
      { id: 'r-9b', auteur: 'Sandra L.', note: 5, commentaire: 'Le debrief en visio est un vrai plus. Recommande.', date: '2025-11-22' },
    ],
    faq: [
      { question: 'De quoi avez-vous besoin pour demarrer ?', answer: 'Juste l\'URL de votre site et vos acces Google Search Console (optionnel).' },
    ],
  },
  {
    id: 'mp-10',
    nom: 'Kit communication digitale',
    description: 'Pack de 30 templates Canva pour vos reseaux sociaux.',
    descriptionLongue: '30 templates editables pour vos reseaux sociaux.\n\nLe kit comprend :\n- 15 templates Instagram (posts + stories)\n- 10 templates LinkedIn (posts + carrousels)\n- 5 templates universels (citations, temoignages, promotions)\n- Guide d\'utilisation et bonnes pratiques\n- Palette de couleurs personnalisable\n\nTous les templates sont au format Canva (gratuit). Il vous suffit de dupliquer et personnaliser avec votre contenu.',
    categorie: 'produit',
    prix: 39.00,
    devise: 'EUR',
    image: 'https://picsum.photos/seed/comm-kit/400/300',
    gallery: ['https://picsum.photos/seed/kit-2/400/300'],
    createur: mockCreateur('u-10', 'Paul Lefebvre', 'https://picsum.photos/seed/paul-l/100/100', 4.5, 310, '< 1h', 95, 'Juin 2024'),
    tags: ['Templates', 'Communication', 'Canva'],
    delaiLivraison: 'Acces immediat',
    commandesRealisees: 310,
    noteGlobale: 4.5,
    nombreAvis: 112,
    reviews: [
      { id: 'r-10a', auteur: 'Lea T.', note: 5, commentaire: 'Super kit, les templates sont modernes et faciles a personnaliser.', date: '2026-02-14' },
      { id: 'r-10b', auteur: 'Kevin M.', avatar: 'https://picsum.photos/seed/kevin/100/100', note: 4, commentaire: 'Bon rapport qualite-prix. J\'aurais aime plus de templates LinkedIn.', date: '2025-12-28' },
      { id: 'r-10c', auteur: 'Julie D.', note: 5, commentaire: 'Exactement ce que je cherchais. Gain de temps enorme.', date: '2025-11-05' },
    ],
  },
];

// ============ HELPERS ============

/** Formater un prix */
export function formatPrice(price: number): string {
  return price.toFixed(2).replace('.', ',') + '\u00A0\u20AC';
}

/** Filtrer les produits marketplace par categorie */
export function getMarketplaceProducts(categorie: MarketplaceCategory): MarketplaceProduct[] {
  if (categorie === 'tous') return MOCK_MARKETPLACE_PRODUCTS;
  return MOCK_MARKETPLACE_PRODUCTS.filter(p => p.categorie === categorie);
}

/** Formater le prix d'un produit marketplace */
export function formatProductPrice(prix: number | null): string {
  if (prix === null) return 'Sur devis';
  if (prix === 0) return 'Gratuit';
  return formatPrice(prix);
}

/** Obtenir le label d'une categorie */
export function getCategoryLabel(categorie: MarketplaceCategory): string {
  const cat = MARKETPLACE_CATEGORIES.find(c => c.id === categorie);
  return cat?.label || categorie;
}
