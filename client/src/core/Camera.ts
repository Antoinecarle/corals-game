import { Application } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { CONFIG } from '../config.js';

/**
 * Wraps pixi-viewport to provide camera follow, zoom, and pan.
 */
export class Camera {
  public viewport: Viewport;

  constructor(app: Application) {
    this.viewport = new Viewport({
      screenWidth: app.screen.width,
      screenHeight: app.screen.height,
      worldWidth: CONFIG.MAP_SIZE * 64,
      worldHeight: CONFIG.MAP_SIZE * 32,
      events: app.renderer.events,
    });

    this.viewport
      .drag({ mouseButtons: 'right' })
      .pinch()
      .wheel({ smooth: 5 })
      .clampZoom({
        minScale: CONFIG.MIN_ZOOM,
        maxScale: CONFIG.MAX_ZOOM,
      })
      .setZoom(CONFIG.DEFAULT_ZOOM);
  }

  /** Center the camera on a world-space position. */
  follow(worldX: number, worldY: number): void {
    this.viewport.moveCenter(worldX, worldY);
  }

  /** Handle window resize. */
  resize(width: number, height: number): void {
    this.viewport.resize(width, height);
  }
}
