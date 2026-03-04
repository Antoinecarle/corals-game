import { PanelBase } from './PanelBase.js';

/**
 * Character panel (C key): stats, equipment, corruption, power paths.
 */
export class CharacterPanel extends PanelBase {
  constructor(parent: HTMLElement) {
    super(parent, 'Character');
    this.contentEl.innerHTML = `
      <div class="panel-section">
        <div style="text-align:center; margin-bottom:12px;">
          <div style="font-size:18px; font-weight:600; color:var(--ui-gold);">Pirate</div>
          <div style="font-size:12px; color:var(--ui-text-dim);">Flots Libres &bull; Resonant</div>
        </div>
      </div>

      <div class="panel-section">
        <div class="panel-section-title">Stats</div>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Force</span>
            <span class="stat-value">12</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Agilite</span>
            <span class="stat-value">15</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Endurance</span>
            <span class="stat-value">10</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Intelligence</span>
            <span class="stat-value">8</span>
          </div>
          <div class="stat-item" style="grid-column: span 2;">
            <span class="stat-label">Resonance</span>
            <span class="stat-value" style="color:var(--ui-coral);">14</span>
          </div>
        </div>
      </div>

      <div class="panel-section">
        <div class="panel-section-title">Equipment</div>
        <div class="equip-grid">
          <div class="equip-slot" data-tooltip="Head slot" data-tooltip-title="Head"><span class="equip-label">Head</span></div>
          <div class="equip-slot" data-tooltip="Chest armor" data-tooltip-title="Chest"><span class="equip-label">Chest</span></div>
          <div class="equip-slot" data-tooltip="Leg armor" data-tooltip-title="Legs"><span class="equip-label">Legs</span></div>
          <div class="equip-slot" data-tooltip="Boots" data-tooltip-title="Boots"><span class="equip-label">Boots</span></div>
          <div class="equip-slot" data-tooltip="Main weapon" data-tooltip-title="Weapon"><span class="equip-label">Weapon</span></div>
          <div class="equip-slot" data-tooltip="Off-hand" data-tooltip-title="Offhand"><span class="equip-label">Offhand</span></div>
          <div class="equip-slot" data-tooltip="Accessory slot 1" data-tooltip-title="Ring"><span class="equip-label">Ring</span></div>
          <div class="equip-slot" data-tooltip="Accessory slot 2" data-tooltip-title="Amulet"><span class="equip-label">Amulet</span></div>
        </div>
      </div>

      <div class="panel-section">
        <div class="panel-section-title">Corruption</div>
        <div style="margin-bottom:8px;">
          <div class="ui-bar bar-corruption" style="height:12px;">
            <div class="ui-bar-fill" style="width:15%; border-radius:6px;"></div>
            <span class="ui-bar-text">15%</span>
          </div>
        </div>
        <div style="font-size:11px; color:var(--ui-text-dim);">
          Stage: <span style="color:var(--ui-coral);">Awakened</span> &mdash; Minor coral growths visible.
        </div>
      </div>

      <div class="panel-section">
        <div class="panel-section-title">Power Paths</div>
        <div class="power-paths">
          <div class="power-path-row">
            <span class="power-path-label">Forge</span>
            <div class="power-path-bar path-forge">
              <div class="ui-bar"><div class="ui-bar-fill" style="width:30%"></div></div>
            </div>
            <span class="power-path-level">3</span>
          </div>
          <div class="power-path-row">
            <span class="power-path-label">Coral</span>
            <div class="power-path-bar path-coral">
              <div class="ui-bar"><div class="ui-bar-fill" style="width:65%"></div></div>
            </div>
            <span class="power-path-level">7</span>
          </div>
          <div class="power-path-row">
            <span class="power-path-label">Fer</span>
            <div class="power-path-bar path-fer">
              <div class="ui-bar"><div class="ui-bar-fill" style="width:10%"></div></div>
            </div>
            <span class="power-path-level">1</span>
          </div>
        </div>
      </div>
    `;
  }
}
