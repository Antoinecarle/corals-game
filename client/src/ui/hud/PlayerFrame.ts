/**
 * Player frame HUD (top-left): portrait, name, level, HP, energy, corruption.
 * Dirty-checked: only touches DOM when values actually change.
 */
export class PlayerFrame {
  private el: HTMLDivElement;
  private nameEl: HTMLSpanElement;
  private levelEl: HTMLSpanElement;
  private hpFill: HTMLDivElement;
  private hpText: HTMLSpanElement;
  private energyFill: HTMLDivElement;
  private energyText: HTMLSpanElement;
  private corruptionFill: HTMLDivElement;
  private portraitEl: HTMLDivElement;

  // Cache previous values to skip DOM writes when unchanged
  private prevName = '';
  private prevLevel = -1;
  private prevHp = -1;
  private prevMaxHp = -1;
  private prevEnergy = -1;
  private prevMaxEnergy = -1;
  private prevCorruption = -1;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'player-frame ui-panel ui-interactive';
    this.el.innerHTML = `
      <div class="pf-portrait">&#9876;</div>
      <div class="pf-info">
        <div class="pf-name-row">
          <span class="pf-name">Player</span>
          <span class="pf-level">Lv.1</span>
        </div>
        <div class="pf-bars">
          <div class="ui-bar bar-hp">
            <div class="ui-bar-fill" style="width:100%"></div>
            <span class="ui-bar-text">100 / 100</span>
          </div>
          <div class="ui-bar bar-energy">
            <div class="ui-bar-fill" style="width:100%"></div>
            <span class="ui-bar-text">50 / 50</span>
          </div>
        </div>
        <div class="pf-corruption">
          <div class="pf-corruption-label">Corruption</div>
          <div class="ui-bar bar-corruption">
            <div class="ui-bar-fill" style="width:0%"></div>
          </div>
        </div>
      </div>
    `;
    parent.appendChild(this.el);

    this.portraitEl = this.el.querySelector('.pf-portrait')!;
    this.nameEl = this.el.querySelector('.pf-name')!;
    this.levelEl = this.el.querySelector('.pf-level')!;
    this.hpFill = this.el.querySelector('.bar-hp .ui-bar-fill')!;
    this.hpText = this.el.querySelector('.bar-hp .ui-bar-text')!;
    this.energyFill = this.el.querySelector('.bar-energy .ui-bar-fill')!;
    this.energyText = this.el.querySelector('.bar-energy .ui-bar-text')!;
    this.corruptionFill = this.el.querySelector('.bar-corruption .ui-bar-fill')!;
  }

  update(
    name: string,
    level: number,
    hp: number,
    maxHp: number,
    energy: number,
    maxEnergy: number,
    corruption: number,
  ): void {
    if (name !== this.prevName) {
      this.nameEl.textContent = name;
      this.prevName = name;
    }

    if (level !== this.prevLevel) {
      this.levelEl.textContent = `Lv.${level}`;
      this.prevLevel = level;
    }

    if (hp !== this.prevHp || maxHp !== this.prevMaxHp) {
      const hpPct = maxHp > 0 ? (hp / maxHp) * 100 : 0;
      this.hpFill.style.width = `${hpPct}%`;
      this.hpText.textContent = `${Math.round(hp)} / ${Math.round(maxHp)}`;
      this.prevHp = hp;
      this.prevMaxHp = maxHp;
    }

    if (energy !== this.prevEnergy || maxEnergy !== this.prevMaxEnergy) {
      const energyPct = maxEnergy > 0 ? (energy / maxEnergy) * 100 : 0;
      this.energyFill.style.width = `${energyPct}%`;
      this.energyText.textContent = `${Math.round(energy)} / ${Math.round(maxEnergy)}`;
      this.prevEnergy = energy;
      this.prevMaxEnergy = maxEnergy;
    }

    if (corruption !== this.prevCorruption) {
      const corruptPct = Math.min(100, Math.max(0, corruption));
      this.corruptionFill.style.width = `${corruptPct}%`;
      this.prevCorruption = corruption;

      if (corruptPct >= 50) {
        this.el.classList.add('corruption-high');
      } else {
        this.el.classList.remove('corruption-high');
      }
    }
  }
}
