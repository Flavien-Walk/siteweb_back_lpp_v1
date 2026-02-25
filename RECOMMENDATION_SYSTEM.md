# Systeme de Recommandation & Tendances — LPP

## Vue d'ensemble

Deux systemes independants mais coherents :

- **"Pour Toi"** — Feed personnalise (candidate generation + ranking multi-signaux)
- **"Tendances"** — Classement global (engagement + decay + velocity + anti-spam)

---

## 1. Architecture

```
src/
  models/
    EngagementEvent.ts      — Events d'engagement (TTL 90j)
    ProjectSignals.ts       — Signaux pre-agreges par projet
    UserPreferences.ts      — Preferences utilisateur inferees

  services/
    trending/
      config.ts             — Constantes configurables
      scoring.ts            — Formules de scoring
      aggregator.ts         — Pipelines MongoDB d'aggregation
      index.ts              — Entry point, cache, scheduling

    recommendation/
      config.ts             — Poids ranking, penalties, exploration
      candidateGenerators/
        fromInterests.ts    — Matching categories/tags user
        fromFollows.ts      — Similaires aux projets suivis
        fromSimilarUsers.ts — Collaborative filtering leger
        fromRecency.ts      — Projets recents
        fromTrending.ts     — Top trending
        fromExploration.ts  — Random anti-bulle
        index.ts            — Orchestrateur merge/dedup
      ranker.ts             — Scoring multi-signaux
      index.ts              — Entry point, preferences, cache

  controllers/
    eventController.ts      — POST /api/events (batch ingestion)
    trendingController.ts   — GET /api/trending/projects
    recommendationController.ts — GET /api/recommendations/projects

  routes/
    eventRoutes.ts
    trendingRoutes.ts
    recommendationRoutes.ts

  utils/
    engagementHelper.ts     — Fire-and-forget event emitter
```

---

## 2. Modeles de donnees

### EngagementEvent

Event d'interaction utilisateur, stocke pendant 90 jours (TTL RGPD).

| Champ | Type | Description |
|-------|------|-------------|
| actor | ObjectId | Utilisateur qui effectue l'action |
| actorAccountAge | Number | Heures depuis creation du compte (anti-spam) |
| eventType | Enum | impression, click, view_time, like, unlike, follow, unfollow, comment, share, save |
| targetType | Enum | projet, publication |
| targetId | ObjectId | Cible de l'action |
| targetCategorie | String | Denormalise depuis Projet |
| targetTags | [String] | Denormalise depuis Projet |
| value | Number | 1 par defaut, secondes pour view_time |
| source | Enum | mobile, web, api |

**Index :** `{targetType, targetId, dateCreation}`, `{actor, dateCreation}`, `{eventType, dateCreation}`, `{actor, targetId, eventType, dateCreation}`

### ProjectSignals

Signaux pre-calcules par projet (refreshed toutes les 5 min).

| Champ | Type | Description |
|-------|------|-------------|
| projet | ObjectId (unique) | Ref Projet |
| engagement_1h/6h/24h/7d/total | WindowStats | Compteurs par fenetre temporelle |
| trendingScore | Number | Score trending pre-calcule |
| trendingRank | Number | Position dans le classement |
| qualityScore | Number | Completude profil projet (0-1) |
| sameActorRatio | Number | Ratio engagement meme acteur (anti-spam) |
| newAccountRatio | Number | Ratio comptes < 48h (anti-spam) |

**WindowStats :** `{ likes, comments, follows, shares, views, clicks, impressions, uniqueActors }`

### UserPreferences

Preferences utilisateur calculees automatiquement depuis les events.

| Champ | Type | Description |
|-------|------|-------------|
| utilisateur | ObjectId (unique) | Ref Utilisateur |
| categoryAffinities | Map<String, Number> | ex: { tech: 0.8, food: 0.3 } |
| tagAffinities | Map<String, Number> | Affinites par tag |
| recentlyViewed | [{projetId, date}] | Max 200, evite repetition |
| recentlyRecommended | [{projetId, date}] | Max 500, diversite |
| totalInteractions | Number | Detecte cold start (< 5 = cold) |

---

## 3. Systeme "Tendances"

### Formule

```
trendingScore = weightedEngagement * timeDecay * velocityMultiplier * qualityFactor * (1 - spamPenalty)
```

### Composantes

**1. Weighted Engagement** — Somme ponderee des events sur 7 jours :
```
WE = SUM(event.weight * exp(-eventAgeHours / halfLifeHours) * actorWeight)
```

Poids par type d'event :
| Type | Poids |
|------|-------|
| share | 5 |
| follow | 4 |
| comment | 3 |
| like | 1 |
| click | 0.3 |
| view | 0.1 |
| impression | 0.02 |
| unlike | -0.5 |
| unfollow | -2 |

**2. Time Decay** — Decay exponentiel depuis le dernier engagement :
```
decay = exp(-hoursSinceLastEngagement / 36)
```
Demi-vie : 36h.

**3. Velocity Multiplier** — Acceleration recente :
```
velocity = engagement_6h / max(engagement_24h / 4, 1)
velocityMultiplier = clamp(1 + (velocity - 1) * 1.5, 1.0, 2.5)
```
Un projet dont l'engagement 6h est superieur a la moyenne horaire des 24h recoit un boost.

**4. Quality Factor** — Completude du profil projet (0.3 a 1.0) :
```
quality = max(0.3, sum(field_present * field_weight))
```

| Champ | Poids |
|-------|-------|
| image | 0.15 |
| description | 0.15 |
| pitch | 0.15 |
| maturityBonus | 0.15 |
| tags | 0.10 |
| team | 0.10 |
| links | 0.10 |
| location | 0.10 |

**5. Spam Penalty** (0 a 0.9) :
```
if uniqueActors < 3 → +0.5
if sameActorRatio > 0.5 → +0.3
if newAccountRatio > 0.5 → +0.2
```
Clipped a 0.9 max.

### Refresh

- Intervalle : toutes les 5 minutes via `setInterval`
- Cache endpoint : 1 minute TTL
- Pipeline MongoDB aggregation → upsert dans ProjectSignals → update ranks

### Endpoints

**GET /api/trending/projects** (auth optionnelle)
```json
{
  "succes": true,
  "data": {
    "projets": [...],
    "pagination": { "page": 1, "limit": 20, "total": 150, "pages": 8 },
    "meta": { "lastRefresh": "2025-...", "nextRefresh": "2025-..." }
  }
}
```
Query params : `page`, `limit` (max 50), `categorie`

**GET /api/trending/projects/:id/debug** (admin only)
```json
{
  "succes": true,
  "data": {
    "projet": { "_id": "...", "nom": "..." },
    "signals": { ... },
    "scoring": {
      "weightedEngagement": 42.5,
      "timeDecay": 0.83,
      "velocityMultiplier": 1.2,
      "qualityFactor": 0.75,
      "spamPenalty": 0.0,
      "finalScore": 31.7,
      "rank": 3,
      "explanation": "Score eleve grace a ..."
    }
  }
}
```

---

## 4. Systeme "Pour Toi"

### Pipeline

```
1. Detect cold start (< 5 interactions)
   ├─ Cold start → trending + recency + exploration
   └─ Personalized → all 6 candidate generators
2. Candidate Generation (200-380 candidats)
3. Merge & Dedup
4. Multi-signal Ranking
5. Exploration quota enforcement (25%)
6. Interleaving
7. Pagination & cache
```

### Candidate Generation

| Source | Logique | Max |
|--------|---------|-----|
| fromInterests | Projets matchant categories/tags user (affinites > 0.3) | 100 |
| fromFollows | Projets dans les memes categories/tags que les projets suivis | 80 |
| fromSimilarUsers | Users ayant suivi les memes projets → leurs autres follows | 60 |
| fromRecency | Publies/mis a jour dans les 7 derniers jours | 50 |
| fromTrending | Top trending depuis ProjectSignals | 50 |
| fromExploration | Random HORS categories affinites (anti-bulle) | 40 |

Chaque generateur retourne `{ projetId, source, sourceScore }[]`.
Les candidats sont merges et dedupliques — un meme projet peut venir de plusieurs sources.

### Ranking

```
score = categoryAffinity * 0.20
      + freshness * 0.15
      + engagement * 0.20
      + social * 0.15
      + quality * 0.10
      + diversity * 0.10
      + exploration * 0.10
      - penalties
```

| Signal | Description | Range |
|--------|-------------|-------|
| categoryAffinity | Match avec les affinites categories/tags de l'user | 0-1 |
| freshness | Decay exponentiel depuis derniere activite (halfLife 7j) | 0-1 |
| engagement | trendingScore normalise par le max | 0-1 |
| social | Nombre d'amis qui suivent ce projet (0.2 par ami, cap 1.0) | 0-1 |
| quality | qualityScore depuis ProjectSignals | 0-1 |
| diversity | Bonus si categorie sous-representee dans le feed courant | 0-1 |
| exploration | Bonus si candidat vient de fromExploration | 0 ou 1 |

**Penalties :**
- Projet deja vu recemment : -0.3

### Exploration & Diversite

- **25% du feed final** vient obligatoirement de `fromExploration` (anti-bulle)
- Les items d'exploration sont **intercales** dans le feed (pas en bloc a la fin)
- Le **diversity bonus** penalise les categories deja sur-representees dans la page

### Cold Start

Pour un utilisateur avec < 5 interactions :
- 40% trending global
- 30% projets recents
- 30% exploration (diversite maximale)

Transition progressive : apres 5+ interactions, les sources personnalisees prennent le dessus.

### Labels UX

Chaque recommandation porte un label lisible :

| Source | Label |
|--------|-------|
| interests | "Parce que vous aimez {categorie}" |
| follows | "Similaire a vos projets suivis" |
| similar_users | "Des profils comme vous aiment" |
| trending | "Populaire cette semaine" |
| recency | "Nouveau sur LPP" |
| exploration | "A decouvrir" |

### Endpoints

**GET /api/recommendations/projects** (auth requise)
```json
{
  "succes": true,
  "data": {
    "projets": [
      {
        "_id": "...",
        "nom": "...",
        "pitch": "...",
        "categorie": "tech",
        "recommendationScore": 0.7823,
        "recommendationSource": "interests",
        "recommendationLabel": "Parce que vous aimez Tech",
        "estSuivi": false,
        "followersCount": 42
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 50 },
    "meta": {
      "strategy": "personalized",
      "explorationRate": 0.25,
      "candidateCount": 243
    }
  }
}
```

**GET /api/recommendations/debug** (admin only, `?userId=xxx`)
```json
{
  "succes": true,
  "data": {
    "user": { "_id": "...", "totalInteractions": 47, "strategy": "personalized" },
    "preferences": {
      "categoryAffinities": { "tech": 0.85, "food": 0.3 },
      "tagAffinities": { "ia": 0.9, "mobile": 0.7 },
      "recentlyViewedCount": 12,
      "recentlyRecommendedCount": 45
    },
    "candidates": { "total": 243, "bySources": { "interests": 87, "follows": 62, "trending": 45, "exploration": 35, "recency": 14 } },
    "ranked": [
      {
        "projetId": "...",
        "score": 0.7823,
        "source": "interests",
        "sourceLabel": "Parce que vous aimez Tech",
        "breakdown": {
          "categoryAffinity": 0.85,
          "freshness": 0.72,
          "engagement": 0.45,
          "social": 0.40,
          "quality": 0.80,
          "diversity": 1.00,
          "exploration": 0.00,
          "penalties": 0.00
        }
      }
    ]
  }
}
```

---

## 5. Event Tracking

### Ingestion

**POST /api/events** (auth requise, rate limit 100/min)
```json
{
  "events": [
    { "type": "project_impression", "targetId": "abc123" },
    { "type": "project_click", "targetId": "abc123" },
    { "type": "project_view_time", "targetId": "abc123", "value": 45 }
  ]
}
```

Types acceptes : `project_impression`, `project_click`, `project_view_time`, `project_like`, `project_follow`, `project_comment`, `project_share`

Batch max : 50 events par requete.

### Hooks automatiques

Les controllers existants emettent automatiquement des EngagementEvent :

| Action | Controller | Event |
|--------|-----------|-------|
| Voir un projet | `discovery.detailProjet` | click |
| Suivre/ne plus suivre | `discovery.toggleSuivreProjet` | follow / unfollow |
| Liker une pub (avec projet) | `interactions.toggleLikePublication` | like / unlike |
| Commenter (avec projet) | `commentaires.ajouterCommentaire` | comment |

Ces hooks utilisent `emitEngagementEvent()` (fire-and-forget, ne bloquent jamais le flow principal).

---

## 6. Parametres ajustables

Tous les parametres sont centralises dans les fichiers de config :

### Trending (`services/trending/config.ts`)

| Parametre | Valeur | Description |
|-----------|--------|-------------|
| decay.halfLifeHours | 36 | Demi-vie du decay temporel |
| velocity.shortWindowHours | 6 | Fenetre courte pour velocity |
| velocity.boostFactor | 1.5 | Boost max velocity |
| antiSpam.minUniqueActors | 3 | Min acteurs uniques |
| antiSpam.maxSameActorRatio | 0.5 | Max ratio meme acteur |
| refresh.intervalMs | 300000 | Intervalle refresh (5min) |

### Recommandation (`services/recommendation/config.ts`)

| Parametre | Valeur | Description |
|-----------|--------|-------------|
| ranking.categoryAffinity | 0.20 | Poids affinite categorie |
| ranking.engagement | 0.20 | Poids engagement |
| ranking.social | 0.15 | Poids social (amis) |
| ranking.freshness | 0.15 | Poids fraicheur |
| ranking.quality | 0.10 | Poids qualite |
| ranking.diversity | 0.10 | Poids diversite |
| ranking.exploration | 0.10 | Poids exploration |
| exploration.rate | 0.25 | 25% du feed = anti-bulle |
| coldStart.threshold | 5 | < 5 interactions = cold start |
| penalties.alreadySeen | 0.3 | Penalite projet deja vu |

---

## 7. Pipeline — Diagramme

```
                    ┌──────────────────────────────────────────┐
                    │           Event Sources                   │
                    ├──────────┬──────────┬──────────┬─────────┤
                    │ Mobile   │ Hooks    │ Web      │ API     │
                    │ tracking │ (follow, │ tracking │         │
                    │ (batch)  │ like...) │          │         │
                    └────┬─────┴────┬─────┴────┬─────┴────┬────┘
                         │          │          │          │
                         ▼          ▼          ▼          ▼
                    ┌──────────────────────────────────────────┐
                    │         EngagementEvent (MongoDB)         │
                    │              TTL 90 jours                 │
                    └──────────────────┬───────────────────────┘
                                       │
                    ┌──────────────────┼───────────────────────┐
                    │                  │                        │
                    ▼                  ▼                        ▼
            ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐
            │  Trending    │  │  User Preferences │  │  Recommendation  │
            │  Refresh     │  │  Computation      │  │  Candidate Gen   │
            │  (5min cron) │  │  (on-demand, 1h)  │  │  (on request)    │
            └──────┬───────┘  └────────┬──────────┘  └────────┬─────────┘
                   │                   │                       │
                   ▼                   │                       ▼
            ┌──────────────┐           │              ┌──────────────────┐
            │ ProjectSignals│           │              │ Ranker           │
            │ (materialized)│───────────┼──────────────│ (multi-signal)   │
            └──────┬───────┘           │              └────────┬─────────┘
                   │                   │                       │
                   ▼                   ▼                       ▼
            ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐
            │ GET /trending │  │ UserPreferences  │  │ GET /recommend.  │
            │ /projects     │  │ (materialized)   │  │ /projects        │
            └──────────────┘  └──────────────────┘  └──────────────────┘
```
