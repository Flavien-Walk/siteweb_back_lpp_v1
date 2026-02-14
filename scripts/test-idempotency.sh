#!/bin/bash
# =============================================================================
# TEST IDEMPOTENCY - Script local sécurisé
# Exécute ce script sur ta machine avec tes credentials
# Renvoie-moi UNIQUEMENT l'output (pas les secrets)
# =============================================================================

# CONFIGURATION - À REMPLIR
API_URL="https://siteweb-back-lpp-v1.onrender.com/api"
TOKEN=""           # Ton token admin/modo (ne pas partager)
USER_ID=""         # ID d'un user test (ne pas partager)

# Vérification config
if [ -z "$TOKEN" ] || [ -z "$USER_ID" ]; then
  echo "❌ ERREUR: Remplis TOKEN et USER_ID dans le script"
  exit 1
fi

# Générer un eventId unique pour ce test
EVENT_ID=$(python3 -c "import bson; print(bson.ObjectId())" 2>/dev/null || echo "$(date +%s)$(date +%N)" | head -c 24)
echo "📌 EventId de test: $EVENT_ID"
echo ""

# =============================================================================
# TEST A: Double warn avec même X-Event-Id
# =============================================================================
echo "=== TEST A: Double warn avec même X-Event-Id ==="
echo ""

echo ">>> Requête 1/2 (warn avec eventId)"
RESPONSE1=$(curl -s -w "\n---HTTP_STATUS:%{http_code}---" \
  -X POST "$API_URL/moderation/users/$USER_ID/warn" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Event-Id: $EVENT_ID" \
  -d '{"reason":"Test idempotency - requete 1"}')

BODY1=$(echo "$RESPONSE1" | sed 's/---HTTP_STATUS:.*//g')
STATUS1=$(echo "$RESPONSE1" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d: -f2)
echo "HTTP Status: $STATUS1"
echo "Body: $BODY1"
echo ""

echo ">>> Requête 2/2 (même eventId - doit être idempotent)"
RESPONSE2=$(curl -s -w "\n---HTTP_STATUS:%{http_code}---" \
  -X POST "$API_URL/moderation/users/$USER_ID/warn" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Event-Id: $EVENT_ID" \
  -d '{"reason":"Test idempotency - requete 2"}')

BODY2=$(echo "$RESPONSE2" | sed 's/---HTTP_STATUS:.*//g')
STATUS2=$(echo "$RESPONSE2" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d: -f2)
echo "HTTP Status: $STATUS2"
echo "Body: $BODY2"
echo ""

# =============================================================================
# ANALYSE RÉSULTATS
# =============================================================================
echo "=== ANALYSE ==="
echo ""

# Vérifier si la 2ème requête contient "idempotent"
if echo "$BODY2" | grep -q "idempotent"; then
  echo "✅ IDEMPOTENCY CONFIRMÉE: 2ème requête retourne idempotent:true"
else
  echo "⚠️ VÉRIFIER: 2ème requête ne contient pas 'idempotent'"
fi

# Vérifier les status codes
if [ "$STATUS1" = "200" ] && [ "$STATUS2" = "200" ]; then
  echo "✅ STATUS CODES: Les deux requêtes retournent 200"
elif [ "$STATUS1" = "200" ] && [ "$STATUS2" = "409" ]; then
  echo "✅ STATUS CODES: 1ère=200, 2ème=409 (doublon rejeté)"
else
  echo "⚠️ STATUS CODES: $STATUS1 / $STATUS2 - vérifier"
fi

echo ""
echo "=== FIN DU TEST ==="
echo ""
echo "📋 À COPIER-COLLER DANS LE CHAT (sans les tokens):"
echo "- EventId utilisé: $EVENT_ID"
echo "- Requête 1: HTTP $STATUS1"
echo "- Requête 2: HTTP $STATUS2"
echo "- Body 2 contient 'idempotent': $(echo "$BODY2" | grep -q "idempotent" && echo "OUI" || echo "NON")"
