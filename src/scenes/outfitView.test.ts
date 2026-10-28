import { describe, expect, it } from 'vitest';
import { bakeAll } from '../art/body/bake';
import { HARRISON_BODY } from '../art/body/proportions';
import { HARRISON_HEADS } from '../art/harrison/head';
import { DEFAULT_OUTFIT, type Outfit } from '../meta/locker';
import { OutfitFx, type WorldPoint } from './outfitView';

const BAKED = bakeAll(HARRISON_BODY, HARRISON_HEADS);
const AT: WorldPoint = { x: 100, y: 0, z: 40 };
const toScreen = (p: WorldPoint) => ({ x: p.x, y: 176 - p.z - p.y });

/** A context that records every fillRect, with the colour it was filled in. */
function fillsContext(): { g: CanvasRenderingContext2D; fills: string[] } {
  const fills: string[] = [];
  let style = '';
  const g = new Proxy({}, {
    get(_, prop) {
      if (prop === 'fillRect') return (x: number, y: number, w: number, h: number) => void fills.push(`${style} ${x},${y} ${w}x${h}`);
      return () => undefined;
    },
    set(_, prop, v) {
      if (prop === 'fillStyle') style = String(v);
      return true;
    },
  }) as CanvasRenderingContext2D;
  return { g, fills };
}

/** Draws `fx` at 60 fps for `seconds`, running and sprinting, from `startS`. */
function run(fx: OutfitFx, seconds: number, startS = 0): string[] {
  const { g, fills } = fillsContext();
  const frames = BAKED.sprint.frames;
  for (let i = 0; i <= seconds * 60; i++) {
    const t = startS + i / 60;
    fx.draw(g, t, frames[Math.floor(t * BAKED.sprint.fps) % frames.length]!, AT, 1, true, toScreen);
  }
  return fills;
}

const INFERNO: Outfit = { kit: 'inferno', boots: 'fire', extras: [] };

describe('OutfitFx', () => {
  it('nothing animated draws nothing', () => {
    expect(run(new OutfitFx(DEFAULT_OUTFIT, 1), 2)).toEqual([]);
    expect(run(new OutfitFx({ kit: 'sky', boots: 'pink', extras: ['glasses'] }, 1), 2)).toEqual([]);
  });

  it('particles live and die', () => {
    const fills = run(new OutfitFx(INFERNO, 7), 1);
    expect(fills.length).toBeGreaterThan(0);
    expect(run(new OutfitFx(INFERNO, 7), 1)).toEqual(fills);
    // Stood still long enough, every particle has died.
    const fx = new OutfitFx({ kit: 'home', boots: 'fire', extras: [] }, 7);
    run(fx, 1);
    const { g, fills: later } = fillsContext();
    for (let i = 1; i <= 60; i++) fx.draw(g, 1 + i / 60, BAKED.idle.frames[0]!, AT, 1, false, toScreen);
    later.length = 0;
    fx.draw(g, 2.02, BAKED.idle.frames[0]!, AT, 1, false, toScreen);
    expect(later).toEqual([]);
  });

  it("a long pause doesn't flood", () => {
    const pause = (gapS: number) => {
      const fx = new OutfitFx(INFERNO, 3);
      const { g, fills } = fillsContext();
      fx.draw(g, 0, BAKED.sprint.frames[0]!, AT, 1, true, toScreen);
      fills.length = 0;
      fx.draw(g, gapS, BAKED.sprint.frames[0]!, AT, 1, true, toScreen);
      return fills;
    };
    expect(pause(10)).toEqual(pause(0.1));
  });

  it('a trail stays on the pitch as he runs on', () => {
    const fx = new OutfitFx({ kit: 'home', boots: 'fire', extras: [] }, 5);
    const { g, fills } = fillsContext();
    fx.draw(g, 0, BAKED.sprint.frames[0]!, AT, 1, true, toScreen);
    fx.draw(g, 0.1, BAKED.sprint.frames[1]!, AT, 1, true, toScreen);
    fills.length = 0;
    fx.draw(g, 0.11, BAKED.sprint.frames[1]!, { ...AT, x: AT.x + 200 }, 1, false, toScreen);
    const xs = fills.map(f => Number(f.split(' ')[1]!.split(',')[0]));
    expect(xs.some(x => x < AT.x + 100)).toBe(true);
  });

  it('the sparkle burst draws gold round his middle at the next draw', () => {
    const fx = new OutfitFx(DEFAULT_OUTFIT, 1);
    const { g, fills } = fillsContext();
    fx.draw(g, 0, BAKED.idle.frames[0]!, AT, 1, false, toScreen);
    fx.sparkleBurst();
    fx.draw(g, 0.02, BAKED.idle.frames[0]!, AT, 1, false, toScreen);
    expect(fills.length).toBeGreaterThan(20);
  });

  it('draws each particle at the scale asked', () => {
    const fx = new OutfitFx(DEFAULT_OUTFIT, 1);
    const { g, fills } = fillsContext();
    fx.draw(g, 0, BAKED.idle.frames[0]!, AT, 1, false, toScreen, 2);
    fx.sparkleBurst();
    fx.draw(g, 0.02, BAKED.idle.frames[0]!, AT, 1, false, toScreen, 2);
    expect(fills.every(f => f.endsWith(' 2x2'))).toBe(true);
  });
});
