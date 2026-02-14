const API = 'https://siteweb-back-lpp-v1.onrender.com/api';
async function main() {
  const login = await fetch(API + '/auth/connexion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'antoine.roche@demo.lpp.fr', motDePasse: 'DemoLpp2025!' }),
  });
  const d = await login.json();
  const token = d.data.token;

  const res = await fetch(API + '/projets/entrepreneur/mes-projets', { headers: { Authorization: 'Bearer ' + token } });
  const proj = await res.json();
  const list = proj.data?.projets || proj.data || [];
  const cv = list.find(p => p.nom === 'Colis Vert');
  if (!cv) { console.log('Colis Vert introuvable'); return; }
  console.log('Trouve:', cv._id, '| image actuelle:', cv.image);

  const newImg = 'https://images.unsplash.com/photo-1616432043562-3671ea2e5242?w=800&h=500&fit=crop&q=80';
  const up = await fetch(API + '/projets/entrepreneur/' + cv._id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ image: newImg }),
  });
  const upRes = await up.json();
  console.log('Update image:', upRes.succes ? 'OK → ' + newImg : upRes.message);
}
main();
