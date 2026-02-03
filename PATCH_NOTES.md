# PATCH_NOTES.md - Corrections P0 → P1
## Projet CELSE - La Premiere Pierre

**Date:** 2026-02-03
**Auditeur:** Claude Opus 4.5
**Statut:** Corrections P0 et P1 completees

---

## RESUME EXECUTIF

| Phase | Branche | Commits | Statut |
|-------|---------|---------|--------|
| P0 | backend | 1 | Commite |
| P1-2 | DevMobile | 1 | Commite |
| P1-3 | Moderation | 1 | Commite |

---

## P0 - CORRECTIONS URGENTES (backend)

### Commit: `fix(security): P0 - Anti-doublon sanctions + JWT algo + Rate limit`

#### P0-1: Anti-doublon sanctions (Index unique + eventId + idempotency)

**Fichiers modifies:**
- `src/models/AuditLog.ts`
- `src/models/Notification.ts`
- `src/utils/sanctionNotification.ts`
- `src/controllers/moderationController.ts`
- `src/app.ts` (CORS header X-Event-Id)

**Changements:**

1. **AuditLog.ts**
   - Ajout champ `eventId: ObjectId` (sparse)
   - Ajout index unique: `{ eventId: 1 }, { unique: true, sparse: true }`
   - Modification interface `LogActionParams` pour accepter eventId

2. **Notification.ts**
   - Ajout champ `data.eventId: String`
   - Ajout index unique partiel sur sanctions:
     ```javascript
     { 'data.eventId': 1 },
     { unique: true, sparse: true, partialFilterExpression: { type: { $in: [...sanctions] } } }
     ```

3. **sanctionNotification.ts**
   - Fonctions `createSanctionNotification` et `createReverseSanctionNotification` acceptent `eventId`
   - Verification idempotency AVANT creation (findOne par eventId)
   - Gestion erreur E11000 (doublon) → retourne l'existant

4. **moderationController.ts**
   - Helpers: `getOrCreateEventId(req)` extrait `X-Event-Id` header ou genere un nouveau
   - Helper: `isEventIdAlreadyProcessed(eventId)` verifie si deja traite
   - Toutes les fonctions de sanction utilisent maintenant eventId:
     - `warnUser`: eventId + idempotency check
     - `removeWarning`: eventId + idempotency check
     - `suspendUser`: eventId + idempotency check
     - `unsuspendUser`: eventId + idempotency check
     - `banUser`: eventId + idempotency check
     - `unbanUser`: eventId + idempotency check
   - Actions auto-escalade (`auto_suspend`, `auto_ban`) ont leur propre eventId distinct

**Comment tester:**
```bash
# Double-click simulation
curl -X POST .../warn -H "X-Event-Id: 507f1f77bcf86cd799439011" -d '{"reason":"test"}'
curl -X POST .../warn -H "X-Event-Id: 507f1f77bcf86cd799439011" -d '{"reason":"test"}'
# => La 2eme requete retourne 200 avec idempotent: true, pas de doublon
```

**Rollback:**
```bash
git revert <commit_sha>
# Supprimer indexes si necessaire:
# db.notifications.dropIndex('data.eventId_1')
# db.auditlogs.dropIndex('eventId_1')
```

---

#### P0-2: JWT algorithm explicite

**Fichier modifie:** `src/utils/tokens.ts`

**Changements:**
- `genererToken()`: ajout `algorithm: 'HS256'` dans les options
- `verifierToken()`: ajout `{ algorithms: ['HS256'] }` dans verify

**Avant:**
```typescript
return jwt.sign(payload, secret, options); // Algo implicite
return jwt.verify(token, secret) as PayloadJWT; // Accepte tout
```

**Apres:**
```typescript
options.algorithm = 'HS256'; // Explicite
return jwt.verify(token, secret, { algorithms: ['HS256'] }); // Rejette autres
```

**Comment tester:**
```javascript
// Token forge avec alg: none
const badToken = jwt.sign({ id: '123' }, '', { algorithm: 'none' });
// => verifierToken(badToken) doit throw
```

**Rollback:**
```bash
git revert <commit_sha>
# Tokens existants restent valides (deja HS256)
```

---

#### P0-4: Rate limit /auth/moi

**Fichier modifie:** `src/app.ts`

**Changements:**
- Nouveau limiter `limiterHeartbeat`: 20 req/min
- Applique sur `/api/auth/moi`
- Header `X-Event-Id` ajoute dans CORS allowedHeaders

**Config:**
```typescript
const limiterHeartbeat = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 req/min
});
app.use('/api/auth/moi', limiterHeartbeat);
```

**Justification:**
- Mobile fait heartbeat toutes les 90s = ~40/h max en usage normal
- 20/min = 1200/h, tres genereux
- Bloque abus (bots, scripts) sans impacter usage normal

**Rollback:**
```bash
git revert <commit_sha>
# Ou simplement commenter la ligne app.use
```

---

## P1 - CORRECTIONS IMPORTANTES

### P1-2: Logs mobile __DEV__ (DevMobile)

**Commit:** `fix(security): P1-2 - Logs debug conditionnes par __DEV__`

**Fichier modifie:** `mobile/src/services/api.ts`

**Changements:**
- `removeToken()`: stack trace sous `if (__DEV__)`
- `hydrateToken()`: tous les logs sous `if (__DEV__)`
- `setToken()`: tous les logs sous `if (__DEV__)`

**Avant:**
```typescript
console.log('[TOKEN] removeToken() called - stack trace:');
console.log(new Error().stack); // FUITE EN PROD!
```

**Apres:**
```typescript
if (__DEV__) {
  console.log('[TOKEN] removeToken() called - stack trace:');
  console.log(new Error().stack);
}
```

**Rollback:**
```bash
git revert <commit_sha>
```

---

### P1-3: Modales confirmation Panel (Moderation)

**Commit:** `feat(ux): P1-3 - Modales de confirmation actions dangereuses`

**Fichier modifie:** `moderation/src/pages/UserDetail.tsx`

**Changements:**
Ajout `window.confirm()` avant:
- Avertissement: affiche raison + nom utilisateur
- Suspension: affiche duree + raison + nom utilisateur
- Bannissement: WARNING MAJEUR + raison + confirmation explicite
- Debannissement: confirmation simple

**Exemple (bannissement):**
```typescript
onClick={() => {
  if (window.confirm(`⚠️ BANNISSEMENT DÉFINITIF ⚠️\n\n...`)) {
    banMutation.mutate(banReason)
  }
}}
```

**Rollback:**
```bash
git revert <commit_sha>
```

---

## CHECKLIST DE TEST MANUEL

### Backend (apres deploy sur Render)

- [ ] **P0-1 Idempotency:** Double-click warn avec meme X-Event-Id → 1 seul warn cree
- [ ] **P0-1 Sans header:** Warn sans X-Event-Id → eventId genere automatiquement
- [ ] **P0-1 My-sanctions:** /auth/my-sanctions retourne liste sans doublons
- [ ] **P0-2 JWT:** Token forge avec algo "none" → rejete 401
- [ ] **P0-2 JWT:** Token valide HS256 → accepte
- [ ] **P0-4 Rate:** >20 appels /auth/moi en 1 min → 429 Too Many Requests

### Mobile (apres expo build)

- [ ] **P1-2:** Console propre en mode release (pas de stack traces)
- [ ] **P1-2:** Logs visibles uniquement en dev (`npx expo start`)

### Panel Moderation (apres build)

- [ ] **P1-3 Warn:** Clic sur "Envoyer avertissement" → popup confirmation
- [ ] **P1-3 Suspend:** Clic sur "Suspendre" → popup avec duree
- [ ] **P1-3 Ban:** Clic sur "Bannir" → popup WARNING rouge
- [ ] **P1-3 Unban:** Clic sur "Debannir" → popup confirmation

---

## INDEXES MONGODB CREES

```javascript
// AuditLog
{ eventId: 1 } // unique, sparse

// Notification
{ 'data.eventId': 1 } // unique, sparse, partialFilterExpression sur types sanctions
```

Ces indexes sont crees automatiquement par Mongoose au demarrage.
Si probleme, ils peuvent etre recrees manuellement:

```javascript
db.auditlogs.createIndex({ eventId: 1 }, { unique: true, sparse: true })
db.notifications.createIndex(
  { 'data.eventId': 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      type: { $in: ['sanction_ban', 'sanction_suspend', 'sanction_warn', 'sanction_unban', 'sanction_unsuspend', 'sanction_unwarn'] },
      'data.eventId': { $exists: true, $ne: null }
    }
  }
)
```

---

## PROCHAINES ETAPES (P2)

| Priorite | Tache | Effort |
|----------|-------|--------|
| P2-1 | Tests automatises backend (auth/rbac/sanctions/crypto) | L |
| P2-2 | P1-4 Projection .select() sur populate | M |
| P2-3 | Cursor pagination feed | M |
| P2-4 | Refresh token | L |
| P2-5 | P1-5 KeyboardAvoidingView mobile | S |

---

## HISTORIQUE DES COMMITS

### Backend
```
b996a04 fix(security): P0 - Anti-doublon sanctions + JWT algo + Rate limit
```

### DevMobile
```
ff3a2c9 fix(security): P1-2 - Logs debug conditionnes par __DEV__
```

### Moderation
```
aa2a24a feat(ux): P1-3 - Modales de confirmation actions dangereuses
```

---

**Fin du rapport de patch**

*Document genere par Claude Opus 4.5*
*Date: 2026-02-03*
