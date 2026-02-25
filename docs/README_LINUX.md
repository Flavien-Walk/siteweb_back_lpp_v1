# La Premiere Pierre (LPP) — Guide d'installation Linux

Guide complet pour installer, configurer et lancer tous les composants du projet LPP sur les distributions Linux (Ubuntu/Debian, Fedora, Arch Linux).

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

| Outil | Version | Usage |
|-------|---------|-------|
| Node.js | 20.x LTS (ou 22.x) | Runtime pour tous les composants |
| npm | 9.x+ (inclus avec Node.js) | Gestionnaire de paquets |
| Git | 2.30+ | Gestion du code source |
| MongoDB | 6.0+ (ou MongoDB Atlas) | Base de donnees backend |
| Android Studio | Derniere version (optionnel) | Emulateur Android |
| Expo Go | Derniere version | Test mobile sur appareil physique |

> **Note** : Le simulateur iOS n'est pas disponible sur Linux. Pour tester l'application iOS, un Mac est necessaire. Le test Android (emulateur ou appareil physique) fonctionne parfaitement sur Linux.

### Verifier les installations

```bash
node --version      # v20.x.x ou v22.x.x
npm --version       # 9.x.x ou 10.x.x
git --version       # git version 2.4x.x
mongod --version    # (si MongoDB local)
```

---

## Installation des outils

### Outils systeme de base

**Ubuntu / Debian** :
```bash
sudo apt update
sudo apt install -y curl wget git build-essential
```

**Fedora** :
```bash
sudo dnf groupinstall -y "Development Tools"
sudo dnf install -y curl wget git
```

**Arch Linux** :
```bash
sudo pacman -Syu
sudo pacman -S --needed base-devel curl wget git
```

### Node.js

**Option A — Via nvm (recommande)** :
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Recharger le profil shell
source ~/.bashrc    # ou ~/.zshrc si vous utilisez zsh

nvm install 20
nvm use 20
nvm alias default 20

# Verifier
node --version
npm --version
```

**Option B — Via NodeSource (Ubuntu/Debian)** :
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

**Option C — Via gestionnaire de paquets** :

Fedora :
```bash
sudo dnf install -y nodejs npm
```

Arch Linux :
```bash
sudo pacman -S nodejs npm
```

> **Attention** : Les versions des depots systeme peuvent etre anciennes. nvm est recommande pour garantir la bonne version.

### MongoDB

**Option A — MongoDB Atlas (recommande pour debuter)** :
1. Creer un compte sur https://www.mongodb.com/atlas
2. Creer un cluster gratuit (M0)
3. Creer un utilisateur dans "Database Access"
4. Ajouter `0.0.0.0/0` dans "Network Access" (dev uniquement)
5. Copier l'URI de connexion

**Option B — MongoDB local (Ubuntu/Debian)** :
```bash
# Importer la cle GPG MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Ajouter le depot (Ubuntu 22.04 — adapter pour votre version)
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update
sudo apt install -y mongodb-org

# Demarrer et activer le service
sudo systemctl start mongod
sudo systemctl enable mongod

# Verifier
mongosh --eval "db.version()"
```

**Option B — MongoDB local (Fedora)** :
```bash
# Creer le fichier repo
sudo tee /etc/yum.repos.d/mongodb-org-7.0.repo <<'EOF'
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/9/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://pgp.mongodb.com/server-7.0.asc
EOF

sudo dnf install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

**Option B — MongoDB local (Arch Linux)** :
```bash
# Via AUR (avec yay ou paru)
yay -S mongodb-bin

sudo systemctl start mongodb
sudo systemctl enable mongodb
```

### Android Studio (optionnel, pour emulateur Android)

**Ubuntu/Debian** :
```bash
sudo snap install android-studio --classic
```

**Fedora** :
```bash
sudo flatpak install flathub com.google.AndroidStudio
```

**Arch Linux** :
```bash
yay -S android-studio
```

Apres installation :
1. Lancer Android Studio et installer le SDK recommande
2. Tools > Device Manager > Create Device > Pixel 7 > API 34+
3. Configurer les variables d'environnement :

```bash
echo 'export ANDROID_HOME=$HOME/Android/Sdk' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools' >> ~/.bashrc
source ~/.bashrc
```

### KVM (acceleration materielle pour l'emulateur Android)

```bash
# Ubuntu/Debian
sudo apt install -y qemu-kvm libvirt-daemon-system
sudo adduser $USER kvm

# Fedora
sudo dnf install -y @virtualization
sudo usermod -aG kvm $USER

# Arch Linux
sudo pacman -S qemu-full libvirt
sudo usermod -aG kvm $USER

# Deconnecter/reconnecter la session pour appliquer le groupe
```

Verifier que KVM est actif :
```bash
kvm-ok           # Ubuntu (paquet cpu-checker)
ls /dev/kvm      # Doit exister
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

Editer `.env` :

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
# JWT_SECRET
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

Verifier :
```bash
curl http://localhost:5000/api/auth/status
```

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
hostname -I | awk '{print $1}'
# ou
ip addr show | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | cut -d/ -f1
```

> **Important** : Utiliser l'adresse IP locale (pas `localhost`) pour que l'appareil physique puisse atteindre le backend.

### Demarrage

```bash
npx expo start
```

| Touche | Action |
|--------|--------|
| `a` | Ouvrir sur emulateur Android |
| `w` | Ouvrir dans le navigateur |
| `r` | Recharger l'application |
| `j` | Ouvrir le debugger |

### Test sur appareil physique

1. Installer **Expo Go** depuis le Play Store (Android) ou l'App Store (iPhone)
2. Scanner le QR code affiche dans le terminal
3. L'appareil et le PC doivent etre sur le meme reseau Wi-Fi

### Mode tunnel

```bash
npx expo start --tunnel
```

Necessaire si l'appareil et le PC ne sont pas sur le meme sous-reseau, ou en cas de firewall restrictif.

### Scripts mobile

| Commande | Description |
|----------|-------------|
| `npx expo start` | Demarrage standard |
| `npx expo start --android` | Ouverture sur emulateur Android |
| `npx expo start --tunnel` | Mode tunnel |
| `npx expo start --clear` | Demarrage avec cache vide |

> **Note** : `npx expo start --ios` n'est pas disponible sur Linux. Le test iOS necessite un Mac.

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

Ouvrir 4 onglets de terminal (ou utiliser tmux) :

**Terminal 1 — Backend** :
```bash
cd lpp && git checkout backend && npm run dev
```

**Terminal 2 — Mobile** :
```bash
cd lpp && git checkout DevMobile && cd mobile && npx expo start
```

**Terminal 3 — Web** :
```bash
cd lpp && git checkout master && cd web && npm run dev
```

**Terminal 4 — Moderation** :
```bash
cd lpp && git checkout Moderation && cd moderation && npm run dev
```

### Avec tmux (recommande)

```bash
# Installer tmux
sudo apt install tmux    # Ubuntu/Debian
sudo dnf install tmux    # Fedora
sudo pacman -S tmux      # Arch

# Creer une session avec 4 panneaux
tmux new-session -s lpp \; \
  send-keys 'cd lpp && git checkout backend && npm run dev' C-m \; \
  split-window -h \; \
  send-keys 'cd lpp && git checkout DevMobile && cd mobile && npx expo start' C-m \; \
  split-window -v \; \
  send-keys 'cd lpp && git checkout master && cd web && npm run dev' C-m \; \
  select-pane -t 0 \; \
  split-window -v \; \
  send-keys 'cd lpp && git checkout Moderation && cd moderation && npm run dev' C-m
```

Navigation tmux : `Ctrl+B` puis fleches directionnelles pour changer de panneau.

### Ordre de demarrage

1. MongoDB (si local : `sudo systemctl start mongod`)
2. Backend (les autres composants en dependent)
3. Web / Moderation / Mobile (ordre libre)

---

## Debugging

### Backend

**Logs** : Directement dans le terminal. Erreurs avec stack traces completes.

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

**MongoDB GUI** : Installer MongoDB Compass :
```bash
# Ubuntu/Debian (telecharger le .deb depuis mongodb.com)
sudo dpkg -i mongodb-compass_*_amd64.deb

# Ou via snap
sudo snap install mongodb-compass
```

### Mobile

**React DevTools** : Touche `j` dans le terminal Expo.

**Console logs** : Visibles dans le terminal Expo.

**Chrome DevTools (Android)** :
1. Ouvrir Chrome sur le PC
2. Aller a `chrome://inspect`
3. L'application Expo devrait apparaitre dans la liste des cibles

### Web / Moderation

**DevTools** : F12 dans le navigateur. L'onglet Network montre les requetes API, Console affiche les logs.

**Vite HMR** : Les modifications se repercutent instantanement.

---

## Problemes frequents

### `ENOSPC: System limit for number of file watchers reached`

C'est le probleme Linux le plus courant. La limite par defaut est trop basse :

```bash
# Verifier la limite actuelle
cat /proc/sys/fs/inotify/max_user_watches

# Augmenter temporairement
sudo sysctl fs.inotify.max_user_watches=524288

# Augmenter de facon permanente
echo 'fs.inotify.max_user_watches=524288' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### `EACCES: permission denied` sur npm global

Ne jamais utiliser `sudo npm install`. Configurer npm pour utiliser un repertoire local :

```bash
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

Ou utiliser nvm (qui gere les permissions automatiquement).

### MongoDB : `Failed to start mongod.service`

```bash
# Verifier les logs
sudo journalctl -u mongod --no-pager -n 50

# Probleme de permissions courant
sudo chown -R mongodb:mongodb /var/lib/mongodb
sudo chown -R mongodb:mongodb /var/log/mongodb

# Redemarrer
sudo systemctl restart mongod
```

### `Error: ENOENT: no such file or directory, open '/usr/lib/...'`

Certains modules natifs necessitent des dependances systeme :

```bash
# Ubuntu/Debian
sudo apt install -y python3 make g++

# Fedora
sudo dnf install -y python3 make gcc-c++

# Puis reinstaller les modules
rm -rf node_modules package-lock.json
npm install
```

### Expo : QR code non scannable

- Verifier que le PC et le telephone sont sur le meme reseau Wi-Fi
- Verifier le pare-feu :
```bash
# Ouvrir temporairement le port Expo (Ubuntu/Debian avec ufw)
sudo ufw allow 8081/tcp
sudo ufw allow 19000:19006/tcp

# Fedora avec firewalld
sudo firewall-cmd --add-port=8081/tcp --permanent
sudo firewall-cmd --add-port=19000-19006/tcp --permanent
sudo firewall-cmd --reload
```
- Utiliser le mode tunnel : `npx expo start --tunnel`

### Port deja utilise

```bash
# Trouver le processus sur le port 5000
sudo lsof -ti :5000
# ou
sudo ss -tlnp | grep 5000

# Tuer le processus
kill -9 $(sudo lsof -ti :5000)
```

### Emulateur Android : `KVM is required`

L'acceleration materielle KVM est necessaire :
```bash
# Verifier le support CPU
egrep -c '(vmx|svm)' /proc/cpuinfo    # Doit retourner > 0

# Installer KVM (voir section Installation des outils)
# Verifier les permissions
ls -la /dev/kvm    # Doit etre accessible par votre utilisateur
```

Si KVM n'est pas disponible (VM sans virtualisation imbriquee), l'emulateur Android ne fonctionnera pas. Utiliser un appareil physique avec Expo Go.

### Erreur CORS dans le navigateur

- Verifier que `CLIENT_URL` dans le `.env` backend correspond a `http://localhost:5173`
- Verifier que `CORS_ORIGINS` contient toutes les origines frontend
- Pas de slash final dans les URLs

### SELinux bloque MongoDB ou Node.js (Fedora/RHEL)

```bash
# Verifier si SELinux bloque
sudo ausearch -m avc --ts recent

# Autoriser temporairement (pour debug uniquement)
sudo setenforce 0

# Solution permanente : creer une politique SELinux
sudo sealert -a /var/log/audit/audit.log
```

---

> **Voir aussi** : [README principal](../README.md) pour la vue d'ensemble du projet.
