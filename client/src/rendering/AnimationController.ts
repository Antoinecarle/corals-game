import type { Texture } from 'pixi.js';
import type { Direction } from '@pirate-mmo/shared';
import { CONFIG } from '../config.js';

const DIR_NAMES: Record<number, string> = {
  0: 'S', 1: 'SW', 2: 'W', 3: 'NW',
  4: 'N', 5: 'NE', 6: 'E', 7: 'SE',
};

/**
 * Definition of a single animation state.
 */
export interface AnimationDef {
  /** Total number of frames in this animation. */
  frameCount: number;
  /** Duration per frame in milliseconds. */
  frameDuration: number;
  /**
   * Whether the animation loops back to frame 0 when finished.
   * Non-looping animations hold the last frame and mark isDone() = true.
   */
  loop: boolean;
}

/**
 * Built-in animation states.
 * Add more via registerAnimation() at runtime or pass extraAnimations to constructor.
 */
const DEFAULT_ANIMATIONS: Record<string, AnimationDef> = {
  idle:   { frameCount: 1, frameDuration: CONFIG.IDLE_FRAME_DURATION, loop: true  },
  walk:   { frameCount: 4, frameDuration: CONFIG.WALK_FRAME_DURATION, loop: true  },
  attack: { frameCount: 6, frameDuration: 80,  loop: false },
  hurt:   { frameCount: 2, frameDuration: 120, loop: false },
  death:  { frameCount: 5, frameDuration: 150, loop: false },
};

/**
 * Extended animation state machine: arbitrary states × 8 isometric directions.
 *
 * Drop-in replacement for AnimationManager (same constructor + public API)
 * with additional capabilities:
 *   - Any state name (idle, walk, attack, hurt, death, emote_*, …)
 *   - Per-state configurable frameCount, frameDuration, and loop flag
 *   - isDone() signal for one-shot (non-looping) animations
 *   - setFrames() for hot-swapping procedural ↔ spritesheet textures
 *   - registerAnimation() for runtime extension
 *
 * Frame key convention (must match the texture Map keys):
 *   `{state}_{frameIndex}_{directionName}`
 *   e.g. "walk_2_NE", "idle_0_S", "attack_3_SW"
 *
 * Direction names: S, SW, W, NW, N, NE, E, SE  (Direction 0-7)
 */
export class AnimationController {
  private frames: Map<string, Texture>;
  private animations: Map<string, AnimationDef>;
  private currentState = 'idle';
  private direction: Direction = 0;
  private currentFrame = 0;
  private frameTimer = 0;
  /** True when a non-looping animation has played through to the last frame. */
  private done = false;

  constructor(
    frames: Map<string, Texture>,
    extraAnimations?: Record<string, AnimationDef>,
  ) {
    this.frames = frames;
    this.animations = new Map(Object.entries(DEFAULT_ANIMATIONS));
    if (extraAnimations) {
      for (const [name, def] of Object.entries(extraAnimations)) {
        this.animations.set(name, def);
      }
    }
  }

  // ─── State control ────────────────────────────────────────────────────────

  /**
   * Switch to the given state. Resets frame counter and timer.
   * Re-triggering the same non-looping state restarts it from frame 0.
   * Unknown state names are silently ignored (current state is preserved).
   */
  setState(state: string): void {
    // Allow restarting a one-shot even from the same state
    if (this.currentState === state && !this.done) return;

    if (!this.animations.has(state)) {
      // Unknown state — fall through to avoid corrupting current animation
      return;
    }
    this.currentState = state;
    this.currentFrame = 0;
    this.frameTimer = 0;
    this.done = false;
  }

  setDirection(dir: Direction): void {
    this.direction = dir;
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  getState(): string { return this.currentState; }
  getDirection(): Direction { return this.direction; }

  /**
   * True once a non-looping animation has reached its last frame.
   * Always false for looping animations.
   * Resets automatically when setState() is called.
   */
  isDone(): boolean { return this.done; }

  // ─── Per-frame update ─────────────────────────────────────────────────────

  update(dt: number): void {
    if (this.done) return;

    const def = this.animations.get(this.currentState);
    if (!def) return;

    this.frameTimer += dt * 1000; // seconds → milliseconds

    if (this.frameTimer >= def.frameDuration) {
      this.frameTimer -= def.frameDuration;
      this.currentFrame++;

      if (this.currentFrame >= def.frameCount) {
        if (def.loop) {
          this.currentFrame = 0;
        } else {
          this.currentFrame = def.frameCount - 1; // hold last frame
          this.done = true;
        }
      }
    }
  }

  getCurrentTexture(): Texture | null {
    const dirName = DIR_NAMES[this.direction] ?? 'S';
    const key = `${this.currentState}_${this.currentFrame}_${dirName}`;
    return this.frames.get(key) ?? null;
  }

  // ─── Extension API ────────────────────────────────────────────────────────

  /**
   * Register or override an animation definition.
   * Must be called before setState() to take effect for the new definition.
   *
   * @example
   * animator.registerAnimation('swim', { frameCount: 6, frameDuration: 120, loop: true });
   */
  registerAnimation(state: string, def: AnimationDef): void {
    this.animations.set(state, def);
  }

  /**
   * Hot-swap the texture source without recreating entities.
   *
   * Use case: upgrade from procedurally-generated frames to high-res
   * spritesheet frames loaded asynchronously in the background.
   *
   * @example
   * const spritesheetFrames = await SpritesheetLoader.load('assets/sprites/player/player.json');
   * player.getAnimator().setFrames(spritesheetFrames);
   */
  setFrames(frames: Map<string, Texture>): void {
    this.frames = frames;
  }
}
