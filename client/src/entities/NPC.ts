import type { Texture } from 'pixi.js';
import type { Direction } from '@pirate-mmo/shared';
import { Entity } from './Entity.js';
import { AnimationController } from '../rendering/AnimationController.js';
import { NameLabel } from '../rendering/NameLabel.js';

/**
 * Static NPC entity (Phase 1: no AI, just stands on map).
 */
export class NPC extends Entity {
  private animator: AnimationController;
  private nameLabel: NameLabel;

  constructor(
    tileX: number,
    tileY: number,
    name: string,
    direction: Direction,
    frames: Map<string, Texture>,
  ) {
    super(tileX, tileY);
    this.direction = direction;

    this.animator = new AnimationController(frames);
    this.animator.setDirection(direction);
    this.nameLabel = new NameLabel(name, 0x53a8d4);
    this.container.addChild(this.nameLabel.getText());

    const tex = this.animator.getCurrentTexture();
    if (tex) this.setTexture(tex);
  }

  update(dt: number): void {
    this.animator.update(dt);
    const tex = this.animator.getCurrentTexture();
    if (tex) this.setTexture(tex);
  }

  /** Expose animator for AI-driven state changes (walk, attack, emote…) and hot-swap. */
  getAnimator(): AnimationController {
    return this.animator;
  }
}
