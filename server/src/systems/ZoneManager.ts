import type { Server } from '@colyseus/core';

/**
 * Track active zone rooms and manage creation/disposal.
 * Colyseus handles room lifecycle via filterBy, but this tracks metadata.
 */
export class ZoneManager {
  private activeZones = new Map<string, { playerCount: number; createdAt: number }>();
  private server: Server | null = null;

  init(server: Server): void {
    this.server = server;
  }

  private static zoneKey(zoneX: number, zoneY: number): string {
    return `${zoneX},${zoneY}`;
  }

  trackZone(zoneX: number, zoneY: number): void {
    const key = ZoneManager.zoneKey(zoneX, zoneY);
    if (!this.activeZones.has(key)) {
      this.activeZones.set(key, { playerCount: 0, createdAt: Date.now() });
    }
  }

  playerJoined(zoneX: number, zoneY: number): void {
    const key = ZoneManager.zoneKey(zoneX, zoneY);
    const zone = this.activeZones.get(key);
    if (zone) zone.playerCount++;
  }

  playerLeft(zoneX: number, zoneY: number): void {
    const key = ZoneManager.zoneKey(zoneX, zoneY);
    const zone = this.activeZones.get(key);
    if (zone) zone.playerCount = Math.max(0, zone.playerCount - 1);
  }

  getActiveZones(): Map<string, { playerCount: number; createdAt: number }> {
    return this.activeZones;
  }

  getPlayerCount(zoneX: number, zoneY: number): number {
    return this.activeZones.get(ZoneManager.zoneKey(zoneX, zoneY))?.playerCount ?? 0;
  }
}

export const zoneManager = new ZoneManager();
