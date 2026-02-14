const API = 'https://siteweb-back-lpp-v1.onrender.com/api';
async function main() {
  const res = await fetch(API + '/projets');
  const data = await res.json();
  const list = data.data?.projets || data.data || [];

  for (const p of list.slice(0, 3)) {
    console.log('\n=== ' + p.nom + ' ===');
    console.log('  metriques:', JSON.stringify(p.metriques));
    console.log('  liens:', JSON.stringify(p.liens));
    console.log('  documents:', JSON.stringify(p.documents));
    console.log('  galerie:', JSON.stringify(p.galerie));
    console.log('  equipe:', JSON.stringify(p.equipe));
    console.log('  probleme:', p.probleme ? 'OUI' : 'NON');
    console.log('  solution:', p.solution ? 'OUI' : 'NON');
    console.log('  cible:', p.cible ? 'OUI' : 'NON');
    console.log('  businessModel:', p.businessModel ? 'OUI' : 'NON');
    console.log('  avantageConcurrentiel:', p.avantageConcurrentiel ? 'OUI' : 'NON');
    console.log('  objectifFinancement:', p.objectifFinancement);
    console.log('  montantLeve:', p.montantLeve);
  }
}
main();
