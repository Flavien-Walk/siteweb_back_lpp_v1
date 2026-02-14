const API = 'https://siteweb-back-lpp-v1.onrender.com/api';
async function main() {
  const accounts = [
    { email: 'flavien.music@gmail.com', mdp: 'Music2025!' },
    { email: 'antoine.roche@demo.lpp.fr', mdp: 'DemoLpp2025!' },
    { email: 'julien.moreau@demo.lpp.fr', mdp: 'DemoLpp2025!' },
    { email: 'sophie.laurent@demo.lpp.fr', mdp: 'DemoLpp2025!' },
  ];

  for (const acc of accounts) {
    try {
      const login = await fetch(API + '/auth/connexion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: acc.email, motDePasse: acc.mdp }),
      });
      const d = await login.json();
      if (!d.data || !d.data.token) continue;
      const token = d.data.token;

      const res = await fetch(API + '/projets/entrepreneur/mes-projets', {
        headers: { Authorization: 'Bearer ' + token }
      });
      const proj = await res.json();
      const list = proj.data?.projets || proj.data || [];
      if (list.length > 0) {
        console.log('\n' + acc.email + ':');
        for (const p of list) {
          console.log('  ' + p.nom + ' | id:' + p._id + ' | tags:', JSON.stringify(p.tags), '| metriques:', p.metriques?.length);
        }
      }
    } catch (e) {
      console.log(acc.email + ': error', e.message);
    }
  }
}
main();
