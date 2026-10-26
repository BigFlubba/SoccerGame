import { describe, expect, it } from 'vitest';
import { BACKYARD, BOSS_ID, MATCH_IDS, TOTAL_STARS, VENUES, VENUE_STARS, allBeaten, careerCardLines, careerStars, isBeaten, matchById, matchState, nextCareerMatch, rungId, starsAt, stopLabel, venueDone, venueStars } from './career';

const p = (ladderWins: number, stars: Record<string, number> = {}) => ({ ladderWins, career: { stars } });

describe('the catalog', () => {
  it('five venues, the Backyard open with ten rungs then the boss', () => {
    expect(VENUES.map(v => v.id)).toEqual(['backyard', 'park', 'school', 'stadium', 'worldCup']);
    expect(VENUES.map(v => v.name)).toEqual(['BACKYARD', 'THE PARK', 'SCHOOL', 'STADIUM', 'WORLD CUP']);
    expect(BACKYARD.matches.map(m => m.id)).toEqual([...Array(10)].map((_, i) => rungId(i + 1)).concat(BOSS_ID));
    expect(BACKYARD.matches[6]).toMatchObject({ kind: 'rung', rung: 7, name: 'MAX', hudName: 'MAX', bonus: 'early' });
    expect(BACKYARD.matches[10]).toMatchObject({ kind: 'boss', rung: 0, name: 'BISCUIT THE DOG', hudName: 'BISCUIT', bonus: 'noBossGoals' });
    expect(VENUES.slice(1).every(v => v.matches.length === 0)).toBe(true);
    expect(MATCH_IDS).toHaveLength(11);
    expect(matchById('backyard-3')?.bonus).toBe('header');
    expect(matchById('park-1')).toBeUndefined();
    expect(TOTAL_STARS).toBe(93);
    expect(VENUE_STARS).toBe(33);
  });

  it('bonuses run in the spec order', () => {
    expect(BACKYARD.matches.slice(0, 10).map(m => m.bonus)).toEqual(['score3', 'cleanSheet', 'header', 'chip', 'volley', 'perfect', 'early', 'winBy3', 'twoStyle', 'win3Nil']);
  });
});

describe('progress', () => {
  it('rungs are beaten by ladder wins, the boss by its star', () => {
    expect(isBeaten(p(4), matchById('backyard-4')!)).toBe(true);
    expect(isBeaten(p(4), matchById('backyard-5')!)).toBe(false);
    expect(isBeaten(p(10), matchById(BOSS_ID)!)).toBe(false);
    expect(isBeaten(p(10, { [BOSS_ID]: 1 }), matchById(BOSS_ID)!)).toBe(true);
  });

  it('the next match follows the wins, then the boss, then the boss again as a replay', () => {
    expect(nextCareerMatch(p(0)).id).toBe('backyard-1');
    expect(nextCareerMatch(p(6)).id).toBe('backyard-7');
    expect(nextCareerMatch(p(10)).id).toBe(BOSS_ID);
    expect(nextCareerMatch(p(10, { [BOSS_ID]: 2 })).id).toBe(BOSS_ID);
  });

  it('states: beaten, next, locked; the boss is locked until rung 10', () => {
    const at6 = p(6);
    expect(matchState(at6, matchById('backyard-6')!)).toBe('beaten');
    expect(matchState(at6, matchById('backyard-7')!)).toBe('next');
    expect(matchState(at6, matchById('backyard-8')!)).toBe('locked');
    expect(matchState(at6, matchById(BOSS_ID)!)).toBe('locked');
    expect(matchState(p(10), matchById(BOSS_ID)!)).toBe('next');
    expect(matchState(p(10, { [BOSS_ID]: 1 }), matchById(BOSS_ID)!)).toBe('beaten');
  });

  it('stars add up per venue and overall, missing ones as 0', () => {
    const s = p(6, { 'backyard-1': 1, 'backyard-5': 3, 'backyard-6': 2 });
    expect(starsAt(s, 'backyard-2')).toBe(0);
    expect(venueStars(s, 'backyard')).toBe(6);
    expect(venueStars(s, 'park')).toBe(0);
    expect(careerStars(s)).toBe(6);
  });

  it('the venue is done, and everything beaten, once the boss falls', () => {
    expect(venueDone(p(10), 'backyard')).toBe(false);
    expect(allBeaten(p(10))).toBe(false);
    expect(venueDone(p(10, { [BOSS_ID]: 1 }), 'backyard')).toBe(true);
    expect(allBeaten(p(10, { [BOSS_ID]: 1 }))).toBe(true);
  });

  it('stop labels: stars for the Backyard, LOCKED elsewhere, COMING SOON for the Park after Biscuit', () => {
    expect(stopLabel(p(6, { 'backyard-1': 1 }), 'backyard')).toBe('1/33');
    expect(stopLabel(p(6), 'park')).toBe('LOCKED');
    expect(stopLabel(p(10, { [BOSS_ID]: 1 }), 'park')).toBe('COMING SOON');
    expect(stopLabel(p(10, { [BOSS_ID]: 1 }), 'school')).toBe('LOCKED');
  });

  it('the Hub card lines', () => {
    expect(careerCardLines(p(6))).toEqual({ first: 'NEXT: MAX - MATCH 7/10', second: 'MAX HAS BEEN TRAINING: JUMP UP' });
    expect(careerCardLines(p(0))).toEqual({ first: 'NEXT: MAX - MATCH 1/10', second: null });
    expect(careerCardLines(p(10))).toEqual({ first: 'NEXT: BISCUIT THE DOG', second: 'BACKYARD BOSS!' });
    expect(careerCardLines(p(10, { [BOSS_ID]: 3, 'backyard-1': 1 }))).toEqual({ first: 'BACKYARD DONE! STARS 4/33', second: 'THE PARK: COMING SOON' });
  });
});
