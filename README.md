# La Premiere Pierre (LPP)

Plateforme connectant les jeunes investisseurs (18-25 ans) aux startups et projets locaux.

## Architecture du repository

Ce repository est organise en **branches separees** pour chaque composant :

| Branche | Description | Deploiement |
|---------|-------------|-------------|
| `backend` | API Node.js/Express | Render |
| `DevMobile` | App mobile React Native/Expo | - |
| `Moderation` | Outil de moderation (React/Vite) | Local |

## Demarrage rapide

### Backend (API)

```bash
git checkout backend
npm install
npm run dev
```

### Application Mobile

```bash
git checkout DevMobile
cd mobile
npm install
npx expo start
```

### Outil de Moderation

```bash
git checkout Moderation
cd moderation
npm install
npm run dev
```

## Technologies

- **Backend** : Node.js, Express, TypeScript, MongoDB, JWT, Passport.js
- **Mobile** : React Native, Expo, TypeScript
- **Moderation** : React, Vite, TypeScript

## Branches archivees

- `WebFrontArchive` : Ancien frontend web Vite (archive)
