# La Premiere Pierre - Application Mobile

Application mobile React Native / Expo pour la plateforme La Premiere Pierre.

## Structure

```
mobile/
├── app/          # Expo Router pages
├── src/          # Code source
│   ├── composants/
│   ├── contexts/
│   ├── hooks/
│   └── services/
├── assets/       # Images et ressources
├── app.json      # Configuration Expo
└── package.json
```

## Installation

```bash
cd mobile
npm install
```

## Developpement

```bash
cd mobile
npx expo start
```

## Configuration

Creer un fichier `mobile/.env` avec :

```
EXPO_PUBLIC_API_URL=https://votre-backend.onrender.com/api
```

## Backend

Le backend est sur la branche `backend` de ce repo.
