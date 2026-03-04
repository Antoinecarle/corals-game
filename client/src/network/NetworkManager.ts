import { Client, Room } from '@colyseus/sdk';
import { CONFIG } from '../config.js';

export interface PlayerInfo {
  playerId: string;
  name: string;
  zoneX: number;
  zoneY: number;
  tileX: number;
  tileY: number;
  direction: number;
}

/**
 * Manages Colyseus connection: lobby login, zone room join/leave, zone transitions.
 */
export class NetworkManager {
  private client: Client;
  private lobbyRoom: Room | null = null;
  private zoneRoom: Room | null = null;
  private playerInfo: PlayerInfo | null = null;

  // Callbacks
  private onZoneJoined: ((room: Room) => void) | null = null;
  private onZoneLeft: (() => void) | null = null;

  constructor() {
    this.client = new Client(CONFIG.SERVER_URL);
  }

  setOnZoneJoined(cb: (room: Room) => void): void {
    this.onZoneJoined = cb;
  }

  setOnZoneLeft(cb: () => void): void {
    this.onZoneLeft = cb;
  }

  /**
   * Connect to lobby, send player name, receive player data.
   */
  async login(name: string): Promise<PlayerInfo> {
    this.lobbyRoom = await this.client.joinOrCreate('lobby', { name });

    return new Promise<PlayerInfo>((resolve, reject) => {
      this.lobbyRoom!.onMessage('lobbyPlayerData', (data: PlayerInfo) => {
        this.playerInfo = data;
        resolve(data);
      });

      this.lobbyRoom!.onMessage('lobbyError', (data: { error: string }) => {
        reject(new Error(data.error));
      });

      // Timeout
      setTimeout(() => reject(new Error('Login timeout')), 10000);
    });
  }

  /**
   * Join a zone room with player data.
   */
  async joinZone(zoneX: number, zoneY: number, tileX: number, tileY: number, direction: number): Promise<Room> {
    if (!this.playerInfo) throw new Error('Not logged in');

    // Leave current zone if any
    if (this.zoneRoom) {
      this.zoneRoom.leave();
      this.zoneRoom = null;
      this.onZoneLeft?.();
    }

    this.zoneRoom = await this.client.joinOrCreate('zone', {
      zoneX,
      zoneY,
      playerId: this.playerInfo.playerId,
      name: this.playerInfo.name,
      tileX,
      tileY,
      direction,
    });

    // Listen for zone transition messages
    this.zoneRoom.onMessage('zoneTransition', async (data: {
      targetZoneX: number;
      targetZoneY: number;
      entryX: number;
      entryY: number;
    }) => {
      await this.joinZone(data.targetZoneX, data.targetZoneY, data.entryX, data.entryY, 0);
    });

    // Listen for obstacle updates from admin edits
    this.zoneRoom.onMessage('obstacleUpdate', (data: { x: number; y: number; obstacleType: number }) => {
      this._obstacleUpdateCb?.(data);
    });

    // Tide system messages
    this.zoneRoom.onMessage('tideStarted', (data: any) => {
      this._tideStartedCb?.(data);
    });
    this.zoneRoom.onMessage('lootSpawned', (data: any) => {
      this._lootSpawnedCb?.(data);
    });
    this.zoneRoom.onMessage('lootPickedUp', (data: any) => {
      this._lootPickedUpCb?.(data);
    });
    this.zoneRoom.onMessage('lootDropRemoved', (data: any) => {
      this._lootDropRemovedCb?.(data);
    });
    this.zoneRoom.onMessage('tideEnded', (data: any) => {
      this._tideEndedCb?.(data);
    });
    this.zoneRoom.onMessage('bankResult', (data: any) => {
      this._bankResultCb?.(data);
    });

    this.onZoneJoined?.(this.zoneRoom);
    return this.zoneRoom;
  }

  /**
   * Send move command to server.
   */
  sendMove(targetX: number, targetY: number): void {
    this.zoneRoom?.send('move', { targetX, targetY });
  }

  /**
   * Admin: place an obstacle at tile position.
   */
  sendPlaceObstacle(x: number, y: number, obstacleType: number): void {
    this.zoneRoom?.send('adminPlaceObstacle', { x, y, obstacleType });
  }

  /**
   * Admin: remove an obstacle at tile position.
   */
  sendRemoveObstacle(x: number, y: number): void {
    this.zoneRoom?.send('adminRemoveObstacle', { x, y });
  }

  /**
   * Listen for obstacle updates broadcast by the server.
   */
  onObstacleUpdate(cb: (data: { x: number; y: number; obstacleType: number }) => void): void {
    this._obstacleUpdateCb = cb;
  }
  private _obstacleUpdateCb: ((data: { x: number; y: number; obstacleType: number }) => void) | null = null;

  /**
   * Request zone transition.
   */
  requestZoneTransition(targetZoneX: number, targetZoneY: number, entryX: number, entryY: number): void {
    this.zoneRoom?.send('requestZoneTransition', {
      targetZoneX,
      targetZoneY,
      entryX,
      entryY,
    });
  }

  // ─── Tide System Messages ───

  sendLaunchTide(palier: number): void {
    this.zoneRoom?.send('launchTide', { palier });
  }

  sendPickupLoot(dropId: string): void {
    this.zoneRoom?.send('pickupLoot', { dropId });
  }

  sendBankLoot(itemIds: string[]): void {
    this.zoneRoom?.send('bankLoot', { itemIds });
  }

  sendReflux(): void {
    this.zoneRoom?.send('reflux', {});
  }

  onTideStarted(cb: (data: any) => void): void {
    this._tideStartedCb = cb;
  }
  private _tideStartedCb: ((data: any) => void) | null = null;

  onLootSpawned(cb: (data: any) => void): void {
    this._lootSpawnedCb = cb;
  }
  private _lootSpawnedCb: ((data: any) => void) | null = null;

  onLootPickedUp(cb: (data: any) => void): void {
    this._lootPickedUpCb = cb;
  }
  private _lootPickedUpCb: ((data: any) => void) | null = null;

  onLootDropRemoved(cb: (data: any) => void): void {
    this._lootDropRemovedCb = cb;
  }
  private _lootDropRemovedCb: ((data: any) => void) | null = null;

  onTideEnded(cb: (data: any) => void): void {
    this._tideEndedCb = cb;
  }
  private _tideEndedCb: ((data: any) => void) | null = null;

  onBankResult(cb: (data: any) => void): void {
    this._bankResultCb = cb;
  }
  private _bankResultCb: ((data: any) => void) | null = null;

  getZoneRoom(): Room | null {
    return this.zoneRoom;
  }

  getPlayerInfo(): PlayerInfo | null {
    return this.playerInfo;
  }

  /**
   * Leave lobby after joining zone.
   */
  leaveLobby(): void {
    this.lobbyRoom?.leave();
    this.lobbyRoom = null;
  }

  disconnect(): void {
    this.zoneRoom?.leave();
    this.lobbyRoom?.leave();
    this.zoneRoom = null;
    this.lobbyRoom = null;
  }
}
