import { PanelBase } from './PanelBase.js';

interface QuestEntry {
  title: string;
  npc: string;
  description: string;
  status: 'active' | 'completed' | 'failed';
  xpReward: number;
  goldReward: number;
}

const DEMO_QUESTS: QuestEntry[] = [
  {
    title: 'Explore Ancrage',
    npc: 'Harbormaster Duval',
    description: 'Visit the main districts of Ancrage and report back.',
    status: 'active',
    xpReward: 200,
    goldReward: 50,
  },
  {
    title: 'Gather Driftwood',
    npc: 'Shipwright Maren',
    description: 'Collect 5 pieces of driftwood from the beach.',
    status: 'active',
    xpReward: 100,
    goldReward: 25,
  },
  {
    title: 'The Strange Whispers',
    npc: 'Old Fisherman Corto',
    description: 'Investigate the strange sounds coming from the eastern reef.',
    status: 'active',
    xpReward: 350,
    goldReward: 100,
  },
  {
    title: 'First Steps',
    npc: 'Captain Reva',
    description: 'Learn the basics of navigation.',
    status: 'completed',
    xpReward: 50,
    goldReward: 10,
  },
];

/**
 * Quest log panel (Q key): all quests grouped by status.
 */
export class QuestLogPanel extends PanelBase {
  constructor(parent: HTMLElement) {
    super(parent, 'Quest Log');
    this.render(DEMO_QUESTS);
  }

  private render(quests: QuestEntry[]): void {
    this.contentEl.innerHTML = '';

    const groups: Record<string, QuestEntry[]> = { active: [], completed: [], failed: [] };
    for (const q of quests) {
      groups[q.status].push(q);
    }

    for (const [status, items] of Object.entries(groups)) {
      if (items.length === 0) continue;

      const section = document.createElement('div');
      section.className = 'panel-section';

      const title = document.createElement('div');
      title.className = 'panel-section-title';
      title.textContent = `${status.charAt(0).toUpperCase() + status.slice(1)} (${items.length})`;
      section.appendChild(title);

      for (const q of items) {
        const el = document.createElement('div');
        el.className = 'quest-item';
        el.innerHTML = `
          <div class="quest-item-title">${q.title}</div>
          <div class="quest-item-npc">${q.npc}</div>
          <div class="quest-item-rewards">
            <span class="quest-reward-xp">${q.xpReward} XP</span>
            <span class="quest-reward-gold">${q.goldReward} Gold</span>
          </div>
        `;
        el.setAttribute('data-tooltip', q.description);
        el.setAttribute('data-tooltip-title', q.title);
        section.appendChild(el);
      }

      this.contentEl.appendChild(section);
    }
  }
}
