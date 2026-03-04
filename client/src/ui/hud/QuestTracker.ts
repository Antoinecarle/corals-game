/**
 * Quest tracker HUD (right side, below minimap): shows 1-3 active quests.
 */

export interface TrackedQuest {
  id: string;
  title: string;
  objective: string;
  progress?: string; // e.g. "2/5"
  isMain?: boolean;
  completed?: boolean;
}

export class QuestTracker {
  private el: HTMLDivElement;
  private listEl: HTMLDivElement;
  private collapsed = false;
  private quests: TrackedQuest[] = [];

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'quest-tracker ui-panel ui-interactive';

    const header = document.createElement('div');
    header.className = 'qt-header';
    header.innerHTML = `
      <span>Quests</span>
      <span class="qt-toggle">&#9660;</span>
    `;
    header.addEventListener('click', () => this.toggleCollapse());
    this.el.appendChild(header);

    this.listEl = document.createElement('div');
    this.listEl.className = 'qt-list';
    this.el.appendChild(this.listEl);

    parent.appendChild(this.el);

    // Default demo quests
    this.setQuests([
      {
        id: 'main-1',
        title: 'Explore Ancrage',
        objective: 'Talk to the Harbormaster',
        isMain: true,
      },
      {
        id: 'side-1',
        title: 'Gather Supplies',
        objective: 'Collect driftwood',
        progress: '0/5',
      },
    ]);
  }

  private toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    this.el.classList.toggle('qt-collapsed', this.collapsed);
  }

  setQuests(quests: TrackedQuest[]): void {
    this.quests = quests.slice(0, 3);
    this.render();
  }

  private render(): void {
    this.listEl.innerHTML = '';
    for (const quest of this.quests) {
      const qEl = document.createElement('div');
      qEl.className = `qt-quest ${quest.isMain ? 'main-quest' : ''} ${quest.completed ? 'completed' : ''}`;
      qEl.innerHTML = `
        <div class="qt-quest-title">${quest.title}</div>
        <div class="qt-quest-obj">${quest.objective}</div>
        ${quest.progress ? `<div class="qt-quest-progress">${quest.progress}</div>` : ''}
      `;
      this.listEl.appendChild(qEl);
    }
  }

  completeQuest(questId: string): void {
    const q = this.quests.find((q) => q.id === questId);
    if (q) {
      q.completed = true;
      this.render();
    }
  }
}
