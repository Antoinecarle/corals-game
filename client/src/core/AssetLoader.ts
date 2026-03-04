import { Graphics, Application, Texture } from 'pixi.js';
import { TILE_WIDTH, TILE_HEIGHT, Direction } from '@pirate-mmo/shared';

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

  // ---- Character frames (unchanged) ----

  private generateCharacterFrames(
    app: Application,
    bodyColor: number,
    darkColor: number
  ): Map<string, Texture> {
    const frames = new Map<string, Texture>();
    const directions = [
      Direction.South, Direction.SouthWest, Direction.West, Direction.NorthWest,
      Direction.North, Direction.NorthEast, Direction.East, Direction.SouthEast,
    ];
    const dirNames = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'];

    const dirOffsets: Record<string, { dx: number; dy: number }> = {
      S:  { dx: 0, dy: 4 },
      SW: { dx: -3, dy: 3 },
      W:  { dx: -4, dy: 0 },
      NW: { dx: -3, dy: -3 },
      N:  { dx: 0, dy: -4 },
      NE: { dx: 3, dy: -3 },
      E:  { dx: 4, dy: 0 },
      SE: { dx: 3, dy: 3 },
    };

    for (let d = 0; d < directions.length; d++) {
      const dirName = dirNames[d];
      const offset = dirOffsets[dirName];
      frames.set(`idle_0_${dirName}`, this.generateCharFrame(app, bodyColor, darkColor, offset, 0));
      for (let f = 0; f < 4; f++) {
        frames.set(`walk_${f}_${dirName}`, this.generateCharFrame(app, bodyColor, darkColor, offset, f));
      }
    }

    return frames;
  }

  private generateCharFrame(
    app: Application,
    bodyColor: number,
    darkColor: number,
    dirOffset: { dx: number; dy: number },
    walkFrame: number
  ): Texture {
    const g = new Graphics();
    const SIZE = 24;
    const cx = SIZE / 2;
    const bob = walkFrame > 0 ? Math.sin((walkFrame / 4) * Math.PI * 2) * 2 : 0;
    const cy = SIZE / 2 + bob;

    g.poly([
      { x: cx, y: cy - 10 },
      { x: cx + 7, y: cy },
      { x: cx, y: cy + 6 },
      { x: cx - 7, y: cy },
    ]);
    g.fill(bodyColor);
    g.stroke({ width: 1, color: darkColor });

    g.circle(cx + dirOffset.dx, cy + dirOffset.dy - 2, 2);
    g.fill(0xffffff);

    g.ellipse(cx, cy + 8, 6, 2);
    g.fill({ color: 0x000000, alpha: 0.3 });

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
