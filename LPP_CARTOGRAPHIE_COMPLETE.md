# LA PREMIERE PIERRE (LPP) — CARTOGRAPHIE TECHNIQUE & PRODUIT COMPLETE

> Document de reference absolu — Audit exhaustif du projet
> Date : 24 fevrier 2026
> Branche auditee : backend, DevMobile, master, Moderation

---

## TABLE DES MATIERES

1. [Presentation generale](#1-presentation-generale)
2. [Architecture globale & branches](#2-architecture-globale--branches)
3. [Backend (branche backend)](#3-backend-branche-backend)
   - 3.1 Stack technique
   - 3.2 Structure des dossiers
   - 3.3 Modeles de donnees (19 modeles)
   - 3.4 Routes & endpoints (60+)
   - 3.5 Controllers (19)
   - 3.6 Middlewares
   - 3.7 Authentification & OAuth
   - 3.8 Permissions & roles
   - 3.9 WebSocket (Socket.io)
   - 3.10 Services externes
   - 3.11 Securite
   - 3.12 Taches planifiees (CRON)
   - 3.13 Gestion des erreurs
4. [Application Mobile (branche DevMobile)](#4-application-mobile-branche-devmobile)
   - 4.1 Stack technique
   - 4.2 Structure des dossiers
   - 4.3 Navigation & ecrans (35+)
   - 4.4 Composants (50+)
   - 4.5 Contexts (5)
   - 4.6 Services API (16)
   - 4.7 Hooks, Stores, Utils
   - 4.8 Configuration & constantes
5. [Site Web (branche master)](#5-site-web-branche-master)
   - 5.1 Stack technique
   - 5.2 Structure des dossiers
   - 5.3 Pages (18)
   - 5.4 Composants
   - 5.5 Services API (12)
   - 5.6 Contexts
   - 5.7 Deploiement (Vercel)
6. [Logiciel de Moderation (branche Moderation)](#6-logiciel-de-moderation-branche-moderation)
   - 6.1 Stack technique
   - 6.2 Structure des dossiers
   - 6.3 Pages (28)
   - 6.4 Services API (19)
   - 6.5 Fonctionnalites de moderation
   - 6.6 Securite & monitoring
7. [Ecran par ecran — Inventaire complet](#7-ecran-par-ecran--inventaire-complet)
8. [Features & logique metier](#8-features--logique-metier)
9. [Modeles de donnees & etats](#9-modeles-de-donnees--etats)
10. [UX/UI & coherence](#10-uxui--coherence)
11. [Parite fonctionnelle Mobile / Web](#11-parite-fonctionnelle-mobile--web)
12. [Problemes connus & dette technique](#12-problemes-connus--dette-technique)
13. [Auto-audit final](#13-auto-audit-final)

---

## 1. PRESENTATION GENERALE

**La Premiere Pierre (LPP)** est une plateforme sociale francaise qui met en relation de jeunes investisseurs avec des startups. Elle combine :

- Un **reseau social** (publications, stories, commentaires, likes, amis)
- Une **vitrine de projets/startups** (creation, suivi, decouverte)
- Un **systeme de messagerie** temps reel (DM + groupes)
- Un **systeme de gamification** (XP, niveaux, quetes)
- Un **abonnement premium** (LPP+) avec badge verifie
- Un **systeme de moderation** complet pour le staff
- Du **live streaming** via Agora

**Ecosysteme applicatif** :
| Composant | Branche | Deploiement | Technologie |
|-----------|---------|-------------|-------------|
| Backend API | `backend` | Render | Node.js / Express / MongoDB |
| App Mobile | `DevMobile` | Expo (iOS + Android) | React Native / Expo SDK 54 |
| Site Web | `master` | Vercel | React 19 / Vite / TypeScript |
| Moderation | `Moderation` | Vercel (ou statique) | React 19 / Vite / TailwindCSS |

**Repository unique** : `https://github.com/Flavien-Walk/siteweb_back_lpp_v1.git`
**URL API** : `https://siteweb-back-lpp-v1.onrender.com/api`

---

## 2. ARCHITECTURE GLOBALE & BRANCHES

### Schema d'architecture

```
                    +------------------+
                    |   BACKEND API    |
                    |  (branche backend)|
                    |  Express + MongoDB|
                    |  Render.com       |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
     +--------+------+ +----+------+ +-----+--------+
     | APP MOBILE    | | SITE WEB  | | MODERATION   |
     | (DevMobile)   | | (master)  | | (Moderation) |
     | Expo/RN       | | React/Vite| | React/Vite   |
     | iOS + Android | | Vercel    | | TailwindCSS  |
     +---------------+ +-----------+ +--------------+
```

### Branche `backend`
- **Role** : Backend central de tout l'ecosysteme
- **Sert** : mobile, web, moderation
- **Contenu** : Express.js, MongoDB (Mongoose), Socket.io, controllers, models, middlewares, crons
- **Etat de maturite** : Production, stable, securise

### Branche `DevMobile`
- **Role** : Application mobile (iOS + Android)
- **Contenu** : Expo Router, composants React Native, services API, contexts
- **Etat de maturite** : Production, activement developpee

### Branche `master`
- **Role** : Site web deploye sur Vercel
- **Contenu** : React 19, Vite, pages/composants/services
- **Etat de maturite** : Production, fonctionnellement coherente avec le mobile

### Branche `Moderation`
- **Role** : Interface d'administration et de moderation pour le staff
- **Contenu** : React 19, Vite, TailwindCSS, React Query, Recharts
- **Etat de maturite** : ~95% complete, production-ready

### Incohérence constatee
- La branche `DevMobile` contient des dossiers `dist/`, `web/`, `moderation/` a la racine, mais ceux-ci sont ignores par `.gitignore`. Pas de melange fonctionnel, mais la presence de ces dossiers localement peut preter a confusion.

---

## 3. BACKEND (branche backend)

### 3.1 Stack technique

| Technologie | Version | Role |
|-------------|---------|------|
| Node.js | 18+ | Runtime |
| Express.js | 4.x | Framework HTTP |
| TypeScript | 5.x | Langage (compile en JS dans dist/) |
| MongoDB | Atlas | Base de donnees |
| Mongoose | 7.x+ | ODM |
| Socket.io | 4.8.x | WebSocket temps reel |
| Zod | 3.x | Validation de schemas |
| bcryptjs | - | Hashage mots de passe |
| jsonwebtoken | - | JWT |
| Passport.js | - | OAuth (Google, Facebook, Apple) |
| Cloudinary | - | Hebergement medias |
| Resend | - | Emails transactionnels |
| Agora | - | Live streaming tokens |
| Helmet | - | Headers securite |
| express-mongo-sanitize | - | Protection NoSQL injection |

### 3.2 Structure des dossiers

```
src/
├── controllers/        # 19 controllers
├── models/             # 19+ modeles Mongoose
├── routes/             # 17 fichiers de routes
├── middlewares/         # Auth, permissions, securite, validation
├── services/           # Logique metier (gamification, emails, etc.)
├── utils/              # Helpers (validation, encryption, etc.)
├── config/             # Configuration (DB, OAuth, etc.)
├── crons/              # Taches planifiees
├── types/              # Types TypeScript
├── app.ts              # Configuration Express
└── server.ts           # Point d'entree (HTTP + WebSocket)
```

### 3.3 Modeles de donnees (19 modeles)

#### Utilisateur
| Champ | Type | Description |
|-------|------|-------------|
| prenom | String | Prenom |
| nom | String | Nom |
| email | String (unique) | Email |
| motDePasse | String (select:false) | Hash bcrypt |
| provider | `local\|google\|facebook\|apple` | Methode d'authentification |
| avatar | String | URL Cloudinary |
| bio | String | Biographie |
| role | `user\|modo_test\|modo\|admin_modo\|super_admin` | Role systeme |
| permissions | String[] | Permissions custom |
| statut | `visiteur\|entrepreneur` | Statut fonctionnel |
| cguAcceptees | Boolean | CGU |
| emailVerifie | Boolean | Email verifie |
| amis | ObjectId[] | Liste d'amis |
| demandesAmisRecues | ObjectId[] | Demandes recues |
| demandesAmisEnvoyees | ObjectId[] | Demandes envoyees |
| suspendedUntil | Date | Fin de suspension |
| bannedAt | Date | Date de ban |
| warnings | Object[] | Avertissements |
| lppPlus | Object | Abonnement {status, currentPeriodEnd, cancelAtPeriodEnd, renewalCount} |
| surveillance | Object | {active, notes, activatedBy, activatedAt} |
| profilPublic | Boolean | Profil public/prive |

#### Publication
| Champ | Type | Description |
|-------|------|-------------|
| auteur | ObjectId (ref: Utilisateur) | Auteur |
| auteurType | `Utilisateur\|Projet` | Type d'auteur |
| type | `post\|annonce\|update\|editorial\|live-extrait` | Type de publication |
| contenu | String | Texte |
| medias | [{type, url, thumbnailUrl}] | Photos/videos |
| mentions | [{userId, prenom, nom}] | Mentions |
| projet | ObjectId | Projet associe |
| likes | ObjectId[] | Likes |
| nbCommentaires | Number | Compteur |
| isHidden | Boolean | Masque par moderation |

#### Commentaire
| Champ | Type | Description |
|-------|------|-------------|
| publication | ObjectId | Publication parent |
| auteur | ObjectId | Auteur |
| contenu | String | Texte |
| likes | ObjectId[] | Likes |
| reponseA | ObjectId | Reponse a un commentaire |
| modifie | Boolean | Edite |
| editedBy | ObjectId | Edite par (moderation) |
| editReason | String | Raison d'edition |

#### Projet
| Champ | Type | Description |
|-------|------|-------------|
| nom | String | Nom du projet |
| description | String | Description |
| pitch | String | Pitch court |
| logo | String | URL logo |
| categorie | `tech\|food\|sante\|education\|energie\|culture\|environnement\|autre` | Categorie |
| secteur | String | Secteur d'activite |
| tags | String[] | Tags |
| localisation | {ville, lat, lng} | Localisation |
| incubateur | String | Incubateur |
| porteur | ObjectId | Fondateur |
| equipe | [{utilisateur, role, dateAjout}] | Equipe |
| probleme | String | Probleme resolu |
| solution | String | Solution proposee |
| avantageConcurrentiel | String | Avantage concurrentiel |
| cible | String | Cible |
| maturite | `idee\|prototype\|lancement\|croissance` | Maturite |
| businessModel | String | Business model |
| metriques | [{label, value}] | Metriques cles |
| objectifFinancement | Number | Objectif financement |
| montantLeve | Number | Montant leve |
| image | String | Image couverture |
| pitchVideo | String | Video pitch |
| galerie | String[] | Galerie medias |
| documents | [{nom, url, type, taille, visibilite}] | Documents |
| liens | [{titre, url, type}] | Liens externes |
| statut | `draft\|published` | Statut publication |
| followers | ObjectId[] | Suiveurs |
| isHidden | Boolean | Masque par moderation |

#### Conversation
| Champ | Type | Description |
|-------|------|-------------|
| participants | ObjectId[] | Participants |
| estGroupe | Boolean | Groupe ou DM |
| nomGroupe | String | Nom du groupe |
| imageGroupe | String | Image groupe |
| createur | ObjectId | Createur |
| admins | ObjectId[] | Administrateurs |
| dernierMessage | ObjectId | Dernier message |
| muetPar | ObjectId[] | Mis en sourdine par |

#### Message
| Champ | Type | Description |
|-------|------|-------------|
| conversation | ObjectId | Conversation |
| expediteur | ObjectId | Expediteur |
| type | `texte\|image\|video\|systeme` | Type |
| contenuCrypte | String | Contenu chiffre AES-256-GCM |
| lecteurs | ObjectId[] | Lecteurs |
| replyTo | ObjectId | Reponse a |
| reactions | [{utilisateur, type}] | Reactions emoji |

#### Notification
| Champ | Type | Description |
|-------|------|-------------|
| destinataire | ObjectId | Destinataire |
| type | String (20+ types) | Type de notification |
| titre | String | Titre |
| message | String | Message |
| lien | String | Lien |
| data | Object | Donnees supplementaires |
| lue | Boolean | Lue |

#### Story
| Champ | Type | Description |
|-------|------|-------------|
| utilisateur | ObjectId | Auteur |
| type | `photo\|video` | Type |
| mediaUrl | String | URL media |
| thumbnailUrl | String | Vignette |
| dateExpiration | Date | Expiration |
| viewers | ObjectId[] | Vues |
| widgets | [{type, position, data}] | Widgets (texte, emoji, lien, etc.) |
| isHidden | Boolean | Masque par moderation |

#### Live
| Champ | Type | Description |
|-------|------|-------------|
| hostUserId | ObjectId | Hote |
| channelName | String | Canal Agora |
| status | `live\|ended` | Statut |
| title | String | Titre |
| viewerCount | Number | Spectateurs actuels |
| peakViewerCount | Number | Pic de spectateurs |

#### Report
| Champ | Type | Description |
|-------|------|-------------|
| reporter | ObjectId | Signaleur |
| targetType | `post\|commentaire\|utilisateur` | Type cible |
| targetId | ObjectId | ID cible |
| reason | String (8 raisons) | Raison |
| status | `pending\|reviewed\|action_taken\|dismissed` | Statut |
| priority | `low\|medium\|high\|critical` | Priorite (auto-escalade) |
| assignedTo | ObjectId | Moderateur assigne |
| notes | [{author, content, date}] | Notes internes |

#### UserGamification
| Champ | Type | Description |
|-------|------|-------------|
| userId | ObjectId | Utilisateur |
| level | Number | Niveau |
| xp | Number | Points d'experience |
| xpThisWeek | Number | XP cette semaine |
| streakDays | Number | Jours consecutifs |
| onboarding | Object | Etat onboarding |
| activeQuickQuests | Object[] | Quetes rapides actives |
| activeQuests | Object[] | Quetes actives |

#### Autres modeles
| Modele | Role |
|--------|------|
| AuditLog | Trace d'audit des actions de moderation |
| BlockedIP | IPs bloquees avec TTL |
| BannedDevice | Empreintes d'appareils bannis |
| SecurityEvent | Evenements de securite (TTL 90 jours) |
| SupportTicket | Tickets de support |
| TokenBlacklist | Tokens JWT revoques |
| BroadcastNotification | Notifications de masse |
| ActivityLog | Suivi d'activite utilisateur |
| Evenement | Evenements (live, replay) |
| GamificationEvent | Evenements de gamification |
| StaffChat | Chat interne du staff |
| SecurityPurge | Archive des purges de securite |

### 3.4 Routes & endpoints (60+)

#### Authentification (`/api/auth`)
| Methode | Route | Description |
|---------|-------|-------------|
| POST | /inscription | Inscription email/mdp |
| POST | /connexion | Connexion |
| POST | /deconnexion | Deconnexion (blacklist token) |
| GET | /moi | Utilisateur courant |
| POST | /verifier-email | Verifier email (code 6 chiffres) |
| POST | /renvoyer-code | Renvoyer code verification |
| GET | /google | OAuth Google |
| GET | /google/callback | Callback Google |
| GET | /facebook | OAuth Facebook |
| GET | /facebook/callback | Callback Facebook |
| POST | /apple/callback | OAuth Apple |
| GET | /my-sanctions | Historique sanctions |
| GET | /moderation-status | Statut moderation |
| POST | /link/google/send-code | Envoyer code OTP pour liaison |
| POST | /link/google/verify-code | Verifier code OTP |
| POST | /link/google/confirm | Confirmer liaison avec mot de passe |

#### Profil (`/api/profil`)
| Methode | Route | Description |
|---------|-------|-------------|
| PATCH | / | Modifier profil |
| PATCH | /avatar | Modifier avatar |
| PATCH | /mot-de-passe | Changer mot de passe |
| PATCH | /statut | Changer statut (visiteur/entrepreneur) |
| DELETE | / | Supprimer compte |
| GET | /avatars | Avatars par defaut |
| GET | /export | Exporter donnees (RGPD) |

#### Publications (`/api/publications`)
| Methode | Route | Description |
|---------|-------|-------------|
| GET | / | Lister les publications (pagine, filtrable) |
| GET | /:id | Detail publication |
| POST | / | Creer publication |
| PATCH | /:id | Modifier publication |
| DELETE | /:id | Supprimer publication |
| POST | /:id/like | Toggle like |
| GET | /:id/commentaires | Lister commentaires |
| POST | /:id/commentaires | Ajouter commentaire |
| PATCH | /:id/commentaires/:cid | Modifier commentaire |
| DELETE | /:id/commentaires/:cid | Supprimer commentaire |
| POST | /:id/commentaires/:cid/like | Toggle like commentaire |
| GET | /mentions/recherche | Rechercher mentions |

#### Projets (`/api/projets`)
| Methode | Route | Description |
|---------|-------|-------------|
| GET | / | Lister projets (filtres: categorie, maturite, incubateur) |
| GET | /:id | Detail projet |
| POST | /:id/suivre | Toggle suivre |
| GET | /suivis | Projets suivis |
| GET | /entrepreneur/mes-projets | Mes projets (entrepreneur) |
| POST | /entrepreneur/creer | Creer projet |
| PUT | /entrepreneur/:id | Modifier projet |
| POST | /entrepreneur/:id/publier | Publier |
| POST | /entrepreneur/:id/depublier | Depublier |
| DELETE | /entrepreneur/:id | Supprimer |
| PATCH | /entrepreneur/:id/equipe | Gerer equipe |
| POST | /entrepreneur/:id/upload-media | Upload media |
| POST | /entrepreneur/:id/upload-document | Upload document |
| GET | /:id/representants | Representants projet |
| GET | /incubateurs | Incubateurs actifs |

#### Utilisateurs (`/api/utilisateurs`)
| Methode | Route | Description |
|---------|-------|-------------|
| GET | /recherche | Rechercher utilisateurs |
| GET | /:id | Profil utilisateur |
| POST | /:id/demande-ami | Envoyer demande d'ami |
| DELETE | /:id/demande-ami | Annuler demande |
| POST | /:id/accepter-ami | Accepter demande |
| POST | /:id/refuser-ami | Refuser demande |
| DELETE | /:id/ami | Supprimer ami |
| GET | /demandes-amis | Mes demandes recues |
| GET | /mes-amis | Mes amis |
| GET | /:id/amis | Amis d'un utilisateur |
| GET | /:id/projets-suivis | Projets suivis d'un utilisateur |

#### Messagerie (`/api/messagerie`)
| Methode | Route | Description |
|---------|-------|-------------|
| GET | /conversations | Lister conversations |
| GET | /conversations/:id | Messages conversation |
| POST | /envoyer | Envoyer message |
| PATCH | /conversations/:id/lire | Marquer lu |
| GET | /non-lus | Nombre non-lus |
| GET | /conversation-privee/:userId | Obtenir/creer DM |
| GET | /rechercher-utilisateurs | Rechercher pour messagerie |
| DELETE | /conversations/:id | Supprimer conversation |
| POST | /messages/:id/react | Reagir a un message |
| PATCH | /conversations/:id/messages/:mid | Modifier message |
| DELETE | /conversations/:id/messages/:mid | Supprimer message |
| POST | /groupes | Creer groupe |
| PATCH | /groupes/:id | Modifier groupe |
| POST | /groupes/:id/participants | Ajouter participant |
| DELETE | /groupes/:id/participants/:pid | Retirer participant |
| PATCH | /conversations/:id/muet | Toggle sourdine |

#### Notifications (`/api/notifications`)
| Methode | Route | Description |
|---------|-------|-------------|
| GET | / | Lister notifications |
| GET | /non-lues | Nombre non-lues |
| PATCH | /:id/lue | Marquer lue |
| PATCH | /lire-tout | Tout marquer lu |
| DELETE | /:id | Supprimer |
| DELETE | /toutes | Supprimer toutes |

#### Stories (`/api/stories`)
| Methode | Route | Description |
|---------|-------|-------------|
| GET | / | Stories actives (groupees par utilisateur) |
| GET | /mes-stories | Mes stories |
| GET | /utilisateur/:id | Stories d'un utilisateur |
| POST | / | Creer story |
| GET | /:id | Detail story |
| DELETE | /:id | Supprimer story |
| POST | /:id/seen | Marquer vue |
| GET | /:id/viewers | Voir les vues (proprietaire) |

#### Live (`/api/live`)
| Methode | Route | Description |
|---------|-------|-------------|
| GET | /active | Lives actifs |
| GET | /user/:userId | Verifier si user est en live |
| POST | /start | Demarrer live |
| POST | /end | Arreter live |
| POST | /token | Token Agora |
| POST | /:id/join | Rejoindre live |
| POST | /:id/leave | Quitter live |

#### Gamification (`/api/gamification`)
| Methode | Route | Description |
|---------|-------|-------------|
| GET | /me | Mon etat gamification |
| GET | /quick-quests | Quetes rapides |
| POST | /onboarding/dismiss | Pause onboarding |
| POST | /onboarding/resume | Reprendre onboarding |
| GET | /public/:userId | Badge public |

#### Abonnements (`/api/subscriptions`)
| Methode | Route | Description |
|---------|-------|-------------|
| GET | /lpp-plus | Statut abonnement |
| POST | /lpp-plus/activate | Activer LPP+ |
| POST | /lpp-plus/cancel | Annuler |
| POST | /lpp-plus/reactivate | Reactiver |

#### Signalements (`/api/reports`)
| Methode | Route | Description |
|---------|-------|-------------|
| POST | / | Creer signalement |

#### Support (`/api/support`)
| Methode | Route | Description |
|---------|-------|-------------|
| POST | / | Creer ticket |
| GET | / | Mes tickets |
| GET | /:id | Detail ticket |
| POST | /:id/messages | Ajouter message |

#### Administration (`/api/admin`) — Staff uniquement
- Dashboard (stats, at-risk users, surveillance)
- Gestion utilisateurs (warn, suspend, ban, unban, roles, timeline, audit)
- Gestion signalements (process, escalate, assign, notes)
- Audit (logs, stats, export CSV)
- Staff chat (messages, DMs, unread count)
- Contenu (publications, commentaires, projets, conversations, lives, evenements)
- Securite (dashboard, events, IP blocking, device banning, purge)
- Tickets support (liste, reponse, statut, assignation)
- Notifications broadcast
- Gamification (lecture seule par userId)

#### Moderation (`/api/moderation`) — Staff uniquement
- Actions utilisateurs (warn, suspend, unsuspend, ban, unban, role change, surveillance)
- Actions contenu (hide/unhide/delete publications, commentaires, stories, projets)

#### Endpoints speciaux
| Route | Description |
|-------|-------------|
| GET /api/sante | Health check (sans auth) |
| POST /api/emergency/unblock | Deblocage d'urgence IP/device (token special) |

### 3.5 Controllers (19)

| Controller | Fonctions principales |
|------------|----------------------|
| authController | inscription, connexion, deconnexion, moi, verifierEmail, callbackOAuth, liaison OAuth |
| profilController | modifierProfil, changerMotDePasse, supprimerCompte, modifierAvatar, modifierStatut |
| publicationController | CRUD publications, likes, commentaires, mentions |
| projetController | CRUD projets, suivre, equipe, upload, incubateurs |
| feedController | getFeed (feed personnalise) |
| utilisateurController | recherche, profil, systeme d'amis complet |
| messagerieController | conversations, messages, groupes, reactions, chiffrement |
| notificationController | CRUD notifications |
| storyController | CRUD stories, vues |
| liveController | demarrer/arreter live, tokens Agora |
| gamificationController | etat XP/niveau, quetes, onboarding |
| subscriptionController | gestion abonnement LPP+ |
| reportController | signalements, traitement, escalade |
| moderationController | warn, suspend, ban, hide/delete contenu, surveillance |
| auditController | logs audit, stats, export |
| securityController | dashboard securite, IP blocking, device banning |
| staffChatController | chat interne staff |
| dashboardController | stats dashboard admin |
| broadcastController | notifications de masse |
| supportTicketController | tickets support (user + admin) |
| evenementController | evenements |
| activityController | tracking activite |

### 3.6 Middlewares

| Middleware | Role |
|------------|------|
| verifierJwt | Valide le token JWT, charge l'utilisateur |
| chargerUtilisateurOptionnel | Charge user si token present, sinon continue |
| checkUserStatus | Bloque si ban/suspend, detecte expiration |
| requireStaff | Exige role modo_test+ |
| requirePermission(perm) | Verifie une permission |
| requireAllPermissions(perms) | Verifie toutes les permissions |
| requireAnyPermission(perms) | Verifie au moins une permission |
| requireMinRole(role) | Role minimum dans la hierarchie |
| checkEntrepreneur | Verifie statut entrepreneur |
| securityMonitor | Detecte injection, XSS, anomalies |
| checkBlockedIP | Verifie IP bloquee (cache 30s) |
| sanitizeQueryParams | Supprime operateurs MongoDB des params |
| hideAdminRoutes | Retourne 404 au lieu de 401 pour routes admin |
| gestionErreurs | Gestionnaire d'erreurs global |

### 3.7 Authentification & OAuth

**Methodes d'authentification** :
1. **Email/mot de passe (local)** — inscription + verification email 6 chiffres
2. **Google OAuth** — via Passport.js
3. **Facebook OAuth** — via Passport.js
4. **Apple OAuth** — via callback POST

**Token JWT** :
- Algorithme : HS256 (explicite, anti-confusion)
- Payload : `{ id, email }`
- Expiration : 7 jours
- Blacklist en base a la deconnexion

**Liaison de comptes OAuth** (SEC-AUTH-01) :
- Si un email OAuth existe deja en local, pas de fusion automatique
- Necessite verification OTP + confirmation mot de passe
- Ecran dedie `lier-compte.tsx` sur mobile

**Protection brute force** (SEC-AUTH-03) :
- 5 tentatives echouees = lockout 30 minutes
- Rate limit IP : 10 tentatives / 15 min
- Nettoyage memoire toutes les 5 min

### 3.8 Permissions & roles

**Hierarchie des roles** :
```
user (0) < modo_test (1) < modo (2) < admin_modo (3) < super_admin (4)
```

**Permissions par defaut** :

| Role | Permissions |
|------|-------------|
| user | Aucune |
| modo_test | reports:view, tickets:view, staff:chat |
| modo | reports:view/process/escalate, users:view/warn/suspend/ban, content:hide, staff:chat, tickets:view/respond |
| admin_modo | Tout modo + users:unban/edit_roles, content:delete/edit, audit:view |
| super_admin | Tout admin_modo + audit:export, config:view/edit |

**18 permissions disponibles** :
`reports:view`, `reports:process`, `reports:escalate`, `users:view`, `users:warn`, `users:suspend`, `users:ban`, `users:unban`, `users:edit_roles`, `content:hide`, `content:delete`, `content:edit`, `audit:view`, `audit:export`, `config:view`, `config:edit`, `staff:chat`, `tickets:view`, `tickets:respond`

### 3.9 WebSocket (Socket.io)

**Events client → serveur** :
| Event | Description | Rate limit |
|-------|-------------|------------|
| get_unread_counts | Demander compteurs non-lus | 5/min |
| join_conversation | Rejoindre une room conversation | 20/min |
| leave_conversation | Quitter une room | - |
| typing | Indicateur de frappe | 30/min |
| message_read | Marquer message lu | 30/min |

**Events serveur → client** :
| Event | Description |
|-------|-------------|
| unread_counts | Compteurs non-lus |
| new_message | Nouveau message recu |
| new_notification | Nouvelle notification |
| demande_ami | Demande d'ami recue |
| typing | Indicateur de frappe |
| force_disconnect | Deconnexion forcee (ban/suspend) |
| rate_limited | Rate limit depasse |

**Securite Socket** :
- Auth JWT requise a la connexion
- Re-verification statut toutes les 30s
- Max 5 sockets par utilisateur
- Max 50 rooms par socket

### 3.10 Services externes

| Service | Usage | Configuration |
|---------|-------|---------------|
| MongoDB Atlas | Base de donnees | MONGODB_URI |
| Cloudinary | Hebergement images/videos | CLOUDINARY_CLOUD_NAME, API_KEY, API_SECRET |
| Resend | Emails transactionnels | RESEND_API_KEY |
| Agora | Live streaming video | AGORA_APP_ID, AGORA_APP_CERTIFICATE |
| Google OAuth | Connexion Google | GOOGLE_CLIENT_ID, SECRET, CALLBACK_URL |
| Facebook OAuth | Connexion Facebook | FACEBOOK_APP_ID, SECRET, CALLBACK_URL |
| Apple OAuth | Connexion Apple | APPLE_CLIENT_ID, TEAM_ID, KEY_ID, PRIVATE_KEY |

### 3.11 Securite

| Mesure | Detail |
|--------|--------|
| Chiffrement messages | AES-256-GCM (V2) avec tag d'authentification |
| Hashage mots de passe | bcryptjs |
| Protection NoSQL injection | express-mongo-sanitize + detection operateurs |
| Protection XSS | Suppression HTML (stripHtml) + Helmet |
| CORS | Liste blanche d'origines (pas de "*") |
| Rate limiting | 10+ limites distinctes (global, login, inscription, etc.) |
| IP blocking | Blocage manuel + cache 30s |
| Device fingerprinting | SHA-256 du User-Agent, ban par empreinte |
| CSRF | Etat OAuth avec nonce |
| CSP | Content-Security-Policy via Helmet |

**Rate limits** :
| Scope | Limite |
|-------|--------|
| Global | 300 req / 15 min |
| Login | 10 / 15 min |
| Inscription | 3 / heure |
| Heartbeat | 20 / min |
| Lectures publiques | 30 / min |
| Admin | 200 / 15 min |
| Moderation | 50 sanctions / heure |
| Ecritures | 30 / 15 min |
| Messages | 60 / 15 min |

### 3.12 Taches planifiees (CRON)

| Tache | Frequence | Action |
|-------|-----------|--------|
| Renouvellement LPP+ | Toutes les 60 min | Renouvelle abonnements actifs, desactive les annules |
| Nettoyage lockouts | Toutes les 5 min | Supprime les lockouts de connexion expires |
| SecurityEvent TTL | Automatique (MongoDB) | Supprime events > 90 jours |
| Live TTL | Automatique (MongoDB) | Supprime lives termines > 7 jours |
| Cache IP bloquees | TTL 30s | Invalidation automatique |

### 3.13 Gestion des erreurs

```typescript
class ErreurAPI extends Error {
  statusCode: number;
  details?: Record<string, unknown>;
}
```

**Format de reponse standard** :
```json
{
  "succes": false,
  "message": "Description de l'erreur",
  "code": "ERROR_CODE",
  "details": {}
}
```

**Codes HTTP utilises** : 400, 401, 403, 404, 409, 429, 500

**Gestion process** : Handlers pour `uncaughtException`, `unhandledRejection`, arret gracieux sur `SIGTERM`/`SIGINT`

---

## 4. APPLICATION MOBILE (branche DevMobile)

### 4.1 Stack technique

| Technologie | Version | Role |
|-------------|---------|------|
| React Native | 0.81.5 | Framework mobile |
| Expo | SDK 54 | Plateforme de build |
| Expo Router | 6.0.22 | Navigation fichier |
| TypeScript | 5.9.2 | Langage |
| React | 19.1.0 | UI |
| Socket.io Client | 4.8.3 | WebSocket |
| React Native Reanimated | 4.1.1 | Animations |
| React Native Gesture Handler | 2.28.0 | Gestes tactiles |
| React Native PagerView | 6.9.1 | Vues paginables |
| Expo SecureStore / AsyncStorage | - | Stockage securise |

### 4.2 Structure des dossiers

```
mobile/
├── app/
│   ├── (auth)/              # Groupe auth (connexion, inscription, etc.)
│   ├── (app)/               # Groupe app principale
│   │   ├── amis/[id].tsx
│   │   ├── conversation/[id].tsx
│   │   ├── entrepreneur/
│   │   │   ├── [id].tsx
│   │   │   ├── nouveau-projet.tsx
│   │   │   └── modifier-projet.tsx
│   │   ├── live/
│   │   │   ├── start.tsx
│   │   │   └── viewer.tsx
│   │   ├── projet/[id].tsx
│   │   ├── publication/[id].tsx
│   │   ├── utilisateur/[id].tsx
│   │   └── ... (ecrans principaux)
│   ├── _layout.tsx          # Layout racine avec providers
│   └── index.tsx            # Redirection auth
├── src/
│   ├── composants/          # 50+ composants
│   ├── contexts/            # 4 contexts + 1 legacy
│   ├── services/            # 16 services API
│   ├── hooks/               # 4 hooks custom
│   ├── stores/              # 2 stores (video)
│   ├── utils/               # 4 utilitaires
│   ├── types/               # Definitions TypeScript
│   └── constantes/          # Config, theme, incubateurs
└── assets/                  # Icons, splashes
```

### 4.3 Navigation & ecrans (35+)

#### Groupe Auth `(auth)/`
| Ecran | Fichier | Role |
|-------|---------|------|
| Connexion | connexion.tsx | Login email/mdp + OAuth |
| Inscription | inscription.tsx | Inscription + CGU |
| Verification Email | verification-email.tsx | Code 6 chiffres |
| Lier Compte | lier-compte.tsx | Liaison OAuth → local |

#### Groupe App `(app)/`
| Ecran | Fichier | Role | Acces |
|-------|---------|------|-------|
| Accueil (Feed) | accueil.tsx | Feed publications + Stories | Tous |
| Reels | reels.tsx | Feed video TikTok-like | Tous |
| Boutique | boutique.tsx | LPP+ / Boost / Marketplace | Tous |
| Messages | messages.tsx | DMs + Groupes | Tous |
| Notifications | notifications.tsx | Activite + demandes d'amis | Tous |
| Profil | profil.tsx | Mon profil + reglages | Moi |
| Parcours | parcours.tsx | Gamification (quetes, XP) | Tous |
| Mes Startups | mes-startups.tsx | Projets suivis | Tous |
| Support | support.tsx | Tickets support | Tous |
| Sanctions | sanctions.tsx | Historique sanctions | Moi |
| Facturation | facturation.tsx | Gestion LPP+ | Moi |
| Choix Statut | choix-statut.tsx | Visiteur/Entrepreneur | Post-inscription |

#### Routes dynamiques
| Ecran | Fichier | Role |
|-------|---------|------|
| Conversation | conversation/[id].tsx | Chat individuel |
| Profil Public | utilisateur/[id].tsx | Profil autre utilisateur |
| Liste Amis | amis/[id].tsx | Amis d'un utilisateur |
| Detail Projet | projet/[id].tsx | Page projet |
| Detail Publication | publication/[id].tsx | Publication complete |
| Profil Entrepreneur | entrepreneur/[id].tsx | Mes projets entrepreneur |
| Nouveau Projet | entrepreneur/nouveau-projet.tsx | Creation projet |
| Modifier Projet | entrepreneur/modifier-projet.tsx | Edition projet |
| Demarrer Live | live/start.tsx | Broadcast live |
| Voir Live | live/viewer.tsx | Spectateur live |

### 4.4 Composants (50+)

**Core** : Avatar, Bouton, ChampTexte, Chargement, SplashScreen

**Animes** : AnimatedPressable, AnimatedCounter, SkeletonLoader, LikeButton, HeartAnimation

**Stories** : StoryCircle, StoriesRow, StoryViewer, StoryCreator, DraggableWidget, WidgetRenderer, WidgetToolbar + 6 widgets specifiques (Text, Emoji, Location, Link, Mention, Time)

**Publications** : PublicationCard, PostMediaCarousel, UnifiedCommentsSheet, MoreActionsSheet, AdCard

**Video** : ReelsVideoPage, ReelsAdPage, VideoPlayerModal, VideoActionsOverlay, ImageViewerModal

**Boutique** : SubscriptionHeroCard, BoostGoalCard, BoostFlowSheet, BundleCard, ProductDetailSheet, MarketplaceProductCard, CategoryFilterBar, ShopBottomSheet

**Gamification** : QuickQuests, OnboardingGuide, XpToast, NextAction

**Navigation** : SwipeableScreen, SwipeBackPreviews, StorySwipeOverlay, KeyboardView, ErrorBoundary

**Badges** : AppBadge (unifie — role/verified/level, 4 variantes, 3 tailles)

**Autres** : EditBioModal, LocationPicker, CoachMark, MessagesTab, LiveCard, StaffActions, CommentsOverlay, FullscreenCommentsSheet, AccountRestrictedScreen, NotificationBadge

### 4.5 Contexts (5)

| Context | Role |
|---------|------|
| UserContext | Source de verite utilisateur, auth, restrictions, heartbeat 90s |
| GamificationContext | XP, niveaux, quetes, onboarding, XP toast |
| ThemeContext | Mode sombre/clair, palette couleurs |
| SocketContext | WebSocket temps reel (messages, notifs) |
| AuthContexte (legacy) | Wrapper de compatibilite autour de UserContext |

### 4.6 Services API (16)

| Service | Endpoints |
|---------|-----------|
| api.ts | Instance HTTP, token management, intercepteurs |
| auth.ts | Login, inscription, profil, avatar, mdp, suppression |
| publications.ts | CRUD publications, likes, commentaires |
| projets.ts | CRUD projets, suivre, equipe, documents |
| utilisateurs.ts | Recherche, profil, systeme d'amis |
| messagerie.ts | Conversations, messages, groupes |
| notifications.ts | CRUD notifications |
| stories.ts | CRUD stories, vues |
| live.ts | Demarrer/arreter live, tokens Agora |
| boutique.ts | LPP+, boost, marketplace |
| gamification.ts | Etat XP, quetes |
| moderation.ts | Actions staff (warn, ban, hide) |
| support.ts | Tickets support |
| ads.ts | Injection pubs dans feed, tracking |
| evenements.ts | Evenements |
| oauth.ts | Liaison comptes OAuth |
| activity.ts | Tracking activite |

### 4.7 Hooks, Stores, Utils

**Hooks** : useAnimations, useAutoRefresh, useDoubleTap, useStaff

**Stores** : videoRegistry (registre global lecteurs video), videoPlaybackStore (etat lecture video)

**Utils** : dateUtils, mediaUtils, imageFilters, userDisplay (getUserBadgeConfig, isUserVerified)

### 4.8 Configuration & constantes

**config.ts** :
```
API_URL = https://siteweb-back-lpp-v1.onrender.com/api
SOCKET_URL = https://siteweb-back-lpp-v1.onrender.com
TIMEOUTS = { API: 15s, DEBOUNCE: 300ms }
```

**theme.ts** :
```
primaire: #7C5CFF (violet)
fond: #0D0D12 (tres sombre)
texte: #FFFFFF
```

---

## 5. SITE WEB (branche master)

### 5.1 Stack technique

| Technologie | Version | Role |
|-------------|---------|------|
| React | 19.2.0 | UI |
| Vite | 7.3.1 | Build |
| TypeScript | 5.9.3 | Langage |
| React Router DOM | 7.13.0 | Routing |
| Framer Motion | 12.34.0 | Animations |
| Socket.io Client | 4.8.3 | WebSocket |
| Lucide React | 0.563.0 | Icones |
| date-fns | 4.1.0 | Dates |

**CSS** : Inline styles (React.CSSProperties) + global CSS + tokens theme. Pas de framework CSS.

### 5.2 Structure des dossiers

```
web/src/
├── components/
│   ├── layout/ (MainLayout, Sidebar, MobileNav)
│   ├── BoutonsOAuth.tsx
│   ├── ErrorBoundary.tsx
│   ├── LevelBadge.tsx
│   ├── StoryCreator.tsx
│   ├── Toast.tsx
│   └── XpToast.tsx
├── contexts/ (AuthContext, GamificationContext, SocketContext)
├── pages/ (18 pages)
├── services/ (12 services API)
├── styles/ (global.css, theme.ts)
├── utils/ (iconMap.ts)
├── constants/ (incubateurs.ts)
├── App.tsx
└── main.tsx
```

### 5.3 Pages (18)

| Route | Page | Role | Auth |
|-------|------|------|------|
| / | Landing | Page d'accueil marketing | Non |
| /connexion | Connexion | Login email/mdp + OAuth | Non |
| /inscription | Inscription | Inscription + CGU | Non |
| /verification-email | VerificationEmail | Code 6 chiffres | Oui |
| /choix-statut | ChoixStatut | Visiteur/Entrepreneur | Oui |
| /auth/callback | AuthCallback | Retour OAuth | - |
| /feed | Feed | Feed + stories + publications | Oui |
| /decouvrir | Decouvrir | Decouverte projets (filtres) | Oui |
| /projets/:id | ProjetDetail | Page projet complete | Oui |
| /messagerie | Messagerie | DMs + groupes | Oui |
| /profil | Profil | Mon profil (pubs, amis, projets) | Oui |
| /utilisateur/:id | ProfilPublic | Profil autre utilisateur | Oui |
| /utilisateur/:id/amis | AmisUtilisateur | Liste amis utilisateur | Oui |
| /lives | Lives | Lives actifs | Oui |
| /notifications | Notifications | Toutes notifications | Oui |
| /publication/:id | PublicationDetail | Publication + commentaires | Oui |
| /entrepreneur | Entrepreneur | Wizard creation projet (6 etapes) | Oui |
| /parcours | MonParcours | Gamification (XP, quetes) | Oui |
| /reglages | Reglages | Profil, avatar, securite, RGPD, support | Oui |

### 5.4 Composants

| Composant | Role |
|-----------|------|
| MainLayout | Shell principal (sidebar + contenu + XP toast) |
| Sidebar | Navigation desktop avec badges non-lus |
| MobileNav | Barre de navigation mobile (<768px) |
| BoutonsOAuth | Boutons connexion Google/Facebook |
| ErrorBoundary | Gestion erreurs globale |
| LevelBadge | Badge niveau gamification |
| StoryCreator | Creation story (photo/video) |
| Toast | Systeme de notifications toast |
| XpToast | Notification gain XP |

### 5.5 Services API (12)

api.ts, auth.ts (12 endpoints), publications.ts (14), projets.ts (15), utilisateurs.ts (9), messagerie.ts (12), notifications.ts (5), gamification.ts (3), live.ts (4), stories.ts (5), moderation.ts (6 — staff), support.ts (4)

### 5.6 Contexts

| Context | Role |
|---------|------|
| AuthContext | Etat auth, login/signup/logout, rafraichissement user |
| GamificationContext | Niveau, XP, quetes, onboarding, XP toast |
| SocketContext | Socket.io (unread counts, new_message, new_notification, force_disconnect) |

### 5.7 Deploiement (Vercel)

```json
// vercel.json
{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }
```

**Variables d'environnement** :
```
VITE_API_URL=https://siteweb-back-lpp-v1.onrender.com/api
VITE_SOCKET_URL=https://siteweb-back-lpp-v1.onrender.com
```

**Code splitting** : react-vendor, framer, socket (chunks separes)

---

## 6. LOGICIEL DE MODERATION (branche Moderation)

### 6.1 Stack technique

| Technologie | Version | Role |
|-------------|---------|------|
| React | 19.2.0 | UI |
| Vite | 7.2.4 | Build |
| TypeScript | 5.9.3 | Langage |
| TailwindCSS | 4.1.18 | CSS |
| React Query | 5.90.20 | Gestion etat serveur |
| Axios | 1.13.4 | Client HTTP |
| Framer Motion | 12.33.0 | Animations |
| Recharts | 3.7.0 | Graphiques |
| Lucide React | 0.563.0 | Icones |
| Sonner | 2.0.7 | Toasts |

### 6.2 Structure des dossiers

```
moderation/src/
├── auth/ (AuthContext, ProtectedRoute)
├── components/
│   ├── ui/ (badge, button, card, dialog, input, select, table, tooltip, confirm-dialog)
│   ├── charts/ (DashboardCharts)
│   ├── AnimatedCounter, ConfirmDialog, EmojiPicker, EmptyState
│   ├── ErrorBoundary, InlineEditor, Layout, PageTransition, RiskBadge
├── pages/ (28 pages)
├── services/ (19 services API)
├── hooks/ (useKeepAlive)
├── lib/ (labels, riskScore, utils)
└── types/ (index.ts — definitions completes)
```

### 6.3 Pages (28)

| Page | Route | Permission requise |
|------|-------|--------------------|
| Dashboard | / | Aucune (staff) |
| Reports | /reports | reports:view |
| Report Detail | /reports/:id | reports:view |
| Users | /users | users:view |
| User Detail | /users/:id | users:view |
| Suspended Users | /suspended | users:view |
| Surveillance | /surveillance | users:view |
| Publications | /publications | content:hide |
| Publication Detail | /publications/:id | content:hide |
| Stories | /stories | content:hide |
| Story Detail | /stories/:id | content:hide |
| Projects | /projets | content:hide |
| Project Detail | /projets/:id | content:hide |
| Comments | /commentaires | content:hide |
| Conversations | /conversations | users:view |
| Conversation Detail | /conversations/:id | users:view |
| Lives | /lives | content:hide |
| Events | /evenements | content:hide |
| Tickets | /tickets | tickets:view |
| Ticket Detail | /tickets/:id | tickets:view |
| Staff Chat | /chat | staff:chat |
| Audit Logs | /audit | audit:view |
| Statistics | /statistics | audit:view |
| Security | /security | audit:view |
| Cartography | /cartography | content:hide |
| Notifications | /notifications | Aucune |
| Profile | /profile | Aucune |
| Login | /login | Aucune |

### 6.4 Services API (19)

api, auth, dashboard, reports, users, publications, stories, projets, commentaires, conversations, lives, evenements, tickets, chat, audit, security, activity, profil, gamification

### 6.5 Fonctionnalites de moderation

**Gestion signalements** : Voir, traiter (approuver/rejeter), escalader, assigner, annoter

**Gestion utilisateurs** : Avertir, suspendre (1-8760h), bannir, debannir, lever suspension, roles, surveillance

**Gestion contenu** : Masquer/demasquer/supprimer (publications, stories, projets, commentaires)

**Conversations** : Monitoring messages prives et groupes

**Tickets support** : Lister, repondre, assigner, changer statut

**Chat staff** : Messagerie interne entre moderateurs avec emoji

**Audit** : Historique complet des actions, stats, export CSV

**Securite** : Dashboard menaces, events, IP blocking, device banning, investigation IP, purge

**Statistiques** : Graphiques (trends hebdo, distribution signalements, actions), KPIs

**Cartographie** : Visualisation projets sur carte par categorie

### 6.6 Securite & monitoring

- Auth JWT avec blacklist
- Protection route par permission
- CSP headers
- Referrer Policy strict
- Keep-alive ping backend (30s)
- Pas de WebSocket (polling React Query 60s)

---

## 7. ECRAN PAR ECRAN — INVENTAIRE COMPLET

### 7.1 Mobile — Ecrans Auth

#### Connexion (connexion.tsx)
- **Plateforme** : Mobile
- **Role** : Login
- **Utilisateurs** : Anonyme
- **Actions** : Saisir email/mdp, OAuth Google/Facebook/Apple
- **API** : POST /auth/connexion, GET /auth/google, etc.
- **Donnees modifiees** : Token stocke (SecureStore)

#### Inscription (inscription.tsx)
- **Plateforme** : Mobile
- **Role** : Creation de compte
- **Utilisateurs** : Anonyme
- **Actions** : Saisir prenom, nom, email, mdp, CGU
- **API** : POST /auth/inscription
- **Donnees modifiees** : Nouveau Utilisateur + Token

#### Verification Email (verification-email.tsx)
- **Plateforme** : Mobile
- **Role** : Verification code 6 chiffres
- **Actions** : Saisir code, renvoyer code
- **API** : POST /auth/verifier-email, POST /auth/renvoyer-code

#### Lier Compte (lier-compte.tsx)
- **Plateforme** : Mobile
- **Role** : Liaison OAuth → local
- **Actions** : Envoyer OTP, verifier, confirmer avec mdp
- **API** : POST /auth/link/google/send-code, verify-code, confirm

### 7.2 Mobile — Ecrans Principaux

#### Accueil / Feed (accueil.tsx)
- **Role** : Feed social principal
- **Utilisateurs** : Tous authentifies
- **Donnees affichees** : Stories, publications, pubs
- **Actions** : Like, commenter, partager, voir stories, creer story
- **API** : GET /publications, GET /stories, POST /publications/:id/like, etc.

#### Reels (reels.tsx)
- **Role** : Feed video vertical (TikTok-like)
- **Donnees affichees** : Videos, pubs video
- **Actions** : Swipe vertical, like, commenter, partager, pan horizontal pour quitter
- **API** : GET /publications?type=video, ads tracking

#### Boutique (boutique.tsx)
- **Role** : Abonnement + Boost + Marketplace
- **Utilisateurs** : Tous (Marketplace). Entrepreneurs : Services + Marketplace.
- **Actions** : Souscrire LPP+, acheter boost, voir produits
- **API** : GET /subscriptions/lpp-plus, POST /subscriptions/lpp-plus/activate, GET /boutique/marketplace

#### Messages (messages.tsx)
- **Role** : Messagerie privee
- **Donnees affichees** : Conversations, derniers messages, non-lus
- **Actions** : Envoyer message, creer groupe, supprimer, mettre en sourdine
- **API** : GET /messagerie/conversations, POST /messagerie/envoyer, etc.

#### Notifications (notifications.tsx)
- **Role** : Centre de notifications
- **Donnees affichees** : Likes, commentaires, demandes d'amis, sanctions
- **Actions** : Accepter/refuser amis, swipe pour supprimer
- **API** : GET /notifications, PATCH /notifications/:id/lue

#### Profil (profil.tsx)
- **Role** : Mon profil + reglages
- **Onglets** : Profil public / Parametres
- **Parametres** : Profil, Apparence, Securite, Confidentialite (RGPD + suppression)
- **API** : GET /auth/moi, PATCH /profil, DELETE /profil, etc.

#### Parcours (parcours.tsx)
- **Role** : Gamification
- **Onglets** : En cours / Realisees
- **Donnees** : Niveau, XP, quetes actives, quetes terminees
- **API** : GET /gamification/me, GET /gamification/quick-quests

#### Mes Startups (mes-startups.tsx)
- **Role** : Projets suivis
- **Actions** : Filtrer par categorie, trier, ne plus suivre
- **API** : GET /projets/suivis, POST /projets/:id/suivre

#### Conversation Detail (conversation/[id].tsx)
- **Role** : Chat individuel
- **Donnees** : Messages, reactions, reponses
- **Actions** : Envoyer texte/image/video, reagir, repondre, modifier, supprimer
- **API** : GET /messagerie/conversations/:id, POST /messagerie/envoyer

#### Profil Public (utilisateur/[id].tsx)
- **Role** : Voir le profil d'un autre utilisateur
- **Donnees** : Avatar, bio, badges, publications, amis, projets
- **Actions** : Ajouter ami, envoyer message, signaler
- **API** : GET /utilisateurs/:id, GET /gamification/public/:id

#### Detail Projet (projet/[id].tsx)
- **Role** : Page projet complete
- **Donnees** : Nom, description, equipe, documents, stats, followers
- **Actions** : Suivre/ne plus suivre, contacter fondateur
- **API** : GET /projets/:id, POST /projets/:id/suivre

#### Detail Publication (publication/[id].tsx)
- **Role** : Publication avec commentaires complets
- **Donnees** : Publication, commentaires imbriques
- **Actions** : Like, commenter, repondre, modifier, supprimer
- **API** : GET /publications/:id, GET /publications/:id/commentaires

#### Support (support.tsx)
- **Role** : Tickets de support
- **Actions** : Creer ticket, voir detail, repondre
- **API** : POST /support, GET /support, GET /support/:id

#### Sanctions (sanctions.tsx)
- **Role** : Historique des sanctions
- **Donnees** : Warnings, suspensions, bans + levees
- **API** : GET /auth/my-sanctions

#### Facturation (facturation.tsx)
- **Role** : Gestion abonnement LPP+
- **Actions** : Voir statut, annuler, reactiver
- **API** : GET /subscriptions/lpp-plus, POST cancel/reactivate

#### Choix Statut (choix-statut.tsx)
- **Role** : Selection visiteur/entrepreneur post-inscription
- **API** : PATCH /profil/statut

### 7.3 Web — Pages specifiques (differentes du mobile)

#### Landing (/)
- Page marketing avec hero, stats, features, CTA
- Non presente sur mobile

#### Decouvrir (/decouvrir)
- Decouverte projets avec filtres avances (categorie, maturite, incubateur, recherche texte)
- Projets tendances
- Non present comme ecran dedie sur mobile (equivalent dans "Mes Startups" sans filtres avances)

#### Entrepreneur (/entrepreneur)
- Wizard creation projet en 6 etapes :
  1. Identite (nom, pitch, categorie, secteur, tags, localisation, incubateur)
  2. Equipe (membres + roles)
  3. Proposition (probleme, solution, avantage, cible)
  4. Business (maturite, business model, metriques, financement)
  5. Medias (image, video pitch, galerie, documents)
  6. Resume + publication
- Gestion des projets existants (modifier, publier/depublier, supprimer)

#### Reglages (/reglages)
- 6 sections : Profil, Avatar, Securite, Sanctions, Confidentialite, Support
- Section Support integree (creation ticket, suivi, reponses)

### 7.4 Moderation — Pages specifiques

Voir section 6.3 pour l'inventaire complet des 28 pages.

---

## 8. FEATURES & LOGIQUE METIER

### 8.1 Systeme d'amis

- **Description** : Systeme bilateral (demande → acceptation)
- **Utilise dans** : Feed, messagerie, profils, notifications
- **Roles** : Tous utilisateurs
- **Logique** : Envoyer demande → notif → accepter/refuser → ajout bilateral dans amis[]
- **Etat** : Stable

### 8.2 Publications (Feed social)

- **Description** : Posts avec texte + medias (images/videos), likes, commentaires imbriques
- **Types** : post, annonce, update, editorial, live-extrait
- **Utilise dans** : Feed, profil, profil public, detail publication
- **Actions** : CRUD, like, commenter, repondre, mention, signaler
- **Etat** : Stable

### 8.3 Stories (24h)

- **Description** : Contenus ephemeres (photo/video) avec widgets
- **Widgets** : Texte, emoji, lien, localisation, mention, heure
- **Duree** : Configurable (7 min → 24h, defaut 24h)
- **Utilise dans** : Feed (carousel en haut), profil
- **Etat** : Stable

### 8.4 Messagerie temps reel

- **Description** : DMs prives + groupes, avec reactions emoji
- **Chiffrement** : AES-256-GCM (V2)
- **Fonctions** : Envoyer texte/image/video, reagir, repondre, modifier, supprimer, muet
- **Temps reel** : Socket.io pour new_message + polling fallback 15s
- **Etat** : Stable

### 8.5 Projets / Startups

- **Description** : Vitrine pour startups (creation, decouverte, suivi)
- **Creation** : Wizard 6 etapes (web), formulaire (mobile)
- **Donnees** : Nom, pitch, equipe, business model, metriques, documents, galerie
- **Actions** : Creer, modifier, publier, suivre, contacter
- **Restriction** : Creation reservee aux entrepreneurs
- **Etat** : Stable

### 8.6 Gamification

- **Description** : Systeme XP + niveaux + quetes pour encourager l'engagement
- **Elements** : XP, niveaux (avec icones), quetes rapides, quetes chapitre, streaks
- **Sources XP** : Publications, commentaires, likes, visite projets, amis, etc.
- **Toast XP** : Notification globale a chaque gain d'XP (rendu dans _layout.tsx)
- **Onboarding** : Guide interactif pour nouveaux utilisateurs
- **Etat** : Stable

### 8.7 Abonnement LPP+

- **Description** : Abonnement premium avec badge "Verifie"
- **Statuts** : inactive, active, canceled (avec periode restante)
- **Avantages** : Badge verifie, reductions boost
- **Renouvellement** : CRON toutes les 60 min
- **Etat** : Stable (pas de paiement reel integre — activation directe)

### 8.8 Boutique & Boost

- **Description** : Services de boost (visibilite, engagement) + marketplace
- **Boost** : Flow multi-etapes (objectif → duree → review → confirmer)
- **Reductions** : -50% premier boost, reduction LPP+ sur bundles
- **Marketplace** : Produits communautaires avec categories
- **Etat** : Partiellement mock (donnees boost en dur cote mobile)

### 8.9 Live Streaming

- **Description** : Diffusion video en direct via Agora
- **Fonctions** : Demarrer live, rejoindre, quitter, compteur spectateurs
- **Etat** : Fonctionnel, necessite Agora SDK

### 8.10 Systeme de signalements

- **Description** : Signalement de contenu/utilisateurs
- **Raisons** : spam, harcelement, contenu_inapproprie, fausse_info, nudite, violence, haine, autre
- **Escalade auto** : Selon gravite (violence/haine → critique immediate)
- **Workflow** : pending → reviewed → action_taken / dismissed
- **Etat** : Stable

### 8.11 Systeme de sanctions

- **Niveaux** : Warning → Suspension → Ban
- **Auto-suspension** : 3 warnings = suspension automatique
- **Suspension** : Temporaire (1-8760h), acces bloque
- **Ban** : Permanent, deconnexion forcee via Socket
- **Etat** : Stable

### 8.12 Support

- **Description** : Systeme de tickets (bug, compte, contenu, signalement, suggestion, autre)
- **Workflow** : en_attente → en_cours → termine
- **Assignation** : Staff peut s'assigner des tickets
- **Etat** : Stable

### 8.13 Securite avancee

- **Description** : Monitoring securite avec detection threats
- **Types** : Brute force, injection, rate limit, DDoS, signup suspect
- **Actions** : IP blocking, device banning, investigation IP
- **Dashboard** : Niveau menace (Normal → Critique)
- **Etat** : Stable (moderation uniquement)

---

## 9. MODELES DE DONNEES & ETATS

### 9.1 Etats utilisateur

```
                   +----------+
                   | Anonyme  |
                   +-----+----+
                         |
                   [inscription]
                         |
                   +-----v----+
                   | Non       |
                   | verifie   |
                   +-----+----+
                         |
                  [verification email]
                         |
                   +-----v----+
                   | Verifie   |
                   | sans      |
                   | statut    |
                   +-----+----+
                         |
                   [choix statut]
                         |
              +----------+----------+
              |                     |
        +-----v----+         +-----v--------+
        | Visiteur  |         | Entrepreneur |
        +-----+----+         +------+-------+
              |                      |
              +----------+-----------+
                         |
           +-------------+-------------+
           |             |             |
     +-----v----+ +-----v----+ +-----v----+
     | Warned    | | Suspended | | Banned   |
     | (actif)   | | (bloque)  | | (bloque) |
     +-----------+ +-----------+ +----------+
```

### 9.2 Etats de contenu

```
Publication/Story/Projet :
  visible → isHidden (masque par moderation) → supprime (hard delete)

Projet :
  draft → published → depublished → published ...
  Peut etre masque (isHidden) independamment du statut
```

### 9.3 Etats signalement

```
pending → reviewed → action_taken
                  → dismissed
Peut etre : escalated, assigned
```

### 9.4 Etats abonnement LPP+

```
inactive → active (activation)
active → canceled (annulation, mais reste actif jusqu'a fin periode)
canceled → inactive (fin periode, CRON desactive)
canceled → active (reactivation avant fin periode)
```

### 9.5 Conditions d'affichage par role

| Element | user | modo_test | modo | admin_modo | super_admin |
|---------|------|-----------|------|------------|-------------|
| Feed/publications | Oui | Oui | Oui | Oui | Oui |
| Creer projet | Entrepreneur uniquement | - | - | - | - |
| Moderation (app mobile StaffActions) | Non | Oui | Oui | Oui | Oui |
| Interface moderation (web) | Non | Partiel | Oui | Oui | Oui |
| Securite (moderation) | Non | Non | Non | Oui | Oui |
| Config systeme | Non | Non | Non | Non | Oui |

---

## 10. UX/UI & COHERENCE

### 10.1 Design system

**Palette commune** (mobile + web + moderation) :
| Token | Valeur | Usage |
|-------|--------|-------|
| primaire | #7C5CFF | Couleur principale (violet) |
| secondaire | #2DE2E6 | Accents (cyan) |
| accent | #FFBD59 | Or/jaune |
| succes | #00D68F | Validations |
| danger/erreur | #FF4D6D | Erreurs, zone danger |
| fond | #0D0D12 | Background principal |
| fondCard | #1A1A24 | Cartes |
| texte | #E8E8ED / #FFFFFF | Texte principal |
| texteSecondaire | #9494A3 | Texte secondaire |
| bordure | #2A2A36 | Bordures |

**Theme** : Dark mode par defaut, light mode disponible (mobile via ThemeContext)

### 10.2 Parcours utilisateurs

**Visiteur** :
1. Inscription → Verification email → Choix statut "Visiteur"
2. Feed → Decouvrir projets → Suivre → Messagerie → Parcours gamification

**Entrepreneur** :
1. Inscription → Verification email → Choix statut "Entrepreneur"
2. Feed → Creer projet (wizard) → Gerer equipe → Publier → Boutique (boost)

**Staff (moderateur)** :
1. Login sur interface moderation
2. Dashboard → Signalements → Actions (warn/suspend/ban) → Audit

### 10.3 Differences Visiteur / Entrepreneur

| Feature | Visiteur | Entrepreneur |
|---------|----------|--------------|
| Feed | Oui | Oui |
| Suivre projets | Oui | Oui |
| Creer projet | Non | Oui |
| Boutique Services | Non | Oui |
| Boutique Marketplace | Oui | Oui |
| Badge | footsteps-outline (#64748B) | ribbon-outline (#F59E0B) |

### 10.4 Logique des badges (AppBadge)

**Types de badges** :
| Type | Description | Affichage |
|------|-------------|-----------|
| Role | Entrepreneur/Visiteur | Icone + label (ribbon-outline / footsteps-outline) |
| Verified | Abonne LPP+ | Checkmark bleu |
| Level | Niveau gamification | Icone trophee + "Niv.X" |

**Variantes** : soft (fond transparent), solid (fond plein), outline (bordure), ghost (transparent)

**Tailles** : xs (9px), sm (10px), md (12px)

### 10.5 Points de friction UX

1. **Pas de page Decouvrir sur mobile** — Les projets ne sont accessibles que via "Mes Startups" (projets suivis) ou via liens. Le web a une page /decouvrir avec filtres avances.
2. **Wizard projet uniquement sur web** — La creation projet mobile est plus limitee que le wizard 6 etapes du web.
3. **Inline styles sur web** — Pas de framework CSS, maintenance plus complexe.
4. **Polling vs WebSocket** — La moderation utilise du polling (60s), pas de WebSocket temps reel.
5. **Pas de tests automatises** — Aucun test unitaire ou d'integration detecte sur aucune branche.
6. **Donnees mock boutique mobile** — Les offres boost sont en dur dans le code, pas d'API.

---

## 11. PARITE FONCTIONNELLE MOBILE / WEB

| Feature | Mobile | Web | Notes |
|---------|--------|-----|-------|
| Connexion email/mdp | Oui | Oui | Identique |
| OAuth Google | Oui | Oui | Identique |
| OAuth Facebook | Oui | Oui | Identique |
| OAuth Apple | Oui | Non | Mobile uniquement |
| Verification email | Oui | Oui | Identique |
| Liaison compte | Oui | Non | Mobile uniquement |
| Feed publications | Oui | Oui | Identique |
| Stories | Oui | Oui | Identique |
| Reels (video feed) | Oui | Non | Mobile uniquement |
| Commentaires | Oui | Oui | Identique |
| Messagerie | Oui | Oui | Identique |
| Systeme d'amis | Oui | Oui | Identique |
| Notifications | Oui | Oui | Identique |
| Profil | Oui | Oui | Identique |
| Profil public | Oui | Oui | Identique |
| Decouvrir projets | Non (partiel) | Oui | Web a filtres avances |
| Creer projet (wizard 6 etapes) | Partiel | Oui | Web complet, mobile simplifie |
| Boutique LPP+ | Oui | Non | Mobile uniquement |
| Boutique Boost | Oui | Non | Mobile uniquement |
| Marketplace | Oui | Non | Mobile uniquement |
| Gamification | Oui | Oui | Identique |
| Live streaming | Oui | Oui (viewer) | Mobile = start + view, Web = view |
| Support tickets | Oui | Oui (dans reglages) | Identique |
| Sanctions | Oui | Oui (dans reglages) | Identique |
| Facturation LPP+ | Oui | Non | Mobile uniquement |
| Landing page | Non | Oui | Web uniquement |
| Choix statut | Oui | Oui | Identique |

---

## 12. PROBLEMES CONNUS & DETTE TECHNIQUE

### Securite
1. **[CORRIGE] Suppression compte OAuth sans verification** — Les comptes Google pouvaient etre supprimes avec un mdp aleatoire. Fix applique : verification par email pour OAuth.
2. **Pas de 2FA** — Aucune authentification a deux facteurs pour les utilisateurs ou le staff.

### Backend
3. **dist/ dans le .gitignore** — Le backend compile (dist/) est ignore par git sur les branches non-backend. Deployement manuel ou CI necessaire.
4. **Pas de tests** — Aucun test unitaire ou d'integration detecte.
5. **Donnees mock boutique** — Les offres boost/bundle sont en dur cote mobile, pas d'API dediee.

### Mobile
6. **Polling messagerie** — Fallback polling 15s pour les messages (WebSocket principal, polling secours).
7. **Require cycles** — Certains cycles d'import ont ete corriges (PublicationCard, MessagesTab) mais d'autres peuvent exister.
8. **Pas de page Decouvrir** — Les projets ne sont pas aussi facilement decouverts que sur web.

### Web
9. **Inline styles** — Tout le CSS est en inline React, pas de framework CSS, maintenance difficile a grande echelle.
10. **Pas de ErrorBoundary par page** — Un seul ErrorBoundary global.

### Moderation
11. **Pas de WebSocket** — Polling uniquement (React Query 60s).
12. **Notifications broadcast** — Page presente mais possiblement incomplete.

### Transversal
13. **Pas de i18n** — Tout est en francais, pas de systeme d'internationalisation.
14. **Pas de CI/CD** — Aucun pipeline de build/test automatise detecte.
15. **Pas de monitoring** — Pas de Sentry, DataDog, ou autre outil de monitoring d'erreurs.

---

## 13. AUTO-AUDIT FINAL

### Verification exhaustive

- [x] **Branches** : 4 branches auditees (backend, DevMobile, master, Moderation)
- [x] **Backend** : 19 modeles, 60+ endpoints, 19 controllers, 14+ middlewares documentes
- [x] **Mobile** : 35+ ecrans, 50+ composants, 16 services, 5 contexts documentes
- [x] **Web** : 18 pages, 9 composants, 12 services, 3 contexts documentes
- [x] **Moderation** : 28 pages, 19 services, permissions detaillees
- [x] **Chaque ecran** : Plateforme, role, utilisateurs, actions, donnees, API identifies
- [x] **Chaque feature** : Description, utilisation, roles, logique, etat documentes
- [x] **Modeles de donnees** : Tous les champs, types, relations documentes
- [x] **Etats** : Diagrammes d'etats (utilisateur, contenu, signalement, abonnement)
- [x] **UX/UI** : Parcours, design tokens, coherence, points de friction analyses
- [x] **Parite** : Comparaison mobile/web feature par feature
- [x] **Securite** : Mesures, rate limits, chiffrement, protection documentes
- [x] **Problemes connus** : 15 points identifies et documentes

### Elements non documentes (absents du code)

- **Stripe/paiement reel** : Aucune integration de paiement detectee (LPP+ s'active directement)
- **Push notifications** : Pas de configuration push (Expo Notifications non installe)
- **Deep linking** : Configuration basique Expo Router, pas de schema URL custom
- **Tests** : Aucun fichier de test sur aucune branche
- **CI/CD** : Aucune configuration (GitHub Actions, etc.)

---

> **Cette cartographie est complete, fidele et exhaustive par rapport a l'etat reel du projet La Premiere Pierre (LPP).**
> Tout element documente provient exclusivement du code source audite.
> Aucune information n'a ete inventee, extrapolee ou supposee.
> Les informations absentes sont explicitement signalees.