const API = 'https://siteweb-back-lpp-v1.onrender.com/api';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const login = await fetch(API + '/auth/connexion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'antoine.roche@demo.lpp.fr', motDePasse: 'DemoLpp2025!' }),
  });
  const loginData = await login.json();
  if (!loginData.succes) { console.log('Login fail:', loginData.message); return; }
  const token = loginData.data.token;
  console.log('Connecte');

  const res = await fetch(API + '/projets/entrepreneur/mes-projets', {
    headers: { Authorization: 'Bearer ' + token },
  });
  const projets = await res.json();
  const list = Array.isArray(projets.data) ? projets.data : projets.data?.projets || [];
  console.log('Projets:', list.length);

  const cv = list.find(p => p.nom === 'Colis Vert');
  if (!cv) { console.log('Colis Vert introuvable'); return; }
  console.log('Colis Vert:', cv._id, '| image:', cv.image ? 'OUI' : 'NON', '| statut:', cv.statut);

  // Fix image
  await sleep(500);
  const up = await fetch(API + '/projets/entrepreneur/' + cv._id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=500&fit=crop&q=80' }),
  });
  console.log('Image fix:', (await up.json()).succes ? 'OK' : 'FAIL');

  // Republier si besoin
  if (cv.statut !== 'published') {
    await sleep(500);
    const pub = await fetch(API + '/projets/entrepreneur/' + cv._id + '/publier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: '{}',
    });
    const pubRes = await pub.json();
    console.log('Publish:', pubRes.succes ? 'OK' : pubRes.message);
  } else {
    console.log('Deja publie');
  }
}
main();
