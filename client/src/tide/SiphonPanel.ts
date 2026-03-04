import { PanelBase } from '../ui/panels/PanelBase.js';
import type { LootItem } from '@pirate-mmo/shared';

/**
 * Siphon interaction panel (HTML overlay).
 * Shows carried loot, chest capacity, bank/reflux/continue actions.
 */
export class SiphonPanel extends PanelBase {
  private carriedGrid: HTMLDivElement;
  private bankedGrid: HTMLDivElement;
  private capacityBar: HTMLDivElement;
  private capacityLabel: HTMLSpanElement;
  private bankBtn: HTMLButtonElement;
  private refluxBtn: HTMLButtonElement;
  private closeBtn2: HTMLButtonElement;

  private selectedIds: Set<string> = new Set();

  // Callbacks
  private onBank: ((itemIds: string[]) => void) | null = null;
  private onReflux: (() => void) | null = null;
  private onClose: (() => void) | null = null;

  constructor(parent: HTMLElement) {
    super(parent, 'Siphon — Coffre de Marée');

    this.contentEl.innerHTML = `
      <div class="siphon-panel">
        <div class="siphon-section">
          <div class="siphon-section-header">
            <span>Loot transporté</span>
            <span class="siphon-select-all">Tout sélectionner</span>
          </div>
          <div class="siphon-carried-grid"></div>
        </div>
        <div class="siphon-divider">
          <div class="siphon-capacity-container">
            <div class="siphon-capacity-bar">
              <div class="siphon-capacity-fill"></div>
            </div>
            <span class="siphon-capacity-label">Coffre: 0%</span>
          </div>
        </div>
        <div class="siphon-section">
          <div class="siphon-section-header">Loot sécurisé (coffre)</div>
          <div class="siphon-banked-grid"></div>
        </div>
        <div class="siphon-actions">
          <button class="siphon-btn siphon-btn-bank">Déposer la sélection</button>
          <button class="siphon-btn siphon-btn-reflux">Refluer (retour safe)</button>
          <button class="siphon-btn siphon-btn-close">Continuer l'exploration</button>
        </div>
      </div>
    `;

    this.carriedGrid = this.contentEl.querySelector('.siphon-carried-grid')!;
    this.bankedGrid = this.contentEl.querySelector('.siphon-banked-grid')!;
    this.capacityBar = this.contentEl.querySelector('.siphon-capacity-fill')!;
    this.capacityLabel = this.contentEl.querySelector('.siphon-capacity-label')!;
    this.bankBtn = this.contentEl.querySelector('.siphon-btn-bank')!;
    this.refluxBtn = this.contentEl.querySelector('.siphon-btn-reflux')!;
    this.closeBtn2 = this.contentEl.querySelector('.siphon-btn-close')!;

    // Select all button
    const selectAllBtn = this.contentEl.querySelector('.siphon-select-all')!;
    selectAllBtn.addEventListener('click', () => {
      const items = this.carriedGrid.querySelectorAll('.siphon-item');
      items.forEach(el => el.classList.add('selected'));
      this.selectedIds.clear();
      items.forEach(el => {
        const id = el.getAttribute('data-item-id');
        if (id) this.selectedIds.add(id);
      });
    });

    this.bankBtn.addEventListener('click', () => {
      if (this.selectedIds.size > 0) {
        this.onBank?.([...this.selectedIds]);
        this.selectedIds.clear();
      }
    });

    this.refluxBtn.addEventListener('click', () => {
      this.onReflux?.();
    });

    this.closeBtn2.addEventListener('click', () => {
      this.close();
      this.onClose?.();
    });
  }

  setCallbacks(
    bank: (itemIds: string[]) => void,
    reflux: () => void,
    onClose: () => void,
  ): void {
    this.onBank = bank;
    this.onReflux = reflux;
    this.onClose = onClose;
  }

  updateLoot(carried: LootItem[], banked: LootItem[], chestCapacity: number): void {
    // Update carried grid
    this.carriedGrid.innerHTML = '';
    this.selectedIds.clear();
    for (const item of carried) {
      const el = this.createItemElement(item, true);
      this.carriedGrid.appendChild(el);
    }

    // Update banked grid
    this.bankedGrid.innerHTML = '';
    for (const item of banked) {
      const el = this.createItemElement(item, false);
      this.bankedGrid.appendChild(el);
    }

    // Update capacity bar
    const carriedWeight = carried.reduce((s, i) => s + i.weight * i.quantity, 0);
    const bankedWeight = banked.reduce((s, i) => s + i.weight * i.quantity, 0);
    const maxWeight = Math.max(1, Math.floor(carriedWeight * chestCapacity));
    const fillPct = Math.min(100, (bankedWeight / maxWeight) * 100);
    this.capacityBar.style.width = `${fillPct}%`;
    this.capacityLabel.textContent = `Coffre: ${bankedWeight}/${maxWeight} poids (${Math.round(chestCapacity * 100)}% max)`;

    // Disable bank if chest is full
    this.bankBtn.disabled = bankedWeight >= maxWeight;
  }

  private createItemElement(item: LootItem, selectable: boolean): HTMLDivElement {
    const el = document.createElement('div');
    el.className = `siphon-item rarity-${item.rarity}`;
    el.setAttribute('data-item-id', item.id);
    el.innerHTML = `
      <div class="siphon-item-name">${item.name}</div>
      <div class="siphon-item-info">
        <span class="siphon-item-value">${item.value} or</span>
        <span class="siphon-item-weight">${item.weight} kg</span>
      </div>
    `;

    if (selectable) {
      el.addEventListener('click', () => {
        if (this.selectedIds.has(item.id)) {
          this.selectedIds.delete(item.id);
          el.classList.remove('selected');
        } else {
          this.selectedIds.add(item.id);
          el.classList.add('selected');
        }
      });
    }

    return el;
  }
}
