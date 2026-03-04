/**
 * SiphonChannelBar — 3-second cast bar for Siphon interaction.
 * Displayed in the center of the screen (WoW-style cast bar).
 * Cancelled by player movement or enemy proximity.
 */
export class SiphonChannelBar {
  private container: HTMLDivElement;
  private fill: HTMLDivElement;
  private active = false;
  private elapsed = 0;
  private onComplete: () => void;

  static readonly DURATION = 3; // seconds

  constructor(parent: HTMLElement, onComplete: () => void) {
    this.onComplete = onComplete;

    this.container = document.createElement('div');
    this.container.className = 'siphon-cast-bar';
    this.container.style.display = 'none';

    const label = document.createElement('div');
    label.className = 'siphon-cast-label';
    label.textContent = 'Canalisation du Siphon…';

    const track = document.createElement('div');
    track.className = 'siphon-cast-track';

    this.fill = document.createElement('div');
    this.fill.className = 'siphon-cast-fill';
    track.appendChild(this.fill);

    this.container.appendChild(label);
    this.container.appendChild(track);
    parent.appendChild(this.container);
  }

  start(): void {
    this.elapsed = 0;
    this.active = true;
    this.fill.style.width = '0%';
    this.container.style.display = 'flex';
  }

  /** Cancel channeling (movement, damage, etc.) */
  cancel(): void {
    if (!this.active) return;
    this.active = false;
    this.container.style.display = 'none';
  }

  update(dt: number): void {
    if (!this.active) return;
    this.elapsed = Math.min(this.elapsed + dt, SiphonChannelBar.DURATION);
    this.fill.style.width = `${(this.elapsed / SiphonChannelBar.DURATION) * 100}%`;
    if (this.elapsed >= SiphonChannelBar.DURATION) {
      this.active = false;
      this.container.style.display = 'none';
      this.onComplete();
    }
  }

  isActive(): boolean { return this.active; }

  destroy(): void {
    this.container.remove();
  }
}
