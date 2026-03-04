import { Container, Graphics } from 'pixi.js';
import { tileToScreen, TILE_WIDTH, TILE_HEIGHT, isInBastion } from '@pirate-mmo/shared';

const PATROL_SPEED = 0.7;   // tiles/sec
const CHASE_SPEED  = 1.8;   // tiles/sec
const CHASE_RANGE  = 10;    // tiles — aggro radius
const INTERRUPT_RANGE = 3;  // tiles — cancels siphon channeling

interface Particle {
  ox: number; // base offset x
  oy: number; // base offset y
  phase: number;
}

/**
 * Essaim d'Abyssaux — Palier 1 enemy.
 * Small group of shadowy creatures that patrol outside the Bastion.
 * They chase the player if close and can interrupt siphon channeling.
 */
export class AbyssalSwarm {
  public container: Container;
  private gfx: Graphics;
  private particles: Particle[];

  // Tile-space position
  private x: number;
  private y: number;

  // Patrol
  private homeX: number;
  private homeY: number;
  private patrolX: number;
  private patrolY: number;

  // State
  private chasing = false;
  private phase = 0;

  constructor(tileX: number, tileY: number) {
    this.x = tileX;
    this.y = tileY;
    this.homeX = tileX;
    this.homeY = tileY;
    this.patrolX = tileX;
    this.patrolY = tileY;

    this.container = new Container();
    this.gfx = new Graphics();
    this.container.addChild(this.gfx);

    // 5 offset particles for swarm feel
    this.particles = Array.from({ length: 5 }, () => ({
      ox: (Math.random() - 0.5) * 24,
      oy: (Math.random() - 0.5) * 12,
      phase: Math.random() * Math.PI * 2,
    }));

    this.syncScreenPos();
  }

  update(dt: number, playerX: number, playerY: number): void {
    this.phase += dt * 3.5;

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const distPlayer = Math.sqrt(dx * dx + dy * dy);

    // Chase player if outside bastion and close enough
    if (!isInBastion(playerX, playerY) && distPlayer <= CHASE_RANGE) {
      this.chasing = true;
    } else if (distPlayer > CHASE_RANGE * 1.5 || isInBastion(playerX, playerY)) {
      this.chasing = false;
    }

    if (this.chasing) {
      this.moveTo(playerX, playerY, CHASE_SPEED * dt);
    } else {
      // Patrol randomly around home
      const pdx = this.patrolX - this.x;
      const pdy = this.patrolY - this.y;
      if (Math.sqrt(pdx * pdx + pdy * pdy) < 0.5) {
        this.pickPatrol();
      } else {
        this.moveTo(this.patrolX, this.patrolY, PATROL_SPEED * dt);
      }
    }

    // Drift particles
    for (const p of this.particles) {
      p.phase += dt * 2.5;
      p.ox += Math.sin(p.phase) * 0.25;
      p.oy += Math.cos(p.phase * 0.8) * 0.15;
      p.ox = Math.max(-18, Math.min(18, p.ox));
      p.oy = Math.max(-9, Math.min(9, p.oy));
    }

    this.syncScreenPos();
    this.draw(distPlayer);
  }

  /** Returns true if the swarm is close enough to interrupt channeling */
  isInterrupting(playerX: number, playerY: number): boolean {
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    return Math.sqrt(dx * dx + dy * dy) <= INTERRUPT_RANGE;
  }

  getTileX(): number { return this.x; }
  getTileY(): number { return this.y; }
  isChasing(): boolean { return this.chasing; }

  destroy(): void {
    this.container.destroy({ children: true });
  }

  // ─── Private ───

  private moveTo(tx: number, ty: number, step: number): void {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.01) return;
    const r = Math.min(step / dist, 1);
    this.x += dx * r;
    this.y += dy * r;
  }

  private pickPatrol(): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = 6 + Math.random() * 14;
    let nx = this.homeX + Math.cos(angle) * dist;
    let ny = this.homeY + Math.sin(angle) * dist;
    nx = Math.max(15, Math.min(240, nx));
    ny = Math.max(15, Math.min(240, ny));
    // Don't patrol into bastion
    if (!isInBastion(nx, ny)) {
      this.patrolX = nx;
      this.patrolY = ny;
    }
  }

  private syncScreenPos(): void {
    const s = tileToScreen(this.x, this.y);
    this.container.x = s.sx + TILE_WIDTH / 2;
    this.container.y = s.sy + TILE_HEIGHT / 2;
    this.container.zIndex = s.sy + TILE_HEIGHT + 1;
  }

  private draw(distToPlayer: number): void {
    this.gfx.clear();
    const bobY = Math.sin(this.phase * 0.5) * 3;
    const col   = this.chasing ? 0x6600cc : 0x220099;
    const glow  = this.chasing ? 0xaa00ff : 0x4433cc;
    const alpha = this.chasing ? 0.9 : 0.65;

    // Drop shadow
    this.gfx.ellipse(0, 6 + bobY, 20, 8);
    this.gfx.fill({ color: 0x000000, alpha: 0.25 });

    // Individual swarm blobs
    for (const p of this.particles) {
      this.gfx.circle(p.ox, p.oy + bobY, 5 + Math.sin(p.phase) * 1.5);
      this.gfx.fill({ color: col, alpha });
    }

    // Glowing core
    this.gfx.circle(0, bobY, 8);
    this.gfx.fill({ color: glow, alpha: alpha * 0.85 });

    // Bright center
    this.gfx.circle(0, bobY, 3);
    this.gfx.fill({ color: 0xddaaff, alpha: alpha * 0.5 });

    // Red "angry" eye when chasing
    if (this.chasing) {
      this.gfx.circle(0, bobY, 2);
      this.gfx.fill({ color: 0xff2200, alpha: 0.8 });
    }
  }
}
