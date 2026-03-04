import { ZONE_SIZE } from '@pirate-mmo/shared';
import { SimplexNoise } from '../utils/SimplexNoise.js';

/**
 * Generates a collision grid for a given zone.
 * Uses the same noise-based island generation as the client for consistency.
 * Returns a flat Uint8Array where 0 = walkable, 1 = blocked.
 */
export class CollisionGrid {
  readonly width: number;
  readonly height: number;
  private grid: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.grid = new Uint8Array(width * height);
  }

  isWalkable(x: number, y: number): boolean {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) return false;
    return this.grid[iy * this.width + ix] === 0;
  }

  setBlocked(x: number, y: number): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.grid[y * this.width + x] = 1;
    }
  }

  setWalkable(x: number, y: number): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.grid[y * this.width + x] = 0;
    }
  }

  static generateZone(zoneX: number, zoneY: number): CollisionGrid {
    const size = ZONE_SIZE;
    const grid = new CollisionGrid(size, size);
    const seed = 42; // Must match client MapGenerator seed

    const elevNoise = new SimplexNoise(seed);
    const detailNoise = new SimplexNoise(seed + 2);
    const treeNoise = new SimplexNoise(seed + 3);

    const cx = size / 2;
    const cy = size / 2;

    // Seeded PRNG matching client
    let rng = seed * 13 + 7;
    function random(): number {
      rng = (rng * 16807 + 0) % 2147483647;
      return (rng & 0x7fffffff) / 0x7fffffff;
    }

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x - cx) / cx;
        const dy = (y - cy) / cy;

        // Same radial falloff as client
        const dist = Math.sqrt(dx * dx + (dy * 1.15) * (dy * 1.15));
        const radial = Math.max(0, 1 - Math.pow(dist / 0.85, 2.5));

        const nx = x / size;
        const ny = y / size;
        const coastNoise = elevNoise.fbm(nx * 6, ny * 6, 5, 2, 0.55);
        const detailLayer = detailNoise.fbm(nx * 12, ny * 12, 3, 2, 0.4) * 0.15;
        const peninsula = elevNoise.noise2D(nx * 3.5, ny * 3.5) * 0.12;

        let elev = radial * (0.6 + 0.4 * (coastNoise * 0.5 + 0.5)) + detailLayer;
        elev += peninsula * radial;
        elev = Math.max(0, Math.min(1, elev));

        // Water is blocked
        if (elev < 0.22) {
          grid.setBlocked(x, y);
          // Still consume random() to stay in sync with client
          random();
          continue;
        }

        // Check for obstacles (same logic as client)
        const distFromSpawn = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
        const clearSpawn = distFromSpawn < 6;
        const treeDensity = treeNoise.fbm(nx * 8, ny * 8, 3, 2, 0.5);

        let hasObstacle = false;

        if (!clearSpawn) {
          if (elev < 0.30) {
            // Sand
            if (treeDensity > 0.4 && random() < 0.06) {
              hasObstacle = true;
            } else {
              random(); // shell check
              random(); // pebble check
            }
          } else if (elev < 0.70) {
            // Grass
            if (elev < 0.55) {
              // Light grass
              if (treeDensity > 0.35 && random() < 0.06) {
                hasObstacle = true;
              } else if (treeDensity > 0.3 && random() < 0.04) {
                hasObstacle = true;
              } else {
                random(); // flower
                random(); // grass tuft
              }
            } else {
              // Forest
              if (treeDensity > 0.15 && random() < 0.12) {
                hasObstacle = true;
              } else if (random() < 0.015) {
                hasObstacle = true;
              } else {
                random(); // mushroom
                random(); // grass tuft
              }
            }
          } else {
            // Stone
            if (random() < 0.10) {
              hasObstacle = true;
            } else if (random() < 0.008) {
              hasObstacle = true;
            } else {
              random(); // pebbles
            }
          }
        } else {
          random(); // consume random to stay in sync
        }

        // Dock area
        if (x >= 124 && x <= 132 && y >= 150 && y <= 160) {
          hasObstacle = false;
        }

        // Stone paths
        if (Math.abs(x - cx) < 2 && y > cy - 20 && y < cy + 20) {
          hasObstacle = false;
        }
        if (Math.abs(y - cy) < 2 && x > cx - 20 && x < cx + 20) {
          hasObstacle = false;
        }

        if (hasObstacle) {
          grid.setBlocked(x, y);
        }
      }
    }

    // Ensure spawn area is always clear
    const centerStart = Math.floor(size / 2) - 5;
    for (let y = centerStart; y < centerStart + 10; y++) {
      for (let x = centerStart; x < centerStart + 10; x++) {
        grid.setWalkable(x, y);
      }
    }

    return grid;
  }
}
