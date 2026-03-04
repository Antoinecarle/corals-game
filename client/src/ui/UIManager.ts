import { uiEvents } from './UIEventBus.js';
import { PlayerFrame } from './hud/PlayerFrame.js';
import { SkillBar } from './hud/SkillBar.js';
import { QuickMenu } from './hud/QuickMenu.js';
import { MinimapHUD } from './hud/MinimapHUD.js';
import { QuestTracker } from './hud/QuestTracker.js';
import { NotificationToast } from './hud/NotificationToast.js';
import { ChatPanel } from './chat/ChatPanel.js';
import { PanelBase } from './panels/PanelBase.js';
import { CharacterPanel } from './panels/CharacterPanel.js';
import { InventoryPanel } from './panels/InventoryPanel.js';
import { QuestLogPanel } from './panels/QuestLogPanel.js';
import { WorldMapPanel } from './panels/WorldMapPanel.js';
import { SettingsPanel } from './panels/SettingsPanel.js';
import { TideHUD } from '../tide/TideHUD.js';
import { TideLauncher } from '../tide/TideLauncher.js';
import { SiphonPanel } from '../tide/SiphonPanel.js';
import type { TideState, LootItem } from '@pirate-mmo/shared';

export interface GameState {
  playerName: string;
  playerLevel: number;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  corruption: number; // 0-100
  xp: number;
  maxXp: number;
  tileX: number;
  tileY: number;
  zoneLabel: string;
  remotePlayers: Array<{ x: number; y: number; name: string }>;
  npcs: Array<{ x: number; y: number; name: string }>;
  mapSize: number;
}

/** UI update interval in seconds (~5 Hz is plenty for HUD) */
const UI_UPDATE_INTERVAL = 0.2;

/**
 * Orchestrates all HTML UI overlays on top of the PixiJS canvas.
 */
export class UIManager {
  private root: HTMLDivElement;
  private playerFrame: PlayerFrame;
  private skillBar: SkillBar;
  private quickMenu: QuickMenu;
  private minimapHUD: MinimapHUD;
  private questTracker: QuestTracker;
  private notifications: NotificationToast;
  private chatPanel: ChatPanel;

  // Tide UI
  private tideHUD: TideHUD;
  private tideLauncher: TideLauncher;
  private siphonPanel: SiphonPanel;

  // Panels
  private panels: Map<string, PanelBase> = new Map();
  private activePanel: string | null = null;

  // Tooltip
  private tooltip: HTMLDivElement;
  private tooltipVisible = false;

  // Keyboard state
  private chatFocused = false;

  // Admin mode callbacks
  private adminToggleCb: (() => void) | null = null;
  private adminUndoCb: (() => void) | null = null;
  private adminRedoCb: (() => void) | null = null;
  private adminActiveCheck: (() => boolean) | null = null;

  // Throttle: accumulate dt, only update DOM when interval exceeded
  private uiAccum = 0;

  // Reusable array for minimap dots (avoid GC pressure)
  private minimapDots: Array<{ x: number; y: number; color: string; type: string }> = [];

  constructor(container: HTMLElement, mapSize: number) {
    // Create root overlay
    this.root = document.createElement('div');
    this.root.className = 'game-ui';
    container.appendChild(this.root);

    // HUD components
    this.playerFrame = new PlayerFrame(this.root);
    this.skillBar = new SkillBar(this.root);
    this.minimapHUD = new MinimapHUD(this.root, mapSize);
    this.questTracker = new QuestTracker(this.root);
    this.quickMenu = new QuickMenu(this.root);
    this.chatPanel = new ChatPanel(this.root);
    this.notifications = new NotificationToast(this.root);

    // Tide UI
    this.tideHUD = new TideHUD(this.root);
    this.tideLauncher = new TideLauncher(this.root);
    this.siphonPanel = new SiphonPanel(this.root);

    // Panels
    const charPanel = new CharacterPanel(this.root);
    const invPanel = new InventoryPanel(this.root);
    const questLogPanel = new QuestLogPanel(this.root);
    const worldMapPanel = new WorldMapPanel(this.root);
    const settingsPanel = new SettingsPanel(this.root);

    this.panels.set('character', charPanel);
    this.panels.set('inventory', invPanel);
    this.panels.set('quests', questLogPanel);
    this.panels.set('map', worldMapPanel);
    this.panels.set('settings', settingsPanel);

    // Tooltip element
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'ui-tooltip';
    this.tooltip.style.display = 'none';
    this.root.appendChild(this.tooltip);

    // Wire events
    this.setupKeyboard();
    this.setupTooltips();
    this.setupPanelEvents();

    // Listen for notification events
    uiEvents.on('notification:show', (data) => {
      this.notifications.show(data.text, data.type);
    });

    // Listen for chat focus state
    this.chatPanel.onFocusChange((focused) => {
      this.chatFocused = focused;
    });
  }

  setAdminCallbacks(
    toggle: () => void,
    undo: () => void,
    redo: () => void,
    isActive: () => boolean,
  ): void {
    this.adminToggleCb = toggle;
    this.adminUndoCb = undo;
    this.adminRedoCb = redo;
    this.adminActiveCheck = isActive;
  }

  private setupKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      // F8 toggles admin mode (always available)
      if (e.key === 'F8') {
        e.preventDefault();
        this.adminToggleCb?.();
        return;
      }

      // Admin mode undo/redo
      if (this.adminActiveCheck?.()) {
        if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
          e.preventDefault();
          this.adminUndoCb?.();
          return;
        }
        if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) ||
            (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
          e.preventDefault();
          this.adminRedoCb?.();
          return;
        }
      }

      // Don't handle shortcuts when chat is focused
      if (this.chatFocused) {
        if (e.key === 'Escape') {
          this.chatPanel.blur();
          this.chatFocused = false;
        }
        return;
      }

      // Panel shortcuts
      switch (e.key.toLowerCase()) {
        case 'c':
          this.togglePanel('character');
          break;
        case 'i':
          this.togglePanel('inventory');
          break;
        case 'q':
          this.togglePanel('quests');
          break;
        case 'm':
          this.togglePanel('map');
          break;
        case 'escape':
          if (this.activePanel) {
            this.closePanel();
          } else {
            this.togglePanel('settings');
          }
          break;
        case 'enter':
          this.chatPanel.focus();
          this.chatFocused = true;
          e.preventDefault();
          break;
      }

      // Skill bar: 1-0 keys
      if (e.key >= '1' && e.key <= '9') {
        uiEvents.emit('skill:use', { slotIndex: parseInt(e.key) - 1 });
        this.skillBar.activateSlot(parseInt(e.key) - 1);
      }
      if (e.key === '0') {
        uiEvents.emit('skill:use', { slotIndex: 9 });
        this.skillBar.activateSlot(9);
      }
    });
  }

  private setupTooltips(): void {
    this.root.addEventListener('mouseover', (e) => {
      const target = (e.target as HTMLElement).closest('[data-tooltip]');
      if (target) {
        const text = target.getAttribute('data-tooltip') || '';
        const title = target.getAttribute('data-tooltip-title') || '';
        this.showTooltip(e as MouseEvent, title, text);
      }
    });

    this.root.addEventListener('mouseout', (e) => {
      const target = (e.target as HTMLElement).closest('[data-tooltip]');
      if (target) {
        this.hideTooltip();
      }
    });

    this.root.addEventListener('mousemove', (e) => {
      if (this.tooltipVisible) {
        this.positionTooltip(e as MouseEvent);
      }
    });
  }

  private showTooltip(e: MouseEvent, title: string, desc: string): void {
    this.tooltip.innerHTML = '';
    if (title) {
      const t = document.createElement('div');
      t.className = 'tt-title';
      t.textContent = title;
      this.tooltip.appendChild(t);
    }
    if (desc) {
      const d = document.createElement('div');
      d.className = 'tt-desc';
      d.textContent = desc;
      this.tooltip.appendChild(d);
    }
    this.tooltip.style.display = 'block';
    this.tooltipVisible = true;
    this.positionTooltip(e);
  }

  private positionTooltip(e: MouseEvent): void {
    const x = e.clientX + 12;
    const y = e.clientY + 12;
    const maxX = window.innerWidth - 230;
    const maxY = window.innerHeight - 60;
    this.tooltip.style.left = `${Math.min(x, maxX)}px`;
    this.tooltip.style.top = `${Math.min(y, maxY)}px`;
  }

  private hideTooltip(): void {
    this.tooltip.style.display = 'none';
    this.tooltipVisible = false;
  }

  private setupPanelEvents(): void {
    uiEvents.on('panel:open', (data) => {
      this.openPanel(data.panel);
    });
    uiEvents.on('panel:close', () => {
      this.closePanel();
    });
  }

  togglePanel(name: string): void {
    if (this.activePanel === name) {
      this.closePanel();
    } else {
      this.openPanel(name);
    }
  }

  openPanel(name: string): void {
    if (this.activePanel) {
      this.panels.get(this.activePanel)?.close();
    }
    const panel = this.panels.get(name);
    if (panel) {
      panel.open();
      this.activePanel = name;
      this.quickMenu.setActive(name);
    }
  }

  closePanel(): void {
    if (this.activePanel) {
      this.panels.get(this.activePanel)?.close();
      this.activePanel = null;
      this.quickMenu.setActive(null);
    }
  }

  /**
   * Called every game frame. Throttles DOM updates to ~5 Hz.
   * PlayerFrame + SkillBar have internal dirty-checks, so even
   * when the tick fires they only touch DOM on actual value changes.
   */
  update(dt: number, state: GameState): void {
    this.uiAccum += dt;
    if (this.uiAccum < UI_UPDATE_INTERVAL) return;
    this.uiAccum = 0;

    // Player frame (dirty-checked internally)
    this.playerFrame.update(
      state.playerName,
      state.playerLevel,
      state.hp,
      state.maxHp,
      state.energy,
      state.maxEnergy,
      state.corruption,
    );

    // Skill bar XP (dirty-checked internally)
    this.skillBar.updateXP(state.xp, state.maxXp);

    // Minimap — reuse array to avoid GC
    this.minimapDots.length = 0;
    for (let i = 0; i < state.remotePlayers.length; i++) {
      const rp = state.remotePlayers[i];
      this.minimapDots.push({ x: rp.x, y: rp.y, color: '#ffffff', type: 'player' });
    }
    for (let i = 0; i < state.npcs.length; i++) {
      const npc = state.npcs[i];
      this.minimapDots.push({ x: npc.x, y: npc.y, color: '#53a8d4', type: 'npc' });
    }
    this.minimapHUD.update(state.tileX, state.tileY, this.minimapDots, state.zoneLabel);
  }

  notify(text: string, type: 'info' | 'success' | 'warning' | 'error' | 'lore' = 'info'): void {
    this.notifications.show(text, type);
  }

  addChatMessage(sender: string, text: string, channel: string = 'zone'): void {
    this.chatPanel.addMessage(sender, text, channel);
  }

  isInputFocused(): boolean {
    return this.chatFocused;
  }

  getRoot(): HTMLDivElement {
    return this.root;
  }

  // ─── Tide UI Accessors ───

  getTideHUD(): TideHUD { return this.tideHUD; }
  getTideLauncher(): TideLauncher { return this.tideLauncher; }
  getSiphonPanel(): SiphonPanel { return this.siphonPanel; }
}
