const API = 'https://siteweb-back-lpp-v1.onrender.com/api';
async function main() {
  // Login - try your account
  const login = await fetch(API + '/auth/connexion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'flavien.music@gmail.com', motDePasse: 'Music2025!' }),
  });
  const d = await login.json();
  if (!d.data || !d.data.token) {
    console.log('Login failed:', d.message);
    return;
  }
  const token = d.data.token;
  console.log('Logged in');

  // Get my projects
  const res = await fetch(API + '/projets/entrepreneur/mes-projets', {
    headers: { Authorization: 'Bearer ' + token }
  });
  const proj = await res.json();
  const list = proj.data?.projets || proj.data || [];
  console.log('Mes projets:', list.map(p => p.nom + ' (id:' + p._id + ')'));

  if (list.length === 0) {
    console.log('Aucun projet trouve');
    return;
  }

  // Try to update first project with tags
  const target = list[0];
  console.log('\nTest sur:', target.nom);
  console.log('Tags avant:', JSON.stringify(target.tags));

  const upRes = await fetch(API + '/projets/entrepreneur/' + target._id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ tags: ['TestTag1', 'TestTag2', 'TestTag3'] }),
  });
  const upData = await upRes.json();
  console.log('PUT result:', upData.succes, upData.message);
  if (upData.data?.projet) {
    console.log('Tags apres PUT:', JSON.stringify(upData.data.projet.tags));
  }

  // Verify with GET
  const check = await fetch(API + '/projets/' + target._id);
  const checkData = await check.json();
  console.log('Tags apres GET:', JSON.stringify(checkData.data?.projet?.tags));
}
main();
