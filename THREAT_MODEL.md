# THREAT MODEL - CELSE / La Premiere Pierre

> Version: 2.0 | Date: 2026-02-13
> Auteur: Security Architect / Red Team Lead
> Scope: Backend API + Socket.io + Web + Mobile + Moderation

---

## Score Securite Global

| Metrique | Avant audit | Apres correctifs |
|----------|-------------|------------------|
| Auth & Sessions | 72/100 | 91/100 |
| Integrite donnees | 78/100 | 93/100 |
| Relations sociales | 55/100 | 85/100 |
| Messagerie | 80/100 | 92/100 |
| Moderation | 82/100 | 95/100 |
| RGPD | 45/100 | 82/100 |
| Socket temps reel | 75/100 | 90/100 |
| **GLOBAL** | **69/100** | **90/100** |

---

## 1. AUTH & GESTION DE SESSION

### 1.1 Menaces identifiees

| ID | Menace | Vecteur | Impact | Probabilite | Statut |
|----|--------|---------|--------|-------------|--------|
| AUTH-01 | Liaison OAuth sans consentement | Google OAuth lie un compte local par email match sans demander confirmation | CRITIQUE - prise de compte | Moyenne | CORRIGE |
| AUTH-02 | Enumeration comptes via provider | Message erreur revele le provider OAuth utilise (ligne 114 authController) | MOYEN - reconnaissance | Haute | CORRIGE |
| AUTH-03 | Brute force lent | 10 tentatives/15min = 960/jour sans lockout | MOYEN - compromission | Moyenne | CORRIGE |
| AUTH-04 | IP spoofing rate limit | `validate: { trustProxy: false }` desactive validation IP (app.ts:127) | HAUT - contournement rate limit | Moyenne | CORRIGE |
| AUTH-05 | OAuth store en memoire | Map() perdue au redemarrage, casse OAuth en multi-instance | MOYEN - deni de service | Haute | DOCUMENTE |
| AUTH-06 | Emails temporaires Facebook | `facebook_{id}@lpp.temp` = compte irrecuperable | BAS - UX | Basse | DOCUMENTE |
| AUTH-07 | Token blacklist sans cache | Query MongoDB a chaque requete authentifiee | MOYEN - performance | Moyenne | DOCUMENTE |
| AUTH-08 | JWT contient email | PII dans le payload JWT | BAS - fuite donnees | Basse | DOCUMENTE |

### 1.2 Protections existantes (validees)

- JWT HS256 avec secret valide obligatoire
- Bcrypt salt rounds 12
- Token blacklist MongoDB avec TTL auto-cleanup
- CORS whitelist stricte (pas de wildcard)
- Helmet headers securite
- OAuth CSRF via nonces cryptographiques (32 bytes)
- Ban/suspend checks sur connexion et /moi
- PII redactees dans les logs (`[EMAIL]`, `[TOKEN]`)
- Verification ban/suspend dans middleware socket

---

## 2. PROJETS (cycle de vie, donnees)

### 2.1 Menaces identifiees

| ID | Menace | Vecteur | Impact | Probabilite | Statut |
|----|--------|---------|--------|-------------|--------|
| PROJ-01 | IDOR upload documents | Upload sans verification ownership | HAUT - injection contenu | Haute | DEJA CORRIGE (RED) |
| PROJ-02 | IDOR upload media | Upload media sur projet non-possede | HAUT - injection contenu | Haute | DEJA CORRIGE (RED) |
| PROJ-03 | Scraping masse projets | Pas de rate limit sur GET /projets/:id | BAS - exfiltration | Basse | ACCEPTABLE |
| PROJ-04 | Race condition equipe | Validation stale entre check et push atomique | BAS - inconsistance | Basse | ACCEPTABLE |
| PROJ-05 | Follow race condition | Inflation followers par requetes paralleles | MOYEN - metriques | Moyenne | DEJA CORRIGE ($addToSet) |

### 2.2 Protections existantes

- `canEditProject()` verification ownership/team
- `$addToSet` atomique pour followers (pas de doublons)
- Cascade delete notifications/reports a la suppression projet (RED-03)
- Validation Zod sur creation/modification
- escapeRegex protection ReDoS
- Limite pagination (max 50)

---

## 3. MESSAGERIE (chiffrement, abus)

### 3.1 Menaces identifiees

| ID | Menace | Vecteur | Impact | Probabilite | Statut |
|----|--------|---------|--------|-------------|--------|
| MSG-01 | Reaction spam race | pull+push sequentiel cree fenetre de race pour doublons reactions | MOYEN - spam | Moyenne | CORRIGE |
| MSG-02 | Edition message post-moderation | User edite message offensant dans les 15min avant action modo | BAS - evasion | Basse | ACCEPTABLE (audit trail) |
| MSG-03 | Flood messages | 60 msg/15min = 4/min autorise | BAS - spam modere | Basse | ACCEPTABLE |
| MSG-04 | Groupe > 50 participants | Verification serveur max participants | BAS - DoS | Basse | DEJA PROTEGE |

### 3.2 Protections existantes

- Chiffrement AES-256-GCM des messages
- Verification membership conversation
- $addToSet atomique pour groupes
- Rate limit 60 msg/15min
- Validation Zod (25MB max media, 50 participants max)
- Mute toggle atomique ($pull/$addToSet)
- Edition limitee a 15 min avec tracking date

---

## 4. STORIES & LIVE (temps reel, fatigue)

### 4.1 Menaces identifiees

| ID | Menace | Vecteur | Impact | Probabilite | Statut |
|----|--------|---------|--------|-------------|--------|
| STORY-01 | Story spam sans rate limit | Pas de limite creation stories | MOYEN - fatigue feed | Moyenne | CORRIGE |
| STORY-02 | Viewer inflation | Meme user compte plusieurs fois | BAS - metriques | Basse | DEJA CORRIGE ($addToSet) |
| STORY-03 | Widget abuse | > 10 widgets par story | BAS - charge serveur | Basse | DEJA PROTEGE (max 10) |
| LIVE-01 | Viewer count manipulation | Join/leave spam | HAUT - fausses metriques | Haute | DEJA CORRIGE (RED-08) |
| LIVE-02 | Multi-live simultane | User demarre 2+ lives | MOYEN - abus ressources | Moyenne | DEJA PROTEGE |
| LIVE-03 | Leave sans join | Decrement compteur sous 0 | HAUT - metriques negatives | Moyenne | DEJA CORRIGE ($gt:0) |

### 4.2 Protections existantes

- Set unique viewers en memoire (live)
- $addToSet pour story views
- Max 1 live actif par user
- Widget limit 10 par story
- Rate limit sur /stories/:id/seen et /live/:id/join|leave
- $gt: 0 condition sur decrement viewerCount

---

## 5. NOTIFICATIONS (leak, spam, fatigue)

### 5.1 Menaces identifiees

| ID | Menace | Vecteur | Impact | Probabilite | Statut |
|----|--------|---------|--------|-------------|--------|
| NOTIF-01 | Comment notification spam | Post/delete rapide = notifications fantomes | MOYEN - fatigue | Moyenne | CORRIGE |
| NOTIF-02 | Like toggle spam | Like/unlike rapide genere notification a chaque like | MOYEN - fatigue | Moyenne | CORRIGE |
| NOTIF-03 | Friend request spam | 30 demandes/15min vers differentes cibles | MOYEN - harcelement | Moyenne | CORRIGE |
| NOTIF-04 | Notification data leak | Notifications contiennent info sur contenu prive | BAS - fuite | Basse | ACCEPTABLE |

### 5.2 Protections existantes

- Deduplication notifications like (findOne avant create)
- TTL auto-suppression 90 jours (notifications lues)
- Rate limit global write 30/15min

---

## 6. RELATIONS SOCIALES (amis, followers, vie privee)

### 6.1 Menaces identifiees

| ID | Menace | Vecteur | Impact | Probabilite | Statut |
|----|--------|---------|--------|-------------|--------|
| SOC-01 | Pas de systeme blocage | Utilisateurs ne peuvent pas bloquer un harceleur | CRITIQUE - harcelement | Haute | DOCUMENTE (P2) |
| SOC-02 | Profil prive sur-expose | Bio, avatar, role exposes meme si profilPublic=false | MOYEN - vie privee | Moyenne | CORRIGE |
| SOC-03 | Exposition role dans recherche | Recherche users expose le role (admin/modo visible) | BAS - reconnaissance | Basse | CORRIGE |
| SOC-04 | Race condition amis | Double-add concurrent possible | BAS - inconsistance | Basse | DEJA CORRIGE ($addToSet) |
| SOC-05 | Deduplication ami faible | Pre-save hook peut echouer mi-transaction | BAS - inconsistance | Tres basse | ACCEPTABLE |

### 6.2 Protections existantes

- Verification bidirectionnelle amis (getMesAmis)
- Atomic $addToSet pour demandes/acceptations
- ProfilPublic flag avec donnees reduites
- Rate limit global sur demandes ami

---

## 7. MODERATION (auto-moderation, escalade, abus pouvoir)

### 7.1 Menaces identifiees

| ID | Menace | Vecteur | Impact | Probabilite | Statut |
|----|--------|---------|--------|-------------|--------|
| MOD-01 | Report count race | aggregateCount non-atomique entre create et update | MOYEN - escalade manquee | Moyenne | CORRIGE |
| MOD-02 | Report flooding | 5 reports/10min in-memory = passe en multi-instance | MOYEN - spam reports | Basse | CORRIGE |
| MOD-03 | Self-report bypass | Report son propre contenu pour trigger escalade | BAS - manipulation | Basse | DEJA PROTEGE |
| MOD-04 | Privilege escalation modo | Modo tente de sanctionner un admin | CRITIQUE - abus | Basse | DEJA PROTEGE (hierarchie) |
| MOD-05 | Idempotency bypass | Replay action moderation sans eventId | MOYEN - double sanction | Basse | DEJA PROTEGE (X-Event-Id) |
| MOD-06 | Fatigue moderateur | Actions en masse sans detection pattern anormal | MOYEN - burnout/erreur | Moyenne | CORRIGE |

### 7.2 Protections existantes

- Auto-escalation (3 warnings -> suspend, 3 more -> ban)
- Idempotency via eventId (sparse unique index)
- Role hierarchy checks
- Rate limit 50 sanctions/heure
- Audit log immutable avec snapshots before/after
- Source tracking (qui a fait quoi)
- Self-report prevention (publication et commentaire)

---

## 8. RGPD (consentement, export, suppression, transfert)

### 8.1 Menaces identifiees

| ID | Menace | Vecteur | Impact | Probabilite | Statut |
|----|--------|---------|--------|-------------|--------|
| RGPD-01 | Pas de tracking consentement | Seul `cguAcceptees` boolean, pas de granularite | CRITIQUE - Art. 7 | Haute | DOCUMENTE (P2) |
| RGPD-02 | DSAR incomplet | Stories, likes, activite manquants de l'export | HAUT - Art. 15 | Haute | CORRIGE |
| RGPD-03 | Suppression cascade incomplete | Stories, projets, audit logs non traites | HAUT - Art. 17 | Haute | CORRIGE |
| RGPD-04 | Sur-exposition donnees | API retourne plus de champs que necessaire | MOYEN - Art. 5 | Moyenne | CORRIGE |
| RGPD-05 | Audit logs non anonymises | References user deletees restent en clair | MOYEN - Art. 17 | Moyenne | CORRIGE |
| RGPD-06 | Notification TTL correct | Auto-delete 90j notifications lues | OK | - | DEJA PROTEGE |
| RGPD-07 | Token blacklist TTL | Auto-cleanup tokens expires | OK | - | DEJA PROTEGE |

---

## Matrice des attaquants

| Profil attaquant | Motivation | Capacites | Menaces principales |
|-----------------|------------|-----------|---------------------|
| **Utilisateur malveillant** | Harcelement, spam, ego | Compte legitime, automatisation basique | NOTIF-01/02/03, SOC-01, STORY-01, MSG-01 |
| **Attaquant patient** | Prise de compte, exfiltration | Scripts, multi-comptes, timing attacks | AUTH-01/02/03, PROJ-03, MOD-01/02 |
| **Attaquant interne (modo)** | Abus de pouvoir, vengeance | Acces moderation, connaissances internes | MOD-04/05/06, RGPD-05 |
| **Script kiddie** | Defacement, DoS | Outils publics, brute force | AUTH-04, LIVE-01, REPORT flooding |
| **RGPD auditor** | Conformite | Demandes DSAR, tests retention | RGPD-01/02/03/04/05 |

---

## Priorites de correction

### P0 - Critique (cette session)
1. AUTH-01: Liaison OAuth sans consentement
2. AUTH-04: Rate limit IP validation
3. AUTH-03: Account lockout brute force
4. MOD-01: Report aggregateCount atomique
5. NOTIF-01/02/03: Anti-spam notifications
6. STORY-01: Rate limit stories
7. RGPD-02/03: DSAR complet + cascade delete
8. SOC-02/03: Minimisation donnees profil

### P1 - Important (court terme)
1. AUTH-02: Message erreur generique OAuth
2. MSG-01: Reaction race condition fix
3. MOD-02: Rate limit reports distribue
4. MOD-06: Detection fatigue moderateur
5. RGPD-04: Minimisation champs API
6. RGPD-05: Anonymisation audit logs

### P2 - Planifie (moyen terme)
1. SOC-01: Systeme de blocage utilisateurs
2. RGPD-01: Tracking consentement granulaire
3. AUTH-05: Migration OAuth store vers Redis
4. AUTH-07: Cache token blacklist
5. AUTH-08: Retirer email du JWT payload

---

## Architecture securite validee

```
Client (Web/Mobile/Moderation)
    |
    | HTTPS + CSP + Referrer-Policy
    |
[Rate Limiting: express-rate-limit]
    |
[CORS: whitelist stricte]
    |
[Helmet: security headers]
    |
[JWT verification + BlacklistCheck]
    |
[checkUserStatus: ban/suspend]
    |
[requirePermission: RBAC 17 permissions]
    |
[Zod validation: input sanitization]
    |
[Controller: business logic]
    |
[Mongoose: atomic ops, indexes, TTL]
    |
[MongoDB: encrypted at rest]
```

```
Socket.io
    |
[CORS: same whitelist]
    |
[Auth middleware: JWT + ban/suspend]
    |
[MAX_SOCKETS_PER_USER: 5]
    |
[SocketRateLimiter: per-event sliding window]
    |
[Room validation: membership check]
    |
[MAX_ROOMS_PER_SOCKET: 50]
```
