import type { Texture } from 'pixi.js';
import type { Direction } from '@pirate-mmo/shared';
import { Entity } from './Entity.js';
import { AnimationController } from '../rendering/AnimationController.js';
import { NameLabel } from '../rendering/NameLabel.js';

/**
 * Remote player entity: receives position updates from server,
 * interpolates between them for smooth movement.
 */
export class RemotePlayer extends Entity {
  private animator: AnimationController;
  private nameLabel: NameLabel;
  private targetX: number;
  private targetY: number;
  private isMoving = false;
  private interpSpeed = 8; // lerp speed factor

  constructor(
    tileX: number,
    tileY: number,
    name: string,
    frames: Map<string, Texture>,
  ) {
    super(tileX, tileY);
    this.targetX = tileX;
    this.targetY = tileY;

    this.animator = new AnimationController(frames);
    this.nameLabel = new NameLabel(name);
    this.container.addChild(this.nameLabel.getText());

    const tex = this.animator.getCurrentTexture();
    if (tex) this.setTexture(tex);
  }

  /**
   * Receive server state update.
   */
  setServerState(x: number, y: number, direction: Direction, animation: string): void {
    this.targetX = x;
    this.targetY = y;
    this.direction = direction;
    this.isMoving = animation === 'walk';
    // Forward any server-driven animation state (attack, hurt, death, etc.)
    this.animator.setState(animation);
  }

  /**
   * Interpolate towards server position each frame.
   */
  update(dt: number): void {
    // Lerp position
    const dx = this.targetX - this.tileX;
    const dy = this.targetY - this.tileY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0.01) {
      const t = Math.min(this.interpSpeed * dt, 1);
      this.tileX += dx * t;
      this.tileY += dy * t;
    } else {
      this.tileX = this.targetX;
      this.tileY = this.targetY;
    }

    // Update direction; state is set by setServerState() to support attack/hurt/death
    this.animator.setDirection(this.direction);
    this.animator.update(dt);

    const tex = this.animator.getCurrentTexture();
    if (tex) this.setTexture(tex);

    this.updateScreenPosition();
  }
}
