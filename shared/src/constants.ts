// Isometric tile dimensions (2:1 ratio)
export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;
export const HALF_TILE_W = TILE_WIDTH / 2;   // 32
export const HALF_TILE_H = TILE_HEIGHT / 2;  // 16

// Zone configuration
export const ZONE_SIZE = 256; // tiles per zone side

// Interest management
export const INTEREST_RADIUS = 32;      // tiles — sync radius around player
export const INTEREST_CELL_SIZE = 16;   // tiles per interest cell side

// Server tick rate
export const SERVER_TICK_RATE = 20; // Hz

// Movement
export const MOVE_SPEED = 3;           // tiles per second
export const DIAGONAL_COST = Math.SQRT2;

// Player defaults
export const DEFAULT_SPAWN_X = 128;
export const DEFAULT_SPAWN_Y = 128;
export const DEFAULT_ZONE_X = 0;
export const DEFAULT_ZONE_Y = 0;

// Limits
export const MAX_PLAYERS_PER_ZONE = 200;
export const MAX_NAME_LENGTH = 20;
export const POSITION_SAVE_INTERVAL = 30_000; // ms
