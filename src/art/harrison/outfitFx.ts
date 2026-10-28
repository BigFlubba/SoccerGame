import type { BootsItemId, KitItemId, Outfit } from '../../meta/locker';
import { ANCHOR } from '../body/pose';
import { C, type MasterColor } from '../colors';
import type { IndexedImage } from '../indexedImage';

export { seeded } from '../../engine/random';

/**
 * The flashy items' effects, from the approved studies
 * (`sources/locker-anim.mts`): kit shaders that recolour his frame live,
 * and particles given off in frame pixels (y down, facing right). Pure:
 * every random number comes from the caller's own generator, never the
 * match's.
 */

/** A kit's live recolour of one logical pixel at frame (x, y) and time t; null keeps it. */
export type Shader = (id: number, x: number, y: number, t: number) => MasterColor | null;

export interface ParticleSpec {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  /** Its colours over its life, first to last. */
  colors: readonly MasterColor[];
  shape: 'dot' | 'plus' | 'bolt';
}

type Point = { x: number; y: number };

const KIT_IDS: readonly number[] = [C.JerseyShadow, C.Jersey, C.JerseyLight, C.TrimShadow, C.Trim, C.ShortsShadow, C.Shorts, C.SocksShadow, C.Socks];
const JERSEY_IDS: readonly number[] = [C.JerseyShadow, C.Jersey, C.JerseyLight];
const BOOT_IDS: readonly number[] = [C.BootShadow, C.Boot, C.BootLight];

/** INFERNO: hot spots climb the shirt this fast, px/s, in bands this many rows tall. */
const FLAME_CLIMB = 26;
const FLAME_BAND = 2;
/** Embers a second (the study's two tries a tick), from his top rows of shirt. */
const EMBERS_PER_S = 28;
const EMBER_ROWS = 10;
/** A shine's sweep: across the frame in `sweep` s, every `period` s. */
const SHINE = { ice: { period: 1.4, sweep: 0.5 }, gold: { period: 1.6, sweep: 0.55 } } as const;
/** Sparkles a second round ICE and GOLD. */
const TWINKLES_PER_S = { ice: 10, gold: 3 } as const;
/** Trail particles a second from each boot pixel while sprinting (the study's per-tick odds at 20 fps). */
const TRAIL_PER_PIXEL_S = { fire: 7, lightning: 7, gold: 3.6 } as const;
const BOLTS_PER_S = 8;
/** A boot is on the ground on these rows; a landing moves the grounded boot this far. */
const GROUND_ROWS = 1;
const LANDING_SHIFT = 4;

const EMBER_COLORS: readonly MasterColor[] = ['energyGoldLight', 'energyGold', 'flameLight', 'flame', 'flameDark'];

/** A stable pseudo-random value in [0, 1) for a pixel. */
function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** How many of something happen in `dt` at `perS` a second: the whole part, and the rest by chance. */
function howMany(perS: number, dt: number, rng: () => number): number {
  const n = perS * dt;
  return Math.floor(n) + (rng() < n % 1 ? 1 : 0);
}

const pick = <T>(list: readonly T[], rng: () => number): T => list[Math.floor(rng() * list.length)]!;

function pixelsOf(f: IndexedImage, ids: readonly number[]): Point[] {
  const out: Point[] = [];
  for (let y = 0; y < f.height; y++) for (let x = 0; x < f.width; x++) if (ids.includes(f.get(x, y))) out.push({ x, y });
  return out;
}

const flames: Shader = (id, x, y, t) => {
  if (!JERSEY_IDS.includes(id)) return null;
  const n = hash(x, Math.floor((y + t * FLAME_CLIMB) / FLAME_BAND));
  if (id === C.JerseyShadow) return n > 0.8 ? 'flame' : 'flameDark';
  return n < 0.5 ? 'flame' : n < 0.78 ? 'flameLight' : n < 0.92 ? 'energyGold' : 'redDark';
};

/** A diagonal band of `core` edged in `edge` across every kit pixel, once a period. */
function shine(core: MasterColor, edge: MasterColor, { period, sweep }: { period: number; sweep: number }): Shader {
  return (id, x, y, t) => {
    if (!KIT_IDS.includes(id)) return null;
    const phase = (t % period) / sweep;
    if (phase > 1) return null;
    const u = Math.abs(x + y * 0.7 - (20 + phase * 50));
    return u < 1.2 ? core : u < 2.6 ? edge : null;
  };
}

const SHADERS: Partial<Record<KitItemId, Shader>> = {
  inferno: flames,
  ice: shine('white', 'electricLight', SHINE.ice),
  blackGold: shine('energyGoldLight', 'energyGold', SHINE.gold),
  gold: shine('auraWhite', 'energyGoldLight', SHINE.gold),
};

export const kitShader = (kit: KitItemId): Shader | null => SHADERS[kit] ?? null;

function twinkles(frame: IndexedImage, perS: number, colors: readonly MasterColor[], dt: number, rng: () => number): ParticleSpec[] {
  const n = howMany(perS, dt, rng);
  if (n === 0) return [];
  const kit = pixelsOf(frame, KIT_IDS);
  if (kit.length === 0) return [];
  return Array.from({ length: n }, () => {
    const p = pick(kit, rng);
    return { x: p.x + (rng() - 0.5) * 8, y: p.y + (rng() - 0.5) * 6, vx: -6, vy: 0, life: 0.35, colors, shape: 'plus' as const };
  });
}

function embers(frame: IndexedImage, dt: number, rng: () => number): ParticleSpec[] {
  const n = howMany(EMBERS_PER_S, dt, rng);
  if (n === 0) return [];
  const shirt = pixelsOf(frame, JERSEY_IDS);
  if (shirt.length === 0) return [];
  const top = Math.min(...shirt.map(p => p.y));
  const shoulders = shirt.filter(p => p.y < top + EMBER_ROWS);
  return Array.from({ length: n }, () => {
    const p = pick(shoulders, rng);
    return { x: p.x, y: p.y, vx: -14 - rng() * 10, vy: -22 - rng() * 14, life: 0.55 + rng() * 0.3, colors: EMBER_COLORS, shape: 'dot' as const };
  });
}

/** Particles a kit gives off this tick, in frame pixels (y down). */
export function kitParticles(kit: KitItemId, frame: IndexedImage, dt: number, rng: () => number): ParticleSpec[] {
  if (kit === 'inferno') return embers(frame, dt, rng);
  if (kit === 'ice') return twinkles(frame, TWINKLES_PER_S.ice, ['white', 'electricLight', 'electric'], dt, rng);
  if (kit === 'gold') return twinkles(frame, TWINKLES_PER_S.gold, ['auraWhite', 'energyGoldLight', 'energyGold'], dt, rng);
  return [];
}

type TrailBoots = keyof typeof TRAIL_PER_PIXEL_S;
const isTrail = (b: BootsItemId): b is TrailBoots => b in TRAIL_PER_PIXEL_S;

/** One trail particle off boot pixel p. */
function trailFrom(boots: TrailBoots, p: Point, rng: () => number): ParticleSpec {
  if (boots === 'fire') return { x: p.x, y: p.y, vx: -70 - rng() * 30, vy: -10 - rng() * 14, life: 0.22 + rng() * 0.1, colors: ['energyGoldLight', 'flameLight', 'flame', 'flameDark'], shape: 'dot' };
  if (boots === 'lightning') return { x: p.x, y: p.y, vx: -80 - rng() * 30, vy: (rng() - 0.5) * 10, life: 0.25, colors: ['white', 'electricLight', 'electric'], shape: 'dot' };
  return { x: p.x, y: p.y, vx: -75 - rng() * 25, vy: -4 - rng() * 6, life: 0.28, colors: ['auraWhite', 'energyGoldLight', 'energyGold', 'goldDark'], shape: 'dot' };
}

/** The crackle on a step: a puff of fire, two zaps or two glints. */
function stepBurst(boots: TrailBoots, at: Point, rng: () => number): ParticleSpec[] {
  if (boots === 'fire') {
    return Array.from({ length: 6 }, () => ({ x: at.x + (rng() - 0.5) * 5, y: at.y, vx: (rng() - 0.5) * 30 - 30, vy: -25 - rng() * 25, life: 0.3, colors: ['energyGold', 'flameLight', 'flame', 'flameDark'] as const, shape: 'dot' as const }));
  }
  if (boots === 'lightning') {
    return [-1, 1].map(dir => ({ x: at.x + dir * 2, y: at.y - 1, vx: dir * 20 - 40, vy: 0, life: 0.15, colors: ['white', 'electricLight'] as const, shape: 'bolt' as const }));
  }
  return [0, 1].map(() => ({ x: at.x - 3 - rng() * 8, y: at.y - 2 - rng() * 6, vx: -40, vy: 0, life: 0.3, colors: ['auraWhite', 'energyGoldLight', 'energyGold'] as const, shape: 'plus' as const }));
}

/** Particles boots give off: a trail while sprinting, a burst on a landing. */
export function bootParticles(boots: BootsItemId, frame: IndexedImage, dt: number, rng: () => number, sprinting: boolean, landed: Point | null): ParticleSpec[] {
  if (!isTrail(boots)) return [];
  const out: ParticleSpec[] = [];
  if (sprinting) {
    const pixels = pixelsOf(frame, BOOT_IDS);
    for (const p of pixels) for (let k = howMany(TRAIL_PER_PIXEL_S[boots], dt, rng); k > 0; k--) out.push(trailFrom(boots, p, rng));
    if (boots === 'lightning' && pixels.length > 0) {
      for (let k = howMany(BOLTS_PER_S, dt, rng); k > 0; k--) {
        const b = pick(pixels, rng);
        out.push({ x: b.x, y: b.y - 1, vx: -50, vy: 0, life: 0.12, colors: ['white', 'electricLight'], shape: 'bolt' });
      }
    }
  }
  if (landed) out.push(...stepBurst(boots, landed, rng));
  return out;
}

/** Whether boots leave a trail when he sprints. */
export const hasTrail = (b: BootsItemId): boolean => isTrail(b);

/** Whether anything in `o` shines, burns or trails. */
export const animates = (o: Outfit): boolean => kitShader(o.kit) !== null || isTrail(o.boots);

/** Where a boot newly meets the ground in `frame`, after `prev`, if one does. */
export function landing(prev: IndexedImage | null, frame: IndexedImage): Point | null {
  const grounded = (img: IndexedImage) => pixelsOf(img, BOOT_IDS).filter(p => p.y >= ANCHOR.y - GROUND_ROWS);
  const now = grounded(frame);
  if (now.length === 0) return null;
  const centre = (ps: Point[]) => ps.reduce((a, p) => a + p.x, 0) / ps.length;
  const before = prev ? grounded(prev) : [];
  if (before.length > 0 && Math.abs(centre(now) - centre(before)) <= LANDING_SHIFT) return null;
  return { x: Math.round(centre(now)), y: ANCHOR.y };
}
