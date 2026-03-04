import { uiEvents } from '../UIEventBus.js';

interface ChatMessage {
  sender: string;
  text: string;
  channel: string;
  timestamp: number;
}

const CHANNELS = ['Zone', 'Global', 'Party', 'NPC'];

/**
 * Chat panel (bottom-left): message log, input, channel tabs.
 */
export class ChatPanel {
  private el: HTMLDivElement;
  private messagesEl: HTMLDivElement;
  private inputEl: HTMLInputElement;
  private tabEls: HTMLDivElement[] = [];
  private activeChannel = 'zone';
  private messages: ChatMessage[] = [];
  private fadeTimer: ReturnType<typeof setTimeout> | null = null;
  private focusCallback: ((focused: boolean) => void) | null = null;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'chat-panel ui-panel ui-interactive';

    // Tabs
    const tabsRow = document.createElement('div');
    tabsRow.className = 'chat-tabs';
    for (const ch of CHANNELS) {
      const tab = document.createElement('div');
      tab.className = `chat-tab ${ch.toLowerCase() === this.activeChannel ? 'active' : ''}`;
      tab.textContent = ch;
      tab.addEventListener('click', () => this.switchChannel(ch.toLowerCase()));
      tabsRow.appendChild(tab);
      this.tabEls.push(tab);
    }
    this.el.appendChild(tabsRow);

    // Messages
    this.messagesEl = document.createElement('div');
    this.messagesEl.className = 'chat-messages';
    this.el.appendChild(this.messagesEl);

    // Input row
    const inputRow = document.createElement('div');
    inputRow.className = 'chat-input-row';

    this.inputEl = document.createElement('input');
    this.inputEl.className = 'chat-input';
    this.inputEl.type = 'text';
    this.inputEl.placeholder = 'Press Enter to chat...';
    this.inputEl.maxLength = 200;

    this.inputEl.addEventListener('focus', () => {
      this.focusCallback?.(true);
      this.el.classList.remove('faded');
      this.clearFadeTimer();
    });

    this.inputEl.addEventListener('blur', () => {
      this.focusCallback?.(false);
      this.startFadeTimer();
    });

    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.sendMessage();
        e.preventDefault();
      }
      if (e.key === 'Escape') {
        this.inputEl.blur();
        e.preventDefault();
      }
      e.stopPropagation();
    });

    // Prevent game shortcuts when typing
    this.inputEl.addEventListener('keyup', (e) => e.stopPropagation());
    this.inputEl.addEventListener('keypress', (e) => e.stopPropagation());

    inputRow.appendChild(this.inputEl);

    const sendBtn = document.createElement('button');
    sendBtn.className = 'chat-send-btn';
    sendBtn.textContent = '>';
    sendBtn.addEventListener('click', () => this.sendMessage());
    inputRow.appendChild(sendBtn);

    this.el.appendChild(inputRow);
    parent.appendChild(this.el);

    // Auto-fade after 10 seconds of inactivity
    this.startFadeTimer();

    // Add welcome message
    this.addMessage('System', 'Welcome to CORALS. Press Enter to chat.', 'system');
  }

  private switchChannel(channel: string): void {
    this.activeChannel = channel;
    this.tabEls.forEach((tab) => {
      tab.classList.toggle('active', tab.textContent!.toLowerCase() === channel);
    });
    this.renderMessages();
  }

  private renderMessages(): void {
    this.messagesEl.innerHTML = '';
    const filtered = this.activeChannel === 'zone'
      ? this.messages // Zone shows all
      : this.messages.filter((m) => m.channel === this.activeChannel || m.channel === 'system');

    const display = filtered.slice(-50);
    for (const msg of display) {
      const el = document.createElement('div');
      el.className = `chat-msg channel-${msg.channel}`;
      el.innerHTML = `<span class="msg-sender">[${msg.sender}]</span> ${this.escapeHtml(msg.text)}`;
      this.messagesEl.appendChild(el);
    }
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  addMessage(sender: string, text: string, channel: string = 'zone'): void {
    this.messages.push({ sender, text, channel, timestamp: Date.now() });
    if (this.messages.length > 200) {
      this.messages = this.messages.slice(-100);
    }
    this.renderMessages();

    // Flash un-faded briefly
    this.el.classList.remove('faded');
    this.startFadeTimer();
  }

  private sendMessage(): void {
    const text = this.inputEl.value.trim();
    if (!text) return;
    this.inputEl.value = '';
    uiEvents.emit('chat:send', { channel: this.activeChannel, message: text });
    // Show locally immediately
    this.addMessage('You', text, this.activeChannel);
  }

  private startFadeTimer(): void {
    this.clearFadeTimer();
    this.fadeTimer = setTimeout(() => {
      if (document.activeElement !== this.inputEl) {
        this.el.classList.add('faded');
      }
    }, 10000);
  }

  private clearFadeTimer(): void {
    if (this.fadeTimer) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }
  }

  focus(): void {
    this.inputEl.focus();
  }

  blur(): void {
    this.inputEl.blur();
  }

  onFocusChange(cb: (focused: boolean) => void): void {
    this.focusCallback = cb;
  }
}
