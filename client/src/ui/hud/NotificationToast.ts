/**
 * Toast notification system (top-center): auto-dismiss, queue, typed colors.
 */

type ToastType = 'info' | 'success' | 'warning' | 'error' | 'lore';

export class NotificationToast {
  private container: HTMLDivElement;
  private toasts: HTMLDivElement[] = [];
  private maxVisible = 3;

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.className = 'toast-container ui-interactive';
    parent.appendChild(this.container);
  }

  show(text: string, type: ToastType = 'info', durationMs = 4000): void {
    // Remove oldest if at max
    while (this.toasts.length >= this.maxVisible) {
      this.remove(this.toasts[0]);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = text;
    this.container.appendChild(toast);
    this.toasts.push(toast);

    // Auto-dismiss
    setTimeout(() => this.remove(toast), durationMs);

    // Click to dismiss
    toast.addEventListener('click', () => this.remove(toast));
  }

  private remove(toast: HTMLDivElement): void {
    if (!toast.parentNode) return;
    toast.classList.add('removing');
    setTimeout(() => {
      toast.remove();
      const idx = this.toasts.indexOf(toast);
      if (idx !== -1) this.toasts.splice(idx, 1);
    }, 300);
  }
}
