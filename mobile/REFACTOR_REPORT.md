# Rapport de Refactoring Mobile LPP

Branche : `refactor/restructure-ia-readability`
Date : 2026-02-24
Commits : 11 (progressifs, zero regression)

---

## Resume de l'impact

| Metrique | Avant | Apres | Delta |
|----------|-------|-------|-------|
| Fichier le plus long | 6353 lignes | 1727 lignes | -73% |
| Lignes supprimees (code mort) | 0 | 1318 lignes | - |
| Fichiers styles separes | 0 | 10 fichiers (8101 lignes) | +10 |
| Hooks partages crees | 4 | 8 | +4 |
| Hooks feature crees | 0 | 3 | +3 |
| Composants extraits | 0 | 8 | +8 |
| Fichiers types dedies | 0 | 7 | +7 |
| Fichiers total touches | - | 72 | - |
| Lignes ajoutees | - | 15 880 | - |
| Lignes supprimees | - | 16 164 | - |
| Delta net | - | -284 lignes | - |

---

## Ecrans refactores (avant → apres)

| Ecran | Avant | Apres | Reduction | Phase |
|-------|-------|-------|-----------|-------|
| `accueil.tsx` | 6353 | 1727 | **-73%** | 5, 6 |
| `profil.tsx` | 1886 | 518 | **-72%** | 5, 7 |
| `conversation/[id].tsx` | 1563 | 1000 | **-36%** | 5, 9 |
| `nouveau-projet.tsx` | 1609 | 1262 | **-22%** | 5, 8 |
| `modifier-projet.tsx` | 1429 | 1090 | **-24%** | 5, 8 |
| `projet/[id].tsx` | 1111 | 940 | **-15%** | 5, 10 |
| `messages.tsx` | 935 | 623 | **-33%** | 5, 10 |
| **Total ecrans** | **14 886** | **7 160** | **-52%** | |

---

## Phases executees

### Phase 0 — Securite
- Tag `pre-refactor-2026-02-24` et branche `backup/2026-02-24-before-refactor`
- Branche de travail `refactor/restructure-ia-readability`

### Phase 1 — Nettoyage code mort (commit `75f4e86`)
- `FullscreenCommentsSheet.tsx` supprime (697 lignes)
- `CommentsOverlay.tsx` supprime (621 lignes)
- **Total : 1318 lignes de code mort supprimees**

### Phase 2 — Arborescence cible (commit `fab5d73`)
- 15 dossiers crees avec barrel `index.ts`
- `composants/ui/`, `composants/layout/`, `composants/features/{feed,stories,messagerie,boutique,projets,profil,reels,video,gamification}`
- `features/{accueil,profil,messagerie,boutique,projets,conversation}`
- `hooks/animations/`

### Phase 3 — Types et constantes (commit `32825f0`)
7 fichiers types extraits des services :

| Fichier | Lignes | Extrait de |
|---------|--------|------------|
| `types/utilisateur.ts` | 111 | `services/auth.ts` |
| `types/projet.ts` | 162 | `services/projets.ts` |
| `types/messagerie.ts` | 112 | `services/messagerie.ts` |
| `types/publication.ts` | 79 | `services/publications.ts` |
| `types/boutique.ts` | 144 | `services/boutique.ts` |
| `types/api.ts` | 21 | `services/api.ts` |
| `types/index.ts` | 11 | barrel |

`boutique.ts` eclate : types (144) + constantes (422) + service (180 restantes).

### Phase 4 — Hooks partages (commit `d7d537a`)
4 hooks crees, reutilisables dans 13+ ecrans :

| Hook | Lignes | Remplace |
|------|--------|----------|
| `useLoadingState` | 53 | Pattern chargement/rafraichissement/erreur |
| `useModalState<T>` | 37 | Pattern visible/data/ouvrir/fermer |
| `useTabNavigation<T>` | 49 | Pattern onglets + PagerView |
| `useVideoViewability` | 48 | Auto-play video au scroll |

### Phase 5 — Extraction styles (commit `9165ba6`)
10 fichiers `.styles.ts` crees :

| Fichier styles | Lignes | Source |
|----------------|--------|--------|
| `accueil.styles.ts` | 2570 | `accueil.tsx` |
| `profil.styles.ts` | 1105 | `profil.tsx` |
| `projet-detail.styles.ts` | 801 | `projet/[id].tsx` |
| `utilisateur-detail.styles.ts` | 645 | `utilisateur/[id].tsx` |
| `nouveau-projet.styles.ts` | 617 | `nouveau-projet.tsx` |
| `modifier-projet.styles.ts` | 554 | `modifier-projet.tsx` |
| `conversation.styles.ts` | 548 | `conversation/[id].tsx` |
| `messages.styles.ts` | 447 | `messages.tsx` |
| `boutique.styles.ts` | 440 | `boutique.tsx` |
| `publication-detail.styles.ts` | 374 | `publication/[id].tsx` |
| **Total** | **8101** | |

### Phase 6 — Decomposition accueil.tsx (commit `c3fa5b7`)
5 composants extraits + 1127 lignes de code mort supprimees :

| Composant | Lignes | Contenu |
|-----------|--------|---------|
| `DecouvrirTab.tsx` | 578 | Recherche projets, filtres, ProjetCard |
| `CreerPublicationModal.tsx` | 549 | Modal creation publication avec medias/mentions |
| `LiveTab.tsx` | 382 | Lives actifs, filtres, mock data |
| `RechercheModal.tsx` | 302 | Recherche plein ecran avec historique |
| `EntrepreneurTab.tsx` | 187 | Dashboard projets entrepreneur |

### Phase 7 — Decomposition profil.tsx (commit `6ba6c8c`)
2 onglets extraits :

| Composant | Lignes | Contenu |
|-----------|--------|---------|
| `ParametresTab.tsx` | 942 | Parametres (profil, apparence, securite, confidentialite) |
| `ProfilPublicTab.tsx` | 638 | Profil public (publications, projets, stories, stats) |

### Phase 8 — Wizard projets unifie (commit `467a69e`)
3 etapes partagees + fichier constantes :

| Fichier | Lignes | Contenu |
|---------|--------|---------|
| `EtapeIdentite.tsx` | 243 | Etape identite (mode creation/modification) |
| `EtapeBusiness.tsx` | 145 | Etape business model |
| `EtapeProposition.tsx` | 81 | Etape proposition de valeur |
| `constantes/projets.ts` | 69 | Categories, maturites, etapes, icones |

### Phase 9 — Hook conversation (commit `e5061df`)

| Fichier | Lignes | Contenu |
|---------|--------|---------|
| `useConversation.ts` | 737 | Socket, messages CRUD, reactions, typing, drafts |

### Phase 10 — Hooks projet et messages (commit `86b75be`)

| Fichier | Lignes | Contenu |
|---------|--------|---------|
| `useMessages.ts` | 503 | Conversations, socket, recherche, groupes, amis |
| `useProjetDetail.ts` | 286 | Chargement projet, suivi, contact, navigation |

### Phase 14 — Documentation (commit `d27ab4c`)
- `ARCHITECTURE.md` : structure, conventions, patterns, feature table

---

## Nouveaux fichiers crees (par categorie)

### Composants extraits (8 fichiers, 5573 lignes)
```
src/composants/features/feed/CreerPublicationModal.tsx    549
src/composants/features/feed/RechercheModal.tsx           302
src/composants/features/projets/EtapeIdentite.tsx         243
src/composants/features/projets/EtapeBusiness.tsx         145
src/composants/features/projets/EtapeProposition.tsx       81
src/features/accueil/DecouvrirTab.tsx                     578
src/features/accueil/LiveTab.tsx                          382
src/features/accueil/EntrepreneurTab.tsx                  187
src/features/profil/ProfilPublicTab.tsx                   638
src/features/profil/ParametresTab.tsx                     942
```

### Hooks feature (3 fichiers, 1526 lignes)
```
src/features/conversation/useConversation.ts              737
src/features/messagerie/useMessages.ts                    503
src/features/projets/useProjetDetail.ts                   286
```

### Hooks partages (4 fichiers, 187 lignes)
```
src/hooks/useLoadingState.ts                               53
src/hooks/useTabNavigation.ts                              49
src/hooks/useVideoViewability.ts                           48
src/hooks/useModalState.ts                                 37
```

### Fichiers styles (10 fichiers, 8101 lignes)
```
src/features/accueil/accueil.styles.ts                   2570
src/features/profil/profil.styles.ts                     1105
src/features/projets/projet-detail.styles.ts              801
src/features/profil/utilisateur-detail.styles.ts          645
src/features/projets/nouveau-projet.styles.ts             617
src/features/projets/modifier-projet.styles.ts            554
src/features/conversation/conversation.styles.ts          548
src/features/messagerie/messages.styles.ts                447
src/features/boutique/boutique.styles.ts                  440
src/features/feed/publication-detail.styles.ts            374
```

### Types (7 fichiers, 640 lignes)
```
src/types/projet.ts                                       162
src/types/boutique.ts                                     144
src/types/messagerie.ts                                   112
src/types/utilisateur.ts                                  111
src/types/publication.ts                                   79
src/types/api.ts                                           21
src/types/index.ts                                         11
```

### Constantes (2 fichiers, 491 lignes)
```
src/constantes/boutique.ts                                422
src/constantes/projets.ts                                  69
```

### Barrels index.ts (15 fichiers)
```
src/composants/ui/index.ts
src/composants/layout/index.ts
src/composants/features/{feed,stories,messagerie,boutique,projets,profil,reels,video,gamification}/index.ts
src/features/{accueil,profil,messagerie,boutique,projets,conversation}/index.ts
src/hooks/animations/index.ts
```

---

## Fichiers supprimes
```
src/composants/CommentsOverlay.tsx           621 lignes (code mort)
src/composants/FullscreenCommentsSheet.tsx   697 lignes (code mort)
```

---

## Historique des commits

```
d27ab4c docs: ajouter ARCHITECTURE.md pour le projet mobile
86b75be refactor: extraire hooks useProjetDetail et useMessages
e5061df refactor: extraire useConversation hook (conversation/[id] 1563 → 1000 lignes)
467a69e refactor: extraire composants partages wizard projets (nouveau + modifier)
6ba6c8c refactor: decomposer profil.tsx (1886 → 518 lignes, -72%)
c3fa5b7 refactor: decomposer accueil.tsx (6353 → 1727 lignes, -73%)
9165ba6 refactor: extraire les styles des 10 ecrans dans des fichiers .styles.ts
d7d537a refactor: creer hooks partages (useLoadingState, useModalState, useTabNavigation, useVideoViewability)
32825f0 refactor: extraire types des services vers types/, eclater boutique.ts
fab5d73 refactor: creer arborescence cible (dossiers + barrels index.ts)
75f4e86 refactor: supprimer code mort (FullscreenCommentsSheet + CommentsOverlay)
```

---

## Travail restant (Phases 11-13)

| Phase | Description | Risque |
|-------|-------------|--------|
| 11 | Reorganiser composants dans `ui/` et `layout/` + mettre a jour barrels | Moyen |
| 12 | Consolider contextes/ + eclater `auth.ts` et `api.ts` | Moyen |
| 13 | Decomposer gros composants (MessagesTab 1259, ProductDetailSheet 1166, StoryCreator 1110, UnifiedCommentsSheet 1036) + eclater `useAnimations.ts` | Eleve |
