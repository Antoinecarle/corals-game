import type { Container } from 'pixi.js';

/**
 * Sorts children of a container by zIndex for correct isometric overlap.
 * Call every frame after updating entity positions.
 */
export class DepthSorter {
  private container: Container;

  constructor(container: Container) {
    this.container = container;
    this.container.sortableChildren = true;
  }

  /**
   * Sort all children. Their zIndex should already be set
   * to their screen Y position by Entity.updateScreenPosition().
   */
  sort(): void {
    this.container.sortChildren();
  }
}
