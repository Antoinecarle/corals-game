import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
import { logChange } from './changelog.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = path.resolve(__dirname, '../../storage');

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { asset_type, search } = req.query;
    let sql = 'SELECT * FROM assets WHERE 1=1';
    const params: any[] = [];

    if (asset_type) { params.push(asset_type); sql += ` AND asset_type = $${params.length}`; }
    if (search) { params.push(`%${search}%`); sql += ` AND (filename ILIKE $${params.length} OR generation_prompt ILIKE $${params.length})`; }

    sql += ' ORDER BY created_at DESC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM assets WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Asset not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/file', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM assets WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Asset not found' });

    const filePath = path.resolve(STORAGE_DIR, result.rows[0].file_path);
    if (!filePath.startsWith(STORAGE_DIR)) return res.status(403).json({ error: 'Invalid path' });
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });

    res.sendFile(filePath);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { filename, asset_type, mime_type, file_path: fp, metadata, tags, generation_prompt, generation_service } = req.body;
    if (!filename || !asset_type || !fp) return res.status(400).json({ error: 'filename, asset_type and file_path required' });

    const result = await query(
      `INSERT INTO assets (filename, asset_type, mime_type, file_path, metadata, tags, generation_prompt, generation_service)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [filename, asset_type, mime_type, fp, JSON.stringify(metadata || {}),
       JSON.stringify(tags || []), generation_prompt, generation_service]
    );
    await logChange(req.admin!.adminId, 'create', 'asset', result.rows[0].id, filename);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query('DELETE FROM assets WHERE id = $1 RETURNING filename, file_path', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Asset not found' });

    // Delete file from disk
    const filePath = path.resolve(STORAGE_DIR, result.rows[0].file_path);
    if (filePath.startsWith(STORAGE_DIR) && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await logChange(req.admin!.adminId, 'delete', 'asset', req.params.id, result.rows[0].filename);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
