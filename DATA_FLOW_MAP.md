# DATA FLOW MAP - CELSE / La Premiere Pierre

> Version: 1.0 | Date: 2026-02-13
> Objectif: Cartographier tous les flux de donnees personnelles

---

## 1. Vue d'ensemble

```
                     [Mobile App]
                         |
                    HTTPS/WSS
                         |
[Web App] --HTTPS--> [API Backend] <--HTTPS-- [Moderation Tool]
                         |
                    [MongoDB Atlas]
                         |
                    [Cloudinary CDN]
```

---

## 2. Flux d'authentification

```
Utilisateur --> [POST /auth/inscription]
    |               |
    |         Zod validation
    |               |
    |         bcrypt(motDePasse, 12)
    |               |
    |         Utilisateur.create()
    |               |
    |         genererToken(JWT HS256, 7j)
    |               |
    +<--- { token, profil }

Utilisateur --> [POST /auth/connexion]
    |               |
    |         Lockout check (5 echecs = 30 min)
    |               |
    |         Zod validation
    |               |
    |         bcrypt.compare()
    |               |
    |         ban/suspend check
    |               |
    |         genererToken(JWT)
    |               |
    +<--- { token, profil }

Utilisateur --> [POST /auth/deconnexion]
    |               |
    |         extraireTokenDuHeader()
    |               |
    |         blacklistToken() --> TokenBlacklist (TTL: 7j)
    |               |
    +<--- { succes: true }

OAuth (Google/Facebook/Apple):
    Provider --> callback --> validate nonce --> find/create user --> genererToken
    Note: Plus de liaison automatique par email (SEC-AUTH-01)
```

---

## 3. Flux de donnees contenu

```
[Publication]
    Auteur --> POST /publications
        |-- Zod validation (contenu max 5000, media)
        |-- Upload Cloudinary (si base64)
        |-- Publication.create()
        |-- Rate limit: 30 creations/15min

    Lecteur --> GET /publications/:id
        |-- chargerUtilisateurOptionnel (pas d'auth requise)
        |-- Publication.findById().populate('auteur', 'prenom nom avatar')

    Like --> POST /publications/:id/like
        |-- verifierJwt + checkUserStatus
        |-- $addToSet/$pull atomique
        |-- Notification (dedup: 1 par user/publication)

    Commentaire --> POST /publications/:id/commentaires
        |-- Zod validation (contenu max 1000)
        |-- Notification (dedup: 1 par user/publication/5min)

[Story]
    Auteur --> POST /stories
        |-- Rate limit: 10/heure (SEC-STORY-01)
        |-- Upload Cloudinary
        |-- Story.create() avec dateExpiration
        |-- Auto-suppression a l'expiration

    Vues --> POST /stories/:id/seen
        |-- $addToSet atomique (pas de doublons)

[Messages]
    Expediteur --> POST /messagerie/envoyer
        |-- Zod validation (25MB max media)
        |-- chiffrerMessage(AES-256-GCM)
        |-- Message.create()
        |-- Socket.io emit en temps reel
        |-- Rate limit: 60 msg/15min

    Donnees chiffrees stockees:
        |-- contenu: { iv, encryptedData, authTag }
        |-- Cle: MESSAGE_ENCRYPTION_KEY (env)

[Projets]
    Porteur --> POST /projets/entrepreneur
        |-- Zod validation
        |-- canEditProject() verification
        |-- Upload Cloudinary (documents, media)

    Follower --> POST /projets/:id/follow
        |-- $addToSet atomique
        |-- Notification dedup
```

---

## 4. Flux moderation

```
[Signalement]
    Utilisateur --> POST /reports
        |-- Rate limit: 5/10min (in-memory)
        |-- Self-report prevention
        |-- Dedup unique (reporter + target)
        |-- Priorite auto (REASON_PRIORITY_MAP)
        |-- Auto-escalade ($inc atomique)

[Actions moderateur]
    Modo/Admin --> PATCH /moderation/users/:id/warn
        |-- verifierJwt + requirePermission('users:warn')
        |-- Role hierarchy check
        |-- Idempotency (X-Event-Id)
        |-- Utilisateur.findByIdAndUpdate($push warning)
        |-- Auto-escalade (3 warn -> suspend, 3 more -> ban)
        |-- AuditLog.create() (snapshot before/after)
        |-- Notification utilisateur sanctionne

    Pipeline audit:
        Action --> AuditLog {
            action, performedBy, targetType, targetId,
            metadata, snapshots { before, after },
            eventId (unique), source, ipAddress
        }
```

---

## 5. Flux temps reel (Socket.io)

```
Client --> connect
    |-- JWT verification (HS256)
    |-- Ban/suspend check
    |-- MAX_SOCKETS_PER_USER: 5
    |-- Enregistrement socket dans userSockets Map

Client --> join_conversation
    |-- Rate limit: 20/min
    |-- Membership verification (Conversation.participants)
    |-- MAX_ROOMS_PER_SOCKET: 50

Server --> emit events:
    |-- new_message (conversation room)
    |-- new_notification (user room)
    |-- demande_ami (user room)
    |-- typing (conversation room, 30/min rate limit)
    |-- message_read (30/min rate limit)
```

---

## 6. Flux suppression (RGPD Art. 17)

```
Utilisateur --> DELETE /api/profil
    |-- Verification mot de passe + confirmation
    |
    +-- Cascade parallele:
        |-- Notification.deleteMany(destinataire + data.userId)
        |-- Publication.deleteMany(auteur)
        |-- Commentaire.deleteMany(auteur)
        |-- Publication.updateMany($pull likes)
        |-- Commentaire.updateMany($pull likes)
        |-- Message.deleteMany(expediteur)
        |-- Message.updateMany($pull lecteurs)
        |-- Story.deleteMany(utilisateur)
        |-- Story.updateMany($pull vues)
        |-- Projet.updateMany($pull followers)
        |-- AuditLog.updateMany(anonymize performedBy)
        |-- Report.updateMany(anonymize reporter)
    |
    +-- Conversations:
        |-- 1-1: supprimer conversation + messages
        |-- Groupe: retirer participant, transferer createur
    |
    +-- Relations sociales:
        |-- Utilisateur.updateMany($pull amis)
        |-- Utilisateur.updateMany($pull demandesAmisRecues)
        |-- Utilisateur.updateMany($pull demandesAmisEnvoyees)
    |
    +-- Utilisateur.findByIdAndDelete()
```

---

## 7. Flux export (RGPD Art. 15/20)

```
Utilisateur --> GET /api/profil/export
    |
    +-- Promise.all (10 requetes paralleles):
        |-- Utilisateur (profil complet sans mdp)
        |-- Publication (contenu, medias, likes)
        |-- Commentaire (contenu, dates)
        |-- Notification (500 max, types, dates)
        |-- Projet (nom, description, statut)
        |-- Report (signalements emis)
        |-- Conversation (metadata, pas de contenu chiffre)
        |-- Story (type, dates, vues)
        |-- Publication liked (historique likes)
        |-- Projet suivis (noms)
    |
    +-- Format JSON structure avec _meta
```

---

## 8. Stockage externe

| Service | Donnees | Localisation | Chiffrement |
|---------|---------|-------------|-------------|
| MongoDB Atlas | Toutes les donnees applicatives | Cloud (configurable) | At rest + in transit |
| Cloudinary | Images, videos, documents | CDN global | HTTPS + signed URLs |

---

## 9. Retention automatique

| Donnee | TTL | Mecanisme |
|--------|-----|-----------|
| Notifications lues | 90 jours | MongoDB TTL index |
| Tokens blacklistes | 7 jours | MongoDB TTL index |
| Stories | Configurable | dateExpiration |
| Rate limit maps | 5-15 min | setInterval cleanup |
| OAuth states | 10 min | setInterval cleanup |
| OAuth temp codes | 5 min | setInterval cleanup |
| Login lockouts | 30 min | setInterval cleanup |
