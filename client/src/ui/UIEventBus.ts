/**
 * Typed event bus for decoupled UI ↔ Game communication.
 */

export interface UIEvents {
  // Skills
  'skill:use': { slotIndex: number };
  // Chat
  'chat:send': { channel: string; message: string };
  // Panels
  'panel:open': { panel: string };
  'panel:close': void;
  // Quests
  'quest:track': { questId: string };
  'quest:untrack': { questId: string };
  // Notifications
  'notification:show': { text: string; type: 'info' | 'success' | 'warning' | 'error' | 'lore' };
  // Minimap
  'minimap:click': { tileX: number; tileY: number };
}

type EventCallback<T> = (data: T) => void;

export class UIEventBus {
  private listeners = new Map<string, Set<EventCallback<any>>>();

  on<K extends keyof UIEvents>(event: K, callback: EventCallback<UIEvents[K]>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off<K extends keyof UIEvents>(event: K, callback: EventCallback<UIEvents[K]>): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit<K extends keyof UIEvents>(event: K, data: UIEvents[K]): void {
    const cbs = this.listeners.get(event);
    if (cbs) {
      for (const cb of cbs) {
        cb(data);
      }
    }
  }
}

/** Singleton event bus */
export const uiEvents = new UIEventBus();
