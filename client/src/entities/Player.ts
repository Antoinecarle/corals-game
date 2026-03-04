import type { Texture } from 'pixi.js';
import { Entity } from './Entity.js';
import type { FreeMovementController } from '../movement/FreeMovementController.js';
import { AnimationController } from '../rendering/AnimationController.js';
import { NameLabel } from '../rendering/NameLabel.js';

/**
 * Local player entity: reads FreeMovementController state → animation.
 */
export class Player extends Entity {
  private movement: FreeMovementController;
  private animator: AnimationController;
  private nameLabel: NameLabel;

  constructor(
    tileX: number,
    tileY: number,
    name: string,
    movement: FreeMovementController,
    frames: Map<string, Texture>,
  ) {
    super(tileX, tileY);
    this.movement = movement;
    this.animator = new AnimationController(frames);
    this.nameLabel = new NameLabel(name);
    this.container.addChild(this.nameLabel.getText());

    const tex = this.animator.getCurrentTexture();
    if (tex) this.setTexture(tex);
  }

  update(dt: number): void {
    const state = this.movement.update(dt);
    this.tileX = state.x;
    this.tileY = state.y;
    this.direction = state.direction;

    this.animator.setState(state.isMoving ? 'walk' : 'idle');
    this.animator.setDirection(state.direction);
    this.animator.update(dt);

    const tex = this.animator.getCurrentTexture();
    if (tex) this.setTexture(tex);

    this.updateScreenPosition();
  }

  getMovement(): FreeMovementController {
    return this.movement;
  }

  /** Expose animator for hot-swapping spritesheet frames or triggering one-shot states (attack, hurt…). */
  getAnimator(): AnimationController {
    return this.animator;
  }
}
