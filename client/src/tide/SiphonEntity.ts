import { Container, Sprite, Texture, Graphics } from 'pixi.js';
import { tileToScreen, TILE_WIDTH, TILE_HEIGHT } from '@pirate-mmo/shared';

/**
 * Visual entity for the Siphon on the map.
 * Brass column with pulsing blue glow at the top.
 */
export class SiphonEntity {
  public container: Container;
  private sprite: Sprite;
  private glowGraphic: Graphics;
  private glowPhase = 0;
  private interactLabel: HTMLDivElement | null = null;

  private tileX: number;
  private tileY: number;

  constructor(tileX: number, tileY: number, texture: Texture) {
    this.tileX = tileX;
    this.tileY = tileY;

    this.container = new Container();
    this.container.label = 'siphon';

    // Main sprite
    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5, 0.85);
    this.container.addChild(this.sprite);

    // Glow overlay (animated)
    this.glowGraphic = new Graphics();
    this.container.addChild(this.glowGraphic);

    // Position on map
    const screen = tileToScreen(tileX, tileY);
    this.container.x = screen.sx + TILE_WIDTH / 2;
    this.container.y = screen.sy + TILE_HEIGHT / 2;
    this.container.zIndex = screen.sy + TILE_HEIGHT;
  }

  update(dt: number): void {
    // Pulse glow
    this.glowPhase += dt * 2;
    const alpha = 0.15 + Math.sin(this.glowPhase) * 0.1;
    const radius = 16 + Math.sin(this.glowPhase * 0.7) * 4;

    this.glowGraphic.clear();
    this.glowGraphic.circle(0, -30, radius);
    this.glowGraphic.fill({ color: 0x4488ff, alpha });
  }

  showInteractHint(parent: HTMLElement): void {
    if (this.interactLabel) return;
    this.interactLabel = document.createElement('div');
    this.interactLabel.className = 'interact-hint ui-interactive';
    this.interactLabel.textContent = 'Cliquer pour interagir';
    this.interactLabel.style.display = 'block';
    parent.appendChild(this.interactLabel);
  }

  hideInteractHint(): void {
    if (!this.interactLabel) return;
    this.interactLabel.remove();
    this.interactLabel = null;
  }

  getTileX(): number { return this.tileX; }
  getTileY(): number { return this.tileY; }

  destroy(): void {
    this.hideInteractHint();
    this.container.destroy({ children: true });
  }
}
