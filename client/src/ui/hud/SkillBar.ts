/**
 * Skill bar HUD (bottom center): 10 skill slots, XP bar, path indicators.
 * XP bar dirty-checked — only updates DOM on value change.
 */
export class SkillBar {
  private el: HTMLDivElement;
  private slots: HTMLDivElement[] = [];
  private xpFill: HTMLDivElement;
  private xpText: HTMLSpanElement;
  private cooldowns: Map<number, { remaining: number; total: number }> = new Map();

  // Cache
  private prevXp = -1;
  private prevMaxXp = -1;

  // Default skill icons for placeholder display
  private static readonly SKILL_ICONS = ['⚔', '🛡', '🔥', '💨', '⚡', '💀', '✨', '🌊', '💎', '🏴'];
  private static readonly KEYBINDS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'skill-bar-wrapper ui-interactive';

    // Path dots
    const pathDots = document.createElement('div');
    pathDots.className = 'skill-path-dots';
    pathDots.innerHTML = `
      <div class="path-dot forge active-path" data-tooltip="Forge" data-tooltip-title="Forge Path"></div>
      <div class="path-dot coral" data-tooltip="Coral" data-tooltip-title="Coral Path"></div>
      <div class="path-dot fer" data-tooltip="Fer" data-tooltip-title="Fer Path"></div>
    `;
    this.el.appendChild(pathDots);

    // Skill slots
    const bar = document.createElement('div');
    bar.className = 'skill-bar ui-panel';

    for (let i = 0; i < 10; i++) {
      const slot = document.createElement('div');
      slot.className = 'skill-slot';
      slot.setAttribute('data-tooltip', `Skill ${i + 1}`);
      slot.setAttribute('data-tooltip-title', `Slot ${i + 1}`);
      slot.innerHTML = `
        <span class="skill-icon">${SkillBar.SKILL_ICONS[i]}</span>
        <span class="skill-keybind">${SkillBar.KEYBINDS[i]}</span>
        <div class="skill-cooldown"></div>
      `;
      slot.addEventListener('click', () => {
        this.activateSlot(i);
      });
      bar.appendChild(slot);
      this.slots.push(slot);
    }
    this.el.appendChild(bar);

    // XP bar
    const xpWrapper = document.createElement('div');
    xpWrapper.className = 'skill-bar-xp';
    xpWrapper.innerHTML = `
      <div class="ui-bar bar-xp">
        <div class="ui-bar-fill" style="width:0%"></div>
        <span class="ui-bar-text">0 / 1000 XP</span>
      </div>
    `;
    this.el.appendChild(xpWrapper);

    parent.appendChild(this.el);

    this.xpFill = xpWrapper.querySelector('.ui-bar-fill')!;
    this.xpText = xpWrapper.querySelector('.ui-bar-text')!;
  }

  activateSlot(index: number): void {
    const slot = this.slots[index];
    if (!slot) return;
    slot.classList.add('active');
    setTimeout(() => slot.classList.remove('active'), 200);
  }

  startCooldown(index: number, durationMs: number): void {
    const slot = this.slots[index];
    if (!slot) return;
    const cdEl = slot.querySelector('.skill-cooldown') as HTMLDivElement;
    cdEl.classList.add('on-cd');
    this.cooldowns.set(index, { remaining: durationMs, total: durationMs });

    const tick = () => {
      const cd = this.cooldowns.get(index);
      if (!cd || cd.remaining <= 0) {
        cdEl.classList.remove('on-cd');
        cdEl.textContent = '';
        this.cooldowns.delete(index);
        return;
      }
      cd.remaining -= 100;
      cdEl.textContent = `${Math.ceil(cd.remaining / 1000)}`;
      setTimeout(tick, 100);
    };
    tick();
  }

  updateXP(xp: number, maxXp: number): void {
    if (xp === this.prevXp && maxXp === this.prevMaxXp) return;
    this.prevXp = xp;
    this.prevMaxXp = maxXp;
    const pct = maxXp > 0 ? (xp / maxXp) * 100 : 0;
    this.xpFill.style.width = `${pct}%`;
    this.xpText.textContent = `${Math.round(xp)} / ${Math.round(maxXp)} XP`;
  }
}
