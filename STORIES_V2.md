# Stories V2 - Documentation Technique

## Vue d'ensemble

Stories V2 ajoute une expérience Stories premium sur l'application mobile La Première Pierre avec :
- **Durée personnalisée** (5s/7s/10s/15s) choisie par le créateur
- **Localisation optionnelle** avec approche privacy-first
- **Filtres visuels** (6 presets)
- **Viewer fluide** respectant la durée choisie
- **Modération complète** avec audit logging

## Branches Git

| Branche | Contenu |
|---------|---------|
| `backend` | Modèle Story V2, Controller, Endpoints modération |
| `DevMobile` | Composants V2, Service stories, StoryCreator/Viewer modifiés |
| `Moderation` | Service stories, Pages Stories/StoryDetail |

---

## Backend

### Modèle Story (`src/models/Story.ts`)

#### Nouveaux champs

```typescript
// V2 - Durée d'affichage (en secondes)
durationSec: {
  type: Number,
  required: true,
  min: 3,
  max: 20,
  default: 7,
}

// V2 - Localisation optionnelle
location: {
  label: String,      // Ex: "Paris, France"
  lat: Number,        // -90 à 90
  lng: Number,        // -180 à 180
}

// V2 - Filtre visuel
filterPreset: {
  type: String,
  enum: ['normal', 'warm', 'cool', 'bw', 'contrast', 'vignette'],
  default: 'normal',
}

// V2 - Modération
isHidden: Boolean,    // Story masquée
hiddenReason: String, // Raison du masquage
hiddenBy: ObjectId,   // Modérateur
hiddenAt: Date,       // Date du masquage
```

#### Méthode statique

```typescript
// Condition pour stories actives (non expirées + non masquées)
storySchema.statics.getActiveCondition = function () {
  return {
    dateExpiration: { $gt: new Date() },
    isHidden: { $ne: true },
  };
};
```

### Controller (`src/controllers/storyController.ts`)

#### Validation Zod mise à jour

```typescript
const schemaCreerStory = z.object({
  media: z.string().min(1),
  type: z.enum(['photo', 'video']),
  durationSec: z.number().min(3).max(20).default(7),
  location: z.object({
    label: z.string().max(100),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  }).optional(),
  filterPreset: z.enum(['normal', 'warm', 'cool', 'bw', 'contrast', 'vignette']).default('normal'),
});
```

#### Filtrage isHidden

Les endpoints `getStoriesActives` et `getStoriesUtilisateur` filtrent automatiquement `isHidden: { $ne: true }`.

### Endpoints de modération (`src/controllers/moderationController.ts`)

| Endpoint | Méthode | Permission | Description |
|----------|---------|------------|-------------|
| `/api/moderation/stories` | GET | content:hide | Liste paginée des stories |
| `/api/moderation/stories/:id` | GET | content:hide | Détail story + audit history |
| `/api/moderation/stories/:id/hide` | POST | content:hide | Masquer une story |
| `/api/moderation/stories/:id/unhide` | POST | content:hide | Réafficher une story |
| `/api/moderation/stories/:id` | DELETE | content:delete | Supprimer définitivement |

#### Paramètres de filtrage (GET /stories)

- `page`, `limit` : pagination
- `userId` : filtrer par auteur
- `status` : 'all' | 'active' | 'hidden' | 'expired'
- `dateFrom`, `dateTo` : période

#### Idempotency

Tous les endpoints de modération utilisent le pattern `eventId` :
- Header `X-Event-Id` optionnel pour retry-safe
- Vérifie dans AuditLog si déjà traité
- Retourne 200 avec `idempotent: true` si doublon

---

## Mobile

### Dépendances ajoutées

```bash
npx expo install expo-gl expo-location expo-image-manipulator react-native-view-shot
```

### Nouveaux composants

#### `DurationSelector.tsx`

Pills horizontaux pour sélectionner la durée (5s/7s/10s/15s).

```typescript
interface DurationSelectorProps {
  value: StoryDuration;  // 5 | 7 | 10 | 15
  onChange: (duration: StoryDuration) => void;
}
```

#### `FilterSelector.tsx`

Carousel horizontal de filtres avec previews CSS overlay.

```typescript
interface FilterSelectorProps {
  imageUri: string;
  value: FilterPreset;
  onChange: (filter: FilterPreset) => void;
}
```

Presets disponibles :
- `normal` : Pas de modification
- `warm` : Tonalité chaude (overlay orange)
- `cool` : Tonalité froide (overlay bleu)
- `bw` : Noir et blanc (désaturation)
- `contrast` : Contraste augmenté
- `vignette` : Bords assombris

#### `LocationPicker.tsx`

Bouton pour ajouter la localisation (privacy-first).

```typescript
interface LocationPickerProps {
  value: StoryLocation | null;
  onChange: (location: StoryLocation | null) => void;
}

interface StoryLocation {
  label: string;  // "Paris, France"
  lat?: number;
  lng?: number;
}
```

Comportement :
- Permission demandée uniquement au clic
- Reverse geocoding pour obtenir le label
- Affiche badge avec label si sélectionné

### `imageFilters.ts`

Utilitaire pour les filtres visuels.

```typescript
type FilterPreset = 'normal' | 'warm' | 'cool' | 'bw' | 'contrast' | 'vignette';

// Labels français
const FILTER_LABELS: Record<FilterPreset, string>;

// Styles CSS overlay pour preview
const FILTER_OVERLAY_STYLES: Record<FilterPreset, FilterOverlayStyle>;

// Appliquer un filtre (via expo-image-manipulator)
async function applyFilter(imageUri: string, filter: FilterPreset): Promise<string>;
```

### Modifications existantes

#### `StoryCreator.tsx`

- Ajout des états `duration`, `filter`, `location`
- Preview avec overlay du filtre sélectionné
- Panel d'options V2 (scrollable)
- Passage des options à `creerStory()`

#### `StoryViewer.tsx`

- Utilise `story.durationSec` au lieu de durée fixe
- Affiche badge localisation si présente
- Calcul de progression adapté à la durée

#### `services/stories.ts`

Types V2 ajoutés :
```typescript
interface Story {
  // ... existants
  durationSec?: number;
  location?: StoryLocation;
  filterPreset?: FilterPreset;
}

interface CreateStoryOptions {
  durationSec?: number;
  location?: StoryLocation;
  filterPreset?: FilterPreset;
}

// Signature mise à jour
creerStory(media: string, type: TypeStory, options?: CreateStoryOptions)
```

---

## Panel de modération

### Service (`moderation/src/services/stories.ts`)

```typescript
const storiesService = {
  getStories(params): Promise<PaginatedResponse<ModerationStory>>,
  getStory(id): Promise<{ story, auditHistory }>,
  hideStory(id, reason): Promise<{ eventId }>,
  unhideStory(id, reason?): Promise<{ eventId }>,
  deleteStory(id, reason): Promise<{ eventId }>,
}
```

### Pages

#### `Stories.tsx`

Liste paginée avec :
- Preview thumbnail
- Auteur (lien vers profil)
- Type (photo/vidéo)
- Durée, localisation, vues
- Statut (Active/Masquée/Expirée)
- Actions rapides (voir, masquer, supprimer)
- Filtres (statut, userId, dates)
- Modales de confirmation

#### `StoryDetail.tsx`

- Preview média (image ou vidéo)
- Métadonnées complètes
- Info de masquage si applicable
- Historique d'audit
- Actions (masquer/réafficher, supprimer)

### Navigation

Route : `/stories` et `/stories/:id`
Permission requise : `content:hide`
Lien sidebar : "Stories" avec icône Camera

---

## API Responses

### GET /api/moderation/stories

```json
{
  "succes": true,
  "data": {
    "stories": [
      {
        "_id": "...",
        "utilisateur": { "_id": "...", "prenom": "...", "nom": "...", "avatar": "..." },
        "type": "photo",
        "mediaUrl": "https://...",
        "durationSec": 7,
        "location": { "label": "Paris, France" },
        "filterPreset": "warm",
        "dateCreation": "2024-...",
        "dateExpiration": "2024-...",
        "isHidden": false,
        "viewersCount": 42,
        "isExpired": false,
        "isActive": true
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 100, "pages": 5 }
  }
}
```

### POST /api/moderation/stories/:id/hide

Request:
```json
{ "reason": "Contenu inapproprié" }
```

Response:
```json
{
  "succes": true,
  "message": "Story masquée.",
  "data": {
    "eventId": "...",
    "storyId": "...",
    "hiddenAt": "2024-..."
  }
}
```

---

## Limites MVP

| Feature | Statut | Raison |
|---------|--------|--------|
| Filtres photos | Overlay RN + metadata | Image originale exportée, overlay visuel dans viewer |
| Filtres vidéos | Non supporté | Complexité FFmpeg |
| Localisation précise | Label + lat/lng optionnels | Privacy-first |
| Durées custom | 4 valeurs fixes (5/7/10/15s) | Simplicité UX |
| Préfetch stories | Non implémenté | Chargement à la demande |

### Précision sur les filtres

**MVP** : Les filtres sont stockés en metadata (`filterPreset`) mais l'image uploadée reste **originale**.

- **StoryCreator** : Preview avec overlay React Native (View coloré)
- **StoryViewer** : Affiche overlay correspondant au `filterPreset` de la story
- **Avantage** : Simplicité, pas de dépendance expo-gl, images non altérées
- **Limitation** : Le filtre n'est pas "baked" dans l'image (visible uniquement dans l'app)

---

## Migration

### Stories existantes

Les stories créées avant V2 n'ont pas les champs V2. Le code gère cela avec des fallbacks :

```typescript
// Backend
durationSec: story.durationSec || 7

// Mobile
const currentDurationMs = (currentStory?.durationSec || 7) * 1000;
```

### Index MongoDB

Nouvel index pour les stories masquées :
```javascript
storySchema.index({ isHidden: 1, dateExpiration: 1 });
```
