import { describe, expect, it } from 'vitest';
import type { GoalRecord, MatchSummary } from './economy';
import { BONUSES, EARLY_GOAL_MINUTE, MAX_STARS, starsFor, type BonusId } from './objectives';

const goal = (over: Partial<GoalRecord> = {}): GoalRecord => ({ minute: 40, kind: 'shot', perfect: false, ...over });
const match = (over: Partial<MatchSummary>): MatchSummary => ({ result: 'win', goalsFor: 1, goalsAgainst: 0, styleGoals: [], goals: [goal()], ...over });

describe('bonuses', () => {
  it('has the eleven spec labels, in the character set', () => {
    const labels = Object.values(BONUSES).map(b => b.label);
    expect(labels).toEqual([
      'SCORE 3 GOALS', 'KEEP A CLEAN SHEET', 'SCORE A HEADER', 'SCORE FROM A CHIP', 'SCORE A VOLLEY', 'SCORE A PERFECT STRIKE',
      'SCORE IN THE FIRST 30 MINUTES', 'WIN BY 3', 'SCORE 2 STYLE GOALS', 'WIN 3-0 OR BETTER', "DON'T LET BISCUIT SCORE",
    ]);
    for (const l of labels) expect(l).toMatch(/^[A-Z0-9 '\-:!?.,/+<>]+$/);
  });

  it('a kind of goal finishes its bonus mid-match', () => {
    const inPlay = (id: BonusId, goals: GoalRecord[]) => BONUSES[id].done({ goalsFor: goals.length, goalsAgainst: 0, goals, result: null });
    expect(inPlay('header', [goal({ kind: 'header' })])).toBe(true);
    expect(inPlay('header', [goal({ kind: 'volley' })])).toBe(false);
    expect(inPlay('chip', [goal({ kind: 'chip' })])).toBe(true);
    expect(inPlay('volley', [goal({ kind: 'volley' })])).toBe(true);
    expect(inPlay('perfect', [goal({ perfect: true })])).toBe(true);
    expect(inPlay('perfect', [goal({ kind: null })])).toBe(false);
    expect(inPlay('score3', [goal(), goal(), goal()])).toBe(true);
    expect(inPlay('score3', [goal(), goal()])).toBe(false);
    expect(inPlay('twoStyle', [goal({ kind: 'header' }), goal({ kind: 'wave' })])).toBe(true);
    expect(inPlay('twoStyle', [goal({ kind: 'header' }), goal()])).toBe(false);
  });

  it('an early goal is before the 30th minute; a golden-goal winner at 90 is not', () => {
    expect(EARLY_GOAL_MINUTE).toBe(30);
    const early = (minute: number) => BONUSES.early.done({ goalsFor: 1, goalsAgainst: 0, goals: [goal({ minute })], result: null });
    expect(early(29)).toBe(true);
    expect(early(30)).toBe(false);
    expect(early(90)).toBe(false);
  });

  it('full-time bonuses wait for the result', () => {
    const live = { goalsFor: 3, goalsAgainst: 0, goals: [goal(), goal(), goal()], result: null };
    for (const id of ['cleanSheet', 'winBy3', 'win3Nil', 'noBossGoals'] as const) {
      expect(BONUSES[id].inPlay).toBe(false);
      expect(BONUSES[id].done(live)).toBe(false);
      expect(BONUSES[id].done({ ...live, result: 'win' })).toBe(true);
    }
    expect(BONUSES.winBy3.done({ goalsFor: 4, goalsAgainst: 2, goals: [], result: 'win' })).toBe(false);
    expect(BONUSES.win3Nil.done({ goalsFor: 3, goalsAgainst: 1, goals: [], result: 'win' })).toBe(false);
    expect(BONUSES.cleanSheet.done({ goalsFor: 0, goalsAgainst: 0, goals: [], result: 'draw' })).toBe(true);
  });

  it('in-play bonuses are the ones a goal can settle', () => {
    const inPlay = Object.values(BONUSES).filter(b => b.inPlay).map(b => b.id);
    expect(inPlay).toEqual(['score3', 'header', 'chip', 'volley', 'perfect', 'early', 'twoStyle']);
  });
});

describe('starsFor', () => {
  it('a win is one star, by two is two, with the bonus is three', () => {
    expect(MAX_STARS).toBe(3);
    expect(starsFor(match({ goalsFor: 1, goalsAgainst: 0 }), 'header')).toBe(1);
    expect(starsFor(match({ goalsFor: 2, goalsAgainst: 0, goals: [goal(), goal()] }), 'header')).toBe(2);
    expect(starsFor(match({ goalsFor: 2, goalsAgainst: 0, goals: [goal({ kind: 'header' }), goal()] }), 'header')).toBe(3);
  });

  it('a one-goal win with the bonus is still one star', () => {
    expect(starsFor(match({ goalsFor: 1, goalsAgainst: 0, goals: [goal({ kind: 'header' })] }), 'header')).toBe(1);
  });

  it('a draw or a loss is no stars, bonus or not', () => {
    expect(starsFor(match({ result: 'draw', goalsFor: 1, goalsAgainst: 1, goals: [goal({ kind: 'header' })] }), 'header')).toBe(0);
    expect(starsFor(match({ result: 'lose', goalsFor: 3, goalsAgainst: 4, goals: [goal(), goal(), goal()] }), 'score3')).toBe(0);
  });
});
