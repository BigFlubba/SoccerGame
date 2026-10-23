import { describe, expect, it } from 'vitest';
import { lerpPose, mirrorPose, plantLeg, solvePose, standingPose } from './pose';
import { HARRISON_BODY } from './proportions';

const B = HARRISON_BODY;

describe('solvePose', () => {
  it('standing pose puts ankles at ankle height and toes forward', () => {
    const j = solvePose(standingPose(B), B);
    expect(j.hip).toEqual({ x: 24, y: 53 - 19 });
    expect(j.nearLeg.ankle.y).toBeCloseTo(52);
    expect(j.nearLeg.toe.x).toBeCloseTo(28);
    expect(j.neck.y).toBeCloseTo(34 - 12);
  });

  it('arms hang straight down when standing', () => {
    const j = solvePose(standingPose(B), B);
    expect(j.nearArm.hand.y).toBeCloseTo(j.shoulder.y + 13);
    expect(j.nearArm.hand.x).toBeCloseTo(j.shoulder.x);
  });

  it('hip 90 puts the knee directly in front of the hip', () => {
    const p = standingPose(B);
    p.nearLeg.hip = 90;
    const k = solvePose(p, B).nearLeg.knee;
    expect([k.x, k.y]).toEqual([expect.closeTo(33), expect.closeTo(34)]);
  });

  it('knee 90 with hip 0 points the shin backward', () => {
    const p = standingPose(B);
    p.nearLeg.knee = 90;
    const j = solvePose(p, B).nearLeg;
    expect(j.ankle.x).toBeCloseTo(j.knee.x - 9);
  });

  it('positive torso leans the neck forward', () => {
    const p = standingPose(B);
    p.torso = 30;
    expect(solvePose(p, B).neck.x).toBeGreaterThan(24);
  });
});

describe('plantLeg', () => {
  it('puts the ankle on the ground at the requested x', () => {
    const p = standingPose(B);
    p.hipHeight = 15;
    p.x = 1;
    p.nearLeg = plantLeg(B, p.x, p.hipHeight, 5);
    const ankle = solvePose(p, B).nearLeg.ankle;
    expect(ankle.x).toBeCloseTo(24 + 5);
    expect(ankle.y).toBeCloseTo(53 - B.ankleHeight);
  });

  it('bends the knee forward, not backward', () => {
    const p = standingPose(B);
    p.hipHeight = 14;
    p.nearLeg = plantLeg(B, 0, 14, 0);
    const j = solvePose(p, B);
    expect(j.nearLeg.knee.x).toBeGreaterThan(j.hip.x);
  });

  it('straightens the leg when the foot is out of reach', () => {
    expect(plantLeg(B, 0, 30, 0).knee).toBeCloseTo(0);
  });
});

describe('lerpPose and mirrorPose', () => {
  it('lerpPose halfway averages numbers', () => {
    const a = standingPose(B);
    const b = standingPose(B);
    b.nearLeg.hip = 40;
    b.hipHeight = 17;
    const m = lerpPose(a, b, 0.5);
    expect([m.nearLeg.hip, m.hipHeight]).toEqual([20, 18]);
  });

  it('lerpPose takes head facing from the nearer pose', () => {
    const a = standingPose(B);
    const b = standingPose(B);
    b.head.facing = 'front';
    expect(lerpPose(a, b, 0.4).head.facing).toBe('side');
    expect(lerpPose(a, b, 0.6).head.facing).toBe('front');
  });

  it('mirrorPose swaps near and far limbs', () => {
    const p = standingPose(B);
    p.nearLeg.hip = 40;
    p.farArm.shoulder = -30;
    const m = mirrorPose(p);
    expect([m.farLeg.hip, m.nearLeg.hip, m.nearArm.shoulder]).toEqual([40, 0, -30]);
  });
});
