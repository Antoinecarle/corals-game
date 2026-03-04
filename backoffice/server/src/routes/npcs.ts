import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
import { logChange } from './changelog.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { faction_id, role, published, search } = req.query;
    let sql = `SELECT n.*, f.name as faction_name,
      CASE WHEN sa.file_path IS NOT NULL THEN '/storage/' || sa.file_path END as sprite_url
      FROM npcs n
      LEFT JOIN factions f ON f.id = n.faction_id
      LEFT JOIN assets sa ON sa.id = n.sprite_asset_id
      WHERE 1=1`;
    const params: any[] = [];

    if (faction_id) { params.push(faction_id); sql += ` AND n.faction_id = $${params.length}`; }
    if (role) { params.push(role); sql += ` AND n.role = $${params.length}`; }
    if (published !== undefined) { params.push(published === 'true'); sql += ` AND n.published = $${params.length}`; }
    if (search) { params.push(`%${search}%`); sql += ` AND (n.name ILIKE $${params.length} OR n.slug ILIKE $${params.length})`; }

    sql += ' ORDER BY n.name';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT n.*, f.name as faction_name,
       (SELECT json_agg(json_build_object('zone_id', p.zone_id, 'zone_name', z.name, 'tile_x', p.tile_x, 'tile_y', p.tile_y, 'direction', p.direction))
        FROM npc_zone_placements p JOIN zones z ON z.id = p.zone_id WHERE p.npc_id = n.id) as placements
       FROM npcs n LEFT JOIN factions f ON f.id = n.faction_id WHERE n.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'NPC not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { slug, name, role, faction_id, personality, appearance, trade_inventory, dialogue_style, stats } = req.body;
    if (!slug || !name || !role) return res.status(400).json({ error: 'slug, name and role required' });

    const result = await query(
      `INSERT INTO npcs (slug, name, role, faction_id, personality, appearance, trade_inventory, dialogue_style, stats)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [slug, name, role, faction_id || null,
       JSON.stringify(personality || {}), JSON.stringify(appearance || {}),
       JSON.stringify(trade_inventory || []), JSON.stringify(dialogue_style || {}),
       JSON.stringify(stats || {})]
    );
    await logChange(req.admin!.adminId, 'create', 'npc', result.rows[0].id, name);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Slug already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, role, faction_id, personality, appearance, trade_inventory, dialogue_style, stats, published } = req.body;
    const result = await query(
      `UPDATE npcs SET
       name = COALESCE($1, name), role = COALESCE($2, role), faction_id = COALESCE($3, faction_id),
       personality = COALESCE($4, personality), appearance = COALESCE($5, appearance),
       trade_inventory = COALESCE($6, trade_inventory), dialogue_style = COALESCE($7, dialogue_style),
       stats = COALESCE($8, stats), published = COALESCE($9, published), updated_at = NOW()
       WHERE id = $10 RETURNING *`,
      [name, role, faction_id, personality ? JSON.stringify(personality) : null,
       appearance ? JSON.stringify(appearance) : null, trade_inventory ? JSON.stringify(trade_inventory) : null,
       dialogue_style ? JSON.stringify(dialogue_style) : null, stats ? JSON.stringify(stats) : null,
       published, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'NPC not found' });
    await logChange(req.admin!.adminId, 'update', 'npc', req.params.id, result.rows[0].name);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/publish', async (req: Request, res: Response) => {
  try {
    const { published } = req.body;
    const result = await query(
      'UPDATE npcs SET published = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [published, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'NPC not found' });
    await logChange(req.admin!.adminId, published ? 'publish' : 'unpublish', 'npc', req.params.id, result.rows[0].name);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query('DELETE FROM npcs WHERE id = $1 RETURNING name', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'NPC not found' });
    await logChange(req.admin!.adminId, 'delete', 'npc', req.params.id, result.rows[0].name);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
