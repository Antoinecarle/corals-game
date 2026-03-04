import { ObstacleType } from '../iso/MapGenerator.js';
import { TileType } from '../core/AssetLoader.js';
import type { IsoTileMap } from '../iso/IsoTileMap.js';
import type { NetworkManager } from '../network/NetworkManager.js';
import { AdminPanel, type AdminTool } from './AdminPanel.js';

interface UndoEntry {
  x: number;
  y: number;
  oldType: ObstacleType;
  newType: ObstacleType;
}

/**
 * Admin mode controller for in-game map editing.
 * Toggle with F8. Intercepts tile clicks to place/erase obstacles.
 */
export class AdminMode {
  private active = false;
  private panel: AdminPanel | null = null;
  private selectedObstacle: ObstacleType = ObstacleType.Tree;
  private tool: AdminTool = 'place';

  // Undo/Redo
  private undoStack: UndoEntry[] = [];
  private redoStack: UndoEntry[] = [];

  constructor(
    private container: HTMLElement,
    private tileMap: IsoTileMap,
    private network: NetworkManager,
  ) {}

  isActive(): boolean {
    return this.active;
  }

  enable(): void {
    if (this.active) return;
    this.active = true;

    this.panel = new AdminPanel(this.container, {
      onObstacleSelect: (type) => { this.selectedObstacle = type; },
      onToolChange: (tool) => { this.tool = tool; },
      onUndo: () => this.undo(),
      onRedo: () => this.redo(),
    });
    this.panel.show();
  }

  disable(): void {
    if (!this.active) return;
    this.active = false;
    this.tileMap.clearGhostPreview();

    if (this.panel) {
      this.panel.hide();
      this.panel.destroy();
      this.panel = null;
    }
  }

  toggle(): void {
    if (this.active) this.disable();
    else this.enable();
  }

  /**
   * Called on tile click when admin mode is active.
   * Places or erases an obstacle.
   */
  handleClick(x: number, y: number): void {
    if (!this.active) return;

    // Don't place on water
    const tileType = this.tileMap.getTileType(x, y);
    if (tileType === null || tileType === TileType.Water) return;

    const oldType = this.tileMap.getObstacleAt(x, y);

    if (this.tool === 'place') {
      if (oldType === this.selectedObstacle) return; // Already same type
      this.tileMap.placeObstacle(x, y, this.selectedObstacle);
      this.pushUndo({ x, y, oldType, newType: this.selectedObstacle });
      this.network.sendPlaceObstacle(x, y, this.selectedObstacle);
    } else {
      // Erase
      if (oldType === ObstacleType.None) return; // Nothing to erase
      this.tileMap.removeObstacle(x, y);
      this.pushUndo({ x, y, oldType, newType: ObstacleType.None });
      this.network.sendRemoveObstacle(x, y);
    }
  }

  /**
   * Called on tile hover when admin mode is active.
   * Shows ghost preview.
   */
  handleHover(x: number, y: number): void {
    if (!this.active) return;

    this.panel?.updateCoords(x, y);

    if (this.tool === 'place') {
      const tileType = this.tileMap.getTileType(x, y);
      if (tileType === null || tileType === TileType.Water) {
        this.tileMap.clearGhostPreview();
        return;
      }
      this.tileMap.setGhostPreview(x, y, this.selectedObstacle);
    } else {
      this.tileMap.clearGhostPreview();
    }
  }

  private pushUndo(entry: UndoEntry): void {
    this.undoStack.push(entry);
    this.redoStack.length = 0; // Clear redo on new action
  }

  undo(): void {
    const entry = this.undoStack.pop();
    if (!entry) return;

    // Restore old state
    if (entry.oldType === ObstacleType.None) {
      this.tileMap.removeObstacle(entry.x, entry.y);
      this.network.sendRemoveObstacle(entry.x, entry.y);
    } else {
      this.tileMap.placeObstacle(entry.x, entry.y, entry.oldType);
      this.network.sendPlaceObstacle(entry.x, entry.y, entry.oldType);
    }

    this.redoStack.push(entry);
  }

  redo(): void {
    const entry = this.redoStack.pop();
    if (!entry) return;

    // Re-apply change
    if (entry.newType === ObstacleType.None) {
      this.tileMap.removeObstacle(entry.x, entry.y);
      this.network.sendRemoveObstacle(entry.x, entry.y);
    } else {
      this.tileMap.placeObstacle(entry.x, entry.y, entry.newType);
      this.network.sendPlaceObstacle(entry.x, entry.y, entry.newType);
    }

    this.undoStack.push(entry);
  }
}
