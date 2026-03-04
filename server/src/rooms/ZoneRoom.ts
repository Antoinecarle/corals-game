import { Room, Client } from '@colyseus/core';
import { MapSchema } from '@colyseus/schema';
import { GameState } from '../schema/GameState.js';
import { PlayerState } from '../schema/PlayerState.js';
import { CollisionGrid } from '../systems/CollisionGrid.js';
import { MovementValidator } from '../systems/MovementValidator.js';
import { InterestManager } from '../systems/InterestManager.js';
import { NPCSpawner } from '../systems/NPCSpawner.js';
import { TideSystem } from '../systems/TideSystem.js';
import { zoneManager } from '../systems/ZoneManager.js';
import { config } from '../config.js';
import { savePosition } from '../db/player-repository.js';
import { loadEdits, saveEdit, deleteEdit } from '../db/zone-map-store.js';
import {
  MOVE_SPEED,
  ZONE_SIZE,
  POSITION_SAVE_INTERVAL,
  BASTION_CENTER_X,
  BASTION_CENTER_Y,
  vectorToDirection,
} from '@pirate-mmo/shared';
import type { MoveMessage, ZoneTransitionMessage } from '@pirate-mmo/shared';

interface ZoneRoomOptions {
  zoneX: number;
  zoneY: number;
}

interface JoinOptions {
  playerId: string;
  name: string;
  tileX: number;
  tileY: number;
  direction: number;
}

export class ZoneRoom extends Room<GameState> {
  private zoneX!: number;
  private zoneY!: number;
  private collisionGrid!: CollisionGrid;
  private movementValidator!: MovementValidator;
  private interestManager!: InterestManager;
  private tideSystem!: TideSystem;
  private saveInterval: ReturnType<typeof setInterval> | null = null;

  onCreate(options: ZoneRoomOptions): void {
    this.zoneX = options.zoneX;
    this.zoneY = options.zoneY;

    const state = new GameState();
    state.players = new MapSchema<PlayerState>();
    state.npcs = new MapSchema<NPCState>();
    this.setState(state);

    // Generate collision grid for this zone
    this.collisionGrid = CollisionGrid.generateZone(this.zoneX, this.zoneY);
    this.movementValidator = new MovementValidator(this.collisionGrid);
    this.interestManager = new InterestManager();

    // Spawn NPCs
    NPCSpawner.spawnForZone(this.zoneX, this.zoneY, this.state.npcs);

    // Tide system
    this.tideSystem = new TideSystem(this.zoneX, this.zoneY);

    // Track zone in manager
    zoneManager.trackZone(this.zoneX, this.zoneY);

    // Register message handlers
    this.onMessage('move', (client: Client, message: MoveMessage) => {
      this.handleMove(client, message);
    });

    this.onMessage('requestZoneTransition', (client: Client, message: ZoneTransitionMessage) => {
      this.handleZoneTransition(client, message);
    });

    // Admin: place obstacle
    this.onMessage('adminPlaceObstacle', (client: Client, message: { x: number; y: number; obstacleType: number }) => {
      this.handleAdminPlaceObstacle(client, message);
    });

    // Admin: remove obstacle
    this.onMessage('adminRemoveObstacle', (client: Client, message: { x: number; y: number }) => {
      this.handleAdminRemoveObstacle(client, message);
    });

    // ─── Tide System Handlers ───
    this.onMessage('launchTide', (client: Client, message: { palier: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      this.tideSystem.handleLaunchTide(client, player.x, player.y, player.playerId, message);
    });

    this.onMessage('pickupLoot', (client: Client, message: { dropId: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      this.tideSystem.handlePickupLoot(client, player.x, player.y, message);
    });

    this.onMessage('bankLoot', (client: Client, message: { itemIds: string[] }) => {
      this.tideSystem.handleBankLoot(client, message);
    });

    this.onMessage('reflux', (client: Client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      // Teleport player to bastion center
      player.x = BASTION_CENTER_X;
      player.y = BASTION_CENTER_Y;
      player.targetX = BASTION_CENTER_X;
      player.targetY = BASTION_CENTER_Y;
      player.animation = 'idle';
      this.tideSystem.handleReflux(client);
    });

    // Load persisted map edits and apply to collision grid
    this.loadMapEdits();

    // Game loop at configured tick rate
    this.setSimulationInterval((deltaTime) => {
      this.gameLoop(deltaTime);
    }, 1000 / config.tickRate);

    // Periodic position save
    this.saveInterval = setInterval(() => {
      this.saveAllPositions();
    }, POSITION_SAVE_INTERVAL);

    this.maxClients = config.maxPlayersPerZone;

    console.log(`[ZoneRoom] Created zone (${this.zoneX}, ${this.zoneY})`);
  }

  onJoin(client: Client, options: JoinOptions): void {
    const player = new PlayerState();
    const tileX = options.tileX ?? 128;
    const tileY = options.tileY ?? 128;
    player.x = tileX;
    player.y = tileY;
    player.targetX = tileX;
    player.targetY = tileY;
    player.direction = options.direction ?? 0;
    player.animation = 'idle';
    player.name = options.name ?? 'Unknown';
    player.sessionId = client.sessionId;
    player.playerId = options.playerId ?? '';

    this.state.players.set(client.sessionId, player);
    this.interestManager.addEntity(client.sessionId, player.x, player.y);
    zoneManager.playerJoined(this.zoneX, this.zoneY);

    // Send persisted map edits to newly-joined client
    loadEdits(this.zoneX, this.zoneY).then((edits) => {
      for (const edit of edits) {
        client.send('obstacleUpdate', {
          x: edit.tileX,
          y: edit.tileY,
          obstacleType: edit.obstacleType,
        });
      }
    }).catch((err) => {
      console.error('[ZoneRoom] Failed to send map edits to client:', err);
    });

    console.log(`[ZoneRoom] Player "${player.name}" joined zone (${this.zoneX}, ${this.zoneY})`);
  }

  async onLeave(client: Client): Promise<void> {
    // Handle tide disconnect
    this.tideSystem.handleDisconnect(client.sessionId);

    const player = this.state.players.get(client.sessionId);
    if (player) {
      // Save position to DB
      if (player.playerId) {
        try {
          await savePosition(
            player.playerId,
            this.zoneX,
            this.zoneY,
            player.x,
            player.y,
            player.direction,
          );
        } catch (err) {
          console.error('[ZoneRoom] Failed to save position on leave:', err);
        }
      }

      this.interestManager.removeEntity(client.sessionId);
      this.state.players.delete(client.sessionId);
      zoneManager.playerLeft(this.zoneX, this.zoneY);

      console.log(`[ZoneRoom] Player "${player.name}" left zone (${this.zoneX}, ${this.zoneY})`);
    }
  }

  onDispose(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    console.log(`[ZoneRoom] Disposed zone (${this.zoneX}, ${this.zoneY})`);
  }

  private handleMove(client: Client, message: MoveMessage): void {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const result = this.movementValidator.validate(
      player.x,
      player.y,
      message.targetX,
      message.targetY,
    );

    if (result.valid) {
      player.targetX = result.x;
      player.targetY = result.y;
    }
  }

  private async handleZoneTransition(
    client: Client,
    message: ZoneTransitionMessage,
  ): Promise<void> {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // Validate target zone is adjacent
    const dx = Math.abs(message.targetZoneX - this.zoneX);
    const dy = Math.abs(message.targetZoneY - this.zoneY);
    if (dx > 1 || dy > 1) {
      client.send('zoneTransitionError', { error: 'Target zone not adjacent' });
      return;
    }

    try {
      // Save position before transition
      if (player.playerId) {
        await savePosition(
          player.playerId,
          message.targetZoneX,
          message.targetZoneY,
          message.entryX,
          message.entryY,
          player.direction,
        );
      }

      // Tell client to reconnect to new zone
      client.send('zoneTransition', {
        targetZoneX: message.targetZoneX,
        targetZoneY: message.targetZoneY,
        entryX: message.entryX,
        entryY: message.entryY,
      });
    } catch (err) {
      console.error('[ZoneRoom] Zone transition error:', err);
      client.send('zoneTransitionError', { error: 'Failed to transition' });
    }
  }

  private async loadMapEdits(): Promise<void> {
    try {
      const edits = await loadEdits(this.zoneX, this.zoneY);
      for (const edit of edits) {
        if (edit.obstacleType > 0) {
          this.collisionGrid.setBlocked(edit.tileX, edit.tileY);
        } else {
          this.collisionGrid.setWalkable(edit.tileX, edit.tileY);
        }
      }
      if (edits.length > 0) {
        console.log(`[ZoneRoom] Loaded ${edits.length} map edits for zone (${this.zoneX}, ${this.zoneY})`);
      }
    } catch (err) {
      console.error('[ZoneRoom] Failed to load map edits:', err);
    }
  }

  private handleAdminPlaceObstacle(
    client: Client,
    message: { x: number; y: number; obstacleType: number },
  ): void {
    const { x, y, obstacleType } = message;

    // Validate bounds
    if (x < 0 || x >= ZONE_SIZE || y < 0 || y >= ZONE_SIZE) return;
    if (obstacleType < 1 || obstacleType > 6) return;

    // Update collision grid
    this.collisionGrid.setBlocked(x, y);

    // Persist to DB
    const player = this.state.players.get(client.sessionId);
    const placedBy = player?.name ?? 'unknown';
    saveEdit(this.zoneX, this.zoneY, x, y, obstacleType, placedBy).catch((err) => {
      console.error('[ZoneRoom] Failed to save map edit:', err);
    });

    // Broadcast to all clients (including sender for confirmation)
    this.broadcast('obstacleUpdate', { x, y, obstacleType }, { except: client });
  }

  private handleAdminRemoveObstacle(
    client: Client,
    message: { x: number; y: number },
  ): void {
    const { x, y } = message;

    // Validate bounds
    if (x < 0 || x >= ZONE_SIZE || y < 0 || y >= ZONE_SIZE) return;

    // Update collision grid
    this.collisionGrid.setWalkable(x, y);

    // Remove from DB
    deleteEdit(this.zoneX, this.zoneY, x, y).catch((err) => {
      console.error('[ZoneRoom] Failed to delete map edit:', err);
    });

    // Broadcast to all clients
    this.broadcast('obstacleUpdate', { x, y, obstacleType: 0 }, { except: client });
  }

  private gameLoop(deltaTime: number): void {
    const dt = deltaTime / 1000; // Convert to seconds

    // Update tide system (loot spawn/despawn)
    this.tideSystem.update(dt);

    // Broadcast new loot drops to active tide players
    const newDrops = this.tideSystem.getAndClearNewDrops();
    if (newDrops.length > 0) {
      const activePlayers = this.tideSystem.getActiveTidePlayers();
      for (const sessionId of activePlayers) {
        const client = this.clients.find(c => c.sessionId === sessionId);
        if (client) {
          this.tideSystem.sendLootSpawned(client, newDrops);
        }
      }
    }

    this.state.players.forEach((player) => {
      const dx = player.targetX - player.x;
      const dy = player.targetY - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 0.1) {
        // Arrived at target
        player.x = player.targetX;
        player.y = player.targetY;
        if (player.animation !== 'idle') {
          player.animation = 'idle';
        }
        return;
      }

      // Move towards target
      const moveAmount = MOVE_SPEED * dt;
      const ratio = Math.min(moveAmount / dist, 1);
      const newX = player.x + dx * ratio;
      const newY = player.y + dy * ratio;

      // Check collision at new position
      if (this.collisionGrid.isWalkable(newX, newY)) {
        player.x = newX;
        player.y = newY;
        player.direction = vectorToDirection(dx, dy);
        if (player.animation !== 'walk') {
          player.animation = 'walk';
        }

        // Update interest manager
        this.interestManager.updateEntity(player.sessionId, newX, newY);
      } else {
        // Blocked - stop
        player.targetX = player.x;
        player.targetY = player.y;
        player.animation = 'idle';
      }
    });
  }

  private async saveAllPositions(): Promise<void> {
    const promises: Promise<void>[] = [];
    this.state.players.forEach((player) => {
      if (player.playerId) {
        promises.push(
          savePosition(
            player.playerId,
            this.zoneX,
            this.zoneY,
            player.x,
            player.y,
            player.direction,
          ).catch((err) => {
            console.error(`[ZoneRoom] Save position error for ${player.name}:`, err);
          }),
        );
      }
    });
    await Promise.all(promises);
  }
}
