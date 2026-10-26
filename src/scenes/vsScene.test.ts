import { describe, expect, it } from 'vitest';
import { BOSS_ID, matchById } from '../meta/career';
import { newProfile } from '../meta/profile';
import { createHubScene } from './hubScene';
import type { MatchScene } from './matchScene';
import { testContext } from './testContext';
import { frame } from './testInput';
import { VS_AUTO_S, createVsScene, vsLines } from './vsScene';

const STEP = 1 / 60;
const CHARSET = /^[A-Z0-9 '\-:!?.,/+<>]+$/;

describe('the VS card', () => {
  it('names the match and its bonus', () => {
    expect(vsLines(matchById('backyard-7')!, newProfile())).toEqual(['MATCH 7', 'HARRISON VS MAX', 'BONUS: SCORE IN THE FIRST 30 MINUTES']);
    expect(vsLines(matchById(BOSS_ID)!, newProfile())).toEqual(['BACKYARD BOSS', 'HARRISON VS BISCUIT THE DOG', "BONUS: DON'T LET BISCUIT SCORE"]);
    for (const l of vsLines(matchById(BOSS_ID)!, newProfile())) expect(l).toMatch(CHARSET);
  });

  it('kicks off on A, X or Start, with the confirm blip', () => {
    for (const press of [['confirm'], ['shoot'], ['pause']] as const) {
      const ctx = testContext();
      const s = createVsScene(ctx, matchById('backyard-2')!, () => createHubScene(ctx));
      expect(s.lines).toEqual(vsLines(matchById('backyard-2')!, ctx.profile));
      const next = s.update(frame(press), STEP) as MatchScene;
      expect(next.kind).toBe('match');
      expect(next.match.id).toBe('backyard-2');
      expect(ctx.audio.played).toContain('menuConfirm');
    }
  });

  it('kicks off by itself after VS_AUTO_S', () => {
    const s = createVsScene(testContext(), matchById('backyard-2')!, () => createHubScene(testContext()));
    let next = null;
    for (let i = 0; i < Math.round(VS_AUTO_S / STEP) - 1; i++) next = s.update(frame(), STEP) ?? next;
    expect(next).toBeNull();
    expect(s.update(frame(), STEP)?.kind).toBe('match');
  });

  it('B or Esc goes back', () => {
    for (const press of [['back'], ['pause', 'back']] as const) {
      const ctx = testContext();
      const s = createVsScene(ctx, matchById('backyard-2')!, () => createHubScene(ctx));
      expect(s.update(frame(press), STEP)?.kind).toBe('hub');
      expect(ctx.audio.played).toContain('menuBack');
    }
  });
});
