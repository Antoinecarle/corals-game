/**
 * HTML canvas minimap (top-right), replaces PixiJS Minimap.
 */
export class MinimapHUD {
  private el: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private zoneLabelEl: HTMLSpanElement;
  private size: number;
  private mapSize: number;

  constructor(parent: HTMLElement, mapSize: number, displaySize = 160) {
    this.mapSize = mapSize;
    this.size = displaySize;

    this.el = document.createElement('div');
    this.el.className = 'minimap-hud ui-panel ui-interactive';
    this.el.style.position = 'absolute';

    // Compass labels
    this.el.innerHTML = `
      <span class="minimap-compass north">N</span>
      <span class="minimap-compass south">S</span>
      <span class="minimap-compass east">E</span>
      <span class="minimap-compass west">W</span>
    `;

    // Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = displaySize;
    this.canvas.height = displaySize;
    this.canvas.style.display = 'block';
    this.el.appendChild(this.canvas);

    // Zone label
    this.zoneLabelEl = document.createElement('span');
    this.zoneLabelEl.className = 'minimap-zone-label';
    this.zoneLabelEl.textContent = 'Ancrage - Zone 0,0';
    this.el.appendChild(this.zoneLabelEl);

    parent.appendChild(this.el);

    this.ctx = this.canvas.getContext('2d')!;
  }

  update(
    localX: number,
    localY: number,
    dots: Array<{ x: number; y: number; color: string; type: string }>,
    zoneLabel: string,
  ): void {
    const ctx = this.ctx;
    const scale = this.size / this.mapSize;

    // Clear
    ctx.clearRect(0, 0, this.size, this.size);

    // Background
    ctx.fillStyle = 'rgba(10, 10, 26, 0.6)';
    ctx.fillRect(0, 0, this.size, this.size);

    // Border
    ctx.strokeStyle = 'rgba(212, 168, 83, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, this.size - 1, this.size - 1);

    // Draw dots (other players + NPCs)
    for (const dot of dots) {
      const mx = dot.x * scale;
      const my = dot.y * scale;
      ctx.fillStyle = dot.color;
      ctx.beginPath();
      ctx.arc(mx, my, dot.type === 'npc' ? 2 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw local player (gold, larger)
    const lx = localX * scale;
    const ly = localY * scale;
    ctx.fillStyle = '#d4a853';
    ctx.beginPath();
    ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Gold glow around player
    ctx.strokeStyle = 'rgba(212, 168, 83, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(lx, ly, 6, 0, Math.PI * 2);
    ctx.stroke();

    // Zone label
    this.zoneLabelEl.textContent = zoneLabel;
  }
}
