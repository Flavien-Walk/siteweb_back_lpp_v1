# La Première Pierre (LPP)

Plateforme connectant les jeunes investisseurs (18-25 ans) aux startups et projets locaux.

## Structure du projet

```
CELSE/
├── src/                    # Frontend React
│   ├── assets/            # Images, logos
│   ├── components/        # Composants React
│   │   └── Auth/         # Composants authentification
│   ├── pages/            # Pages de l'application
│   ├── services/         # Services API
│   └── styles/           # Fichiers CSS
├── backend/               # Backend Node.js/Express
│   └── src/
│       ├── config/       # Configuration (MongoDB, Passport)
│       ├── controllers/  # Contrôleurs
│       ├── middlewares/  # Middlewares (JWT, erreurs)
│       ├── models/       # Modèles Mongoose
│       ├── routes/       # Routes API
│       └── utils/        # Utilitaires
└── README.md
```

## Prérequis

- Node.js 18+
- MongoDB (local ou Atlas)
- npm ou yarn

## Installation

### 1. Cloner et installer les dépendances

```bash
# Frontend
npm install

# Backend
cd backend
npm install
```

### 2. Configuration des variables d'environnement

**Frontend** - Créer `.env` à la racine :
```bash
cp .env.example .env
```

**Backend** - Créer `.env` dans `/backend` :
```bash
cd backend
cp .env.example .env
```

Remplir les variables dans `backend/.env` :
- `MONGODB_URI` : URL MongoDB (ex: `mongodb://localhost:27017/lpp`)
- `JWT_SECRET` : Clé secrète pour les tokens
- Credentials OAuth (optionnel)

## Lancer le projet

### Terminal 1 - Backend
```bash
cd backend
npm run dev
```
→ API disponible sur http://localhost:5000

### Terminal 2 - Frontend
```bash
npm run dev
```
→ Site disponible sur http://localhost:5173

## Pages disponibles

| URL | Description |
|-----|-------------|
| `/` | Page d'accueil |
| `/connexion` | Page de connexion |
| `/inscription` | Page d'inscription |

## API Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/inscription` | Créer un compte |
| POST | `/api/auth/connexion` | Se connecter |
| GET | `/api/auth/moi` | Profil utilisateur (JWT) |
| GET | `/api/auth/google` | OAuth Google |
| GET | `/api/auth/facebook` | OAuth Facebook |
| GET | `/api/auth/apple` | OAuth Apple |

## Technologies

**Frontend**
- React 19
- TypeScript
- Framer Motion
- Vite

**Backend**
- Node.js
- Express
- MongoDB / Mongoose
- Passport.js (OAuth)
- JWT
- Zod (validation)

## Notes OAuth

- **Google** : [console.cloud.google.com](https://console.cloud.google.com/)
- **Facebook** : [developers.facebook.com](https://developers.facebook.com/)
- **Apple** : Nécessite un compte Apple Developer ($99/an)
