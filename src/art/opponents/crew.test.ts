import { describe, expect, it } from 'vitest';
import { bakeAll } from '../body/bake';
import { HARRISON_BODY, standingHipHeight } from '../body/proportions';
import { C, resolvePalette } from '../colors';
import { harrisonLook } from '../harrison/look';
import { opaqueBounds } from '../raster';
import { CREW_BODY, CREW_HEADS, crewLook } from './crew';
import { MAX_HEADS, maxLook } from './max';

const FACINGS = ['side', 'threeQuarter', 'front'] as const;
const CREW = ['brick', 'leo', 'tia', 'pete'] as const;

describe('the Park crew', () => {
  it.each(CREW)('%s: every head fits the size budget, with its neck inside the image', id => {
    for (const facing of FACINGS) {
      const { image, neck } = CREW_HEADS[id][facing];
      const b = opaqueBounds(image)!;
      expect(b.h, facing).toBeGreaterThanOrEqual(8);
      expect(b.h, facing).toBeLessThanOrEqual(10);
      expect(neck.x, facing).toBeGreaterThanOrEqual(0);
      expect(neck.x, facing).toBeLessThan(image.width);
      expect(neck.y, facing).toBeLessThanOrEqual(image.height);
      expect(new Set(image.data).has(C.Earring), facing).toBe(false);
    }
  });

  it.each(CREW)('%s: frames stay within 13 colours', id => {
    const pal = resolvePalette(crewLook(id));
    for (const clip of Object.values(bakeAll(CREW_BODY[id], CREW_HEADS[id]))) {
      for (const f of clip.frames) {
        const colours = new Set([...f.data].filter(c => c !== C.None).map(c => pal[c]!.join(',')));
        expect(colours.size, clip.name).toBeLessThanOrEqual(13);
      }
    }
  });

  it("no two kits share a jersey colour, and none is Harrison's red or Max's blue", () => {
    const jerseys = CREW.map(id => crewLook(id).Jersey);
    expect(new Set(jerseys).size).toBe(4);
    for (const j of jerseys) {
      expect(j).not.toBe(harrisonLook('home').Jersey);
      expect(j).not.toBe(maxLook().Jersey);
    }
  });

  it('skin tones vary: at least three across the crew and Max', () => {
    expect(new Set([...CREW.map(id => crewLook(id).Skin), maxLook().Skin]).size).toBeGreaterThanOrEqual(3);
  });

  it("Tia's side head runs wider than her face, for the ponytail", () => {
    const side = opaqueBounds(CREW_HEADS.tia.side.image)!;
    expect(side.w).toBeGreaterThan(opaqueBounds(CREW_HEADS.tia.front.image)!.w);
    expect(side.w).toBeGreaterThan(opaqueBounds(MAX_HEADS.side.image)!.w);
  });

  it('Brick is stockier than Harrison in torso, thigh and arm, standing just as tall at the hip', () => {
    const [brick, base] = [CREW_BODY.brick, HARRISON_BODY];
    expect(brick.torsoWidth).toBeGreaterThan(base.torsoWidth);
    expect(brick.thighWidth).toBeGreaterThan(base.thighWidth);
    expect(brick.upperArmWidth).toBeGreaterThan(base.upperArmWidth);
    expect(standingHipHeight(brick)).toBe(standingHipHeight(base));
    expect([brick.thigh, brick.shin, brick.torso, brick.upperArm, brick.forearm]).toEqual([base.thigh, base.shin, base.torso, base.upperArm, base.forearm]);
    for (const id of ['leo', 'tia', 'pete'] as const) expect(CREW_BODY[id]).toBe(HARRISON_BODY);
  });
});
