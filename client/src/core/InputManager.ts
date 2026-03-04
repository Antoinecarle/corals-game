import { Viewport } from 'pixi-viewport';
import { screenToTile } from '@pirate-mmo/shared';

export type ClickCallback = (tileX: number, tileY: number) => void;
export type HoverCallback = (tileX: number, tileY: number) => void;

/**
 * Handles mouse/keyboard input and converts screen clicks to tile coordinates.
 */
export class InputManager {
  private clickCallbacks: ClickCallback[] = [];
  private hoverCallbacks: HoverCallback[] = [];
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private readonly DRAG_THRESHOLD = 5; // pixels

  // Current tile under cursor
  public cursorTileX = 0;
  public cursorTileY = 0;

  constructor(private viewport: Viewport) {
    this.setupMouseEvents();
  }

  onTileClick(cb: ClickCallback): void {
    this.clickCallbacks.push(cb);
  }

  onTileHover(cb: HoverCallback): void {
    this.hoverCallbacks.push(cb);
  }

  private setupMouseEvents(): void {
    const canvas = this.viewport.options.events!.domElement as HTMLCanvasElement;

    canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      this.isDragging = false;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
    });

    canvas.addEventListener('pointermove', (e: PointerEvent) => {
      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;
      if (Math.abs(dx) > this.DRAG_THRESHOLD || Math.abs(dy) > this.DRAG_THRESHOLD) {
        this.isDragging = true;
      }

      // Update cursor tile position and fire hover callbacks
      const worldPos = this.viewport.toWorld(e.clientX, e.clientY);
      const tile = screenToTile(worldPos.x, worldPos.y);
      const tileX = Math.round(tile.x);
      const tileY = Math.round(tile.y);

      if (tileX !== this.cursorTileX || tileY !== this.cursorTileY) {
        this.cursorTileX = tileX;
        this.cursorTileY = tileY;
        for (const cb of this.hoverCallbacks) {
          cb(tileX, tileY);
        }
      }
    });

    canvas.addEventListener('pointerup', (e: PointerEvent) => {
      if (this.isDragging) return;

      // Convert client coordinates to world coordinates via the viewport
      const worldPos = this.viewport.toWorld(e.clientX, e.clientY);
      const tile = screenToTile(worldPos.x, worldPos.y);

      const tileX = Math.round(tile.x);
      const tileY = Math.round(tile.y);

      for (const cb of this.clickCallbacks) {
        cb(tileX, tileY);
      }
    });
  }
}
