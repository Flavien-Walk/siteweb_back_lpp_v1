/**
 * Seed Finish - Complete les likes, commentaires et follows rate-limited
 * + Cree Sophie Martin (rate-limited a la v2)
 * Usage: node scripts/seed-finish.js
 */

const API = 'https://siteweb-back-lpp-v1.onrender.com/api';
const MDP = 'DemoLpp2025!';

async function api(endpoint, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${endpoint}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok && res.status === 429) {
    console.log(`  ⏳ Rate limited, pause 10s...`);
    await sleep(10000);
    // Retry
    const res2 = await fetch(`${API}${endpoint}`, opts);
    return res2.json().catch(() => ({}));
  }
  return data;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function ok(msg) { console.log(`  ✓ ${msg}`); }
function info(msg) { console.log(`  → ${msg}`); }

async function main() {
  console.log('========================================');
  console.log('  SEED FINISH - Rattrapage');
  console.log('========================================\n');

  // Login tous les comptes
  const emails = [
    'yasmine.belkacem@demo.lpp.fr', 'hugo.carpentier@demo.lpp.fr', 'ines.moreau@demo.lpp.fr',
    'mehdi.amrani@demo.lpp.fr', 'clara.fontaine@demo.lpp.fr', 'antoine.roche@demo.lpp.fr',
    'fatou.diallo@demo.lpp.fr', 'maxime.leroy@demo.lpp.fr', 'lea.nguyen@demo.lpp.fr',
    'samir.benali@demo.lpp.fr', 'camille.durand@demo.lpp.fr', 'julien.petit@demo.lpp.fr',
    'amira.khelifi@demo.lpp.fr', 'thomas.garcia@demo.lpp.fr', 'marie.lambert@demo.lpp.fr',
    'youssef.elmansouri@demo.lpp.fr', 'romain.leclerc@demo.lpp.fr',
    'nadia.bensaid@demo.lpp.fr', 'lucas.morel@demo.lpp.fr',
  ];

  const tokenMap = {};
  console.log('Connexion de tous les comptes...');
  for (const email of emails) {
    const res = await api('/auth/connexion', 'POST', { email, motDePasse: MDP });
    if (res.succes) {
      tokenMap[email] = res.data.token;
    }
    await sleep(500);
  }
  ok(`${Object.keys(tokenMap).length} comptes connectes`);

  // Creer Sophie Martin si manquante
  if (!tokenMap['sophie.martin@demo.lpp.fr']) {
    info('Creation de Sophie Martin...');
    const res = await api('/auth/inscription', 'POST', {
      prenom: 'Sophie', nom: 'Martin',
      email: 'sophie.martin@demo.lpp.fr',
      motDePasse: MDP, confirmationMotDePasse: MDP,
      cguAcceptees: true,
    });
    if (res.succes) {
      tokenMap['sophie.martin@demo.lpp.fr'] = res.data.token;
      await api('/profil', 'PATCH', { bio: 'Directrice marketing chez une licorne French Tech. Je partage mes tips growth & branding pour les startups.' }, res.data.token);
      await api('/profil/avatar', 'PATCH', { avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&h=400&fit=crop&crop=face&q=80' }, res.data.token);
      ok('Sophie Martin creee');
    } else {
      const login = await api('/auth/connexion', 'POST', { email: 'sophie.martin@demo.lpp.fr', motDePasse: MDP });
      if (login.succes) tokenMap['sophie.martin@demo.lpp.fr'] = login.data.token;
    }
  }

  // Post de Sophie si manquant
  if (tokenMap['sophie.martin@demo.lpp.fr']) {
    info('Post de Sophie...');
    await api('/publications', 'POST', {
      contenu: "Lecon de branding que j'aurais aime apprendre plus tot :\n\nVotre marque, c'est pas votre logo. C'est ce que les gens disent de vous quand vous n'etes pas dans la piece.\n\n3 questions a vous poser :\n→ Quelle emotion je veux provoquer ?\n→ Quelle promesse je fais ?\n→ Est-ce que je la tiens a chaque interaction ?\n\nLa coherence bat la creativite. Toujours.",
      type: 'post',
      medias: ['https://images.unsplash.com/photo-1523726491678-bf852e717f6a?w=800&h=500&fit=crop&q=80'],
    }, tokenMap['sophie.martin@demo.lpp.fr']);
    ok('Post de Sophie cree');
    await sleep(1000);
  }

  // Posts de Yasmine et Hugo (rate-limited)
  info('Posts rattrapage Yasmine + Hugo...');
  if (tokenMap['yasmine.belkacem@demo.lpp.fr']) {
    await api('/publications', 'POST', {
      contenu: "NovaPay vient de signer un partenariat avec Orange Money pour couvrir le Senegal et la Cote d'Ivoire !\n\nCe partenariat nous permet d'atteindre 15 millions d'utilisateurs potentiels. On passe d'une app a un ecosysteme.\n\nLa route est longue mais chaque pas compte. Stay tuned.",
      type: 'post',
      medias: ['https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=500&fit=crop&q=80'],
    }, tokenMap['yasmine.belkacem@demo.lpp.fr']);
    ok('Post Yasmine (Orange Money)');
    await sleep(1000);
  }
  if (tokenMap['hugo.carpentier@demo.lpp.fr']) {
    await api('/publications', 'POST', {
      contenu: "Viens de terminer un projet React Native pour une startup foodtech. 12 semaines, 45 ecrans, de zero a l'App Store.\n\nStack : Expo + TypeScript + Node.js + MongoDB\n\nLecon principale : investissez dans votre architecture des le debut. Refactorer a la semaine 10, ca fait mal.",
      type: 'post',
      medias: ['https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=500&fit=crop&q=80'],
    }, tokenMap['hugo.carpentier@demo.lpp.fr']);
    ok('Post Hugo (React Native)');
    await sleep(1000);
  }

  // NovaPay - fix image + publication
  info('Fix NovaPay...');
  if (tokenMap['yasmine.belkacem@demo.lpp.fr']) {
    const mesProjets = await api('/projets/entrepreneur/mes-projets', 'GET', null, tokenMap['yasmine.belkacem@demo.lpp.fr']);
    if (mesProjets.succes && mesProjets.data?.length > 0) {
      const novapay = mesProjets.data.find(p => p.nom === 'NovaPay');
      if (novapay && novapay.statut !== 'published') {
        await api(`/projets/entrepreneur/${novapay._id}`, 'PUT', { image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=500&fit=crop&q=80' }, tokenMap['yasmine.belkacem@demo.lpp.fr']);
        await sleep(500);
        const pubRes = await api(`/projets/entrepreneur/${novapay._id}/publier`, 'POST', {}, tokenMap['yasmine.belkacem@demo.lpp.fr']);
        ok(pubRes.succes ? 'NovaPay publie' : `NovaPay: ${pubRes.message}`);
      } else {
        ok('NovaPay deja publie ou introuvable');
      }
    }
  }

  // Recuperer tous les posts
  info('Recuperation des posts...');
  const pubsRes = await api('/publications?limite=50');
  const allPosts = pubsRes.succes ? (pubsRes.data?.publications || pubsRes.data || []) : [];
  ok(`${allPosts.length} posts trouves`);

  // Ajouter des likes distribues
  console.log('\nAjout de likes distribues...');
  let likeCount = 0;
  const allTokens = Object.values(tokenMap);

  for (const post of allPosts) {
    // 3-5 likes par post
    const shuffledTokens = [...allTokens].sort(() => Math.random() - 0.5);
    const nbLikes = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < Math.min(nbLikes, shuffledTokens.length); i++) {
      const res = await api(`/publications/${post._id}/like`, 'POST', {}, shuffledTokens[i]);
      if (res.succes) likeCount++;
      await sleep(300);
    }
  }
  ok(`${likeCount} likes ajoutes`);

  // Follow des projets
  console.log('\nFollow des projets...');
  const projetsRes = await api('/projets');
  const allProjets = projetsRes.succes ? (projetsRes.data?.projets || projetsRes.data || []) : [];
  let followCount = 0;

  for (const projet of allProjets) {
    const shuffled = Object.entries(tokenMap).sort(() => Math.random() - 0.5);
    for (const [email, token] of shuffled.slice(0, 8)) {
      await api(`/projets/${projet._id}/suivre`, 'POST', {}, token);
      followCount++;
      await sleep(300);
    }
  }
  ok(`${followCount} follows`);

  console.log('\n========================================');
  console.log('  RATTRAPAGE TERMINE !');
  console.log('========================================\n');
}

main().catch(console.error);
