import { describe, expect, it } from 'vitest';
import { C, resolvePalette } from '../colors';
import { HARRISON_HEADS, HARRISON_POWER_HEADS } from '../harrison/head';
import { harrisonLook } from '../harrison/look';
import { opaqueBounds } from '../raster';
import { CLIPS } from './animations';
import { bakeAll, frameIndexAt, samplePoses } from './bake';
import { flipX } from '../indexedImage';
import { ANCHOR, FRAME_W, mirrorPose } from './pose';
import { HARRISON_BODY, standingHipHeight } from './proportions';

const KITS = ['home', 'away'] as const;
const FORMS = ['base', 'golden', 'storm', 'ultra'] as const;
const baked = bakeAll(HARRISON_BODY, HARRISON_HEADS);
const powered = bakeAll(HARRISON_BODY, HARRISON_POWER_HEADS);
const allClips = [...Object.values(baked), ...Object.values(powered)];

describe('bakeAll', () => {
  it('bakes the spec frame counts', () => {
    expect(Object.fromEntries(Object.values(baked).map(c => [c.name, c.frames.length]))).toEqual({
      idle: 4,
      run: 8,
      jump: 3,
      shoot: 5,
      powerUp: 4,
    });
  });

  it('keeps a 1 px transparent margin on every frame (no clipping), including power heads', () => {
    for (const clip of allClips) {
      for (const f of clip.frames) {
        const b = opaqueBounds(f)!;
        expect(b.x >= 1 && b.y >= 1 && b.x + b.w <= 48 && b.y + b.h <= 55, `${clip.name} clipped`).toBe(true);
      }
    }
  });

  it('keeps run frames on or near the ground', () => {
    for (const f of baked.run.frames) {
      const b = opaqueBounds(f)!;
      expect(b.y + b.h - 1).toBeGreaterThanOrEqual(53 - 3);
    }
  });

  it('uses at most 13 distinct resolved colours per frame in every kit and form', () => {
    for (const kit of KITS) {
      for (const form of FORMS) {
        const pal = resolvePalette(harrisonLook(kit, form));
        for (const clip of Object.values(form === 'base' ? baked : powered)) {
          for (const f of clip.frames) {
            const colours = new Set([...f.data].filter(id => id !== C.None).map(id => pal[id]!.join(',')));
            expect(colours.size, `${kit}/${form}/${clip.name}`).toBeLessThanOrEqual(13);
          }
        }
      }
    }
  });

  it('resolves every logical colour used to an opaque colour in every kit and form', () => {
    const used = new Set(allClips.flatMap(c => c.frames.flatMap(f => [...f.data])));
    used.delete(C.None);
    for (const kit of KITS) {
      for (const form of FORMS) {
        const pal = resolvePalette(harrisonLook(kit, form));
        for (const id of used) expect(pal[id]?.[3]).toBe(255);
      }
    }
  });
});

describe('facing left', () => {
  it('keeps the feet on the anchor column when a frame is flipped', () => {
    expect(ANCHOR.x).toBe((FRAME_W - 1) / 2);
    for (const clip of Object.values(baked)) {
      for (const f of clip.frames) {
        const flipped = flipX(f);
        for (let y = 0; y < f.height; y++) expect(flipped.get(ANCHOR.x, y)).toBe(f.get(ANCHOR.x, y));
      }
    }
  });
});

describe('bakeAll for other bodies', () => {
  it.each([
    ['longer', 1],
    ['shorter', -1],
  ])('plants the feet on the ground with %s legs', (_, delta) => {
    const body = { ...HARRISON_BODY, thigh: HARRISON_BODY.thigh + delta, shin: HARRISON_BODY.shin + delta };
    const clips = bakeAll(body, HARRISON_HEADS);
    for (const clip of [clips.idle, clips.shoot, clips.powerUp]) {
      for (const f of clip.frames) {
        const b = opaqueBounds(f)!;
        expect(b.y + b.h - 1, `${clip.name} sole + outline row`).toBe(53 + 1);
      }
    }
  });
});

describe('CLIPS', () => {
  it('jump starts in a crouch', () => {
    expect(CLIPS.jump.keys[0]!.hipHeight).toBeLessThan(standingHipHeight(HARRISON_BODY));
  });
});

describe('samplePoses', () => {
  it('returns the keys exactly when there is one key per frame', () => {
    expect(samplePoses(CLIPS.shoot)).toEqual(CLIPS.shoot.keys);
  });

  it('mirrors the first half of a mirrorHalf cycle into the second', () => {
    const poses = samplePoses(CLIPS.run);
    expect(poses[4]).toEqual(mirrorPose(poses[0]!));
    expect(poses[7]).toEqual(mirrorPose(poses[3]!));
  });

  it('interpolates between keys, wrapping for loops', () => {
    const clip = { ...CLIPS.idle, keys: CLIPS.idle.keys.slice(0, 2), frameCount: 4 };
    const poses = samplePoses(clip);
    const a = clip.keys[0]!;
    const b = clip.keys[1]!;
    expect(poses[1]!.hipHeight).toBeCloseTo((a.hipHeight + b.hipHeight) / 2);
    expect(poses[3]!.hipHeight).toBeCloseTo((b.hipHeight + a.hipHeight) / 2);
  });
});

describe('frameIndexAt', () => {
  it('loops or clamps', () => {
    expect(frameIndexAt(baked.run, 1000)).toBe(12 % 8);
    expect(frameIndexAt(baked.shoot, 10_000)).toBe(4);
  });
});
