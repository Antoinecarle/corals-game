import { DIAGONAL_COST } from '@pirate-mmo/shared';
import { octileHeuristic } from '../iso/IsoMath.js';
import { GridCollision } from './GridCollision.js';

interface PathNode {
  x: number;
  y: number;
  g: number;
  f: number;
  parent: PathNode | null;
}

// 8 directions: N, NE, E, SE, S, SW, W, NW
const DIRS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 1, dy: 1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: -1, dy: -1 },
];

/**
 * A* pathfinder on a cartesian grid with 8-direction movement.
 * Uses octile heuristic and anti corner-cutting.
 */
export class Pathfinder {
  private collision: GridCollision;

  constructor(collision: GridCollision) {
    this.collision = collision;
  }

  /**
   * Find path from (startX, startY) to (endX, endY).
   * Returns array of tile positions, or empty if no path.
   * Max search iterations to avoid hanging on large maps.
   */
  findPath(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    maxIterations = 5000,
  ): Array<{ x: number; y: number }> {
    const sx = Math.round(startX);
    const sy = Math.round(startY);
    const ex = Math.round(endX);
    const ey = Math.round(endY);

    if (sx === ex && sy === ey) return [];
    if (!this.collision.isWalkable(ex, ey)) return [];

    const start: PathNode = { x: sx, y: sy, g: 0, f: 0, parent: null };
    start.f = octileHeuristic({ x: sx, y: sy }, { x: ex, y: ey });

    const openList: PathNode[] = [start];
    const closedSet = new Set<string>();
    const gScores = new Map<string, number>();
    gScores.set(`${sx},${sy}`, 0);

    let iterations = 0;

    while (openList.length > 0 && iterations < maxIterations) {
      iterations++;

      // Find node with lowest f score (simple linear scan - sufficient for game)
      let bestIdx = 0;
      for (let i = 1; i < openList.length; i++) {
        if (openList[i].f < openList[bestIdx].f) {
          bestIdx = i;
        }
      }
      const current = openList[bestIdx];
      openList.splice(bestIdx, 1);

      if (current.x === ex && current.y === ey) {
        return this.reconstructPath(current);
      }

      const key = `${current.x},${current.y}`;
      if (closedSet.has(key)) continue;
      closedSet.add(key);

      for (const dir of DIRS) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;
        const nkey = `${nx},${ny}`;

        if (closedSet.has(nkey)) continue;
        if (!this.collision.isWalkable(nx, ny)) continue;

        // Anti corner-cutting
        if (!this.collision.canMoveDiagonal(current.x, current.y, dir.dx, dir.dy)) {
          continue;
        }

        const isDiagonal = dir.dx !== 0 && dir.dy !== 0;
        const moveCost = isDiagonal ? DIAGONAL_COST : 1;
        const tentativeG = current.g + moveCost;

        const existingG = gScores.get(nkey);
        if (existingG !== undefined && tentativeG >= existingG) continue;

        gScores.set(nkey, tentativeG);

        const h = octileHeuristic({ x: nx, y: ny }, { x: ex, y: ey });
        const neighbor: PathNode = {
          x: nx,
          y: ny,
          g: tentativeG,
          f: tentativeG + h,
          parent: current,
        };

        openList.push(neighbor);
      }
    }

    return []; // No path found
  }

  private reconstructPath(node: PathNode): Array<{ x: number; y: number }> {
    const path: Array<{ x: number; y: number }> = [];
    let current: PathNode | null = node;
    while (current) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }
    // Remove starting position
    if (path.length > 0) path.shift();
    return path;
  }
}
