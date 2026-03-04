import { Container, Sprite, Texture } from 'pixi.js';
import { tileToScreen, TILE_WIDTH, TILE_HEIGHT, type Direction } from '@pirate-mmo/shared';

/**
 * Base entity class with tile position, screen position, sprite.
 */
export class Entity {
  public container: Container;
  public sprite: Sprite;
  protected tileX: number;
  protected tileY: number;
  protected direction: Direction = 0;

  constructor(tileX: number, tileY: number, texture?: Texture) {
    this.tileX = tileX;
    this.tileY = tileY;

    this.container = new Container();
    this.container.label = 'entity';

    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5, 0.75);
    this.container.addChild(this.sprite);

    this.updateScreenPosition();
  }

  /** Update screen position from tile coordinates. */
  updateScreenPosition(): void {
    const screen = tileToScreen(this.tileX, this.tileY);
    this.container.x = screen.sx + TILE_WIDTH / 2;
    this.container.y = screen.sy + TILE_HEIGHT / 2;
    // Depth sorting: use screen Y
    this.container.zIndex = screen.sy + TILE_HEIGHT;
  }

  setTilePosition(x: number, y: number): void {
    this.tileX = x;
    this.tileY = y;
    this.updateScreenPosition();
  }

  getTileX(): number { return this.tileX; }
  getTileY(): number { return this.tileY; }
  getDirection(): Direction { return this.direction; }

  setDirection(dir: Direction): void {
    this.direction = dir;
  }

  setTexture(texture: Texture): void {
    this.sprite.texture = texture;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
