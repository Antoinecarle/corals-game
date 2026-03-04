import { TileType } from '../core/AssetLoader.js';
import { ZONE_SIZE } from '@pirate-mmo/shared';
import { SimplexNoise } from '../utils/SimplexNoise.js';

/** Obstacle types placed on top of tiles. */
export enum ObstacleType {
  None = 0,
  Tree = 1,
  Rock = 2,
  Bush = 3,
  Crate = 4,
  Lantern = 5,
  Palm = 6,
}

/** Ground decoration types (non-blocking visual elements). */
export enum DecoType {
  None = 0,
  GrassTuft = 1,
  Flower = 2,
  Pebbles = 3,
  Shell = 4,
  Mushroom = 5,
}

export interface MapData {
  size: number;
  tiles: TileType[][];
  obstacles: ObstacleType[][];
  walkable: boolean[][];
  elevation: number[][];      // 0-1 height per tile
  moisture: number[][];       // 0-1 moisture per tile
  variants: number[][];       // texture variant index (0-5) per tile
  decorations: DecoType[][];  // ground decoration type per tile
}

/**
 * Generates a realistic pirate island map using layered simplex noise.
 * Creates natural coastlines, elevation-based biomes, and clustered vegetation.
 */
export function generateIslandMap(seed = 42): MapData {
  const size = ZONE_SIZE;
  const tiles: TileType[][] = [];
  const obstacles: ObstacleType[][] = [];
  const walkable: boolean[][] = [];
  const elevation: number[][] = [];
  const moisture: number[][] = [];
  const variants: number[][] = [];
  const decorations: DecoType[][] = [];

  const cx = size / 2;
  const cy = size / 2;

  // Noise generators with different seeds for each layer
  const elevNoise = new SimplexNoise(seed);
  const moistNoise = new SimplexNoise(seed + 1);
  const detailNoise = new SimplexNoise(seed + 2);
  const treeNoise = new SimplexNoise(seed + 3);
  const variantNoise = new SimplexNoise(seed + 4);

  // Simple seeded PRNG for random placement
  let rng = seed * 13 + 7;
  function random(): number {
    rng = (rng * 16807 + 0) % 2147483647;
    return (rng & 0x7fffffff) / 0x7fffffff;
  }

  // ---- Pass 1: Generate elevation & moisture maps ----
  for (let y = 0; y < size; y++) {
    elevation[y] = [];
    moisture[y] = [];
    for (let x = 0; x < size; x++) {
      const dx = (x - cx) / cx; // -1..1
      const dy = (y - cy) / cy; // -1..1

      // Radial falloff — distance from center, slightly squashed vertically
      const dist = Math.sqrt(dx * dx + (dy * 1.15) * (dy * 1.15));

      // Smooth radial gradient (1 at center, 0 at edges)
      const radial = Math.max(0, 1 - Math.pow(dist / 0.85, 2.5));

      // Multi-octave noise for irregular coastline
      const nx = x / size;
      const ny = y / size;
      const coastNoise = elevNoise.fbm(nx * 6, ny * 6, 5, 2, 0.55);
      const detailLayer = detailNoise.fbm(nx * 12, ny * 12, 3, 2, 0.4) * 0.15;

      // Combine: radial shape × noise creates natural island
      let elev = radial * (0.6 + 0.4 * (coastNoise * 0.5 + 0.5)) + detailLayer;

      // Add some peninsulas/bays by using a secondary noise at low frequency
      const peninsula = elevNoise.noise2D(nx * 3.5, ny * 3.5) * 0.12;
      elev += peninsula * radial;

      // Clamp to 0-1
      elev = Math.max(0, Math.min(1, elev));
      elevation[y][x] = elev;

      // Moisture: independent noise layer for biome sub-variation
      const moist = moistNoise.fbm(nx * 5, ny * 5, 3, 2, 0.5) * 0.5 + 0.5;
      moisture[y][x] = Math.max(0, Math.min(1, moist));
    }
  }

  // ---- Pass 2: Assign biomes, variants, obstacles, decorations ----
  for (let y = 0; y < size; y++) {
    tiles[y] = [];
    obstacles[y] = [];
    walkable[y] = [];
    variants[y] = [];
    decorations[y] = [];

    for (let x = 0; x < size; x++) {
      const elev = elevation[y][x];
      const moist = moisture[y][x];
      let tile: TileType;
      let obstacle = ObstacleType.None;
      let deco = DecoType.None;

      // Biome assignment based on elevation
      if (elev < 0.15) {
        tile = TileType.Water; // deep water
      } else if (elev < 0.22) {
        tile = TileType.Water; // shallow water (variant differentiates)
      } else if (elev < 0.30) {
        tile = TileType.Sand; // beach
      } else if (elev < 0.70) {
        tile = TileType.Grass; // grass (light to forest)
      } else if (elev < 0.85) {
        tile = TileType.Stone; // rocky highland
      } else {
        tile = TileType.Stone; // mountain peak
      }

      // Texture variant from noise (0-5) — gives each tile visual uniqueness
      const nx = x / size;
      const ny = y / size;
      const vn = variantNoise.noise2D(nx * 20, ny * 20);
      const variant = Math.abs(Math.floor(vn * 6)) % 6;
      variants[y][x] = variant;

      // ---- Obstacle placement (biome-aware, noise-clustered) ----
      const distFromSpawn = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
      const clearSpawn = distFromSpawn < 6; // No obstacles near spawn

      if (!clearSpawn && tile !== TileType.Water) {
        // Tree clustering: use noise threshold instead of pure random
        const treeDensity = treeNoise.fbm(nx * 8, ny * 8, 3, 2, 0.5);

        if (tile === TileType.Sand) {
          // Beach: sparse palms and shells
          if (treeDensity > 0.4 && random() < 0.06) {
            obstacle = ObstacleType.Palm;
          } else if (random() < 0.01) {
            deco = DecoType.Shell;
          } else if (random() < 0.008) {
            deco = DecoType.Pebbles;
          }
        } else if (tile === TileType.Grass) {
          if (elev < 0.55) {
            // Light grass — scattered trees, bushes, flowers
            if (treeDensity > 0.35 && random() < 0.06) {
              obstacle = ObstacleType.Tree;
            } else if (treeDensity > 0.3 && random() < 0.04) {
              obstacle = ObstacleType.Bush;
            } else if (random() < 0.04) {
              deco = DecoType.Flower;
            } else if (random() < 0.05) {
              deco = DecoType.GrassTuft;
            }
          } else {
            // Dense forest grass — lots of trees, mushrooms
            if (treeDensity > 0.15 && random() < 0.12) {
              obstacle = ObstacleType.Tree;
            } else if (random() < 0.015) {
              obstacle = ObstacleType.Rock;
            } else if (random() < 0.01) {
              deco = DecoType.Mushroom;
            } else if (random() < 0.03) {
              deco = DecoType.GrassTuft;
            }
          }
        } else if (tile === TileType.Stone) {
          // Rocky areas — rocks dominant, sparse dead trees
          if (random() < 0.10) {
            obstacle = ObstacleType.Rock;
          } else if (random() < 0.008) {
            obstacle = ObstacleType.Tree;
          } else if (random() < 0.015) {
            deco = DecoType.Pebbles;
          }
        }
      }

      // ---- Special structures ----

      // Dock area near spawn
      if (x >= 124 && x <= 132 && y >= 150 && y <= 160 && tile !== TileType.Water) {
        tile = TileType.Wood;
        obstacle = ObstacleType.None;
        deco = DecoType.None;
      }

      // Stone paths near center (crossroads)
      if (Math.abs(x - cx) < 2 && y > cy - 20 && y < cy + 20 && tile === TileType.Grass) {
        tile = TileType.Stone;
        obstacle = ObstacleType.None;
        deco = DecoType.None;
      }
      if (Math.abs(y - cy) < 2 && x > cx - 20 && x < cx + 20 && tile === TileType.Grass) {
        tile = TileType.Stone;
        obstacle = ObstacleType.None;
        deco = DecoType.None;
      }

      tiles[y][x] = tile;
      obstacles[y][x] = obstacle;
      decorations[y][x] = deco;
      walkable[y][x] = tile !== TileType.Water && obstacle === ObstacleType.None;
    }
  }

  return { size, tiles, obstacles, walkable, elevation, moisture, variants, decorations };
}
