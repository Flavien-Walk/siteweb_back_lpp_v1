# AUDIT_FIX_PLAN.md - Plan de correction P0 → P2
## Projet CELSE - La Premiere Pierre

**Date:** 2026-02-03
**Auditeur:** Claude Opus 4.5
**Statut:** Reality Check complete, pret pour corrections

---

## 1. ETAT REEL DES BRANCHES

### 1.1 SHA des branches (au moment de l'audit)

| Branche | SHA | Statut |
|---------|-----|--------|
| backend | `dfc6f302bd14895648e2a93603385a77d9fb7d10` | Up to date |
| DevMobile | `f5c857272e454faf3b6544578879ea8d564a2232` | Up to date |
| Moderation | `fd6c65f5643eba460557be4934ea5e9a4d84cb7c` | Up to date |
| master | - | NE PAS MODIFIER |

### 1.2 Artefacts verifies (zero pollution)

| Branche | dist/ tracke | node_modules/ tracke | .expo/ tracke | Cross-pollution |
|---------|--------------|----------------------|---------------|-----------------|
| backend | NON | NON | NON | Aucune |
| DevMobile | NON | NON | NON | Aucune |
| Moderation | NON | NON | NON | Aucune |

**Note:** Le dossier `mobile/` present localement sur backend n'est PAS tracke dans git (gitignore correct).

### 1.3 Arborescence Backend (`backend`)

```
src/
├── app.ts                      # Config Express, CORS, rate limiting
├── server.ts                   # Point d'entree
├── config/
│   ├── mongo.ts                # Connexion MongoDB
│   └── passport.ts             # OAuth strategies (Google, Facebook, Apple)
├── controllers/
│   ├── authController.ts       # Auth, OAuth, sanctions-info, my-sanctions
│   ├── moderationController.ts # Sanctions (warn/suspend/ban/unban/unsuspend)
│   ├── auditController.ts      # Logs audit
│   ├── messagerieController.ts # Messages chiffres AES-256-GCM
│   └── ... (16 controllers total)
├── middlewares/
│   ├── verifierJwt.ts          # Validation JWT [PROBLEME: pas d'algo explicite]
│   ├── verifierAdmin.ts        # RBAC permissions
│   └── checkUserStatus.ts      # Ban/Suspend check
├── models/
│   ├── Utilisateur.ts          # Schema user + RBAC + warnings
│   ├── AuditLog.ts             # Logs immutables [PROBLEME: pas d'eventId]
│   ├── Notification.ts         # [PROBLEME: pas d'index unique sanctions]
│   └── ... (12 models)
├── routes/                     # 15 fichiers routes
└── utils/
    ├── tokens.ts               # JWT generation [PROBLEME: pas d'algo explicite]
    ├── cryptoMessage.ts        # AES-256-GCM (OK)
    ├── sanctionNotification.ts # [PROBLEME: pas d'eventId]
    └── auditLogger.ts          # Helper audit
```

### 1.4 Arborescence DevMobile (`DevMobile`)

```
mobile/
├── app/
│   ├── _layout.tsx             # Root layout + providers
│   ├── index.tsx               # Redirect auth
│   ├── (auth)/                 # Login, Register
│   └── (app)/
│       ├── accueil.tsx         # Feed principal
│       ├── profil.tsx          # Profil avec warnings counter
│       ├── sanctions.tsx       # Historique sanctions
│       └── utilisateur/[id].tsx
├── src/
│   ├── services/
│   │   ├── api.ts              # [PROBLEME: stack trace sans __DEV__]
│   │   ├── oauth.ts            # OAuth (Google/Apple)
│   │   └── moderation.ts       # Actions staff mobile
│   ├── contexts/
│   │   └── UserContext.tsx     # Source verite user
│   └── composants/
│       ├── AccountRestrictedScreen.tsx # (OK - navigation explicite)
│       └── StaffActions.tsx    # Actions moderation mobile
```

### 1.5 Arborescence Moderation (`Moderation`)

```
moderation/
├── src/
│   ├── pages/
│   │   ├── UserDetail.tsx      # [PROBLEME: pas de modales confirmation]
│   │   ├── Users.tsx           # Liste users
│   │   └── Audit.tsx           # Logs audit
│   ├── services/
│   │   ├── api.ts              # Client HTTP
│   │   └── users.ts            # Appels moderation
│   └── auth/
│       └── AuthContext.tsx
```

---

## 2. ENDPOINTS UTILISES

### 2.1 Par Mobile (DevMobile)

| Endpoint | Methode | Usage |
|----------|---------|-------|
| `/auth/connexion` | POST | Login email/pwd |
| `/auth/inscription` | POST | Register |
| `/auth/moi` | GET | Heartbeat + user info |
| `/auth/my-sanctions` | GET | Liste sanctions |
| `/auth/sanction-info` | GET | Details restriction active |
| `/auth/exchange-code` | POST | OAuth code → token |
| `/auth/{google,apple}` | GET | OAuth initiate |
| `/moderation/users/:id/warn` | POST | Warn (staff mobile) |
| `/moderation/users/:id/suspend` | POST | Suspend (staff mobile) |
| `/moderation/users/:id/ban` | POST | Ban (staff mobile) |
| `/notifications` | GET | Liste notifications |
| `/notifications/:id/read` | PATCH | Marquer lu |
| `/messagerie/*` | - | Conversations chiffrees |
| `/publications/*` | - | Feed, posts |
| `/stories/*` | - | Stories |
| `/utilisateurs/:id` | GET | Profil public |

### 2.2 Par Panel Moderation

| Endpoint | Methode | Usage |
|----------|---------|-------|
| `/admin/users` | GET | Liste users paginee |
| `/admin/users/:id` | GET | Detail user |
| `/admin/users/:id/warn` | POST | Warn |
| `/admin/users/:id/suspend` | POST | Suspend |
| `/admin/users/:id/ban` | POST | Ban |
| `/admin/users/:id/unban` | POST | Unban |
| `/moderation/users/:id/unsuspend` | POST | Unsuspend |
| `/admin/users/:id/role` | PATCH | Change role |
| `/admin/users/:id/timeline` | GET | Timeline moderation |
| `/admin/users/:id/audit` | GET | Audit logs user |
| `/admin/users/:id/activity` | GET | Activite complete |
| `/admin/users/:id/reports` | GET | Reports emis |
| `/admin/audit` | GET | Audit global |
| `/reports/*` | - | Signalements |
| `/admin/staff-chat/*` | - | Chat staff |

---

## 3. POINTS DE SECURITE ACTIFS (etat reel)

### 3.1 JWT

| Aspect | Statut | Fichier | Probleme |
|--------|--------|---------|----------|
| Secret configurable | OK | tokens.ts | JWT_SECRET en .env |
| Expiration | OK | tokens.ts | 7d par defaut |
| Algorithme sign | **KO** | tokens.ts:29 | Pas de `algorithm: 'HS256'` |
| Algorithme verify | **KO** | tokens.ts:42 | Pas de `algorithms: ['HS256']` |

### 3.2 OAuth

| Provider | Backend | Mobile | Probleme |
|----------|---------|--------|----------|
| Google | OK | OK | State valide cote backend |
| Apple | OK | OK | Nonce a verifier |
| Facebook | OK | - | Non utilise mobile |

**Note OAuth Mobile:** Le flux utilise un code temporaire (bon) mais le state n'est pas valide cote mobile (le backend le valide).

### 3.3 Rate Limiting

| Route | Config actuelle | Probleme |
|-------|-----------------|----------|
| Global `/api/` | 100/15min | OK |
| `/auth/connexion` | 10/15min | OK |
| `/auth/inscription` | 10/15min | OK |
| `/admin/*` | 200/15min | OK |
| `/moderation/*` | 200/15min | OK |
| Sanctions | 50/1h | OK |
| **`/auth/moi`** | **AUCUN specifique** | **A AJOUTER** |

### 3.4 CORS

- Whitelist explicite (pas de `*`) ✅
- Regex Vercel previews ✅
- Credentials: true ✅

### 3.5 Encryption Messages

- AES-256-GCM ✅
- IV 12 bytes aleatoire ✅
- AuthTag 16 bytes ✅
- Versioning v2 ✅
- Backward compat v1 CBC ✅

---

## 4. PROBLEMES IDENTIFIES A CORRIGER

### P0 - BLOQUANT (immediat)

| ID | Probleme | Fichier(s) | Impact |
|----|----------|------------|--------|
| P0-1a | Pas d'index unique sanctions | `Notification.ts` | Doublons possibles |
| P0-1b | Pas d'eventId dans sanctions | `moderationController.ts`, `sanctionNotification.ts`, `AuditLog.ts` | Race conditions |
| P0-1c | Dedup minute-based fragile | `authController.ts` (my-sanctions) | Fusion incorrecte |
| P0-2 | JWT sans algo explicite | `tokens.ts:29,42` | Attaque algo confusion |
| P0-4 | Rate limit manquant /auth/moi | `app.ts` | Heartbeat abuse |

### P1 - IMPORTANT (cette semaine)

| ID | Probleme | Fichier(s) | Impact |
|----|----------|------------|--------|
| P1-1 | OAuth state non valide mobile | `oauth.ts` mobile | CSRF (faible car backend valide) |
| P1-2 | Stack trace sans __DEV__ | `api.ts:159-160` mobile | Fuite info |
| P1-3 | Pas de modales confirmation | `UserDetail.tsx` moderation | UX danger |
| P1-4 | Populate sans .select() | Plusieurs controllers | Perf |
| P1-5 | KeyboardAvoidingView | Formulaires mobile | UX |

### P2 - QUALITE (backlog)

| ID | Probleme | Fichier(s) |
|----|----------|------------|
| P2-1 | Pas de tests automatises | - |
| P2-2 | Cursor pagination manquante | feedController.ts |
| P2-3 | Refresh token absent | tokens.ts |

---

## 5. PLAN D'EXECUTION

### Phase P0 (maintenant)

1. **P0-1: Anti-doublon sanctions**
   - [ ] Ajouter `eventId` dans `AuditLog.ts` avec index unique
   - [ ] Ajouter `eventId` dans `Notification.ts` avec index unique partiel
   - [ ] Modifier `sanctionNotification.ts` pour accepter eventId
   - [ ] Modifier `moderationController.ts` pour generer eventId
   - [ ] Rendre endpoints idempotents (header X-Event-Id optionnel)
   - [ ] Refactorer `/auth/my-sanctions` pour dedup par eventId

2. **P0-2: JWT algorithm explicite**
   - [ ] Ajouter `algorithm: 'HS256'` dans `genererToken()`
   - [ ] Ajouter `algorithms: ['HS256']` dans `verifierToken()`

3. **P0-4: Rate limit /auth/moi**
   - [ ] Ajouter limiter specifique dans `app.ts`
   - [ ] Config: 20/min/user, 60/min/IP

### Phase P1 (cette semaine)

4. **P1-2: Logs mobile**
   - [ ] Conditionner stack trace avec `__DEV__` dans `api.ts`

5. **P1-3: Modales confirmation Panel**
   - [ ] Ajouter confirm dialog avant ban/suspend/warn dans `UserDetail.tsx`

6. **P1-4: Projection .select()**
   - [ ] Auditer et corriger populate() dans controllers lourds

### Phase P2 (backlog)

7. **Tests automatises**
   - [ ] Setup Jest backend
   - [ ] Tests auth/JWT
   - [ ] Tests RBAC
   - [ ] Tests sanctions + escalade
   - [ ] Tests idempotency eventId

---

## 6. ROLLBACK STRATEGY

### Si P0 casse prod:

1. **Revert commits sur backend:**
   ```bash
   git revert HEAD~N  # N = nombre de commits P0
   git push origin backend
   ```

2. **Render auto-deploy:** Le revert declenche automatiquement un redeploy.

3. **MongoDB indexes:** Les nouveaux indexes sont additifs, pas de rollback necessaire.
   Si besoin de supprimer:
   ```js
   db.notifications.dropIndex('eventId_unique_sanctions')
   db.auditlogs.dropIndex('eventId_unique')
   ```

4. **Mobile (DevMobile):** Publier une version sans les changements.

5. **Moderation:** Revert et rebuild.

---

**Ce fichier sera mis a jour au fur et a mesure des corrections.**
