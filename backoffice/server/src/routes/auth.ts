import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/index.js';
import { signToken, verifyToken } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const result = await query('SELECT * FROM bo_admins WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const admin = result.rows[0];
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    await query('UPDATE bo_admins SET last_login = NOW() WHERE id = $1', [admin.id]);

    const token = signToken({ adminId: admin.id, email: admin.email, role: admin.role });
    res.json({ token, admin: { id: admin.id, username: admin.username, email: admin.email, role: admin.role } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', verifyToken, async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT id, username, email, role, created_at, last_login FROM bo_admins WHERE id = $1',
      [req.admin!.adminId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Admin not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
