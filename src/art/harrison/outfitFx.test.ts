import { describe, expect, it } from 'vitest';
import { bakeAll } from '../body/bake';
import { HARRISON_BODY } from '../body/proportions';
import { C } from '../colors';
import { HARRISON_HEADS } from './head';
import { animates, bootParticles, kitParticles, kitShader, landing, seeded } from './outfitFx';

const BAKED = bakeAll(HARRISON_BODY, HARRISON_HEADS);
const IDLE = BAKED.idle.frames[0]!;
const RUN = BAKED.run.frames;
const SECOND = 1;

/** Every opaque pixel of idle frame 0 with its id. */
const pixels = (ids: readonly number[]) => {
  const out: { id: number; x: number; y: number }[] = [];
  for (let y = 0; y < IDLE.height; y++) for (let x = 0; x < IDLE.width; x++) if (ids.includes(IDLE.get(x, y))) out.push({ id: IDLE.get(x, y), x, y });
  return out;
};

describe('kit shaders', () => {
  it('plain kits have no shader and give off nothing', () => {
    for (const kit of ['home', 'sky'] as const) {
      expect(kitShader(kit)).toBeNull();
      expect(kitParticles(kit, IDLE, SECOND, seeded(1))).toEqual([]);
    }
  });

  it("INFERNO's flames move", () => {
    const shade = kitShader('inferno')!;
    const jersey = pixels([C.Jersey, C.JerseyLight, C.JerseyShadow]);
    for (const p of jersey) expect(shade(p.id, p.x, p.y, 0.3)).toBe(shade(p.id, p.x, p.y, 0.3));
    expect(jersey.some(p => shade(p.id, p.x, p.y, 0) !== shade(p.id, p.x, p.y, 0.25))).toBe(true);
  });

  it('INFERNO leaves the trim alone', () => {
    const shade = kitShader('inferno')!;
    for (const t of [0, 0.2, 0.5, 1.3]) for (const p of pixels([C.Trim, C.TrimShadow, C.Shorts])) expect(shade(p.id, p.x, p.y, t)).toBeNull();
  });

  it('a shine only touches kit slots', () => {
    for (const kit of ['ice', 'blackGold', 'gold'] as const) {
      const shade = kitShader(kit)!;
      for (let t = 0; t < 2; t += 0.05) {
        for (const p of pixels([C.Skin, C.SkinShadow, C.Hair, C.HairShadow, C.Outline, C.Boot])) expect(shade(p.id, p.x, p.y, t)).toBeNull();
      }
    }
  });

  it('a shine crosses the trim too, and comes round again', () => {
    const shade = kitShader('ice')!;
    const trim = pixels([C.Trim]);
    const lit = (t: number) => trim.some(p => shade(p.id, p.x, p.y, t) !== null);
    const times = [...Array(28)].map((_, i) => i * 0.05);
    expect(times.some(lit)).toBe(true);
    expect(times.filter(lit).every(t => lit(t + 1.4))).toBe(true);
  });

  it('INFERNO gives off embers from his shoulders, ICE and GOLD sparkles', () => {
    const embers = kitParticles('inferno', IDLE, SECOND, seeded(2));
    expect(embers.length).toBeGreaterThan(5);
    expect(embers.every(e => e.vy < 0 && e.shape === 'dot')).toBe(true);
    expect(kitParticles('ice', IDLE, SECOND, seeded(3)).some(p => p.shape === 'plus')).toBe(true);
    expect(kitParticles('gold', IDLE, SECOND, seeded(4)).length).toBeGreaterThan(0);
    expect(kitParticles('blackGold', IDLE, SECOND, seeded(5))).toEqual([]);
  });
});

describe('boot particles', () => {
  it('trails only while sprinting', () => {
    expect(bootParticles('fire', RUN[0]!, 0.1, seeded(1), false, null)).toEqual([]);
    expect(bootParticles('fire', RUN[0]!, 0.1, seeded(1), true, null).length).toBeGreaterThan(0);
    expect(bootParticles('volt', RUN[0]!, 0.1, seeded(1), true, { x: 24, y: 53 })).toEqual([]);
  });

  it('a landing bursts', () => {
    const zaps = bootParticles('lightning', RUN[0]!, 1 / 60, seeded(1), false, { x: 24, y: 53 });
    expect(zaps.filter(p => p.shape === 'bolt')).toHaveLength(2);
    expect(bootParticles('fire', RUN[0]!, 1 / 60, seeded(1), false, { x: 24, y: 53 }).length).toBeGreaterThanOrEqual(6);
    expect(bootParticles('gold', RUN[0]!, 1 / 60, seeded(1), false, { x: 24, y: 53 }).filter(p => p.shape === 'plus')).toHaveLength(2);
  });

  it('landing finds a boot newly on the ground', () => {
    const lands = RUN.map((f, i) => landing(RUN[(i + RUN.length - 1) % RUN.length]!, f));
    expect(lands.some(l => l !== null)).toBe(true);
    expect(landing(IDLE, IDLE)).toBeNull();
  });

  it('animates: a flashy kit or trail boots', () => {
    expect(animates({ kit: 'home', boots: 'volt', extras: ['glasses', 'headband'] })).toBe(false);
    expect(animates({ kit: 'blackGold', boots: 'volt', extras: [] })).toBe(true);
    expect(animates({ kit: 'sky', boots: 'gold', extras: [] })).toBe(true);
  });

  it('seeded repeats', () => {
    const a = seeded(42);
    const b = seeded(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});
