import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
import { logChange } from './changelog.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM factions ORDER BY faction_type, name');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM factions WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Faction not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { slug, name, faction_type, description, lore, color, traits } = req.body;
    if (!slug || !name) return res.status(400).json({ error: 'slug and name required' });

    const result = await query(
      `INSERT INTO factions (slug, name, faction_type, description, lore, color, traits)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [slug, name, faction_type || 'main', description, lore, color, JSON.stringify(traits || [])]
    );
    await logChange(req.admin!.adminId, 'create', 'faction', result.rows[0].id, name);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Slug already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, faction_type, description, lore, color, traits, published } = req.body;
    const result = await query(
      `UPDATE factions SET name = COALESCE($1, name), faction_type = COALESCE($2, faction_type),
       description = COALESCE($3, description), lore = COALESCE($4, lore), color = COALESCE($5, color),
       traits = COALESCE($6, traits), published = COALESCE($7, published), updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [name, faction_type, description, lore, color, traits ? JSON.stringify(traits) : null, published, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Faction not found' });
    await logChange(req.admin!.adminId, 'update', 'faction', req.params.id, result.rows[0].name);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query('DELETE FROM factions WHERE id = $1 RETURNING name', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Faction not found' });
    await logChange(req.admin!.adminId, 'delete', 'faction', req.params.id, result.rows[0].name);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
