import { describe, expect, it } from 'vitest';
import { matchById, nextCareerMatch, type CareerMatch } from '../meta/career';
import type { MatchSummary } from '../meta/economy';
import { nextMatch } from '../meta/ladder';
import { newProfile, type Profile } from '../meta/profile';
import { applyMatch } from '../meta/progress';
import type { MatchScene } from './matchScene';
import { LINE_S, SKIP_GRACE_S, XP_FILL_S, createResultsScene, footLines, ladderLine, resultsItems, tallyAt, unlockLines, type ResultsScene } from './resultsScene';
import type { ShopScene } from './shopScene';
import { TEST_TODAY, testContext } from './testContext';
import { frame } from './testInput';

const STEP = 1 / 60;
const WIN_3_0: MatchSummary = { result: 'win', goalsFor: 3, goalsAgainst: 0, styleGoals: [], goals: [] };
const LOSS_0_2: MatchSummary = { result: 'lose', goalsFor: 0, goalsAgainst: 2, styleGoals: [], goals: [] };

/** A context whose profile has had `s` applied, as the match scene leaves it, and the reward for it. */
function after(s: MatchSummary, from: Profile = newProfile(), match: CareerMatch = nextCareerMatch(from)) {
  const { profile, reward } = applyMatch(from, s, match, TEST_TODAY);
  return { ctx: testContext({ profile }), reward };
}

function run(s: ResultsScene, seconds: number, held: Parameters<typeof frame>[1] = []) {
  let last = null;
  for (let i = 0; i < Math.round(seconds / STEP); i++) last = s.update(frame([], held), STEP) ?? last;
  return last;
}

describe('the tally', () => {
  it('shows a line every LINE_S, then the total, the XP and the level-up', () => {
    const { reward } = after(WIN_3_0);
    const n = reward.lines.length;
    expect(tallyAt(reward, LINE_S - 0.01).lines).toBe(0);
    expect(tallyAt(reward, LINE_S + 0.01).lines).toBe(1);
    expect(tallyAt(reward, n * LINE_S + 0.01)).toMatchObject({ lines: n, total: false });
    expect(tallyAt(reward, (n + 1) * LINE_S + 0.01)).toMatchObject({ total: true, xpDone: false, levelUp: false });
    const xpEnd = (n + 1) * LINE_S + XP_FILL_S;
    expect(tallyAt(reward, xpEnd + 0.01)).toMatchObject({ xpDone: true, levelUp: true, done: false });
    expect(tallyAt(reward, xpEnd + LINE_S + 0.01).done).toBe(true);
  });

  it('takes about 3 s', () => {
    const { reward } = after(WIN_3_0);
    expect(tallyAt(reward, 2.4).done).toBe(false);
    expect(tallyAt(reward, 3.2).done).toBe(true);
  });

  it('without a level-up there is no level-up beat', () => {
    const { reward } = after(LOSS_0_2);
    expect(tallyAt(reward, 99)).toMatchObject({ done: true, levelUp: false });
  });
});

describe('results screen', () => {
  it('opening Results plays the result jingle', () => {
    for (const s of [WIN_3_0, LOSS_0_2]) {
      const { ctx, reward } = after(s);
      createResultsScene(ctx, reward);
      expect(ctx.audio.music).toBe(s.result);
    }
  });

  it('the tally shows a line every LINE_S with a coin tick', () => {
    const { ctx, reward } = after(WIN_3_0);
    const s = createResultsScene(ctx, reward);
    run(s, LINE_S * 2 + 0.05);
    expect(tallyAt(reward, LINE_S * 2 + 0.05).lines).toBe(2);
    expect(ctx.audio.played.filter(c => c === 'coin')).toHaveLength(2);
  });

  it('a level-up plays the fanfare once', () => {
    const { ctx, reward } = after(WIN_3_0);
    const s = createResultsScene(ctx, reward);
    run(s, 5);
    expect(s.tallyDone).toBe(true);
    expect(ctx.audio.played.filter(c => c === 'levelUp')).toHaveLength(1);
    expect(ctx.audio.played.filter(c => c === 'coin')).toHaveLength(reward.lines.length + 1);
  });

  it('a fresh A skips to the end without choosing', () => {
    const { ctx, reward } = after(WIN_3_0);
    const s = createResultsScene(ctx, reward);
    run(s, 0.1);
    expect(s.update(frame(['confirm']), STEP)).toBeNull();
    expect(s.tallyDone).toBe(true);
    expect(s.menu).not.toBeNull();
    expect(s.menu!.index).toBe(0);
    expect(ctx.audio.played.filter(c => c === 'levelUp')).toHaveLength(1);
  });

  it('X and Enter skip too', () => {
    for (const pressed of [['shoot'], ['pause', 'confirm']] as const) {
      const { ctx, reward } = after(WIN_3_0);
      const s = createResultsScene(ctx, reward);
      expect(s.update(frame(pressed), STEP)).toBeNull();
      expect(s.tallyDone).toBe(true);
    }
  });

  it('held buttons do not skip', () => {
    const { ctx, reward } = after(WIN_3_0);
    const s = createResultsScene(ctx, reward);
    run(s, 1, ['shoot']);
    run(s, 0.5, ['confirm']);
    expect(s.tallyDone).toBe(tallyAt(reward, 1.5).done);
    expect(s.tallyDone).toBe(false);
  });

  it('NEXT MATCH plays the next ladder match', () => {
    const { ctx, reward } = after(WIN_3_0);
    const s = createResultsScene(ctx, reward);
    run(s, 5);
    expect(s.menu!.items).toEqual(['NEXT MATCH', 'SHOP', 'HUB']);
    const next = s.update(frame(['confirm']), STEP) as MatchScene;
    expect(next.kind).toBe('match');
    expect(next.match.rung).toBe(nextMatch(ctx.profile.ladderWins));
    expect(next.match.id).toBe('backyard-2');
    expect(ctx.savedProfiles).toHaveLength(0);
  });

  it('a loss offers TRY AGAIN, which replays the same match', () => {
    const { ctx, reward } = after(LOSS_0_2, { ...newProfile(), ladderWins: 4 });
    expect(resultsItems(reward)).toEqual(['TRY AGAIN', 'SHOP', 'HUB']);
    const s = createResultsScene(ctx, reward, true);
    expect((s.update(frame(['confirm']), STEP) as MatchScene).match.id).toBe('backyard-5');
  });

  it('SHOP and back returns to Results, done, with no second save', () => {
    const { ctx, reward } = after(WIN_3_0);
    const s = createResultsScene(ctx, reward);
    run(s, 5);
    s.update(frame(['down']), STEP);
    const shop = s.update(frame(['confirm']), STEP) as ShopScene;
    expect(shop.kind).toBe('shop');
    const back = shop.update(frame(['back']), STEP) as ResultsScene;
    expect(back.kind).toBe('results');
    expect(back.tallyDone).toBe(true);
    expect(back.menu!.index).toBe(1);
    run(back, 5);
    expect(ctx.savedProfiles).toHaveLength(0);
  });

  it('coming back from the Shop does not replay the level-up fanfare', () => {
    const { ctx, reward } = after(WIN_3_0);
    let s = createResultsScene(ctx, reward);
    run(s, 5);
    for (let trip = 0; trip < 2; trip++) {
      s.update(frame(['down']), STEP);
      const shop = s.update(frame(['confirm']), STEP)!;
      s = shop.update(frame(['back']), STEP) as ResultsScene;
      s.update(frame(['up']), STEP);
    }
    expect(ctx.audio.played.filter(c => c === 'levelUp')).toHaveLength(1);
  });

  it('UPGRADE READY follows what he can afford now, after the Shop too', () => {
    const { ctx, reward } = after(WIN_3_0);
    const s = createResultsScene(ctx, reward);
    run(s, 5);
    expect(s.upgradeReady).toBe(true);
    s.update(frame(['down']), STEP);
    const shop = s.update(frame(['confirm']), STEP)!;
    shop.update(frame(['confirm']), STEP);
    expect(ctx.profile.coins).toBe(60);
    const back = shop.update(frame(['back']), STEP) as ResultsScene;
    expect(back.upgradeReady).toBe(false);
  });

  it('no UPGRADE READY when he cannot afford one', () => {
    const { ctx, reward } = after(LOSS_0_2);
    expect(createResultsScene(ctx, reward, true).upgradeReady).toBe(false);
  });

  it('B goes to the Hub with the back blip, even mid-tally', () => {
    for (const pressed of [['back'], ['pause', 'back']] as const) {
      const { ctx, reward } = after(WIN_3_0);
      const s = createResultsScene(ctx, reward);
      expect(s.update(frame(pressed), STEP)?.kind).toBe('hub');
      expect(ctx.audio.played).toContain('menuBack');
    }
  });

  it('Start confirms once the tally is done', () => {
    const { ctx, reward } = after(WIN_3_0);
    const s = createResultsScene(ctx, reward, true);
    expect(s.update(frame(['pause']), STEP)?.kind).toBe('match');
  });
});

describe('ladderLine', () => {
  it('names a beaten match, the championship, a rematch win and a try-again', () => {
    expect(ladderLine(after(WIN_3_0, { ...newProfile(), ladderWins: 2 }).reward)).toBe('MATCH 3 BEATEN!');
    expect(ladderLine(after(WIN_3_0, { ...newProfile(), ladderWins: 9 }).reward)).toBe('BACKYARD CHAMPION!');
    expect(ladderLine(after(WIN_3_0, { ...newProfile(), ladderWins: 10 }, matchById('backyard-10')!).reward)).toBe('REMATCH WON!');
    expect(ladderLine(after(LOSS_0_2).reward)).toMatch(/GO AGAIN!$/);
    expect(ladderLine(after({ result: 'draw', goalsFor: 1, goalsAgainst: 1, styleGoals: [], goals: [] }).reward)).toMatch(/GO AGAIN!$/);
  });
});

describe('results: unlocks and the skip grace', () => {
  it('unlock lines show with the level-up', () => {
    const { reward } = after(WIN_3_0, { ...newProfile(), level: 2, xp: 140 });
    expect(unlockLines(reward)).toEqual(['ENERGY WAVE UNLOCKED IN THE SHOP!']);
    const before = tallyAt(reward, (reward.lines.length + 1) * LINE_S);
    expect(footLines(reward, before, false)).toEqual([]);
    const levelUp = tallyAt(reward, (reward.lines.length + 1) * LINE_S + XP_FILL_S);
    expect(footLines(reward, levelUp, false)).toEqual(['ENERGY WAVE UNLOCKED IN THE SHOP!']);
    expect(footLines(reward, tallyAt(reward, Infinity), true)).toEqual([ladderLine(reward), 'ENERGY WAVE UNLOCKED IN THE SHOP!', 'UPGRADE READY IN THE SHOP!']);
  });

  it('Golden Form is announced too, and both together still fit three lines', () => {
    const { reward } = after(WIN_3_0, { ...newProfile(), level: 2, xp: 790 });
    expect(unlockLines(reward)).toEqual(['ENERGY WAVE UNLOCKED IN THE SHOP!', 'GOLDEN FORM UNLOCKED!']);
    expect(footLines(reward, tallyAt(reward, Infinity), true)).toHaveLength(3);
  });

  it('a confirm 0.1 s after skipping the tally does not pick NEXT MATCH', () => {
    const { ctx, reward } = after(WIN_3_0);
    const s = createResultsScene(ctx, reward);
    s.update(frame(['confirm']), STEP);
    run(s, 0.1);
    expect(s.update(frame(['confirm']), STEP)).toBeNull();
    expect(s.update(frame(['shoot']), STEP)).toBeNull();
  });

  it('a confirm after the grace picks it', () => {
    const { ctx, reward } = after(WIN_3_0);
    const s = createResultsScene(ctx, reward);
    s.update(frame(['confirm']), STEP);
    run(s, SKIP_GRACE_S + 0.05);
    expect(s.update(frame(['confirm']), STEP)?.kind).toBe('match');
  });
});
