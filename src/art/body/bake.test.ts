import { describe, expect, it } from 'vitest';
import { C, resolvePalette } from '../colors';
import { HARRISON_HEADS, HARRISON_POWER_HEADS } from '../harrison/head';
import { harrisonLook } from '../harrison/look';
import { MAX_HEADS } from '../opponents/max';
import { opaqueBounds } from '../raster';
import { CREW_BODY, CREW_HEADS } from '../opponents/crew';
import { SAM_HEADS } from '../opponents/sam';
import { CLIPS, FLICK_RELEASE_FRAME, SKID_FRAME_HOLD } from './animations';
import { bakeAll, frameIndexAt, samplePoses } from './bake';
import { flipX } from '../indexedImage';
import { ANCHOR, FRAME_W, lerpPose, mirrorPose, solvePose } from './pose';
import { BRICK_BODY, HARRISON_BODY, standingHipHeight } from './proportions';

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
      sprint: 8,
      chip: 4,
      header: 3,
      volley: 4,
      slide: 4,
      fall: 5,
      juggle: 4,
      celebrate: 2,
      brace: 1,
      skid: 2,
      stepover: 4,
      flick: 6,
      fooled: 3,
      stumble: 4,
    });
  });

  it.each([
    ['max', HARRISON_BODY, MAX_HEADS],
    ['brick', CREW_BODY.brick, CREW_HEADS.brick],
    ['leo', CREW_BODY.leo, CREW_HEADS.leo],
    ['tia', CREW_BODY.tia, CREW_HEADS.tia],
    ['pete', CREW_BODY.pete, CREW_HEADS.pete],
    ['sam', HARRISON_BODY, SAM_HEADS],
  ] as const)('bakes the trick clips for %s at their counts, inside the frame', (_, body, heads) => {
    const clips = bakeAll(body, heads);
    expect([clips.stepover, clips.flick, clips.fooled, clips.stumble].map(c => c.frames.length)).toEqual([4, 6, 3, 4]);
    for (const clip of [clips.stepover, clips.flick, clips.fooled, clips.stumble]) {
      for (const f of clip.frames) {
        const b = opaqueBounds(f)!;
        expect(b.x >= 1 && b.y >= 1 && b.x + b.w <= FRAME_W - 1 && b.y + b.h <= 55, `${clip.name} clipped`).toBe(true);
      }
    }
  });

  it('times the tricks: a 0.4 s stepover and a 0.5 s flick that hold, a looping confusion, a stumble that holds', () => {
    expect([CLIPS.stepover.fps, CLIPS.stepover.loop]).toEqual([10, false]);
    expect([CLIPS.flick.fps, CLIPS.flick.loop]).toEqual([12, false]);
    expect([CLIPS.fooled.fps, CLIPS.fooled.loop]).toEqual([6, true]);
    expect([CLIPS.stumble.fps, CLIPS.stumble.loop]).toEqual([10, false]);
    expect(FLICK_RELEASE_FRAME / CLIPS.flick.fps).toBeCloseTo(0.25);
  });

  it("at the flick's release his near heel is kicked up behind his hips", () => {
    const j = solvePose(samplePoses(CLIPS.flick)[FLICK_RELEASE_FRAME]!, HARRISON_BODY);
    expect(j.nearLeg.ankle.x).toBeLessThan(j.hip.x - 2);
    expect(j.nearLeg.ankle.y).toBeLessThan(53 - HARRISON_BODY.ankleHeight - 6);
  });

  it("the stumble's first frame lurches forward, the torso ahead of the hips", () => {
    const j = solvePose(samplePoses(CLIPS.stumble)[0]!, HARRISON_BODY);
    expect(j.neck.x).toBeGreaterThan(j.hip.x + 3);
  });

  it('the stepover and the flick keep a sole on the ground in every frame', () => {
    for (const clip of [baked.stepover, baked.flick]) {
      for (const f of clip.frames) expect(opaqueBounds(f)!.y + opaqueBounds(f)!.h - 1, clip.name).toBe(54);
    }
  });

  it('bakes the skid: two frames at 8 fps that hold, not loop', () => {
    expect(baked.skid.frames.length).toBe(2);
    expect([CLIPS.skid.fps, CLIPS.skid.loop]).toEqual([8, false]);
    expect(SKID_FRAME_HOLD).toBe(1);
  });

  it('skidding, he leans back with his front foot planted out ahead of his hips', () => {
    const j = solvePose(samplePoses(CLIPS.skid)[SKID_FRAME_HOLD]!, HARRISON_BODY);
    expect(j.nearLeg.ankle.x - j.hip.x).toBeGreaterThanOrEqual(6);
    expect(j.neck.x).toBeLessThan(j.hip.x);
    expect(j.nearLeg.ankle.y).toBeCloseTo(53 - HARRISON_BODY.ankleHeight, 0);
  });

  it('the skid bakes inside the frame for every body, both soles down', () => {
    for (const body of [HARRISON_BODY, BRICK_BODY]) {
      for (const f of bakeAll(body, MAX_HEADS).skid.frames) {
        const b = opaqueBounds(f)!;
        expect(b.x >= 1 && b.y >= 1 && b.x + b.w <= FRAME_W - 1 && b.y + b.h <= 55).toBe(true);
        expect(b.y + b.h - 1).toBe(54);
      }
    }
  });

  it('bakes the one-frame brace clip for Harrison and Max, inside the frame and planted', () => {
    for (const heads of [HARRISON_HEADS, MAX_HEADS]) {
      const [f, ...rest] = bakeAll(HARRISON_BODY, heads).brace.frames;
      expect(rest).toEqual([]);
      const b = opaqueBounds(f!)!;
      expect(b.x >= 1 && b.y >= 1 && b.x + b.w <= 48 && b.y + b.h <= 55).toBe(true);
      expect(b.y + b.h - 1).toBe(54);
    }
  });

  it('bakes the juggle clip with 4 frames: a looping keepy-uppie at 8 fps', () => {
    expect(baked.juggle.frames.length).toBe(4);
    expect([CLIPS.juggle.fps, CLIPS.juggle.loop]).toEqual([8, true]);
  });

  it('juggling keeps the standing sole on the anchor row as the set frames come round', () => {
    for (const i of [0, 3]) {
      const b = opaqueBounds(baked.juggle.frames[i]!)!;
      expect(b.y + b.h - 1, `juggle frame ${i}`).toBe(54);
    }
  });

  it('juggling lifts the near foot highest on the second frame', () => {
    const toe = (i: number) => samplePoses(CLIPS.juggle)[i]!.nearLeg;
    expect(toe(1).hip).toBeGreaterThan(toe(0).hip);
    expect(toe(1).hip).toBeGreaterThan(toe(3).hip);
  });

  it('bakes the new clips with spec frame counts', () => {
    expect([baked.sprint, baked.chip, baked.header, baked.volley, baked.slide, baked.fall].map(c => c.frames.length)).toEqual([
      8, 4, 3, 4, 4, 5,
    ]);
  });

  it('grounded clips keep the sole on the anchor row', () => {
    for (const clip of [baked.chip, baked.slide]) {
      for (const f of clip.frames) {
        const b = opaqueBounds(f)!;
        expect(b.y + b.h - 1, `${clip.name} sole + outline row`).toBe(54);
      }
    }
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

  it('mirrorHalf rejects odd frame counts', () => {
    expect(() => samplePoses({ ...CLIPS.run, frameCount: 7 })).toThrow(/even/);
  });

  it('mirrorHalf interpolates toward the mirrored first key', () => {
    const clip = { ...CLIPS.run, frameCount: 16 };
    const poses = samplePoses(clip);
    expect(poses[7]!.nearLeg.hip).toBeCloseTo(lerpPose(clip.keys[3]!, mirrorPose(clip.keys[0]!), 0.5).nearLeg.hip);
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

  // A requestAnimationFrame timestamp can be a few ms earlier than a start time
  // taken from performance.now(), so elapsed time is sometimes slightly negative.
  it('returns the first frame for negative elapsed time', () => {
    expect(frameIndexAt(baked.run, -5)).toBe(0);
    expect(frameIndexAt(baked.shoot, -5)).toBe(0);
  });
});
