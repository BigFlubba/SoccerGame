import { describe, expect, it } from 'vitest';
import type { MatchSummary } from './economy';
import { newProfile, type Profile } from './profile';
import { applyMatch, localDate } from './progress';

const TODAY = '2026-10-23';
const win30: MatchSummary = { result: 'win', goalsFor: 3, goalsAgainst: 0, styleGoals: [] };
const loss03: MatchSummary = { result: 'lose', goalsFor: 0, goalsAgainst: 3, styleGoals: [] };
const labels = (p: Profile, s: MatchSummary, match: number, today = TODAY) => applyMatch(p, s, match, today).reward.lines.map(l => l.label);

describe('applyMatch', () => {
  it('a first win pays, levels and advances the ladder', () => {
    const { profile, reward } = applyMatch(newProfile(), win30, 1, TODAY);
    expect(reward.lines.map(l => [l.label, l.coins])).toEqual([
      ['WIN', 60],
      ['3 GOALS', 30],
      ['CLEAN SHEET', 20],
      ['FIRST WIN TODAY', 50],
    ]);
    expect(reward.levelBonus).toBe(50);
    expect(reward.coins).toBe(210);
    expect(reward.xp).toBe(110);
    expect(reward.before).toEqual({ coins: 0, level: 1, xp: 0 });
    expect(reward.after).toEqual({ coins: 210, level: 2, xp: 10 });
    expect(reward.ladder).toEqual({ match: 1, beaten: true, champion: false });
    expect(profile).toMatchObject({ coins: 210, level: 2, xp: 10, ladderWins: 1, dailyWinDate: TODAY });
    expect(profile.totals).toEqual({ matches: 1, wins: 1, draws: 0, losses: 0, goalsFor: 3, goalsAgainst: 0, styleGoals: 0, xpEarned: 110 });
  });

  it('counts style goals in the totals', () => {
    const { profile } = applyMatch(newProfile(), { result: 'win', goalsFor: 2, goalsAgainst: 1, styleGoals: ['header', 'chip'] }, 1, TODAY);
    expect(profile.totals.styleGoals).toBe(2);
  });

  it('the daily bonus pays once a day', () => {
    const first = applyMatch(newProfile(), win30, 1, TODAY).profile;
    expect(labels(first, win30, 2)).not.toContain('FIRST WIN TODAY');
    expect(labels(first, win30, 2, '2026-10-24')).toContain('FIRST WIN TODAY');
  });

  it('a draw or a loss pays but does not advance the ladder or use the daily bonus', () => {
    const start = { ...newProfile(), ladderWins: 2 };
    for (const s of [loss03, { result: 'draw', goalsFor: 1, goalsAgainst: 1, styleGoals: [] } as MatchSummary]) {
      const { profile, reward } = applyMatch(start, s, 3, TODAY);
      expect(reward.coins).toBeGreaterThan(0);
      expect(profile.ladderWins).toBe(2);
      expect(reward.ladder).toEqual({ match: 3, beaten: false, champion: false });
      expect(profile.dailyWinDate).toBeNull();
    }
    expect(applyMatch(start, loss03, 3, TODAY).profile.totals).toMatchObject({ matches: 1, losses: 1, goalsAgainst: 3 });
  });

  it('winning match 10 makes him champion, and a rematch win stays at 10', () => {
    const champ = applyMatch({ ...newProfile(), ladderWins: 9 }, win30, 10, TODAY);
    expect(champ.reward.ladder).toEqual({ match: 10, beaten: true, champion: true });
    expect(champ.profile.ladderWins).toBe(10);
    const rematch = applyMatch(champ.profile, win30, 10, TODAY);
    expect(rematch.reward.ladder).toEqual({ match: 10, beaten: false, champion: true });
    expect(rematch.profile.ladderWins).toBe(10);
  });

  it('a win on an already-beaten match does not skip ahead', () => {
    const { profile, reward } = applyMatch({ ...newProfile(), ladderWins: 3 }, win30, 2, TODAY);
    expect(profile.ladderWins).toBe(3);
    expect(reward.ladder.beaten).toBe(false);
  });

  it('several levels at once pay a bonus each', () => {
    const { reward } = applyMatch({ ...newProfile(), xp: 99 }, { result: 'win', goalsFor: 9, goalsAgainst: 0, styleGoals: Array(9).fill('header') }, 1, TODAY);
    // 60 + 90 + 135 + 20 = 305 XP on top of 99: past 100 and 150 more.
    expect(reward.after.level).toBe(3);
    expect(reward.levelBonus).toBe(100);
  });

  it('reaching level 3 announces the Energy Wave once', () => {
    const first = applyMatch({ ...newProfile(), level: 2, xp: 140 }, win30, 1, TODAY);
    expect(first.profile.level).toBe(3);
    expect(first.reward.unlocked).toEqual(['energyWave']);
    expect(applyMatch(first.profile, win30, 2, TODAY).reward.unlocked).toEqual([]);
  });

  it('jumping from level 2 to 6 announces both unlocks and grants Golden Form', () => {
    const { profile, reward } = applyMatch({ ...newProfile(), level: 2, xp: 790 }, win30, 1, TODAY);
    expect(profile.level).toBe(6);
    expect(reward.unlocked).toEqual(['energyWave', 'goldenForm']);
    expect(profile.powerForms).toEqual({ owned: ['golden'], equipped: 'golden' });
  });

  it('owning the move already means no Energy Wave unlock line', () => {
    const owner: Profile = { ...newProfile(), level: 2, xp: 140, powerMoves: { owned: ['energyWave'], equipped: 'energyWave' } };
    expect(applyMatch(owner, win30, 1, TODAY).reward.unlocked).toEqual([]);
  });

  it('applyMatch does not change its input', () => {
    const p = { ...newProfile(), coins: 40 };
    const copy = structuredClone(p);
    applyMatch(p, win30, 1, TODAY);
    expect(p).toEqual(copy);
  });
});

describe('localDate', () => {
  it('localDate is the local calendar date', () => {
    expect(localDate(new Date(2026, 9, 3, 23, 59))).toBe('2026-10-03');
    expect(localDate(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });
});
