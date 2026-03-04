import { Assets, Texture } from 'pixi.js';
import type { Spritesheet } from 'pixi.js';

/**
 * TexturePacker JSON Hash format (v3) — only the fields we consume.
 */
export interface TexturePackerData {
  frames: Record<string, {
    frame: { x: number; y: number; w: number; h: number };
    rotated?: boolean;
    trimmed?: boolean;
    spriteSourceSize?: { x: number; y: number; w: number; h: number };
    sourceSize?: { w: number; h: number };
    pivot?: { x: number; y: number };
  }>;
  meta: {
    image: string;
    format?: string;
    size: { w: number; h: number };
    scale: string | number;
  };
}

/**
 * Loads TexturePacker spritesheet assets (JSON Hash + PNG) and converts them
 * into the `Map<string, Texture>` format consumed by AnimationController.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * NAMING CONVENTION — TexturePacker frame names
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Frame names MUST follow the pattern:
 *
 *   {state}_{frameIndex}_{direction}
 *
 *   state      — animation state name:  idle, walk, attack, hurt, death, …
 *   frameIndex — zero-based frame index: 0, 1, 2, 3, …
 *   direction  — isometric direction:   S, SW, W, NW, N, NE, E, SE
 *
 * Examples:
 *   walk_0_S       walk_1_NE      idle_0_W
 *   attack_3_SE    hurt_0_N       death_4_SW
 *
 * TexturePacker may append a file extension (.png, .jpg) — the loader
 * strips it automatically so both formats work.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * TEXTUREPACKER EXPORT SETTINGS
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Data format  : JSON Hash
 * Texture format: PNG (or WebP for smaller files)
 * Algorithm    : MaxRects Best Short Side Fit
 * Allow Rotate : DISABLED (rotation breaks isometric sprites)
 * Trim         : Enabled (reduces atlas size; pivot is preserved)
 * Scale        : 1x (add @2x suffix for HiDPI variant)
 *
 * ──────────────────────────────────────────────────────────────────────────
 * RECOMMENDED ASSET DIRECTORY LAYOUT
 * ──────────────────────────────────────────────────────────────────────────
 *
 *   client/public/assets/sprites/
 *   ├── player/
 *   │   ├── player.json          ← TexturePacker data (references player.png)
 *   │   └── player.png           ← Atlas image
 *   ├── npc_merchant/
 *   │   ├── npc_merchant.json
 *   │   └── npc_merchant.png
 *   ├── npc_captain/
 *   │   ├── npc_captain.json
 *   │   └── npc_captain.png
 *   └── ...
 *
 * ──────────────────────────────────────────────────────────────────────────
 * ANIMATION SPRITESHEET LAYOUT (per-character atlas)
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Group frames by state, then direction, then frame index:
 *
 *   idle_0_S     idle_0_SW   idle_0_W  …  idle_0_SE    (8 frames = 1 row)
 *   walk_0_S     walk_0_SW   …            walk_0_SE    (8 frames)
 *   walk_1_S     walk_1_SW   …            walk_1_SE    (8 frames)
 *   walk_2_S     walk_2_SW   …            walk_2_SE    (8 frames)
 *   walk_3_S     walk_3_SW   …            walk_3_SE    (8 frames)
 *   attack_0_S   …                                     (8 frames per attack frame)
 *   …
 *
 * Total frames for player (idle + walk + attack + hurt + death):
 *   = (1 + 4 + 6 + 2 + 5) states × 8 directions = 144 frames
 *
 * ──────────────────────────────────────────────────────────────────────────
 * LAYERED CHARACTERS (modular equipment system)
 * ──────────────────────────────────────────────────────────────────────────
 *
 * For the modular equipment system described in CLAUDE.md, each layer
 * (body, head, weapon, armor, accessory) is a separate atlas following the
 * same naming convention. Use SpritesheetLoader.merge() to combine them:
 *
 *   const body    = await SpritesheetLoader.load('assets/sprites/layers/body_pirate.json');
 *   const armor   = await SpritesheetLoader.load('assets/sprites/layers/armor_iron.json');
 *   const weapon  = await SpritesheetLoader.load('assets/sprites/layers/weapon_sword.json');
 *   const merged  = SpritesheetLoader.merge(body, armor, weapon);
 *   player.getAnimator().setFrames(merged);
 */
export class SpritesheetLoader {
  /**
   * Load a spritesheet from a JSON url.
   * PixiJS Assets resolves the atlas image path from the JSON `meta.image` field.
   *
   * @param jsonUrl - Path relative to `/public`, e.g. "assets/sprites/player/player.json"
   * @returns Map of `{state}_{frame}_{direction}` → Texture
   *
   * @example
   * const frames = await SpritesheetLoader.load('assets/sprites/player/player.json');
   * player.getAnimator().setFrames(frames);
   */
  static async load(jsonUrl: string): Promise<Map<string, Texture>> {
    const spritesheet = await Assets.load<Spritesheet>(jsonUrl);
    return SpritesheetLoader.extractFrames(spritesheet.textures);
  }

  /**
   * Extract and normalize frame keys from a PixiJS textures record.
   * File extensions (.png, .jpg, .jpeg, .webp) are stripped automatically.
   *
   * @param textures - Raw textures record from a parsed Spritesheet
   */
  static extractFrames(textures: Record<string, Texture>): Map<string, Texture> {
    const frames = new Map<string, Texture>();
    for (const [name, texture] of Object.entries(textures)) {
      const key = name.replace(/\.(png|jpg|jpeg|webp)$/i, '');
      frames.set(key, texture);
    }
    return frames;
  }

  /**
   * Merge multiple frame maps into one.
   * Later maps override earlier ones on key collision — use this to layer
   * equipment on top of a base body spritesheet.
   *
   * @example
   * // Combine body + equipped armor + weapon
   * const merged = SpritesheetLoader.merge(bodyFrames, armorFrames, weaponFrames);
   */
  static merge(...frameMaps: Array<Map<string, Texture>>): Map<string, Texture> {
    const merged = new Map<string, Texture>();
    for (const map of frameMaps) {
      for (const [key, texture] of map) {
        merged.set(key, texture);
      }
    }
    return merged;
  }

  /**
   * Blend procedural frames with spritesheet frames.
   * Spritesheet keys take priority — any key present in `spritesheet` overrides
   * the corresponding entry in `procedural`.
   *
   * Useful for a graceful upgrade path:
   *   1. Game starts with procedural frames (instant, no network)
   *   2. Spritesheet downloads in background
   *   3. Call blend() and setFrames() to swap in the real art
   *
   * @example
   * const spritesheetFrames = await SpritesheetLoader.load('assets/sprites/player/player.json');
   * const final = SpritesheetLoader.blend(assets.playerFrames, spritesheetFrames);
   * player.getAnimator().setFrames(final);
   */
  static blend(
    procedural: Map<string, Texture>,
    spritesheet: Map<string, Texture>,
  ): Map<string, Texture> {
    return SpritesheetLoader.merge(procedural, spritesheet);
  }

  /**
   * Preload multiple spritesheets in parallel and return them individually.
   * Useful for loading all NPC sheets at startup without blocking.
   *
   * @example
   * const [playerFrames, merchantFrames] = await SpritesheetLoader.loadAll([
   *   'assets/sprites/player/player.json',
   *   'assets/sprites/npc_merchant/npc_merchant.json',
   * ]);
   */
  static async loadAll(jsonUrls: string[]): Promise<Array<Map<string, Texture>>> {
    return Promise.all(jsonUrls.map((url) => SpritesheetLoader.load(url)));
  }
}
