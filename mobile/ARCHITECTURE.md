# Architecture Mobile LPP

## Vue d'ensemble

Application React Native (Expo 54 + Expo Router 6) avec TypeScript. Routing file-based : les fichiers dans `app/` sont des routes et ne doivent **jamais** etre deplaces — seul leur contenu est extrait vers `src/`.

## Structure des dossiers

```
mobile/
  app/                          # Routes Expo Router (NE PAS DEPLACER)
    (app)/                      # Ecrans authentifies
      accueil.tsx               # Feed principal (orchestrateur PagerView)
      profil.tsx                # Mon profil (onglets profil/parametres)
      messages.tsx              # Liste des conversations
      boutique.tsx              # Marketplace + abonnements
      notifications.tsx         # Centre de notifications
      mes-startups.tsx          # Dashboard startups
      support.tsx               # Support utilisateur
      sanctions.tsx             # Historique sanctions
      conversation/[id].tsx     # Chat (bulles, reactions, swipe reply)
      projet/[id].tsx           # Fiche projet (vision, market, docs)
      publication/[id].tsx      # Detail publication + commentaires
      utilisateur/[id].tsx      # Profil public autre utilisateur
      entrepreneur/
        nouveau-projet.tsx      # Wizard creation projet (6 etapes)
        modifier-projet.tsx     # Wizard modification projet (6 etapes)
        [id].tsx                # Dashboard entrepreneur
    (auth)/                     # Ecrans non-authentifies
  src/
    composants/                 # Composants reutilisables
      features/                 # Composants lies a une feature
        feed/                   # CreerPublicationModal, RechercheModal
        projets/                # EtapeIdentite, EtapeProposition, EtapeBusiness
        profil/                 # (futur: sections profil)
        boutique/               # (futur: ProductGallery, etc.)
      ui/                       # Primitives UI (futur: Avatar, Bouton, etc.)
      layout/                   # Wrappers (futur: KeyboardView, etc.)
      Avatar.tsx                # Composant avatar avec initiales
      PublicationCard.tsx       # Carte publication du feed
      MessagesTab.tsx           # Onglet messages dans accueil
      UnifiedCommentsSheet.tsx  # Sheet commentaires unifie
      StoryCreator.tsx          # Creation de stories
      StoryViewer.tsx           # Visionneuse de stories
      VideoPlayerModal.tsx      # Lecteur video plein ecran
      ...
    features/                   # Logique metier par domaine
      accueil/
        accueil.styles.ts       # Styles du feed
        DecouvrirTab.tsx        # Onglet decouvrir (projets)
        LiveTab.tsx             # Onglet live streaming
        EntrepreneurTab.tsx     # Onglet mes projets
      profil/
        profil.styles.ts        # Styles profil
        ProfilPublicTab.tsx     # Onglet profil public
        ParametresTab.tsx       # Onglet parametres
        utilisateur-detail.styles.ts
      projets/
        projet-detail.styles.ts
        nouveau-projet.styles.ts
        modifier-projet.styles.ts
        useProjetDetail.ts      # Hook logique fiche projet
      conversation/
        conversation.styles.ts
        useConversation.ts      # Hook logique chat
      messagerie/
        messages.styles.ts
        useMessages.ts          # Hook logique liste conversations
      boutique/
        boutique.styles.ts
      feed/
        publication-detail.styles.ts
    hooks/                      # Hooks partages transversaux
      useAnimations.ts          # Animations reanimated/animated
      useAutoRefresh.ts         # Polling + focus refresh
      useDoubleTap.ts           # Detection double tap
      useLoadingState.ts        # Gestion chargement/rafraichissement/erreur
      useModalState.ts          # Gestion visible/data/ouvrir/fermer
      useStaff.ts               # Detection role staff
      useTabNavigation.ts       # Onglets + PagerView
      useVideoViewability.ts    # Auto-play video au scroll
    services/                   # Appels API (plat, un fichier par domaine)
      api.ts                    # Client HTTP de base
      auth.ts                   # Authentification + profil
      publications.ts           # Publications + commentaires
      messagerie.ts             # Conversations + messages
      projets.ts                # Projets + suivi
      boutique.ts               # Boutique + abonnements
      evenements.ts             # Evenements
      notifications.ts          # Notifications
      stories.ts                # Stories
      live.ts                   # Lives Agora
      utilisateurs.ts           # Profils publics + amis
      ads.ts                    # Publicites dans le feed
    types/                      # Types TypeScript partages
      boutique.ts               # Types boutique (14 types)
      index.ts                  # Barrel re-export
    constantes/                 # Constantes partagees
      theme.ts                  # Couleurs, espacements, typographie
      config.ts                 # Configuration app
      incubateurs.ts            # Liste incubateurs FR
      boutique.ts               # Plans, boosts, mock products
      projets.ts                # Categories, maturites, types liens
    contexts/                   # React Contexts
      ThemeContext.tsx           # Dark/light mode
      UserContext.tsx            # Utilisateur connecte
      SocketContext.tsx          # Socket.io temps reel
      GamificationContext.tsx   # XP, niveaux, quetes
    stores/                     # Stores globaux (non-context)
      videoPlaybackStore.ts     # Etat lecture video
      videoRegistry.ts          # Registre instances Video
    utils/                      # Utilitaires
      mediaUtils.ts             # Helpers media (thumbnail, isVideo)
      userDisplay.ts            # Helpers affichage user
```

## Conventions

### Nommage
- **Francais** pour les noms metier : `utilisateur`, `projet`, `publication`, `messagerie`
- **camelCase** pour fichiers/fonctions, **PascalCase** pour composants
- **kebab-case** pour dossiers et fichiers de constantes/styles

### Pattern de styles
Chaque ecran/composant majeur a un fichier `.styles.ts` :
```ts
// features/accueil/accueil.styles.ts
import { StyleSheet } from 'react-native';
import { ThemeCouleurs } from '../../contexts/ThemeContext';

const createStyles = (couleurs: ThemeCouleurs) => StyleSheet.create({
  container: { flex: 1, backgroundColor: couleurs.fond },
  // ...
});

export default createStyles;
```

### Pattern de hooks feature
Chaque ecran complexe a un hook dans `features/` :
```ts
// features/conversation/useConversation.ts
export function useConversation(id: string | undefined) {
  // State, effects, handlers
  return { /* all state + actions */ };
}
```

### Pattern de composants extraits
Les composants d'onglets/sections sont dans `features/` ou `composants/features/` :
```ts
// features/accueil/DecouvrirTab.tsx
export default function DecouvrirTab(props: DecouvrirTabProps) {
  // Gere son propre state + effects
  return <ScrollView>...</ScrollView>;
}
```

### Barrel re-exports
Les dossiers importants ont un `index.ts` qui re-exporte :
```ts
// composants/index.ts
export { default as Avatar } from './Avatar';
export { default as PublicationCard } from './PublicationCard';
```

## Architecture par feature

| Feature | Ecran | Hook | Composants | Styles |
|---------|-------|------|------------|--------|
| Feed | accueil.tsx | - | DecouvrirTab, LiveTab, EntrepreneurTab, CreerPublicationModal, RechercheModal | accueil.styles.ts |
| Profil | profil.tsx | - | ProfilPublicTab, ParametresTab | profil.styles.ts |
| Projets | projet/[id].tsx | useProjetDetail | EtapeIdentite, EtapeProposition, EtapeBusiness | projet-detail.styles.ts |
| Chat | conversation/[id].tsx | useConversation | - | conversation.styles.ts |
| Messages | messages.tsx | useMessages | - | messages.styles.ts |
| Boutique | boutique.tsx | - | - | boutique.styles.ts |

## Comment ajouter un ecran

1. Creer le fichier route dans `app/(app)/mon-ecran.tsx`
2. Creer les styles dans `src/features/mon-domaine/mon-ecran.styles.ts`
3. Si logique complexe : creer `src/features/mon-domaine/useMonEcran.ts`
4. Si sous-composants : creer dans `src/composants/features/mon-domaine/`
5. Si types partages : ajouter dans `src/types/`
6. Si constantes partagees : ajouter dans `src/constantes/`

## Etat de la codebase

### Fichiers refactores (Phases 0-10)
- accueil.tsx : 6353 → 1727 lignes (-73%)
- profil.tsx : 1886 → 518 lignes (-72%)
- conversation/[id].tsx : 1563 → 1000 lignes (-36%)
- messages.tsx : 935 → 623 lignes (-33%)
- projet/[id].tsx : 1111 → 940 lignes (-15%)
- nouveau-projet + modifier-projet : duplication -23%
- Code mort supprime : ~1318 lignes
- Styles extraits : 10 fichiers (~8000 lignes)
- Hooks crees : 8 hooks partages + 3 hooks feature

### Travail restant (Phases 11-13)
- Reorganiser composants dans ui/ et layout/
- Decomposer gros composants (MessagesTab 1259, ProductDetailSheet 1166, StoryCreator 1110)
- Eclater useAnimations.ts en hooks individuels
- Consolider contextes/ et services/
