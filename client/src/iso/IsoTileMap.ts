import { Container, Sprite, Texture } from 'pixi.js';
import { tileToScreen, TILE_WIDTH, TILE_HEIGHT } from '@pirate-mmo/shared';
import type { GeneratedAssets } from '../core/AssetLoader.js';
import { TileType } from '../core/AssetLoader.js';
import { ObstacleType, DecoType, type MapData } from './MapGenerator.js';

const HALF_W = TILE_WIDTH / 2;
const HALF_H = TILE_HEIGHT / 2;

/** Terrain priority for transition overlays (higher bleeds onto lower). */
const TERRAIN_PRIORITY: Record<TileType, number> = {
  [TileType.Water]: 0,
  [TileType.Sand]: 1,
  [TileType.Grass]: 2,
  [TileType.Stone]: 3,
  [TileType.Wood]: 4,
};

/** Decoration type → texture key mapping. */
const DECO_KEYS: Record<DecoType, string | null> = {
  [DecoType.None]: null,
  [DecoType.GrassTuft]: 'grass_tuft',
  [DecoType.Flower]: 'flower',
  [DecoType.Pebbles]: 'pebbles',
  [DecoType.Shell]: 'shell',
  [DecoType.Mushroom]: 'mushroom',
};

/**
 * Renders the isometric tile map with:
 * - Tile texture variants (6 per type)
 * - Elevation-based tinting
 * - Terrain transition overlays
 * - Ground decorations
 * - Viewport culling
 */
export class IsoTileMap {
  public container: Container;
  public transitionContainer: Container;
  public decorationContainer: Container;
  public objectsContainer: Container;
  private mapData: MapData;
  private assets: GeneratedAssets;

  // Viewport culling state
  private lastCullBounds = '';
  private tileSprites = new Map<number, Sprite>();
  private transitionSprites = new Map<number, Sprite[]>();
  private decoSprites = new Map<number, Sprite>();
  private obstacleSprites = new Map<number, Sprite>();

  constructor(mapData: MapData, assets: GeneratedAssets) {
    this.mapData = mapData;
    this.assets = assets;

    this.container = new Container();
    this.container.label = 'tilemap';

    this.transitionContainer = new Container();
    this.transitionContainer.label = 'transitions';

    this.decorationContainer = new Container();
    this.decorationContainer.label = 'decorations';

    this.objectsContainer = new Container();
    this.objectsContainer.label = 'objects';
    this.objectsContainer.sortableChildren = true;
  }

  /**
   * Get the tile texture variant for a given tile position.
   */
  private getTileTexture(x: number, y: number): Texture {
    const tileType = this.mapData.tiles[y][x];
    const variantIdx = this.mapData.variants[y][x];
    const variants = this.assets.tiles.get(tileType);
    if (!variants || variants.length === 0) return Texture.EMPTY;
    return variants[variantIdx % variants.length];
  }

  /**
   * Compute elevation-based tint for a tile.
   * Low elevation → slightly warmer/brighter, high → cooler/darker.
   */
  private getElevationTint(x: number, y: number): number {
    const elev = this.mapData.elevation[y][x];
    const tileType = this.mapData.tiles[y][x];

    // Water doesn't get elevation tinting
    if (tileType === TileType.Water) {
      // But differentiate shallow vs deep
      if (elev >= 0.15) {
        // Shallow water — lighter tint
        return 0xddeeff;
      }
      return 0xffffff;
    }

    // Land tinting based on elevation
    // Low coast (0.22-0.35): warm brightness ~1.05
    // Mid (0.35-0.60): neutral ~1.0
    // High (0.60-0.85): slightly darker ~0.90
    // Peak (0.85+): darker ~0.80
    let brightness: number;
    if (elev < 0.35) {
      brightness = 1.05;
    } else if (elev < 0.60) {
      brightness = 1.0;
    } else if (elev < 0.85) {
      brightness = 0.92 - (elev - 0.60) * 0.2;
    } else {
      brightness = 0.82;
    }

    // Convert brightness to tint color (multiply against white)
    const c = Math.round(Math.min(255, brightness * 255));
    return (c << 16) | (c << 8) | c;
  }

  /**
   * Update which tiles are visible based on viewport bounds.
   * Creates sprites for tiles within view (+ padding).
   */
  updateVisibleTiles(viewLeft: number, viewTop: number, viewRight: number, viewBottom: number): void {
    const padding = 4;
    const minTX = Math.max(0, this.approxTileX(viewLeft, viewTop) - padding);
    const minTY = Math.max(0, this.approxTileY(viewLeft, viewTop) - padding);
    const maxTX = Math.min(this.mapData.size - 1, this.approxTileX(viewRight, viewBottom) + padding);
    const maxTY = Math.min(this.mapData.size - 1, this.approxTileY(viewRight, viewBottom) + padding);

    const boundsKey = `${minTX},${minTY},${maxTX},${maxTY}`;
    if (boundsKey === this.lastCullBounds) return;
    this.lastCullBounds = boundsKey;

    const neededTiles = new Set<number>();
    const neededObstacles = new Set<number>();

    for (let y = minTY; y <= maxTY; y++) {
      for (let x = minTX; x <= maxTX; x++) {
        const key = y * this.mapData.size + x;
        const screen = tileToScreen(x, y);

        // ---- Base tile ----
        neededTiles.add(key);
        if (!this.tileSprites.has(key)) {
          const texture = this.getTileTexture(x, y);
          const sprite = new Sprite(texture);
          sprite.x = screen.sx;
          sprite.y = screen.sy;
          sprite.tint = this.getElevationTint(x, y);
          this.container.addChild(sprite);
          this.tileSprites.set(key, sprite);

          // ---- Transition overlays ----
          const transitions = this.getTransitionsFor(x, y);
          if (transitions.length > 0) {
            const tSprites: Sprite[] = [];
            for (const tex of transitions) {
              const ts = new Sprite(tex);
              ts.x = screen.sx;
              ts.y = screen.sy;
              this.transitionContainer.addChild(ts);
              tSprites.push(ts);
            }
            this.transitionSprites.set(key, tSprites);
          }

          // ---- Ground decoration ----
          const deco = this.mapData.decorations[y][x];
          if (deco !== DecoType.None) {
            const decoKey = DECO_KEYS[deco];
            if (decoKey) {
              const decoTex = this.assets.decoTextures.get(decoKey);
              if (decoTex) {
                const ds = new Sprite(decoTex);
                // Place decoration near center of tile with slight offset
                ds.x = screen.sx + HALF_W - 4 + ((x * 7 + y * 13) % 8);
                ds.y = screen.sy + HALF_H - 6 + ((x * 11 + y * 3) % 6);
                ds.alpha = 0.8;
                this.decorationContainer.addChild(ds);
                this.decoSprites.set(key, ds);
              }
            }
          }
        }

        // ---- Obstacle ----
        const obstacle = this.mapData.obstacles[y][x];
        if (obstacle !== ObstacleType.None) {
          neededObstacles.add(key);
          if (!this.obstacleSprites.has(key)) {
            const texture = this.getObstacleTexture(obstacle);
            const sprite = new Sprite(texture);
            sprite.anchor.set(0.5, 1);
            sprite.x = screen.sx + HALF_W;
            sprite.y = screen.sy + HALF_H + 4;
            sprite.zIndex = screen.sy + TILE_HEIGHT;
            this.objectsContainer.addChild(sprite);
            this.obstacleSprites.set(key, sprite);
          }
        }
      }
    }

    // Remove off-screen tiles and associated sprites
    for (const [key, sprite] of this.tileSprites) {
      if (!neededTiles.has(key)) {
        this.container.removeChild(sprite);
        sprite.destroy();
        this.tileSprites.delete(key);

        // Also remove transitions
        const tSprites = this.transitionSprites.get(key);
        if (tSprites) {
          for (const ts of tSprites) {
            this.transitionContainer.removeChild(ts);
            ts.destroy();
          }
          this.transitionSprites.delete(key);
        }

        // Also remove decoration
        const ds = this.decoSprites.get(key);
        if (ds) {
          this.decorationContainer.removeChild(ds);
          ds.destroy();
          this.decoSprites.delete(key);
        }
      }
    }
    for (const [key, sprite] of this.obstacleSprites) {
      if (!neededObstacles.has(key)) {
        this.objectsContainer.removeChild(sprite);
        sprite.destroy();
        this.obstacleSprites.delete(key);
      }
    }
  }

  /**
   * Get transition overlay textures for edges where biomes differ.
   */
  private getTransitionsFor(x: number, y: number): Texture[] {
    const result: Texture[] = [];
    const tile = this.mapData.tiles[y][x];
    const tilePriority = TERRAIN_PRIORITY[tile];
    const size = this.mapData.size;

    // Check cardinal neighbors: N, E, S, W
    const neighbors: [number, number, string][] = [
      [x, y - 1, 'N'],
      [x + 1, y, 'E'],
      [x, y + 1, 'S'],
      [x - 1, y, 'W'],
    ];

    for (const [nx, ny, edge] of neighbors) {
      if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
      const neighborTile = this.mapData.tiles[ny][nx];
      const neighborPriority = TERRAIN_PRIORITY[neighborTile];

      // Higher-priority neighbor bleeds onto this tile
      if (neighborPriority > tilePriority) {
        const key = `${neighborTile}_${tile}_${edge}`;
        const tex = this.assets.transitions.get(key);
        if (tex) result.push(tex);
      }
    }

    return result;
  }

  /**
   * Build all tiles at once (for smaller maps or no culling).
   */
  buildAll(): void {
    for (let y = 0; y < this.mapData.size; y++) {
      for (let x = 0; x < this.mapData.size; x++) {
        const screen = tileToScreen(x, y);

        // Base tile with variant
        const texture = this.getTileTexture(x, y);
        const sprite = new Sprite(texture);
        sprite.x = screen.sx;
        sprite.y = screen.sy;
        sprite.tint = this.getElevationTint(x, y);
        this.container.addChild(sprite);

        // Transition overlays
        const transitions = this.getTransitionsFor(x, y);
        for (const tex of transitions) {
          const ts = new Sprite(tex);
          ts.x = screen.sx;
          ts.y = screen.sy;
          this.transitionContainer.addChild(ts);
        }

        // Ground decorations
        const deco = this.mapData.decorations[y][x];
        if (deco !== DecoType.None) {
          const decoKey = DECO_KEYS[deco];
          if (decoKey) {
            const decoTex = this.assets.decoTextures.get(decoKey);
            if (decoTex) {
              const ds = new Sprite(decoTex);
              ds.x = screen.sx + HALF_W - 4 + ((x * 7 + y * 13) % 8);
              ds.y = screen.sy + HALF_H - 6 + ((x * 11 + y * 3) % 6);
              ds.alpha = 0.8;
              this.decorationContainer.addChild(ds);
            }
          }
        }

        // Obstacle
        const obstacle = this.mapData.obstacles[y][x];
        if (obstacle !== ObstacleType.None) {
          const obsTex = this.getObstacleTexture(obstacle);
          const obsSprite = new Sprite(obsTex);
          obsSprite.anchor.set(0.5, 1);
          obsSprite.x = screen.sx + HALF_W;
          obsSprite.y = screen.sy + HALF_H + 4;
          obsSprite.zIndex = screen.sy + TILE_HEIGHT;
          this.objectsContainer.addChild(obsSprite);
        }
      }
    }
  }

  isWalkable(x: number, y: number): boolean {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || ix >= this.mapData.size || iy < 0 || iy >= this.mapData.size) {
      return false;
    }
    return this.mapData.walkable[iy][ix];
  }

  getWalkable(): boolean[][] {
    return this.mapData.walkable;
  }

  getSize(): number {
    return this.mapData.size;
  }

  getTileType(x: number, y: number): TileType | null {
    if (x < 0 || x >= this.mapData.size || y < 0 || y >= this.mapData.size) return null;
    return this.mapData.tiles[y][x];
  }

  getObstacleAt(x: number, y: number): ObstacleType {
    if (x < 0 || x >= this.mapData.size || y < 0 || y >= this.mapData.size) return ObstacleType.None;
    return this.mapData.obstacles[y][x];
  }

  private getObstacleTexture(type: ObstacleType): Texture {
    switch (type) {
      case ObstacleType.Tree: return this.assets.treeTexture;
      case ObstacleType.Rock: return this.assets.rockTexture;
      case ObstacleType.Bush: return this.assets.bushTexture;
      case ObstacleType.Crate: return this.assets.crateTexture;
      case ObstacleType.Lantern: return this.assets.lanternTexture;
      case ObstacleType.Palm: return this.assets.palmTexture;
      default: return Texture.EMPTY;
    }
  }

  placeObstacle(x: number, y: number, type: ObstacleType): void {
    if (x < 0 || x >= this.mapData.size || y < 0 || y >= this.mapData.size) return;
    this.removeObstacle(x, y);

    this.mapData.obstacles[y][x] = type;
    this.mapData.walkable[y][x] = false;

    const key = y * this.mapData.size + x;
    const screen = tileToScreen(x, y);
    const texture = this.getObstacleTexture(type);
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, 1);
    sprite.x = screen.sx + HALF_W;
    sprite.y = screen.sy + HALF_H + 4;
    sprite.zIndex = screen.sy + TILE_HEIGHT;
    this.objectsContainer.addChild(sprite);
    this.obstacleSprites.set(key, sprite);
  }

  removeObstacle(x: number, y: number): void {
    if (x < 0 || x >= this.mapData.size || y < 0 || y >= this.mapData.size) return;

    const key = y * this.mapData.size + x;
    const existing = this.obstacleSprites.get(key);
    if (existing) {
      this.objectsContainer.removeChild(existing);
      existing.destroy();
      this.obstacleSprites.delete(key);
    }

    this.mapData.obstacles[y][x] = ObstacleType.None;
    if (this.mapData.tiles[y][x] !== TileType.Water) {
      this.mapData.walkable[y][x] = true;
    }
  }

  // Ghost preview for admin mode
  private ghostSprite: Sprite | null = null;

  setGhostPreview(x: number, y: number, type: ObstacleType): void {
    this.clearGhostPreview();
    if (x < 0 || x >= this.mapData.size || y < 0 || y >= this.mapData.size) return;

    const screen = tileToScreen(x, y);
    const texture = this.getObstacleTexture(type);
    this.ghostSprite = new Sprite(texture);
    this.ghostSprite.anchor.set(0.5, 1);
    this.ghostSprite.x = screen.sx + HALF_W;
    this.ghostSprite.y = screen.sy + HALF_H + 4;
    this.ghostSprite.zIndex = screen.sy + TILE_HEIGHT;
    this.ghostSprite.alpha = 0.5;
    this.objectsContainer.addChild(this.ghostSprite);
  }

  clearGhostPreview(): void {
    if (this.ghostSprite) {
      this.objectsContainer.removeChild(this.ghostSprite);
      this.ghostSprite.destroy();
      this.ghostSprite = null;
    }
  }

  private approxTileX(sx: number, sy: number): number {
    return Math.floor((sx / HALF_W + sy / HALF_H) / 2);
  }

  private approxTileY(sx: number, sy: number): number {
    return Math.floor((sy / HALF_H - sx / HALF_W) / 2);
  }
}
