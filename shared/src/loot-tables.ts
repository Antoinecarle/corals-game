// ─── Loot Tables (Palier 1 — Eaux Calmes) ─────────────

import type { LootItem, LootRarity } from './tide-types.js';
import { TidePalier } from './tide-types.js';

interface LootTemplate {
  type: string;
  name: string;
  rarity: LootRarity;
  weight: number;
  value: number;
  description: string;
  dropChance: number; // relative weight for random selection
}

const PALIER_1_LOOT: LootTemplate[] = [
  {
    type: 'mineral',
    name: 'Fer brut',
    rarity: 'common',
    weight: 2,
    value: 5,
    description: 'Minerai de fer commun',
    dropChance: 20,
  },
  {
    type: 'mineral',
    name: 'Cuivre',
    rarity: 'common',
    weight: 2,
    value: 8,
    description: 'Lingot de cuivre',
    dropChance: 18,
  },
  {
    type: 'fuel',
    name: 'Charbon',
    rarity: 'common',
    weight: 1,
    value: 3,
    description: 'Combustible de base',
    dropChance: 22,
  },
  {
    type: 'material',
    name: 'Bois flotté',
    rarity: 'common',
    weight: 3,
    value: 4,
    description: 'Bois récupéré des épaves',
    dropChance: 18,
  },
  {
    type: 'coral_fragment',
    name: 'Éclat de Coral',
    rarity: 'uncommon',
    weight: 1,
    value: 25,
    description: 'Fragment luminescent, bonus passif mineur',
    dropChance: 6,
  },
  {
    type: 'ether',
    name: 'Éther Noir (fiole)',
    rarity: 'uncommon',
    weight: 1,
    value: 30,
    description: 'Énergie liquide, petite quantité',
    dropChance: 5,
  },
  {
    type: 'blueprint',
    name: 'Plan de crafting',
    rarity: 'uncommon',
    weight: 0,
    value: 20,
    description: 'Schéma pour un objet basique',
    dropChance: 4,
  },
  {
    type: 'ship_part',
    name: 'Composant naval',
    rarity: 'common',
    weight: 3,
    value: 10,
    description: 'Pièce pour navire',
    dropChance: 7,
  },
];

const LOOT_TABLES: Record<TidePalier, LootTemplate[]> = {
  [TidePalier.EAUX_CALMES]: PALIER_1_LOOT,
};

let lootIdCounter = 0;

/**
 * Roll a random loot item from the given palier's loot table.
 * Returns a new LootItem with a unique id.
 */
export function rollLoot(palier: TidePalier): LootItem {
  const table = LOOT_TABLES[palier];
  if (!table || table.length === 0) {
    throw new Error(`No loot table for palier ${palier}`);
  }

  // Weighted random selection
  const totalWeight = table.reduce((sum, t) => sum + t.dropChance, 0);
  let roll = Math.random() * totalWeight;

  let selected = table[0];
  for (const template of table) {
    roll -= template.dropChance;
    if (roll <= 0) {
      selected = template;
      break;
    }
  }

  lootIdCounter++;
  return {
    id: `loot-${Date.now()}-${lootIdCounter}`,
    type: selected.type,
    name: selected.name,
    rarity: selected.rarity,
    quantity: 1,
    value: selected.value,
    weight: selected.weight,
    description: selected.description,
  };
}

/**
 * Get all loot templates for a palier (useful for UI display).
 */
export function getLootTable(palier: TidePalier): LootTemplate[] {
  return LOOT_TABLES[palier] ?? [];
}
