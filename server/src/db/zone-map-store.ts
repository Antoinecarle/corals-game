import { query } from './index.js';

export interface MapEdit {
  tileX: number;
  tileY: number;
  obstacleType: number;
}

/**
 * Load all map edits for a zone.
 */
export async function loadEdits(zoneX: number, zoneY: number): Promise<MapEdit[]> {
  const result = await query<{ tile_x: number; tile_y: number; obstacle_type: number }>(
    'SELECT tile_x, tile_y, obstacle_type FROM zone_map_edits WHERE zone_x = $1 AND zone_y = $2',
    [zoneX, zoneY],
  );
  return result.rows.map((r) => ({
    tileX: r.tile_x,
    tileY: r.tile_y,
    obstacleType: r.obstacle_type,
  }));
}

/**
 * Save or update a single map edit (upsert).
 */
export async function saveEdit(
  zoneX: number,
  zoneY: number,
  tileX: number,
  tileY: number,
  obstacleType: number,
  placedBy?: string,
): Promise<void> {
  await query(
    `INSERT INTO zone_map_edits (zone_x, zone_y, tile_x, tile_y, obstacle_type, placed_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (zone_x, zone_y, tile_x, tile_y)
     DO UPDATE SET obstacle_type = $5, placed_by = $6, updated_at = NOW()`,
    [zoneX, zoneY, tileX, tileY, obstacleType, placedBy ?? null],
  );
}

/**
 * Delete a map edit (remove obstacle from persistence).
 */
export async function deleteEdit(
  zoneX: number,
  zoneY: number,
  tileX: number,
  tileY: number,
): Promise<void> {
  await query(
    'DELETE FROM zone_map_edits WHERE zone_x = $1 AND zone_y = $2 AND tile_x = $3 AND tile_y = $4',
    [zoneX, zoneY, tileX, tileY],
  );
}
