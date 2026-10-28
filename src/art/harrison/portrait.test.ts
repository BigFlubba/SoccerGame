import { describe, expect, it } from 'vitest';
import { C } from '../colors';
import { PORTRAIT_FACE_BOX, harrisonPortrait } from './portrait';

const ALL = ['neutral', 'celebrate', 'determined', 'disappointed'] as const;

describe('harrisonPortrait', () => {
  it.each(ALL)('%s portrait is 64×64', e => {
    const p = harrisonPortrait(e);
    expect([p.width, p.height]).toEqual([64, 64]);
  });

  it.each(ALL)('%s portrait uses at most 20 colours', e => {
    expect(new Set(harrisonPortrait(e).data).size - 1).toBeLessThanOrEqual(20);
  });

  it.each(['celebrate', 'determined', 'disappointed'] as const)('%s differs from neutral only inside the face box', e => {
    const n = harrisonPortrait('neutral');
    const p = harrisonPortrait(e);
    const B = PORTRAIT_FACE_BOX;
    let changed = 0;
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        if (n.get(x, y) === p.get(x, y)) continue;
        changed++;
        expect(x >= B.x && x < B.x + B.w && y >= B.y && y < B.y + B.h, `(${x},${y})`).toBe(true);
      }
    }
    expect(changed).toBeGreaterThan(0);
  });

  it('returns a fresh image each call', () => {
    const a = harrisonPortrait('neutral');
    a.set(0, 0, 1);
    expect(harrisonPortrait('neutral').get(0, 0)).toBe(0);
  });

  it.each(ALL)('no extras: %s unchanged', e => {
    expect(harrisonPortrait(e, { glasses: false, headband: false }).data).toEqual(harrisonPortrait(e).data);
  });

  it('glasses: a glint on each lens', () => {
    const p = harrisonPortrait('neutral', { glasses: true, headband: false });
    expect([p.get(27, 25), p.get(36, 25)]).toEqual([C.GlassesGlint, C.GlassesGlint]);
  });

  it('glasses go on after the expression', () => {
    expect(harrisonPortrait('celebrate', { glasses: true, headband: false }).get(21, 23)).toBe(C.GlassesRim);
  });

  it('the headband crosses the crown', () => {
    const p = harrisonPortrait('neutral', { glasses: false, headband: true });
    expect([p.get(17, 11), p.get(18, 11)]).toEqual([C.TrimShadow, C.Trim]);
    for (let x = 16; x <= 51; x++) expect(p.get(x, 13), `x ${x}`).toBe(C.TrimShadow);
  });
});
