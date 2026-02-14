/**
 * TEST IDEMPOTENCY - Script Node.js local sécurisé
 *
 * USAGE:
 * 1. Remplis TOKEN et USER_ID ci-dessous
 * 2. Exécute: node scripts/test-idempotency.js
 * 3. Copie-colle l'output dans le chat (SANS les tokens)
 */

const https = require('https');

// ============================================================================
// CONFIGURATION - À REMPLIR
// ============================================================================
const CONFIG = {
  API_URL: 'https://siteweb-back-lpp-v1.onrender.com/api',
  TOKEN: '',      // TON TOKEN ADMIN/MODO (ne pas partager)
  USER_ID: '',    // ID D'UN USER TEST (ne pas partager)
};

// ============================================================================
// HELPERS
// ============================================================================
function generateObjectId() {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const random = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  return timestamp + random;
}

function makeRequest(method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.API_URL + path);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ============================================================================
// MAIN TEST
// ============================================================================
async function runTest() {
  console.log('='.repeat(60));
  console.log('TEST IDEMPOTENCY - CELSE Backend');
  console.log('='.repeat(60));
  console.log('');

  // Validation config
  if (!CONFIG.TOKEN || !CONFIG.USER_ID) {
    console.error('❌ ERREUR: Remplis TOKEN et USER_ID dans le script');
    process.exit(1);
  }

  const EVENT_ID = generateObjectId();
  console.log(`📌 EventId de test: ${EVENT_ID}`);
  console.log('');

  // Test A: Double warn avec même X-Event-Id
  console.log('=== TEST A: Double warn avec même X-Event-Id ===');
  console.log('');

  console.log('>>> Requête 1/2 (warn avec eventId)');
  const res1 = await makeRequest(
    'POST',
    `/moderation/users/${CONFIG.USER_ID}/warn`,
    {
      'Authorization': `Bearer ${CONFIG.TOKEN}`,
      'X-Event-Id': EVENT_ID,
    },
    { reason: 'Test idempotency - requete 1' }
  );
  console.log(`HTTP Status: ${res1.status}`);
  console.log(`Body: ${res1.body}`);
  console.log('');

  console.log('>>> Requête 2/2 (même eventId - doit être idempotent)');
  const res2 = await makeRequest(
    'POST',
    `/moderation/users/${CONFIG.USER_ID}/warn`,
    {
      'Authorization': `Bearer ${CONFIG.TOKEN}`,
      'X-Event-Id': EVENT_ID,
    },
    { reason: 'Test idempotency - requete 2' }
  );
  console.log(`HTTP Status: ${res2.status}`);
  console.log(`Body: ${res2.body}`);
  console.log('');

  // Analyse
  console.log('=== ANALYSE ===');
  console.log('');

  const body2Parsed = JSON.parse(res2.body || '{}');
  const isIdempotent = body2Parsed.data?.idempotent === true;

  if (isIdempotent) {
    console.log('✅ IDEMPOTENCY CONFIRMÉE: 2ème requête retourne idempotent:true');
  } else {
    console.log('⚠️ VÉRIFIER: 2ème requête ne contient pas idempotent:true');
  }

  if (res1.status === 200 && res2.status === 200) {
    console.log('✅ STATUS CODES: Les deux requêtes retournent 200');
  } else {
    console.log(`⚠️ STATUS CODES: ${res1.status} / ${res2.status}`);
  }

  console.log('');
  console.log('=== RÉSUMÉ À COPIER (sans les tokens) ===');
  console.log('');
  console.log(`- EventId utilisé: ${EVENT_ID}`);
  console.log(`- Requête 1: HTTP ${res1.status}`);
  console.log(`- Requête 2: HTTP ${res2.status}`);
  console.log(`- Body 2 contient idempotent:true: ${isIdempotent ? 'OUI ✅' : 'NON ❌'}`);
  console.log(`- Body 2 complet: ${res2.body}`);
}

runTest().catch(console.error);
