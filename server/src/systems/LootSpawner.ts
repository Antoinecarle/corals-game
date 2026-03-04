import {
  TidePalier,
  BASTION_RADIUS,
  BASTION_CENTER_X,
  BASTION_CENTER_Y,
  ZONE_SIZE,
  INITIAL_LOOT_COUNT,
  LOOT_SPAWN_INTERVAL,
  LOOT_DESPAWN_TIME,
  isInBastion,
  type LootItem,
} from '@pirate-mmo/shared';
import { rollLoot } from '@pirate-mmo/shared';
import { CollisionGrid } from './CollisionGrid.js';

export interface ActiveLootDrop {
  id: string;
  tileX: number;
  tileY: number;
  lootData: LootItem;
  spawnedAt: number;
}

/**
 * Manages loot drop spawning and despawning for a zone.
 */
export class LootSpawner {
  private drops: Map<string, ActiveLootDrop> = new Map();
  private newDrops: ActiveLootDrop[] = []; // buffer for broadcasting
  private zoneX: number;
  private zoneY: number;
  private spawnTimer = 0;
  private activeTide = false;
  private currentPalier: TidePalier = TidePalier.EAUX_CALMES;

  private dropIdCounter = 0;

  constructor(zoneX: number, zoneY: number) {
    this.zoneX = zoneX;
    this.zoneY = zoneY;
  }

  /**
   * Spawn initial loot drops when a tide begins.
   */
  spawnInitialLoot(palier: TidePalier): ActiveLootDrop[] {
    this.activeTide = true;
    this.currentPalier = palier;
    this.spawnTimer = 0;

    const spawned: ActiveLootDrop[] = [];
    for (let i = 0; i < INITIAL_LOOT_COUNT; i++) {
      const drop = this.spawnDrop(palier);
      if (drop) spawned.push(drop);
    }

    return spawned;
  }

  /**
   * Update — check despawns and spawn new loot periodically.
   */
  update(dt: number): void {
    if (!this.activeTide) return;

    const now = Date.now();

    // Check despawns
    for (const [id, drop] of this.drops) {
      if (now - drop.spawnedAt > LOOT_DESPAWN_TIME) {
        this.drops.delete(id);
      }
    }

    // Periodic spawn
    this.spawnTimer += dt * 1000;
    if (this.spawnTimer >= LOOT_SPAWN_INTERVAL) {
      this.spawnTimer = 0;
      // Spawn 1-3 new drops
      const count = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        this.spawnDrop(this.currentPalier);
      }
    }
  }

  /**
   * Get a specific drop.
   */
  getDrop(id: string): ActiveLootDrop | undefined {
    return this.drops.get(id);
  }

  /**
   * Remove a drop (picked up by player).
   */
  removeDrop(id: string): void {
    this.drops.delete(id);
  }

  /**
   * Get newly spawned drops since last call.
   */
  getAndClearNewDrops(): ActiveLootDrop[] {
    const result = [...this.newDrops];
    this.newDrops = [];
    return result;
  }

  /**
   * Get all active drops.
   */
  getAllDrops(): ActiveLootDrop[] {
    return Array.from(this.drops.values());
  }

  /**
   * Stop spawning (tide ended for all players).
   */
  stop(): void {
    this.activeTide = false;
    this.drops.clear();
    this.newDrops = [];
  }

  // ─── Private ───

  private spawnDrop(palier: TidePalier): ActiveLootDrop | null {
    // Find a random walkable tile outside the bastion
    const pos = this.findSpawnPosition();
    if (!pos) return null;

    const lootItem = rollLoot(palier);
    this.dropIdCounter++;
    const drop: ActiveLootDrop = {
      id: `drop-${this.zoneX}-${this.zoneY}-${Date.now()}-${this.dropIdCounter}`,
      tileX: pos.x,
      tileY: pos.y,
      lootData: lootItem,
      spawnedAt: Date.now(),
    };

    this.drops.set(drop.id, drop);
    this.newDrops.push(drop);

    return drop;
  }

  private findSpawnPosition(): { x: number; y: number } | null {
    // Try up to 50 times to find a valid position
    for (let attempt = 0; attempt < 50; attempt++) {
      const x = Math.floor(Math.random() * ZONE_SIZE);
      const y = Math.floor(Math.random() * ZONE_SIZE);

      // Must be outside bastion
      if (isInBastion(x, y)) continue;

      // Must be within reasonable range (not at very edge)
      if (x < 10 || x > ZONE_SIZE - 10 || y < 10 || y > ZONE_SIZE - 10) continue;

      // Must not be on water (simple check: avoid edges of the island)
      // The island is roughly centered, so positions too far from center are water
      const dx = x - BASTION_CENTER_X;
      const dy = y - BASTION_CENTER_Y;
      const distFromCenter = Math.sqrt(dx * dx + dy * dy);

      // Island radius is roughly 80-100 tiles from center
      if (distFromCenter > 90) continue;

      // Must be beyond bastion
      if (distFromCenter <= BASTION_RADIUS) continue;

      return { x, y };
    }

    return null;
  }
}
