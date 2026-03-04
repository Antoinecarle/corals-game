// ─── Tide System Types (Marée) ─────────────────────────

// ─── Enums ───

export enum TideState {
  NONE = 'none',
  IN_TIDE = 'in_tide',
  AT_SIPHON = 'at_siphon',
  COMPLETED = 'completed',
}

export enum TidePalier {
  EAUX_CALMES = 1,
}

// ─── Loot ───

export type LootRarity = 'common' | 'uncommon';

export interface LootItem {
  id: string;
  type: string;
  name: string;
  rarity: LootRarity;
  quantity: number;
  value: number;
  weight: number;
  description: string;
}

// ─── Siphon ───

export interface SiphonData {
  x: number;
  y: number;
  palier: TidePalier;
  chestCapacity: number; // 0.0 - 1.0 (percentage of total weight)
}

// ─── Network Messages ───

export interface TideLaunchMsg {
  palier: TidePalier;
}

export interface LootPickupMsg {
  dropId: string;
}

export interface LootSpawnedMsg {
  drops: Array<{
    id: string;
    tileX: number;
    tileY: number;
    lootData: LootItem;
  }>;
}

export interface LootPickedUpMsg {
  dropId: string;
  item: LootItem;
}

export interface SiphonActionMsg {
  action: 'bank' | 'reflux';
  itemIds?: string[]; // for bank action
}

export interface TideStartedMsg {
  sessionId: string;
  palier: TidePalier;
  siphon: SiphonData;
}

export interface TideEndedMsg {
  sessionId: string;
  reason: 'reflux' | 'death' | 'completed';
  lootKept: LootItem[];
  lootLost: LootItem[];
}

export interface TideBankResultMsg {
  bankedItems: LootItem[];
  remainingCapacity: number; // weight remaining in chest
}

// ─── Constants ───

export const BASTION_RADIUS = 30; // tiles from center
export const BASTION_CENTER_X = 128;
export const BASTION_CENTER_Y = 128;

export const SIPHON_1_POS = { x: 95, y: 95 };
export const CHEST_CAPACITY_P1 = 0.8; // 80% of carried weight

export const SIPHON_INTERACT_RANGE = 2; // tiles
export const LOOT_PICKUP_RANGE = 1.5; // tiles

export const TIDE_PILLAR_POS = { x: 128, y: 128 }; // at bastion center
export const TIDE_PILLAR_INTERACT_RANGE = 3; // tiles

export const LOOT_DESPAWN_TIME = 5 * 60 * 1000; // 5 minutes in ms
export const LOOT_SPAWN_INTERVAL = 30 * 1000; // spawn new loot every 30s
export const INITIAL_LOOT_COUNT = 15; // drops when tide starts

/** Check if a tile position is inside the bastion safe zone */
export function isInBastion(tileX: number, tileY: number): boolean {
  const dx = tileX - BASTION_CENTER_X;
  const dy = tileY - BASTION_CENTER_Y;
  return Math.sqrt(dx * dx + dy * dy) <= BASTION_RADIUS;
}
