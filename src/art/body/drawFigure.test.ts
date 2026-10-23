import { describe, expect, it } from 'vitest';
import { C } from '../colors';
import { HARRISON_HEADS } from '../harrison/head';
import { opaqueBounds } from '../raster';
import { drawFigure } from './drawFigure';
import { solvePose, standingPose } from './pose';
import { HARRISON_BODY } from './proportions';

const fig = () => drawFigure(standingPose(HARRISON_BODY), HARRISON_BODY, HARRISON_HEADS);

describe('drawFigure', () => {
  it('returns a 49×56 frame with a 1 px transparent margin', () => {
    const img = fig();
    const b = opaqueBounds(img)!;
    expect([img.width, img.height]).toEqual([49, 56]);
    expect(b.x).toBeGreaterThanOrEqual(1);
    expect(b.y).toBeGreaterThanOrEqual(1);
    expect(b.x + b.w).toBeLessThanOrEqual(48);
    expect(b.y + b.h).toBeLessThanOrEqual(55);
  });

  it('standing figure is about 40 px tall (plus outline) and at most 24 px wide', () => {
    const b = opaqueBounds(fig())!;
    expect(b.h).toBeGreaterThanOrEqual(38);
    expect(b.h).toBeLessThanOrEqual(44);
    expect(b.w).toBeLessThanOrEqual(24);
  });

  it('puts the boot sole on the anchor row', () => {
    const b = opaqueBounds(fig())!;
    expect(b.y + b.h - 1).toBe(53 + 1);
  });

  it('paints boots at the toes, socks on the shin and jersey on the torso', () => {
    const p = standingPose(HARRISON_BODY);
    p.nearArm.shoulder = p.farArm.shoulder = 90;
    const img = drawFigure(p, HARRISON_BODY, HARRISON_HEADS);
    const j = solvePose(p, HARRISON_BODY);
    expect(img.get(Math.round(j.nearLeg.toe.x) - 1, Math.round(j.nearLeg.toe.y))).toBe(C.Boot);
    expect(img.get(24, Math.round(j.nearLeg.ankle.y) - 3)).toBe(C.Socks);
    expect(img.get(24, Math.round((j.hip.y + j.neck.y) / 2))).toBe(C.Jersey);
  });

  it('draws the near leg over the far leg', () => {
    const j = solvePose(standingPose(HARRISON_BODY), HARRISON_BODY);
    expect(fig().get(24, Math.round(j.nearLeg.ankle.y) - 3)).toBe(C.Socks);
  });

  it('outlines the figure', () => {
    expect(fig().data.includes(C.Outline)).toBe(true);
  });
});
