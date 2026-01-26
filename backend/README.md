# La Première Pierre - Backend API

Backend Node.js/Express pour l'authentification de La Première Pierre.

## Fonctionnalités

- ✅ Inscription/Connexion par email et mot de passe
- ✅ Authentification JWT
- ✅ OAuth Google
- ✅ OAuth Facebook
- ✅ OAuth Apple (nécessite compte Apple Developer)
- ✅ Validation des données avec Zod
- ✅ Sécurité (Helmet, CORS, Rate Limiting)

## Installation

```bash
cd backend
npm install
```

## Configuration

1. Copier le fichier d'exemple :
```bash
cp .env.example .env
```

2. Remplir les variables dans `.env` :
   - `MONGODB_URI` : URL de votre base MongoDB
   - `JWT_SECRET` : Clé secrète pour les tokens JWT
   - Credentials OAuth (optionnel)

## Lancer le serveur

### Développement
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## Endpoints API

### Authentification

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/inscription` | Inscription |
| POST | `/api/auth/connexion` | Connexion |
| GET | `/api/auth/moi` | Profil utilisateur (JWT requis) |

### OAuth

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/auth/google` | Connexion Google |
| GET | `/api/auth/google/callback` | Callback Google |
| GET | `/api/auth/facebook` | Connexion Facebook |
| GET | `/api/auth/facebook/callback` | Callback Facebook |
| GET | `/api/auth/apple` | Connexion Apple |
| POST | `/api/auth/apple/callback` | Callback Apple |

### Santé

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/sante` | Vérifier l'état de l'API |

## Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── mongo.ts      # Connexion MongoDB
│   │   └── passport.ts   # Stratégies OAuth
│   ├── controllers/
│   │   └── authController.ts
│   ├── middlewares/
│   │   ├── verifierJwt.ts
│   │   └── gestionErreurs.ts
│   ├── models/
│   │   └── Utilisateur.ts
│   ├── routes/
│   │   └── authRoutes.ts
│   ├── utils/
│   │   ├── tokens.ts
│   │   └── validation.ts
│   ├── app.ts
│   └── server.ts
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Notes OAuth

### Google
Créez vos credentials sur [Google Cloud Console](https://console.cloud.google.com/)

### Facebook
Créez votre app sur [Facebook Developers](https://developers.facebook.com/)

### Apple
⚠️ Nécessite un compte [Apple Developer](https://developer.apple.com/) ($99/an)
Le code est fonctionnel mais dépend de vos credentials Apple réels.
