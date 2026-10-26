import { describe, expect, it } from 'vitest';
import { STAT_NAMES } from '../game/stats';
import { STAT_INFO, addXp, buyStat, canUpgrade, cheapestUpgrade, matchLines, matchXp, statPrice, xpToNext, type MatchSummary } from './economy';
import { newProfile } from './profile';

const pairs = (s: MatchSummary, dailyWin = false) => matchLines(s, dailyWin).map(l => [l.label, l.coins]);

describe('match rewards', () => {
  it('a 3-1 win with a header and a chip', () => {
    expect(pairs({ result: 'win', goalsFor: 3, goalsAgainst: 1, styleGoals: ['chip', 'header'] })).toEqual([
      ['WIN', 60],
      ['3 GOALS', 30],
      ['HEADER', 15],
      ['CHIP', 15],
    ]);
  });

  it('a 0-0 draw keeps a clean sheet', () => {
    expect(pairs({ result: 'draw', goalsFor: 0, goalsAgainst: 0, styleGoals: [] })).toEqual([
      ['DRAW', 30],
      ['CLEAN SHEET', 20],
    ]);
  });

  it('a hat-trick of headers groups them', () => {
    expect(pairs({ result: 'win', goalsFor: 3, goalsAgainst: 2, styleGoals: ['header', 'header', 'header'] })).toEqual([
      ['WIN', 60],
      ['3 GOALS', 30],
      ['3 HEADERS', 45],
    ]);
  });

  it('one goal is a GOAL, and volleys come between headers and chips', () => {
    expect(pairs({ result: 'lose', goalsFor: 1, goalsAgainst: 2, styleGoals: ['chip', 'volley', 'volley'] })).toEqual([
      ['LOSS', 15],
      ['1 GOAL', 10],
      ['2 VOLLEYS', 30],
      ['CHIP', 15],
    ]);
  });

  it('an Energy Wave goal is a style line worth 15', () => {
    expect(pairs({ result: 'win', goalsFor: 2, goalsAgainst: 1, styleGoals: ['wave', 'chip'] })).toEqual([
      ['WIN', 60],
      ['2 GOALS', 20],
      ['CHIP', 15],
      ['ENERGY WAVE', 15],
    ]);
  });

  it('a loss with no goals still pays', () => {
    expect(pairs({ result: 'lose', goalsFor: 0, goalsAgainst: 3, styleGoals: [] })).toEqual([['LOSS', 15]]);
  });

  it('the daily bonus pays coins but no XP', () => {
    const lines = matchLines({ result: 'win', goalsFor: 1, goalsAgainst: 0, styleGoals: [] }, true);
    expect(lines.map(l => [l.label, l.coins]).at(-1)).toEqual(['FIRST WIN TODAY', 50]);
    expect(matchXp(lines)).toBe(60 + 10 + 20);
  });
});

describe('levels', () => {
  it('XP to the next level climbs by 50', () => {
    expect(xpToNext(1)).toBe(100);
    expect(xpToNext(2)).toBe(150);
    expect(xpToNext(9)).toBe(500);
  });

  it('addXp carries over and can gain several levels', () => {
    expect(addXp(1, 90, 20)).toEqual({ level: 2, xp: 10, levelsGained: 1 });
    expect(addXp(1, 0, 260)).toEqual({ level: 3, xp: 10, levelsGained: 2 });
    expect(addXp(4, 10, 5)).toEqual({ level: 4, xp: 15, levelsGained: 0 });
  });

  it('exactly enough XP levels up with none left over', () => {
    expect(addXp(1, 0, 100)).toEqual({ level: 2, xp: 0, levelsGained: 1 });
  });
});

describe('the shop', () => {
  it('prices match the spec table', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map(statPrice)).toEqual([150, 205, 275, 370, 500, 675, 910, 1225, 1655]);
    expect(statPrice(10)).toBeNull();
  });

  it('buying spends coins and raises one stat', () => {
    const p = { ...newProfile(), coins: 150 };
    const after = buyStat(p, 'speed')!;
    expect(after.stats).toEqual({ speed: 2, power: 1, jump: 1, control: 1 });
    expect(after.coins).toBe(0);
  });

  it('cannot buy short of coins or past level 10', () => {
    const poor = { ...newProfile(), coins: 149 };
    expect(buyStat(poor, 'speed')).toBeNull();
    const maxed = { ...newProfile(), coins: 99999, stats: { speed: 10, power: 1, jump: 1, control: 1 } };
    expect(buyStat(maxed, 'speed')).toBeNull();
    expect(poor).toEqual({ ...newProfile(), coins: 149 });
    expect(maxed.stats.speed).toBe(10);
  });

  it('buying never changes the profile it was given', () => {
    const p = { ...newProfile(), coins: 500 };
    buyStat(p, 'jump');
    expect(p).toEqual({ ...newProfile(), coins: 500 });
  });

  it('canUpgrade when he can afford any stat that is not maxed', () => {
    expect(canUpgrade({ ...newProfile(), coins: 150 })).toBe(true);
    expect(canUpgrade({ ...newProfile(), coins: 149 })).toBe(false);
    expect(canUpgrade({ ...newProfile(), coins: 99999, stats: { speed: 10, power: 10, jump: 10, control: 10 } })).toBe(false);
  });

  it('the Energy Wave counts as an upgrade only when unlocked and affordable', () => {
    const maxed = { ...newProfile(), stats: { speed: 10, power: 10, jump: 10, control: 10 } };
    expect(canUpgrade({ ...maxed, level: 2, coins: 600 })).toBe(false);
    expect(canUpgrade({ ...maxed, level: 3, coins: 599 })).toBe(false);
    expect(canUpgrade({ ...maxed, level: 3, coins: 600 })).toBe(true);
    expect(canUpgrade({ ...maxed, level: 3, coins: 600, powerMoves: { owned: ['energyWave'], equipped: 'energyWave' } })).toBe(false);
  });

  it('cheapestUpgrade ignores maxed stats', () => {
    expect(cheapestUpgrade(newProfile())).toBe(150);
    expect(cheapestUpgrade({ ...newProfile(), stats: { speed: 10, power: 3, jump: 10, control: 2 } })).toBe(205);
    expect(cheapestUpgrade({ ...newProfile(), stats: { speed: 10, power: 10, jump: 10, control: 10 } })).toBeNull();
  });

  it('every stat has a label and a blurb in the font', () => {
    for (const k of STAT_NAMES) {
      expect(STAT_INFO[k].label).toMatch(/^[A-Z]+$/);
      expect(STAT_INFO[k].blurb).toMatch(/^[A-Z0-9 ',\-:!?./+<>]+$/);
    }
    expect(STAT_INFO.speed).toEqual({ label: 'SPEED', blurb: 'RUN AND SPRINT FASTER' });
  });
});
