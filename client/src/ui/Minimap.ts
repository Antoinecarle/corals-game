import { Container, Graphics } from 'pixi.js';

interface MinimapDot {
  x: number;
  y: number;
  color: number;
}

/**
 * Minimap showing zone layout and player positions.
 */
export class Minimap {
  private container: Container;
  private bg: Graphics;
  private dotsGraphics: Graphics;
  private size: number;
  private mapSize: number;

  constructor(mapSize: number, displaySize = 150) {
    this.mapSize = mapSize;
    this.size = displaySize;

    this.container = new Container();
    this.container.label = 'minimap';

    // Background
    this.bg = new Graphics();
    this.bg.rect(0, 0, this.size, this.size);
    this.bg.fill({ color: 0x0a0a1a, alpha: 0.8 });
    this.bg.rect(0, 0, this.size, this.size);
    this.bg.stroke({ width: 1, color: 0xd4a853, alpha: 0.6 });
    this.container.addChild(this.bg);

    this.dotsGraphics = new Graphics();
    this.container.addChild(this.dotsGraphics);
  }

  getContainer(): Container {
    return this.container;
  }

  /**
   * Position minimap in the bottom-right corner.
   */
  setPosition(screenWidth: number, screenHeight: number): void {
    this.container.x = screenWidth - this.size - 10;
    this.container.y = screenHeight - this.size - 10;
  }

  /**
   * Update minimap with current dots.
   */
  update(localX: number, localY: number, otherPlayers: MinimapDot[]): void {
    this.dotsGraphics.clear();

    const scale = this.size / this.mapSize;

    // Draw other players as white dots
    for (const dot of otherPlayers) {
      const mx = dot.x * scale;
      const my = dot.y * scale;
      this.dotsGraphics.circle(mx, my, 2);
      this.dotsGraphics.fill(dot.color);
    }

    // Draw local player as gold dot
    const lx = localX * scale;
    const ly = localY * scale;
    this.dotsGraphics.circle(lx, ly, 3);
    this.dotsGraphics.fill(0xd4a853);
  }
}
