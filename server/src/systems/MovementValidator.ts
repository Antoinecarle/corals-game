import { MOVE_SPEED, ZONE_SIZE } from '@pirate-mmo/shared';
import { CollisionGrid } from './CollisionGrid.js';
import { config } from '../config.js';

const MAX_MOVE_PER_TICK = MOVE_SPEED / config.tickRate;
// Allow some tolerance for network jitter
const MOVE_TOLERANCE = MAX_MOVE_PER_TICK * 2.5;

export class MovementValidator {
  private collisionGrid: CollisionGrid;

  constructor(collisionGrid: CollisionGrid) {
    this.collisionGrid = collisionGrid;
  }

  /**
   * Check if a target position is valid for movement.
   * Returns the validated (possibly clamped) position.
   */
  validate(
    currentX: number,
    currentY: number,
    targetX: number,
    targetY: number,
  ): { valid: boolean; x: number; y: number } {
    // Clamp to zone bounds
    targetX = Math.max(0, Math.min(ZONE_SIZE - 1, targetX));
    targetY = Math.max(0, Math.min(ZONE_SIZE - 1, targetY));

    // Check teleport distance (anti-cheat)
    const dx = targetX - currentX;
    const dy = targetY - currentY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > MOVE_TOLERANCE) {
      // Too far - possible cheat, reject
      return { valid: false, x: currentX, y: currentY };
    }

    // Check collision at target
    if (!this.collisionGrid.isWalkable(targetX, targetY)) {
      return { valid: false, x: currentX, y: currentY };
    }

    return { valid: true, x: targetX, y: targetY };
  }
}
