# Securite - La Premiere Pierre

## Architecture de securite

### Authentification
- **JWT HS256** avec algorithme explicitement specifie (anti-confusion attack)
- Duree de validite : 7 jours (configurable via `JWT_EXPIRES_IN`)
- **Token blacklist** via MongoDB TTL collection (`TokenBlacklist`) pour invalidation serveur
- Endpoint `/api/auth/deconnexion` pour logout propre
- OAuth securise : Google, Facebook, Apple avec CSRF state validation
  - Web : cookie httpOnly pour echange de token (one-time, 5min TTL)
  - Mobile : code temporaire one-time (5min TTL)

### Autorisation (RBAC)
- 5 roles hierarchiques : `user` < `modo_test` < `modo` < `admin_modo` < `super_admin`
- 17 permissions granulaires (content:hide, users:ban, reports:view, etc.)
- Middlewares : `verifierJwt`, `checkUserStatus`, `requirePermission`, `requireStaff`, `requireMinRole`

### Protection des donnees
- **Mots de passe** : bcrypt avec salt automatique
- **Messages** : chiffrement AES-256-GCM (v2) avec backward compat CBC (v1)
- **Cle de chiffrement** : env var `MESSAGE_ENCRYPTION_KEY`

### Rate Limiting
| Route | Limite | Fenetre |
|-------|--------|---------|
| Global API | 300 req | 15 min |
| Auth (login/register) | 10 req | 15 min |
| Heartbeat (/moi) | 20 req | 1 min |
| Messages | 60 req | 15 min |
| Ecritures (publications, projets) | 30 req | 15 min |
| Admin/Moderation | 200 req | 15 min |
| Sanctions (ban/warn/suspend) | 50 req | 1 heure |

### Socket.io
- Rate limiting par event et par socket (sliding window)
- Max 5 connexions par utilisateur
- Max 50 rooms par socket
- Verification ban/suspend a la connexion
- Force disconnect en temps reel sur ban/suspend

### Uploads
- MIME whitelist stricte (images: jpeg, png, webp, gif, heic; videos: mp4, quicktime, webm)
- Taille max : 10 MB images, 50 MB videos
- Upload via Cloudinary (pas de stockage serveur)
- Body limit Express : 20 MB

### Headers de securite
- Helmet (CSP, HSTS, X-Frame-Options, etc.)
- CORS whitelist stricte (pas de wildcard `*`)
- Trust proxy configure pour Render

## Variables d'environnement requises

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `MONGODB_URI` | Oui | URI MongoDB Atlas |
| `JWT_SECRET` | Oui | Secret JWT (min 32 chars) |
| `JWT_EXPIRES_IN` | Non | Duree token (defaut: 7d) |
| `MESSAGE_ENCRYPTION_KEY` | Oui | Cle AES-256 (32 bytes hex) |
| `CLIENT_URL` | Oui | URL frontend production |
| `CLOUDINARY_CLOUD_NAME` | Oui | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Oui | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Oui | Cloudinary API secret |
| `GOOGLE_CLIENT_ID` | Non | OAuth Google |
| `GOOGLE_CLIENT_SECRET` | Non | OAuth Google |
| `FACEBOOK_APP_ID` | Non | OAuth Facebook |
| `FACEBOOK_APP_SECRET` | Non | OAuth Facebook |
| `APPLE_CLIENT_ID` | Non | OAuth Apple |
| `APPLE_TEAM_ID` | Non | OAuth Apple |
| `APPLE_KEY_ID` | Non | OAuth Apple |
| `PORT` | Non | Port serveur (defaut: 5000) |

## Signaler une vulnerabilite

Contactez l'equipe a : securite@lapremierrepierre.com
