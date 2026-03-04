import { MapSchema } from '@colyseus/schema';
import { NPCState } from '../schema/NPCState.js';

interface NPCDefinition {
  npcId: string;
  name: string;
  npcType: string;
  x: number;
  y: number;
  direction: number;
}

// Static NPC definitions per zone
const ZONE_NPCS: Record<string, NPCDefinition[]> = {
  '0,0': [
    { npcId: 'npc-dock-master', name: 'Dock Master Morgan', npcType: 'merchant', x: 130, y: 125, direction: 0 },
    { npcId: 'npc-old-pete', name: 'Old Pete', npcType: 'quest_giver', x: 120, y: 135, direction: 6 },
    { npcId: 'npc-blacksmith', name: 'Ironjaw the Smith', npcType: 'blacksmith', x: 140, y: 130, direction: 2 },
    { npcId: 'npc-tavern-keeper', name: 'Madame Rouge', npcType: 'tavern_keeper', x: 125, y: 140, direction: 0 },
  ],
};

export class NPCSpawner {
  /**
   * Spawn static NPCs for a zone into the provided MapSchema.
   */
  static spawnForZone(
    zoneX: number,
    zoneY: number,
    npcs: MapSchema<NPCState>,
  ): void {
    const key = `${zoneX},${zoneY}`;
    const definitions = ZONE_NPCS[key];

    if (!definitions) return;

    for (const def of definitions) {
      const npc = new NPCState();
      npc.npcId = def.npcId;
      npc.name = def.name;
      npc.npcType = def.npcType;
      npc.x = def.x;
      npc.y = def.y;
      npc.direction = def.direction;
      npcs.set(def.npcId, npc);
    }

    console.log(`[NPCSpawner] Spawned ${definitions.length} NPCs in zone ${key}`);
  }
}
