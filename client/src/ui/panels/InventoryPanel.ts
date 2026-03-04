import { PanelBase } from './PanelBase.js';

const FILTERS = ['All', 'Equipment', 'Materials', 'Consumables', 'Fragments'];

interface InventoryItem {
  icon: string;
  name: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic';
  stack?: number;
}

// Demo items for visual showcase
const DEMO_ITEMS: (InventoryItem | null)[] = [
  { icon: '⚔', name: 'Rusted Cutlass', description: 'A worn pirate blade.', rarity: 'common' },
  { icon: '🛡', name: 'Plank Shield', description: 'Barely holds together.', rarity: 'common' },
  { icon: '🧪', name: 'Health Potion', description: 'Restores 50 HP.', rarity: 'uncommon', stack: 3 },
  { icon: '💎', name: 'Coral Fragment', description: 'A pulsing shard of coral energy.', rarity: 'rare' },
  { icon: '🔥', name: 'Ember Shard', description: 'Warm to the touch, never extinguishes.', rarity: 'rare' },
  { icon: '🌊', name: 'Tidal Essence', description: 'Swirls with contained current.', rarity: 'legendary' },
  null, null, null, null,
  { icon: '🪵', name: 'Driftwood', description: 'Common building material.', rarity: 'common', stack: 12 },
  { icon: '⚙', name: 'Iron Gear', description: 'Steam engine component.', rarity: 'uncommon', stack: 5 },
  null, null, null, null, null, null,
  null, null, null, null, null, null,
];

/**
 * Inventory panel (I key): grid layout with items, filters, currency.
 */
export class InventoryPanel extends PanelBase {
  private gridEl!: HTMLDivElement;
  private activeFilter = 'All';

  constructor(parent: HTMLElement) {
    super(parent, 'Inventory');

    // Filters
    const filters = document.createElement('div');
    filters.className = 'inv-filters';
    for (const f of FILTERS) {
      const tab = document.createElement('div');
      tab.className = `inv-filter ${f === this.activeFilter ? 'active' : ''}`;
      tab.textContent = f;
      tab.addEventListener('click', () => {
        this.activeFilter = f;
        filters.querySelectorAll('.inv-filter').forEach((el) =>
          el.classList.toggle('active', el.textContent === f),
        );
      });
      filters.appendChild(tab);
    }
    this.contentEl.appendChild(filters);

    // Grid
    this.gridEl = document.createElement('div');
    this.gridEl.className = 'inv-grid';
    this.renderGrid();
    this.contentEl.appendChild(this.gridEl);

    // Currency
    const currency = document.createElement('div');
    currency.className = 'inv-currency';
    currency.innerHTML = '&#9733; 1,250 Gold';
    this.contentEl.appendChild(currency);
  }

  private renderGrid(): void {
    this.gridEl.innerHTML = '';
    for (let i = 0; i < 24; i++) {
      const slot = document.createElement('div');
      const item = DEMO_ITEMS[i] || null;

      if (item) {
        slot.className = `inv-slot has-item rarity-${item.rarity}`;
        slot.setAttribute('data-tooltip', item.description);
        slot.setAttribute('data-tooltip-title', item.name);
        slot.innerHTML = `
          <span style="font-size:20px;">${item.icon}</span>
          ${item.stack && item.stack > 1 ? `<span class="inv-stack">${item.stack}</span>` : ''}
        `;
      } else {
        slot.className = 'inv-slot';
      }

      this.gridEl.appendChild(slot);
    }
  }
}
