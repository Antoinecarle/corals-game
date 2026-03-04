import type { LootItem } from '@pirate-mmo/shared';

/**
 * UI for launching a tide from the bastion pillar.
 * Shows a "Lancer une Marée" button when near the pillar.
 * Also shows a summary after returning from a tide.
 */
export class TideLauncher {
  private el: HTMLDivElement;
  private launchBtn: HTMLButtonElement;
  private summaryEl: HTMLDivElement;

  private visible = false;
  private summaryVisible = false;
  private onLaunch: (() => void) | null = null;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'tide-launcher ui-interactive';
    this.el.style.display = 'none';
    this.el.innerHTML = `
      <div class="tide-launcher-inner">
        <div class="tide-launcher-icon">~</div>
        <div class="tide-launcher-label">Pilier de Marée</div>
        <button class="tide-launcher-btn">Lancer une Marée</button>
      </div>
    `;
    parent.appendChild(this.el);

    this.launchBtn = this.el.querySelector('.tide-launcher-btn')!;
    this.launchBtn.addEventListener('click', () => {
      this.onLaunch?.();
    });

    // Summary element (hidden by default)
    this.summaryEl = document.createElement('div');
    this.summaryEl.className = 'tide-summary ui-interactive';
    this.summaryEl.style.display = 'none';
    parent.appendChild(this.summaryEl);
  }

  setOnLaunch(cb: () => void): void {
    this.onLaunch = cb;
  }

  show(): void {
    if (this.visible) return;
    this.visible = true;
    this.el.style.display = 'flex';
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.el.style.display = 'none';
  }

  showSummary(reason: string, kept: LootItem[], lost: LootItem[]): void {
    const totalKeptValue = kept.reduce((s, i) => s + i.value * i.quantity, 0);
    const totalLostValue = lost.reduce((s, i) => s + i.value * i.quantity, 0);

    const reasonText = reason === 'reflux' ? 'Reflux réussi' : reason === 'death' ? 'Mort en mer' : 'Terminé';
    const reasonClass = reason === 'death' ? 'summary-death' : 'summary-success';

    this.summaryEl.innerHTML = `
      <div class="tide-summary-inner ${reasonClass}">
        <div class="tide-summary-header">${reasonText}</div>
        <div class="tide-summary-stats">
          <div class="tide-summary-row">
            <span>Loot conservé</span>
            <span class="summary-value-kept">${kept.length} items (${totalKeptValue} or)</span>
          </div>
          ${lost.length > 0 ? `
          <div class="tide-summary-row">
            <span>Loot perdu</span>
            <span class="summary-value-lost">${lost.length} items (${totalLostValue} or)</span>
          </div>
          ` : ''}
        </div>
        ${kept.length > 0 ? `
        <div class="tide-summary-items">
          ${kept.map(i => `<div class="summary-item rarity-${i.rarity}">${i.name} x${i.quantity}</div>`).join('')}
        </div>
        ` : '<div class="tide-summary-empty">Aucun loot récupéré</div>'}
        <button class="tide-summary-close">Fermer</button>
      </div>
    `;
    this.summaryEl.style.display = 'flex';
    this.summaryVisible = true;

    const closeBtn = this.summaryEl.querySelector('.tide-summary-close')!;
    closeBtn.addEventListener('click', () => {
      this.hideSummary();
    });
  }

  hideSummary(): void {
    this.summaryEl.style.display = 'none';
    this.summaryVisible = false;
  }
}
