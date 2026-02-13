# Politique de retention des donnees - La Premiere Pierre

## Principe de minimisation (RGPD Art. 5.1.c)

Les donnees personnelles sont conservees uniquement pour la duree necessaire
aux finalites pour lesquelles elles ont ete collectees.

## Durees de retention

| Donnee | Duree | Mecanisme | Base legale |
|--------|-------|-----------|-------------|
| Compte utilisateur | Jusqu'a suppression par l'utilisateur | Manuel (DELETE /api/profil) | Contrat |
| Token blackliste | Jusqu'a expiration du JWT (7j + 1j marge) | TTL MongoDB (TokenBlacklist) | Interet legitime |
| Notifications lues | 90 jours | TTL MongoDB (index partiel) | Interet legitime |
| Notifications non-lues | Jusqu'a lecture + 90 jours | TTL apres passage en "lue" | Interet legitime |
| Messages prives | Jusqu'a suppression du compte | Cascade delete (supprimerCompte) | Contrat |
| Publications | Jusqu'a suppression par l'auteur/modo | Manuel ou moderation | Contrat |
| Commentaires | Jusqu'a suppression par l'auteur/modo | Manuel ou moderation | Contrat |
| Signalements | Conservation indefinie (obligations legales) | Manuel staff | Obligation legale |
| Audit logs (moderation) | Conservation indefinie (tracabilite) | Manuel staff | Obligation legale / Interet legitime |
| Stories | 24h d'affichage + conservation stockage | Logique metier (affichage expire) | Contrat |
| Logs techniques (serveur) | Render : 7 jours | Automatique plateforme | Interet legitime |

## Suppression de compte

Quand un utilisateur supprime son compte (`DELETE /api/profil`), les donnees suivantes sont supprimees :

1. **Supprimees definitivement** :
   - Informations de profil (prenom, nom, email, bio, avatar)
   - Publications de l'utilisateur
   - Commentaires de l'utilisateur
   - Notifications recues et envoyees
   - Messages envoyes
   - Conversations privees (1-1)
   - Likes sur publications et commentaires

2. **Mises a jour** :
   - Retrait de la liste d'amis des autres utilisateurs
   - Retrait des groupes de discussion (transfert createur si necessaire)
   - Retrait des lecteurs de messages

3. **Conservees (anonymisees)** :
   - Signalements envoyes par l'utilisateur (conservation legale)
   - Audit logs de moderation (tracabilite)

## Export des donnees (DSAR)

L'utilisateur peut exporter toutes ses donnees personnelles via `GET /api/profil/export`.
L'export inclut : profil, publications, commentaires, notifications, projets, signalements, conversations.

## Sous-traitants

| Service | Donnees | Region | DPA |
|---------|---------|--------|-----|
| MongoDB Atlas | Toutes les donnees applicatives | EU (Ireland) | MongoDB DPA |
| Cloudinary | Avatars, medias publications, stories | EU | Cloudinary DPA |
| Render | Backend, logs serveur | US-Oregon | Render DPA |
| Vercel | Frontend (pas de donnees stockees) | US-East | Vercel DPA |
