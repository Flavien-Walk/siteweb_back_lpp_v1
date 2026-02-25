# La Premiere Pierre (LPP) — Guide d'installation macOS

Guide complet pour installer, configurer et lancer tous les composants du projet LPP sur macOS (Ventura 13+, Sonoma 14+, Sequoia 15+).

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

| Outil | Version | Installation |
|-------|---------|-------------|
| Homebrew | Derniere version | https://brew.sh |
| Node.js | 20.x LTS (ou 22.x) | Via Homebrew ou nvm |
| Git | 2.30+ | Inclus avec Xcode CLI Tools |
| MongoDB | 6.0+ (ou MongoDB Atlas) | Via Homebrew ou Atlas |
| Xcode | 15+ (pour iOS Simulator) | Mac App Store |
| Xcode Command Line Tools | Derniere version | `xcode-select --install` |
| Expo Go | Derniere version | App Store (iPhone) / Play Store (Android) |
| Android Studio | Derniere version (optionnel) | https://developer.android.com/studio |

### Verifier les installations

```bash
node --version      # v20.x.x ou v22.x.x
npm --version       # 9.x.x ou 10.x.x
git --version       # git version 2.4x.x
mongod --version    # (si MongoDB local)
xcodebuild -version # Xcode 15.x
```

---

## Installation des outils

### Homebrew (gestionnaire de paquets macOS)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Apres installation, suivre les instructions affichees pour ajouter Homebrew au PATH (surtout sur les Mac Apple Silicon) :

```bash
# Apple Silicon (M1/M2/M3/M4)
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"

# Intel Mac — Homebrew est deja dans /usr/local/bin
```

### Xcode Command Line Tools

```bash
xcode-select --install
```

Ces outils incluent Git, make, clang et les headers systeme necessaires pour compiler les modules natifs Node.js.

### Node.js

**Option A — Via Homebrew (simple)** :
```bash
brew install node@20
```

**Option B — Via nvm (recommande pour gerer plusieurs versions)** :
```bash
brew install nvm
mkdir ~/.nvm

# Ajouter au profil shell (~/.zshrc sur macOS Catalina+)
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
echo '[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && . "/opt/homebrew/opt/nvm/nvm.sh"' >> ~/.zshrc
source ~/.zshrc

nvm install 20
nvm use 20
nvm alias default 20
```

### MongoDB

**Option A — MongoDB Atlas (recommande pour debuter)** :
1. Creer un compte sur https://www.mongodb.com/atlas
2. Creer un cluster gratuit (M0)
3. Creer un utilisateur dans "Database Access"
4. Ajouter `0.0.0.0/0` dans "Network Access" (dev uniquement)
5. Copier l'URI de connexion

**Option B — MongoDB local via Homebrew** :
```bash
brew tap mongodb/brew
brew install mongodb-community@7.0

# Demarrer le service
brew services start mongodb-community@7.0

# Verifier
mongosh --eval "db.version()"
```

Pour arreter MongoDB :
```bash
brew services stop mongodb-community@7.0
```

### Xcode (pour le simulateur iOS)

1. Installer Xcode depuis le Mac App Store (telechargement ~12 Go)
2. Ouvrir Xcode une premiere fois et accepter la licence
3. Aller dans **Xcode > Settings > Platforms** et installer **iOS 17** (ou plus recent)
4. Verifier les simulateurs : **Xcode > Open Developer Tool > Simulator**

> **Note** : Xcode complet est necessaire uniquement pour le simulateur iOS. Si vous ne testez pas sur iOS, les Command Line Tools suffisent.

### Android Studio (optionnel, pour emulateur Android)

```bash
brew install --cask android-studio
```

1. Au premier lancement, installer le SDK Android recommande
2. Tools > Device Manager > Create Device > choisir Pixel 7 > API 34+
3. Configurer la variable `ANDROID_HOME` :

```bash
echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools' >> ~/.zshrc
source ~/.zshrc
```

---

## Cloner le depot

```bash
git clone <url-du-depot> lpp
cd lpp
```

---

## Backend

### Installation

```bash
git checkout backend
npm install
```

### Configuration

```bash
cp .env.example .env
```

Editer `.env` avec les valeurs minimales :

```env
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.xxx.mongodb.net/lpp
JWT_SECRET=votre_cle_secrete_64_caracteres_minimum
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
MOBILE_SCHEME=lpp
SESSION_SECRET=une_autre_cle_secrete_longue
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
CRYPTO_SECRET_KEY=cle_hexadecimale_64_caracteres
```

Pour generer des cles aleatoires :

```bash
# JWT_SECRET (64 caracteres alphanumeriques)
openssl rand -base64 48

# CRYPTO_SECRET_KEY (64 caracteres hex)
openssl rand -hex 32
```

Les variables OAuth, Cloudinary, Resend et Agora sont optionnelles en developpement local.

### Demarrage

```bash
npm run dev
```

Le serveur demarre sur `http://localhost:5000`.

### Scripts backend

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de dev avec hot reload (tsx watch) |
| `npm run build` | Compilation TypeScript vers `dist/` |
| `npm start` | Demarrage en production |

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

Trouver votre IP locale :
```bash
ipconfig getifaddr en0    # Wi-Fi
# ou
ifconfig | grep "inet " | grep -v 127.0.0.1
```

> **Important** : Utiliser l'adresse IP locale (pas `localhost`) pour que l'appareil physique ou le simulateur puisse atteindre le backend.

### Demarrage

```bash
npx expo start
```

| Touche | Action |
|--------|--------|
| `i` | Ouvrir sur simulateur iOS |
| `a` | Ouvrir sur emulateur Android |
| `w` | Ouvrir dans le navigateur |
| `r` | Recharger l'application |
| `j` | Ouvrir le debugger |

### Test sur iPhone physique

1. Installer **Expo Go** depuis l'App Store
2. Scanner le QR code avec l'appareil photo de l'iPhone
3. L'iPhone et le Mac doivent etre sur le meme reseau Wi-Fi

### Test sur simulateur iOS

```bash
npx expo start --ios
```

Le simulateur iOS se lance automatiquement. Si aucun simulateur n'est configure, Expo en creera un par defaut.

### Mode tunnel

```bash
npx expo start --tunnel
```

Utile si l'appareil et le Mac ne sont pas sur le meme reseau, ou en cas de firewall restrictif.

### Scripts mobile

| Commande | Description |
|----------|-------------|
| `npx expo start` | Demarrage standard |
| `npx expo start --ios` | Ouverture sur simulateur iOS |
| `npx expo start --android` | Ouverture sur emulateur Android |
| `npx expo start --tunnel` | Mode tunnel |
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

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### Demarrage

```bash
npm run dev
```

Accessible sur `http://localhost:5173`.

### Build de production

```bash
npm run build      # Genere dist/
npm run preview    # Previsualise le build
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

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### Demarrage

```bash
npm run dev
```

Accessible sur `http://localhost:5174`.

> Un compte avec le role `admin` ou `moderateur` est necessaire pour se connecter.

---

## Lancer tous les composants simultanement

Ouvrir 4 onglets dans Terminal (ou utiliser iTerm2 avec des panneaux) :

**Onglet 1 — Backend** :
```bash
cd lpp && git checkout backend && npm run dev
```

**Onglet 2 — Mobile** :
```bash
cd lpp && git checkout DevMobile && cd mobile && npx expo start
```

**Onglet 3 — Web** :
```bash
cd lpp && git checkout master && cd web && npm run dev
```

**Onglet 4 — Moderation** :
```bash
cd lpp && git checkout Moderation && cd moderation && npm run dev
```

### Ordre de demarrage

1. MongoDB (si local : `brew services start mongodb-community@7.0`)
2. Backend (les autres composants en dependent)
3. Web / Moderation / Mobile (ordre libre)

> **Astuce** : iTerm2 permet de creer des layouts avec 4 panneaux (Cmd+D pour splitter horizontalement, Cmd+Shift+D pour verticalement).

---

## Debugging

### Backend

**Logs** : Directement dans le terminal. Les erreurs sont detaillees avec stack traces.

**VS Code** : Creer `.vscode/launch.json` :
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
      "console": "integratedTerminal"
    }
  ]
}
```

**MongoDB GUI** : Installer MongoDB Compass (`brew install --cask mongodb-compass`) pour explorer la base visuellement.

### Mobile

**React DevTools** : Touche `j` dans le terminal Expo.

**Console logs** : Visibles dans le terminal Expo et dans Safari DevTools (pour iOS Simulator).

**Safari DevTools (iOS Simulator)** :
1. Ouvrir Safari sur Mac
2. Safari > Settings > Advanced > cocher "Show Develop menu in menu bar"
3. Develop > Simulator > choisir l'application

**Secouer pour le menu** : Secouer l'appareil physique ou appuyer sur Cmd+D dans le simulateur iOS pour acceder au menu Expo.

### Web / Moderation

**DevTools** : Cmd+Option+I dans le navigateur. L'onglet Network montre les requetes API, Console affiche les logs.

**Vite HMR** : Les modifications se repercutent instantanement dans le navigateur.

---

## Problemes frequents

### `gyp: No Xcode or CLT version detected`

```bash
sudo rm -rf $(xcode-select -print-path)
xcode-select --install
```

### `Error: EMFILE: too many open files`

macOS a une limite basse de fichiers ouverts par defaut :

```bash
# Augmenter temporairement
ulimit -n 10240

# Augmenter de facon permanente
echo 'ulimit -n 10240' >> ~/.zshrc
source ~/.zshrc
```

### MongoDB : `Connection refused`

- Si local : `brew services list` pour verifier que MongoDB tourne
- Redemarrer : `brew services restart mongodb-community@7.0`
- Si Atlas : verifier que votre IP est dans la whitelist

### Expo : `Unable to resolve module`

```bash
cd mobile
npx expo start --clear
# ou
rm -rf node_modules && npm install
```

### Simulateur iOS ne se lance pas

- Verifier que Xcode est bien installe et a jour
- Ouvrir Xcode > Settings > Platforms > verifier qu'un runtime iOS est installe
- Essayer de lancer le simulateur manuellement : `open -a Simulator`

### Port deja utilise

```bash
# Trouver le processus sur le port 5000
lsof -ti :5000

# Tuer le processus
kill -9 $(lsof -ti :5000)
```

### Erreur `watchman` ou lenteur du file watcher

```bash
brew install watchman
```

Watchman ameliore les performances du file watching pour Expo et Metro Bundler.

### Permission denied sur `/opt/homebrew`

```bash
sudo chown -R $(whoami) /opt/homebrew
```

### CORS errors dans le navigateur

- Verifier que `CLIENT_URL` dans le `.env` backend correspond a `http://localhost:5173`
- Verifier que `CORS_ORIGINS` contient toutes les origines frontend
- Pas de slash final dans les URLs

---

> **Voir aussi** : [README principal](../README.md) pour la vue d'ensemble du projet.
