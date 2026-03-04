import { Room, Client } from '@colyseus/core';
import { LobbyState } from '../schema/LobbyState.js';
import { findOrCreate } from '../db/player-repository.js';
import { MAX_NAME_LENGTH } from '@pirate-mmo/shared';

interface LobbyJoinOptions {
  name: string;
}

export class LobbyRoom extends Room<LobbyState> {
  onCreate(): void {
    this.setState(new LobbyState());
    console.log('[LobbyRoom] Created');
  }

  async onJoin(client: Client, options: LobbyJoinOptions): Promise<void> {
    const name = (options.name ?? '').trim();

    if (!name || name.length > MAX_NAME_LENGTH) {
      client.send('lobbyError', { error: 'Invalid name (1-20 characters)' });
      client.leave();
      return;
    }

    // Validate name format (alphanumeric + spaces + underscores)
    if (!/^[a-zA-Z0-9_ ]+$/.test(name)) {
      client.send('lobbyError', { error: 'Name can only contain letters, numbers, spaces and underscores' });
      client.leave();
      return;
    }

    try {
      // Find or create player in DB
      const player = await findOrCreate(name);

      // Send player data back to client
      client.send('lobbyPlayerData', {
        playerId: player.id,
        name: player.name,
        zoneX: player.zone_x,
        zoneY: player.zone_y,
        tileX: player.tile_x,
        tileY: player.tile_y,
        direction: player.direction,
      });

      console.log(`[LobbyRoom] Player "${name}" logged in → zone (${player.zone_x}, ${player.zone_y})`);

      // Client should now join the appropriate zone room and leave lobby
    } catch (err) {
      console.error('[LobbyRoom] Error:', err);
      client.send('lobbyError', { error: 'Server error' });
      client.leave();
    }
  }

  onLeave(client: Client): void {
    // Nothing to clean up
  }
}
