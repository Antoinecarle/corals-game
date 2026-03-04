import { Container, Sprite, Texture } from 'pixi.js';
import { tileToScreen, TILE_WIDTH, TILE_HEIGHT, type LootRarity } from '@pirate-mmo/shared';

/**
 * Visual entity for a loot drop on the ground.
 * Animated sprite with subtle bounce and glow.
 */
export class LootDropEntity {
  public container: Container;
  private sprite: Sprite;
  private dropId: string;
  private tileX: number;
  private tileY: number;
  private rarity: LootRarity;

  private bouncePhase: number;
  private baseY: number;

  constructor(
    dropId: string,
    tileX: number,
    tileY: number,
    rarity: LootRarity,
    texture: Texture,
  ) {
    this.dropId = dropId;
    this.tileX = tileX;
    this.tileY = tileY;
    this.rarity = rarity;
    this.bouncePhase = Math.random() * Math.PI * 2; // random start phase

    this.container = new Container();
    this.container.label = `loot-${dropId}`;

    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5, 0.75);
    this.sprite.scale.set(1.2);
    this.container.addChild(this.sprite);

    // Position on map
    const screen = tileToScreen(tileX, tileY);
    this.container.x = screen.sx + TILE_WIDTH / 2;
    this.baseY = screen.sy + TILE_HEIGHT / 2;
    this.container.y = this.baseY;
    this.container.zIndex = screen.sy + TILE_HEIGHT - 1; // slightly below entities
  }

  update(dt: number): void {
    // Gentle bounce animation
    this.bouncePhase += dt * 3;
    const bounce = Math.sin(this.bouncePhase) * 2;
    this.container.y = this.baseY + bounce;

    // Subtle scale pulse for uncommon
    if (this.rarity === 'uncommon') {
      const pulse = 1.15 + Math.sin(this.bouncePhase * 0.8) * 0.1;
      this.sprite.scale.set(pulse);
    }
  }

  getDropId(): string { return this.dropId; }
  getTileX(): number { return this.tileX; }
  getTileY(): number { return this.tileY; }
  getRarity(): LootRarity { return this.rarity; }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
