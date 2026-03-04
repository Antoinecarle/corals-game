import { MOVE_SPEED, vectorToDirection, type Direction } from '@pirate-mmo/shared';
import { Pathfinder } from './Pathfinder.js';

export interface MovementState {
  x: number;
  y: number;
  direction: Direction;
  isMoving: boolean;
}

/**
 * Handles click-to-move: takes a target tile, runs pathfinding,
 * and moves the entity along the path each frame.
 */
export class MovementController {
  private path: Array<{ x: number; y: number }> = [];
  private pathIndex = 0;
  private x: number;
  private y: number;
  private direction: Direction = 0;
  private isMoving = false;
  private pathfinder: Pathfinder;

  constructor(startX: number, startY: number, pathfinder: Pathfinder) {
    this.x = startX;
    this.y = startY;
    this.pathfinder = pathfinder;
  }

  /**
   * Set a new movement target. Runs A* pathfinding.
   */
  setTarget(targetX: number, targetY: number): void {
    const path = this.pathfinder.findPath(this.x, this.y, targetX, targetY);
    if (path.length > 0) {
      this.path = path;
      this.pathIndex = 0;
      this.isMoving = true;
    }
  }

  /**
   * Stop movement immediately.
   */
  stop(): void {
    this.path = [];
    this.pathIndex = 0;
    this.isMoving = false;
  }

  /**
   * Update movement each frame. Returns current state.
   */
  update(dt: number): MovementState {
    if (!this.isMoving || this.pathIndex >= this.path.length) {
      this.isMoving = false;
      return { x: this.x, y: this.y, direction: this.direction, isMoving: false };
    }

    const target = this.path[this.pathIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.05) {
      // Reached waypoint
      this.x = target.x;
      this.y = target.y;
      this.pathIndex++;

      if (this.pathIndex >= this.path.length) {
        this.isMoving = false;
      }
    } else {
      // Move towards waypoint
      const step = MOVE_SPEED * dt;
      const ratio = Math.min(step / dist, 1);
      this.x += dx * ratio;
      this.y += dy * ratio;
      this.direction = vectorToDirection(dx, dy);
    }

    return { x: this.x, y: this.y, direction: this.direction, isMoving: this.isMoving };
  }

  getX(): number { return this.x; }
  getY(): number { return this.y; }
  getDirection(): Direction { return this.direction; }
  getIsMoving(): boolean { return this.isMoving; }

  /** Teleport to position (for zone transitions). */
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.stop();
  }
}
