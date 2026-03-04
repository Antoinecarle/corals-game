import { Container, Sprite, Texture, Graphics } from 'pixi.js';
import { tileToScreen, TILE_WIDTH, TILE_HEIGHT } from '@pirate-mmo/shared';

/**
 * Visual entity for the Tide Pillar at the bastion center.
 * Stone column with golden rune glow.
 */
export class TidePillarEntity {
  public container: Container;
  private sprite: Sprite;
  private glowGraphic: Graphics;
  private glowPhase = 0;

  private tileX: number;
  private tileY: number;

  constructor(tileX: number, tileY: number, texture: Texture) {
    this.tileX = tileX;
    this.tileY = tileY;

    this.container = new Container();
    this.container.label = 'tide-pillar';

    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5, 0.85);
    this.container.addChild(this.sprite);

    // Glow overlay
    this.glowGraphic = new Graphics();
    this.container.addChild(this.glowGraphic);

    // Position
    const screen = tileToScreen(tileX, tileY);
    this.container.x = screen.sx + TILE_WIDTH / 2;
    this.container.y = screen.sy + TILE_HEIGHT / 2;
    this.container.zIndex = screen.sy + TILE_HEIGHT;
  }

  update(dt: number, playerNearby: boolean): void {
    this.glowPhase += dt * 1.5;

    const baseAlpha = playerNearby ? 0.3 : 0.1;
    const alpha = baseAlpha + Math.sin(this.glowPhase) * 0.1;
    const radius = playerNearby ? 20 : 12;

    this.glowGraphic.clear();
    this.glowGraphic.circle(0, -26, radius + Math.sin(this.glowPhase * 0.6) * 3);
    this.glowGraphic.fill({ color: 0xd4a853, alpha });
  }

  getTileX(): number { return this.tileX; }
  getTileY(): number { return this.tileY; }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
