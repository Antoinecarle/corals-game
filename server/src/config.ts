import {
  SERVER_TICK_RATE,
  ZONE_SIZE,
  INTEREST_RADIUS,
  INTEREST_CELL_SIZE,
} from '@pirate-mmo/shared';

export const config = {
  tickRate: SERVER_TICK_RATE,     // 20 Hz
  zoneSize: ZONE_SIZE,           // 256 tiles per side
  interestRadius: INTEREST_RADIUS, // 32 tiles
  interestCellSize: INTEREST_CELL_SIZE, // 16 tiles per cell
  maxPlayersPerZone: 200,
  positionSaveInterval: 30_000,  // ms
};
