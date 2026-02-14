/**
 * Remplir les champs Marche + Documents + Equipe + Metriques + Liens pour tous les projets
 */
const API = 'https://siteweb-back-lpp-v1.onrender.com/api';
const MDP = 'DemoLpp2025!';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function api(endpoint, method, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${endpoint}`, opts);
  if (res.status === 429) {
    console.log('  ⏳ Rate limited, pause 15s...');
    await sleep(15000);
    const res2 = await fetch(`${API}${endpoint}`, opts);
    return res2.json();
  }
  return res.json();
}

const PROJETS_UPDATE = {
  'yasmine.belkacem@demo.lpp.fr': {
    projetNom: 'NovaPay',
    update: {
      probleme: "En Afrique francophone, 60% des adultes n'ont pas de compte bancaire. Les solutions existantes sont couteuses (frais de 3-5%) et peu accessibles aux populations rurales.",
      solution: "NovaPay propose des frais a 0.5%, une inscription en 2 minutes avec simple piece d'identite, et fonctionne meme sans connexion internet via USSD.",
      avantageConcurrentiel: "3x moins cher que Orange Money, fonctionne en mode USSD (pas besoin de smartphone), API ouverte pour les commercants. Licence reglementaire obtenue au Senegal.",
      cible: "Commercants, PME et particuliers en Afrique de l'Ouest (Senegal, Cote d'Ivoire, Mali, Burkina Faso, Guinee). 80M de personnes non-bancarisees.",
      businessModel: "Commission de 0.5% par transaction + abonnement premium pour les entreprises (gestion de tresorerie, analytics, multi-utilisateurs). Objectif: 2M€ ARR en 2026.",
      objectifFinancement: 500000,
      montantLeve: 120000,
      progression: 24,
      metriques: [
        { label: 'Utilisateurs actifs', valeur: '12 400' },
        { label: 'Transactions/mois', valeur: '45 000' },
        { label: 'Volume mensuel', valeur: '2.1M FCFA' },
        { label: 'Retention M3', valeur: '72%' },
      ],
      liens: [
        { type: 'site', label: 'Site web', url: 'https://novapay.example.com' },
        { type: 'linkedin', label: 'LinkedIn', url: 'https://linkedin.com/company/novapay' },
        { type: 'twitter', label: 'Twitter', url: 'https://twitter.com/novapay_africa' },
      ],
      equipe: [
        { nom: 'Yasmine Belkacem', role: 'founder', titre: 'CEO & Fondatrice' },
        { nom: 'Oumar Diop', role: 'cto', titre: 'CTO — Ex-Stripe' },
        { nom: 'Aicha Sow', role: 'cmo', titre: 'Head of Growth — Ex-Wave' },
      ],
      documents: [
        { nom: 'Pitch Deck NovaPay 2025', url: 'https://example.com/novapay-deck.pdf', type: 'pdf', visibilite: 'public' },
        { nom: 'Business Plan', url: 'https://example.com/novapay-bp.pdf', type: 'pdf', visibilite: 'private' },
      ],
    },
  },
  'mehdi.amrani@demo.lpp.fr': {
    projetNom: 'GreenLoop',
    update: {
      probleme: "8 millions de tonnes de plastique finissent dans les oceans chaque annee. En Afrique du Nord, moins de 10% des dechets plastiques sont recycles. Le plastique s'accumule dans les villes.",
      solution: "Un procede industriel low-cost brevete qui transforme le plastique non recyclable en briques et dalles de construction, 40% moins cheres que le beton.",
      avantageConcurrentiel: "Procede brevete unique, couts de production 40% inferieurs au beton, double impact (environnemental + emploi local). 3 centres deja operationnels.",
      cible: "Entreprises BTP, collectivites locales, promoteurs immobiliers au Maroc et en Afrique de l'Ouest. Marche du BTP au Maroc : 12Md€/an.",
      businessModel: "Vente de materiaux de construction (marge 35%) + licence du procede aux industriels locaux (royalties 5%) + credits carbone certifies.",
      objectifFinancement: 350000,
      montantLeve: 85000,
      progression: 24,
      metriques: [
        { label: 'Tonnes recyclees', valeur: '120' },
        { label: 'Emplois crees', valeur: '18' },
        { label: 'Centres operationnels', valeur: '3' },
        { label: 'CA mensuel', valeur: '15k€' },
      ],
      liens: [
        { type: 'site', label: 'Site web', url: 'https://greenloop.example.com' },
        { type: 'linkedin', label: 'LinkedIn', url: 'https://linkedin.com/company/greenloop-maroc' },
        { type: 'youtube', label: 'Video procede', url: 'https://youtube.com/watch?v=greenloop' },
      ],
      equipe: [
        { nom: 'Mehdi Amrani', role: 'founder', titre: 'CEO & Fondateur' },
        { nom: 'Karim Tazi', role: 'cto', titre: 'Directeur technique — Ingenieur materiaux' },
        { nom: 'Nora El Idrissi', role: 'sales', titre: 'Directrice commerciale' },
      ],
      documents: [
        { nom: 'Pitch Deck GreenLoop', url: 'https://example.com/greenloop-deck.pdf', type: 'pdf', visibilite: 'public' },
        { nom: 'Certification materiaux', url: 'https://example.com/greenloop-certif.pdf', type: 'pdf', visibilite: 'public' },
      ],
    },
  },
  'fatou.diallo@demo.lpp.fr': {
    projetNom: 'SolanaBio',
    update: {
      probleme: "Les cosmetiques bio sont souvent importes et inabordables en Afrique (30-80€ le soin). Les savoir-faire locaux et ingredients africains sont sous-valorises sur le marche mondial.",
      solution: "Des soins visage, corps et cheveux premium a base de karite, baobab, moringa et bissap. Certifies bio, cruelty-free, fabriques a Dakar.",
      avantageConcurrentiel: "Ingredients sources directement aux productrices locales (circuit court), 12 femmes employees, prix 3x moins cher que les marques bio importees.",
      cible: "Femmes 20-45 ans en Afrique de l'Ouest + diaspora en Europe. Marche cosmetique en Afrique : 7Md$ d'ici 2027.",
      businessModel: "Vente en ligne D2C (marge 65%) + distribution en boutiques partenaires (marge 40%) + box abonnement mensuelle (29€/mois, 580 abonnees).",
      objectifFinancement: 200000,
      montantLeve: 145000,
      progression: 72,
      metriques: [
        { label: 'Produits vendus', valeur: '8 200' },
        { label: 'Clientes actives', valeur: '3 100' },
        { label: 'Note moyenne', valeur: '4.8/5' },
        { label: 'CA mensuel', valeur: '22k€' },
      ],
      liens: [
        { type: 'site', label: 'Boutique en ligne', url: 'https://solanabio.example.com' },
        { type: 'instagram', label: 'Instagram', url: 'https://instagram.com/solanabio' },
        { type: 'tiktok', label: 'TikTok', url: 'https://tiktok.com/@solanabio' },
      ],
      equipe: [
        { nom: 'Fatou Diallo', role: 'founder', titre: 'Fondatrice & Directrice artistique' },
        { nom: 'Awa Ndiaye', role: 'other', titre: 'Responsable production' },
        { nom: 'Marc Lefebvre', role: 'marketing', titre: 'Directeur digital — Ex-L\'Oreal' },
      ],
      documents: [
        { nom: 'Lookbook SolanaBio 2025', url: 'https://example.com/solanabio-lookbook.pdf', type: 'pdf', visibilite: 'public' },
        { nom: 'Certificat Bio Ecocert', url: 'https://example.com/solanabio-bio.pdf', type: 'pdf', visibilite: 'public' },
      ],
    },
  },
  'lea.nguyen@demo.lpp.fr': {
    projetNom: 'EduSpark',
    update: {
      probleme: "30% des eleves de college decrochent en maths car l'enseignement classique ne s'adapte pas a leur rythme. Les profs manquent d'outils de personnalisation.",
      solution: "Un assistant IA pour enseignants qui genere des exercices adaptes au niveau de chaque eleve en temps reel. Analyse du rythme, du style d'apprentissage et des lacunes.",
      avantageConcurrentiel: "Modele IA entraine sur 500 000 exercices du programme francais, integration directe avec Pronote/ENT, resultat prouve (+23% en 3 mois).",
      cible: "Colleges et lycees en France (7 400 etablissements), enseignants de maths et sciences. Marche EdTech France : 1.2Md€.",
      businessModel: "SaaS B2B : abonnement par etablissement (2 500€/an pour 500 eleves) + version freemium pour les particuliers (9.90€/mois premium).",
      objectifFinancement: 600000,
      montantLeve: 50000,
      progression: 8,
      metriques: [
        { label: 'Ecoles pilotes', valeur: '12' },
        { label: 'Eleves testes', valeur: '850' },
        { label: 'Amelioration maths', valeur: '+23%' },
        { label: 'NPS enseignants', valeur: '78' },
      ],
      liens: [
        { type: 'site', label: 'Site web', url: 'https://eduspark.example.com' },
        { type: 'linkedin', label: 'LinkedIn', url: 'https://linkedin.com/company/eduspark-ai' },
      ],
      equipe: [
        { nom: 'Lea Nguyen', role: 'cto', titre: 'CTO & Cofondatrice — Ex-Doctolib' },
        { nom: 'Pierre Vasseur', role: 'founder', titre: 'CEO — Ex-prof de maths agrege' },
        { nom: 'Julie Chen', role: 'other', titre: 'Lead Data Scientist — PhD Sorbonne' },
      ],
      documents: [
        { nom: 'Resultats pilote 2025', url: 'https://example.com/eduspark-pilote.pdf', type: 'pdf', visibilite: 'public' },
        { nom: 'Pitch Deck EduSpark', url: 'https://example.com/eduspark-deck.pptx', type: 'pptx', visibilite: 'public' },
      ],
    },
  },
  'antoine.roche@demo.lpp.fr': {
    projetNom: 'Colis Vert',
    update: {
      probleme: "La livraison dernier kilometre represente 25% des emissions CO2 urbaines. Les camionnettes diesel bloquent le trafic et polluent les centres-villes.",
      solution: "Un reseau de micro-hubs urbains + flotte de 35 velos cargos electriques. Livraison en 2h, 100% decarbonee, moins chere que les solutions classiques.",
      avantageConcurrentiel: "Zero emission, 30% moins cher que Chronopost en centre-ville, livraison plus rapide (pas de bouchons). Partenariat exclusif avec 3 mairies.",
      cible: "E-commercants, enseignes retail, restaurateurs en zone urbaine dense. 3 villes couvertes (Lyon, Grenoble, Saint-Etienne). Marche dernier km France : 4Md€.",
      businessModel: "Tarification au colis (2-5€ selon taille/urgence) + abonnement mensuel pour les pros (a partir de 199€/mois pour 100 colis). Marge brute : 28%.",
      objectifFinancement: 400000,
      montantLeve: 280000,
      progression: 70,
      metriques: [
        { label: 'Colis/jour', valeur: '800' },
        { label: 'Villes couvertes', valeur: '3' },
        { label: 'Tonnes CO2 evitees', valeur: '45' },
        { label: 'Clients pro', valeur: '120' },
      ],
      liens: [
        { type: 'site', label: 'Site web', url: 'https://colisvert.example.com' },
        { type: 'linkedin', label: 'LinkedIn', url: 'https://linkedin.com/company/colis-vert' },
        { type: 'instagram', label: 'Instagram', url: 'https://instagram.com/colisvert' },
      ],
      equipe: [
        { nom: 'Antoine Roche', role: 'founder', titre: 'CEO & Fondateur — Ex-Amazon Logistics' },
        { nom: 'Emilie Faure', role: 'other', titre: 'Directrice operations' },
        { nom: 'Bastien Moreau', role: 'developer', titre: 'Lead dev — App livreurs & tracking' },
      ],
      documents: [
        { nom: 'Pitch Deck Colis Vert', url: 'https://example.com/colisvert-deck.pdf', type: 'pdf', visibilite: 'public' },
        { nom: 'Etude impact CO2', url: 'https://example.com/colisvert-impact.pdf', type: 'pdf', visibilite: 'public' },
        { nom: 'Previsionnel financier 2025-2027', url: 'https://example.com/colisvert-financier.xlsx', type: 'xlsx', visibilite: 'private' },
      ],
    },
  },
  'youssef.elmansouri@demo.lpp.fr': {
    projetNom: 'Dar Solar',
    update: {
      probleme: "Au Maroc, 500 000 foyers ruraux n'ont pas acces a l'electricite fiable. Le raccordement au reseau coute 3 000-5 000€ par foyer, hors de portee.",
      solution: "Kits solaires plug-and-play avec paiement en mensualites via mobile money. 15€/mois pendant 24 mois, puis l'energie est gratuite a vie.",
      avantageConcurrentiel: "Modele pay-as-you-go prouve (inspire de M-Kopa au Kenya), kits assembles localement a Marrakech, SAV en darija par WhatsApp.",
      cible: "Foyers ruraux non electrifies au Maroc (500k foyers), puis Tunisie et Mauritanie. Marche solaire off-grid Afrique du Nord : 800M$.",
      businessModel: "Pay-as-you-go (leasing solaire 15€/mois x 24 mois = 360€/kit, cout 180€ = marge 50%) + vente de kits premium + maintenance annuelle.",
      objectifFinancement: 250000,
      montantLeve: 60000,
      progression: 24,
      metriques: [
        { label: 'Foyers equipes', valeur: '340' },
        { label: 'kWh produits/mois', valeur: '52 000' },
        { label: 'Villages couverts', valeur: '28' },
        { label: 'Taux de paiement', valeur: '94%' },
      ],
      liens: [
        { type: 'site', label: 'Site web', url: 'https://darsolar.example.com' },
        { type: 'linkedin', label: 'LinkedIn', url: 'https://linkedin.com/company/dar-solar' },
        { type: 'youtube', label: 'Temoignages clients', url: 'https://youtube.com/watch?v=darsolar' },
      ],
      equipe: [
        { nom: 'Youssef El Mansouri', role: 'founder', titre: 'CEO & Fondateur' },
        { nom: 'Hassan Berrada', role: 'cto', titre: 'Directeur technique — Ingenieur energie solaire' },
        { nom: 'Fatima Zahra Ouali', role: 'sales', titre: 'Responsable terrain — 28 villages' },
      ],
      documents: [
        { nom: 'Pitch Deck Dar Solar', url: 'https://example.com/darsolar-deck.pdf', type: 'pdf', visibilite: 'public' },
        { nom: 'Rapport impact social 2024', url: 'https://example.com/darsolar-impact.pdf', type: 'pdf', visibilite: 'public' },
      ],
    },
  },
};

async function main() {
  console.log('========================================');
  console.log('  SEED MARKET + DOC - 6 projets');
  console.log('========================================\n');

  for (const [email, config] of Object.entries(PROJETS_UPDATE)) {
    console.log(`\n▸ ${config.projetNom} (${email})`);

    // Login
    const login = await api('/auth/connexion', 'POST', { email, motDePasse: MDP });
    if (!login.succes) { console.log('  ✗ Login echoue:', login.message); continue; }
    const token = login.data.token;
    console.log('  ✓ Connecte');
    await sleep(500);

    // Get projets
    const projRes = await api('/projets/entrepreneur/mes-projets', 'GET', null, token);
    if (!projRes.succes) { console.log('  ✗ Projets:', projRes.message); continue; }
    const list = projRes.data?.projets || projRes.data || [];
    const projet = list.find(p => p.nom === config.projetNom);
    if (!projet) { console.log('  ✗ Projet introuvable'); continue; }
    console.log('  ✓ Projet trouve:', projet._id);
    await sleep(500);

    // Update
    const upRes = await api(`/projets/entrepreneur/${projet._id}`, 'PUT', config.update, token);
    if (upRes.succes) {
      console.log('  ✓ Marche + Doc + Equipe mis a jour');
    } else {
      console.log('  ✗ Update echoue:', upRes.message);
    }
    await sleep(1000);
  }

  console.log('\n========================================');
  console.log('  TERMINE !');
  console.log('========================================\n');
}

main().catch(console.error);
