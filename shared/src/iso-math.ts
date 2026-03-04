import { HALF_TILE_W, HALF_TILE_H } from './constants.js';
import type { Position, ScreenPosition } from './types.js';

/**
 * Convert tile coordinates (cartesian) to screen coordinates (isometric).
 * Origin (0,0) maps to screen (0,0).
 */
export function tileToScreen(tileX: number, tileY: number): ScreenPosition {
  return {
    sx: (tileX - tileY) * HALF_TILE_W,
    sy: (tileX + tileY) * HALF_TILE_H,
  };
}

/**
 * Convert screen coordinates to tile coordinates.
 * Returns floating-point tile position.
 */
export function screenToTile(screenX: number, screenY: number): Position {
  const tileX = (screenX / HALF_TILE_W + screenY / HALF_TILE_H) / 2;
  const tileY = (screenY / HALF_TILE_H - screenX / HALF_TILE_W) / 2;
  return { x: tileX, y: tileY };
}

/**
 * Convert screen coordinates to tile coordinates, rounded to nearest tile.
 */
export function screenToTileRounded(screenX: number, screenY: number): Position {
  const pos = screenToTile(screenX, screenY);
  return { x: Math.round(pos.x), y: Math.round(pos.y) };
}

/**
 * Get the distance between two tile positions.
 */
export function tileDistance(a: Position, b: Position): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Octile heuristic for A* (8-direction movement).
 */
export function octileHeuristic(a: Position, b: Position): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
}
