import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
import { logChange } from './changelog.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { ring, published, search } = req.query;
    let sql = 'SELECT * FROM zones WHERE 1=1';
    const params: any[] = [];

    if (ring) { params.push(ring); sql += ` AND ring = $${params.length}`; }
    if (published !== undefined) { params.push(published === 'true'); sql += ` AND published = $${params.length}`; }
    if (search) { params.push(`%${search}%`); sql += ` AND (name ILIKE $${params.length} OR slug ILIKE $${params.length})`; }

    sql += ' ORDER BY ring, name';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT z.*,
       (SELECT json_agg(json_build_object('id', p.id, 'npc_id', p.npc_id, 'npc_name', n.name, 'npc_role', n.role,
        'tile_x', p.tile_x, 'tile_y', p.tile_y, 'direction', p.direction, 'active', p.active))
        FROM npc_zone_placements p JOIN npcs n ON n.id = p.npc_id WHERE p.zone_id = z.id) as npc_placements,
       (SELECT json_agg(json_build_object('id', s.id, 'abyssal_id', s.abyssal_id, 'abyssal_name', a.name,
        'max_count', s.max_count, 'respawn_seconds', s.respawn_seconds, 'level_min', s.level_min, 'level_max', s.level_max))
        FROM abyssal_zone_spawns s JOIN abyssaux a ON a.id = s.abyssal_id WHERE s.zone_id = z.id) as abyssal_spawns
       FROM zones z WHERE z.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Zone not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { slug, name, ring, biome, description, corruption_level, zone_x, zone_y, ambient } = req.body;
    if (!slug || !name || !ring || zone_x === undefined || zone_y === undefined) {
      return res.status(400).json({ error: 'slug, name, ring, zone_x and zone_y required' });
    }

    const result = await query(
      `INSERT INTO zones (slug, name, ring, biome, description, corruption_level, zone_x, zone_y, ambient)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [slug, name, ring, biome, description, corruption_level || 0, zone_x, zone_y, JSON.stringify(ambient || {})]
    );
    await logChange(req.admin!.adminId, 'create', 'zone', result.rows[0].id, name);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Slug or coordinates already exist' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, ring, biome, description, corruption_level, ambient, published } = req.body;
    const result = await query(
      `UPDATE zones SET name = COALESCE($1, name), ring = COALESCE($2, ring), biome = COALESCE($3, biome),
       description = COALESCE($4, description), corruption_level = COALESCE($5, corruption_level),
       ambient = COALESCE($6, ambient), published = COALESCE($7, published), updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [name, ring, biome, description, corruption_level,
       ambient ? JSON.stringify(ambient) : null, published, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Zone not found' });
    await logChange(req.admin!.adminId, 'update', 'zone', req.params.id, result.rows[0].name);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// NPC Placement within zone
router.post('/:id/npcs', async (req: Request, res: Response) => {
  try {
    const { npc_id, tile_x, tile_y, direction, schedule } = req.body;
    if (!npc_id || tile_x === undefined || tile_y === undefined) {
      return res.status(400).json({ error: 'npc_id, tile_x and tile_y required' });
    }

    const result = await query(
      `INSERT INTO npc_zone_placements (npc_id, zone_id, tile_x, tile_y, direction, schedule)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [npc_id, req.params.id, tile_x, tile_y, direction || 0, JSON.stringify(schedule || {})]
    );
    await logChange(req.admin!.adminId, 'place_npc', 'zone', req.params.id);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'NPC already placed in this zone' });
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/npcs/:placementId', async (req: Request, res: Response) => {
  try {
    await query('DELETE FROM npc_zone_placements WHERE id = $1 AND zone_id = $2', [req.params.placementId, req.params.id]);
    await logChange(req.admin!.adminId, 'remove_npc', 'zone', req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Abyssal Spawn config within zone
router.post('/:id/abyssaux', async (req: Request, res: Response) => {
  try {
    const { abyssal_id, spawn_x, spawn_y, spawn_radius, max_count, respawn_seconds, level_min, level_max } = req.body;
    if (!abyssal_id) return res.status(400).json({ error: 'abyssal_id required' });

    const result = await query(
      `INSERT INTO abyssal_zone_spawns (abyssal_id, zone_id, spawn_x, spawn_y, spawn_radius, max_count, respawn_seconds, level_min, level_max)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [abyssal_id, req.params.id, spawn_x, spawn_y, spawn_radius || 10, max_count || 3, respawn_seconds || 300, level_min || 1, level_max || 80]
    );
    await logChange(req.admin!.adminId, 'add_spawn', 'zone', req.params.id);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/abyssaux/:spawnId', async (req: Request, res: Response) => {
  try {
    await query('DELETE FROM abyssal_zone_spawns WHERE id = $1 AND zone_id = $2', [req.params.spawnId, req.params.id]);
    await logChange(req.admin!.adminId, 'remove_spawn', 'zone', req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query('DELETE FROM zones WHERE id = $1 RETURNING name', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Zone not found' });
    await logChange(req.admin!.adminId, 'delete', 'zone', req.params.id, result.rows[0].name);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
