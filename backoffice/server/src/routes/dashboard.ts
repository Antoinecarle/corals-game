import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';

const router = Router();

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [npcs, items, abyssaux, zones, quests, ships, events, assets] = await Promise.all([
      query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE published) as published FROM npcs'),
      query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE published) as published FROM items'),
      query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE published) as published FROM abyssaux'),
      query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE published) as published FROM zones'),
      query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE published) as published FROM quest_templates'),
      query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE published) as published FROM ship_classes'),
      query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE published) as published FROM world_event_templates'),
      query('SELECT COUNT(*) as total FROM assets'),
    ]);

    res.json({
      npcs: npcs.rows[0],
      items: items.rows[0],
      abyssaux: abyssaux.rows[0],
      zones: zones.rows[0],
      quests: quests.rows[0],
      ships: ships.rows[0],
      world_events: events.rows[0],
      assets: assets.rows[0],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/recent-activity', async (_req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT c.*, a.username as admin_username
       FROM bo_changelog c
       LEFT JOIN bo_admins a ON a.id = c.admin_id
       ORDER BY c.created_at DESC LIMIT 20`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
