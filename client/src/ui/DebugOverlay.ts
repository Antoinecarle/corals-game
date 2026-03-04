import { Text, TextStyle, Container } from 'pixi.js';

/**
 * Debug overlay toggled with F3.
 * Shows FPS, tile coords, zone, connected players.
 */
export class DebugOverlay {
  private container: Container;
  private text: Text;
  private visible = false;
  private fps = 0;
  private frameCount = 0;
  private fpsTimer = 0;

  // Data to display
  public tileX = 0;
  public tileY = 0;
  public zoneX = 0;
  public zoneY = 0;
  public playerCount = 0;
  public ping = 0;

  constructor() {
    this.container = new Container();
    this.container.label = 'debug-overlay';
    this.container.visible = false;

    const style = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 12,
      fill: 0x00ff00,
      stroke: { color: 0x000000, width: 2 },
    });

    this.text = new Text({ text: '', style });
    this.text.x = 10;
    this.text.y = 10;
    this.container.addChild(this.text);

    // F3 toggle
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F3') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  toggle(): void {
    this.visible = !this.visible;
    this.container.visible = this.visible;
  }

  getContainer(): Container {
    return this.container;
  }

  update(dt: number): void {
    if (!this.visible) return;

    this.frameCount++;
    this.fpsTimer += dt;

    if (this.fpsTimer >= 1) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer -= 1;
    }

    this.text.text = [
      `FPS: ${this.fps}`,
      `Tile: (${this.tileX.toFixed(1)}, ${this.tileY.toFixed(1)})`,
      `Zone: (${this.zoneX}, ${this.zoneY})`,
      `Players: ${this.playerCount}`,
      `Ping: ${this.ping}ms`,
    ].join('\n');
  }
}
