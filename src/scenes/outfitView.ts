import { ANCHOR } from '../art/body/pose';
import { MASTER, type MasterColor } from '../art/colors';
import { animates, bootParticles, kitParticles, landing, seeded, type ParticleSpec } from '../art/harrison/outfitFx';
import type { IndexedImage } from '../art/indexedImage';
import type { Outfit } from '../meta/locker';

/** A point in the world: x along the pitch, y height, z depth. */
export interface WorldPoint {
  x: number;
  y: number;
  z: number;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  colors: readonly MasterColor[];
  shape: ParticleSpec['shape'];
  /** Rerolls a bolt's zigzag as it crackles. */
  seed: number;
}

/** A frame step longer than this is a pause, not time to fill with particles. */
const MAX_STEP_S = 0.1;
/** A bolt's zigzag rerolls this often, s. */
const BOLT_STEP_S = 0.05;
const BOLT_LENGTH = 4;
/** The plus loses its arms for the last part of its life. */
const PLUS_ARMS_FOR = 0.7;
/** The room's cheer: a ring of gold sparkles round his middle, frame pixels up from his feet. */
const BURST = { count: 26, height: 23, rx: 4, ry: 6, speed: 40, spread: 30, lift: 10, life: 0.6, lifeSpread: 0.3 } as const;
const BURST_COLORS: readonly MasterColor[] = ['auraWhite', 'energyGoldLight', 'energyGold', 'gold'];

/**
 * One player's flashy effects: his kit's and boots' particles, kept in
 * world space so a trail stays on the pitch as he runs on. Stepped and
 * drawn in `draw` alone, on its own random numbers, so the match never
 * sees it.
 */
export class OutfitFx {
  private readonly rng: () => number;
  private readonly particles: Particle[] = [];
  private lastS: number | null = null;
  private prev: IndexedImage | null = null;
  private burstDue = false;
  /** Whether anything he wears gives off particles, so a plain outfit costs nothing. */
  private readonly emits: boolean;

  constructor(
    private readonly outfit: Outfit,
    seed: number,
  ) {
    this.rng = seeded(seed);
    this.emits = animates(outfit);
  }

  /**
   * Moves on to nowS (the step clamped to 0..0.1 s), gives off this
   * frame's particles from `image` (his frame now, logical pixels,
   * facing right) at his feet `at`, facing `facing`, and draws every
   * live particle through `toScreen` at `scale`.
   */
  draw(g: CanvasRenderingContext2D, nowS: number, image: IndexedImage, at: WorldPoint, facing: 1 | -1, sprinting: boolean, toScreen: (p: WorldPoint) => { x: number; y: number }, scale = 1): void {
    const dt = this.lastS === null ? 0 : Math.min(Math.max(nowS - this.lastS, 0), MAX_STEP_S);
    this.lastS = nowS;
    this.step(dt);
    if (this.emits) {
      const landed = landing(this.prev ?? image, image);
      const specs = [...kitParticles(this.outfit.kit, image, dt, this.rng), ...bootParticles(this.outfit.boots, image, dt, this.rng, sprinting, landed)];
      for (const s of specs) this.add(s, at, facing);
    }
    this.prev = image;
    if (this.burstDue) {
      this.burstDue = false;
      this.burst(at);
    }
    for (const p of this.particles) this.paint(g, p, toScreen, scale);
  }

  /** The room's cheer: a ring of gold sparkles round his middle. */
  sparkleBurst(): void {
    this.burstDue = true;
  }

  private step(dt: number): void {
    for (const p of this.particles) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = this.particles.length - 1; i >= 0; i--) if (this.particles[i]!.age >= this.particles[i]!.life) this.particles.splice(i, 1);
  }

  /** A frame-pixel particle into the world: x mirrors with his facing, up is up. */
  private add(s: ParticleSpec, at: WorldPoint, facing: 1 | -1): void {
    this.particles.push({
      x: at.x + (s.x - ANCHOR.x) * facing,
      y: at.y + (ANCHOR.y - s.y),
      z: at.z,
      vx: s.vx * facing,
      vy: -s.vy,
      age: 0,
      life: s.life,
      colors: s.colors,
      shape: s.shape,
      seed: Math.floor(this.rng() * 1e9),
    });
  }

  private burst(at: WorldPoint): void {
    for (let k = 0; k < BURST.count; k++) {
      const a = (k / BURST.count) * Math.PI * 2;
      const speed = BURST.speed + this.rng() * BURST.spread;
      this.particles.push({
        x: at.x + Math.cos(a) * BURST.rx,
        y: at.y + BURST.height - Math.sin(a) * BURST.ry,
        z: at.z,
        vx: Math.cos(a) * speed,
        vy: -Math.sin(a) * speed + BURST.lift,
        age: 0,
        life: BURST.life + this.rng() * BURST.lifeSpread,
        colors: BURST_COLORS,
        shape: k % 3 === 0 ? 'plus' : 'dot',
        seed: k,
      });
    }
  }

  private paint(g: CanvasRenderingContext2D, p: Particle, toScreen: (p: WorldPoint) => { x: number; y: number }, scale: number): void {
    const colour = p.colors[Math.min(p.colors.length - 1, Math.floor((p.age / p.life) * p.colors.length))]!;
    const at = toScreen(p);
    const dot = (dx: number, dy: number, c: MasterColor = colour) => {
      g.fillStyle = MASTER[c];
      g.fillRect(Math.round(at.x) + dx * scale, Math.round(at.y) + dy * scale, scale, scale);
    };
    if (p.shape === 'dot') dot(0, 0);
    else if (p.shape === 'plus') {
      dot(0, 0, 'white');
      if (p.age < p.life * PLUS_ARMS_FOR) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) dot(dx, dy);
    } else {
      // A zigzag that rerolls as it lives, so it crackles.
      const r = seeded(p.seed + Math.floor(p.age / BOLT_STEP_S));
      const dir = p.vx >= 0 ? 1 : -1;
      let y = 0;
      for (let i = 0; i < BOLT_LENGTH; i++) {
        dot(i * dir, y);
        y += r() < 0.5 ? -1 : 1;
      }
    }
  }
}
