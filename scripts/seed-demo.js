/**
 * Script de seed - Cree 3 comptes demo realistes + posts + projet + interactions
 * Usage: node scripts/seed-demo.js
 */

const API = 'https://siteweb-back-lpp-v1.onrender.com/api';

// ============ HELPERS ============

async function api(endpoint, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API}${endpoint}`, opts);
  const data = await res.json();

  if (!res.ok) {
    console.error(`  [ERREUR] ${method} ${endpoint} → ${res.status}`);
    console.error(`  ${JSON.stringify(data)}`);
  }
  return data;
}

function log(msg) { console.log(`\n✦ ${msg}`); }
function ok(msg) { console.log(`  ✓ ${msg}`); }
function info(msg) { console.log(`  → ${msg}`); }

// ============ DATA ============

const USERS = [
  {
    prenom: 'Yasmine',
    nom: 'Belkacem',
    email: 'yasmine.belkacem@demo.lpp.fr',
    motDePasse: 'DemoLpp2025!',
    bio: 'Fondatrice de NovaPay. Je construis le futur du paiement mobile en Afrique francophone. Ex-product manager chez Stripe.',
    statut: 'entrepreneur',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face&q=80',
  },
  {
    prenom: 'Hugo',
    nom: 'Carpentier',
    email: 'hugo.carpentier@demo.lpp.fr',
    motDePasse: 'DemoLpp2025!',
    bio: 'Dev fullstack freelance. React Native, Node.js, TypeScript. Je cherche des projets early-stage a rejoindre comme CTO technique.',
    statut: 'visiteur',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face&q=80',
  },
  {
    prenom: 'Ines',
    nom: 'Moreau',
    email: 'ines.moreau@demo.lpp.fr',
    motDePasse: 'DemoLpp2025!',
    bio: 'Etudiante en M1 Entrepreneuriat a ESCP. En train de lancer ma premiere startup dans la mode durable. Curieuse de tout !',
    statut: 'visiteur',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face&q=80',
  },
];

const PROJET_NOVAPAY = {
  nom: 'NovaPay',
  pitch: 'Le paiement mobile nouvelle generation pour l\'Afrique francophone',
  description: 'NovaPay est une solution de paiement mobile qui permet aux commercants et particuliers d\'envoyer, recevoir et gerer leur argent en toute simplicite. Notre app couvre le transfert d\'argent, le paiement QR code en boutique et la gestion de tresorerie pour les PME. Nous ciblons 5 pays d\'Afrique de l\'Ouest pour notre lancement.',
  categorie: 'tech',
  secteur: 'FinTech',
  maturite: 'lancement',
  localisation: { ville: 'Paris', lat: 48.8566, lng: 2.3522 },
  tags: ['FinTech', 'Mobile Money', 'Afrique'],
  probleme: 'En Afrique francophone, 60% des adultes n\'ont pas de compte bancaire. Les solutions existantes sont couteuses (frais de 3-5%) et peu accessibles.',
  solution: 'NovaPay propose des frais a 0.5%, une inscription en 2 minutes avec simple piece d\'identite, et fonctionne meme sans connexion internet via USSD.',
  cible: 'Commercants, PME et particuliers en Afrique de l\'Ouest (Senegal, Cote d\'Ivoire, Mali, Burkina Faso, Guinee)',
  businessModel: 'Commission de 0.5% par transaction + abonnement premium pour les entreprises (gestion de tresorerie, analytics, multi-utilisateurs)',
  objectifFinancement: 500000,
  montantLeve: 120000,
  progression: 24,
  metriques: [
    { label: 'Utilisateurs', valeur: '12 400' },
    { label: 'Transactions/mois', valeur: '45 000' },
    { label: 'Volume mensuel', valeur: '2.1M FCFA' },
  ],
  liens: [
    { type: 'site', label: 'Site web', url: 'https://novapay.example.com' },
    { type: 'linkedin', label: 'LinkedIn', url: 'https://linkedin.com/company/novapay' },
  ],
};

const POSTS = [
  // Yasmine (index 0)
  {
    userIdx: 0,
    contenu: "Grosse milestone pour NovaPay ! On vient de depasser les 12 000 utilisateurs actifs au Senegal. Quand on a commence il y a 8 mois, on n'osait meme pas imaginer ce chiffre.\n\nLe plus fou ? 70% de nos utilisateurs viennent du bouche-a-oreille. Zero budget marketing. Juste un produit qui resout un vrai probleme.\n\nMerci a toute l'equipe. On ne lache rien.",
    type: 'post',
  },
  {
    userIdx: 0,
    contenu: "J'ai passe 3 ans chez Stripe a comprendre comment fonctionne le paiement a l'echelle. Aujourd'hui je construis NovaPay et je realise que les vrais challenges ne sont pas techniques.\n\nLe plus dur :\n→ Obtenir les licences reglementaires\n→ Convaincre les banques partenaires\n→ Adapter le produit aux usages locaux (USSD, pas seulement smartphone)\n\nSi vous montez une fintech en Afrique, DM ouverts. J'aurais aime avoir ces conseils avant de me lancer.",
    type: 'post',
  },

  // Hugo (index 1)
  {
    userIdx: 1,
    contenu: "Retour d'experience : j'ai rejoint 3 startups early-stage en tant que dev freelance cette annee. Voici ce que j'ai appris :\n\n1. Le stack technique n'est JAMAIS le vrai probleme\n2. La vitesse d'execution bat la perfection du code\n3. Un MVP en 3 semaines vaut mieux qu'un produit parfait en 6 mois\n4. Savoir dire \"non\" a un feature request, ca sauve des projets\n\nProchaine etape : je cherche un projet ambitieux a rejoindre comme CTO. React Native + Node.js, c'est mon sweet spot.",
    type: 'post',
  },
  {
    userIdx: 1,
    contenu: "Petit tip React Native pour les devs qui galèrent avec les performances :\n\nUtilisez `useMemo` et `useCallback` partout ou vous passez des fonctions/objets en props. J'ai divise par 3 le nombre de re-renders sur une app de 50+ ecrans juste avec ca.\n\nAussi : FlatList > ScrollView. Toujours. Meme pour 10 items.\n\nVous avez des questions tech ? Balancez en commentaire.",
    type: 'post',
  },

  // Ines (index 2)
  {
    userIdx: 2,
    contenu: "Premier jour de mon M1 Entrepreneuriat a l'ESCP. On nous a demande : \"Quel probleme voulez-vous resoudre ?\"\n\nMa reponse : la fast fashion. 100 milliards de vetements produits chaque annee. 73% finissent en decharge.\n\nJe ne sais pas encore exactement comment, mais je veux creer une marque de mode durable qui soit VRAIMENT accessible. Pas du greenwashing a 200€ le t-shirt.\n\nSi quelqu'un a des retours d'experience dans la mode ethique, je suis preneuse !",
    type: 'post',
  },
  {
    userIdx: 2,
    contenu: "J'ai decouvert LPP la semaine derniere et je suis impressionnee par la qualite des projets. Ca change des reseaux sociaux classiques ou tu scrolles dans le vide.\n\nIci tu decouvres des gens qui construisent des trucs concrets. Ca motive grave pour avancer sur mon propre projet.\n\nQuels projets vous recommandez de suivre sur la plateforme ?",
    type: 'post',
  },
];

// Commentaires croises
const COMMENTS = [
  // Hugo commente le post de Yasmine (post 0)
  { postIdx: 0, userIdx: 1, contenu: "12 000 users en 8 mois sans budget marketing, c'est enorme. Le produit parle de lui-meme. Si vous cherchez un dev React Native pour la V2, je suis dispo !" },
  // Ines commente le post de Yasmine (post 0)
  { postIdx: 0, userIdx: 2, contenu: "Trop inspirant ! J'etudie justement les modeles de fintech africaines en cours. NovaPay est un super cas d'etude." },
  // Yasmine commente le post de Hugo (post 2)
  { postIdx: 2, userIdx: 0, contenu: "Completement d'accord sur le point 2. La vitesse d'execution, c'est ce qui fait la difference. Chez NovaPay on ship une feature par semaine minimum." },
  // Ines commente le post de Hugo (post 3)
  { postIdx: 3, userIdx: 2, contenu: "Merci pour le tip ! Je debute en React Native pour le proto de mon projet mode. Le coup du FlatList vs ScrollView m'a sauve la vie." },
  // Hugo commente le post d'Ines (post 4)
  { postIdx: 4, userIdx: 1, contenu: "La mode durable accessible, c'est un vrai sujet. Regarde ce que fait Vinted cote marketplace. Il y a peut-etre un angle tech interessant a explorer !" },
  // Yasmine commente le post d'Ines (post 5)
  { postIdx: 5, userIdx: 0, contenu: "Bienvenue sur LPP ! N'hesite pas a suivre NovaPay si la fintech t'interesse. Et oui cette communaute est top pour avancer." },
];

// Likes croises : chaque user like les posts des autres
const LIKES = [
  // Yasmine like les posts de Hugo et Ines
  { postIdx: 2, userIdx: 0 },
  { postIdx: 3, userIdx: 0 },
  { postIdx: 4, userIdx: 0 },
  { postIdx: 5, userIdx: 0 },
  // Hugo like les posts de Yasmine et Ines
  { postIdx: 0, userIdx: 1 },
  { postIdx: 1, userIdx: 1 },
  { postIdx: 4, userIdx: 1 },
  { postIdx: 5, userIdx: 1 },
  // Ines like tout le monde
  { postIdx: 0, userIdx: 2 },
  { postIdx: 1, userIdx: 2 },
  { postIdx: 2, userIdx: 2 },
  { postIdx: 3, userIdx: 2 },
];

// ============ MAIN ============

async function main() {
  console.log('========================================');
  console.log('  SEED DEMO - La Premiere Pierre (LPP)');
  console.log('========================================');
  console.log(`API: ${API}\n`);

  // ---------- 1. CREER LES COMPTES ----------
  log('ETAPE 1 : Inscription des 3 comptes');
  const tokens = [];
  const userIds = [];

  for (const user of USERS) {
    info(`Inscription de ${user.prenom} ${user.nom}...`);
    const res = await api('/auth/inscription', 'POST', {
      prenom: user.prenom,
      nom: user.nom,
      email: user.email,
      motDePasse: user.motDePasse,
      confirmationMotDePasse: user.motDePasse,
      cguAcceptees: true,
    });

    if (res.succes) {
      tokens.push(res.data.token);
      userIds.push(res.data.utilisateur.id);
      ok(`${user.prenom} inscrit(e) → ID: ${res.data.utilisateur.id}`);
    } else if (res.message && res.message.includes('existe')) {
      // Compte deja existant, se connecter
      info(`Compte existant, connexion...`);
      const login = await api('/auth/connexion', 'POST', {
        email: user.email,
        motDePasse: user.motDePasse,
      });
      if (login.succes) {
        tokens.push(login.data.token);
        userIds.push(login.data.utilisateur.id);
        ok(`${user.prenom} connecte(e) → ID: ${login.data.utilisateur.id}`);
      } else {
        console.error(`  ✗ Impossible de connecter ${user.prenom}:`, login.message);
        tokens.push(null);
        userIds.push(null);
      }
    } else {
      console.error(`  ✗ Erreur inscription ${user.prenom}:`, res.message);
      tokens.push(null);
      userIds.push(null);
    }
  }

  // Verifier qu'on a les 3 tokens
  if (tokens.some(t => !t)) {
    console.error('\n✗ Impossible de continuer sans les 3 comptes.');
    process.exit(1);
  }

  // ---------- 2. METTRE A JOUR LES PROFILS ----------
  log('ETAPE 2 : Mise a jour des profils (bio + avatar + statut)');
  for (let i = 0; i < USERS.length; i++) {
    const user = USERS[i];

    // Bio
    await api('/profil', 'PATCH', { bio: user.bio }, tokens[i]);
    ok(`Bio de ${user.prenom} mise a jour`);

    // Statut
    await api('/profil/statut', 'PATCH', { statut: user.statut }, tokens[i]);
    ok(`Statut de ${user.prenom} → ${user.statut}`);

    // Avatar (via URL Unsplash)
    await api('/profil/avatar', 'PATCH', { avatar: user.avatar }, tokens[i]);
    ok(`Avatar de ${user.prenom} mis a jour`);
  }

  // ---------- 3. CREER LE PROJET NOVAPAY ----------
  log('ETAPE 3 : Creation du projet NovaPay (Yasmine)');
  const projetRes = await api('/projets/entrepreneur/creer', 'POST', PROJET_NOVAPAY, tokens[0]);
  let projetId = null;

  if (projetRes.succes) {
    projetId = projetRes.data.projet?._id || projetRes.data._id;
    ok(`Projet NovaPay cree → ID: ${projetId}`);

    // Publier le projet
    info('Publication du projet...');
    const pubRes = await api(`/projets/entrepreneur/${projetId}/publier`, 'POST', {}, tokens[0]);
    if (pubRes.succes) {
      ok('Projet NovaPay publie');
    } else {
      info(`Publication: ${pubRes.message}`);
    }
  } else {
    info(`Projet: ${projetRes.message} (peut-etre deja existant)`);
  }

  // ---------- 4. CREER LES POSTS ----------
  log('ETAPE 4 : Creation des publications');
  const postIds = [];

  for (const post of POSTS) {
    const token = tokens[post.userIdx];
    const userName = USERS[post.userIdx].prenom;

    info(`Post de ${userName}...`);
    const res = await api('/publications', 'POST', {
      contenu: post.contenu,
      type: post.type,
    }, token);

    if (res.succes) {
      const postId = res.data.publication?._id || res.data._id;
      postIds.push(postId);
      ok(`Post cree → ID: ${postId}`);
    } else {
      info(`Post: ${res.message}`);
      postIds.push(null);
    }

    // Petit delai pour eviter le rate limit
    await new Promise(r => setTimeout(r, 500));
  }

  // ---------- 5. AJOUTER LES COMMENTAIRES ----------
  log('ETAPE 5 : Commentaires croises');
  for (const comment of COMMENTS) {
    const postId = postIds[comment.postIdx];
    if (!postId) { info('Post manquant, skip...'); continue; }

    const token = tokens[comment.userIdx];
    const userName = USERS[comment.userIdx].prenom;
    const authorName = USERS[POSTS[comment.postIdx].userIdx].prenom;

    info(`${userName} commente le post de ${authorName}...`);
    const res = await api(`/publications/${postId}/commentaires`, 'POST', {
      contenu: comment.contenu,
    }, token);

    if (res.succes) {
      ok('Commentaire ajoute');
    } else {
      info(`Commentaire: ${res.message}`);
    }

    await new Promise(r => setTimeout(r, 300));
  }

  // ---------- 6. AJOUTER LES LIKES ----------
  log('ETAPE 6 : Likes croises');
  for (const like of LIKES) {
    const postId = postIds[like.postIdx];
    if (!postId) continue;

    const token = tokens[like.userIdx];
    const userName = USERS[like.userIdx].prenom;

    await api(`/publications/${postId}/like`, 'POST', {}, token);
    ok(`${userName} a like un post`);

    await new Promise(r => setTimeout(r, 200));
  }

  // ---------- 7. FOLLOW LE PROJET ----------
  if (projetId) {
    log('ETAPE 7 : Follow du projet NovaPay');
    for (let i = 1; i < USERS.length; i++) {
      await api(`/projets/${projetId}/suivre`, 'POST', {}, tokens[i]);
      ok(`${USERS[i].prenom} suit NovaPay`);
    }
  }

  // ---------- RESUME ----------
  console.log('\n========================================');
  console.log('  SEED TERMINE !');
  console.log('========================================');
  console.log(`\n  3 comptes crees :`);
  for (let i = 0; i < USERS.length; i++) {
    console.log(`    ${USERS[i].prenom} ${USERS[i].nom} (${USERS[i].email}) → ${USERS[i].statut}`);
  }
  console.log(`\n  Mot de passe commun : DemoLpp2025!`);
  console.log(`  ${POSTS.length} posts crees`);
  console.log(`  ${COMMENTS.length} commentaires ajoutes`);
  console.log(`  ${LIKES.length} likes ajoutes`);
  if (projetId) console.log(`  1 projet NovaPay publie`);
  console.log('');
}

main().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
