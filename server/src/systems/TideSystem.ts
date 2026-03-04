import { Client } from '@colyseus/core';
import {
  TideState,
  TidePalier,
  BASTION_CENTER_X,
  BASTION_CENTER_Y,
  SIPHON_1_POS,
  CHEST_CAPACITY_P1,
  isInBastion,
  LOOT_PICKUP_RANGE,
  type LootItem,
  type TideStartedMsg,
  type LootPickedUpMsg,
  type TideEndedMsg,
  type TideBankResultMsg,
} from '@pirate-mmo/shared';
import { LootSpawner, type ActiveLootDrop } from './LootSpawner.js';
import { query } from '../db/index.js';

interface PlayerTideState {
  sessionId: string; // DB session ID
  dbPlayerId: string;
  clientSessionId: string;
  palier: TidePalier;
  state: TideState;
  carriedLoot: LootItem[];
  bankedLoot: LootItem[];
}

/**
 * Server-side tide system.
 * Manages per-player tide state, validates actions, persists results.
 */
export class TideSystem {
  private playerTides: Map<string, PlayerTideState> = new Map(); // keyed by client sessionId
  private lootSpawner: LootSpawner;
  private zoneX: number;
  private zoneY: number;

  constructor(zoneX: number, zoneY: number) {
    this.zoneX = zoneX;
    this.zoneY = zoneY;
    this.lootSpawner = new LootSpawner(zoneX, zoneY);
  }

  /**
   * Player launches a tide.
   */
  async handleLaunchTide(
    client: Client,
    playerX: number,
    playerY: number,
    playerId: string,
    message: { palier: number },
  ): Promise<void> {
    // Validate: must be in bastion
    if (!isInBastion(playerX, playerY)) {
      return;
    }

    // Validate: not already in a tide
    if (this.playerTides.has(client.sessionId)) {
      return;
    }

    const palier = TidePalier.EAUX_CALMES; // Only Palier 1 for now

    // Create DB session
    let sessionId: string;
    try {
      const result = await query(
        `INSERT INTO tide_sessions (player_id, palier, status)
         VALUES ($1, $2, 'active')
         RETURNING id`,
        [playerId, palier]
      );
      sessionId = result.rows[0].id;
    } catch (err) {
      console.error('[TideSystem] Failed to create tide session:', err);
      return;
    }

    // Create player state
    const tideState: PlayerTideState = {
      sessionId,
      dbPlayerId: playerId,
      clientSessionId: client.sessionId,
      palier,
      state: TideState.IN_TIDE,
      carriedLoot: [],
      bankedLoot: [],
    };
    this.playerTides.set(client.sessionId, tideState);

    // Send tide started message
    const startMsg: TideStartedMsg = {
      sessionId,
      palier,
      siphon: {
        x: SIPHON_1_POS.x,
        y: SIPHON_1_POS.y,
        palier,
        chestCapacity: CHEST_CAPACITY_P1,
      },
    };
    client.send('tideStarted', startMsg);

    // Spawn initial loot
    const drops = this.lootSpawner.spawnInitialLoot(palier);
    this.sendLootSpawned(client, drops);

    console.log(`[TideSystem] Player ${client.sessionId} launched tide (session ${sessionId})`);
  }

  /**
   * Player picks up a loot drop.
   */
  handlePickupLoot(
    client: Client,
    playerX: number,
    playerY: number,
    message: { dropId: string },
  ): void {
    const tideState = this.playerTides.get(client.sessionId);
    if (!tideState || tideState.state !== TideState.IN_TIDE) return;

    const drop = this.lootSpawner.getDrop(message.dropId);
    if (!drop) return;

    // Validate proximity
    const dx = playerX - drop.tileX;
    const dy = playerY - drop.tileY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > LOOT_PICKUP_RANGE + 1) return; // small tolerance

    // Remove drop from spawner
    this.lootSpawner.removeDrop(message.dropId);

    // Add to carried loot
    tideState.carriedLoot.push(drop.lootData);

    // Send pickup confirmation
    const pickupMsg: LootPickedUpMsg = {
      dropId: message.dropId,
      item: drop.lootData,
    };
    client.send('lootPickedUp', pickupMsg);
  }

  /**
   * Player banks items in the siphon chest.
   */
  handleBankLoot(
    client: Client,
    message: { itemIds: string[] },
  ): void {
    const tideState = this.playerTides.get(client.sessionId);
    if (!tideState) return;

    const { itemIds } = message;
    const carriedWeight = tideState.carriedLoot.reduce((s, i) => s + i.weight * i.quantity, 0);
    const maxBankWeight = Math.floor(carriedWeight * CHEST_CAPACITY_P1);
    const bankedWeight = tideState.bankedLoot.reduce((s, i) => s + i.weight * i.quantity, 0);
    let remainingCapacity = maxBankWeight - bankedWeight;

    const bankedItems: LootItem[] = [];

    for (const itemId of itemIds) {
      const idx = tideState.carriedLoot.findIndex(i => i.id === itemId);
      if (idx === -1) continue;

      const item = tideState.carriedLoot[idx];
      const itemWeight = item.weight * item.quantity;

      if (itemWeight <= remainingCapacity) {
        tideState.carriedLoot.splice(idx, 1);
        tideState.bankedLoot.push(item);
        bankedItems.push(item);
        remainingCapacity -= itemWeight;
      }
    }

    const result: TideBankResultMsg = {
      bankedItems,
      remainingCapacity,
    };
    client.send('bankResult', result);
  }

  /**
   * Player refluxes — returns to bastion safely.
   */
  async handleReflux(client: Client): Promise<void> {
    const tideState = this.playerTides.get(client.sessionId);
    if (!tideState) return;

    // All loot is kept (both carried and banked)
    const allKept = [...tideState.bankedLoot, ...tideState.carriedLoot];

    // Persist to DB
    await this.endTideSession(tideState, 'completed', allKept, []);

    // Send end message
    const endMsg: TideEndedMsg = {
      sessionId: tideState.sessionId,
      reason: 'reflux',
      lootKept: allKept,
      lootLost: [],
    };
    client.send('tideEnded', endMsg);

    // Clean up
    this.playerTides.delete(client.sessionId);

    console.log(`[TideSystem] Player ${client.sessionId} refluxed with ${allKept.length} items`);
  }

  /**
   * Player dies during tide.
   */
  async handleDeath(client: Client): Promise<void> {
    const tideState = this.playerTides.get(client.sessionId);
    if (!tideState) return;

    // Banked loot is kept, carried loot is lost
    const kept = [...tideState.bankedLoot];
    const lost = [...tideState.carriedLoot];

    // Persist to DB
    await this.endTideSession(tideState, 'died', kept, lost);

    // Send end message
    const endMsg: TideEndedMsg = {
      sessionId: tideState.sessionId,
      reason: 'death',
      lootKept: kept,
      lootLost: lost,
    };
    client.send('tideEnded', endMsg);

    // Clean up
    this.playerTides.delete(client.sessionId);

    console.log(`[TideSystem] Player ${client.sessionId} died, lost ${lost.length} items`);
  }

  /**
   * Player disconnects while in tide — treat as death.
   */
  async handleDisconnect(clientSessionId: string): Promise<void> {
    const tideState = this.playerTides.get(clientSessionId);
    if (!tideState) return;

    const kept = [...tideState.bankedLoot];
    const lost = [...tideState.carriedLoot];

    await this.endTideSession(tideState, 'died', kept, lost);
    this.playerTides.delete(clientSessionId);

    console.log(`[TideSystem] Player ${clientSessionId} disconnected during tide`);
  }

  /**
   * Periodic update — spawn new loot, check despawns.
   */
  update(dt: number): void {
    this.lootSpawner.update(dt);
  }

  /**
   * Send newly spawned loot drops to a specific player.
   */
  sendLootSpawned(client: Client, drops: ActiveLootDrop[]): void {
    if (drops.length === 0) return;
    client.send('lootSpawned', {
      drops: drops.map(d => ({
        id: d.id,
        tileX: d.tileX,
        tileY: d.tileY,
        lootData: d.lootData,
      })),
    });
  }

  /**
   * Get newly spawned drops since last check (for broadcasting to active tide players).
   */
  getAndClearNewDrops(): ActiveLootDrop[] {
    return this.lootSpawner.getAndClearNewDrops();
  }

  /**
   * Check if a player has an active tide.
   */
  hasActiveTide(clientSessionId: string): boolean {
    return this.playerTides.has(clientSessionId);
  }

  /**
   * Get all active tide player session IDs.
   */
  getActiveTidePlayers(): string[] {
    return Array.from(this.playerTides.keys());
  }

  // ─── Private ───

  private async endTideSession(
    tideState: PlayerTideState,
    status: 'completed' | 'died',
    kept: LootItem[],
    lost: LootItem[],
  ): Promise<void> {
    try {
      await query(
        `UPDATE tide_sessions
         SET status = $1, loot_banked = $2, loot_carried = '[]', loot_lost = $3, ended_at = NOW()
         WHERE id = $4`,
        [status, JSON.stringify(kept), JSON.stringify(lost), tideState.sessionId]
      );
    } catch (err) {
      console.error('[TideSystem] Failed to end tide session:', err);
    }
  }
}
