import type { Texture } from 'pixi.js';
import type { Direction } from '@pirate-mmo/shared';
import { CONFIG } from '../config.js';

const DIR_NAMES: Record<number, string> = {
  0: 'S', 1: 'SW', 2: 'W', 3: 'NW',
  4: 'N', 5: 'NE', 6: 'E', 7: 'SE',
};

/**
 * Animation state machine: idle/walk x 8 directions.
 * Cycles through frames at configured duration.
 */
export class AnimationManager {
  private frames: Map<string, Texture>;
  private state: 'idle' | 'walk' = 'idle';
  private direction: Direction = 0;
  private currentFrame = 0;
  private frameTimer = 0;
  private walkFrameCount = 4;
  private idleFrameCount = 1;

  constructor(frames: Map<string, Texture>) {
    this.frames = frames;
  }

  setState(state: 'idle' | 'walk'): void {
    if (this.state !== state) {
      this.state = state;
      this.currentFrame = 0;
      this.frameTimer = 0;
    }
  }

  setDirection(dir: Direction): void {
    this.direction = dir;
  }

  update(dt: number): void {
    this.frameTimer += dt * 1000; // convert to ms

    const duration = this.state === 'walk'
      ? CONFIG.WALK_FRAME_DURATION
      : CONFIG.IDLE_FRAME_DURATION;

    const maxFrames = this.state === 'walk'
      ? this.walkFrameCount
      : this.idleFrameCount;

    if (this.frameTimer >= duration) {
      this.frameTimer -= duration;
      this.currentFrame = (this.currentFrame + 1) % maxFrames;
    }
  }

  getCurrentTexture(): Texture | null {
    const dirName = DIR_NAMES[this.direction] ?? 'S';
    const key = `${this.state}_${this.currentFrame}_${dirName}`;
    return this.frames.get(key) ?? null;
  }
}
