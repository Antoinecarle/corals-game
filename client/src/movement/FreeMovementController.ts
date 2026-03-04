import { MOVE_SPEED, vectorToDirection } from '@pirate-mmo/shared';
import type { Direction } from '@pirate-mmo/shared';
import type { GridCollision } from './GridCollision.js';
import type { MovementState } from './MovementController.js';

/**
 * Free WASD movement — no pathfinding, direct keyboard → smooth position.
 *
 * ISO screen-aligned key mapping:
 *   W  = screen-up    → tile (dx-1, dy-1) = NW
 *   S  = screen-down  → tile (dx+1, dy+1) = SE
 *   A  = screen-left  → tile (dx-1, dy+1) = SW
 *   D  = screen-right → tile (dx+1, dy-1) = NE
 *
 * Diagonals (two keys): W+D=N, W+A=W, S+D=E, S+A=S
 */
export class FreeMovementController {
  private x: number;
  private y: number;
  private direction: Direction = 0;
  private isMoving = false;
  private readonly keys = new Set<string>();
  private posUpdateTimer = 0;
  private readonly POS_UPDATE_INTERVAL = 0.05; // send network pos every 50ms

  // Callback to notify server of position changes
  private onPositionUpdate: ((x: number, y: number) => void) | null = null;

  constructor(
    startX: number,
    startY: number,
    private readonly collision: GridCollision,
    private readonly speed = MOVE_SPEED * 1.6,
  ) {
    this.x = startX;
    this.y = startY;
  }

  setPositionUpdateCallback(cb: (x: number, y: number) => void): void {
    this.onPositionUpdate = cb;
  }

  keyDown(key: string): void {
    this.keys.add(key.toLowerCase());
  }

  keyUp(key: string): void {
    this.keys.delete(key.toLowerCase());
  }

  update(dt: number): MovementState {
    const k = this.keys;
    const up    = k.has('w') || k.has('arrowup');
    const down  = k.has('s') || k.has('arrowdown');
    const left  = k.has('a') || k.has('arrowleft');
    const right = k.has('d') || k.has('arrowright');

    // Tile-space deltas (iso screen-aligned)
    let dx = 0, dy = 0;
    if (up)    { dx -= 1; dy -= 1; }
    if (down)  { dx += 1; dy += 1; }
    if (left)  { dx -= 1; dy += 1; }
    if (right) { dx += 1; dy -= 1; }

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      const ndx = dx / len;
      const ndy = dy / len;
      const step = this.speed * dt;

      // Slide collision: try each axis independently
      const nx = this.x + ndx * step;
      const ny = this.y + ndy * step;
      const canX = this.collision.isWalkable(nx, this.y);
      const canY = this.collision.isWalkable(this.x, ny);

      if (canX) this.x = nx;
      if (canY) this.y = ny;

      if (canX || canY) {
        this.direction = vectorToDirection(ndx, ndy);
        this.isMoving = true;

        // Throttle network position updates
        this.posUpdateTimer += dt;
        if (this.posUpdateTimer >= this.POS_UPDATE_INTERVAL) {
          this.posUpdateTimer = 0;
          this.onPositionUpdate?.(this.x, this.y);
        }
      } else {
        this.isMoving = false;
      }
    } else {
      if (this.isMoving) {
        // Just stopped — send final position
        this.onPositionUpdate?.(this.x, this.y);
      }
      this.isMoving = false;
      this.posUpdateTimer = 0;
    }

    return { x: this.x, y: this.y, direction: this.direction, isMoving: this.isMoving };
  }

  getX(): number { return this.x; }
  getY(): number { return this.y; }
  getDirection(): Direction { return this.direction; }
  getIsMoving(): boolean { return this.isMoving; }

  /** Teleport to position (zone transitions, respawn). */
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.isMoving = false;
  }
}
