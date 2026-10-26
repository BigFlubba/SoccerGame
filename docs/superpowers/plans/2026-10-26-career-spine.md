# Career Spine Implementation Plan (Plan 7a, part 1 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The structure every later venue plugs into: a career catalog, stars
with bonus objectives, star milestones, profile v3, the road map and venue
screens, the VS card, and the Hub and Results changes. The Backyard Ladder
becomes career venue 1. Biscuit the Dog is part 2
(`2026-10-26-biscuit-the-dog.md`); until it lands, the boss match is a
stand-in, Max at rung-10 stats, under Biscuit's name. Part 1 and part 2
ship together in one merge.

**Architecture:**
- **Meta.** `src/meta/` gains pure modules: `career.ts` (the catalog of
  venues and matches, progress queries, the retroactive star grant),
  `objectives.ts` (the bonus rules and the star count) and `milestones.ts`.
  `economy.ts`'s `MatchSummary` records every goal. `progress.ts`'s
  `applyMatch` takes a `CareerMatch` and reports stars, the bonus, news
  and milestones. `profile.ts` moves to v3; `saveCode.ts` appends the new
  fields.
- **Screens.** New scenes `roadMapScene.ts`, `venueScene.ts` and
  `vsScene.ts`, plus `startMatch.ts`, the one door into a match (VS card,
  then the match). The Hub's PLAY MATCH becomes CAREER. `matchScene.ts`
  takes the match it plays. Results gets stars, a bonus line, career news
  and milestones. `panel.ts` gets the star picture.
- **Sim.** Nothing in `src/game/` changes in part 1. A rung against Max
  plays exactly as today.

**Tech Stack:** Vite 8, TypeScript 7 (strict), Canvas 2D, Web Audio, Gamepad
API, Vitest 4. No runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-26-career-spine-design.md`. Read it
first. It wins over this plan if they ever disagree.

## Global Constraints

- **No image, audio or font files.** On-screen text uses only uppercase
  letters, digits and `' - : ! ? . , / + < >`. No parentheses. The star is
  a drawn picture, like the coin.
- **No runtime dependencies.** Vitest runs in Node, with no DOM: scene
  tests call `update`, never `draw`.
- **A rung against Max plays exactly as today.** `src/game/` is untouched;
  the headless AI-vs-AI tests pass unchanged; a Harrison without a power
  move plays exactly as before.
- **Nothing earned is ever taken back.** `ladderWins` stays the rungs'
  truth, 0–10. Stars only ever rise. A lost or drawn replay changes no
  stars and no `ladderWins`.
- **Profile:** key `harrisons-road-to-the-cup/profile`, now `version: 3`.
  Fields are only ever appended. `profileFrom` loads any version ≥ 1 field
  by field. New caps: stars 0–3, `milestonesPaid` 0–4, loss streaks 0–99.
  Only catalog ids load. Retroactive stars: every rung `n ≤ ladderWins`
  has at least 1 star, granted on every load.
- **Stars:** 1 for a win, 2 for a win by two or more, 3 for a win by two or
  more and the bonus in that same match. A bonus done in a lost match is
  not banked.
- **Milestones:** 10, 25, 50, 75 stars pay 300, 600, 1000, 1500 coins, each
  once, at Results, every one due and unpaid at that moment. Never silently.
- **Match ids:** `backyard-1` … `backyard-10`, `backyard-boss`. Venue ids:
  `backyard`, `park`, `school`, `stadium`, `worldCup`. Total stars: 33 in
  the Backyard, 93 in the career.
- **Approvals:** ask before merging into `main` and before pushing. Commit
  messages: Conventional Commits, 50/72, no AI attribution trailers.

## Review Focus

1. **Harrison's real save, v2 with `ladderWins` 10 and no `career`,** loads
   with ten 1-star rungs and Biscuit unlocked, and his very next Results
   pays the 10-star milestone exactly once. Pinned in Task 5 (loader) and
   Task 7 (`applyMatch` pays what's due, then `milestonesPaid` stops it).
2. **A golden-goal winner** is recorded at minute 90 and never satisfies
   SCORE IN THE FIRST 30 MINUTES. Pinned in Task 2 (the rule) and Task 8
   (the record's minute at the goal tick).
3. **A tampered save with 60 stars and nothing paid** pays three
   milestones at the next Results, not one and not none. Pinned in Task 4
   and Task 7.
4. **The boss node before rung 10** can take the cursor but A on it only
   blips. Pinned in Task 12.
5. **TRY AGAIN after a loss on the boss stand-in** and NEXT MATCH after a
   replay win both go through the VS card to the right match, and CAREER
   appears once everything is beaten. Pinned in Task 10 and Task 11.

---

### Task 1: Every goal on the record

**Files:**
- Modify: `src/meta/economy.ts:5-15`
- Modify: `src/scenes/goalCallout.ts:4-8`
- Test: `src/meta/economy.test.ts`, and every test file that builds a
  `MatchSummary` literal: `src/meta/progress.test.ts`,
  `src/scenes/resultsScene.test.ts`, `src/scenes/matchScene.test.ts`

**Interfaces:**
- Produces: in `economy.ts`,
  `export type GoalKind = 'shot' | 'chip' | 'volley' | 'header' | 'wave'`,
  `export interface GoalRecord { minute: number; kind: GoalKind | null; perfect: boolean }`,
  and `MatchSummary.goals: readonly GoalRecord[]` (one entry per goal he
  scored, in order; `kind` null when no kick of his was still live).
  `styleGoals` stays as it is. `LastKick.kind` in `goalCallout.ts` becomes
  `GoalKind`.

- [ ] **Step 1: Add `goals: []` to every `MatchSummary` literal in the four test files**

Find them with `rg -n "styleGoals: \[" src --type ts`. The tests still
pass, since the field is new.

- [ ] **Step 2: Write the failing type check**

Add `goals` to `MatchSummary` in `economy.ts` and define `GoalKind` and
`GoalRecord` there. Make `LastKick.kind` reuse `GoalKind`.

- [ ] **Step 3: Run the type check and the tests**

Run: `npm run typecheck && npx vitest run src/meta src/scenes/resultsScene.test.ts src/scenes/matchScene.test.ts`
Expected: the type check fails only on `src/scenes/matchScene.ts:131`
(the summary built there lacks `goals`); the tests pass.

- [ ] **Step 4: Give the match scene's summary `goals: []` for now**

In `matchScene.ts` `award`, add `goals: []`. Task 8 fills it. Run
`npm run typecheck`: clean.

- [ ] **Step 5: Commit**

```bash
git add src/meta/economy.ts src/scenes/goalCallout.ts src/scenes/matchScene.ts src/meta/*.test.ts src/scenes/*.test.ts
git commit -m "feat: record every goal in the match summary"
```

### Task 2: The bonus objectives and the star count

**Files:**
- Create: `src/meta/objectives.ts`
- Test: `src/meta/objectives.test.ts`

**Interfaces:**
- Consumes: `MatchSummary`, `GoalRecord` from Task 1.
- Produces:
  ```ts
  export type BonusId = 'score3' | 'cleanSheet' | 'header' | 'chip' | 'volley' | 'perfect' | 'early' | 'winBy3' | 'twoStyle' | 'win3Nil' | 'noBossGoals';
  /** What a bonus can be judged on mid-match: the goals so far. */
  export interface BonusInput { goalsFor: number; goalsAgainst: number; goals: readonly GoalRecord[]; result: MatchSummary['result'] | null }
  export interface Bonus { id: BonusId; label: string; /** True when a goal can finish it mid-match; false when only full time can. */ inPlay: boolean; done(s: BonusInput): boolean }
  export const BONUSES: Readonly<Record<BonusId, Bonus>>;
  export const EARLY_GOAL_MINUTE = 30;
  export const MAX_STARS = 3;
  /** 0 for a draw or loss; 1 for a win; 2 for a win by 2+; 3 for that and the bonus. */
  export function starsFor(s: MatchSummary, bonus: BonusId): number;
  ```
  Labels, exactly: `SCORE 3 GOALS`, `KEEP A CLEAN SHEET`, `SCORE A HEADER`,
  `SCORE FROM A CHIP`, `SCORE A VOLLEY`, `SCORE A PERFECT STRIKE`,
  `SCORE IN THE FIRST 30 MINUTES`, `WIN BY 3`, `SCORE 2 STYLE GOALS`,
  `WIN 3-0 OR BETTER`, `DON'T LET BISCUIT SCORE`. `inPlay` is true for
  `score3`, `header`, `chip`, `volley`, `perfect`, `early`, `twoStyle`;
  false for the rest. A style goal is a goal whose `kind` is `header`,
  `volley`, `chip` or `wave`. `early` means a goal with `minute < 30`.
  `winBy3` means `goalsFor - goalsAgainst >= 3` with `result === 'win'`;
  `win3Nil` means `goalsFor >= 3 && goalsAgainst === 0`; `cleanSheet` and
  `noBossGoals` mean `goalsAgainst === 0` (full-time bonuses also require
  `result !== null`).

- [ ] **Step 1: Write the failing tests**

```ts
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
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/meta/objectives.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `objectives.ts`**

`BONUSES` is an object literal in the spec's order (so `Object.values`
matches the label test). `starsFor` builds a `BonusInput` from the
summary with its result and applies the rule in the Interfaces block.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/meta/objectives.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/meta/objectives.ts src/meta/objectives.test.ts
git commit -m "feat: bonus objectives and the star count"
```

### Task 3: The career catalog and its queries

**Files:**
- Create: `src/meta/career.ts`
- Modify: `src/meta/ladder.ts:1-3` (own `LADDER_MATCHES`),
  `src/meta/profile.ts:48` (re-export it)
- Test: `src/meta/career.test.ts`

**Interfaces:**
- Consumes: `BonusId` (Task 2); `LADDER_MATCHES`, `trainingLine`
  (`ladder.ts`); `type Profile` (`profile.ts`; the `career` field arrives in
  Task 5, so this task types its queries against
  `Pick<Profile, 'ladderWins'> & { career?: { stars: Record<string, number> } }`
  and Task 5 tightens them to `Profile`).
- Produces:
  ```ts
  export type VenueId = 'backyard' | 'park' | 'school' | 'stadium' | 'worldCup';
  export interface CareerMatch {
    id: string; venue: VenueId; kind: 'rung' | 'boss';
    /** 1–10 for a rung, 0 for a boss. */ rung: number;
    /** On the venue screen and VS card. */ name: string;
    /** On the HUD and Results. */ hudName: string;
    bonus: BonusId;
  }
  export interface Venue { id: VenueId; name: string; matches: readonly CareerMatch[] }
  export const rungId: (n: number) => string;            // `backyard-${n}`
  export const BOSS_ID = 'backyard-boss';
  export const VENUES: readonly Venue[];                  // backyard first; park, school, stadium, worldCup with matches: []
  export const BACKYARD: Venue;
  export const MATCH_IDS: readonly string[];              // every match id, venue order
  export const TOTAL_STARS = 93;
  export const VENUE_STARS = 33;                          // the Backyard's; later venues' are 15
  export function matchById(id: string): CareerMatch | undefined;
  export type MatchState = 'beaten' | 'next' | 'locked';
  export function starsAt(p, id: string): number;         // 0 when absent
  export function isBeaten(p, m: CareerMatch): boolean;   // rung: ladderWins >= rung; boss: starsAt >= 1
  export function nextCareerMatch(p): CareerMatch;        // first unbeaten Backyard match in order; the boss once all are beaten (a replay)
  export function matchState(p, m: CareerMatch): MatchState; // beaten; next = nextCareerMatch and unbeaten; else locked. The boss is locked until ladderWins >= 10
  export function venueStars(p, venue: VenueId): number;
  export function careerStars(p): number;
  export function venueDone(p, venue: VenueId): boolean;  // its boss beaten
  export function allBeaten(p): boolean;                  // every match in every open venue beaten (in 7a: venueDone backyard)
  export function stopLabel(p, venue: VenueId): string;   // backyard: `${venueStars}/33`; park: venueDone(backyard) ? 'COMING SOON' : 'LOCKED'; others 'LOCKED'
  export function careerCardLines(p): { first: string; second: string | null };
  ```
  Venue names: `BACKYARD`, `THE PARK`, `SCHOOL`, `STADIUM`, `WORLD CUP`.
  Backyard matches: rungs 1–10 with `name: 'MAX'`, `hudName: 'MAX'` and
  bonuses, in order, `score3, cleanSheet, header, chip, volley, perfect,
  early, winBy3, twoStyle, win3Nil`; then the boss with
  `name: 'BISCUIT THE DOG'`, `hudName: 'BISCUIT'`, `bonus: 'noBossGoals'`.
  Hub card lines: a rung next → `NEXT: MAX - MATCH ${n}/10` and
  `trainingLine(n)`; the boss next → `NEXT: BISCUIT THE DOG` and
  `BACKYARD BOSS!`; the boss beaten → `BACKYARD DONE! STARS ${s}/33` and
  `THE PARK: COMING SOON`.

- [ ] **Step 1: Move `LADDER_MATCHES`**

Define `export const LADDER_MATCHES = 10;` in `ladder.ts` and replace
`profile.ts`'s definition with `export { LADDER_MATCHES } from './ladder';`
(so every importer still works, and `career.ts` can import `ladder.ts`
without a cycle). Run `npm run typecheck && npx vitest run src/meta`:
clean.

- [ ] **Step 2: Write the failing tests**

```ts
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
```

(`trainingLine(7)` is `MAX HAS BEEN TRAINING: JUMP UP` from the ladder
table: match 7 raises jump.)

- [ ] **Step 3: Run them to see them fail**

Run: `npx vitest run src/meta/career.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 4: Implement `career.ts`**

The catalog is data built once at module load. `nextCareerMatch` walks
`BACKYARD.matches` for the first unbeaten; falls back to the boss.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/meta`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/meta/career.ts src/meta/career.test.ts src/meta/ladder.ts src/meta/profile.ts
git commit -m "feat: the career catalog and its progress queries"
```

### Task 4: Milestones

**Files:**
- Create: `src/meta/milestones.ts`
- Test: `src/meta/milestones.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface Milestone { index: number; stars: number; coins: number }
  export const MILESTONES: readonly Milestone[];   // (0,10,300) (1,25,600) (2,50,1000) (3,75,1500)
  /** Every milestone reached by `totalStars` with index >= paid, in order. */
  export function milestonesDue(totalStars: number, paid: number): Milestone[];
  ```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { MILESTONES, milestonesDue } from './milestones';

describe('milestones', () => {
  it('the spec table', () => {
    expect(MILESTONES.map(m => [m.stars, m.coins])).toEqual([[10, 300], [25, 600], [50, 1000], [75, 1500]]);
  });
  it('pays what is reached and unpaid, in order', () => {
    expect(milestonesDue(9, 0)).toEqual([]);
    expect(milestonesDue(10, 0).map(m => m.coins)).toEqual([300]);
    expect(milestonesDue(13, 1)).toEqual([]);
    expect(milestonesDue(60, 0).map(m => m.index)).toEqual([0, 1, 2]);
    expect(milestonesDue(93, 4)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to see them fail, implement, run to see them pass**

Run: `npx vitest run src/meta/milestones.test.ts` before and after.

- [ ] **Step 3: Commit**

```bash
git add src/meta/milestones.ts src/meta/milestones.test.ts
git commit -m "feat: star milestones"
```

### Task 5: Profile version 3

**Files:**
- Modify: `src/meta/profile.ts`
- Modify: `src/meta/career.ts` (add `grantRungStars`; tighten the query
  types to `Profile`)
- Test: `src/meta/profile.test.ts`, `src/meta/career.test.ts`

**Interfaces:**
- Consumes: `MATCH_IDS`, `rungId` (Task 3).
- Produces: in `profile.ts`, `version: 3`,
  ```ts
  export interface Career { stars: Record<string, number>; milestonesPaid: number; lossStreaks: Record<string, number> }
  // Profile gains `career: Career`. Only ids in MATCH_IDS load. Entries of 0 are not stored.
  export const MAX_LOADED = { level: 999, xp: 1_000_000, count: 999_999_999, stars: 3, milestones: 4, streak: 99 };
  ```
  In `career.ts`:
  `export function grantRungStars(p: Profile): Profile` — every rung
  `n ≤ ladderWins` gets `stars[rungId(n)] = max(existing, 1)`; never
  changes `p`. `profileFrom` applies it after `grantForms`, so every load
  (a v1, v2 or v3 save, or a save code) carries the retro stars.
  `profile.ts` imports `career.ts`; `career.ts` imports `ladder.ts` and
  only the `Profile` type from `profile.ts`. No runtime cycle.

- [ ] **Step 1: Write the failing tests**

Update `SOME` in `profile.test.ts` to v3 with
`career: { stars: { 'backyard-1': 1, 'backyard-2': 1, 'backyard-3': 2, 'backyard-4': 3 }, milestonesPaid: 0, lossStreaks: { 'backyard-boss': 2 } }`
and `newProfile()`'s expectation to
`version: 3, career: { stars: {}, milestonesPaid: 0, lossStreaks: {} }`.
Then add:

```ts
  it('a v2 save loads into v3 with retro stars for its ladder wins', () => {
    const v2 = { ...SOME, version: 2, career: undefined };
    delete (v2 as { career?: unknown }).career;
    expect(loadProfile(stored(v2))).toEqual({ ...SOME, version: 3, career: { stars: { 'backyard-1': 1, 'backyard-2': 1, 'backyard-3': 1, 'backyard-4': 1 }, milestonesPaid: 0, lossStreaks: {} } });
  });

  it("Harrison's champion save unlocks Biscuit with ten stars", () => {
    const champ = loadProfile(stored({ ...SOME, version: 2, ladderWins: 10, career: undefined }));
    expect(Object.keys(champ.career.stars)).toHaveLength(10);
    expect(Object.values(champ.career.stars).every(s => s === 1)).toBe(true);
    expect(champ.career.stars['backyard-boss']).toBeUndefined();
  });

  it('retro stars never lower a better star', () => {
    expect(loadProfile(stored(SOME)).career.stars['backyard-4']).toBe(3);
  });

  it('career junk falls back field by field: unknown ids drop, stars clamp to 3, streaks to 99, paid to 4', () => {
    const p = loadProfile(stored({ ...SOME, career: { stars: { 'backyard-2': 9, 'park-1': 2, 'backyard-boss': -1, nonsense: 3 }, milestonesPaid: 40, lossStreaks: { 'backyard-boss': 500, 'x': 1 } } }));
    expect(p.career).toEqual({ stars: { 'backyard-1': 1, 'backyard-2': 3, 'backyard-3': 1, 'backyard-4': 1 }, milestonesPaid: 4, lossStreaks: { 'backyard-boss': 99 } });
    expect(loadProfile(stored({ ...SOME, career: 'none' })).career).toEqual({ stars: { 'backyard-1': 1, 'backyard-2': 1, 'backyard-3': 1, 'backyard-4': 1 }, milestonesPaid: 0, lossStreaks: {} });
  });
```

And in `career.test.ts`, change `p(...)` to build a full profile
(`{ ...newProfile(), ladderWins, career: { ...newProfile().career, stars } }`)
and add:

```ts
  it('grantRungStars adds one star per won rung and keeps better ones', () => {
    const before = { ...newProfile(), ladderWins: 3, career: { stars: { 'backyard-2': 2 }, milestonesPaid: 0, lossStreaks: {} } };
    const after = grantRungStars(before);
    expect(after.career.stars).toEqual({ 'backyard-1': 1, 'backyard-2': 2, 'backyard-3': 1 });
    expect(before.career.stars).toEqual({ 'backyard-2': 2 });
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/meta/profile.test.ts src/meta/career.test.ts`
Expected: FAIL on `version`, `career`.

- [ ] **Step 3: Implement**

`careerFrom(v: unknown): Career` in `profile.ts`, next to `totalsFrom`,
reading each `MATCH_IDS` entry with `wholeOr(..., 0, 0, MAX_LOADED.stars)`
and keeping only values above 0. `profileFrom` returns
`grantRungStars(grantForms({ ... }))`. Check the v1 test still passes with
`career` added to its expectation.

- [ ] **Step 4: Run the whole suite**

Run: `npm run typecheck && npx vitest run`
Expected: PASS. (Other tests that compare whole profiles with
`toEqual(newProfile())` pass unchanged, since they build from
`newProfile()`.)

- [ ] **Step 5: Commit**

```bash
git add src/meta/profile.ts src/meta/profile.test.ts src/meta/career.ts src/meta/career.test.ts
git commit -m "feat: profile v3 with career stars and retro rung stars"
```

### Task 6: The save code carries the career

**Files:**
- Modify: `src/meta/saveCode.ts:134-168`
- Modify: `src/scenes/saveCodeScene.ts:59-62`
- Test: `src/meta/saveCode.test.ts`, `src/scenes/saveCodeScene.test.ts`

**Interfaces:**
- Consumes: `MATCH_IDS` order for the Backyard (`BACKYARD.matches`), `BOSS_ID`.
- Produces: appended fields, in order: the eleven Backyard star counts in
  match order, `milestonesPaid`, the boss's loss streak. An older code
  (18 or 22 fields) still decodes, with no stars beyond the retro grant.
  `summarise(p)` becomes
  `LEVEL ${level} - ${coins} COINS - LADDER ${ladderWins}/10 - STARS ${careerStars(p)}`.

- [ ] **Step 1: Write the failing tests**

Update `RICH` to v3 with
`career: { stars: { 'backyard-1': 1, 'backyard-2': 1, 'backyard-3': 3, 'backyard-4': 2, 'backyard-boss': 0 ... } }`
(leave the boss out: zeros aren't stored), `milestonesPaid: 1`,
`lossStreaks: { 'backyard-boss': 2 }`. Change the "newer build" test's
version to 4. Add:

```ts
  it('a v2 code loads with the retro stars and nothing else', () => {
    const fields = decodeFields(encodeSaveCode(RICH)) ?? [];
    const v2 = decodeSaveCode(encodeFields([2, ...fields.slice(1, 22)]));
    expect(v2?.career).toEqual({ stars: { 'backyard-1': 1, 'backyard-2': 1, 'backyard-3': 1, 'backyard-4': 1 }, milestonesPaid: 0, lossStreaks: {} });
  });

  it('rung loss streaks do not travel, the boss streak does', () => {
    const p = { ...RICH, career: { ...RICH.career, lossStreaks: { 'backyard-3': 4, 'backyard-boss': 2 } } };
    expect(decodeSaveCode(encodeSaveCode(p))?.career.lossStreaks).toEqual({ 'backyard-boss': 2 });
  });
```

In `saveCodeScene.test.ts`, the `summarise` expectation gains
` - STARS 7` for a profile with 7 stars (build it from `newProfile()` with
`career.stars` set, and `ladderWins` consistent so the retro grant adds
nothing).

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/meta/saveCode.test.ts src/scenes/saveCodeScene.test.ts`

- [ ] **Step 3: Implement**

Encode: after the power-form fields, `...BACKYARD.matches.map(m => p.career.stars[m.id] ?? 0)`, `p.career.milestonesPaid`, `p.career.lossStreaks[BOSS_ID] ?? 0`.
Decode: `career: { stars: Object.fromEntries(BACKYARD.matches.map(m => [m.id, next()])), milestonesPaid: next(), lossStreaks: { [BOSS_ID]: next() } }`
(undefined values fall back in `careerFrom`).

- [ ] **Step 4: Run the tests, then commit**

Run: `npx vitest run src/meta src/scenes/saveCodeScene.test.ts` → PASS.

```bash
git add src/meta/saveCode.ts src/meta/saveCode.test.ts src/scenes/saveCodeScene.ts src/scenes/saveCodeScene.test.ts
git commit -m "feat: save code carries stars, milestones and the boss streak"
```

### Task 7: `applyMatch` scores the career

**Files:**
- Modify: `src/meta/progress.ts`
- Test: `src/meta/progress.test.ts`

**Interfaces:**
- Consumes: `CareerMatch`, `isBeaten`, `starsAt`, `careerStars`, `allBeaten`
  (Task 3/5); `starsFor` (Task 2); `milestonesDue` (Task 4).
- Produces:
  ```ts
  export interface CareerResult {
    match: CareerMatch;
    /** Earned this match, 0..3. */ stars: number;
    bestBefore: number;
    /** stars > bestBefore: the save's entry rose. */ improved: boolean;
    bonusDone: boolean;
    /** This win beat the match for the first time. */ firstWin: boolean;
    /** He is Backyard Champion now (ladderWins reached 10 this match). */ champion: boolean;
    /** Every open career match is beaten after this result. */ allBeaten: boolean;
    /** Paid at this Results, in order. */ milestones: readonly Milestone[];
  }
  export function applyMatch(p: Profile, s: MatchSummary, match: CareerMatch, today: string): { profile: Profile; reward: MatchReward };
  // MatchReward: `ladder` is removed; `career: CareerResult` is added. `coins` includes the milestone coins.
  ```
  Rules: a rung win with `match.rung === nextMatch(ladderWins)` and not
  champion advances `ladderWins` as today. `stars = starsFor(s, match.bonus)`;
  the entry becomes `max(before, stars)`, written only when above 0.
  `lossStreaks[match.id]`: a win removes it, a loss adds 1, a draw leaves
  it. Milestones: `milestonesDue(careerStars(after), p.career.milestonesPaid)`;
  their coins add to `coins` and `profile.coins`; `milestonesPaid` grows by
  their count. `bonusDone = BONUSES[match.bonus].done({...s, result: s.result})`.

- [ ] **Step 1: Rewrite the tests**

Change every `applyMatch(p, s, n, TODAY)` to pass `matchById(rungId(n))!`
and the `reward.ladder` expectations to `reward.career` ones:

```ts
import { BOSS_ID, matchById, rungId } from './career';
const rung = (n: number) => matchById(rungId(n))!;
const boss = matchById(BOSS_ID)!;
// in 'a first win pays, levels and advances the ladder':
expect(reward.career).toMatchObject({ stars: 2, bestBefore: 0, improved: true, firstWin: true, champion: false, allBeaten: false, milestones: [] });
expect(profile.career.stars).toEqual({ 'backyard-1': 2 });
// 'a draw or a loss pays but does not advance...': add
expect(profile.career.stars).toEqual({ 'backyard-1': 1, 'backyard-2': 1 });   // retro only; start has ladderWins 2
expect(reward.career.stars).toBe(0);
// 'winning match 10 makes him champion...':
expect(champ.reward.career).toMatchObject({ firstWin: true, champion: true, allBeaten: false });
expect(rematch.reward.career).toMatchObject({ firstWin: false, champion: false });
```

Add:

```ts
  it('three stars need the bonus and a two-goal margin together', () => {
    const header = { result: 'win', goalsFor: 2, goalsAgainst: 0, styleGoals: ['header'], goals: [{ minute: 10, kind: 'header', perfect: false }, { minute: 50, kind: 'shot', perfect: false }] } as const;
    const { profile, reward } = applyMatch({ ...newProfile(), ladderWins: 2 }, header, rung(3), TODAY);
    expect(reward.career).toMatchObject({ stars: 3, bonusDone: true, improved: true });
    expect(profile.career.stars['backyard-3']).toBe(3);
  });

  it('a bonus done in a loss is reported but banks nothing', () => {
    const { profile, reward } = applyMatch({ ...newProfile(), ladderWins: 2 }, { result: 'lose', goalsFor: 1, goalsAgainst: 2, styleGoals: ['header'], goals: [{ minute: 10, kind: 'header', perfect: false }] }, rung(3), TODAY);
    expect(reward.career).toMatchObject({ stars: 0, bonusDone: true, improved: false });
    expect(profile.career.stars['backyard-3']).toBeUndefined();
    expect(profile.career.lossStreaks).toEqual({ 'backyard-3': 1 });
  });

  it('a replay can only raise a star, and a win clears the loss streak', () => {
    const start = { ...newProfile(), ladderWins: 5, career: { stars: { 'backyard-2': 3 }, milestonesPaid: 0, lossStreaks: { 'backyard-2': 2 } } };
    const worse = applyMatch(start, { result: 'win', goalsFor: 1, goalsAgainst: 0, styleGoals: [], goals: [{ minute: 5, kind: 'shot', perfect: false }] }, rung(2), TODAY);
    expect(worse.profile.career.stars['backyard-2']).toBe(3);
    expect(worse.reward.career).toMatchObject({ stars: 1, bestBefore: 3, improved: false, firstWin: false });
    expect(worse.profile.career.lossStreaks).toEqual({});
    expect(worse.profile.ladderWins).toBe(5);
  });

  it('the boss is beaten by its star, and then everything is beaten', () => {
    const { profile, reward } = applyMatch({ ...newProfile(), ladderWins: 10 }, win30, boss, TODAY);
    expect(profile.career.stars[BOSS_ID]).toBe(3);
    expect(reward.career).toMatchObject({ firstWin: true, allBeaten: true, champion: false, bonusDone: true });
    expect(profile.ladderWins).toBe(10);
  });

  it("Harrison's champion save pays the 10-star milestone once, at the next Results", () => {
    const champ = { ...newProfile(), ladderWins: 10 };
    const loaded = grantRungStars(champ);
    const first = applyMatch(loaded, loss03, boss, TODAY);
    expect(first.reward.career.milestones.map(m => m.coins)).toEqual([300]);
    expect(first.reward.coins).toBe(15 + 300);
    expect(first.profile.coins).toBe(315);
    expect(first.profile.career.milestonesPaid).toBe(1);
    const second = applyMatch(first.profile, loss03, boss, TODAY);
    expect(second.reward.career.milestones).toEqual([]);
  });

  it('a save with 60 stars and nothing paid is paid three milestones', () => {
    const stars = Object.fromEntries([...Array(10)].map((_, i) => [rungId(i + 1), 3]));
    const rich = { ...newProfile(), ladderWins: 10, career: { stars: { ...stars, [BOSS_ID]: 3 }, milestonesPaid: 0, lossStreaks: {} } };
    // 33 stars in the save; the test wants 60, which only a tampered save can hold: give the boss 30.
    const tampered = { ...rich, career: { ...rich.career, stars: { ...stars, [BOSS_ID]: 30 } } };
    const { reward, profile } = applyMatch(tampered, loss03, boss, TODAY);
    expect(reward.career.milestones.map(m => m.index)).toEqual([0, 1, 2]);
    expect(profile.career.milestonesPaid).toBe(3);
  });
```

(`win30`/`loss03` are the file's existing summaries; add `goals` to them
with three shot goals at minutes 10, 40, 70 for `win30`.)

- [ ] **Step 2: Run to see them fail, implement, run to see them pass**

Run: `npx vitest run src/meta/progress.test.ts`. Then
`npm run typecheck`: the only remaining errors are in `matchScene.ts` and
`resultsScene.ts` (`ladder`, the old signature); fix the compile by
passing `nextCareerMatch(ctx.profile)` from `matchScene.ts` for now and
reading `reward.career` where `reward.ladder` was (Tasks 8 and 10 finish
the job). `npx vitest run`: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/meta/progress.ts src/meta/progress.test.ts src/scenes/matchScene.ts src/scenes/resultsScene.ts src/scenes/resultsScene.test.ts
git commit -m "feat: applyMatch scores stars, bonuses and milestones"
```

### Task 8: The match knows which career match it is

**Files:**
- Modify: `src/scenes/matchScene.ts`
- Modify: `src/scenes/matchView.ts:62-63, 248-270` (the HUD's away name)
- Modify: `src/scenes/hubScene.ts:55` (pass the next match, for now)
- Test: `src/scenes/matchScene.test.ts`, `src/scenes/matchView.test.ts`

**Interfaces:**
- Consumes: `CareerMatch`, `nextCareerMatch` (Task 3); `BONUSES` (Task 2);
  `GoalRecord` (Task 1); `clockMinute` (`match.ts`).
- Produces:
  ```ts
  export function createMatchScene(ctx: GameContext, seed: number, match: CareerMatch = nextCareerMatch(ctx.profile)): MatchScene;
  // MatchScene: `ladderMatch` is replaced by `readonly match: CareerMatch`; adds
  //   `readonly goals: readonly GoalRecord[]` (so far) and
  //   `readonly bonusCallout: string | null` (BONUS DONE! while it shows).
  export const BONUS_CALLOUT = 'BONUS DONE!';
  export const BONUS_SHOW_S = 1.5;
  // matchView.ts: MatchHud gains `awayName: string`; AWAY_NAME is removed; the HUD line and the
  //   `${awayName} SCORES` banner use it. `banner(w, moment, awayName)`.
  ```
  Opponent: a rung plays Max at `maxStats(match.rung)`; the boss, for now,
  plays Max at `maxStats(10)` **as a stand-in** (one `if`, commented
  `// Stand-in until Biscuit lands (plan part 2).`), with the HUD showing
  `match.hudName`. The goal record: on `world.events.goal === 'home'`,
  push `{ minute: clockMinute(world.match), kind: lastKick?.kind ?? null, perfect: lastKick?.perfect ?? false }`
  before `lastKick` is cleared. The bonus callout: when a home goal makes
  `BONUSES[match.bonus].inPlay && done({...so far, result: null})` true
  for the first time, show `BONUS DONE!` for `BONUS_SHOW_S` **starting when
  the goal moment ends**, with the `star` cue (Task 9 adds the cue; use
  `'perfect'` until then and switch in Task 9). `restart` keeps `match`.
  `award` passes `match` and `goals`.

- [ ] **Step 1: Write the failing tests**

Replace the `ladderMatch` tests (lines 107–120) with:

```ts
  it('plays the next career match by default, Max at that rung', () => {
    const s = createMatchScene(testContext({ profile: { ...newProfile(), ladderWins: 2 } }), 1);
    expect(s.match.id).toBe('backyard-3');
    expect(s.world.away.stats).toEqual(maxStats(3));
  });

  it('a chosen rung plays that rung, and Restart keeps it', () => {
    const s = createMatchScene(testContext({ profile: { ...newProfile(), ladderWins: 6 } }), 1, matchById('backyard-2')!);
    expect(s.world.away.stats).toEqual(maxStats(2));
    s.update(frame(['pause']), STEP);
    s.update(frame(['down']), STEP);
    const again = s.update(frame(['confirm']), STEP) as MatchScene;
    expect(again.match.id).toBe('backyard-2');
  });

  it('the boss is a stand-in for now: Max at rung 10 under his name', () => {
    const s = createMatchScene(testContext({ profile: { ...newProfile(), ladderWins: 10 } }), 1);
    expect(s.match.id).toBe('backyard-boss');
    expect(s.world.away.stats).toEqual(maxStats(10));
  });

  it('records each of his goals with the minute, kind and perfect', () => {
    const ctx = testContext();
    const s = createMatchScene(ctx, 1);
    // stage a header goal at 40': put the ball in the right goal with a live header kick on the clock
    s.world.match.clockS = 40;
    s.world.match.phase = 'playing';
    // (use the same staging the existing 'style goal' test uses to score a header, then step once)
    ...
    expect(s.goals).toEqual([{ minute: 40, kind: 'header', perfect: false }]);
  });

  it('a golden-goal winner is minute 90', () => { /* stage: clockS 90, goldenGoal true, goldenS 10, score a shot */ expect(s.goals[0]?.minute).toBe(90); });

  it('BONUS DONE! shows after the goal moment, once, with its cue', () => {
    // match 3's bonus is a header: score one as above, run the goal moment to its end
    expect(s.bonusCallout).toBeNull();            // during the moment
    ... // step past moment.done
    expect(s.bonusCallout).toBe('BONUS DONE!');
    expect(ctx.audio.played).toContain('star');   // 'perfect' until Task 9
    ... // step BONUS_SHOW_S
    expect(s.bonusCallout).toBeNull();
    // a second header does not show it again
  });

  it('the summary it saves carries the goals and the match', () => {
    // run a match to full time as the existing 'pays out at full time' test does, then
    expect(ctx.savedProfiles.at(-1)?.career.stars['backyard-1']).toBeGreaterThan(0);
  });
```

Fill the `...` with the file's own helpers: `live()` (a match stepped
into play) and `run(s, seconds, held)`, and the staging the existing
style-goal and full-time tests do through `s.world` (place the ball in
the right goal mouth with `world.home.kick` set to the kind under test,
then step once). In `matchView.test.ts`, `banner(w, null, 'BISCUIT')`
expects `BISCUIT SCORES`.

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/scenes/matchScene.test.ts src/scenes/matchView.test.ts`

- [ ] **Step 3: Implement**

`hubScene.ts` passes nothing (the default is the next match). The HUD
name flows `match.hudName → hud.awayName → drawHud/banner`.

- [ ] **Step 4: Run the suite and the type check, then commit**

Run: `npm run typecheck && npx vitest run` → PASS.

```bash
git add src/scenes/matchScene.ts src/scenes/matchView.ts src/scenes/hubScene.ts src/scenes/matchScene.test.ts src/scenes/matchView.test.ts
git commit -m "feat: the match plays a career match and records its goals"
```

### Task 9: The star picture and the star cue

**Files:**
- Modify: `src/scenes/panel.ts` (add `drawStar`, `drawStars`)
- Modify: `src/audio/cues.ts` (add `'star'`)
- Modify: `src/scenes/matchScene.ts` (the bonus callout plays `'star'`)
- Test: `src/audio/cues.test.ts`, `src/scenes/matchScene.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const STAR_W = 5;   // panel.ts; a 5×5 star: rows '..#..', '#####', '.###.', '.###.', '#...#', in MASTER.energyGold when lit, MASTER.slate when not, with a one-pixel MASTER.outline ring
  export function drawStar(g: CanvasRenderingContext2D, x: number, y: number, lit: boolean): void;
  /** Three stars, 7 px apart, the first `lit` of them gold. */
  export function drawStars(g: CanvasRenderingContext2D, x: number, y: number, lit: number): void;
  ```
  `Cue` gains `'star'`: a short rising two-note chime (builder's voices),
  by design not by ear, like every cue.

- [ ] **Step 1: Write the failing test**

In `cues.test.ts`, wherever the file asserts every cue has voices, add
`'star'` to the list it checks (or assert `CUES.star.length > 0`, matching
the file's own pattern). In `matchScene.test.ts`, change the bonus
callout's cue expectation to `'star'`.

- [ ] **Step 2: Run, implement, run**

Run: `npx vitest run src/audio src/scenes/matchScene.test.ts` → PASS.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/panel.ts src/audio/cues.ts src/scenes/matchScene.ts src/audio/cues.test.ts src/scenes/matchScene.test.ts
git commit -m "feat: star picture and star chime"
```

### Task 10: Results shows stars, the bonus, the news and milestones

**Files:**
- Create: `src/scenes/startMatch.ts`
- Modify: `src/scenes/resultsScene.ts`
- Test: `src/scenes/resultsScene.test.ts`, `src/scenes/startMatch.test.ts`

**Interfaces:**
- Consumes: `MatchReward.career` (Task 7); `nextCareerMatch` (Task 3);
  `BONUSES` labels (Task 2); `drawStars` (Task 9).
- Produces:
  ```ts
  // startMatch.ts
  /** The one way into a career match. For now: straight to the match; Task 11 puts the VS card in front. */
  export function startMatch(ctx: GameContext, match: CareerMatch): Scene;

  // resultsScene.ts
  export const STAR_S = 0.4;                       // one star lights per STAR_S after the XP beat
  // Tally gains `stars: number` (lit so far) and `starsDone: boolean`; `done` now follows the stars:
  //   starsAt = xpAt + LINE_S (+ levelUp beat as today); star k lights at starsAt + k*STAR_S; done = starsAt + stars*STAR_S + LINE_S.
  export function careerLine(reward: MatchReward): string;
  //   firstWin && champion → 'BACKYARD CHAMPION! BISCUIT AWAITS'
  //   firstWin on the boss  → 'BISCUIT BEATEN! BACKYARD DONE!'
  //   firstWin on a rung    → `MATCH ${rung} BEATEN!`
  //   win, improved         → `NEW BEST: ${stars} STARS!` (`1 STAR!` never occurs: improving means 2 or 3)
  //   win, not improved     → 'REMATCH WON!'
  //   draw                  → 'ALL SQUARE. GO AGAIN!'
  //   loss                  → `${hudName} TAKES THIS ONE. GO AGAIN!`
  export function bonusLine(reward: MatchReward): string;   // `BONUS DONE: ${label}` | `BONUS MISSED: ${label}`
  export function milestoneLines(reward: MatchReward): string[];  // `${stars} STARS! +${coins} COINS` each
  export function footLines(reward, tally, upgradeReady): string[];
  //   once the tally is done: careerLine, then milestoneLines, then unlockLines (from the level-up beat on), then UPGRADE READY; still at most FOOT_LINES = 3
  export function resultsItems(reward: MatchReward): string[];
  //   [win && allBeaten ? 'CAREER' : win ? 'NEXT MATCH' : 'TRY AGAIN', 'SHOP', 'HUB']
  ```
  Draw: the header becomes one line, `YOU WIN! 3-1` at scale 2 (y 4), and
  under it (y 20) three stars at scale 1 centred with the bonus line to
  their right in one centred group (gold when done, white when missed).
  The panel keeps its place and size. The coins total shown includes the
  milestone coins once their line has landed (they're in `reward.coins`;
  show them with `total`). Routing: `NEXT MATCH` →
  `startMatch(ctx, nextCareerMatch(ctx.profile))`; `TRY AGAIN` →
  `startMatch(ctx, reward.career.match)`; `CAREER` → the road map (Task 13;
  until then, the Hub).

- [ ] **Step 1: Write the failing tests**

Rewrite the `ladderLine` describe as `careerLine` with the cases above
(use `after(WIN_3_0, { ...newProfile(), ladderWins: 9 })` for the
champion, `after(WIN_3_0, { ...newProfile(), ladderWins: 10 }, boss)` for
the boss, a replay of rung 1 on a `ladderWins: 3` profile with
`career.stars['backyard-1']: 3` for `REMATCH WON!`, and `NEW BEST: 2
STARS!` for the same replay with the star at 1). Add:

```ts
  it('stars light one per STAR_S after the XP beat, each with the chime, the third with the fanfare', () => {
    const { ctx, reward } = after({ ...WIN_3_0, goals: [g(10), g(20), g(30)] });   // rung 1's bonus is 3 goals: 3 stars
    const s = createResultsScene(ctx, reward);
    const xpEnd = (reward.lines.length + 1) * LINE_S + XP_FILL_S;
    run(s, xpEnd + LINE_S + STAR_S * 2 + 0.05);
    expect(ctx.audio.played.filter(c => c === 'star')).toHaveLength(2);
    run(s, STAR_S);
    expect(ctx.audio.played.filter(c => c === 'star')).toHaveLength(3);
    expect(ctx.audio.played.filter(c => c === 'levelUp').length).toBeGreaterThanOrEqual(1);
    expect(s.tallyDone).toBe(false);
    run(s, LINE_S + 0.05);
    expect(s.tallyDone).toBe(true);
  });

  it('a loss has no star beat', () => {
    const { reward } = after(LOSS_0_2);
    expect(tallyAt(reward, 99)).toMatchObject({ stars: 0, done: true });
  });

  it('bonus and milestone lines', () => {
    const { reward } = after({ ...WIN_3_0, goals: [g(10), g(20), g(30)] });
    expect(bonusLine(reward)).toBe('BONUS DONE: SCORE 3 GOALS');
    expect(bonusLine(after(LOSS_0_2).reward)).toBe('BONUS MISSED: SCORE 3 GOALS');
    const paid = after(LOSS_0_2, grantRungStars({ ...newProfile(), ladderWins: 10 }), boss).reward;
    expect(milestoneLines(paid)).toEqual(['10 STARS! +300 COINS']);
    expect(footLines(paid, tallyAt(paid, Infinity), true)).toEqual(['BISCUIT TAKES THIS ONE. GO AGAIN!', '10 STARS! +300 COINS', 'UPGRADE READY IN THE SHOP!']);
  });

  it('NEXT MATCH plays the next unbeaten match; TRY AGAIN replays this one; CAREER once all is beaten', () => {
    const next = after(WIN_3_0, { ...newProfile(), ladderWins: 3 }, matchById('backyard-1')!);   // a replay win
    expect(resultsItems(next.reward)[0]).toBe('NEXT MATCH');
    const s = createResultsScene(next.ctx, next.reward, true);
    expect((s.update(frame(['confirm']), STEP) as MatchScene).match.id).toBe('backyard-4');
    const lost = after(LOSS_0_2, { ...newProfile(), ladderWins: 10 }, boss);
    expect(resultsItems(lost.reward)[0]).toBe('TRY AGAIN');
    expect((createResultsScene(lost.ctx, lost.reward, true).update(frame(['confirm']), STEP) as MatchScene).match.id).toBe('backyard-boss');
    const done = after(WIN_3_0, { ...newProfile(), ladderWins: 10 }, boss);
    expect(resultsItems(done.reward)[0]).toBe('CAREER');
  });
```

(`g(minute)` builds a shot `GoalRecord`; `after` takes a `CareerMatch`
third argument now, defaulting to `nextCareerMatch(from)`.) In
`startMatch.test.ts`: `startMatch(ctx, matchById('backyard-2')!)` returns
a scene of kind `match` whose `match.id` is `backyard-2`.

- [ ] **Step 2: Run to see them fail, implement, run to see them pass**

Run: `npx vitest run src/scenes/resultsScene.test.ts src/scenes/startMatch.test.ts`
Then `npx vitest run` → PASS.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/startMatch.ts src/scenes/startMatch.test.ts src/scenes/resultsScene.ts src/scenes/resultsScene.test.ts
git commit -m "feat: results shows stars, the bonus, career news and milestones"
```

### Task 11: The VS card

**Files:**
- Create: `src/scenes/vsScene.ts`
- Modify: `src/scenes/startMatch.ts` (go through the card)
- Modify: `src/scenes/scene.ts:3` (`SceneKind` gains `'vs' | 'venue' | 'roadMap'`)
- Test: `src/scenes/vsScene.test.ts`, `src/scenes/startMatch.test.ts`

**Interfaces:**
- Consumes: `CareerMatch`; `BONUSES`; `createMatchScene`, `newSeed`.
- Produces:
  ```ts
  export const VS_AUTO_S = 2;
  export interface VsScene extends Scene { readonly match: CareerMatch; readonly lines: readonly string[] }
  /** The card's text, top to bottom. A rung: ['MATCH 7', 'HARRISON VS MAX', 'BONUS: SCORE IN THE FIRST 30 MINUTES']; the boss: ['BACKYARD BOSS', 'HARRISON VS BISCUIT THE DOG', "BONUS: DON'T LET BISCUIT SCORE"]. Part 2 appends the tip line. */
  export function vsLines(match: CareerMatch, p: Profile): string[];
  export function createVsScene(ctx: GameContext, match: CareerMatch, back: () => Scene): VsScene;
  // A, X or Start → createMatchScene(ctx, newSeed(), match) at once; after VS_AUTO_S the same by itself; B or Esc → back().
  // startMatch(ctx, match) → createVsScene(ctx, match, () => createVenueScene(ctx, match.venue, match.id)) once Task 12 exists; until then back() is the Hub.
  ```
  Draw: the venue backdrop with the header band dimmed as on the venue
  screen; the lines centred at y 30 (scale 2), 52 (scale 2), 74 (scale 1);
  Harrison's idle sprite facing right at x 110 and the away idle sprite
  facing left at x 210 on the pitch line y 150 (the stand-in draws Max);
  `A KICK OFF` as a button hint at y 160. The boss sting (part 2) is not
  here yet; the card plays `menuConfirm` when it kicks off by a press.

- [ ] **Step 1: Write the failing tests**

```ts
describe('the VS card', () => {
  it('names the match and its bonus', () => {
    expect(vsLines(matchById('backyard-7')!, newProfile())).toEqual(['MATCH 7', 'HARRISON VS MAX', 'BONUS: SCORE IN THE FIRST 30 MINUTES']);
    expect(vsLines(matchById(BOSS_ID)!, newProfile())).toEqual(['BACKYARD BOSS', 'HARRISON VS BISCUIT THE DOG', "BONUS: DON'T LET BISCUIT SCORE"]);
  });
  it('kicks off on A, X or Start, and by itself after VS_AUTO_S', () => {
    for (const press of [['confirm'], ['shoot'], ['pause']] as const) {
      const s = createVsScene(testContext(), matchById('backyard-2')!, () => createHubScene(testContext()));
      expect((s.update(frame(press), STEP) as MatchScene).match.id).toBe('backyard-2');
    }
    const s = createVsScene(testContext(), matchById('backyard-2')!, () => createHubScene(testContext()));
    let next = null;
    for (let i = 0; i < Math.round(VS_AUTO_S / STEP) - 1; i++) next = s.update(frame(), STEP) ?? next;
    expect(next).toBeNull();
    expect(s.update(frame(), STEP)?.kind).toBe('match');
  });
  it('B goes back', () => {
    const s = createVsScene(testContext(), matchById('backyard-2')!, () => createHubScene(testContext()));
    expect(s.update(frame(['back']), STEP)?.kind).toBe('hub');
  });
});
```

And in `startMatch.test.ts`: `startMatch` now returns kind `vs`, and a
confirm on it gives the match.

- [ ] **Step 2: Run to see them fail, implement, run to see them pass**

Run: `npx vitest run src/scenes/vsScene.test.ts src/scenes/startMatch.test.ts`

- [ ] **Step 3: Commit**

```bash
git add src/scenes/vsScene.ts src/scenes/vsScene.test.ts src/scenes/startMatch.ts src/scenes/startMatch.test.ts src/scenes/scene.ts
git commit -m "feat: a VS card before every career match"
```

### Task 12: The venue screen

**Files:**
- Create: `src/scenes/venueScene.ts`
- Modify: `src/scenes/startMatch.ts` (B on the VS card returns here)
- Modify: `src/scenes/art.ts` (`art.maxFace`)
- Test: `src/scenes/venueScene.test.ts`

**Interfaces:**
- Consumes: `VENUES`, `matchState`, `nextCareerMatch`, `starsAt`,
  `venueStars`, `VENUE_STARS` (Task 3/5); `trainingLine` (`ladder.ts`);
  `BONUSES`; `startMatch` (Task 11); `drawStars` (Task 9);
  `MAX_HEADS.front` (`art/opponents/max.ts`) for the panel's head, drawn
  through a new `art.maxFace: HTMLCanvasElement` in `art.ts` (the outlined
  front head in Max's colours).
- Produces:
  ```ts
  export interface VenueScene extends Scene { readonly venue: VenueId; readonly cursor: CareerMatch; readonly panelLines: readonly string[] }
  /** The match panel's lines: [`MATCH 7 - MAX`, trainingLine | boss blurb, `BONUS: ...`]. The boss blurb is "HE CAN'T SHOOT. HE JUST RUNS IT IN."; rung 1 has no training line, so two lines. */
  export function panelLines(match: CareerMatch): string[];
  export function createVenueScene(ctx: GameContext, venue: VenueId, cursorId?: string): VenueScene;
  // The cursor starts on `cursorId`'s match, else nextCareerMatch. Left/right move along the venue's matches, wrapping, with 'menuMove'.
  // A on a beaten or next match → 'menuConfirm', startMatch(ctx, match); A (or Start) on a locked one → the 'nope' cue, stays.
  // B or Esc → 'menuBack', createRoadMapScene(ctx) (Task 13; until then, the Hub).
  ```
  (The spec calls the locked-node sound "the back blip"; cues are the
  builder's, and `nope` is the game's sound for "can't", so use it here
  and on the road map.)
  Draw, from the approved mockup (all in 320×180): dim the top 30 rows by
  0.45; venue name at y 4, scale 2, gold, centred; `STARS 9/33` at y 19,
  white, centred, a star picture before it; nodes panel at (8, 32) 304×56;
  rung nodes 20×16 at x = 16 + 24·i, y 44, numbered, with fills
  beaten: ink/silver border/white number, next: ink/gold border/gold
  number, locked: charcoal/outline border/grey number; `NEXT` in gold
  over the next node at y 35; three stars under each node at y 63; the
  boss node 28×28 at (268, 38) in charcoal with his face (a dark
  silhouette of the face until unlocked; part 2 supplies Biscuit's face,
  until then the node shows `?`), `BOSS` under it at y 69; the match
  panel at (8, 96) 304×74 with Max's face at (14, 100), the first line at
  scale 2 beside it, the next lines at y 118 and 132 (scale 1), `STARS`
  and three stars at y 146, and `A PLAY   B BACK` right-aligned to x 306
  at y 146. The Backyard drifts behind, with Harrison juggling
  (`drawBackdrop`). The cursor's node gets a second, outer gold ring.

- [ ] **Step 1: Write the failing tests**

```ts
describe('the venue screen', () => {
  const ctx6 = () => testContext({ profile: { ...newProfile(), ladderWins: 6 } });
  it('opens on the next match, and left/right move along the rungs and the boss, wrapping', () => {
    const s = createVenueScene(ctx6(), 'backyard');
    expect(s.cursor.id).toBe('backyard-7');
    s.update(frame(['right']), STEP);
    expect(s.cursor.id).toBe('backyard-8');
    for (let i = 0; i < 3; i++) s.update(frame(['right']), STEP);
    expect(s.cursor.id).toBe('backyard-boss');
    s.update(frame(['right']), STEP);
    expect(s.cursor.id).toBe('backyard-1');
    s.update(frame(['left']), STEP);
    expect(s.cursor.id).toBe('backyard-boss');
  });
  it('A plays a beaten or next match through the VS card; a locked one only blips', () => {
    const s = createVenueScene(ctx6(), 'backyard', 'backyard-2');
    expect((s.update(frame(['confirm']), STEP) as VsScene).match.id).toBe('backyard-2');
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
  });
  it('B or Esc leaves the venue', () => {
    expect(createVenueScene(ctx6(), 'backyard').update(frame(['back']), STEP)?.kind).toBe('hub');   // 'roadMap' after Task 13
  });
});
```

- [ ] **Step 2: Run to see them fail, implement, run to see them pass**

Run: `npx vitest run src/scenes/venueScene.test.ts src/scenes/startMatch.test.ts`

- [ ] **Step 3: Commit**

```bash
git add src/scenes/venueScene.ts src/scenes/venueScene.test.ts src/scenes/startMatch.ts src/scenes/art.ts
git commit -m "feat: the venue screen with rungs, stars and the boss"
```

### Task 13: The road map

**Files:**
- Create: `src/scenes/roadMapScene.ts`
- Modify: `src/scenes/venueScene.ts` (B goes to the road map),
  `src/scenes/resultsScene.ts` (CAREER goes to the road map)
- Test: `src/scenes/roadMapScene.test.ts`, `src/scenes/venueScene.test.ts`,
  `src/scenes/resultsScene.test.ts`

**Interfaces:**
- Consumes: `VENUES`, `stopLabel`, `careerStars`, `TOTAL_STARS`;
  `createVenueScene`; `drawStar`.
- Produces:
  ```ts
  export interface RoadMapScene extends Scene { readonly index: number }
  export function createRoadMapScene(ctx: GameContext, index = 0): RoadMapScene;
  // Left/right move among the five stops without wrapping ('menuMove' when the index changes). A on the Backyard → 'menuConfirm', createVenueScene(ctx, 'backyard');
  // A on a locked stop → 'nope', stays. B or Esc → 'menuBack', createHubScene(ctx) (its cursor on CAREER, index 0).
  export const STOPS: readonly { cx: number; y: number }[];   // [44,118] [104,100] [164,82] [224,64] [284,46]
  ```
  Draw: the Backyard layers at camera 40 with no juggler, dimmed by 0.35;
  `THE ROAD TO THE CUP` at y 6, scale 2, gold, centred; a star and
  `STARS 9/93` at y 22, centred; a dotted road (2×2 silver dots, 14 per
  leg) between stop centres `(cx, y + 17)`; each stop a 56×34 card at
  `(cx − 28, y)`: the open one a postcard, the layers at camera 0 drawn
  clipped to the card's interior from source offset (118, 64), in a gold
  frame two pixels thick when it holds the cursor; a locked one in
  charcoal with a grey `?` at scale 2; the name under at y + 37 (gold when
  open, grey when locked), then `stopLabel` at y + 46 with a star before
  the Backyard's count; `A ENTER   B BACK` centred at y 168.

- [ ] **Step 1: Write the failing tests**

```ts
describe('the road map', () => {
  it('opens on the Backyard and A enters it', () => {
    const s = createRoadMapScene(testContext());
    expect(s.index).toBe(0);
    expect(s.update(frame(['confirm']), STEP)?.kind).toBe('venue');
  });
  it('left/right move among five stops without wrapping; a locked stop only blips', () => {
    const ctx = testContext();
    const s = createRoadMapScene(ctx);
    s.update(frame(['left']), STEP);
    expect(s.index).toBe(0);
    for (let i = 0; i < 6; i++) s.update(frame(['right']), STEP);
    expect(s.index).toBe(4);
    expect(s.update(frame(['confirm']), STEP)).toBeNull();
    expect(ctx.audio.played).toContain('nope');
  });
  it('B goes to the Hub on CAREER', () => {
    const hub = createRoadMapScene(testContext()).update(frame(['back']), STEP)!;
    expect(hub.kind).toBe('hub');
    expect(hub.update(frame(['confirm']), STEP)?.kind).toBe('roadMap');   // passes once Task 14 lands; until then expect 'match'
  });
  it('B on the venue screen comes back to the map', () => {
    expect(createVenueScene(testContext(), 'backyard').update(frame(['back']), STEP)?.kind).toBe('roadMap');
  });
});
```

Update the venue test's last case to `'roadMap'`, and add to the Results
tests: with everything beaten, CAREER opens a scene of kind `roadMap`.

- [ ] **Step 2: Run to see them fail, implement, run to see them pass**

Run: `npx vitest run src/scenes/roadMapScene.test.ts src/scenes/venueScene.test.ts src/scenes/resultsScene.test.ts`

- [ ] **Step 3: Commit**

```bash
git add src/scenes/roadMapScene.ts src/scenes/roadMapScene.test.ts src/scenes/venueScene.ts src/scenes/venueScene.test.ts src/scenes/resultsScene.ts src/scenes/resultsScene.test.ts
git commit -m "feat: the road map to the Cup"
```

### Task 14: CAREER on the Hub

**Files:**
- Modify: `src/scenes/hubScene.ts`
- Test: `src/scenes/hubScene.test.ts`, `src/scenes/roadMapScene.test.ts`

**Interfaces:**
- Consumes: `createRoadMapScene` (Task 13); `careerCardLines` (Task 3).
- Produces: `HUB_ITEMS = ['CAREER', 'SHOP', 'OPTIONS', 'HELP']`. CAREER →
  `createRoadMapScene(ctx)`. The card's two career lines come from
  `careerCardLines(p)` (the second drawn only when not null). The ladder
  imports in `hubScene.ts` go.

- [ ] **Step 1: Write the failing tests**

Replace the three PLAY MATCH tests with:

```ts
  it('the Hub has CAREER, SHOP, OPTIONS, HELP and no quit', () => {
    expect(HUB_ITEMS).toEqual(['CAREER', 'SHOP', 'OPTIONS', 'HELP']);
  });
  it('CAREER opens the road map, and A there then A plays the next match through the VS card', () => {
    const ctx = testContext({ profile: { ...newProfile(), ladderWins: 4 } });
    const map = createHubScene(ctx).update(frame(['confirm']), STEP)!;
    expect(map.kind).toBe('roadMap');
    const venue = map.update(frame(['confirm']), STEP)!;
    expect(venue.kind).toBe('venue');
    const vs = venue.update(frame(['confirm']), STEP) as VsScene;
    expect(vs.kind).toBe('vs');
    expect(vs.match.id).toBe('backyard-5');
  });
```

Fix the other Hub tests that expected `'match'` from the first item to
expect `'roadMap'`, and the road map's "B goes to the Hub on CAREER"
expectation to `'roadMap'`.

- [ ] **Step 2: Run to see them fail, implement, run the whole suite**

Run: `npm run typecheck && npx vitest run` → PASS.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/hubScene.ts src/scenes/hubScene.test.ts src/scenes/roadMapScene.test.ts
git commit -m "feat: CAREER replaces PLAY MATCH on the Hub"
```

### Task 15: Look at it

**Files:** none new.

- [ ] **Step 1: Build and run the dev server**

Run: `npm run build` (type check and bundle) → clean. Start
`npx vite --port 5179 --strictPort --host 127.0.0.1` in the background
(check `ss -ltnp | rg 5179` first) and open
`http://localhost:5179/SoccerGame/` in Chrome through the Claude in Chrome
tools, as the dev-environment notes describe.

- [ ] **Step 2: Walk the flow with `window.__soccer`**

Stage `ctx.profile` at `ladderWins` 6 with a few stars (through
`ctx.saveProfile`), then Hub → CAREER → road map → venue → VS → match,
pause, QUIT TO HUB. Capture one 320×180 still of the road map and one of
the venue screen (the pixel-exact method in the dev-environment notes),
and compare them with the approved mockups in
`.superpowers/brainstorm/*/content/career-map-shape.html`. Fix layout
drift against the numbers in Tasks 12 and 13.

- [ ] **Step 3: Play one rung to Results**

Stage a quick 2-0 win with a header (set `world.match.clockS` near 89
after scoring through the staging helpers) and check Results: the one-line
header, the stars lighting with chimes, the bonus line, `MATCH 7 BEATEN!`,
and NEXT MATCH going through the VS card to rung 8.

- [ ] **Step 4: Commit any fixes, then hand over**

Run: `npm run typecheck && npx vitest run` → PASS. Commit. Then
part 2 (`2026-10-26-biscuit-the-dog.md`) follows on this branch. Do not
merge or push: part 1 and part 2 ship together, after the parent's
approval.
