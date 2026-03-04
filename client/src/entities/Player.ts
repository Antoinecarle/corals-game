import type { Texture } from 'pixi.js';
import type { Direction } from '@pirate-mmo/shared';
import { Entity } from './Entity.js';
import { MovementController, type MovementState } from '../movement/MovementController.js';
import { AnimationManager } from '../rendering/AnimationManager.js';
import { NameLabel } from '../rendering/NameLabel.js';

/**
 * Local player entity: handles input → pathfinding → movement → animation.
 */
export class Player extends Entity {
  private movement: MovementController;
  private animator: AnimationManager;
  private nameLabel: NameLabel;

  constructor(
    tileX: number,
    tileY: number,
    name: string,
    movement: MovementController,
    frames: Map<string, Texture>,
  ) {
    super(tileX, tileY);

    this.movement = movement;
    this.animator = new AnimationManager(frames);
    this.nameLabel = new NameLabel(name);
    this.container.addChild(this.nameLabel.getText());

    // Set initial texture
    const tex = this.animator.getCurrentTexture();
    if (tex) this.setTexture(tex);
  }

  /**
   * Move to a tile via pathfinding.
   */
  moveTo(targetX: number, targetY: number): void {
    this.movement.setTarget(targetX, targetY);
  }

  /**
   * Update each frame.
   */
  update(dt: number): void {
    const state: MovementState = this.movement.update(dt);
    this.tileX = state.x;
    this.tileY = state.y;
    this.direction = state.direction;

    // Update animation
    this.animator.setState(state.isMoving ? 'walk' : 'idle');
    this.animator.setDirection(state.direction);
    this.animator.update(dt);

    const tex = this.animator.getCurrentTexture();
    if (tex) this.setTexture(tex);

    this.updateScreenPosition();
  }

  getMovement(): MovementController {
    return this.movement;
  }
}
