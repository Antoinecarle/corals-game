import { Graphics, Application, Texture } from 'pixi.js';
import { TILE_WIDTH, TILE_HEIGHT } from '@pirate-mmo/shared';

const HALF_W = TILE_WIDTH / 2;  // 32
const HALF_H = TILE_HEIGHT / 2; // 16

export enum TileType {
  Water = 0,
  Sand = 1,
  Grass = 2,
  Stone = 3,
  Wood = 4,
}

// Base colors per tile type (used by variants)
const TILE_PALETTES: Record<TileType, { base: number[]; dark: number[] }> = {
  [TileType.Water]: {
    base: [0x0e4a6b, 0x126080, 0x0d5575, 0x2196b8, 0x1a8aaa, 0x157090],
    dark: [0x093550, 0x0d4a60, 0x094060, 0x187898, 0x146a88, 0x105870],
  },
  [TileType.Sand]: {
    base: [0xd4b86a, 0xc9ad5e, 0xddc070, 0xbfa458, 0xd8bd72, 0xceb265],
    dark: [0xb89c55, 0xad9248, 0xbfa45a, 0xa38d45, 0xb8a05c, 0xb09850],
  },
  [TileType.Grass]: {
    base: [0x4a8c3f, 0x3d7a32, 0x55994a, 0x468538, 0x3a7530, 0x508e42],
    dark: [0x3a7030, 0x2e6225, 0x44803a, 0x366c28, 0x2c5e22, 0x407535],
  },
  [TileType.Stone]: {
    base: [0x7a7a7a, 0x6e6e6e, 0x858585, 0x727272, 0x808080, 0x767676],
    dark: [0x5e5e5e, 0x555555, 0x686868, 0x5a5a5a, 0x636363, 0x5c5c5c],
  },
  [TileType.Wood]: {
    base: [0x8b5e3c, 0x7f5535, 0x956640, 0x8b5e3c, 0x7f5535, 0x956640],
    dark: [0x704a2e, 0x654028, 0x7a5032, 0x704a2e, 0x654028, 0x7a5032],
  },
};

export interface GeneratedAssets {
  tiles: Map<TileType, Texture[]>; // 6 variants per type
  transitions: Map<string, Texture>; // "sand_grass_N", etc.
  playerFrames: Map<string, Texture>;
  npcFrames: Map<string, Texture>;
  treeTexture: Texture;
  rockTexture: Texture;
  bushTexture: Texture;
  crateTexture: Texture;
  lanternTexture: Texture;
  palmTexture: Texture;
  decoTextures: Map<string, Texture>; // decoration textures
  // Tide system textures
  siphonTexture: Texture;
  tidePillarTexture: Texture;
  lootDropCommon: Texture;
  lootDropUncommon: Texture;
}

/**
 * Generates all game assets procedurally using PixiJS Graphics.
 * Tile textures now have 6 variants each for visual variety.
 */
export class AssetLoader {
  private assets!: GeneratedAssets;

  async generate(app: Application): Promise<GeneratedAssets> {
    // Generate tile variants (6 per type)
    const tiles = new Map<TileType, Texture[]>();
    for (const type of [TileType.Water, TileType.Sand, TileType.Grass, TileType.Stone, TileType.Wood]) {
      const variants: Texture[] = [];
      for (let v = 0; v < 6; v++) {
        variants.push(this.generateTileVariant(app, type, v));
      }
      tiles.set(type, variants);
    }

    // Generate transition overlays
    const transitions = this.generateTransitions(app);

    const playerFrames = this.generateCharacterFrames(app, 0xd4a853, 0xb08930);
    const npcFrames = this.generateCharacterFrames(app, 0x53a8d4, 0x3080b0);

    const treeTexture = this.generateTreeTexture(app);
    const rockTexture = this.generateRockTexture(app);
    const bushTexture = this.generateBushTexture(app);
    const crateTexture = this.generateCrateTexture(app);
    const lanternTexture = this.generateLanternTexture(app);
    const palmTexture = this.generatePalmTexture(app);

    const decoTextures = this.generateDecoTextures(app);

    // Tide system textures
    const siphonTexture = this.generateSiphonTexture(app);
    const tidePillarTexture = this.generateTidePillarTexture(app);
    const lootDropCommon = this.generateLootDropTexture(app, 'common');
    const lootDropUncommon = this.generateLootDropTexture(app, 'uncommon');

    this.assets = {
      tiles, transitions, playerFrames, npcFrames,
      treeTexture, rockTexture, bushTexture, crateTexture, lanternTexture, palmTexture,
      decoTextures,
      siphonTexture, tidePillarTexture, lootDropCommon, lootDropUncommon,
    };
    return this.assets;
  }

  getAssets(): GeneratedAssets {
    return this.assets;
  }

  // ---- Tile variant generation ----

  private generateTileVariant(app: Application, type: TileType, variant: number): Texture {
    const g = new Graphics();
    const palette = TILE_PALETTES[type];
    const baseColor = palette.base[variant];
    const darkColor = palette.dark[variant];

    // Seeded pseudo-random for deterministic detail placement per variant
    let rng = type * 1000 + variant * 137 + 42;
    const rand = () => { rng = (rng * 16807) % 2147483647; return (rng & 0x7fffffff) / 0x7fffffff; };

    // Base isometric diamond
    const diamond = [
      { x: HALF_W, y: 0 },
      { x: TILE_WIDTH, y: HALF_H },
      { x: HALF_W, y: TILE_HEIGHT },
      { x: 0, y: HALF_H },
    ];
    g.poly(diamond);
    g.fill(baseColor);

    // Subtle edge line
    g.poly(diamond);
    g.stroke({ width: 0.5, color: darkColor, alpha: 0.25 });

    // Per-type detail overlays
    switch (type) {
      case TileType.Water:
        this.addWaterDetails(g, variant, rand);
        break;
      case TileType.Sand:
        this.addSandDetails(g, variant, rand);
        break;
      case TileType.Grass:
        this.addGrassDetails(g, variant, rand, baseColor);
        break;
      case TileType.Stone:
        this.addStoneDetails(g, variant, rand);
        break;
      case TileType.Wood:
        this.addWoodDetails(g, variant, rand);
        break;
    }

    const texture = app.renderer.generateTexture(g);
    g.destroy();
    return texture;
  }

  private addWaterDetails(g: Graphics, variant: number, rand: () => number): void {
    // Wave lines at varying positions
    const waveCount = 2 + (variant % 3);
    for (let i = 0; i < waveCount; i++) {
      const yOff = 6 + rand() * 20;
      const xStart = 12 + rand() * 8;
      const xEnd = xStart + 12 + rand() * 16;
      const clampedXStart = Math.max(10, Math.min(54, xStart));
      const clampedXEnd = Math.max(clampedXStart + 4, Math.min(54, xEnd));
      g.moveTo(clampedXStart, yOff);
      g.lineTo(clampedXEnd, yOff);
      g.stroke({ width: 1, color: 0x3a9bba, alpha: 0.3 + rand() * 0.2 });
    }

    // Foam dots for shallow variants (4, 5)
    if (variant >= 4) {
      for (let i = 0; i < 4; i++) {
        const fx = 14 + rand() * 36;
        const fy = 6 + rand() * 20;
        g.circle(fx, fy, 1);
        g.fill({ color: 0xffffff, alpha: 0.15 });
      }
    }
  }

  private addSandDetails(g: Graphics, variant: number, rand: () => number): void {
    // Grain speckles
    const grainCount = 5 + variant * 2;
    for (let i = 0; i < grainCount; i++) {
      const gx = 10 + rand() * 44;
      const gy = 4 + rand() * 24;
      g.circle(gx, gy, 0.5 + rand() * 0.5);
      g.fill({ color: 0xb89c55, alpha: 0.3 + rand() * 0.3 });
    }

    // Small shell marks on variants 2, 3
    if (variant === 2 || variant === 3) {
      const sx = 18 + rand() * 24;
      const sy = 8 + rand() * 14;
      g.circle(sx, sy, 1.5);
      g.stroke({ width: 0.5, color: 0xc9b080, alpha: 0.4 });
    }

    // Subtle ripple lines on variant 5
    if (variant === 5) {
      for (let i = 0; i < 2; i++) {
        const ry = 10 + i * 8;
        g.moveTo(16, ry);
        g.lineTo(48, ry + 2);
        g.stroke({ width: 0.5, color: 0xc9ad5e, alpha: 0.2 });
      }
    }
  }

  private addGrassDetails(g: Graphics, variant: number, rand: () => number, baseColor: number): void {
    // Painted grass blade strokes
    const bladeCount = 3 + variant;
    for (let i = 0; i < bladeCount; i++) {
      const bx = 12 + rand() * 40;
      const by = 6 + rand() * 18;
      const len = 2 + rand() * 3;
      g.moveTo(bx, by);
      g.lineTo(bx + (rand() - 0.5) * 2, by - len);
      // Slightly brighter or darker green
      const shade = rand() > 0.5 ? 0x5aa04a : 0x2e6625;
      g.stroke({ width: 0.8, color: shade, alpha: 0.5 + rand() * 0.3 });
    }

    // Flower dots on variants 1, 4
    if (variant === 1 || variant === 4) {
      const colors = [0xe85050, 0xe8d050, 0xf0f0f0];
      for (let i = 0; i < 2; i++) {
        const fx = 16 + rand() * 30;
        const fy = 8 + rand() * 14;
        g.circle(fx, fy, 1);
        g.fill({ color: colors[Math.floor(rand() * 3)], alpha: 0.7 });
      }
    }

    // Small dark patch for depth (variant 0, 3)
    if (variant === 0 || variant === 3) {
      const px = 20 + rand() * 16;
      const py = 10 + rand() * 8;
      g.circle(px, py, 3 + rand() * 2);
      g.fill({ color: 0x2a6020, alpha: 0.15 });
    }
  }

  private addStoneDetails(g: Graphics, variant: number, rand: () => number): void {
    // Crack lines
    const crackCount = 2 + (variant % 3);
    for (let i = 0; i < crackCount; i++) {
      const sx = 14 + rand() * 30;
      const sy = 6 + rand() * 18;
      const ex = sx + (rand() - 0.5) * 16;
      const ey = sy + (rand() - 0.5) * 10;
      g.moveTo(sx, sy);
      g.lineTo(ex, ey);
      g.stroke({ width: 0.7, color: 0x4a4a4a, alpha: 0.4 + rand() * 0.2 });
    }

    // Darker rock patch
    if (variant < 3) {
      const px = 18 + rand() * 20;
      const py = 8 + rand() * 12;
      g.circle(px, py, 4 + rand() * 3);
      g.fill({ color: 0x555555, alpha: 0.2 });
    }

    // Moss hints (green speckles) on variants 4, 5
    if (variant >= 4) {
      for (let i = 0; i < 3; i++) {
        const mx = 12 + rand() * 38;
        const my = 5 + rand() * 20;
        g.circle(mx, my, 1);
        g.fill({ color: 0x4a7a3a, alpha: 0.3 });
      }
    }
  }

  private addWoodDetails(g: Graphics, variant: number, rand: () => number): void {
    // Plank lines
    const plankCount = 3 + (variant % 2);
    for (let i = 0; i < plankCount; i++) {
      const ly = 4 + (i + 1) * (24 / (plankCount + 1)) + rand() * 2;
      g.moveTo(8, ly);
      g.lineTo(56, ly - 2 + rand() * 4);
      g.stroke({ width: 0.6, color: 0x5e4020, alpha: 0.3 + rand() * 0.2 });
    }

    // Knot mark on variant 1, 2
    if (variant === 1 || variant === 2) {
      const kx = 22 + rand() * 16;
      const ky = 10 + rand() * 10;
      g.circle(kx, ky, 2);
      g.stroke({ width: 0.8, color: 0x5e4020, alpha: 0.4 });
    }
  }

  // ---- Transition overlays (biome edges) ----

  private generateTransitions(app: Application): Map<string, Texture> {
    const transitions = new Map<string, Texture>();

    // Transition pairs: from → to (higher priority bleeds onto lower)
    const pairs: [TileType, TileType, number][] = [
      [TileType.Sand, TileType.Water, 0xd4b86a],
      [TileType.Grass, TileType.Sand, 0x4a8c3f],
      [TileType.Grass, TileType.Water, 0x4a8c3f],
      [TileType.Stone, TileType.Grass, 0x7a7a7a],
    ];

    const edges = ['N', 'E', 'S', 'W'] as const;
    // Edge fade direction vectors (where the color fades FROM)
    const edgeFades: Record<string, { startX: number; startY: number; endX: number; endY: number }> = {
      N: { startX: HALF_W, startY: 0, endX: HALF_W, endY: HALF_H * 0.6 },
      S: { startX: HALF_W, startY: TILE_HEIGHT, endX: HALF_W, endY: HALF_H * 1.4 },
      E: { startX: TILE_WIDTH, startY: HALF_H, endX: HALF_W * 1.4, endY: HALF_H },
      W: { startX: 0, startY: HALF_H, endX: HALF_W * 0.6, endY: HALF_H },
    };

    for (const [from, _to, color] of pairs) {
      for (const edge of edges) {
        const g = new Graphics();
        const fade = edgeFades[edge];

        // Draw a semi-transparent wedge from the edge inward
        const diamond = [
          { x: HALF_W, y: 0 },
          { x: TILE_WIDTH, y: HALF_H },
          { x: HALF_W, y: TILE_HEIGHT },
          { x: 0, y: HALF_H },
        ];
        g.poly(diamond);
        g.fill({ color, alpha: 0 }); // clip region

        // Gradient approximation: 3 layers with decreasing alpha
        for (let layer = 0; layer < 3; layer++) {
          const t = layer / 3;
          const alpha = 0.25 * (1 - t);
          const cx = fade.startX + (fade.endX - fade.startX) * t;
          const cy = fade.startY + (fade.endY - fade.startY) * t;
          const radius = 8 + layer * 4;
          g.circle(cx, cy, radius);
          g.fill({ color, alpha });
        }

        const key = `${from}_${_to}_${edge}`;
        transitions.set(key, app.renderer.generateTexture(g));
        g.destroy();
      }
    }

    return transitions;
  }

  // ---- Ground decoration textures ----

  private generateDecoTextures(app: Application): Map<string, Texture> {
    const decos = new Map<string, Texture>();

    // Grass tuft
    {
      const g = new Graphics();
      g.moveTo(4, 10); g.lineTo(3, 3); g.stroke({ width: 1, color: 0x5a9a4a, alpha: 0.7 });
      g.moveTo(6, 10); g.lineTo(7, 2); g.stroke({ width: 1, color: 0x4a8a3a, alpha: 0.7 });
      g.moveTo(8, 10); g.lineTo(9, 4); g.stroke({ width: 0.8, color: 0x5a9a4a, alpha: 0.6 });
      decos.set('grass_tuft', app.renderer.generateTexture(g));
      g.destroy();
    }

    // Flower
    {
      const g = new Graphics();
      g.moveTo(4, 10); g.lineTo(4, 4); g.stroke({ width: 0.8, color: 0x3a7a2a, alpha: 0.7 });
      g.circle(4, 3, 2); g.fill({ color: 0xe85050, alpha: 0.8 });
      g.circle(4, 3, 0.8); g.fill({ color: 0xf0e040, alpha: 0.9 });
      decos.set('flower', app.renderer.generateTexture(g));
      g.destroy();
    }

    // Pebbles
    {
      const g = new Graphics();
      g.circle(3, 6, 1.5); g.fill({ color: 0x8a8a8a, alpha: 0.5 });
      g.circle(7, 4, 1); g.fill({ color: 0x7a7a7a, alpha: 0.4 });
      g.circle(5, 8, 1.2); g.fill({ color: 0x9a9a9a, alpha: 0.4 });
      decos.set('pebbles', app.renderer.generateTexture(g));
      g.destroy();
    }

    // Shell
    {
      const g = new Graphics();
      g.circle(4, 5, 2.5);
      g.stroke({ width: 0.8, color: 0xc9b080, alpha: 0.6 });
      g.moveTo(4, 3); g.lineTo(4, 7);
      g.stroke({ width: 0.5, color: 0xc9b080, alpha: 0.4 });
      decos.set('shell', app.renderer.generateTexture(g));
      g.destroy();
    }

    // Mushroom
    {
      const g = new Graphics();
      g.rect(3, 6, 2, 4); g.fill({ color: 0xc9b080, alpha: 0.7 });
      g.circle(4, 5, 3); g.fill({ color: 0xb04040, alpha: 0.7 });
      g.circle(3, 4, 1); g.fill({ color: 0xf0f0f0, alpha: 0.5 });
      decos.set('mushroom', app.renderer.generateTexture(g));
      g.destroy();
    }

    return decos;
  }

  // ---- Voxel Pirate Character Frames ----

  private generateCharacterFrames(
    app: Application,
    bodyColor: number,
    _darkColor: number,
  ): Map<string, Texture> {
    // Determine palette from body color hue (warm=player, cool=NPC)
    const isPlayer = ((bodyColor >> 16) & 0xff) > ((bodyColor >> 0) & 0xff);
    const pal = isPlayer
      ? { skin: 0xffcc99, skinDark: 0xd89060, hair: 0x1a0e05, coat: 0x1e3054, pants: 0x1a1828, boot: 0x1a0e08, gold: 0xd4a030, belt: 0x5a3a10 }
      : { skin: 0xe8b888, skinDark: 0xc07848, hair: 0x2a1a08, coat: 0x5a1010, pants: 0x1a1828, boot: 0x1a0e08, gold: 0xc8a020, belt: 0x5a3a10 };

    const frames = new Map<string, Texture>();
    const dirNames = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'];
    for (const dn of dirNames) {
      frames.set(`idle_0_${dn}`, this.generateVoxelCharFrame(app, pal, dn, 0));
      for (let f = 0; f < 4; f++) {
        frames.set(`walk_${f}_${dn}`, this.generateVoxelCharFrame(app, pal, dn, f));
      }
    }
    return frames;
  }

  /**
   * Draws an isometric voxel block with 3 visible faces (top/front/side).
   * @param dr  true = depth goes right (S/SE/E facing), false = depth goes left
   */
  private voxBlock(
    g: Graphics,
    x: number, y: number, w: number, h: number,
    color: number,
    d = 3,
    dr = true,
  ): void {
    const vd = d / 2;
    const tc = this.toneColor(color, 1.42);
    const sc = this.toneColor(color, 0.58);
    const sd = dr ? 1 : -1;

    // Top cap parallelogram
    g.poly([
      { x: x,               y: y       },
      { x: x + w,           y: y       },
      { x: x + w + sd * d,  y: y - vd  },
      { x: x + sd * d,      y: y - vd  },
    ]);
    g.fill(tc);

    // Front face
    g.rect(x, y, w, h);
    g.fill(color);

    // Side face
    if (dr) {
      g.poly([
        { x: x + w,         y: y          },
        { x: x + w + d,     y: y - vd     },
        { x: x + w + d,     y: y - vd + h },
        { x: x + w,         y: y + h      },
      ]);
    } else {
      g.poly([
        { x: x,             y: y          },
        { x: x - d,         y: y - vd     },
        { x: x - d,         y: y - vd + h },
        { x: x,             y: y + h      },
      ]);
    }
    g.fill(sc);
  }

  private toneColor(c: number, f: number): number {
    const r = Math.min(255, Math.max(0, Math.round(((c >> 16) & 0xff) * f)));
    const gv = Math.min(255, Math.max(0, Math.round(((c >> 8) & 0xff) * f)));
    const b = Math.min(255, Math.max(0, Math.round((c & 0xff) * f)));
    return (r << 16) | (gv << 8) | b;
  }

  /**
   * Generates a single voxel pirate character sprite frame.
   * Canvas: 40×56px, anchor (0.5, 0.75) = ground at y=42.
   *
   * Walk frames: 0=neutral, 1=right-leg-forward, 2=neutral, 3=left-leg-forward
   */
  private generateVoxelCharFrame(
    app: Application,
    pal: { skin: number; skinDark: number; hair: number; coat: number; pants: number; boot: number; gold: number; belt: number },
    dirName: string,
    frame: number,
  ): Texture {
    const W = 40, H = 56;
    const g = new Graphics();
    const GY = 42; // ground line (anchor point)

    // Walk swing offsets
    const rLegY = frame === 1 ? 3  : frame === 3 ? -2 : 0;
    const lLegY = frame === 1 ? -2 : frame === 3 ? 3  : 0;
    const rArmY = -rLegY;
    const lArmY = -lLegY;
    const bob   = (frame === 1 || frame === 3) ? 1 : 0;

    // Direction flags
    const isE      = dirName === 'E';
    const isW      = dirName === 'W';
    const isSide   = isE || isW;
    const showFace = dirName === 'S' || dirName === 'SE' || dirName === 'SW';
    const isNorth  = dirName === 'N' || dirName === 'NE' || dirName === 'NW';
    // Depth goes right for S/SE/NE/E, left for N/NW/SW/W
    const dr = dirName === 'S' || dirName === 'SE' || dirName === 'NE' || dirName === 'E';
    // Dim factor for back-facing
    const dimF = isNorth
      ? 0.76
      : (dirName === 'NW' || dirName === 'NE') ? 0.84 : 1.0;

    // Tone helper with dim baked in
    const T = (c: number, f: number) => this.toneColor(c, f * dimF);
    const VB = (x: number, y: number, w: number, h: number, c: number, d = 3) =>
      this.voxBlock(g, x, y, w, h, c, d, dr);

    const D = isSide ? 2 : 3; // depth pixels

    // ── Shadow ──
    g.ellipse(W / 2, GY + 6, 13, 3.5);
    g.fill({ color: 0x000000, alpha: 0.28 * dimF });

    if (!isSide) {
      // ════════════ FRONT / BACK / DIAGONAL VIEW ════════════
      const bw = (dirName === 'S' || dirName === 'N') ? 20 : 16;
      const bx = Math.floor(W / 2 - bw / 2);
      const legW = 9;
      const lLegX = Math.floor(W / 2) - 1 - legW;
      const rLegX = Math.floor(W / 2) + 1;

      // Which leg is "back" (drawn first, partially hidden)
      const rightIsBack = (frame !== 3);
      const backLX  = rightIsBack ? rLegX : lLegX;
      const frontLX = rightIsBack ? lLegX : rLegX;
      const bkLOff  = rightIsBack ? rLegY : lLegY;
      const ftLOff  = rightIsBack ? lLegY : rLegY;

      // ── Back boot + leg ──
      VB(backLX, GY - 7 + bkLOff,  legW, 7,  T(pal.boot,  0.72), D);
      VB(backLX, GY - 19 + bkLOff, legW, 12, T(pal.pants, 0.82), D);

      // ── Back arm ──
      const bkArmX = dr ? bx - 7 : bx + bw;
      const bkArmY = GY - 27 - bob + (dr ? lArmY : rArmY);
      VB(bkArmX, bkArmY,      7, 13, T(pal.coat, 0.78), D);
      VB(bkArmX, bkArmY + 10, 7, 3,  T(pal.gold, 0.65), D);

      // ── Body ──
      VB(bx, GY - 29 - bob, bw, 16, T(pal.coat, 1.0), D);
      // Gold buttons
      for (const gy of [GY - 23 - bob, GY - 18 - bob]) {
        g.circle(W / 2, gy, 1.5);
        g.fill(T(pal.gold, 1.0));
      }
      // Belt
      g.rect(bx, GY - 14 - bob, bw, 3);
      g.fill(T(pal.belt, 1.0));

      // ── Front arm ──
      const ftArmX = dr ? bx + bw : bx - 7;
      const ftArmY = GY - 27 - bob + (dr ? rArmY : lArmY);
      VB(ftArmX, ftArmY,      7, 13, T(pal.coat, 1.05), D);
      VB(ftArmX, ftArmY + 10, 7, 3,  T(pal.gold, 0.92), D);

      // ── Front boot + leg ──
      VB(frontLX, GY - 7 + ftLOff,  legW, 7,  T(pal.boot,  1.0), D);
      VB(frontLX, GY - 19 + ftLOff, legW, 12, T(pal.pants, 1.0), D);

      // ── Neck ──
      g.rect(W / 2 - 4, GY - 32 - bob, 8, 4);
      g.fill(T(pal.skin, 0.95));

      // ── Head ──
      const hw = bw + 2;
      const hx = Math.floor(W / 2 - hw / 2);
      const hy = GY - 45 - bob;
      VB(hx, hy, hw, 13, T(pal.skin, 1.0), D);

      // Hair cap
      VB(hx - 1, hy - 4, hw + 2, 5, T(pal.hair, 1.0), D);

      // ── Face (front-facing only) ──
      if (showFace) {
        // Left eye
        g.rect(hx + 3, hy + 3, 4, 4);
        g.fill(0xf4e8d8);
        g.rect(hx + 4, hy + 4, 2, 2);
        g.fill(T(0x1a1a2a, 1.0));
        // Right eye
        g.rect(hx + hw - 7, hy + 3, 4, 4);
        g.fill(0xf4e8d8);
        g.rect(hx + hw - 6, hy + 4, 2, 2);
        g.fill(T(0x1a1a2a, 1.0));
        // Nose
        g.circle(W / 2, hy + 8, 1);
        g.fill(T(pal.skinDark, 0.9));
      }

    } else {
      // ════════════ SIDE VIEW (E / W) ════════════
      const bw = 10;
      const bx = isE ? (W / 2 - bw / 2 + 1) : (W / 2 - bw / 2 - 1);
      const legPhase = frame === 1 ? 3 : frame === 3 ? -3 : 0;
      const bkShift = isE ? 2 : -2;

      // Back leg (darker, slightly behind)
      VB(bx + bkShift, GY - 7,  bw - 3, 7,  T(pal.boot,  0.62), D);
      VB(bx + bkShift, GY - 19, bw - 3, 12, T(pal.pants, 0.68), D);

      // Body
      VB(bx, GY - 29 - bob, bw, 16, T(pal.coat, 1.0), D);

      // Near arm (swings with animation)
      const armY = GY - 27 - bob + (frame === 1 ? -2 : frame === 3 ? 2 : 0);
      VB(bx, armY,      bw - 2, 12, T(pal.coat, 0.82), D);
      VB(bx, armY + 9,  bw - 2, 3,  T(pal.gold, 0.78), D);

      // Front leg
      VB(bx, GY - 7  + legPhase, bw - 1, 7,  T(pal.boot,  1.0), D);
      VB(bx, GY - 19 + legPhase, bw - 1, 12, T(pal.pants, 1.0), D);

      // Neck
      g.rect(bx + 1, GY - 32 - bob, 6, 4);
      g.fill(T(pal.skin, 0.95));

      // Head
      VB(bx - 1, GY - 45 - bob, bw + 2, 13, T(pal.skin, 1.0), D);

      // Hair
      VB(bx - 2, GY - 49 - bob, bw + 4, 5, T(pal.hair, 1.0), D);

      // Side eye
      const eyeX = isE ? bx + bw - 3 : bx + 1;
      const eyeY = GY - 42 - bob;
      g.rect(eyeX, eyeY, 3, 3);
      g.fill(0xf4e8d8);
      g.rect(eyeX + (isE ? 1 : 0), eyeY + 1, 1, 1);
      g.fill(T(0x1a1a2a, 1.0));
    }

    // Suppress unused-var lint for H (used implicitly by canvas bounds)
    void H;

    const texture = app.renderer.generateTexture(g);
    g.destroy();
    return texture;
  }

  // ---- Obstacle textures ----

  private generateTreeTexture(app: Application): Texture {
    const g = new Graphics();

    // Trunk
    g.rect(12, 20, 8, 14);
    g.fill(0x6b4226);

    // Foliage layers (rounder, more natural)
    g.circle(16, 12, 12);
    g.fill(0x2d6b1e);
    g.circle(12, 14, 8);
    g.fill(0x3a8a2a);
    g.circle(20, 10, 7);
    g.fill(0x348025);
    g.circle(16, 8, 6);
    g.fill(0x42952e);

    // Shadow
    g.ellipse(16, 34, 10, 4);
    g.fill({ color: 0x000000, alpha: 0.25 });

    const texture = app.renderer.generateTexture(g);
    g.destroy();
    return texture;
  }

  private generateRockTexture(app: Application): Texture {
    const g = new Graphics();

    g.poly([
      { x: 6, y: 14 },
      { x: 10, y: 4 },
      { x: 20, y: 2 },
      { x: 26, y: 8 },
      { x: 24, y: 18 },
      { x: 8, y: 20 },
    ]);
    g.fill(0x6e6e6e);
    g.stroke({ width: 1, color: 0x4a4a4a });

    g.poly([
      { x: 12, y: 6 },
      { x: 18, y: 4 },
      { x: 22, y: 8 },
      { x: 16, y: 10 },
    ]);
    g.fill({ color: 0x8a8a8a, alpha: 0.6 });

    g.ellipse(16, 22, 10, 3);
    g.fill({ color: 0x000000, alpha: 0.25 });

    const texture = app.renderer.generateTexture(g);
    g.destroy();
    return texture;
  }

  private generateBushTexture(app: Application): Texture {
    const g = new Graphics();

    g.circle(16, 14, 10);
    g.fill(0x2a5e1a);
    g.circle(12, 10, 5);
    g.fill({ color: 0x3a8a2a, alpha: 0.7 });
    g.circle(20, 12, 3);
    g.fill({ color: 0x4a9a3a, alpha: 0.5 });

    // Small berries
    g.circle(10, 15, 1.5);
    g.fill({ color: 0xcc3333, alpha: 0.7 });
    g.circle(22, 13, 1.2);
    g.fill({ color: 0xcc3333, alpha: 0.6 });

    g.ellipse(16, 24, 8, 3);
    g.fill({ color: 0x000000, alpha: 0.25 });

    const texture = app.renderer.generateTexture(g);
    g.destroy();
    return texture;
  }

  private generateCrateTexture(app: Application): Texture {
    const g = new Graphics();

    g.rect(4, 6, 24, 18);
    g.fill(0x8b6b3c);
    g.stroke({ width: 1, color: 0x5e4020 });

    g.moveTo(4, 12); g.lineTo(28, 12);
    g.stroke({ width: 1, color: 0x5e4020 });
    g.moveTo(4, 18); g.lineTo(28, 18);
    g.stroke({ width: 1, color: 0x5e4020 });
    g.moveTo(16, 6); g.lineTo(16, 24);
    g.stroke({ width: 1, color: 0x5e4020 });

    g.ellipse(16, 26, 10, 3);
    g.fill({ color: 0x000000, alpha: 0.25 });

    const texture = app.renderer.generateTexture(g);
    g.destroy();
    return texture;
  }

  private generateLanternTexture(app: Application): Texture {
    const g = new Graphics();

    g.rect(14, 10, 4, 24);
    g.fill(0x555555);
    g.rect(10, 4, 12, 10);
    g.fill(0x444444);
    g.stroke({ width: 1, color: 0x333333 });

    g.circle(16, 9, 4);
    g.fill({ color: 0xffdd44, alpha: 0.9 });
    g.circle(16, 9, 7);
    g.fill({ color: 0xffdd44, alpha: 0.2 });

    g.ellipse(16, 34, 6, 2);
    g.fill({ color: 0x000000, alpha: 0.25 });

    const texture = app.renderer.generateTexture(g);
    g.destroy();
    return texture;
  }

  // ---- Tide system textures ----

  private generateSiphonTexture(app: Application): Texture {
    const g = new Graphics();

    // Base hexagonal platform
    g.poly([
      { x: 16, y: 40 }, { x: 28, y: 44 }, { x: 28, y: 48 },
      { x: 16, y: 52 }, { x: 4, y: 48 }, { x: 4, y: 44 },
    ]);
    g.fill(0x8b7340);
    g.stroke({ width: 1, color: 0x6b5530 });

    // Brass column
    g.rect(12, 8, 8, 32);
    g.fill(0xb8963a);
    g.stroke({ width: 1, color: 0x8b7340 });

    // Column detail bands
    for (let i = 0; i < 4; i++) {
      const by = 12 + i * 7;
      g.rect(11, by, 10, 2);
      g.fill(0xd4aa44);
    }

    // Blue glow orb at top
    g.circle(16, 6, 6);
    g.fill({ color: 0x4488ff, alpha: 0.3 });
    g.circle(16, 6, 4);
    g.fill({ color: 0x66aaff, alpha: 0.5 });
    g.circle(16, 6, 2);
    g.fill({ color: 0xaaddff, alpha: 0.8 });

    // Shadow
    g.ellipse(16, 52, 12, 4);
    g.fill({ color: 0x000000, alpha: 0.25 });

    const texture = app.renderer.generateTexture(g);
    g.destroy();
    return texture;
  }

  private generateTidePillarTexture(app: Application): Texture {
    const g = new Graphics();

    // Stone base
    g.poly([
      { x: 16, y: 38 }, { x: 28, y: 42 }, { x: 28, y: 46 },
      { x: 16, y: 50 }, { x: 4, y: 46 }, { x: 4, y: 42 },
    ]);
    g.fill(0x6e6e6e);
    g.stroke({ width: 1, color: 0x4a4a4a });

    // Stone column
    g.rect(11, 10, 10, 28);
    g.fill(0x7a7a7a);
    g.stroke({ width: 1, color: 0x5e5e5e });

    // Rune carved on column (golden)
    g.moveTo(14, 18); g.lineTo(16, 14); g.lineTo(18, 18);
    g.stroke({ width: 1.5, color: 0xd4a853, alpha: 0.9 });
    g.moveTo(14, 22); g.lineTo(18, 22);
    g.stroke({ width: 1.5, color: 0xd4a853, alpha: 0.9 });
    g.moveTo(16, 18); g.lineTo(16, 28);
    g.stroke({ width: 1.5, color: 0xd4a853, alpha: 0.9 });

    // Amber glow
    g.circle(16, 8, 5);
    g.fill({ color: 0xd4a853, alpha: 0.25 });
    g.circle(16, 8, 3);
    g.fill({ color: 0xffcc66, alpha: 0.4 });

    // Shadow
    g.ellipse(16, 50, 10, 3);
    g.fill({ color: 0x000000, alpha: 0.25 });

    const texture = app.renderer.generateTexture(g);
    g.destroy();
    return texture;
  }

  private generateLootDropTexture(app: Application, rarity: 'common' | 'uncommon'): Texture {
    const g = new Graphics();

    if (rarity === 'common') {
      // Small brown sack
      g.poly([
        { x: 4, y: 2 }, { x: 12, y: 2 }, { x: 14, y: 6 },
        { x: 13, y: 12 }, { x: 3, y: 12 }, { x: 2, y: 6 },
      ]);
      g.fill(0x8b6b3c);
      g.stroke({ width: 0.5, color: 0x6b4a26 });
      // Tie at top
      g.moveTo(6, 2); g.lineTo(8, 0); g.lineTo(10, 2);
      g.stroke({ width: 1, color: 0x6b4a26 });
      // Gold shimmer
      g.circle(9, 7, 1.5);
      g.fill({ color: 0xffdd44, alpha: 0.6 });
    } else {
      // Cyan crystal
      g.poly([
        { x: 8, y: 0 }, { x: 12, y: 4 }, { x: 10, y: 14 },
        { x: 6, y: 14 }, { x: 4, y: 4 },
      ]);
      g.fill(0x44ccdd);
      g.stroke({ width: 0.5, color: 0x22aacc });
      // Inner glow
      g.poly([
        { x: 8, y: 2 }, { x: 10, y: 5 }, { x: 9, y: 10 },
        { x: 7, y: 10 }, { x: 6, y: 5 },
      ]);
      g.fill({ color: 0xaaffff, alpha: 0.4 });
      // Outer glow
      g.circle(8, 7, 8);
      g.fill({ color: 0x44ccdd, alpha: 0.15 });
    }

    const texture = app.renderer.generateTexture(g);
    g.destroy();
    return texture;
  }

  private generatePalmTexture(app: Application): Texture {
    const g = new Graphics();

    // Curved trunk
    g.moveTo(14, 36);
    g.quadraticCurveTo(10, 20, 16, 8);
    g.lineTo(20, 8);
    g.quadraticCurveTo(14, 20, 18, 36);
    g.fill(0x8b6b3c);

    // Trunk segments
    for (let i = 0; i < 4; i++) {
      const ty = 14 + i * 5;
      g.moveTo(11 + i * 0.5, ty);
      g.lineTo(19 - i * 0.3, ty);
      g.stroke({ width: 0.5, color: 0x6b4a26, alpha: 0.4 });
    }

    const frondColor = 0x2d8b1e;
    // Left frond
    g.moveTo(18, 8);
    g.quadraticCurveTo(4, 2, 0, 10);
    g.quadraticCurveTo(6, 4, 18, 8);
    g.fill(frondColor);
    // Right frond
    g.moveTo(18, 8);
    g.quadraticCurveTo(32, 2, 34, 10);
    g.quadraticCurveTo(30, 4, 18, 8);
    g.fill(frondColor);
    // Top fronds
    g.moveTo(18, 8);
    g.quadraticCurveTo(18, -4, 10, 0);
    g.quadraticCurveTo(16, 0, 18, 8);
    g.fill(0x3a9a2a);
    g.moveTo(18, 8);
    g.quadraticCurveTo(18, -4, 26, 0);
    g.quadraticCurveTo(20, 0, 18, 8);
    g.fill(0x3a9a2a);

    // Coconuts
    g.circle(15, 10, 2);
    g.fill(0x6b4226);
    g.circle(20, 9, 1.8);
    g.fill(0x7a5030);

    g.ellipse(16, 38, 10, 3);
    g.fill({ color: 0x000000, alpha: 0.25 });

    const texture = app.renderer.generateTexture(g);
    g.destroy();
    return texture;
  }
}
