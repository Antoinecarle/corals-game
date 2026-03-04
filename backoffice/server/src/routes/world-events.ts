import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
import { logChange } from './changelog.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { event_type, published } = req.query;
    let sql = 'SELECT * FROM world_event_templates WHERE 1=1';
    const params: any[] = [];

    if (event_type) { params.push(event_type); sql += ` AND event_type = $${params.length}`; }
    if (published !== undefined) { params.push(published === 'true'); sql += ` AND published = $${params.length}`; }

    sql += ' ORDER BY event_type, name';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM world_event_templates WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { slug, name, event_type, description, narrative, duration_minutes, affected_zones,
            effects, spawn_waves, rewards, min_players, cooldown_hours } = req.body;
    if (!slug || !name || !event_type) return res.status(400).json({ error: 'slug, name and event_type required' });

    const result = await query(
      `INSERT INTO world_event_templates (slug, name, event_type, description, narrative, duration_minutes,
       affected_zones, effects, spawn_waves, rewards, min_players, cooldown_hours)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [slug, name, event_type, description, narrative, duration_minutes || 60,
       JSON.stringify(affected_zones || []), JSON.stringify(effects || {}),
       JSON.stringify(spawn_waves || []), JSON.stringify(rewards || {}),
       min_players || 1, cooldown_hours || 24]
    );
    await logChange(req.admin!.adminId, 'create', 'world_event', result.rows[0].id, name);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Slug already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, event_type, description, narrative, duration_minutes, affected_zones,
            effects, spawn_waves, rewards, min_players, cooldown_hours, published } = req.body;
    const result = await query(
      `UPDATE world_event_templates SET
       name = COALESCE($1, name), event_type = COALESCE($2, event_type), description = COALESCE($3, description),
       narrative = COALESCE($4, narrative), duration_minutes = COALESCE($5, duration_minutes),
       affected_zones = COALESCE($6, affected_zones), effects = COALESCE($7, effects),
       spawn_waves = COALESCE($8, spawn_waves), rewards = COALESCE($9, rewards),
       min_players = COALESCE($10, min_players), cooldown_hours = COALESCE($11, cooldown_hours),
       published = COALESCE($12, published), updated_at = NOW()
       WHERE id = $13 RETURNING *`,
      [name, event_type, description, narrative, duration_minutes,
       affected_zones ? JSON.stringify(affected_zones) : null, effects ? JSON.stringify(effects) : null,
       spawn_waves ? JSON.stringify(spawn_waves) : null, rewards ? JSON.stringify(rewards) : null,
       min_players, cooldown_hours, published, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    await logChange(req.admin!.adminId, 'update', 'world_event', req.params.id, result.rows[0].name);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query('DELETE FROM world_event_templates WHERE id = $1 RETURNING name', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    await logChange(req.admin!.adminId, 'delete', 'world_event', req.params.id, result.rows[0].name);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
