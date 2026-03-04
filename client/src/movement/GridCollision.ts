/**
 * Grid-based collision checker using the boolean[][] walkable grid.
 * walkable[y][x] = true means the tile IS walkable.
 */
export class GridCollision {
  constructor(
    private walkable: boolean[][],
    private size: number,
  ) {}

  /**
   * Check if a tile position is walkable.
   * Out-of-bounds = not walkable.
   */
  isWalkable(x: number, y: number): boolean {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || ix >= this.size || iy < 0 || iy >= this.size) {
      return false;
    }
    return this.walkable[iy][ix];
  }

  /**
   * Check if diagonal movement from (x,y) to (x+dx, y+dy) is valid.
   * Anti corner-cutting: both adjacent cardinal tiles must be walkable.
   */
  canMoveDiagonal(x: number, y: number, dx: number, dy: number): boolean {
    if (dx === 0 || dy === 0) return true; // Not diagonal
    // Both cardinal neighbors must be walkable
    return this.isWalkable(x + dx, y) && this.isWalkable(x, y + dy);
  }
}
