import { Schema, defineTypes } from '@colyseus/schema';

export class PlayerState extends Schema {
  declare x: number;
  declare y: number;
  declare targetX: number;
  declare targetY: number;
  declare direction: number;
  declare animation: string;
  declare name: string;
  declare sessionId: string;
  declare playerId: string;
}

defineTypes(PlayerState, {
  x: 'float32',
  y: 'float32',
  targetX: 'float32',
  targetY: 'float32',
  direction: 'uint8',
  animation: 'string',
  name: 'string',
  sessionId: 'string',
  playerId: 'string',
});
