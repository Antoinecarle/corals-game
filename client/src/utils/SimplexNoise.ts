/**
 * 2D Simplex Noise with seeded PRNG.
 * Based on Stefan Gustavson's public domain implementation.
 */

const GRAD2: [number, number][] = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

export class SimplexNoise {
  private perm: Uint8Array;
  private permMod8: Uint8Array;

  constructor(seed: number = 0) {
    const perm = new Uint8Array(512);
    const permMod8 = new Uint8Array(512);

    // Build permutation table from seed
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;

    // Fisher-Yates shuffle with seeded PRNG
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807 + 0) % 2147483647;
      const j = s % (i + 1);
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }

    for (let i = 0; i < 512; i++) {
      perm[i] = p[i & 255];
      permMod8[i] = perm[i] % 8;
    }

    this.perm = perm;
    this.permMod8 = permMod8;
  }

  noise2D(x: number, y: number): number {
    const { perm, permMod8 } = this;

    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);

    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;

    let i1: number, j1: number;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;

    let n0 = 0, n1 = 0, n2 = 0;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      const gi0 = permMod8[ii + perm[jj]];
      t0 *= t0;
      n0 = t0 * t0 * (GRAD2[gi0][0] * x0 + GRAD2[gi0][1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      const gi1 = permMod8[ii + i1 + perm[jj + j1]];
      t1 *= t1;
      n1 = t1 * t1 * (GRAD2[gi1][0] * x1 + GRAD2[gi1][1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      const gi2 = permMod8[ii + 1 + perm[jj + 1]];
      t2 *= t2;
      n2 = t2 * t2 * (GRAD2[gi2][0] * x2 + GRAD2[gi2][1] * y2);
    }

    // Scale to [-1, 1]
    return 70 * (n0 + n1 + n2);
  }

  /** Fractal Brownian Motion — layered noise for natural textures. */
  fbm(x: number, y: number, octaves: number = 4, lacunarity: number = 2, gain: number = 0.5): number {
    let sum = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxAmp = 0;

    for (let i = 0; i < octaves; i++) {
      sum += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxAmp += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }

    return sum / maxAmp;
  }

  /** Ridged multifractal — sharp ridges for mountain/cliff features. */
  ridged(x: number, y: number, octaves: number = 4, lacunarity: number = 2, gain: number = 0.5): number {
    let sum = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxAmp = 0;

    for (let i = 0; i < octaves; i++) {
      let v = Math.abs(this.noise2D(x * frequency, y * frequency));
      v = 1 - v; // invert for ridges
      v = v * v;  // sharpen
      sum += v * amplitude;
      maxAmp += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }

    return sum / maxAmp;
  }
}
