import {
  TideState,
  TidePalier,
  BASTION_CENTER_X,
  BASTION_CENTER_Y,
  SIPHON_1_POS,
  SIPHON_INTERACT_RANGE,
  LOOT_PICKUP_RANGE,
  TIDE_PILLAR_POS,
  TIDE_PILLAR_INTERACT_RANGE,
  CHEST_CAPACITY_P1,
  isInBastion,
  type LootItem,
  type SiphonData,
  type TideStartedMsg,
  type LootSpawnedMsg,
  type LootPickedUpMsg,
  type TideEndedMsg,
  type TideBankResultMsg,
} from '@pirate-mmo/shared';

export interface LootDrop {
  id: string;
  tileX: number;
  tileY: number;
  lootData: LootItem;
}

export type TideEventCallback = {
  onStateChange: (state: TideState) => void;
  onLootPickup: (item: LootItem) => void;
  onLootDropsSpawned: (drops: LootDrop[]) => void;
  onLootDropRemoved: (dropId: string) => void;
  onTideEnded: (reason: string, kept: LootItem[], lost: LootItem[]) => void;
  onBankResult: (banked: LootItem[], remainingCapacity: number) => void;
};

/**
 * Client-side tide state machine.
 * Manages tide lifecycle, carried/banked loot, and UI state.
 */
export class TideManager {
  private state: TideState = TideState.NONE;
  private currentPalier: TidePalier = TidePalier.EAUX_CALMES;
  private sessionId: string = '';

  private carriedLoot: LootItem[] = [];
  private bankedLoot: LootItem[] = [];
  private activeDrops: Map<string, LootDrop> = new Map();

  private siphon: SiphonData = {
    x: SIPHON_1_POS.x,
    y: SIPHON_1_POS.y,
    palier: TidePalier.EAUX_CALMES,
    chestCapacity: CHEST_CAPACITY_P1,
  };

  private callbacks: Partial<TideEventCallback> = {};

  // Network send functions (set by Game.ts)
  private sendLaunchTide: ((palier: TidePalier) => void) | null = null;
  private sendPickupLoot: ((dropId: string) => void) | null = null;
  private sendBankLoot: ((itemIds: string[]) => void) | null = null;
  private sendReflux: (() => void) | null = null;

  setNetworkCallbacks(
    launch: (palier: TidePalier) => void,
    pickup: (dropId: string) => void,
    bank: (itemIds: string[]) => void,
    reflux: () => void,
  ): void {
    this.sendLaunchTide = launch;
    this.sendPickupLoot = pickup;
    this.sendBankLoot = bank;
    this.sendReflux = reflux;
  }

  on<K extends keyof TideEventCallback>(event: K, cb: TideEventCallback[K]): void {
    (this.callbacks as any)[event] = cb;
  }

  // ─── State Queries ───

  getState(): TideState { return this.state; }
  getPalier(): TidePalier { return this.currentPalier; }
  getCarriedLoot(): LootItem[] { return this.carriedLoot; }
  getBankedLoot(): LootItem[] { return this.bankedLoot; }
  getActiveDrops(): Map<string, LootDrop> { return this.activeDrops; }
  getSiphon(): SiphonData { return this.siphon; }
  isActive(): boolean { return this.state === TideState.IN_TIDE || this.state === TideState.AT_SIPHON; }

  getCarriedWeight(): number {
    return this.carriedLoot.reduce((sum, item) => sum + item.weight * item.quantity, 0);
  }

  getCarriedValue(): number {
    return this.carriedLoot.reduce((sum, item) => sum + item.value * item.quantity, 0);
  }

  getBankedWeight(): number {
    return this.bankedLoot.reduce((sum, item) => sum + item.weight * item.quantity, 0);
  }

  getChestMaxWeight(): number {
    return Math.floor(this.getCarriedWeight() * this.siphon.chestCapacity);
  }

  // ─── Player Actions ───

  /** Launch a tide from the bastion */
  launchTide(): void {
    if (this.state !== TideState.NONE) return;
    this.sendLaunchTide?.(TidePalier.EAUX_CALMES);
  }

  /** Pick up a loot drop on the ground */
  tryPickupLoot(playerX: number, playerY: number): void {
    if (this.state !== TideState.IN_TIDE) return;

    for (const [id, drop] of this.activeDrops) {
      const dx = playerX - drop.tileX;
      const dy = playerY - drop.tileY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= LOOT_PICKUP_RANGE) {
        this.sendPickupLoot?.(id);
        break; // one at a time
      }
    }
  }

  /** Check if player is near the siphon */
  isNearSiphon(playerX: number, playerY: number): boolean {
    if (!this.isActive()) return false;
    const dx = playerX - this.siphon.x;
    const dy = playerY - this.siphon.y;
    return Math.sqrt(dx * dx + dy * dy) <= SIPHON_INTERACT_RANGE;
  }

  /** Check if player is near the tide pillar */
  isNearTidePillar(playerX: number, playerY: number): boolean {
    if (this.state !== TideState.NONE) return false;
    const dx = playerX - TIDE_PILLAR_POS.x;
    const dy = playerY - TIDE_PILLAR_POS.y;
    return Math.sqrt(dx * dx + dy * dy) <= TIDE_PILLAR_INTERACT_RANGE;
  }

  /** Open siphon panel */
  openSiphon(): void {
    if (this.state !== TideState.IN_TIDE) return;
    this.setState(TideState.AT_SIPHON);
  }

  /** Close siphon panel */
  closeSiphon(): void {
    if (this.state !== TideState.AT_SIPHON) return;
    this.setState(TideState.IN_TIDE);
  }

  /** Bank selected items in the siphon chest */
  bankLoot(itemIds: string[]): void {
    if (this.state !== TideState.AT_SIPHON) return;
    this.sendBankLoot?.(itemIds);
  }

  /** Reflux — return to bastion safely */
  reflux(): void {
    if (!this.isActive()) return;
    this.sendReflux?.();
  }

  // ─── Network Message Handlers ───

  handleTideStarted(msg: TideStartedMsg): void {
    this.sessionId = msg.sessionId;
    this.currentPalier = msg.palier;
    this.siphon = msg.siphon;
    this.carriedLoot = [];
    this.bankedLoot = [];
    this.activeDrops.clear();
    this.setState(TideState.IN_TIDE);
  }

  handleLootSpawned(msg: LootSpawnedMsg): void {
    const newDrops: LootDrop[] = [];
    for (const drop of msg.drops) {
      const d: LootDrop = {
        id: drop.id,
        tileX: drop.tileX,
        tileY: drop.tileY,
        lootData: drop.lootData,
      };
      this.activeDrops.set(drop.id, d);
      newDrops.push(d);
    }
    this.callbacks.onLootDropsSpawned?.(newDrops);
  }

  handleLootPickedUp(msg: LootPickedUpMsg): void {
    this.activeDrops.delete(msg.dropId);
    this.carriedLoot.push(msg.item);
    this.callbacks.onLootPickup?.(msg.item);
    this.callbacks.onLootDropRemoved?.(msg.dropId);
  }

  handleLootDropRemoved(dropId: string): void {
    this.activeDrops.delete(dropId);
    this.callbacks.onLootDropRemoved?.(dropId);
  }

  handleBankResult(msg: TideBankResultMsg): void {
    // Move banked items from carried to banked
    for (const banked of msg.bankedItems) {
      const idx = this.carriedLoot.findIndex(i => i.id === banked.id);
      if (idx !== -1) {
        this.carriedLoot.splice(idx, 1);
        this.bankedLoot.push(banked);
      }
    }
    this.callbacks.onBankResult?.(msg.bankedItems, msg.remainingCapacity);
  }

  handleTideEnded(msg: TideEndedMsg): void {
    const kept = msg.lootKept;
    const lost = msg.lootLost;
    this.carriedLoot = [];
    this.bankedLoot = [];
    this.activeDrops.clear();
    this.sessionId = '';
    this.setState(TideState.NONE);
    this.callbacks.onTideEnded?.(msg.reason, kept, lost);
  }

  /** Handle player death during tide */
  onDeath(): void {
    // Server will send TideEndedMsg, but we can preemptively clear state
  }

  // ─── Zone Helpers ───

  /** Get current zone type for HUD display */
  getZoneType(playerX: number, playerY: number): 'bastion' | 'palier1' {
    return isInBastion(playerX, playerY) ? 'bastion' : 'palier1';
  }

  // ─── Internal ───

  private setState(newState: TideState): void {
    if (this.state === newState) return;
    this.state = newState;
    this.callbacks.onStateChange?.(newState);
  }
}
