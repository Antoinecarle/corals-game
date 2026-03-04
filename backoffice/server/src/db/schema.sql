-- CORALS Backoffice Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

------------------------------------------------------------
-- Backoffice Admins (separate from game_players)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bo_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'editor' CHECK (role IN ('owner','admin','editor','viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

------------------------------------------------------------
-- Factions
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS factions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    faction_type VARCHAR(20) DEFAULT 'main' CHECK (faction_type IN ('main','secondary')),
    description TEXT,
    lore TEXT,
    color VARCHAR(7),
    icon_url TEXT,
    traits JSONB DEFAULT '[]',
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------------------------
-- Zones / Maps
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    ring VARCHAR(20) NOT NULL CHECK (ring IN ('coeur','eaux_medianes','terres_noyees','brume')),
    biome VARCHAR(64),
    description TEXT,
    corruption_level FLOAT DEFAULT 0 CHECK (corruption_level >= 0 AND corruption_level <= 100),
    zone_x INT NOT NULL,
    zone_y INT NOT NULL,
    tile_data JSONB DEFAULT '{}',
    ambient JSONB DEFAULT '{}',
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(zone_x, zone_y)
);

------------------------------------------------------------
-- NPCs
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS npcs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    role VARCHAR(64) NOT NULL,
    faction_id UUID REFERENCES factions(id) ON DELETE SET NULL,
    personality JSONB NOT NULL DEFAULT '{}',
    appearance JSONB DEFAULT '{}',
    trade_inventory JSONB DEFAULT '[]',
    quest_templates JSONB DEFAULT '[]',
    dialogue_style JSONB DEFAULT '{}',
    stats JSONB DEFAULT '{}',
    sprite_asset_id UUID,
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------------------------
-- Items
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    item_type VARCHAR(32) NOT NULL CHECK (item_type IN ('weapon','armor','fragment','consumable','material','key_item','ship_module','currency')),
    rarity VARCHAR(20) DEFAULT 'common' CHECK (rarity IN ('common','uncommon','rare','epic','legendary','eclat','bourgeon','branche','coeur','coral_ancien')),
    slot VARCHAR(32),
    description TEXT,
    flavor_text TEXT,
    stats JSONB DEFAULT '{}',
    effects JSONB DEFAULT '[]',
    requirements JSONB DEFAULT '{}',
    coral_type VARCHAR(20) CHECK (coral_type IS NULL OR coral_type IN ('abime','maree','givre','braise','brume','chair','echo')),
    icon_asset_id UUID,
    model_asset_id UUID,
    stackable BOOLEAN DEFAULT false,
    max_stack INT DEFAULT 1,
    sell_price INT DEFAULT 0,
    buy_price INT DEFAULT 0,
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------------------------
-- Abyssaux (Monsters)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS abyssaux (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    size_class VARCHAR(20) NOT NULL CHECK (size_class IN ('essaim','sentinelle','colosse','titan','primordial')),
    coral_type VARCHAR(20) NOT NULL CHECK (coral_type IN ('encre','flux','cristal','braise','voile','chair','echo')),
    description TEXT,
    behavior JSONB DEFAULT '{}',
    stats JSONB DEFAULT '{}',
    loot_table JSONB DEFAULT '[]',
    abilities JSONB DEFAULT '[]',
    spawn_conditions JSONB DEFAULT '{}',
    xp_reward INT DEFAULT 0,
    gold_reward INT DEFAULT 0,
    sprite_asset_id UUID,
    model_asset_id UUID,
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------------------------
-- Quest Templates
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quest_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    title VARCHAR(256) NOT NULL,
    quest_type VARCHAR(32) NOT NULL CHECK (quest_type IN ('fetch','kill','escort','explore','social','trade','chain','world')),
    description TEXT,
    narrative_hook TEXT,
    objectives JSONB NOT NULL DEFAULT '[]',
    rewards JSONB DEFAULT '{}',
    requirements JSONB DEFAULT '{}',
    difficulty VARCHAR(10) DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard','legendary')),
    time_limit_minutes INT,
    faction_id UUID REFERENCES factions(id) ON DELETE SET NULL,
    npc_giver_id UUID REFERENCES npcs(id) ON DELETE SET NULL,
    min_level INT DEFAULT 1,
    max_level INT DEFAULT 80,
    repeatable BOOLEAN DEFAULT false,
    chain_next_id UUID REFERENCES quest_templates(id) ON DELETE SET NULL,
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------------------------
-- Ship Classes
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ship_classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    ship_type VARCHAR(32) NOT NULL CHECK (ship_type IN ('sloop','brigantin','galion','cuirasse','sous_marin','dirigeable')),
    description TEXT,
    base_stats JSONB DEFAULT '{}',
    module_slots JSONB DEFAULT '[]',
    crew_capacity INT DEFAULT 1,
    cargo_capacity INT DEFAULT 10,
    cost INT DEFAULT 0,
    required_level INT DEFAULT 1,
    model_asset_id UUID,
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------------------------
-- Ship Modules
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ship_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    slot_type VARCHAR(32) NOT NULL CHECK (slot_type IN ('coque','moteur','armement','module','blindage','pavillon')),
    rarity VARCHAR(20) DEFAULT 'common' CHECK (rarity IN ('common','uncommon','rare','epic','legendary')),
    description TEXT,
    stats_modifier JSONB DEFAULT '{}',
    effects JSONB DEFAULT '[]',
    cost INT DEFAULT 0,
    coral_enhanced BOOLEAN DEFAULT false,
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------------------------
-- World Event Templates
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS world_event_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    event_type VARCHAR(32) NOT NULL CHECK (event_type IN ('maree_noire','breche_brume','eveil','jugement','festival','tempete','raid','commerce')),
    description TEXT,
    narrative TEXT,
    duration_minutes INT DEFAULT 60,
    affected_zones JSONB DEFAULT '[]',
    effects JSONB DEFAULT '{}',
    spawn_waves JSONB DEFAULT '[]',
    rewards JSONB DEFAULT '{}',
    min_players INT DEFAULT 1,
    cooldown_hours INT DEFAULT 24,
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------------------------
-- Assets (generated files tracking)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(256) NOT NULL,
    asset_type VARCHAR(32) NOT NULL CHECK (asset_type IN ('model_3d','sprite','spritesheet','icon','texture','audio','map','concept_art')),
    mime_type VARCHAR(64),
    file_size INT,
    file_path TEXT NOT NULL,
    thumbnail_path TEXT,
    metadata JSONB DEFAULT '{}',
    tags JSONB DEFAULT '[]',
    generation_prompt TEXT,
    generation_service VARCHAR(32),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------------------------
-- Generation Jobs (AI/3D generation tracking)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS generation_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type VARCHAR(32) NOT NULL CHECK (job_type IN ('npc_personality','item_stats','item_description','quest','abyssal_design','world_event','text_to_3d','image_to_3d','sprite_gen','dialogue_test','variants','visual_prompt','image_gen')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
    service VARCHAR(32) NOT NULL,
    input_data JSONB NOT NULL,
    output_data JSONB,
    error_message TEXT,
    token_usage JSONB DEFAULT '{}',
    entity_type VARCHAR(32),
    entity_id UUID,
    created_by UUID REFERENCES bo_admins(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    external_task_id TEXT
);

------------------------------------------------------------
-- NPC Zone Placements (many-to-many)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS npc_zone_placements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    npc_id UUID NOT NULL REFERENCES npcs(id) ON DELETE CASCADE,
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    tile_x REAL NOT NULL,
    tile_y REAL NOT NULL,
    direction INT DEFAULT 0,
    schedule JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(npc_id, zone_id)
);

------------------------------------------------------------
-- Abyssal Zone Spawns
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS abyssal_zone_spawns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    abyssal_id UUID NOT NULL REFERENCES abyssaux(id) ON DELETE CASCADE,
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    spawn_x REAL,
    spawn_y REAL,
    spawn_radius REAL DEFAULT 10,
    max_count INT DEFAULT 3,
    respawn_seconds INT DEFAULT 300,
    level_min INT DEFAULT 1,
    level_max INT DEFAULT 80,
    spawn_conditions JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------------------------
-- Backoffice Changelog (audit trail)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bo_changelog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES bo_admins(id) ON DELETE SET NULL,
    action VARCHAR(32) NOT NULL,
    entity_type VARCHAR(32) NOT NULL,
    entity_id UUID,
    entity_name VARCHAR(256),
    changes JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------------------------
-- Indexes
------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_npcs_faction ON npcs(faction_id);
CREATE INDEX IF NOT EXISTS idx_npcs_published ON npcs(published);
CREATE INDEX IF NOT EXISTS idx_items_type ON items(item_type);
CREATE INDEX IF NOT EXISTS idx_items_rarity ON items(rarity);
CREATE INDEX IF NOT EXISTS idx_items_published ON items(published);
CREATE INDEX IF NOT EXISTS idx_abyssaux_size ON abyssaux(size_class);
CREATE INDEX IF NOT EXISTS idx_abyssaux_coral ON abyssaux(coral_type);
CREATE INDEX IF NOT EXISTS idx_abyssaux_published ON abyssaux(published);
CREATE INDEX IF NOT EXISTS idx_quests_type ON quest_templates(quest_type);
CREATE INDEX IF NOT EXISTS idx_quests_published ON quest_templates(published);
CREATE INDEX IF NOT EXISTS idx_zones_ring ON zones(ring);
CREATE INDEX IF NOT EXISTS idx_zones_published ON zones(published);
CREATE INDEX IF NOT EXISTS idx_npc_placements_zone ON npc_zone_placements(zone_id);
CREATE INDEX IF NOT EXISTS idx_abyssal_spawns_zone ON abyssal_zone_spawns(zone_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_changelog_entity ON bo_changelog(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_changelog_created ON bo_changelog(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(asset_type);
