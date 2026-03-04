import { Schema, defineTypes } from '@colyseus/schema';

export class NPCState extends Schema {
  declare x: number;
  declare y: number;
  declare direction: number;
  declare npcType: string;
  declare name: string;
  declare npcId: string;
}

defineTypes(NPCState, {
  x: 'float32',
  y: 'float32',
  direction: 'uint8',
  npcType: 'string',
  name: 'string',
  npcId: 'string',
});
