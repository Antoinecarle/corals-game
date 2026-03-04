import type { Application } from 'pixi.js';
import type { Camera } from '../core/Camera.js';
import { AssetLoader, type GeneratedAssets } from '../core/AssetLoader.js';
import { generateIslandMap, type MapData } from './MapGenerator.js';
import { IsoTileMap } from './IsoTileMap.js';

/**
 * Manages loading/unloading of zone chunks.
 * For Phase 1: just loads zone 0,0.
 */
export class IsoChunkManager {
  private currentMap: IsoTileMap | null = null;
  private assets: GeneratedAssets | null = null;

  async loadZone(
    _zoneX: number,
    _zoneY: number,
    app: Application,
    camera: Camera,
  ): Promise<IsoTileMap> {
    // Generate assets if not done
    if (!this.assets) {
      const loader = new AssetLoader();
      this.assets = await loader.generate(app);
    }

    // Generate map data
    const mapData: MapData = generateIslandMap();

    // Create tilemap renderer
    this.currentMap = new IsoTileMap(mapData, this.assets);

    // Add to viewport in correct layer order:
    // 1. Base tiles
    // 2. Transition overlays
    // 3. Ground decorations
    // 4. Objects (obstacles, entities) — depth-sorted
    camera.viewport.addChild(this.currentMap.container);
    camera.viewport.addChild(this.currentMap.transitionContainer);
    camera.viewport.addChild(this.currentMap.decorationContainer);
    camera.viewport.addChild(this.currentMap.objectsContainer);

    return this.currentMap;
  }

  getCurrentMap(): IsoTileMap | null {
    return this.currentMap;
  }

  getAssets(): GeneratedAssets | null {
    return this.assets;
  }
}
