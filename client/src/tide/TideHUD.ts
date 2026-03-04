import { TideState, type LootItem } from '@pirate-mmo/shared';

/**
 * HUD bar displayed at the top of the screen during an active tide.
 * Shows: palier, items carried, total value, zone indicator, quick reflux button.
 */
export class TideHUD {
  private el: HTMLDivElement;
  private palierEl: HTMLSpanElement;
  private itemCountEl: HTMLSpanElement;
  private valueEl: HTMLSpanElement;
  private zoneEl: HTMLSpanElement;
  private refluxBtn: HTMLButtonElement;

  private visible = false;
  private onReflux: (() => void) | null = null;

  // Dirty-check cache
  private lastItemCount = -1;
  private lastValue = -1;
  private lastZone = '';

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'tide-hud ui-interactive';
    this.el.style.display = 'none';
    this.el.innerHTML = `
      <div class="tide-hud-inner">
        <div class="tide-hud-left">
          <span class="tide-hud-icon">~</span>
          <span class="tide-hud-palier">Palier 1 — Eaux Calmes</span>
        </div>
        <div class="tide-hud-center">
          <span class="tide-hud-zone">Bastion</span>
          <span class="tide-hud-separator">|</span>
          <span class="tide-hud-items">0 items</span>
          <span class="tide-hud-separator">|</span>
          <span class="tide-hud-value">0 or</span>
        </div>
        <div class="tide-hud-right">
          <button class="tide-hud-reflux-btn">Refluer</button>
        </div>
      </div>
    `;
    parent.appendChild(this.el);

    this.palierEl = this.el.querySelector('.tide-hud-palier')!;
    this.itemCountEl = this.el.querySelector('.tide-hud-items')!;
    this.valueEl = this.el.querySelector('.tide-hud-value')!;
    this.zoneEl = this.el.querySelector('.tide-hud-zone')!;
    this.refluxBtn = this.el.querySelector('.tide-hud-reflux-btn')!;

    this.refluxBtn.addEventListener('click', () => {
      this.onReflux?.();
    });
  }

  setOnReflux(cb: () => void): void {
    this.onReflux = cb;
  }

  show(): void {
    if (this.visible) return;
    this.visible = true;
    this.el.style.display = 'block';
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.el.style.display = 'none';
    this.lastItemCount = -1;
    this.lastValue = -1;
    this.lastZone = '';
  }

  update(
    state: TideState,
    carriedLoot: LootItem[],
    zone: 'bastion' | 'palier1',
  ): void {
    if (state === TideState.NONE || state === TideState.COMPLETED) {
      this.hide();
      return;
    }
    this.show();

    const itemCount = carriedLoot.length;
    const totalValue = carriedLoot.reduce((s, i) => s + i.value * i.quantity, 0);

    if (itemCount !== this.lastItemCount) {
      this.itemCountEl.textContent = `${itemCount} item${itemCount !== 1 ? 's' : ''}`;
      this.lastItemCount = itemCount;
    }

    if (totalValue !== this.lastValue) {
      this.valueEl.textContent = `${totalValue} or`;
      this.lastValue = totalValue;
    }

    if (zone !== this.lastZone) {
      this.zoneEl.textContent = zone === 'bastion' ? 'Bastion' : 'Palier 1';
      this.zoneEl.className = `tide-hud-zone ${zone === 'bastion' ? 'zone-safe' : 'zone-danger'}`;
      this.lastZone = zone;
    }
  }
}
