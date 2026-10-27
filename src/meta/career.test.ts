import { describe, expect, it } from 'vitest';
import { BACKYARD, BOSS_ID, MATCH_IDS, PARK, PARK_BOSS_ID, TOTAL_STARS, VENUES, allBeaten, careerCardLines, careerStars, grantRungStars, isBeaten, matchById, matchState, nextCareerMatch, rungId, starsAt, stopLabel, venueDone, venueMaxStars, venueOpen, venueStars } from './career';
import { newProfile, type Profile } from './profile';

const p = (ladderWins: number, stars: Record<string, number> = {}): Profile => ({ ...newProfile(), ladderWins, career: { ...newProfile().career, stars } });
const beatBiscuit = (stars: Record<string, number> = {}) => p(10, { [BOSS_ID]: 1, ...stars });

describe('the catalog', () => {
  it('five venues, the Backyard open with ten rungs then the boss', () => {
    expect(VENUES.map(v => v.id)).toEqual(['backyard', 'park', 'school', 'stadium', 'worldCup']);
    expect(VENUES.map(v => v.name)).toEqual(['BACKYARD', 'THE PARK', 'SCHOOL', 'STADIUM', 'WORLD CUP']);
    expect(BACKYARD.matches.map(m => m.id)).toEqual([...Array(10)].map((_, i) => rungId(i + 1)).concat(BOSS_ID));
    expect(BACKYARD.matches[6]).toMatchObject({ kind: 'rung', rung: 7, name: 'MAX', hudName: 'MAX', bonus: 'early' });
    expect(BACKYARD.matches[10]).toMatchObject({ kind: 'boss', rung: 0, name: 'BISCUIT THE DOG', hudName: 'BISCUIT', bonus: 'noBossGoals' });
    expect(VENUES.slice(2).every(v => v.matches.length === 0)).toBe(true);
    expect(matchById('backyard-3')?.bonus).toBe('header');
    expect(BACKYARD.matches.slice(0, 10).every(m => m.opponent === 'max' && m.blurb === null && m.tip === null)).toBe(true);
    expect(matchById(BOSS_ID)).toMatchObject({ opponent: 'biscuit', blurb: "HE CAN'T SHOOT. HE JUST RUNS IT IN." });
    expect(TOTAL_STARS).toBe(93);
  });

  it('the Park: four crew matches, then Speedy Sam', () => {
    expect(PARK.matches.map(m => m.id)).toEqual(['park-1', 'park-2', 'park-3', 'park-4', PARK_BOSS_ID]);
    expect(PARK.matches.map(m => [m.kind, m.rung, m.name, m.hudName, m.opponent, m.bonus])).toEqual([
      ['match', 1, 'BIG BRICK', 'BRICK', 'brick', 'chip'],
      ['match', 2, 'BOOMER LEO', 'LEO', 'leo', 'cleanSheet'],
      ['match', 3, 'TRICKY TIA', 'TIA', 'tia', 'steals3'],
      ['match', 4, 'PESKY PETE', 'PETE', 'pete', 'perfect'],
      ['boss', 0, 'SPEEDY SAM', 'SAM', 'sam', 'noSamGoals'],
    ]);
    expect(PARK.matches.every(m => m.blurb !== null)).toBe(true);
    expect(matchById(PARK_BOSS_ID)?.tip).toBe("TIP: DON'T RACE HIM. MAKE HIM OVERSHOOT");
    expect(matchById(BOSS_ID)?.tip).toBe('TIP: GET BETWEEN HIM AND YOUR GOAL');
    expect(MATCH_IDS).toHaveLength(16);
    expect([venueMaxStars('backyard'), venueMaxStars('park'), venueMaxStars('school')]).toEqual([33, 15, 0]);
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

  it('the next match follows the wins, then the boss, then on into the Park', () => {
    expect(nextCareerMatch(p(0)).id).toBe('backyard-1');
    expect(nextCareerMatch(p(6)).id).toBe('backyard-7');
    expect(nextCareerMatch(p(10)).id).toBe(BOSS_ID);
    expect(nextCareerMatch(p(10, { [BOSS_ID]: 2 })).id).toBe('park-1');
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

  it('the venue is done once the boss falls', () => {
    expect(venueDone(p(10), 'backyard')).toBe(false);
    expect(allBeaten(p(10))).toBe(false);
    expect(venueDone(p(10, { [BOSS_ID]: 1 }), 'backyard')).toBe(true);
  });

  it('allBeaten counts the open venues only: beating Biscuit opens the Park', () => {
    expect(allBeaten(beatBiscuit())).toBe(false);
    const all = beatBiscuit({ 'park-1': 1, 'park-2': 1, 'park-3': 1, 'park-4': 1, [PARK_BOSS_ID]: 1 });
    expect(allBeaten(all)).toBe(true);
  });

  it('stop labels: stars for the Backyard, LOCKED elsewhere', () => {
    expect(stopLabel(p(6, { 'backyard-1': 1 }), 'backyard')).toBe('1/33');
    expect(stopLabel(p(6), 'park')).toBe('LOCKED');
    expect(stopLabel(p(10, { [BOSS_ID]: 1 }), 'school')).toBe('LOCKED');
  });

  it('the Park opens when Biscuit is beaten, its matches in order', () => {
    expect(venueOpen(p(10), 'backyard')).toBe(true);
    expect(venueOpen(p(10), 'park')).toBe(false);
    expect(venueOpen(beatBiscuit(), 'park')).toBe(true);
    expect(venueOpen(beatBiscuit(), 'school')).toBe(false);
    expect(nextCareerMatch(beatBiscuit()).id).toBe('park-1');
    expect(matchState(beatBiscuit(), matchById('park-1')!)).toBe('next');
    expect(matchState(beatBiscuit(), matchById('park-2')!)).toBe('locked');
    expect(matchState(p(10), matchById('park-1')!)).toBe('locked');
    const three = beatBiscuit({ 'park-1': 1, 'park-2': 2, 'park-3': 1 });
    expect(nextCareerMatch(three).id).toBe('park-4');
    expect(matchState(three, matchById(PARK_BOSS_ID)!)).toBe('locked');
    const four = beatBiscuit({ 'park-1': 1, 'park-2': 1, 'park-3': 1, 'park-4': 1 });
    expect(matchState(four, matchById(PARK_BOSS_ID)!)).toBe('next');
    const done = { ...four.career.stars, [PARK_BOSS_ID]: 1 };
    expect(nextCareerMatch(p(10, done)).id).toBe(PARK_BOSS_ID);
    expect(matchState(p(10, done), matchById(PARK_BOSS_ID)!)).toBe('beaten');
  });

  it('a Park match is beaten by its stars, never by ladder wins', () => {
    expect(isBeaten(p(10), matchById('park-1')!)).toBe(false);
    expect(isBeaten(beatBiscuit({ 'park-1': 1 }), matchById('park-1')!)).toBe(true);
  });

  it('stops: the Park shows its stars once open; School says COMING SOON after Sam', () => {
    expect(stopLabel(p(10), 'park')).toBe('LOCKED');
    expect(stopLabel(beatBiscuit(), 'park')).toBe('0/15');
    expect(stopLabel(beatBiscuit({ 'park-1': 3 }), 'park')).toBe('3/15');
    expect(stopLabel(beatBiscuit(), 'school')).toBe('LOCKED');
    expect(stopLabel(beatBiscuit({ [PARK_BOSS_ID]: 1 }), 'school')).toBe('COMING SOON');
    expect(stopLabel(beatBiscuit({ [PARK_BOSS_ID]: 1 }), 'stadium')).toBe('LOCKED');
  });

  it('grantRungStars adds one star per won rung and keeps better ones', () => {
    const before = { ...newProfile(), ladderWins: 3, career: { stars: { 'backyard-2': 2 }, milestonesPaid: 0, lossStreaks: {} } };
    const after = grantRungStars(before);
    expect(after.career.stars).toEqual({ 'backyard-1': 1, 'backyard-2': 2, 'backyard-3': 1 });
    expect(before.career.stars).toEqual({ 'backyard-2': 2 });
  });

  it('the Hub card lines', () => {
    expect(careerCardLines(p(6))).toEqual({ first: 'NEXT: MAX - MATCH 7/10', second: 'MAX HAS BEEN TRAINING: JUMP UP' });
    expect(careerCardLines(p(0))).toEqual({ first: 'NEXT: MAX - MATCH 1/10', second: null });
    expect(careerCardLines(p(10))).toEqual({ first: 'NEXT: BISCUIT THE DOG', second: 'BACKYARD BOSS!' });
  });

  it('the Hub card follows him into the Park', () => {
    expect(careerCardLines(beatBiscuit())).toEqual({ first: 'NEXT: BIG BRICK - THE PARK 1/4', second: 'HE NEVER DIVES IN.' });
    const four = beatBiscuit({ 'park-1': 1, 'park-2': 1, 'park-3': 1, 'park-4': 1 });
    expect(careerCardLines(four)).toEqual({ first: 'NEXT: SPEEDY SAM', second: 'THE PARK BOSS!' });
    expect(careerCardLines(p(10, { ...four.career.stars, [PARK_BOSS_ID]: 2 }))).toEqual({ first: 'THE PARK DONE! STARS 6/15', second: 'SCHOOL: COMING SOON' });
  });
});
