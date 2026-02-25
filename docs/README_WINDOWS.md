# La Premiere Pierre (LPP) — Guide d'installation Windows

Guide complet pour installer, configurer et lancer tous les composants du projet LPP sur Windows 10/11.

---

## Sommaire

1. [Prerequis](#prerequis)
2. [Installation des outils](#installation-des-outils)
3. [Cloner le depot](#cloner-le-depot)
4. [Backend](#backend)
5. [Application mobile](#application-mobile)
6. [Site web](#site-web)
7. [Dashboard moderation](#dashboard-moderation)
8. [Lancer tous les composants simultanement](#lancer-tous-les-composants-simultanement)
9. [Debugging](#debugging)
10. [Problemes frequents](#problemes-frequents)

---

## Prerequis

| Outil | Version | Telechargement |
|-------|---------|----------------|
| Node.js | 20.x LTS (ou 22.x) | https://nodejs.org/ |
| Git | 2.30+ | https://git-scm.com/download/win |
| MongoDB | 6.0+ (ou MongoDB Atlas) | https://www.mongodb.com/try/download/community |
| Android Studio | Derniere version | https://developer.android.com/studio |
| Expo Go | Derniere version | Google Play Store |
| VS Code | Recommande | https://code.visualstudio.com/ |

### Verifier les installations

Ouvrir **PowerShell** ou **Git Bash** et executer :

```bash
node --version      # v20.x.x ou v22.x.x
npm --version       # 9.x.x ou 10.x.x
git --version       # git version 2.4x.x
mongod --version    # (si MongoDB local installe)
```

### Configuration de Git (si premiere utilisation)

```bash
git config --global user.name "Votre Nom"
git config --global user.email "votre@email.com"
git config --global core.autocrlf true    # Important sur Windows (fin de ligne)
```

---

## Installation des outils

### Node.js

1. Telecharger l'installateur LTS depuis https://nodejs.org/
2. Lancer l'installateur, cocher **"Automatically install the necessary tools"** si propose
3. Redemarrer le terminal apres installation

### MongoDB (option locale)

**Option A — MongoDB Atlas (recommande pour debuter)** :
1. Creer un compte sur https://www.mongodb.com/atlas
2. Creer un cluster gratuit (M0)
3. Dans "Database Access", creer un utilisateur avec mot de passe
4. Dans "Network Access", ajouter `0.0.0.0/0` (acces depuis partout, dev uniquement)
5. Recuperer l'URI de connexion : `mongodb+srv://user:pass@cluster.xxx.mongodb.net/lpp`

**Option B — MongoDB local** :
1. Telecharger MongoDB Community Server
2. Installer avec les options par defaut (service Windows inclus)
3. MongoDB demarre automatiquement en tant que service Windows
4. URI locale : `mongodb://localhost:27017/lpp`

### Android Studio (pour emulateur Android)

1. Telecharger et installer Android Studio
2. Au premier lancement, installer le SDK Android recommande
3. Aller dans **Tools > Device Manager > Create Device**
4. Choisir un appareil (ex: Pixel 7) et une image systeme (API 34+)
5. Lancer l'emulateur pour verifier qu'il fonctionne

> **Note** : L'emulateur Android n'est pas obligatoire si vous testez sur un appareil physique avec Expo Go.

---

## Cloner le depot

```bash
git clone <url-du-depot> lpp
cd lpp
```

Le depot contient 4 branches. Chaque composant se developpe sur sa propre branche :

```bash
git branch -a    # Voir toutes les branches disponibles
```

---

## Backend

### Installation

```bash
git checkout backend
npm install
```

### Configuration

Copier le fichier d'exemple et remplir les valeurs :

```bash
cp .env.example .env
```

Ouvrir `.env` dans un editeur et configurer au minimum :

```env
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.xxx.mongodb.net/lpp
JWT_SECRET=une_chaine_aleatoire_tres_longue_64_caracteres_minimum
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
MOBILE_SCHEME=lpp
SESSION_SECRET=une_autre_chaine_aleatoire_longue
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
CRYPTO_SECRET_KEY=chaine_hexadecimale_de_64_caracteres
```

Pour generer des cles aleatoires sous PowerShell :

```powershell
# Generer une cle JWT_SECRET (64 caracteres)
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})

# Generer une cle CRYPTO_SECRET_KEY (64 caracteres hex)
-join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

Les variables OAuth (Google, Facebook, Apple), Cloudinary, Resend et Agora sont optionnelles en developpement local. Les fonctionnalites correspondantes seront desactivees sans erreur fatale.

### Demarrage

```bash
npm run dev
```

Le serveur demarre sur `http://localhost:5000`. Verifier avec :

```bash
curl http://localhost:5000/api/auth/status
# ou ouvrir l'URL dans un navigateur
```

### Scripts backend

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de dev avec hot reload (tsx watch) |
| `npm run build` | Compilation TypeScript vers `dist/` |
| `npm start` | Demarrage en production (depuis `dist/`) |

---

## Application mobile

### Installation

```bash
git checkout DevMobile
cd mobile
npm install
```

### Configuration

```bash
cp .env.example .env
```

Editer `mobile/.env` :

```env
EXPO_PUBLIC_API_URL=http://192.168.1.XX:5000/api
```

> **Important** : Remplacer `192.168.1.XX` par l'adresse IP locale de votre machine. Pour la trouver :
> ```powershell
> ipconfig
> # Chercher "IPv4 Address" sous votre adaptateur Wi-Fi ou Ethernet
> ```
> Ne pas utiliser `localhost` — l'appareil physique ou l'emulateur ne pourra pas atteindre le serveur.

### Demarrage

```bash
npx expo start
```

Options de lancement :

| Touche | Action |
|--------|--------|
| `a` | Ouvrir sur emulateur Android |
| `w` | Ouvrir dans le navigateur web |
| `r` | Recharger l'application |
| `j` | Ouvrir le debugger |
| `m` | Basculer le menu |

Pour tester sur un appareil physique :
1. Installer **Expo Go** depuis le Play Store
2. Scanner le QR code affiche dans le terminal
3. L'appareil et le PC doivent etre sur le meme reseau Wi-Fi

### Mode tunnel (si le QR code ne fonctionne pas)

```bash
npx expo start --tunnel
```

Ce mode passe par les serveurs Expo et ne necessite pas que l'appareil soit sur le meme reseau. Plus lent mais utile en reseau d'entreprise ou Wi-Fi public.

### Scripts mobile

| Commande | Description |
|----------|-------------|
| `npx expo start` | Demarrage standard |
| `npx expo start --android` | Ouverture directe sur emulateur Android |
| `npx expo start --tunnel` | Mode tunnel (reseau restrictif) |
| `npx expo start --clear` | Demarrage avec cache vide |

---

## Site web

### Installation

```bash
git checkout master
cd web
npm install
```

### Configuration

```bash
cp .env.example .env
```

Editer `web/.env` :

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### Demarrage

```bash
npm run dev
```

Le site demarre sur `http://localhost:5173`. Ouvrir cette URL dans un navigateur.

### Build de production

```bash
npm run build      # Genere le dossier dist/
npm run preview    # Previsualiser le build localement
```

---

## Dashboard moderation

### Installation

```bash
git checkout Moderation
cd moderation
npm install
```

### Configuration

```bash
cp .env.example .env
```

Editer `moderation/.env` :

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### Demarrage

```bash
npm run dev
```

Le dashboard demarre sur `http://localhost:5174`.

> **Note** : Pour acceder au dashboard, il faut un compte avec le role `admin` ou `moderateur` dans la base de donnees.

---

## Lancer tous les composants simultanement

Pour developper en full-stack, il faut 4 terminaux ouverts :

**Terminal 1 — Backend** :
```bash
cd lpp
git checkout backend
npm run dev
```

**Terminal 2 — Mobile** :
```bash
cd lpp
git checkout DevMobile
cd mobile
npx expo start
```

**Terminal 3 — Web** :
```bash
cd lpp
git checkout master
cd web
npm run dev
```

**Terminal 4 — Moderation** :
```bash
cd lpp
git checkout Moderation
cd moderation
npm run dev
```

> **Astuce Windows** : Utiliser **Windows Terminal** avec des onglets pour organiser les 4 terminaux. Chaque onglet peut avoir un profil Git Bash ou PowerShell.

### Ordre de demarrage recommande

1. MongoDB (si local — sinon Atlas est toujours disponible)
2. Backend (les autres composants en dependent)
3. Web / Moderation / Mobile (dans n'importe quel ordre)

---

## Debugging

### Backend

**Logs du serveur** : Les logs s'affichent directement dans le terminal. Les erreurs MongoDB, JWT, et OAuth sont loguees en console.

**VS Code debugger** :
1. Creer `.vscode/launch.json` :
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Backend LPP",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["tsx", "src/app.ts"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "env": { "NODE_ENV": "development" }
    }
  ]
}
```
2. F5 pour demarrer avec breakpoints

**Tester les endpoints** : Utiliser un client HTTP (Postman, Insomnia, Thunder Client dans VS Code) ou `curl` :
```bash
curl -X POST http://localhost:5000/api/auth/inscription \
  -H "Content-Type: application/json" \
  -d '{"pseudo":"test","email":"test@test.com","motDePasse":"Test1234!","prenom":"Test","nom":"User"}'
```

### Mobile (Expo)

**React Native Debugger** : Appuyer sur `j` dans le terminal Expo pour ouvrir le debugger.

**Logs** : Les `console.log` s'affichent dans le terminal Expo et dans l'onglet Console du debugger.

**Shake to debug** : Secouer l'appareil physique (ou Ctrl+M dans l'emulateur) pour acceder au menu de debug Expo.

### Web / Moderation

**DevTools navigateur** : F12 pour ouvrir les outils de developpement. L'onglet Network permet de suivre les requetes API. L'onglet Console affiche les erreurs et les logs.

**Vite HMR** : Les modifications sont appliquees instantanement sans rechargement complet de la page.

---

## Problemes frequents

### `EACCES: permission denied` lors de `npm install`

```powershell
# Lancer PowerShell en administrateur, puis :
npm cache clean --force
npm install
```

### `ENOSPC: System limit for number of file watchers reached`

Ce probleme est rare sur Windows. S'il survient :
```powershell
# Verifier la limite actuelle
Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\LanmanServer\Parameters" -Name "MaxWatchedPaths" -ErrorAction SilentlyContinue
```

### MongoDB `ECONNREFUSED`

- Verifier que le service MongoDB tourne : **Services Windows** (Win+R → `services.msc` → chercher "MongoDB Server")
- Si utilisation d'Atlas : verifier que votre IP est dans la whitelist
- Verifier que l'URI dans `.env` est correcte

### Expo : QR code non scannable

- Verifier que le PC et le telephone sont sur le meme reseau Wi-Fi
- Desactiver le pare-feu Windows temporairement pour tester
- Utiliser le mode tunnel : `npx expo start --tunnel`
- Sur certains reseaux d'entreprise, utiliser un partage de connexion mobile

### Port deja utilise

```powershell
# Trouver le processus qui utilise le port (exemple : 5000)
netstat -ano | findstr :5000

# Tuer le processus par son PID
taskkill /PID <pid> /F
```

### `ERR_MODULE_NOT_FOUND` au demarrage du backend

```bash
# S'assurer que les dependances sont installees
npm install

# Si le probleme persiste, supprimer node_modules et reinstaller
rm -rf node_modules package-lock.json
npm install
```

### L'emulateur Android ne demarre pas

- Verifier que la virtualisation (Hyper-V ou Intel HAXM) est activee dans le BIOS
- Android Studio > Tools > Device Manager : verifier que le device est bien cree
- Redemarrer Android Studio si l'emulateur ne repond pas

### Erreur CORS au chargement du site web

- Verifier que `CLIENT_URL` dans le `.env` backend correspond exactement a l'URL du frontend (protocole + host + port)
- Verifier que `CORS_ORIGINS` contient toutes les origines necessaires
- Pas de slash final (`http://localhost:5173` et non `http://localhost:5173/`)

---

> **Voir aussi** : [README principal](../README.md) pour la vue d'ensemble du projet.
