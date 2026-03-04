import { Schema, defineTypes, MapSchema } from '@colyseus/schema';
import { PlayerState } from './PlayerState.js';
import { NPCState } from './NPCState.js';

export class GameState extends Schema {
  declare players: MapSchema<PlayerState>;
  declare npcs: MapSchema<NPCState>;
}

defineTypes(GameState, {
  players: { map: PlayerState },
  npcs: { map: NPCState },
});
