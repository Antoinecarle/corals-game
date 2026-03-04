import { ZONE_SIZE, INTEREST_CELL_SIZE, INTEREST_RADIUS } from '@pirate-mmo/shared';

interface TrackedEntity {
  x: number;
  y: number;
  sessionId: string;
}

/**
 * Grid-based spatial hashing for interest management.
 * Zone (256x256) is divided into 16x16 cells = 16x16 grid.
 * Only syncs entities within ~2 cells radius (32 tiles) of each player.
 */
export class InterestManager {
  private gridWidth: number;
  private gridHeight: number;
  private cellSize: number;
  private cells: Map<number, Set<string>>;
  private entityCells: Map<string, number>;

  constructor() {
    this.cellSize = INTEREST_CELL_SIZE;
    this.gridWidth = Math.ceil(ZONE_SIZE / this.cellSize);
    this.gridHeight = Math.ceil(ZONE_SIZE / this.cellSize);
    this.cells = new Map();
    this.entityCells = new Map();
  }

  private getCellIndex(x: number, y: number): number {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const clampedCx = Math.max(0, Math.min(this.gridWidth - 1, cx));
    const clampedCy = Math.max(0, Math.min(this.gridHeight - 1, cy));
    return clampedCy * this.gridWidth + clampedCx;
  }

  addEntity(sessionId: string, x: number, y: number): void {
    const cellIdx = this.getCellIndex(x, y);
    if (!this.cells.has(cellIdx)) {
      this.cells.set(cellIdx, new Set());
    }
    this.cells.get(cellIdx)!.add(sessionId);
    this.entityCells.set(sessionId, cellIdx);
  }

  removeEntity(sessionId: string): void {
    const cellIdx = this.entityCells.get(sessionId);
    if (cellIdx !== undefined) {
      this.cells.get(cellIdx)?.delete(sessionId);
      this.entityCells.delete(sessionId);
    }
  }

  updateEntity(sessionId: string, x: number, y: number): boolean {
    const newCellIdx = this.getCellIndex(x, y);
    const oldCellIdx = this.entityCells.get(sessionId);

    if (oldCellIdx === newCellIdx) return false;

    // Cell changed
    if (oldCellIdx !== undefined) {
      this.cells.get(oldCellIdx)?.delete(sessionId);
    }
    if (!this.cells.has(newCellIdx)) {
      this.cells.set(newCellIdx, new Set());
    }
    this.cells.get(newCellIdx)!.add(sessionId);
    this.entityCells.set(sessionId, newCellIdx);
    return true;
  }

  /**
   * Get all entity session IDs within interest radius of a position.
   * Checks cells within ~2 cell radius.
   */
  getNearbyEntities(x: number, y: number): string[] {
    const cellRadius = Math.ceil(INTEREST_RADIUS / this.cellSize);
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const nearby: string[] = [];

    for (let dy = -cellRadius; dy <= cellRadius; dy++) {
      for (let dx = -cellRadius; dx <= cellRadius; dx++) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || nx >= this.gridWidth || ny < 0 || ny >= this.gridHeight) continue;
        const cellIdx = ny * this.gridWidth + nx;
        const cell = this.cells.get(cellIdx);
        if (cell) {
          for (const id of cell) {
            nearby.push(id);
          }
        }
      }
    }

    return nearby;
  }
}
