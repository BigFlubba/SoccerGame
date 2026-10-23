import { describe, expect, it } from 'vitest';
import { BASE_STATS, MAX_STAT_LEVEL, MIN_STAT_LEVEL, STAT_NAMES } from '../game/stats';
import { LADDER_STATS, isChampion, maxStats, nextMatch, nextMatchLine, trainingLine } from './ladder';
import { LADDER_MATCHES } from './profile';

describe('the Backyard Ladder', () => {
  it('match 1 is Max as he is today', () => {
    expect(maxStats(1)).toEqual(BASE_STATS);
  });

  it('Max never gets weaker and stays in 1–10', () => {
    expect(LADDER_STATS).toHaveLength(LADDER_MATCHES);
    for (let m = 1; m <= LADDER_MATCHES; m++) {
      for (const k of STAT_NAMES) {
        expect(maxStats(m)[k]).toBeGreaterThanOrEqual(MIN_STAT_LEVEL);
        expect(maxStats(m)[k]).toBeLessThanOrEqual(MAX_STAT_LEVEL);
        if (m > 1) expect(maxStats(m)[k]).toBeGreaterThanOrEqual(maxStats(m - 1)[k]);
      }
    }
  });

  it('the table matches the spec', () => {
    expect(maxStats(3)).toEqual({ speed: 2, power: 2, jump: 1, control: 1 });
    expect(maxStats(7)).toEqual({ speed: 3, power: 3, jump: 2, control: 2 });
    expect(maxStats(10)).toEqual({ speed: 4, power: 4, jump: 2, control: 3 });
  });

  it('maxStats is a copy', () => {
    maxStats(2).speed = 9;
    expect(maxStats(2).speed).toBe(2);
  });

  it('the next match follows wins, and a champion gets match 10', () => {
    expect([0, 3, 9, 10].map(nextMatch)).toEqual([1, 4, 10, 10]);
    expect(isChampion(9)).toBe(false);
    expect(isChampion(10)).toBe(true);
  });

  it('training line names what rose', () => {
    expect(trainingLine(1)).toBeNull();
    expect(trainingLine(2)).toBe('MAX HAS BEEN TRAINING: SPEED UP');
    expect(trainingLine(3)).toBe('MAX HAS BEEN TRAINING: POWER UP');
    expect(trainingLine(7)).toBe('MAX HAS BEEN TRAINING: JUMP UP');
  });

  it('next-match line', () => {
    expect(nextMatchLine(0)).toBe('NEXT: MAX - MATCH 1/10');
    expect(nextMatchLine(2)).toBe('NEXT: MAX - MATCH 3/10');
    expect(nextMatchLine(10)).toBe('CHAMPION! REMATCH: MAX');
  });
});
