import { Application, Container } from 'pixi.js';
import {
  tileToScreen, TILE_WIDTH, TILE_HEIGHT, ZONE_SIZE,
  TideState, TidePalier, TIDE_PILLAR_POS, SIPHON_1_POS,
  BASTION_CENTER_X, BASTION_CENTER_Y, BASTION_RADIUS,
  CHEST_CAPACITY_P1, INITIAL_LOOT_COUNT, LOOT_SPAWN_INTERVAL,
  LOOT_PICKUP_RANGE,
  isInBastion, rollLoot,
  type LootItem,
} from '@pirate-mmo/shared';
import { CONFIG } from './config.js';
import { Camera } from './core/Camera.js';
import { GameLoop } from './core/GameLoop.js';
import { InputManager } from './core/InputManager.js';
import { IsoChunkManager } from './iso/IsoChunkManager.js';
import { GridCollision } from './movement/GridCollision.js';
import { Pathfinder } from './movement/Pathfinder.js';
import { MovementController } from './movement/MovementController.js';
import { Player } from './entities/Player.js';
import { DepthSorter } from './rendering/DepthSorter.js';
import { NetworkManager } from './network/NetworkManager.js';
import { StateSync } from './network/StateSync.js';
import { DebugOverlay } from './ui/DebugOverlay.js';
import { Minimap } from './ui/Minimap.js';
import { UIManager, type GameState } from './ui/UIManager.js';
import { AdminMode } from './admin/AdminMode.js';
import { ObstacleType } from './iso/MapGenerator.js';
import { IsoTileMap } from './iso/IsoTileMap.js';
import { TideManager } from './tide/TideManager.js';
import { SiphonEntity } from './tide/SiphonEntity.js';
import { TidePillarEntity } from './tide/TidePillarEntity.js';
import { LootDropEntity } from './tide/LootDrop.js';
/**
 * Main game orchestrator.
 */
export class Game {
  private app!: Application;
  private camera!: Camera;
  private gameLoop!: GameLoop;
  private input!: InputManager;
  private chunkManager!: IsoChunkManager;
  private player!: Player;
  private entityContainer!: Container;
  private depthSorter!: DepthSorter;
  private network!: NetworkManager;
  private stateSync!: StateSync;
  private debugOverlay!: DebugOverlay;
  private minimap!: Minimap;
  private uiManager!: UIManager;
  private adminMode!: AdminMode;
  private tileMap!: IsoTileMap;

  // Tide system
  private tideManager!: TideManager;
  private siphonEntity!: SiphonEntity;
  private tidePillarEntity!: TidePillarEntity;
  private lootDropEntities: Map<string, LootDropEntity> = new Map();
  private wasNearPillar = false;
  private wasNearSiphon = false;
  private offlineLootTimer = 0; // seconds since last loot spawn (offline mode)

  private playerName: string = '';
  private currentZoneX = 0;
  private currentZoneY = 0;
  private connected = false;

  // Reusable game state object (avoids allocation every frame)
  private readonly gameState: GameState = {
    playerName: '',
    playerLevel: 1,
    hp: 85,
    maxHp: 100,
    energy: 42,
    maxEnergy: 50,
    corruption: 15,
    xp: 320,
    maxXp: 1000,
    tileX: 0,
    tileY: 0,
    zoneLabel: '',
    remotePlayers: [],
    npcs: [],
    mapSize: 0,
  };

  async init(container: HTMLElement, playerName: string): Promise<void> {
    this.playerName = playerName;

    // Create PixiJS Application
    this.app = new Application();
    await this.app.init({
      background: CONFIG.BACKGROUND_COLOR,
      resizeTo: window,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    container.appendChild(this.app.canvas);

    // Camera (viewport)
    this.camera = new Camera(this.app);
    this.app.stage.addChild(this.camera.viewport);

    // Load zone
    this.chunkManager = new IsoChunkManager();
    const tileMap = await this.chunkManager.loadZone(0, 0, this.app, this.camera);

    // Entity container (for depth sorting)
    this.entityContainer = new Container();
    this.entityContainer.label = 'entities';
    this.entityContainer.sortableChildren = true;
    this.camera.viewport.addChild(this.entityContainer);

    this.depthSorter = new DepthSorter(this.entityContainer);

    // Build all tiles (renders the entire map)
    tileMap.buildAll();
    this.tileMap = tileMap;

    // Collision + pathfinding
    const collision = new GridCollision(tileMap.getWalkable(), tileMap.getSize());
    const pathfinder = new Pathfinder(collision);

    // Get assets for player/npc frames
    const assets = this.chunkManager.getAssets()!;

    // Spawn player at center
    const spawnX = 128;
    const spawnY = 128;
    const movement = new MovementController(spawnX, spawnY, pathfinder);
    this.player = new Player(spawnX, spawnY, playerName, movement, assets.playerFrames);
    this.entityContainer.addChild(this.player.container);

    // Center camera on player
    const spawnScreen = tileToScreen(spawnX, spawnY);
    this.camera.follow(spawnScreen.sx + TILE_WIDTH / 2, spawnScreen.sy + TILE_HEIGHT / 2);

    // Network + StateSync
    this.network = new NetworkManager();

    // Admin mode
    this.adminMode = new AdminMode(container, tileMap, this.network);

    // Input (game clicks for movement OR admin placement)
    this.input = new InputManager(this.camera.viewport);
    this.input.onTileClick((tileX, tileY) => {
      if (this.adminMode.isActive()) {
        this.adminMode.handleClick(tileX, tileY);
        return;
      }

      // Check siphon click
      if (this.tideManager.isNearSiphon(this.player.getTileX(), this.player.getTileY())) {
        const sdx = tileX - SIPHON_1_POS.x;
        const sdy = tileY - SIPHON_1_POS.y;
        if (Math.sqrt(sdx * sdx + sdy * sdy) <= 2) {
          this.tideManager.openSiphon();
          return;
        }
      }

      // Allow movement even when chat is focused — UI overlay has pointer-events:none on wrapper
      if (tileMap.isWalkable(tileX, tileY)) {
        this.player.moveTo(tileX, tileY);
        if (this.connected) {
          this.network.sendMove(tileX, tileY);
        }
      }
    });

    // Hover for admin ghost preview
    this.input.onTileHover((tileX, tileY) => {
      if (this.adminMode.isActive()) {
        this.adminMode.handleHover(tileX, tileY);
      }
    });

    // Listen for obstacle updates from other clients
    this.network.onObstacleUpdate((data) => {
      if (data.obstacleType === ObstacleType.None) {
        tileMap.removeObstacle(data.x, data.y);
      } else {
        tileMap.placeObstacle(data.x, data.y, data.obstacleType);
      }
    });
    this.stateSync = new StateSync(assets.playerFrames, assets.npcFrames);
    this.stateSync.setCallbacks(
      (entity) => this.entityContainer.addChild(entity.container),
      (entity) => this.entityContainer.removeChild(entity.container),
    );

    // UI overlays (added to app.stage, not viewport)
    this.debugOverlay = new DebugOverlay();
    this.app.stage.addChild(this.debugOverlay.getContainer());

    this.minimap = new Minimap(ZONE_SIZE);
    this.minimap.setPosition(this.app.screen.width, this.app.screen.height);
    this.app.stage.addChild(this.minimap.getContainer());
    // Hide PixiJS minimap — replaced by HTML MinimapHUD
    this.minimap.getContainer().visible = false;

    // HTML UI overlay (on top of canvas)
    this.uiManager = new UIManager(container, ZONE_SIZE);
    // Wire admin mode toggle
    this.uiManager.setAdminCallbacks(
      () => this.adminMode.toggle(),
      () => this.adminMode.undo(),
      () => this.adminMode.redo(),
      () => this.adminMode.isActive(),
    );

    // ─── Tide System Setup ───
    this.tideManager = new TideManager();

    // Siphon entity (Palier 1)
    this.siphonEntity = new SiphonEntity(SIPHON_1_POS.x, SIPHON_1_POS.y, assets.siphonTexture);
    this.entityContainer.addChild(this.siphonEntity.container);

    // Tide Pillar entity (at bastion center)
    this.tidePillarEntity = new TidePillarEntity(TIDE_PILLAR_POS.x, TIDE_PILLAR_POS.y, assets.tidePillarTexture);
    this.entityContainer.addChild(this.tidePillarEntity.container);

    // Wire tide UI callbacks
    this.setupTideSystem(assets);

    // Welcome notification
    this.uiManager.notify(`Welcome aboard, ${playerName}!`, 'success');

    // Resize handler
    window.addEventListener('resize', () => {
      this.camera.resize(window.innerWidth, window.innerHeight);
      this.minimap.setPosition(window.innerWidth, window.innerHeight);
    });

    // Game loop
    this.gameLoop = new GameLoop(
      (dt) => this.update(dt),
      (_alpha) => this.render(),
    );
    this.gameLoop.start();

    // Try to connect to server
    this.connectToServer();
  }

  private setupTideSystem(assets: any): void {
    const tm = this.tideManager;
    const ui = this.uiManager;

    // Network callbacks — offline simulation if not connected
    tm.setNetworkCallbacks(
      (palier) => {
        if (this.connected) {
          this.network.sendLaunchTide(palier);
        } else {
          this.offlineLaunchTide(palier);
        }
      },
      (dropId) => {
        if (this.connected) {
          this.network.sendPickupLoot(dropId);
        }
        // Offline pickup handled in offlinePickupLoot()
      },
      (itemIds) => {
        if (this.connected) {
          this.network.sendBankLoot(itemIds);
        } else {
          this.offlineBankLoot(itemIds);
        }
      },
      () => {
        if (this.connected) {
          this.network.sendReflux();
        } else {
          this.offlineReflux();
        }
      },
    );

    // UI callbacks
    ui.getTideHUD().setOnReflux(() => tm.reflux());
    ui.getTideLauncher().setOnLaunch(() => tm.launchTide());

    ui.getSiphonPanel().setCallbacks(
      (itemIds) => tm.bankLoot(itemIds),
      () => tm.reflux(),
      () => tm.closeSiphon(),
    );

    // TideManager event listeners
    tm.on('onStateChange', (state: TideState) => {
      if (state === TideState.AT_SIPHON) {
        ui.getSiphonPanel().open();
        ui.getSiphonPanel().updateLoot(
          tm.getCarriedLoot(),
          tm.getBankedLoot(),
          tm.getSiphon().chestCapacity,
        );
      } else if (state === TideState.IN_TIDE) {
        ui.getSiphonPanel().close();
      } else if (state === TideState.NONE) {
        ui.getSiphonPanel().close();
        ui.getTideHUD().hide();
      }
    });

    tm.on('onLootPickup', (item: LootItem) => {
      const rarityLabel = item.rarity === 'uncommon' ? 'peu commun' : '';
      ui.notify(`+ ${item.name} ${rarityLabel}(${item.value} or)`, item.rarity === 'uncommon' ? 'success' : 'info');
    });

    tm.on('onLootDropsSpawned', (drops) => {
      for (const drop of drops) {
        const texture = drop.lootData.rarity === 'uncommon' ? assets.lootDropUncommon : assets.lootDropCommon;
        const entity = new LootDropEntity(drop.id, drop.tileX, drop.tileY, drop.lootData.rarity, texture);
        this.entityContainer.addChild(entity.container);
        this.lootDropEntities.set(drop.id, entity);
      }
    });

    tm.on('onLootDropRemoved', (dropId) => {
      const entity = this.lootDropEntities.get(dropId);
      if (entity) {
        this.entityContainer.removeChild(entity.container);
        entity.destroy();
        this.lootDropEntities.delete(dropId);
      }
    });

    tm.on('onTideEnded', (reason, kept, lost) => {
      // Clear all loot drop entities
      for (const [, entity] of this.lootDropEntities) {
        this.entityContainer.removeChild(entity.container);
        entity.destroy();
      }
      this.lootDropEntities.clear();

      // Teleport player to bastion center
      this.player.getMovement().setPosition(TIDE_PILLAR_POS.x, TIDE_PILLAR_POS.y);
      if (this.connected) {
        this.network.sendMove(TIDE_PILLAR_POS.x, TIDE_PILLAR_POS.y);
      }

      // Show summary
      ui.getTideLauncher().showSummary(reason, kept, lost);
    });

    tm.on('onBankResult', (_banked, _remaining) => {
      ui.getSiphonPanel().updateLoot(
        tm.getCarriedLoot(),
        tm.getBankedLoot(),
        tm.getSiphon().chestCapacity,
      );
      ui.notify('Items déposés dans le coffre', 'success');
    });

    // Network message handlers
    this.network.onTideStarted((data) => tm.handleTideStarted(data));
    this.network.onLootSpawned((data) => tm.handleLootSpawned(data));
    this.network.onLootPickedUp((data) => tm.handleLootPickedUp(data));
    this.network.onLootDropRemoved((data) => tm.handleLootDropRemoved(data.dropId));
    this.network.onTideEnded((data) => tm.handleTideEnded(data));
    this.network.onBankResult((data) => tm.handleBankResult(data));
  }

  private async connectToServer(): Promise<void> {
    try {
      const info = await this.network.login(this.playerName);
      this.currentZoneX = info.zoneX;
      this.currentZoneY = info.zoneY;

      // Move player to saved position
      this.player.getMovement().setPosition(info.tileX, info.tileY);

      const room = await this.network.joinZone(
        info.zoneX, info.zoneY,
        info.tileX, info.tileY,
        info.direction,
      );

      // Wait for initial state decode before attaching StateSync
      await new Promise<void>((resolve) => {
        room.onStateChange.once(() => resolve());
      });

      this.stateSync.attachToRoom(room, room.sessionId);
      this.network.leaveLobby();
      this.connected = true;
      console.log(`[Game] Connected to zone (${info.zoneX}, ${info.zoneY})`);
    } catch (err) {
      console.warn('[Game] Server not available, running in offline mode:', err);
    }
  }

  private update(dt: number): void {
    // Update player
    this.player.update(dt);

    // Update remote entities
    this.stateSync.update(dt);

    // Depth sort
    this.depthSorter.sort();

    // Camera follow player
    const screen = tileToScreen(this.player.getTileX(), this.player.getTileY());
    this.camera.follow(screen.sx + TILE_WIDTH / 2, screen.sy + TILE_HEIGHT / 2);

    // Update debug overlay
    this.debugOverlay.tileX = this.player.getTileX();
    this.debugOverlay.tileY = this.player.getTileY();
    this.debugOverlay.zoneX = this.currentZoneX;
    this.debugOverlay.zoneY = this.currentZoneY;
    this.debugOverlay.playerCount = this.stateSync.getRemotePlayers().size + 1;
    this.debugOverlay.update(dt);

    // ─── Tide System Update ───
    const px = this.player.getTileX();
    const py = this.player.getTileY();
    const tm = this.tideManager;

    // Update tide entities
    this.siphonEntity.update(dt);
    this.tidePillarEntity.update(dt, tm.isNearTidePillar(px, py));

    // Update loot drop animations
    for (const [, entity] of this.lootDropEntities) {
      entity.update(dt);
    }

    // Auto-pickup loot (walk-over)
    if (tm.getState() === TideState.IN_TIDE) {
      if (this.connected) {
        tm.tryPickupLoot(px, py);
      } else {
        this.offlinePickupLoot(px, py);
      }
    }

    // Offline: periodic loot spawning
    if (!this.connected && tm.getState() === TideState.IN_TIDE) {
      this.offlineLootTimer += dt;
      if (this.offlineLootTimer >= LOOT_SPAWN_INTERVAL / 1000) {
        this.offlineLootTimer = 0;
        this.offlineSpawnLoot(3);
      }
    }

    // Tide Pillar proximity
    const nearPillar = tm.isNearTidePillar(px, py);
    if (nearPillar !== this.wasNearPillar) {
      if (nearPillar) {
        this.uiManager.getTideLauncher().show();
      } else {
        this.uiManager.getTideLauncher().hide();
      }
      this.wasNearPillar = nearPillar;
    }

    // Siphon proximity
    const nearSiphon = tm.isNearSiphon(px, py);
    if (nearSiphon !== this.wasNearSiphon) {
      if (nearSiphon) {
        this.siphonEntity.showInteractHint(this.uiManager.getRoot());
      } else {
        this.siphonEntity.hideInteractHint();
      }
      this.wasNearSiphon = nearSiphon;
    }

    // Tide HUD update
    if (tm.isActive()) {
      const zone = tm.getZoneType(px, py);
      this.uiManager.getTideHUD().update(tm.getState(), tm.getCarriedLoot(), zone);
    }

    // Update HTML UI (throttled internally by UIManager to ~5Hz)
    const gs = this.gameState;
    gs.playerName = this.playerName;
    gs.tileX = px;
    gs.tileY = py;
    gs.zoneLabel = `Ancrage - Zone ${this.currentZoneX},${this.currentZoneY}`;
    gs.mapSize = ZONE_SIZE;
    // Reuse arrays — clear and refill
    gs.remotePlayers.length = 0;
    gs.npcs.length = 0;
    for (const remote of this.stateSync.getRemotePlayers().values()) {
      gs.remotePlayers.push({ x: remote.getTileX(), y: remote.getTileY(), name: '' });
    }
    this.uiManager.update(dt, gs);
  }

  private render(): void {
    // PixiJS renders automatically via its ticker, but we manage updates ourselves.
    // The viewport handles transform updates.
  }

  // ─── Offline Tide Simulation ───
  // Allows testing the tide system without the server running.

  private offlineLaunchTide(_palier: number): void {
    this.tideManager.handleTideStarted({
      sessionId: `offline-${Date.now()}`,
      palier: TidePalier.EAUX_CALMES,
      siphon: {
        x: SIPHON_1_POS.x,
        y: SIPHON_1_POS.y,
        palier: TidePalier.EAUX_CALMES,
        chestCapacity: CHEST_CAPACITY_P1,
      },
    });

    this.offlineSpawnLoot(INITIAL_LOOT_COUNT);
    this.offlineLootTimer = 0;
    this.uiManager.notify('Marée lancée — Palier 1: Eaux Calmes', 'lore');
  }

  private offlineSpawnLoot(count: number): void {
    const drops: Array<{ id: string; tileX: number; tileY: number; lootData: LootItem }> = [];
    const walkable = this.tileMap.getWalkable();

    // Place a few drops near the siphon (95,95) so they're easy to find
    const nearSiphon = Math.min(3, count);
    for (let i = 0; i < nearSiphon; i++) {
      const x = SIPHON_1_POS.x + Math.floor(Math.random() * 10) - 5;
      const y = SIPHON_1_POS.y + Math.floor(Math.random() * 10) - 5;
      if (walkable[y]?.[x] && !isInBastion(x, y)) {
        drops.push({
          id: `offline-drop-${Date.now()}-near-${i}`,
          tileX: x,
          tileY: y,
          lootData: rollLoot(TidePalier.EAUX_CALMES),
        });
      }
    }

    // Rest scattered across the map
    for (let i = nearSiphon; i < count; i++) {
      let x: number, y: number;
      let attempts = 0;
      do {
        x = Math.floor(40 + Math.random() * 176);
        y = Math.floor(40 + Math.random() * 176);
        attempts++;
      } while (attempts < 80 && (isInBastion(x, y) || !walkable[y]?.[x]));

      if (attempts >= 80) continue;

      drops.push({
        id: `offline-drop-${Date.now()}-${i}`,
        tileX: x,
        tileY: y,
        lootData: rollLoot(TidePalier.EAUX_CALMES),
      });
    }

    if (drops.length > 0) {
      this.tideManager.handleLootSpawned({ drops });
    }
  }

  private offlinePickupLoot(px: number, py: number): void {
    for (const [id, drop] of this.tideManager.getActiveDrops()) {
      const dx = px - drop.tileX;
      const dy = py - drop.tileY;
      if (Math.sqrt(dx * dx + dy * dy) <= LOOT_PICKUP_RANGE) {
        this.tideManager.handleLootPickedUp({ dropId: id, item: drop.lootData });
        break;
      }
    }
  }

  private offlineBankLoot(itemIds: string[]): void {
    const carried = this.tideManager.getCarriedLoot();
    const banked = this.tideManager.getBankedLoot();
    const carriedWeight = carried.reduce((s, i) => s + i.weight * i.quantity, 0);
    const maxWeight = Math.floor(carriedWeight * CHEST_CAPACITY_P1);
    const bankedWeight = banked.reduce((s, i) => s + i.weight * i.quantity, 0);
    let remaining = maxWeight - bankedWeight;

    const bankedItems: LootItem[] = [];
    for (const itemId of itemIds) {
      const item = carried.find(i => i.id === itemId);
      if (item && item.weight * item.quantity <= remaining) {
        bankedItems.push(item);
        remaining -= item.weight * item.quantity;
      }
    }

    this.tideManager.handleBankResult({ bankedItems, remainingCapacity: remaining });
  }

  private offlineReflux(): void {
    const tm = this.tideManager;
    // Reflux: banked loot is kept, carried (non-banked) is lost
    tm.handleTideEnded({
      sessionId: 'offline',
      reason: 'reflux',
      lootKept: [...tm.getBankedLoot()],
      lootLost: [...tm.getCarriedLoot()],
    });
  }
}
