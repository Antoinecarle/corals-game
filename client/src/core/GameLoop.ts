/**
 * Fixed-timestep game loop at 60fps.
 * Calls update() at fixed intervals, render() every frame.
 */
export class GameLoop {
  private accumulator = 0;
  private lastTime = 0;
  private running = false;
  private rafId = 0;
  private readonly timestep: number; // ms per update tick

  constructor(
    private readonly updateFn: (dt: number) => void,
    private readonly renderFn: (alpha: number) => void,
    fps = 60
  ) {
    this.timestep = 1000 / fps;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private tick = (now: number): void => {
    if (!this.running) return;

    let delta = now - this.lastTime;
    this.lastTime = now;

    // Clamp to avoid spiral of death
    if (delta > 250) delta = 250;

    this.accumulator += delta;

    const dtSeconds = this.timestep / 1000;

    while (this.accumulator >= this.timestep) {
      this.updateFn(dtSeconds);
      this.accumulator -= this.timestep;
    }

    // alpha = interpolation factor for rendering between ticks
    const alpha = this.accumulator / this.timestep;
    this.renderFn(alpha);

    this.rafId = requestAnimationFrame(this.tick);
  };
}
