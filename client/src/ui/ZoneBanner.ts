/**
 * Zone transition banner — cinematic "Entering Zone" overlay.
 * Appears in the center-bottom of the screen, fades in/out.
 */
export class ZoneBanner {
  private container: HTMLDivElement;
  private nameEl: HTMLDivElement;
  private subEl: HTMLDivElement;
  private timer = 0;
  private active = false;

  private static readonly HOLD = 2.5; // seconds at full opacity
  private static readonly FADE = 0.8; // seconds to fade out

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.className = 'zone-banner';
    this.container.style.display = 'none';
    this.container.style.opacity = '0';

    this.nameEl = document.createElement('div');
    this.nameEl.className = 'zone-banner-name';

    this.subEl = document.createElement('div');
    this.subEl.className = 'zone-banner-sub';

    this.container.appendChild(this.nameEl);
    this.container.appendChild(this.subEl);
    parent.appendChild(this.container);
  }

  show(name: string, sub: string = ''): void {
    this.nameEl.textContent = name;
    this.subEl.textContent = sub;
    this.timer = 0;
    this.active = true;
    this.container.style.display = 'flex';
    // Small delay so display:flex takes effect before opacity transition
    requestAnimationFrame(() => {
      this.container.style.opacity = '1';
    });
  }

  update(dt: number): void {
    if (!this.active) return;
    this.timer += dt;
    const total = ZoneBanner.HOLD + ZoneBanner.FADE;
    if (this.timer >= ZoneBanner.HOLD) {
      const fade = Math.max(0, 1 - (this.timer - ZoneBanner.HOLD) / ZoneBanner.FADE);
      this.container.style.opacity = `${fade}`;
      if (this.timer >= total) {
        this.active = false;
        this.container.style.display = 'none';
      }
    }
  }

  destroy(): void {
    this.container.remove();
  }
}
