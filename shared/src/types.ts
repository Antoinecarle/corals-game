// ─── CORALS Game Types ─────────────────────────────────

export type CoralType = 'abime' | 'maree' | 'givre' | 'braise' | 'brume' | 'chair' | 'echo';
export type AbyssalCoralType = 'encre' | 'flux' | 'cristal' | 'braise' | 'voile' | 'chair' | 'echo';
export type SizeClass = 'essaim' | 'sentinelle' | 'colosse' | 'titan' | 'primordial';
export type ZoneRing = 'coeur' | 'eaux_medianes' | 'terres_noyees' | 'brume';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'eclat' | 'bourgeon' | 'branche' | 'coeur' | 'coral_ancien';
export type NPCRole = 'marchand' | 'capitaine' | 'forgeron' | 'tavernier' | 'quest_giver' | 'garde' | 'civil' | 'pirate' | 'marin' | 'mystique';
export type FactionType = 'main' | 'secondary';
export type ShipType = 'sloop' | 'brigantin' | 'galion' | 'cuirasse' | 'sous_marin' | 'dirigeable';
export type QuestType = 'fetch' | 'kill' | 'escort' | 'explore' | 'social' | 'trade' | 'chain' | 'world';

// ─── Direction System ──────────────────────────────────

// 8-direction enum (numpad layout)
export enum Direction {
  South = 0,      // facing camera
  SouthWest = 1,
  West = 2,
  NorthWest = 3,
  North = 4,      // away from camera
  NorthEast = 5,
  East = 6,
  SouthEast = 7,
}

// Tile-space position (cartesian grid)
export interface Position {
  x: number;
  y: number;
}

// Screen-space position (pixels)
export interface ScreenPosition {
  sx: number;
  sy: number;
}

// Zone coordinate
export interface ZoneCoord {
  zoneX: number;
  zoneY: number;
}

// Full world position
export interface WorldPosition extends Position, ZoneCoord {}

// Player data sent over network
export interface PlayerData {
  id: string;
  name: string;
  x: number;
  y: number;
  direction: Direction;
  animation: string; // 'idle' | 'walk'
}

// NPC data
export interface NPCData {
  id: string;
  npcType: string;
  name: string;
  x: number;
  y: number;
  direction: Direction;
}

// Move message from client to server
export interface MoveMessage {
  targetX: number;
  targetY: number;
}

// Zone transition request
export interface ZoneTransitionMessage {
  targetZoneX: number;
  targetZoneY: number;
  entryX: number;
  entryY: number;
}

// Direction vectors for each of 8 directions
export const DIRECTION_VECTORS: Record<Direction, Position> = {
  [Direction.North]:     { x: 0,  y: -1 },
  [Direction.NorthEast]: { x: 1,  y: -1 },
  [Direction.East]:      { x: 1,  y: 0  },
  [Direction.SouthEast]: { x: 1,  y: 1  },
  [Direction.South]:     { x: 0,  y: 1  },
  [Direction.SouthWest]: { x: -1, y: 1  },
  [Direction.West]:      { x: -1, y: 0  },
  [Direction.NorthWest]: { x: -1, y: -1 },
};

// Calculate direction from movement vector
export function vectorToDirection(dx: number, dy: number): Direction {
  if (dx === 0 && dy === 0) return Direction.South;
  const angle = Math.atan2(dy, dx);
  // Map angle to 8 directions
  const index = Math.round(angle / (Math.PI / 4)) + 2;
  const dirs = [
    Direction.West, Direction.NorthWest, Direction.North,
    Direction.NorthEast, Direction.East, Direction.SouthEast,
    Direction.South, Direction.SouthWest, Direction.West,
  ];
  return dirs[((index % 8) + 8) % 8];
}
