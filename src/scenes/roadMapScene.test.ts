import { describe, expect, it } from 'vitest';
import { BOSS_ID } from '../meta/career';
import { newProfile } from '../meta/profile';
import { STOPS, createRoadMapScene } from './roadMapScene';
import { testContext } from './testContext';
import { frame } from './testInput';
import { createVenueScene, type VenueScene } from './venueScene';

const STEP = 1 / 60;

describe('the road map', () => {
  it('opens on the Backyard and A enters it', () => {
    const ctx = testContext();
    const s = createRoadMapScene(ctx);
    expect(s.kind).toBe('roadMap');
    expect(s.index).toBe(0);
    expect(s.update(frame(['confirm']), STEP)?.kind).toBe('venue');
    expect(ctx.audio.played).toContain('menuConfirm');
  });

  it('Start enters too', () => {
    expect(createRoadMapScene(testContext()).update(frame(['pause']), STEP)?.kind).toBe('venue');
  });

  it('left/right move among five stops without wrapping; a locked stop only blips', () => {
    const ctx = testContext();
    const s = createRoadMapScene(ctx);
    s.update(frame(['left']), STEP);
    expect(s.index).toBe(0);
    expect(ctx.audio.played).not.toContain('menuMove');
    for (let i = 0; i < 6; i++) s.update(frame(['right']), STEP);
    expect(s.index).toBe(4);
    expect(ctx.audio.played.filter(c => c === 'menuMove')).toHaveLength(4);
    expect(s.update(frame(['confirm']), STEP)).toBeNull();
    expect(ctx.audio.played).toContain('nope');
    expect(STOPS).toHaveLength(5);
  });

  it('the Park blips until Biscuit is beaten, then A enters it', () => {
    const before = testContext({ profile: { ...newProfile(), ladderWins: 10 } });
    expect(createRoadMapScene(before, 1).update(frame(['confirm']), STEP)).toBeNull();
    expect(before.audio.played).toContain('nope');
    const ctx = testContext({ profile: { ...newProfile(), ladderWins: 10, career: { stars: { [BOSS_ID]: 1 }, milestonesPaid: 0, lossStreaks: {} } } });
    const s = createRoadMapScene(ctx, 1);
    expect(s.index).toBe(1);
    const park = s.update(frame(['confirm']), STEP) as VenueScene;
    expect(park.kind).toBe('venue');
    expect(park.venue).toBe('park');
  });

  it('B goes to the Hub on CAREER', () => {
    const ctx = testContext();
    const hub = createRoadMapScene(ctx).update(frame(['back']), STEP)!;
    expect(hub.kind).toBe('hub');
    expect(ctx.audio.played).toContain('menuBack');
    expect(hub.update(frame(['confirm']), STEP)?.kind).toBe('roadMap');
  });

  it('turns the match crowd off and plays the title theme, as the Hub does', () => {
    const ctx = testContext();
    ctx.audio.crowd = 'match';
    ctx.audio.music = null;
    createRoadMapScene(ctx);
    expect(ctx.audio.crowd).toBe('off');
    expect(ctx.audio.music).toBe('title');
  });

  it('B on the venue screen comes back to the map', () => {
    expect(createVenueScene(testContext(), 'backyard').update(frame(['back']), STEP)?.kind).toBe('roadMap');
  });
});
