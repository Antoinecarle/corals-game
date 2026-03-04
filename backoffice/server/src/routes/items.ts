import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
import { logChange } from './changelog.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { item_type, rarity, coral_type, published, search } = req.query;
    let sql = `SELECT i.*,
      CASE WHEN ia.file_path IS NOT NULL THEN '/storage/' || ia.file_path END as icon_url,
      CASE WHEN ma.file_path IS NOT NULL THEN '/storage/' || ma.file_path END as model_url
      FROM items i
      LEFT JOIN assets ia ON ia.id = i.icon_asset_id
      LEFT JOIN assets ma ON ma.id = i.model_asset_id
      WHERE 1=1`;
    const params: any[] = [];

    if (item_type) { params.push(item_type); sql += ` AND i.item_type = $${params.length}`; }
    if (rarity) { params.push(rarity); sql += ` AND i.rarity = $${params.length}`; }
    if (coral_type) { params.push(coral_type); sql += ` AND i.coral_type = $${params.length}`; }
    if (published !== undefined) { params.push(published === 'true'); sql += ` AND i.published = $${params.length}`; }
    if (search) { params.push(`%${search}%`); sql += ` AND (i.name ILIKE $${params.length} OR i.slug ILIKE $${params.length})`; }

    sql += ' ORDER BY i.item_type, i.rarity, i.name';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM items WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { slug, name, item_type, rarity, slot, description, flavor_text, stats, effects, requirements,
            coral_type, stackable, max_stack, sell_price, buy_price } = req.body;
    if (!slug || !name || !item_type) return res.status(400).json({ error: 'slug, name and item_type required' });

    const result = await query(
      `INSERT INTO items (slug, name, item_type, rarity, slot, description, flavor_text, stats, effects,
       requirements, coral_type, stackable, max_stack, sell_price, buy_price)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [slug, name, item_type, rarity || 'common', slot, description, flavor_text,
       JSON.stringify(stats || {}), JSON.stringify(effects || []), JSON.stringify(requirements || {}),
       coral_type || null, stackable || false, max_stack || 1, sell_price || 0, buy_price || 0]
    );
    await logChange(req.admin!.adminId, 'create', 'item', result.rows[0].id, name);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Slug already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, item_type, rarity, slot, description, flavor_text, stats, effects, requirements,
            coral_type, stackable, max_stack, sell_price, buy_price, published } = req.body;
    const result = await query(
      `UPDATE items SET
       name = COALESCE($1, name), item_type = COALESCE($2, item_type), rarity = COALESCE($3, rarity),
       slot = COALESCE($4, slot), description = COALESCE($5, description), flavor_text = COALESCE($6, flavor_text),
       stats = COALESCE($7, stats), effects = COALESCE($8, effects), requirements = COALESCE($9, requirements),
       coral_type = COALESCE($10, coral_type), stackable = COALESCE($11, stackable),
       max_stack = COALESCE($12, max_stack), sell_price = COALESCE($13, sell_price),
       buy_price = COALESCE($14, buy_price), published = COALESCE($15, published), updated_at = NOW()
       WHERE id = $16 RETURNING *`,
      [name, item_type, rarity, slot, description, flavor_text,
       stats ? JSON.stringify(stats) : null, effects ? JSON.stringify(effects) : null,
       requirements ? JSON.stringify(requirements) : null, coral_type,
       stackable, max_stack, sell_price, buy_price, published, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    await logChange(req.admin!.adminId, 'update', 'item', req.params.id, result.rows[0].name);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/publish', async (req: Request, res: Response) => {
  try {
    const { published } = req.body;
    const result = await query(
      'UPDATE items SET published = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [published, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    await logChange(req.admin!.adminId, published ? 'publish' : 'unpublish', 'item', req.params.id, result.rows[0].name);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query('DELETE FROM items WHERE id = $1 RETURNING name', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    await logChange(req.admin!.adminId, 'delete', 'item', req.params.id, result.rows[0].name);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
