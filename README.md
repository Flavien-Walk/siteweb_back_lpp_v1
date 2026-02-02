# La Premiere Pierre - Outil de Moderation

Outil de moderation local (React/Vite) pour la plateforme La Premiere Pierre.

## Structure

```
moderation/
├── src/
│   ├── auth/         # Authentification
│   ├── components/   # Composants React
│   ├── pages/        # Pages de l'application
│   ├── services/     # Services API
│   ├── types/        # Types TypeScript
│   └── lib/          # Utilitaires
├── index.html
├── vite.config.ts
└── package.json
```

## Installation

```bash
cd moderation
npm install
```

## Developpement

```bash
cd moderation
npm run dev
```

## Configuration

Creer un fichier `moderation/.env` avec :

```
VITE_API_URL=https://votre-backend.onrender.com/api
```

## Backend

Le backend est sur la branche `backend` de ce repo.
