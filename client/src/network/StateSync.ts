import type { Room } from '@colyseus/sdk';
import { getStateCallbacks } from '@colyseus/sdk';
import type { Texture } from 'pixi.js';
import { RemotePlayer } from '../entities/RemotePlayer.js';
import { NPC } from '../entities/NPC.js';
import type { Direction } from '@pirate-mmo/shared';

/**
 * Listens to Colyseus state changes and creates/updates/destroys entities.
 * Uses @colyseus/schema v4 callback proxy API.
 */
export class StateSync {
  private remotePlayers = new Map<string, RemotePlayer>();
  private npcs = new Map<string, NPC>();
  private playerFrames: Map<string, Texture>;
  private npcFrames: Map<string, Texture>;
  private localSessionId: string = '';
  private onEntityAdded: ((entity: RemotePlayer | NPC) => void) | null = null;
  private onEntityRemoved: ((entity: RemotePlayer | NPC) => void) | null = null;
  private cleanupCallbacks: (() => void)[] = [];

  constructor(playerFrames: Map<string, Texture>, npcFrames: Map<string, Texture>) {
    this.playerFrames = playerFrames;
    this.npcFrames = npcFrames;
  }

  setCallbacks(
    onAdded: (entity: RemotePlayer | NPC) => void,
    onRemoved: (entity: RemotePlayer | NPC) => void,
  ): void {
    this.onEntityAdded = onAdded;
    this.onEntityRemoved = onRemoved;
  }

  /**
   * Attach to a Colyseus room and listen for state changes.
   * Must be called AFTER the initial state is decoded (after onStateChange.once).
   */
  attachToRoom(room: Room, localSessionId: string): void {
    this.localSessionId = localSessionId;
    this.clearAll();

    // v4 callback proxy: $(instance) returns a proxy with onAdd/onRemove/listen/onChange
    const $ = getStateCallbacks(room) as any;
    const state = room.state as any;

    // Players added
    const unsubPlayerAdd = $(state.players).onAdd((player: any, sessionId: string) => {
      if (sessionId === this.localSessionId) return;

      const remote = new RemotePlayer(
        player.x,
        player.y,
        player.name,
        this.playerFrames,
      );
      this.remotePlayers.set(sessionId, remote);
      this.onEntityAdded?.(remote);

      // Listen for any property change on this player
      $(player).onChange(() => {
        remote.setServerState(
          player.x,
          player.y,
          player.direction as Direction,
          player.animation,
        );
      });
    });

    // Players removed
    const unsubPlayerRemove = $(state.players).onRemove((_player: any, sessionId: string) => {
      const remote = this.remotePlayers.get(sessionId);
      if (remote) {
        this.onEntityRemoved?.(remote);
        remote.destroy();
        this.remotePlayers.delete(sessionId);
      }
    });

    // NPCs added
    const unsubNpcAdd = $(state.npcs).onAdd((npc: any, npcId: string) => {
      const npcEntity = new NPC(
        npc.x,
        npc.y,
        npc.name,
        npc.direction as Direction,
        this.npcFrames,
      );
      this.npcs.set(npcId, npcEntity);
      this.onEntityAdded?.(npcEntity);
    });

    // NPCs removed
    const unsubNpcRemove = $(state.npcs).onRemove((_npc: any, npcId: string) => {
      const npcEntity = this.npcs.get(npcId);
      if (npcEntity) {
        this.onEntityRemoved?.(npcEntity);
        npcEntity.destroy();
        this.npcs.delete(npcId);
      }
    });

    this.cleanupCallbacks = [unsubPlayerAdd, unsubPlayerRemove, unsubNpcAdd, unsubNpcRemove];
  }

  update(dt: number): void {
    for (const remote of this.remotePlayers.values()) {
      remote.update(dt);
    }
    for (const npc of this.npcs.values()) {
      npc.update(dt);
    }
  }

  clearAll(): void {
    for (const cb of this.cleanupCallbacks) {
      cb?.();
    }
    this.cleanupCallbacks = [];

    for (const remote of this.remotePlayers.values()) {
      this.onEntityRemoved?.(remote);
      remote.destroy();
    }
    this.remotePlayers.clear();

    for (const npc of this.npcs.values()) {
      this.onEntityRemoved?.(npc);
      npc.destroy();
    }
    this.npcs.clear();
  }

  getRemotePlayers(): Map<string, RemotePlayer> {
    return this.remotePlayers;
  }
}
