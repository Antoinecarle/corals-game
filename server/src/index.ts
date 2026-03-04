import './polyfill.js';

import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import cors from 'cors';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { monitor } from '@colyseus/monitor';
import { runMigrations } from './db/index.js';
import { ZoneRoom } from './rooms/ZoneRoom.js';
import { LobbyRoom } from './rooms/LobbyRoom.js';
import { zoneManager } from './systems/ZoneManager.js';

const PORT = parseInt(process.env.PORT || process.env.GAME_PORT || '3001', 10);

async function main(): Promise<void> {
  // Run database migrations
  console.log('[Server] Running DB migrations...');
  await runMigrations();

  const transport = new WebSocketTransport();
  const app = transport.getExpressApp();

  app.use(cors());

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      zones: Object.fromEntries(zoneManager.getActiveZones()),
    });
  });

  // Colyseus monitor
  app.use('/colyseus', monitor());

  const gameServer = new Server({ transport });

  // Initialize zone manager
  zoneManager.init(gameServer);

  // Define rooms
  gameServer.define('zone', ZoneRoom).filterBy(['zoneX', 'zoneY']);
  gameServer.define('lobby', LobbyRoom);

  // Start listening
  await gameServer.listen(PORT);
  console.log(`[Server] Colyseus game server running on port ${PORT}`);
  console.log(`[Server] Monitor at http://localhost:${PORT}/colyseus`);
}

main().catch((err) => {
  console.error('[Server] Fatal error:', err);
  process.exit(1);
});
