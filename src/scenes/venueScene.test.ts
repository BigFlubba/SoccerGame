import { describe, expect, it } from 'vitest';
import { BOSS_ID, matchById } from '../meta/career';
import { newProfile } from '../meta/profile';
import { testContext } from './testContext';
import { frame } from './testInput';
import { createVenueScene, panelLines, type VenueScene } from './venueScene';
import type { VsScene } from './vsScene';

const STEP = 1 / 60;
const CHARSET = /^[A-Z0-9 '\-:!?.,/+<>]+$/;

describe('the venue screen', () => {
  const ctx6 = () => testContext({ profile: { ...newProfile(), ladderWins: 6 } });

  it('opens on the next match, and left/right move along the rungs and the boss, wrapping', () => {
    const ctx = ctx6();
    const s = createVenueScene(ctx, 'backyard');
    expect(s.kind).toBe('venue');
    expect(s.venue).toBe('backyard');
    expect(s.cursor.id).toBe('backyard-7');
    s.update(frame(['right']), STEP);
    expect(s.cursor.id).toBe('backyard-8');
    expect(ctx.audio.played).toContain('menuMove');
    for (let i = 0; i < 3; i++) s.update(frame(['right']), STEP);
    expect(s.cursor.id).toBe('backyard-boss');
    s.update(frame(['right']), STEP);
    expect(s.cursor.id).toBe('backyard-1');
    s.update(frame(['left']), STEP);
    expect(s.cursor.id).toBe('backyard-boss');
  });

  it('A plays a beaten or next match through the VS card; a locked one only blips', () => {
    const ctx = ctx6();
    const s = createVenueScene(ctx, 'backyard', 'backyard-2');
    expect((s.update(frame(['confirm']), STEP) as VsScene).match.id).toBe('backyard-2');
    expect(ctx.audio.played).toContain('menuConfirm');
    const next = createVenueScene(ctx6(), 'backyard', 'backyard-7');
    expect((next.update(frame(['pause']), STEP) as VsScene).match.id).toBe('backyard-7');
    const locked = createVenueScene(ctx6(), 'backyard', 'backyard-9');
    expect(locked.update(frame(['confirm']), STEP)).toBeNull();
    expect(locked.update(frame(['pause']), STEP)).toBeNull();
  });

  it('the boss before rung 10 takes the cursor but A only blips', () => {
    const ctx = ctx6();
    const s = createVenueScene(ctx, 'backyard', 'backyard-boss');
    expect(s.cursor.id).toBe('backyard-boss');
    expect(s.update(frame(['confirm']), STEP)).toBeNull();
    expect(ctx.audio.played).toContain('nope');
    expect(ctx.audio.played).not.toContain('menuConfirm');
  });

  it('a champion opens on the boss and can play him', () => {
    const s = createVenueScene(testContext({ profile: { ...newProfile(), ladderWins: 10 } }), 'backyard');
    expect(s.cursor.id).toBe('backyard-boss');
    expect(s.update(frame(['confirm']), STEP)?.kind).toBe('vs');
  });

  it('B on the VS card comes back here on the same match', () => {
    const s = createVenueScene(ctx6(), 'backyard', 'backyard-2');
    const vs = s.update(frame(['confirm']), STEP)!;
    const back = vs.update(frame(['back']), STEP) as VenueScene;
    expect(back.kind).toBe('venue');
    expect(back.cursor.id).toBe('backyard-2');
  });

  it('the panel lines', () => {
    expect(panelLines(matchById('backyard-7')!)).toEqual(['MATCH 7 - MAX', 'MAX HAS BEEN TRAINING: JUMP UP', 'BONUS: SCORE IN THE FIRST 30 MINUTES']);
    expect(panelLines(matchById('backyard-1')!)).toEqual(['MATCH 1 - MAX', 'BONUS: SCORE 3 GOALS']);
    expect(panelLines(matchById(BOSS_ID)!)).toEqual(['BISCUIT THE DOG', "HE CAN'T SHOOT. HE JUST RUNS IT IN.", "BONUS: DON'T LET BISCUIT SCORE"]);
    for (const l of panelLines(matchById(BOSS_ID)!)) expect(l).toMatch(CHARSET);
  });

  it('an unknown cursor id opens on the next match', () => {
    expect(createVenueScene(ctx6(), 'backyard', 'park-1').cursor.id).toBe('backyard-7');
  });

  it('B or Esc leaves the venue with the back blip', () => {
    for (const press of [['back'], ['pause', 'back']] as const) {
      const ctx = ctx6();
      expect(createVenueScene(ctx, 'backyard').update(frame(press), STEP)?.kind).toBe('hub');
      expect(ctx.audio.played).toContain('menuBack');
    }
  });
});
