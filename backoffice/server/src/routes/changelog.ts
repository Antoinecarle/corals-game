import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';

const router = Router();

export async function logChange(
  adminId: string,
  action: string,
  entityType: string,
  entityId?: string,
  entityName?: string,
  changes?: object
) {
  try {
    await query(
      `INSERT INTO bo_changelog (admin_id, action, entity_type, entity_id, entity_name, changes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [adminId, action, entityType, entityId, entityName, JSON.stringify(changes || {})]
    );
  } catch (err) {
    console.error('[CHANGELOG] Failed to log:', err);
  }
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const entityType = req.query.entity_type as string;

    let sql = `SELECT c.*, a.username as admin_username
               FROM bo_changelog c
               LEFT JOIN bo_admins a ON a.id = c.admin_id`;
    const params: any[] = [];

    if (entityType) {
      sql += ' WHERE c.entity_type = $1';
      params.push(entityType);
    }

    sql += ` ORDER BY c.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
