import { ObstacleType } from '../iso/MapGenerator.js';
import { ADMIN_OBSTACLES } from './AdminObstacles.js';

export type AdminTool = 'place' | 'erase';

export interface AdminPanelCallbacks {
  onObstacleSelect: (type: ObstacleType) => void;
  onToolChange: (tool: AdminTool) => void;
  onUndo: () => void;
  onRedo: () => void;
}

/**
 * HTML overlay panel for admin map editing tools.
 */
export class AdminPanel {
  private root: HTMLDivElement;
  private panel: HTMLDivElement;
  private indicator: HTMLDivElement;
  private coordsDisplay: HTMLDivElement;
  private selectedType: ObstacleType = ObstacleType.Tree;
  private tool: AdminTool = 'place';
  private callbacks: AdminPanelCallbacks;

  constructor(container: HTMLElement, callbacks: AdminPanelCallbacks) {
    this.callbacks = callbacks;
    this.root = container as HTMLDivElement;

    // Admin mode indicator (top center)
    this.indicator = document.createElement('div');
    this.indicator.className = 'admin-indicator';
    this.indicator.innerHTML = 'ADMIN MODE <span style="font-size:10px;opacity:0.7">(F8 to exit)</span>';
    this.indicator.style.cssText = `
      position:fixed; top:8px; left:50%; transform:translateX(-50%);
      background:rgba(220,40,40,0.85); color:#fff; padding:4px 16px;
      border-radius:4px; font-family:monospace; font-size:13px; font-weight:bold;
      z-index:10001; pointer-events:none; letter-spacing:1px;
    `;
    this.indicator.style.display = 'none';
    document.body.appendChild(this.indicator);

    // Side panel
    this.panel = document.createElement('div');
    this.panel.className = 'admin-panel';
    this.panel.style.cssText = `
      position:fixed; top:50px; left:8px; width:160px;
      background:rgba(20,20,30,0.92); border:1px solid rgba(255,255,255,0.15);
      border-radius:8px; padding:10px; z-index:10000;
      font-family:'Inter',sans-serif; color:#eee; font-size:12px;
      display:none; user-select:none;
    `;
    document.body.appendChild(this.panel);

    this.buildPanel();

    // Coords display
    this.coordsDisplay = document.createElement('div');
    this.coordsDisplay.style.cssText = `
      position:fixed; bottom:8px; left:50%; transform:translateX(-50%);
      background:rgba(20,20,30,0.8); color:#aaa; padding:2px 10px;
      border-radius:4px; font-family:monospace; font-size:11px;
      z-index:10001; pointer-events:none; display:none;
    `;
    document.body.appendChild(this.coordsDisplay);
  }

  private buildPanel(): void {
    // Title
    const title = document.createElement('div');
    title.textContent = 'Map Editor';
    title.style.cssText = 'font-weight:bold; margin-bottom:8px; font-size:13px; color:#d4a853;';
    this.panel.appendChild(title);

    // Tool mode toggle
    const toolRow = document.createElement('div');
    toolRow.style.cssText = 'display:flex; gap:4px; margin-bottom:8px;';

    const placeBtn = this.createToolButton('Place', 'place');
    const eraseBtn = this.createToolButton('Erase', 'erase');
    toolRow.appendChild(placeBtn);
    toolRow.appendChild(eraseBtn);
    this.panel.appendChild(toolRow);

    // Separator
    this.panel.appendChild(this.createSeparator());

    // Obstacles label
    const label = document.createElement('div');
    label.textContent = 'Obstacles';
    label.style.cssText = 'font-size:11px; color:#888; margin-bottom:4px;';
    this.panel.appendChild(label);

    // Obstacle grid
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px; margin-bottom:8px;';

    for (const obs of ADMIN_OBSTACLES) {
      const btn = document.createElement('button');
      btn.className = 'admin-obs-btn';
      btn.dataset.type = String(obs.type);
      btn.innerHTML = `<span style="font-size:16px">${obs.icon}</span><br><span style="font-size:9px">${obs.label}</span>`;
      btn.style.cssText = `
        background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
        border-radius:4px; padding:4px 2px; cursor:pointer; color:#ccc;
        transition:all 0.15s;
      `;
      if (obs.type === this.selectedType) {
        btn.style.background = 'rgba(212,168,83,0.3)';
        btn.style.borderColor = '#d4a853';
      }
      btn.addEventListener('click', () => {
        this.selectedType = obs.type;
        this.callbacks.onObstacleSelect(obs.type);
        this.updateSelection();
      });
      grid.appendChild(btn);
    }
    this.panel.appendChild(grid);

    // Separator
    this.panel.appendChild(this.createSeparator());

    // Actions
    const actionsLabel = document.createElement('div');
    actionsLabel.textContent = 'Actions';
    actionsLabel.style.cssText = 'font-size:11px; color:#888; margin-bottom:4px;';
    this.panel.appendChild(actionsLabel);

    const actRow = document.createElement('div');
    actRow.style.cssText = 'display:flex; gap:4px;';

    const undoBtn = this.createActionButton('Undo', 'Ctrl+Z');
    undoBtn.addEventListener('click', () => this.callbacks.onUndo());

    const redoBtn = this.createActionButton('Redo', 'Ctrl+Y');
    redoBtn.addEventListener('click', () => this.callbacks.onRedo());

    actRow.appendChild(undoBtn);
    actRow.appendChild(redoBtn);
    this.panel.appendChild(actRow);
  }

  private createToolButton(label: string, tool: AdminTool): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.dataset.tool = tool;
    btn.style.cssText = `
      flex:1; padding:4px; border-radius:4px; cursor:pointer;
      font-size:11px; font-weight:bold; color:#ccc; transition:all 0.15s;
      border:1px solid rgba(255,255,255,0.1);
    `;
    if (tool === this.tool) {
      btn.style.background = 'rgba(212,168,83,0.3)';
      btn.style.borderColor = '#d4a853';
      btn.style.color = '#d4a853';
    } else {
      btn.style.background = 'rgba(255,255,255,0.05)';
    }
    btn.addEventListener('click', () => {
      this.tool = tool;
      this.callbacks.onToolChange(tool);
      this.updateToolButtons();
    });
    return btn;
  }

  private createActionButton(label: string, shortcut: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.innerHTML = `${label}<br><span style="font-size:9px;opacity:0.5">${shortcut}</span>`;
    btn.style.cssText = `
      flex:1; padding:4px; background:rgba(255,255,255,0.05);
      border:1px solid rgba(255,255,255,0.1); border-radius:4px;
      cursor:pointer; font-size:11px; color:#ccc; transition:all 0.15s;
    `;
    btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(255,255,255,0.1)'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(255,255,255,0.05)'; });
    return btn;
  }

  private createSeparator(): HTMLDivElement {
    const sep = document.createElement('div');
    sep.style.cssText = 'height:1px; background:rgba(255,255,255,0.1); margin:6px 0;';
    return sep;
  }

  private updateSelection(): void {
    const buttons = this.panel.querySelectorAll('.admin-obs-btn') as NodeListOf<HTMLButtonElement>;
    buttons.forEach((btn) => {
      if (btn.dataset.type === String(this.selectedType)) {
        btn.style.background = 'rgba(212,168,83,0.3)';
        btn.style.borderColor = '#d4a853';
      } else {
        btn.style.background = 'rgba(255,255,255,0.05)';
        btn.style.borderColor = 'rgba(255,255,255,0.1)';
      }
    });
  }

  private updateToolButtons(): void {
    const buttons = this.panel.querySelectorAll('button[data-tool]') as NodeListOf<HTMLButtonElement>;
    buttons.forEach((btn) => {
      if (btn.dataset.tool === this.tool) {
        btn.style.background = 'rgba(212,168,83,0.3)';
        btn.style.borderColor = '#d4a853';
        btn.style.color = '#d4a853';
      } else {
        btn.style.background = 'rgba(255,255,255,0.05)';
        btn.style.borderColor = 'rgba(255,255,255,0.1)';
        btn.style.color = '#ccc';
      }
    });
  }

  show(): void {
    this.panel.style.display = 'block';
    this.indicator.style.display = 'block';
    this.coordsDisplay.style.display = 'block';
  }

  hide(): void {
    this.panel.style.display = 'none';
    this.indicator.style.display = 'none';
    this.coordsDisplay.style.display = 'none';
  }

  updateCoords(x: number, y: number): void {
    this.coordsDisplay.textContent = `Tile: ${x}, ${y}`;
  }

  getSelectedType(): ObstacleType {
    return this.selectedType;
  }

  getTool(): AdminTool {
    return this.tool;
  }

  destroy(): void {
    this.panel.remove();
    this.indicator.remove();
    this.coordsDisplay.remove();
  }
}
