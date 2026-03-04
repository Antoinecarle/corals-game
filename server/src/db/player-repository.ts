import { query } from './index.js';
import {
  DEFAULT_SPAWN_X,
  DEFAULT_SPAWN_Y,
  DEFAULT_ZONE_X,
  DEFAULT_ZONE_Y,
} from '@pirate-mmo/shared';

export interface PlayerRow {
  id: string;
  name: string;
  zone_x: number;
  zone_y: number;
  tile_x: number;
  tile_y: number;
  direction: number;
  created_at: Date;
  last_seen: Date;
}

export async function findOrCreate(name: string): Promise<PlayerRow> {
  // Try to find existing player
  const existing = await query<PlayerRow>(
    'SELECT * FROM game_players WHERE name = $1',
    [name],
  );

  if (existing.rows.length > 0) {
    // Update last_seen
    await query(
      'UPDATE game_players SET last_seen = NOW() WHERE id = $1',
      [existing.rows[0].id],
    );
    return existing.rows[0];
  }

  // Create new player
  const result = await query<PlayerRow>(
    `INSERT INTO game_players (name, zone_x, zone_y, tile_x, tile_y, direction)
     VALUES ($1, $2, $3, $4, $5, 0)
     RETURNING *`,
    [name, DEFAULT_ZONE_X, DEFAULT_ZONE_Y, DEFAULT_SPAWN_X, DEFAULT_SPAWN_Y],
  );

  return result.rows[0];
}

export async function savePosition(
  id: string,
  zoneX: number,
  zoneY: number,
  tileX: number,
  tileY: number,
  direction: number,
): Promise<void> {
  await query(
    `UPDATE game_players
     SET zone_x = $2, zone_y = $3, tile_x = $4, tile_y = $5,
         direction = $6, last_seen = NOW()
     WHERE id = $1`,
    [id, zoneX, zoneY, tileX, tileY, direction],
  );
}

export async function getPlayer(id: string): Promise<PlayerRow | null> {
  const result = await query<PlayerRow>(
    'SELECT * FROM game_players WHERE id = $1',
    [id],
  );
  return result.rows[0] ?? null;
}
