# Game - AI-First Pirate MMORPG Web

## Project Rules

## Vision
MMO isométrique **AI-First** dans un univers de piraterie (style One Piece / Tales of Pirates).
Chaque NPC est piloté par l'IA (OpenAI `gpt-5-mini-2025-08-07`), génère des quêtes dynamiques,
se souvient de chaque joueur, et le monde évolue selon les attitudes et choix des joueurs.

## Tech Stack

### Game Client (Frontend)
- **PixiJS** — Rendu WebGL 2D (sprites, tiles, animations isométriques)
- **TypeScript** — Typage fort
- **Colyseus.js Client** — Synchronisation état multijoueur
- **Howler.js** — Audio/SFX/musique
- **Vite** — Bundler

### Game Server (Backend)
- **Colyseus** — Game server (rooms, state sync, WebSocket)
- **Node.js** — Runtime
- **PostgreSQL** (Railway) — Données persistantes (comptes, items, quêtes)
- **Redis** — Cache, sessions temps réel, leaderboards
- **Express** — API REST (auth, shop, admin)

### Outils Assets
- **Tiled** — Map editor isométrique
- **TexturePacker** — Spritesheets optimisées

---

## Content Generation Pipeline (IA → Backoffice)

### Architecture
Backoffice web React avec visualisation 3D des assets générés par IA.
Pipeline : Prompt texte → IA 3D → Preview GLB → Render spritesheet → Export jeu

### APIs de génération retenues

#### 1. Meshy AI (3D principal)
- **Usage** : Text-to-3D et Image-to-3D pour personnages, armes, armures, props
- **API** : REST API v2 (`https://api.meshy.ai/openapi/v2/`)
- **Endpoints** : text-to-3d, image-to-3d, text-to-texture, remesh
- **Output** : GLB, FBX, OBJ, USDZ avec PBR textures
- **Pricing** : Pro tier requis pour API (1000 crédits/mois)
- **Low Poly Mode** : Meshy-6 optimisé pour game assets
- **Animations** : 500+ motions game-ready
- **Docs** : https://docs.meshy.ai/en/api

#### 2. PixelLab (Sprites 2D)
- **Usage** : Génération sprites pixel art 8 directions, tilesets isométriques
- **API** : REST API + Python SDK + MCP integration
- **Output** : Spritesheets PNG avec rotations automatiques
- **Spécialité** : Rotations 4/8 directions automatiques pour personnages
- **Docs** : https://www.pixellab.ai/pixellab-api

#### 3. Tripo3D (Alternative 3D)
- **Usage** : Backup/alternative pour text-to-3D
- **API** : REST API (text-to-model, image-to-model, multi-image-to-3D)
- **Output** : GLB, FBX, OBJ, USD, STL
- **Features** : Smart Retopology, Universal Rig & Animation, AI Texture Generator
- **Docs** : https://www.tripo3d.ai/api

### Backoffice Viewer 3D
- **@react-three/fiber** — React renderer pour Three.js
- **@react-three/drei** — Helpers (OrbitControls, useGLTF, Environment, Stage)
- **Three.js** — Moteur 3D pour preview GLB/GLTF
- **Workflow** : Génération IA → Preview 3D interactive → Validation → Render spritesheet

### Pipeline complète
```
1. Backoffice : Saisie prompt (ex: "medieval knight armor gold trim")
2. Meshy API : Text-to-3D → GLB avec PBR textures
3. Backoffice : Preview 3D interactive (rotate, zoom, lighting)
4. Backoffice : Validation / rejet / re-génération
5. Render : Capture 8 directions × N animations → Spritesheets PNG
6. Export : Spritesheets versionnées dans les assets du jeu
7. PixiJS : Chargement et composition des layers en runtime
```

### Système modulaire (layers)
```
Personnage = Body + Head + Weapon + Armor + Accessory
Chaque layer = spritesheet indépendante (8 directions × animations)
Combinaisons runtime par PixiJS (superposition de layers)
```

---

## AI-First NPC System

### Modèle obligatoire
**`gpt-5-mini-2025-08-07`** — TOUJOURS. Aucun autre modèle OpenAI autorisé.

### Architecture NPC IA

Chaque NPC possède :
- **Personnalité** (system prompt unique) : backstory, ton, vocabulaire, motivations
- **Mémoire persistante** par joueur : chaque interaction est stockée et rappelée
- **Générateur de quêtes** : l'IA crée des quêtes cohérentes basées sur le contexte
- **Réactivité comportementale** : le NPC réagit selon la réputation/attitude du joueur

### Conversation Engine

```
Joueur parle à un NPC
        │
        ▼
┌─────────────────────────────┐
│   CONTEXT BUILDER           │
│                             │
│  1. NPC Personality         │  ← system prompt fixe (backstory, rôle, ton)
│     (system message)        │
│                             │
│  2. World State             │  ← état du monde, faction du NPC, météo, heure
│     (system message)        │
│                             │
│  3. Player Profile          │  ← réputation, classe, niveau, faction, traits
│     (system message)        │
│                             │
│  4. Long-term Memory        │  ← résumé des interactions passées avec CE joueur
│     (system message)        │     (auto-summarized, stocké en DB)
│                             │
│  5. Retrieved Memories      │  ← top-k souvenirs pertinents (vector search)
│     (system messages)       │     via pgvector similarity sur embeddings
│                             │
│  6. Recent Messages         │  ← derniers 10-20 messages de cette conversation
│     (user/assistant)        │
│                             │
│  7. Current Player Input    │
│     (user message)          │
│                             │
└──────────┬──────────────────┘
           │
           ▼
    OpenAI API (gpt-5-mini-2025-08-07)
           │
           ▼
    Réponse structurée JSON :
    {
      "dialogue": "Texte que le NPC dit au joueur",
      "emotion": "friendly|hostile|suspicious|excited|sad",
      "quest_offer": null | { quest object },
      "reputation_change": -5 to +5,
      "memory_tags": ["a_partagé_trésor", "mentionné_capitaine"],
      "world_effect": null | { effect object }
    }
```

### Mémoire Persistante (3 niveaux)

#### Niveau 1 : Short-term (conversation active)
- Derniers 10-20 messages dans le contexte OpenAI
- Pas de stockage spécial, juste le tableau messages[]
- Reset quand le joueur quitte la conversation

#### Niveau 2 : Episodic Memory (par NPC × joueur)
- Stockée en PostgreSQL (table `npc_memories`)
- Chaque conversation résumée automatiquement à la fin
- Prompt de résumé : "Summarize key facts, decisions, promises, emotions"
- Embedding généré via OpenAI `text-embedding-3-small`
- Stocké dans pgvector pour recherche sémantique

#### Niveau 3 : Long-term Summary (par NPC × joueur)
- Un résumé global mis à jour après chaque conversation
- Contient : relation, faits clés, promesses, quêtes données
- Injecté dans CHAQUE conversation comme contexte de base

```sql
-- Table mémoire NPC
CREATE TABLE npc_memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    npc_id UUID REFERENCES npcs(id),
    player_id UUID REFERENCES players(id),
    memory_type TEXT CHECK (memory_type IN ('episode', 'summary', 'fact')),
    content TEXT NOT NULL,
    embedding VECTOR(1536),  -- pgvector (text-embedding-3-small = 1536 dims)
    importance FLOAT DEFAULT 0.5,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche sémantique rapide
CREATE INDEX ON npc_memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### Système de Quêtes Dynamiques

```
┌─────────────────────────────────────┐
│        QUEST GENERATOR              │
│                                     │
│  Inputs:                            │
│  ├── NPC personality & role         │
│  ├── Player level, class, skills    │
│  ├── Player reputation avec ce NPC  │
│  ├── Quêtes déjà complétées         │
│  ├── État du monde (événements)     │
│  ├── Mémoire NPC↔Joueur            │
│  └── Zone géographique actuelle     │
│                                     │
│  Output (JSON structuré):           │
│  {                                  │
│    "quest_id": "generated-uuid",    │
│    "title": "Le Trésor du Cap",     │
│    "description": "...",            │
│    "type": "fetch|kill|escort|      │
│            explore|social|trade",   │
│    "objectives": [...],             │
│    "rewards": {                     │
│      "xp": 500,                     │
│      "gold": 200,                   │
│      "items": [...],                │
│      "reputation": +10              │
│    },                               │
│    "difficulty": "easy|medium|hard",│
│    "time_limit": null | minutes,    │
│    "narrative_hook": "..."          │
│  }                                  │
└─────────────────────────────────────┘
```

Les quêtes sont **validées** côté serveur (le serveur vérifie les objectifs, pas l'IA).
L'IA ne fait que GÉNÉRER la quête, le game server gère la complétion.

### Player Behavior Tracking

```sql
-- Profil comportemental du joueur
CREATE TABLE player_profile (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) UNIQUE,
    -- Axes de personnalité (mis à jour par l'IA après chaque interaction)
    alignment_good_evil FLOAT DEFAULT 0,      -- -100 (evil) to +100 (good)
    alignment_lawful_chaotic FLOAT DEFAULT 0,  -- -100 (chaotic) to +100 (lawful)
    aggression FLOAT DEFAULT 0,                -- 0 (pacifique) to 100 (violent)
    diplomacy FLOAT DEFAULT 0,                 -- 0 (brut) to 100 (diplomate)
    curiosity FLOAT DEFAULT 0,                 -- 0 (focusé) to 100 (explorateur)
    -- Compteurs
    quests_completed INT DEFAULT 0,
    npcs_killed INT DEFAULT 0,
    npcs_helped INT DEFAULT 0,
    players_killed INT DEFAULT 0,
    trades_completed INT DEFAULT 0,
    -- Metadata
    known_traits JSONB DEFAULT '[]',  -- ["généreux", "menteur", "pirate"]
    faction_reputation JSONB DEFAULT '{}', -- {"marine": 50, "pirates": -20}
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Réputation et Impact sur le Monde

```
Actions du joueur
      │
      ├── Aide un NPC → réputation ↑, NPC se souvient, futurs prix réduits
      ├── Tue un NPC → réputation ↓, NPCs alliés hostiles, bounty hunters
      ├── Complète quête → nouveaux dialogues débloqués, quêtes enchaînées
      ├── Trahit un NPC → mémoire permanente, NPC refuse de parler, rumeurs
      ├── Commerce honnête → marchands offrent meilleurs prix
      └── PvP excessif → NPCs marines alertés, wanted poster

Propagation :
  NPC A témoin → raconte à NPC B (même faction) → rumeur se propage
  Réputation voyage entre NPCs du même groupe/ville/faction
```

### Schéma DB complet pour le système IA

```sql
-- NPCs définis par les game designers
CREATE TABLE npcs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,                    -- "marchand", "capitaine", "forgeron"
    faction TEXT,                          -- "marine", "pirate_barbe_rouge", "civil"
    location TEXT,                         -- "port_royal_dock", "taverne_du_rhum"
    personality JSONB NOT NULL,            -- system prompt components
    -- personality: { backstory, tone, vocabulary, motivations, secrets, quirks }
    appearance JSONB,                      -- description visuelle pour l'IA
    trade_inventory JSONB,                 -- items à vendre si marchand
    quest_templates JSONB DEFAULT '[]',    -- templates de quêtes possibles
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations actives
CREATE TABLE npc_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    npc_id UUID REFERENCES npcs(id),
    player_id UUID REFERENCES players(id),
    messages JSONB NOT NULL DEFAULT '[]',  -- [{role, content, timestamp}]
    token_count INT DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- Quêtes générées par l'IA
CREATE TABLE generated_quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    npc_id UUID REFERENCES npcs(id),
    player_id UUID REFERENCES players(id),
    quest_data JSONB NOT NULL,             -- structure complète de la quête
    status TEXT DEFAULT 'offered'
        CHECK (status IN ('offered','accepted','in_progress','completed','failed','expired')),
    objectives_progress JSONB DEFAULT '{}',
    generated_by TEXT DEFAULT 'gpt-5-mini-2025-08-07',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Relations NPC ↔ Joueur
CREATE TABLE npc_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    npc_id UUID REFERENCES npcs(id),
    player_id UUID REFERENCES players(id),
    reputation INT DEFAULT 0,              -- -100 to +100
    trust FLOAT DEFAULT 0.5,               -- 0.0 to 1.0
    interactions_count INT DEFAULT 0,
    last_interaction TIMESTAMPTZ,
    relationship_tags JSONB DEFAULT '[]',   -- ["ami", "client_fidèle", "suspect"]
    UNIQUE(npc_id, player_id)
);

-- Événements du monde (affectent tous les NPCs)
CREATE TABLE world_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,              -- "storm", "pirate_raid", "festival"
    description TEXT,
    affected_zones JSONB DEFAULT '[]',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ends_at TIMESTAMPTZ,
    active BOOLEAN DEFAULT true
);
```

### Flux technique complet

```
[Game Client - PixiJS]
  │
  │  Joueur clique sur NPC → ouvre chat
  │
  ▼
[Colyseus Game Server]
  │
  │  1. Charge NPC personality (npcs table)
  │  2. Charge player_profile
  │  3. Charge npc_relationships pour ce couple
  │  4. Charge long-term summary (npc_memories WHERE type='summary')
  │  5. Vector search top-5 souvenirs pertinents (pgvector)
  │  6. Charge recent messages (npc_conversations)
  │  7. Assemble le context array
  │
  ▼
[OpenAI API - gpt-5-mini-2025-08-07]
  │
  │  messages: [
  │    { role: "system", content: NPC_PERSONALITY + WORLD_STATE },
  │    { role: "system", content: PLAYER_PROFILE_SUMMARY },
  │    { role: "system", content: LONG_TERM_MEMORY },
  │    { role: "system", content: RETRIEVED_MEMORIES },
  │    ...recent_messages,
  │    { role: "user", content: player_input }
  │  ]
  │
  │  Response format: JSON strict
  │
  ▼
[Response Handler]
  │
  ├── dialogue → envoyé au client (affiché dans chat)
  ├── emotion → animation NPC côté client
  ├── quest_offer → stocké en DB, UI de quête côté client
  ├── reputation_change → UPDATE npc_relationships
  ├── memory_tags → stockés pour future retrieval
  └── world_effect → broadcast Colyseus si applicable
  │
  ▼
[Post-conversation]
  │
  ├── Résumé automatique si > 10 messages
  ├── Embedding du résumé → pgvector
  ├── Update player_profile (traits, alignement)
  └── Update long-term summary NPC↔Joueur
```

### Optimisations performance

- **Cache NPC personality** : Redis (personality ne change pas souvent)
- **Batch embeddings** : générer embeddings en background, pas en temps réel
- **Streaming** : utiliser OpenAI streaming pour afficher le texte progressivement
- **Rate limiting** : max 1 requête OpenAI / 3 secondes par joueur
- **Fallback** : réponses pré-écrites si API down ou rate-limited
- **Token budget** : max ~2000 tokens par requête (context + response)
- **Résumé agressif** : résumer dès que conversation > 1500 tokens

---

## LORE — CORALS (Bible v2)

> **Fichier source complet** : `/root/archonse/uploads/knowledge/game/8c528cc5-4c60-4e8a-a8cf-d1346183f962.md`
> Consulte ce fichier pour le lore détaillé (543 lignes). Ci-dessous un résumé structuré pour le développement.

### Nom du jeu : **CORALS**

### Pitch
*"Et si on était les méchants depuis le début ?"* — L'humanité survit sur un archipel fortifié entouré de Brume. Les Abyssaux (créatures titanesques) attaquent régulièrement. La vérité : les Abyssaux sont le système immunitaire de créatures conscientes (les Corals) que l'humanité exploite pour son énergie.

### Le Mystère Central
- L'Archipel est une **prison**, pas un refuge
- Les **Remparts** ne protègent pas l'humanité du monde — ils protègent le monde de l'humanité
- Les **Architectes** ont créé les Remparts il y a 800 ans après la destruction de **Pangéa Ferrum**
- La **Brume** = le rêve du Coral Primordial, un cessez-le-feu forcé
- L'**Éther Noir** (énergie) = le sang des Corals (êtres cristallins conscients)

### Les 7 Corals Anciens (objets mythiques centraux)
| # | Nom | Aspect | Localisation |
|---|-----|--------|-------------|
| 1 | Coral d'Abîme | Profondeur/Pression | Fosses au-delà de la Brume |
| 2 | Coral de Marée | Mouvement/Courant | Incrusté sous Ancrage (secret) |
| 3 | Coral de Givre | Stase/Préservation | Iceberg errant |
| 4 | Coral de Braise | Destruction/Renouveau | Volcan sous-marin |
| 5 | Coral de Brume | Illusion/Oubli | Génère la Brume |
| 6 | Coral de Chair | Vie/Mutation | Porté par Silas "Le Roi Mort" |
| 7 | Coral d'Écho | Mémoire/Vérité | Perdu — contient toute l'histoire |

**Contrainte** : Porter un Coral Ancien = relation avec une entité consciente. Faiblesse : les porteurs ne peuvent plus toucher l'océan.

### Fragments de Coral (système de loot)
| Rang | Nom | Rareté |
|------|-----|--------|
| Éclat | Commun | Bonus passifs mineurs |
| Bourgeon | Peu commun | Capacités actives |
| Branche | Rare | Pouvoir unique permanent |
| Cœur | Légendaire | Pouvoir transformatif |
| Coral Ancien | Mythique (7 total) | Conscience propre, quasi-divin |

### Géographie — Archipel en anneaux concentriques

**Anneau 1 — Le Cœur (Zone de départ, safe)**
- **Ancrage** : Cité-bastion centrale, 200k habitants, hub principal
- **Port-Forge** : Industrie, chantiers navals
- **Lumiveil** : Académie, recherche Fragments
- **Marchéflot** : Commerce, marché noir (cité flottante)

**Anneau 2 — Eaux Médianes (Aventure, danger croissant)**
- **Mer de Rouille** : Brumeux, pluies acides, chasseurs d'Abyssaux
- **Mer Dorée** : Tropical, volcans, marchands armés
- **Mer des Abysses** : Nuit permanente, gouffres, cultes

**Anneau 3 — Terres Noyées (Avancé, haute corruption)**
- **Étendue Gelée** : Arctique, ruines de Pangéa Ferrum
- **Récifs de Chair** : Corruption biologique, mutations
- **Lisière de Brume** : Réalité instable, zone tampon

**Au-delà — La Brume (Endgame)** : Ruines de l'Ancien Monde, Abyssaux pacifiques, Coral Primordial

### Abyssaux — Classification

**Par taille** : Essaim (1-5m) → Sentinelle (10-30m) → Colosse (50-200m) → Titan (500m+) → Primordial (mythique)

**Par type** (7 types liés aux 7 Corals) : Encre, Flux, Cristal, Braise, Voile, Chair, Écho

**Comportement clé** : Les Abyssaux ciblent les zones d'industrie (Éther Noir), épargnent ceux sans Fragments, hésitent face aux porteurs de Fragments. Ils veulent que l'humanité arrête le minage.

### 3 Factions Principales (jouables)

**Le Concordat d'Acier** (gouvernement)
- Marine Cuirassée, protection, technologie, structure
- Cache la vérité : le Coral de Marée souffrant alimente les Remparts
- Missions moralement ambiguës

**L'Alliance des Flots Libres** (pirates)
- 4 Capitaines Légendaires, liberté, exploration
- Certains ont traversé la Brume et cherchent la vérité
- Code du Flot, survie par ses propres moyens

**L'Ordre du Rouage** (secte techno-mystique)
- Adorateurs des Corals, fusion humain-coral
- Plus proches de la vérité, solution extrême
- Pouvoirs de Coral les plus puissants, risque de perte d'humanité

**Factions secondaires** : Vigies, Forgerons Errants, Cartographes, Enfants du Fracas, Guilde Céleste, Murmurants

### Système de Pouvoir — Résonance

**3 Voies de classe** :
- **Forge** (Ingénieur) : Tech vapeur pure, pas de dépendance Coral
- **Coral** (Résonant) : Fragments implantés, puissance surhumaine, corruption progressive
- **Fer** (Combattant) : Maîtrise martiale pure

**Jauge de Corruption** : 0% (humain) → 40% (augmenté) → 70% (corrompu) → 100% (transformé — choix irréversible endgame)

### Navires
- Classes : Sloop, Brigantin, Galion à Vapeur, Cuirassé, Sous-marin, Dirigeable
- Personnalisation : Coque, Moteur, Armement, Modules, Blindage Coral, Pavillon
- Le navire peut "vivre" si intégré avec des Fragments

### Personnages Clés

**4 Capitaines Légendaires** :
- **Mara Voss** "Chaudière" : Fragment de Braise, a traversé la Brume
- **Aldric Kalthorn** : Génie sans Fragment, déchiffre les archives des Architectes
- **Zara Ndulu** "Éclair" : Fragment d'Écho, entend les Corals
- **Silas "Le Roi Mort"** : Porte le Coral Ancien de Chair, mi-humain mi-cristal

**Concordat** : Amiral Ferrault (sincère), Directrice Ashworth (sait tout, manipule)
**Ordre du Rouage** : Le Primarch (plus cristal qu'humain)

### Arcs Narratifs (progression)
- **Arc 1 (Niv 1-20)** : "Tout va bien" — Cœur, les Abyssaux sont des monstres. Révélation : les Remparts sont plus vieux que la civilisation
- **Arc 2 (Niv 20-40)** : "Quelque chose ne colle pas" — Eaux Médianes, découverte Pangéa Ferrum. Révélation : l'Éther Noir est le sang des Corals
- **Arc 3 (Niv 40-60)** : "La vérité est pire" — Terres Noyées. Révélation : Remparts alimentés par Coral captif, Abyssaux veulent le libérer
- **Arc 4 (Niv 60-80)** : "Qu'est-ce qu'on fait ?" — Au-delà de la Brume, Coral Primordial. Grand Choix serveur : Maintenir / Briser / Fusionner / Guerre

### Événements Mondiaux
- **Marée Noire** : Coral blessé → vague massive d'Abyssaux
- **Brèche dans la Brume** : Zone temporairement accessible
- **Éveil** : Coral Ancien se manifeste → raid serveur
- **Le Jugement** : Endgame — réveil du Coral Primordial

### Palette Visuelle
- Steampunk maritime (cuivre, laiton, vapeur)
- Bio-cristallin (coraux lumineux noir-violet)
- Corruption progressive (le beau qui devient inquiétant)
- Brume omniprésente en arrière-plan

### Références
- **Attack on Titan** : Mystère des murs, vérité cachée
- **One Piece** : Aventure, liberté, Corals = Fruits du Démon
- **Dofus** : 7 Corals Anciens comme objets centraux
- **Bioshock** : Système reposant sur l'exploitation
- **Shadow of the Colossus** : Beauté terrible de tuer l'immense et l'ancien
