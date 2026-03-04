import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { runMigrations } from './db/migrate.js';
import { query } from './db/index.js';
import { verifyToken } from './middleware/auth.js';

// Routes
import authRoutes from './routes/auth.js';
import factionsRoutes from './routes/factions.js';
import npcsRoutes from './routes/npcs.js';
import itemsRoutes from './routes/items.js';
import abyssauxRoutes from './routes/abyssaux.js';
import zonesRoutes from './routes/zones.js';
import questsRoutes from './routes/quests.js';
import shipsRoutes from './routes/ships.js';
import worldEventsRoutes from './routes/world-events.js';
import assetsRoutes from './routes/assets.js';
import dashboardRoutes from './routes/dashboard.js';
import changelogRoutes from './routes/changelog.js';
import aiRoutes from './routes/ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const PORT = parseInt(process.env.BACKOFFICE_PORT || '3003');

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));

// Static files for generated assets
app.use('/storage', express.static(path.resolve(__dirname, '../storage')));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'corals-backoffice', timestamp: new Date().toISOString() });
});

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/factions', verifyToken, factionsRoutes);
app.use('/api/npcs', verifyToken, npcsRoutes);
app.use('/api/items', verifyToken, itemsRoutes);
app.use('/api/abyssaux', verifyToken, abyssauxRoutes);
app.use('/api/zones', verifyToken, zonesRoutes);
app.use('/api/quests', verifyToken, questsRoutes);
app.use('/api/ships', verifyToken, shipsRoutes);
app.use('/api/world-events', verifyToken, worldEventsRoutes);
app.use('/api/assets', verifyToken, assetsRoutes);
app.use('/api/dashboard', verifyToken, dashboardRoutes);
app.use('/api/changelog', verifyToken, changelogRoutes);
app.use('/api/ai', verifyToken, aiRoutes);

// SPA fallback (production)
const distPath = path.resolve(__dirname, '../../dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Startup
async function start() {
  // Run migrations
  await runMigrations();

  // Seed admin
  await seedAdmin();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[BACKOFFICE] Server running on port ${PORT}`);
  });
}

async function seedAdmin() {
  const email = process.env.BO_ADMIN_EMAIL;
  const password = process.env.BO_ADMIN_PASSWORD;
  if (!email || !password) return;

  const existing = await query('SELECT id FROM bo_admins WHERE email = $1', [email]);
  if (existing.rows.length > 0) return;

  const hash = await bcrypt.hash(password, 12);
  await query(
    `INSERT INTO bo_admins (username, email, password_hash, role) VALUES ($1, $2, $3, 'owner')`,
    [email.split('@')[0], email, hash]
  );
  console.log(`[BACKOFFICE] Admin seeded: ${email}`);
}

start().catch(err => {
  console.error('[BACKOFFICE] Failed to start:', err);
  process.exit(1);
});
