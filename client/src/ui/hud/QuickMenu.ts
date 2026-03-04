import { uiEvents } from '../UIEventBus.js';

interface MenuButton {
  id: string;
  label: string;
  icon: string;
  keybind: string;
}

const BUTTONS: MenuButton[] = [
  { id: 'character', label: 'Character', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>', keybind: 'C' },
  { id: 'inventory', label: 'Inventory', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a4 4 0 0 0-8 0v2"/></svg>', keybind: 'I' },
  { id: 'quests', label: 'Quests', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>', keybind: 'Q' },
  { id: 'map', label: 'World Map', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>', keybind: 'M' },
  { id: 'settings', label: 'Settings', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>', keybind: 'Esc' },
];

/**
 * Quick menu (right side): icon buttons for panels.
 */
export class QuickMenu {
  private el: HTMLDivElement;
  private buttons = new Map<string, HTMLDivElement>();

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'quick-menu ui-panel ui-interactive';

    for (const btn of BUTTONS) {
      const el = document.createElement('div');
      el.className = 'qm-btn';
      el.setAttribute('data-tooltip', btn.label);
      el.innerHTML = `
        ${btn.icon}
        <span class="qm-keybind">${btn.keybind}</span>
      `;
      el.addEventListener('click', () => {
        uiEvents.emit('panel:open', { panel: btn.id });
      });
      this.el.appendChild(el);
      this.buttons.set(btn.id, el);
    }

    parent.appendChild(this.el);
  }

  setActive(panelId: string | null): void {
    for (const [id, btn] of this.buttons) {
      btn.classList.toggle('active', id === panelId);
    }
  }
}
