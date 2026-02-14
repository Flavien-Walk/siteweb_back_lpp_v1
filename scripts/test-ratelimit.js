/**
 * TEST RATE LIMIT - Avec keep-alive pour forcer même instance
 *
 * USAGE: node scripts/test-ratelimit.js
 * (Pas besoin de token pour ce test)
 */

const https = require('https');

const API_URL = 'https://siteweb-back-lpp-v1.onrender.com/api/auth/moi';
const TOTAL_REQUESTS = 30;

// Agent avec keep-alive pour réutiliser la connexion (même instance)
const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 1, // Force une seule socket
});

function makeRequest(index) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL);
    const req = https.request(
      {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'GET',
        agent: agent,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          resolve({
            index,
            status: res.statusCode,
            limit: res.headers['ratelimit-limit'],
            remaining: res.headers['ratelimit-remaining'],
            reset: res.headers['ratelimit-reset'],
            body: data,
          });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function runTest() {
  console.log('='.repeat(60));
  console.log('TEST RATE LIMIT - /api/auth/moi');
  console.log('='.repeat(60));
  console.log('');
  console.log(`Envoi de ${TOTAL_REQUESTS} requêtes avec keep-alive (même connexion)`);
  console.log('');

  const results = [];
  let first429 = null;

  for (let i = 1; i <= TOTAL_REQUESTS; i++) {
    const res = await makeRequest(i);
    results.push(res);

    const marker = res.status === 429 ? '🚫 RATE LIMITED' : '';
    console.log(
      `[${String(i).padStart(2, '0')}] HTTP ${res.status} | ` +
      `Limit: ${res.limit || 'N/A'} | ` +
      `Remaining: ${String(res.remaining || 'N/A').padStart(2, ' ')} | ` +
      `Reset: ${res.reset || 'N/A'}s ${marker}`
    );

    if (res.status === 429 && !first429) {
      first429 = i;
    }
  }

  console.log('');
  console.log('=== ANALYSE ===');
  console.log('');

  const limitHeader = results[0]?.limit;
  const unique429 = results.filter((r) => r.status === 429).length;
  const uniqueRemaining = [...new Set(results.map((r) => r.remaining))];

  console.log(`📊 Header ratelimit-limit: ${limitHeader || 'ABSENT'}`);
  console.log(`📊 Requêtes 429 (rate limited): ${unique429}/${TOTAL_REQUESTS}`);
  console.log(`📊 Valeurs remaining uniques: [${uniqueRemaining.join(', ')}]`);

  if (first429) {
    console.log(`📊 Première 429 à la requête: #${first429}`);
  }

  console.log('');
  console.log('=== VERDICT ===');
  console.log('');

  if (limitHeader === '20') {
    console.log('✅ CONFIG OK: ratelimit-limit = 20');
  } else {
    console.log(`⚠️ CONFIG: ratelimit-limit = ${limitHeader || 'ABSENT'}`);
  }

  if (first429 && first429 <= 25) {
    console.log(`✅ EFFICACITÉ CONFIRMÉE: 429 déclenché à la requête #${first429}`);
  } else if (unique429 > 0) {
    console.log(`⚠️ EFFICACITÉ PARTIELLE: ${unique429} requêtes 429`);
  } else {
    console.log('⚠️ EFFICACITÉ NON CONFIRMÉE: Aucune 429 (multi-instances Render?)');
  }

  // Vérifier si remaining décroît de façon monotone
  const remainingValues = results.map((r) => parseInt(r.remaining, 10)).filter((v) => !isNaN(v));
  let isMonotonic = true;
  for (let i = 1; i < remainingValues.length; i++) {
    if (remainingValues[i] > remainingValues[i - 1]) {
      isMonotonic = false;
      break;
    }
  }

  if (isMonotonic && remainingValues.length > 5) {
    console.log('✅ COMPTEUR COHÉRENT: remaining décroît de façon monotone');
  } else {
    console.log('⚠️ COMPTEUR INCOHÉRENT: remaining fluctue (multi-instances)');
  }

  console.log('');
  console.log('=== RÉSUMÉ À COPIER ===');
  console.log('');
  console.log(`- ratelimit-limit header: ${limitHeader || 'ABSENT'}`);
  console.log(`- Première 429 à: ${first429 ? `requête #${first429}` : 'JAMAIS'}`);
  console.log(`- Total 429: ${unique429}/${TOTAL_REQUESTS}`);
  console.log(`- Compteur monotone: ${isMonotonic ? 'OUI' : 'NON'}`);

  agent.destroy();
}

runTest().catch(console.error);
