import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
import { logChange } from './changelog.js';

const router = Router();

// --- Ship Classes ---
router.get('/classes', async (_req: Request, res: Response) => {
  try {
    const result = await query(`SELECT sc.*,
      CASE WHEN ma.file_path IS NOT NULL THEN '/storage/' || ma.file_path END as model_url
      FROM ship_classes sc
      LEFT JOIN assets ma ON ma.id = sc.model_asset_id
      ORDER BY sc.required_level, sc.name`);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/classes/:id', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM ship_classes WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Ship class not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/classes', async (req: Request, res: Response) => {
  try {
    const { slug, name, ship_type, description, base_stats, module_slots, crew_capacity, cargo_capacity, cost, required_level } = req.body;
    if (!slug || !name || !ship_type) return res.status(400).json({ error: 'slug, name and ship_type required' });

    const result = await query(
      `INSERT INTO ship_classes (slug, name, ship_type, description, base_stats, module_slots, crew_capacity, cargo_capacity, cost, required_level)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [slug, name, ship_type, description, JSON.stringify(base_stats || {}), JSON.stringify(module_slots || []),
       crew_capacity || 1, cargo_capacity || 10, cost || 0, required_level || 1]
    );
    await logChange(req.admin!.adminId, 'create', 'ship_class', result.rows[0].id, name);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Slug already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/classes/:id', async (req: Request, res: Response) => {
  try {
    const { name, ship_type, description, base_stats, module_slots, crew_capacity, cargo_capacity, cost, required_level, published } = req.body;
    const result = await query(
      `UPDATE ship_classes SET name = COALESCE($1, name), ship_type = COALESCE($2, ship_type),
       description = COALESCE($3, description), base_stats = COALESCE($4, base_stats),
       module_slots = COALESCE($5, module_slots), crew_capacity = COALESCE($6, crew_capacity),
       cargo_capacity = COALESCE($7, cargo_capacity), cost = COALESCE($8, cost),
       required_level = COALESCE($9, required_level), published = COALESCE($10, published), updated_at = NOW()
       WHERE id = $11 RETURNING *`,
      [name, ship_type, description, base_stats ? JSON.stringify(base_stats) : null,
       module_slots ? JSON.stringify(module_slots) : null, crew_capacity, cargo_capacity, cost, required_level, published, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Ship class not found' });
    await logChange(req.admin!.adminId, 'update', 'ship_class', req.params.id, result.rows[0].name);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/classes/:id', async (req: Request, res: Response) => {
  try {
    const result = await query('DELETE FROM ship_classes WHERE id = $1 RETURNING name', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Ship class not found' });
    await logChange(req.admin!.adminId, 'delete', 'ship_class', req.params.id, result.rows[0].name);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Ship Modules ---
router.get('/modules', async (req: Request, res: Response) => {
  try {
    const { slot_type, rarity } = req.query;
    let sql = 'SELECT * FROM ship_modules WHERE 1=1';
    const params: any[] = [];

    if (slot_type) { params.push(slot_type); sql += ` AND slot_type = $${params.length}`; }
    if (rarity) { params.push(rarity); sql += ` AND rarity = $${params.length}`; }

    sql += ' ORDER BY slot_type, rarity, name';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/modules', async (req: Request, res: Response) => {
  try {
    const { slug, name, slot_type, rarity, description, stats_modifier, effects, cost, coral_enhanced } = req.body;
    if (!slug || !name || !slot_type) return res.status(400).json({ error: 'slug, name and slot_type required' });

    const result = await query(
      `INSERT INTO ship_modules (slug, name, slot_type, rarity, description, stats_modifier, effects, cost, coral_enhanced)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [slug, name, slot_type, rarity || 'common', description,
       JSON.stringify(stats_modifier || {}), JSON.stringify(effects || []), cost || 0, coral_enhanced || false]
    );
    await logChange(req.admin!.adminId, 'create', 'ship_module', result.rows[0].id, name);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Slug already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/modules/:id', async (req: Request, res: Response) => {
  try {
    const { name, slot_type, rarity, description, stats_modifier, effects, cost, coral_enhanced, published } = req.body;
    const result = await query(
      `UPDATE ship_modules SET name = COALESCE($1, name), slot_type = COALESCE($2, slot_type),
       rarity = COALESCE($3, rarity), description = COALESCE($4, description),
       stats_modifier = COALESCE($5, stats_modifier), effects = COALESCE($6, effects),
       cost = COALESCE($7, cost), coral_enhanced = COALESCE($8, coral_enhanced),
       published = COALESCE($9, published), updated_at = NOW()
       WHERE id = $10 RETURNING *`,
      [name, slot_type, rarity, description, stats_modifier ? JSON.stringify(stats_modifier) : null,
       effects ? JSON.stringify(effects) : null, cost, coral_enhanced, published, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Module not found' });
    await logChange(req.admin!.adminId, 'update', 'ship_module', req.params.id, result.rows[0].name);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/modules/:id', async (req: Request, res: Response) => {
  try {
    const result = await query('DELETE FROM ship_modules WHERE id = $1 RETURNING name', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Module not found' });
    await logChange(req.admin!.adminId, 'delete', 'ship_module', req.params.id, result.rows[0].name);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
