import { uiEvents } from '../UIEventBus.js';

/**
 * Base class for slide-in panels from the right.
 */
export class PanelBase {
  protected el: HTMLDivElement;
  protected contentEl: HTMLDivElement;
  protected isOpen = false;

  constructor(parent: HTMLElement, title: string) {
    this.el = document.createElement('div');
    this.el.className = 'panel-overlay ui-interactive';

    // Header
    const header = document.createElement('div');
    header.className = 'panel-header';

    const titleEl = document.createElement('span');
    titleEl.className = 'panel-title';
    titleEl.textContent = title;
    header.appendChild(titleEl);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'panel-close';
    closeBtn.textContent = '\u2715';
    closeBtn.addEventListener('click', () => {
      uiEvents.emit('panel:close', undefined as any);
    });
    header.appendChild(closeBtn);

    this.el.appendChild(header);

    // Content
    this.contentEl = document.createElement('div');
    this.contentEl.className = 'panel-content';
    this.el.appendChild(this.contentEl);

    parent.appendChild(this.el);
  }

  open(): void {
    this.el.classList.add('open');
    this.isOpen = true;
  }

  close(): void {
    this.el.classList.remove('open');
    this.isOpen = false;
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }
}
