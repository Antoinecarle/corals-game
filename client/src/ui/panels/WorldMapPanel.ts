import { PanelBase } from './PanelBase.js';

interface ZoneInfo {
  name: string;
  discovered: boolean;
  current: boolean;
  level: string;
}

const ZONES: ZoneInfo[] = [
  { name: 'Etendue Gelee', discovered: false, current: false, level: '50-60' },
  { name: 'Mer de Rouille', discovered: false, current: false, level: '20-35' },
  { name: 'Recifs de Chair', discovered: false, current: false, level: '40-55' },
  { name: 'Port-Forge', discovered: true, current: false, level: '10-20' },
  { name: 'Ancrage', discovered: true, current: true, level: '1-10' },
  { name: 'Lumiveil', discovered: true, current: false, level: '5-15' },
  { name: 'Lisiere de Brume', discovered: false, current: false, level: '55-70' },
  { name: 'Mer Doree', discovered: false, current: false, level: '25-40' },
  { name: 'Mer des Abysses', discovered: false, current: false, level: '45-60' },
];

/**
 * World map panel (M key): grid of zones.
 */
export class WorldMapPanel extends PanelBase {
  constructor(parent: HTMLElement) {
    super(parent, 'World Map');

    // Legend
    const legend = document.createElement('div');
    legend.className = 'panel-section';
    legend.innerHTML = `
      <div class="panel-section-title">Archipel de CORALS</div>
      <div style="font-size:11px; color:var(--ui-text-dim); margin-bottom:12px;">
        The archipelago is arranged in concentric rings.
        Inner ring: safe. Outer rings: increasing danger.
      </div>
    `;
    this.contentEl.appendChild(legend);

    // Grid
    const grid = document.createElement('div');
    grid.className = 'world-map-grid';

    for (const zone of ZONES) {
      const el = document.createElement('div');
      const classes = ['map-zone'];
      if (zone.discovered) classes.push('discovered');
      else classes.push('undiscovered');
      if (zone.current) classes.push('current');
      el.className = classes.join(' ');

      el.innerHTML = `
        <div style="font-size:16px;">${zone.current ? '&#9733;' : zone.discovered ? '&#9675;' : '?'}</div>
        <div class="map-zone-name">${zone.discovered ? zone.name : '???'}</div>
        ${zone.discovered ? `<div style="font-size:9px; color:var(--ui-text-dark);">Lv.${zone.level}</div>` : ''}
      `;

      if (zone.discovered) {
        el.setAttribute('data-tooltip', `Level range: ${zone.level}`);
        el.setAttribute('data-tooltip-title', zone.name);
      }

      grid.appendChild(el);
    }

    this.contentEl.appendChild(grid);
  }
}
