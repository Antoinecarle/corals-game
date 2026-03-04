CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS game_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(32) UNIQUE NOT NULL,
  zone_x INT DEFAULT 0,
  zone_y INT DEFAULT 0,
  tile_x REAL DEFAULT 128,
  tile_y REAL DEFAULT 128,
  direction INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS zone_map_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_x INT NOT NULL,
  zone_y INT NOT NULL,
  tile_x INT NOT NULL,
  tile_y INT NOT NULL,
  obstacle_type INT NOT NULL DEFAULT 0,
  placed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(zone_x, zone_y, tile_x, tile_y)
);

CREATE INDEX IF NOT EXISTS idx_zone_map_edits_zone ON zone_map_edits(zone_x, zone_y);

-- ─── Tide System Tables ───

CREATE TABLE IF NOT EXISTS tide_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES game_players(id),
    palier INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active','completed','died')),
    loot_carried JSONB DEFAULT '[]',
    loot_banked JSONB DEFAULT '[]',
    loot_lost JSONB DEFAULT '[]',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tide_sessions_player ON tide_sessions(player_id);

CREATE TABLE IF NOT EXISTS tide_loot_drops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_x INT NOT NULL,
    zone_y INT NOT NULL,
    tile_x INT NOT NULL,
    tile_y INT NOT NULL,
    loot_data JSONB NOT NULL,
    spawned_at TIMESTAMPTZ DEFAULT NOW(),
    picked_up_by UUID REFERENCES game_players(id),
    picked_up_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tide_loot_drops_zone ON tide_loot_drops(zone_x, zone_y);
