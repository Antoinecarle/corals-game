import { PanelBase } from './PanelBase.js';

/**
 * Settings panel (Esc key): audio, graphics, controls, logout.
 */
export class SettingsPanel extends PanelBase {
  constructor(parent: HTMLElement) {
    super(parent, 'Settings');

    this.contentEl.innerHTML = `
      <div class="settings-group">
        <div class="panel-section-title">Audio</div>
        <div class="settings-row">
          <span class="settings-label">Master Volume</span>
          <input type="range" class="settings-slider" min="0" max="100" value="80" />
        </div>
        <div class="settings-row">
          <span class="settings-label">SFX</span>
          <input type="range" class="settings-slider" min="0" max="100" value="70" />
        </div>
        <div class="settings-row">
          <span class="settings-label">Music</span>
          <input type="range" class="settings-slider" min="0" max="100" value="50" />
        </div>
      </div>

      <div class="settings-group">
        <div class="panel-section-title">Graphics</div>
        <div class="settings-row">
          <span class="settings-label">Resolution Scale</span>
          <input type="range" class="settings-slider" min="50" max="100" value="100" />
        </div>
      </div>

      <div class="settings-group">
        <div class="panel-section-title">Controls</div>
        <div style="font-size:12px; color:var(--ui-text-dim); line-height:1.8;">
          <div><b style="color:var(--ui-text);">Click</b> &mdash; Move to tile</div>
          <div><b style="color:var(--ui-text);">1-0</b> &mdash; Use skill</div>
          <div><b style="color:var(--ui-text);">C</b> &mdash; Character</div>
          <div><b style="color:var(--ui-text);">I</b> &mdash; Inventory</div>
          <div><b style="color:var(--ui-text);">Q</b> &mdash; Quest Log</div>
          <div><b style="color:var(--ui-text);">M</b> &mdash; World Map</div>
          <div><b style="color:var(--ui-text);">Enter</b> &mdash; Chat</div>
          <div><b style="color:var(--ui-text);">Esc</b> &mdash; Close / Settings</div>
          <div><b style="color:var(--ui-text);">F3</b> &mdash; Debug overlay</div>
          <div><b style="color:var(--ui-text);">Scroll</b> &mdash; Zoom</div>
        </div>
      </div>

      <div class="settings-group">
        <button class="settings-btn danger">Logout</button>
      </div>
    `;

    // Logout button
    const logoutBtn = this.contentEl.querySelector('.settings-btn.danger') as HTMLButtonElement;
    logoutBtn.addEventListener('click', () => {
      window.location.reload();
    });
  }
}
