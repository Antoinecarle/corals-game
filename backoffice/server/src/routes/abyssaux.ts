import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
import { logChange } from './changelog.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { size_class, coral_type, published, search } = req.query;
    let sql = `SELECT a.*,
      CASE WHEN sa.file_path IS NOT NULL THEN '/storage/' || sa.file_path END as sprite_url,
      CASE WHEN ma.file_path IS NOT NULL THEN '/storage/' || ma.file_path END as model_url
      FROM abyssaux a
      LEFT JOIN assets sa ON sa.id = a.sprite_asset_id
      LEFT JOIN assets ma ON ma.id = a.model_asset_id
      WHERE 1=1`;
    const params: any[] = [];

    if (size_class) { params.push(size_class); sql += ` AND a.size_class = $${params.length}`; }
    if (coral_type) { params.push(coral_type); sql += ` AND a.coral_type = $${params.length}`; }
    if (published !== undefined) { params.push(published === 'true'); sql += ` AND a.published = $${params.length}`; }
    if (search) { params.push(`%${search}%`); sql += ` AND (a.name ILIKE $${params.length} OR a.slug ILIKE $${params.length})`; }

    sql += ' ORDER BY a.size_class, a.name';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT a.*,
       (SELECT json_agg(json_build_object('zone_id', s.zone_id, 'zone_name', z.name, 'max_count', s.max_count, 'respawn_seconds', s.respawn_seconds))
        FROM abyssal_zone_spawns s JOIN zones z ON z.id = s.zone_id WHERE s.abyssal_id = a.id) as spawn_zones
       FROM abyssaux a WHERE a.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Abyssal not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { slug, name, size_class, coral_type, description, behavior, stats, loot_table, abilities,
            spawn_conditions, xp_reward, gold_reward } = req.body;
    if (!slug || !name || !size_class || !coral_type) {
      return res.status(400).json({ error: 'slug, name, size_class and coral_type required' });
    }

    const result = await query(
      `INSERT INTO abyssaux (slug, name, size_class, coral_type, description, behavior, stats, loot_table,
       abilities, spawn_conditions, xp_reward, gold_reward)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [slug, name, size_class, coral_type, description,
       JSON.stringify(behavior || {}), JSON.stringify(stats || {}), JSON.stringify(loot_table || []),
       JSON.stringify(abilities || []), JSON.stringify(spawn_conditions || {}),
       xp_reward || 0, gold_reward || 0]
    );
    await logChange(req.admin!.adminId, 'create', 'abyssal', result.rows[0].id, name);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Slug already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, size_class, coral_type, description, behavior, stats, loot_table, abilities,
            spawn_conditions, xp_reward, gold_reward, published } = req.body;
    const result = await query(
      `UPDATE abyssaux SET
       name = COALESCE($1, name), size_class = COALESCE($2, size_class), coral_type = COALESCE($3, coral_type),
       description = COALESCE($4, description), behavior = COALESCE($5, behavior), stats = COALESCE($6, stats),
       loot_table = COALESCE($7, loot_table), abilities = COALESCE($8, abilities),
       spawn_conditions = COALESCE($9, spawn_conditions), xp_reward = COALESCE($10, xp_reward),
       gold_reward = COALESCE($11, gold_reward), published = COALESCE($12, published), updated_at = NOW()
       WHERE id = $13 RETURNING *`,
      [name, size_class, coral_type, description,
       behavior ? JSON.stringify(behavior) : null, stats ? JSON.stringify(stats) : null,
       loot_table ? JSON.stringify(loot_table) : null, abilities ? JSON.stringify(abilities) : null,
       spawn_conditions ? JSON.stringify(spawn_conditions) : null,
       xp_reward, gold_reward, published, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Abyssal not found' });
    await logChange(req.admin!.adminId, 'update', 'abyssal', req.params.id, result.rows[0].name);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/publish', async (req: Request, res: Response) => {
  try {
    const { published } = req.body;
    const result = await query(
      'UPDATE abyssaux SET published = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [published, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Abyssal not found' });
    await logChange(req.admin!.adminId, published ? 'publish' : 'unpublish', 'abyssal', req.params.id, result.rows[0].name);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query('DELETE FROM abyssaux WHERE id = $1 RETURNING name', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Abyssal not found' });
    await logChange(req.admin!.adminId, 'delete', 'abyssal', req.params.id, result.rows[0].name);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
