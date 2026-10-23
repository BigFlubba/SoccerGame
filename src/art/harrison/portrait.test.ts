import { describe, expect, it } from 'vitest';
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
});
