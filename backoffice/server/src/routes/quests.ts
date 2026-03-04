import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
import { logChange } from './changelog.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { quest_type, difficulty, faction_id, published, search } = req.query;
    let sql = `SELECT q.*, f.name as faction_name, n.name as npc_giver_name
               FROM quest_templates q
               LEFT JOIN factions f ON f.id = q.faction_id
               LEFT JOIN npcs n ON n.id = q.npc_giver_id WHERE 1=1`;
    const params: any[] = [];

    if (quest_type) { params.push(quest_type); sql += ` AND q.quest_type = $${params.length}`; }
    if (difficulty) { params.push(difficulty); sql += ` AND q.difficulty = $${params.length}`; }
    if (faction_id) { params.push(faction_id); sql += ` AND q.faction_id = $${params.length}`; }
    if (published !== undefined) { params.push(published === 'true'); sql += ` AND q.published = $${params.length}`; }
    if (search) { params.push(`%${search}%`); sql += ` AND (q.title ILIKE $${params.length} OR q.slug ILIKE $${params.length})`; }

    sql += ' ORDER BY q.quest_type, q.difficulty, q.title';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT q.*, f.name as faction_name, n.name as npc_giver_name
       FROM quest_templates q
       LEFT JOIN factions f ON f.id = q.faction_id
       LEFT JOIN npcs n ON n.id = q.npc_giver_id WHERE q.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Quest not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { slug, title, quest_type, description, narrative_hook, objectives, rewards, requirements,
            difficulty, time_limit_minutes, faction_id, npc_giver_id, min_level, max_level, repeatable, chain_next_id } = req.body;
    if (!slug || !title || !quest_type) return res.status(400).json({ error: 'slug, title and quest_type required' });

    const result = await query(
      `INSERT INTO quest_templates (slug, title, quest_type, description, narrative_hook, objectives, rewards,
       requirements, difficulty, time_limit_minutes, faction_id, npc_giver_id, min_level, max_level, repeatable, chain_next_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [slug, title, quest_type, description, narrative_hook,
       JSON.stringify(objectives || []), JSON.stringify(rewards || {}), JSON.stringify(requirements || {}),
       difficulty || 'medium', time_limit_minutes, faction_id || null, npc_giver_id || null,
       min_level || 1, max_level || 80, repeatable || false, chain_next_id || null]
    );
    await logChange(req.admin!.adminId, 'create', 'quest', result.rows[0].id, title);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Slug already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { title, quest_type, description, narrative_hook, objectives, rewards, requirements,
            difficulty, time_limit_minutes, faction_id, npc_giver_id, min_level, max_level, repeatable, chain_next_id, published } = req.body;
    const result = await query(
      `UPDATE quest_templates SET
       title = COALESCE($1, title), quest_type = COALESCE($2, quest_type), description = COALESCE($3, description),
       narrative_hook = COALESCE($4, narrative_hook), objectives = COALESCE($5, objectives),
       rewards = COALESCE($6, rewards), requirements = COALESCE($7, requirements),
       difficulty = COALESCE($8, difficulty), time_limit_minutes = COALESCE($9, time_limit_minutes),
       faction_id = COALESCE($10, faction_id), npc_giver_id = COALESCE($11, npc_giver_id),
       min_level = COALESCE($12, min_level), max_level = COALESCE($13, max_level),
       repeatable = COALESCE($14, repeatable), chain_next_id = COALESCE($15, chain_next_id),
       published = COALESCE($16, published), updated_at = NOW()
       WHERE id = $17 RETURNING *`,
      [title, quest_type, description, narrative_hook,
       objectives ? JSON.stringify(objectives) : null, rewards ? JSON.stringify(rewards) : null,
       requirements ? JSON.stringify(requirements) : null, difficulty, time_limit_minutes,
       faction_id, npc_giver_id, min_level, max_level, repeatable, chain_next_id, published, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Quest not found' });
    await logChange(req.admin!.adminId, 'update', 'quest', req.params.id, result.rows[0].title);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/publish', async (req: Request, res: Response) => {
  try {
    const { published } = req.body;
    const result = await query(
      'UPDATE quest_templates SET published = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [published, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Quest not found' });
    await logChange(req.admin!.adminId, published ? 'publish' : 'unpublish', 'quest', req.params.id, result.rows[0].title);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query('DELETE FROM quest_templates WHERE id = $1 RETURNING title', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Quest not found' });
    await logChange(req.admin!.adminId, 'delete', 'quest', req.params.id, result.rows[0].title);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
