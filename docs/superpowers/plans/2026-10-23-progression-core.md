# Progression Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the game its core loop: Press Start → Hub → a Backyard Ladder
match against an improving Max → Results (coins, XP, level-up) → Shop (four
stats) → a harder match. Progress lives in a versioned saved profile. The plan
also fixes Plan 4's seven deferred minors.

**Architecture:** Pure, tested modules in `src/meta/`:
- `storage.ts`, shared by settings and the profile;
- `profile.ts`, the save;
- `economy.ts`, rewards, XP and prices;
- `ladder.ts`, Max's stats per match;
- `progress.ts`, which applies a finished match to the profile.

`GameContext` gains `profile`, `saveProfile` and `today`. The match scene
awards on the tick its phase becomes `fullTime`, then hands a `MatchReward` to
a new Results scene. A new Hub replaces the title menu, and a new Shop sells
stat levels. The simulation is unchanged, except for the diagonal-jump cap.

**Tech Stack:** Vite 8, TypeScript 7 (strict), Canvas 2D, Web Audio, Gamepad
API, Vitest 4. No runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-23-progression-core-design.md`.
Read it first. It wins over this plan if they ever disagree.

## Global Constraints

- No image, audio or font files. On-screen text uses only uppercase letters,
  digits and `' - : ! ? . , / + < >` (e.g. `3 X 10`, never `×` or an em
  dash).
- No runtime dependencies. Vitest runs in Node, with no DOM and no Web Audio.
- 320×180 base resolution, and a fixed 60 Hz simulation. A level-1 Harrison
  against match 1's Max plays exactly as today. The existing headless
  AI-vs-AI tests pass unchanged.
- Rewards: win / draw / loss 60 / 30 / 15. +10 per goal. +15 per style goal
  (header, volley, chip). +20 for a clean sheet. +50 for the first win of the
  local day. XP is the match's coins without the daily bonus. Going from level
  n to n + 1 takes `100 + 50 × (n − 1)` XP. Each level gained pays 50 coins.
- Prices: from level L to L + 1 costs `150 × 1.35^(L − 1)`, rounded to the
  nearest 5. That gives 150, 205, 275, 370, 500, 675, 910, 1225 and 1655.
  Stats run from 1 to 10.
- The ladder is 10 matches. Max's stats per match follow the spec's table.
- The profile key is `harrisons-road-to-the-cup/profile`, at `version: 1`.
  - Load it field by field.
  - Clamp stats to 1–10, the ladder to 0–10, and counts to whole numbers ≥ 0.
  - A save from a newer build is read best-effort and never written over.
  - Level is stored, not derived from XP.
  - Storage that throws never stops the game.
- Rewards are awarded on the tick the match phase becomes `fullTime`. They're
  saved at once, and they're never awarded twice. Quitting or restarting a
  match forfeits its rewards.
- No surname anywhere, and the reference photos never leave `reference/`.
  Only the approved portraits are used.
- Run `git status --short` before every commit. Commits use Conventional
  Commits with a 50/72 message and **no AI attribution trailers**.
- Work on `feat/progression-core`. Ask the parent before every push.

## Review Focus

1. **A reward paid twice or lost.** Results → Shop → back to Results, NEXT
   MATCH, and the match scene being stepped again after full time must never
   save a second award. Closing the tab during the FULL TIME banner must not
   lose it, because it's saved on the `fullTime` tick. *(Task 9 tests.)*
2. **A golden-goal win.** The result settles during the `goal` phase, but the
   award waits for `fullTime`, after Harrison's moment, and is paid once.
   *(Task 9 test.)*
3. **A damaged or odd save.** For example: `coins: -5`, `coins: "lots"`,
   `stats: { speed: '3' }`, a missing `jump`, `level: 0`, `ladderWins: 99`,
   `totals: null`. Each bad field falls back alone, and the rest load.
   *(Task 4 test.)*
4. **A skip press leaking.** On Results:
   - the press that skips the tally must not also choose NEXT MATCH;
   - X still held from the match's last shot must not skip;
   - the match's final Enter must not skip either.
   *(Task 9 tests.)*
5. **Edges of the shop and ladder.**
   - Buying with coins exactly equal to the price leaves 0.
   - A champion (`ladderWins` 10) gets a rematch at match 10's stats.
   - Winning that rematch doesn't push the ladder past 10.
   *(Task 5 and Task 6 tests.)*

---

### Task 1: Sim and screen minors (air cap, flash, Press Start Esc, homeClip)

**Files:**
- Modify: `src/game/player.ts` (`Player`, `createPlayer`, the jump at
  `:278-281`, the `'air'` case at `:304-318`)
- Modify: `src/scenes/matchView.ts` (`MatchHud`, `drawMatch`, `homeClip`)
- Modify: `src/scenes/goalMoment.ts` (remove `FLASH_S` and `flashing`)
- Modify: `src/scenes/matchScene.ts` (set and expose the flash)
- Modify: `src/scenes/titleScene.ts` (`update`)
- Test: `src/game/player.test.ts`, `src/scenes/matchView.test.ts`,
  `src/scenes/goalMoment.test.ts`, `src/scenes/matchScene.test.ts`,
  `src/scenes/titleScene.test.ts`

**Interfaces:**
- Produces:
  - `Player.takeoffSpeed: number`: horizontal speed in px/s at the last
    take-off, 0 from `createPlayer`.
  - `MatchHud.flash: boolean`.
  - `takeFlash(hud: MatchHud): boolean` in `matchView.ts`: returns
    `hud.flash` and clears it.
  - `MatchScene.flash: boolean` (a getter).
  - `homeClip(w, moment)` with no third parameter.

- [ ] **Step 1: Write the failing tests**

  - `player.test.ts` › `'a diagonal take-off steered sideways is no faster than a run'`:
    - Run `harrison()` with `{ moveX: 1, moveZ: 1 }` for `ticks(1)`.
    - Jump with the same stick, then hold `{ moveX: 1, moveZ: 0 }`.
    - On every airborne tick, expect `Math.hypot(p.vx, p.vz) <= runSpeed(p.stats) + 1e-6`.
  - `matchView.test.ts` › `'takeFlash is true once, then false'`: given a
    `MatchHud` with `flash: true`, expect `takeFlash(hud)` to be `true`, then
    `false`.
  - `matchScene.test.ts` › `'the goal flash waits for a drawn frame, however many ticks pass'`:
    - Score a home goal the way the existing goal-moment tests do.
    - Run two more `update`s with no draw.
    - Expect `s.flash` to be `true`.
  - `goalMoment.test.ts`: delete the `flashing` test.
  - `titleScene.test.ts` › `'Esc on Press Start does nothing; Enter and Start still go on'`:
    - `frame(['pause', 'back'])` returns `null`.
    - `frame(['pause', 'confirm'])` and `frame(['pause'])` return a scene.
      Until Task 8 that scene is the title menu.

- [ ] **Step 2: Run them and check they fail**

  Run: `npx vitest run src/game/player.test.ts src/scenes`
  Expected: the four new tests FAIL. The take-off test fails with a speed of
  about 116 against a run of 95.

- [ ] **Step 3: Implement**

  - **Air cap.** At take-off, set `p.takeoffSpeed = Math.hypot(p.vx, p.vz)`.
    In `'air'`:
    - `limit = Math.max(runSpeed(p.stats), p.takeoffSpeed)`;
    - `cap = Math.sqrt(Math.max(limit ** 2 - p.vz ** 2, 0))`;
    - clamp the existing target `target / moveLen` to `[-cap, cap]` before
      `approach`.
  - **Flash.**
    - `MatchHud` gains `flash`. The match scene sets it `true` when it creates
      Harrison's moment.
    - `drawMatch` draws the white overlay when `takeFlash(hud)` is true,
      instead of using `flashing(moment)`.
    - Remove `FLASH_S` and `flashing` from `goalMoment.ts`.
  - **Press Start.** Go on when `confirm` is pressed, or when `pause` is
    pressed without `back`.
  - **homeClip.** Drop the `withCard` parameter and its doc clause.

- [ ] **Step 4: Run the whole suite**

  Run: `npm test && npm run typecheck`
  Expected: all PASS, including the existing diagonal-jump test.

- [ ] **Step 5: Commit** `fix: cap air steering, flash once, Esc on title`

---

### Task 2: The sim at every stat level

**Files:**
- Modify: `src/game/stats.ts` (exports)
- Test: `src/game/ai.test.ts`
- Modify, only if the new tests find a bug: whichever of `src/game/*.ts` it is

**Interfaces:**
- Produces (`stats.ts`):
  - `export type StatName = keyof Stats;`
  - `export const STAT_NAMES: readonly StatName[] = ['speed', 'power', 'jump', 'control'];`
  - `export const MIN_STAT_LEVEL = 1, MAX_STAT_LEVEL = 10;` These replace the
    private `MIN_LEVEL` and `MAX_LEVEL`.

- [ ] **Step 1: Write the failing test**

  In `ai.test.ts`, move the body of the existing whole-match test
  (`'a whole AI-vs-AI match on %s: …'`) into a helper:
  `wholeMatches(difficulty, homeStats: Stats, awayStats: Stats, seeds: number[], bothScore: boolean)`.
  Keep every assertion. "Both sides score" only runs when `bothScore` is set.
  The existing `it.each` calls it with `BASE_STATS` both sides, seeds
  `[21, 22, 23]`, and `bothScore` true.

  Add `it.each` › `'a whole AI-vs-AI match at stats %s vs %s on normal keeps every guarantee'`
  over `[[10, 10], [10, 1], [1, 10]]`:
  - Each side's stats are `{ speed: n, power: n, jump: n, control: n }`.
  - Use seeds `[31, 32, 33]`.
  - `bothScore` is true only for `[10, 10]`.

- [ ] **Step 2: Run it**

  Run: `npx vitest run src/game/ai.test.ts`
  Expected: the refactored test still PASSES. The high-stat tests either pass
  (go to Step 4) or show a real bug.

- [ ] **Step 3: Only if a high-stat case fails**

  Use superpowers:systematic-debugging to find the root cause, which could be
  a ball through a solid, a stuck AI or a NaN. Fix it in the sim. The level-1
  tests and the feel targets must not change.

- [ ] **Step 4: Run the whole suite**

  Run: `npm test`
  Expected: all PASS.

- [ ] **Step 5: Commit** `test: play whole matches at every stat level`
  Or, if Step 3 fixed something: `fix: <the bug> at high stats`.

---

### Task 3: Audio minors and the progression cues

**Files:**
- Create: `src/audio/unlock.ts`, `src/audio/unlock.test.ts`
- Modify: `src/audio/cues.ts` (the `Cue` union and `CUES`),
  `src/scenes/game.ts` (the unlock listeners and the stepper)
- Test: `src/audio/synth.test.ts`, `src/audio/cues.test.ts`

**Interfaces:**
- Produces:
  - `padMayUnlock(nav: { userActivation?: { isActive: boolean } } | undefined): boolean`.
    It's true when `userActivation` is missing, and `isActive` otherwise.
  - New cues: `'coin'`, `'buy'`, `'levelUp'` and `'nope'`.

- [ ] **Step 1: Write the failing tests**

  - `unlock.test.ts`:
    - `padMayUnlock(undefined)` and `padMayUnlock({})` are `true`;
    - `{ userActivation: { isActive: false } }` is `false`;
    - `{ userActivation: { isActive: true } }` is `true`.
  - `synth.test.ts`, using the existing `fakeContext`:
    - `'suspend then resume restarts the crowd and music'`:
      - unlock and `settle()`, then `setCrowd('match')` and
        `playMusic('title')`;
      - `suspend()`, then `resume()` and `settle()`;
      - expect `ctx.state` to be `'running'` and the crowd gain's last value
        to be `CROWD_GAIN.match`.
    - `'resume without a suspend does nothing'`: spy on `ctx.resume`. After
      the unlock, calling `resume()` adds no further call.
    - `'suspending while locked does not unlock on resume'`: never unlock.
      After `suspend()`, `resume()` and `settle()`, `a.unlocked` is `false`.
  - `cues.test.ts`:
    - `'coin ticks are quiet and rate-limited'`: every voice's `gain <= 0.1`,
      and `minGapS >= 0.04`.
    - `'the level-up fanfare ends within 1.5 s'`.

- [ ] **Step 2: Run them and check they fail**

  Run: `npx vitest run src/audio`
  Expected: `unlock.test.ts` fails to import, and the cue tests fail on the
  missing cues. The synth tests may already pass: they cover existing code.
  If one fails, use superpowers:systematic-debugging on `suspend` and
  `resume`.

- [ ] **Step 3: Implement**

  - Write `padMayUnlock`.
  - In `game.ts`:
    - add `window.addEventListener('pointerup', unlock)`;
    - in the stepper, call `audio.unlock()` on a pressed frame only when
      `padMayUnlock(navigator)`.
  - Add the four cues to `CUES`, written like Plan 4's:
    - `coin`: one short high square blip, gain ≤ 0.1, `minGapS` 0.04;
    - `buy`: a two-note rising ka-ching;
    - `levelUp`: a four-note rising major arpeggio, under 1.5 s;
    - `nope`: a low, short square buzz.

- [ ] **Step 4: Run the whole suite**

  Run: `npm test && npm run typecheck`
  Expected: all PASS.

- [ ] **Step 5: Commit** `fix: tidy audio unlock, add progression cues`

---

### Task 4: Shared storage and the profile

**Files:**
- Create: `src/meta/storage.ts`, `src/meta/profile.ts`,
  `src/meta/profile.test.ts`
- Modify: `src/meta/settings.ts` (use `storage.ts`), `src/scenes/game.ts`
  (import `KeyValueStore` from `storage.ts`)
- Test: `src/meta/settings.test.ts` (unchanged, and must still pass)

**Interfaces:**
- Consumes: `Stats`, `BASE_STATS`, `MIN_STAT_LEVEL`, `MAX_STAT_LEVEL` and
  `STAT_NAMES` (Task 2).
- Produces (`storage.ts`):
  - `interface KeyValueStore` (moved from `settings.ts`);
  - `readStored(store: KeyValueStore | null, key: string): unknown`, which
    returns null when the key is missing, unparsable or throws;
  - `isRecord(v: unknown): v is Record<string, unknown>`;
  - `writeUnlessNewer(store: KeyValueStore | null, key: string, value: { version: number }): void`.
    It never throws, and it skips the write when the stored `version` is
    greater than `value.version`.
- Produces (`profile.ts`):
  - `interface Totals { matches; wins; draws; losses; goalsFor; goalsAgainst; styleGoals; xpEarned }`,
    all `number`.
  - `interface Profile { version: 1; coins: number; level: number; xp: number; stats: Stats; ladderWins: number; dailyWinDate: string | null; totals: Totals }`.
    `xp` is the XP toward the next level.
  - `PROFILE_KEY = 'harrisons-road-to-the-cup/profile'`.
  - `LADDER_MATCHES = 10` (exported here, so `ladder.ts` imports it and
    nothing imports in a cycle).
  - `newProfile(): Profile`: 0 coins, level 1, 0 XP, `BASE_STATS`, 0 ladder
    wins, a null date and zero totals.
  - `loadProfile(store: KeyValueStore | null): Profile`.
  - `saveProfile(store: KeyValueStore | null, p: Profile): void`.

- [ ] **Step 1: Write the failing tests** (`profile.test.ts`, using an
  in-memory store like `settings.test.ts` does)

  - `'a missing save is a new profile under a game-specific key'`: compare
    against `newProfile()`. `PROFILE_KEY` starts with
    `'harrisons-road-to-the-cup/'`.
  - `'round-trips every field'`.
  - `'each bad field falls back alone'`: store a version 1 save with these
    bad fields, and good values everywhere else:
    - `coins: -5`;
    - `level: 0`;
    - `xp: 'x'`;
    - `stats: { speed: '3', power: 4, control: 12 }` (no `jump`);
    - `ladderWins: 99`;
    - `dailyWinDate: 7`;
    - `totals: null`.

    Expect these values back, with every good field kept:
    - `coins: 0`, `level: 1`, `xp: 0`;
    - stats `{ speed: 1, power: 4, jump: 1, control: 10 }`;
    - `ladderWins: 10`, `dailyWinDate: null`;
    - zero totals.
  - `'counts are whole numbers'`: `coins: 12.7` loads as `12`.
  - `'a newer save is read best-effort and never written over'`:
    - store `{ version: 2, coins: 300, … }`;
    - `loadProfile` gives `coins: 300`;
    - `saveProfile` with `coins: 0` leaves the stored string unchanged.
  - `'not a save at all loads a new profile'`: covers `'[]'`, `'null'`,
    `'{"version":"1"}'`, and broken JSON.
  - `'survives a store that throws'`: `getItem` and `setItem` both throw.
    `loadProfile` returns `newProfile()`, and `saveProfile` doesn't throw.
  - `'returns a fresh copy'`: changing the result's `stats` doesn't change the
    next `loadProfile` or `newProfile()`.

- [ ] **Step 2: Run them and check they fail**

  Run: `npx vitest run src/meta`
  Expected: `profile.test.ts` fails to import.

- [ ] **Step 3: Implement**

  - Move `readStored`, `isRecord` and the newer-version guard out of
    `settings.ts` into `storage.ts`. Settings keeps its behaviour exactly.
  - `loadProfile` reads any record whose `version` is a number ≥ 1, field by
    field, using small clamping helpers. Anything else gives `newProfile()`.
  - `saveProfile` is `writeUnlessNewer(store, PROFILE_KEY, p)`.

- [ ] **Step 4: Run the whole suite**

  Run: `npm test && npm run typecheck`
  Expected: all PASS, with `settings.test.ts` unchanged.

- [ ] **Step 5: Commit** `feat: save a versioned player profile`

---

### Task 5: Economy (rewards, XP, prices, buying)

**Files:**
- Create: `src/meta/economy.ts`, `src/meta/economy.test.ts`

**Interfaces:**
- Consumes: `Profile` (Task 4), and `StatName` and `MAX_STAT_LEVEL` (Task 2).
- Produces:
  - `type StyleKind = 'header' | 'volley' | 'chip'`.
  - `interface MatchSummary { result: 'win' | 'draw' | 'lose'; goalsFor: number; goalsAgainst: number; styleGoals: readonly StyleKind[] }`.
  - `interface RewardLine { label: string; coins: number }`.
  - The constants `RESULT_COINS = { win: 60, draw: 30, lose: 15 }`,
    `GOAL_COINS = 10`, `STYLE_COINS = 15`, `CLEAN_SHEET_COINS = 20`,
    `DAILY_WIN_COINS = 50` and `LEVEL_UP_COINS = 50`.
  - `matchLines(s: MatchSummary, dailyWin: boolean): RewardLine[]`, in this
    order:
    1. the result: `'WIN'`, `'DRAW'` or `'LOSS'`;
    2. the goals, when there are any: `'1 GOAL'` or `'3 GOALS'`;
    3. one line per style kind present, in the order header, volley, chip:
       `'HEADER'` for one, or `'2 HEADERS'` with that kind's total coins;
    4. `'CLEAN SHEET'`, when Max scored none;
    5. `'FIRST WIN TODAY'`, when `dailyWin` is true.
  - `matchXp(lines: readonly RewardLine[]): number`: the sum of every line
    except `'FIRST WIN TODAY'`.
  - `xpToNext(level: number): number`: `100 + 50 × (level − 1)`.
  - `addXp(level: number, xp: number, gain: number): { level: number; xp: number; levelsGained: number }`.
  - `statPrice(level: number): number | null`:
    `Math.round(150 * 1.35 ** (level - 1) / 5) * 5`, or `null` at
    `MAX_STAT_LEVEL`.
  - `cheapestUpgrade(p: Profile): number | null`.
  - `buyStat(p: Profile, stat: StatName): Profile | null`. It returns a new
    profile, or `null` at the maximum level or when he can't afford it. It
    never changes `p`.
  - `STAT_INFO: Record<StatName, { label: string; blurb: string }>`:
    - SPEED: `'RUN AND SPRINT FASTER'`;
    - POWER: `'HARDER SHOTS, QUICKER CHARGE'`;
    - JUMP: `'JUMP HIGHER FOR HEADERS'`;
    - CONTROL: `'KEEP THE BALL CLOSE'`.

- [ ] **Step 1: Write the failing tests**

  - `'a 3-1 win with a header and a chip'`: `matchLines` gives
    `[['WIN', 60], ['3 GOALS', 30], ['HEADER', 15], ['CHIP', 15]]`, as
    label/coins pairs.
  - `'a 0-0 draw keeps a clean sheet'`: `[['DRAW', 30], ['CLEAN SHEET', 20]]`.
  - `'a hat-trick of headers groups them'`: includes `['3 HEADERS', 45]`.
  - `'a loss with no goals still pays'`: `[['LOSS', 15]]`.
  - `'the daily bonus pays coins but no XP'`: with `dailyWin`, the last line
    is `['FIRST WIN TODAY', 50]`, and `matchXp` excludes it.
  - `'XP to the next level climbs by 50'`: `xpToNext(1)` is `100`,
    `xpToNext(2)` is `150`, and `xpToNext(9)` is `500`.
  - `'addXp carries over and can gain several levels'`:
    - `addXp(1, 90, 20)` gives `{ level: 2, xp: 10, levelsGained: 1 }`;
    - `addXp(1, 0, 260)` gives `{ level: 3, xp: 10, levelsGained: 2 }`.
  - `'prices match the spec table'`: `statPrice` for levels 1 to 9 is
    `[150, 205, 275, 370, 500, 675, 910, 1225, 1655]`, and `statPrice(10)` is
    `null`.
  - `'buying spends coins and raises one stat'`: with 150 coins and speed 1,
    buying speed gives speed 2, 0 coins, and the other stats unchanged.
    Covers *Review Focus 5*.
  - `'cannot buy short of coins or past level 10'`: both return `null`, and
    the input is untouched.
  - `'cheapestUpgrade ignores maxed stats'`.

- [ ] **Step 2: Run them and check they fail**

  Run: `npx vitest run src/meta/economy.test.ts`
  Expected: it fails to import.

- [ ] **Step 3: Implement** the signatures above in `src/meta/economy.ts`.

- [ ] **Step 4: Run it and check it passes**

  Run: `npx vitest run src/meta`
  Expected: PASS.

- [ ] **Step 5: Commit** `feat: add rewards, levels and stat prices`

---

### Task 6: The Backyard Ladder and applying a match

**Files:**
- Create: `src/meta/ladder.ts`, `src/meta/ladder.test.ts`,
  `src/meta/progress.ts`, `src/meta/progress.test.ts`

**Interfaces:**
- Consumes: `Profile`, `LADDER_MATCHES` (Task 4), `Stats`, `STAT_NAMES`
  (Task 2), and everything from Task 5.
- Produces (`ladder.ts`):
  - `LADDER_STATS: readonly Stats[]`: the spec's table, where index 0 is
    match 1.
  - `nextMatch(ladderWins: number): number`: `min(ladderWins + 1, LADDER_MATCHES)`.
  - `maxStats(match: number): Stats`: a copy.
  - `isChampion(ladderWins: number): boolean`.
  - `trainingLine(match: number): string | null`. It's `null` for match 1.
    Otherwise it's `'MAX HAS BEEN TRAINING: <LABELS> UP'`, where the labels
    are the `STAT_INFO` labels of every stat that rose, joined by `' AND '`.
  - `nextMatchLine(ladderWins: number): string`.
    - Before he's champion: `'NEXT: MAX - MATCH <n>/10'`.
    - After: `'CHAMPION! REMATCH: MAX'`.
- Produces (`progress.ts`):
  - `interface MatchReward`:
    - `summary: MatchSummary`;
    - `lines: RewardLine[]`;
    - `levelBonus: number`;
    - `coins: number`: the total added, `sum(lines) + levelBonus`;
    - `xp: number`;
    - `before` and `after`, each `{ coins: number; level: number; xp: number }`;
    - `ladder: { match: number; beaten: boolean; champion: boolean }`;
    - `upgradeReady: boolean`.
  - `applyMatch(p: Profile, s: MatchSummary, match: number, today: string): { profile: Profile; reward: MatchReward }`.
    It is pure: it never changes `p`.
  - `localDate(d: Date): string`: the local `'YYYY-MM-DD'`.

- [ ] **Step 1: Write the failing tests**

  `ladder.test.ts`:
  - `'match 1 is Max as he is today'`: `maxStats(1)` equals `BASE_STATS`.
  - `'Max never gets weaker and stays in 1–10'`.
  - `'the table matches the spec'`: match 10 is
    `{ speed: 4, power: 4, jump: 2, control: 3 }`.
  - `'the next match follows wins, and a champion gets match 10'`:
    `nextMatch` of 0, 3 and 10 is 1, 4 and 10.
  - `'training line names what rose'`:
    - `trainingLine(1)` is `null`;
    - `trainingLine(3)` is `'MAX HAS BEEN TRAINING: POWER UP'`.
  - `'next-match line'`: `nextMatchLine(2)` is `'NEXT: MAX - MATCH 3/10'`, and
    `nextMatchLine(10)` is `'CHAMPION! REMATCH: MAX'`.

  `progress.test.ts`:
  - `'a first win pays, levels and advances the ladder'`:
    - Start from `newProfile()` and a 3-0 win with no style goals, on match
      1, today `'2026-10-23'`.
    - Coins: 60 + 30 + 20 + 50 = 160, plus a 50 level bonus = 210.
    - XP 110 → level 2 with 10 XP.
    - `ladderWins` becomes 1, and `reward.ladder.beaten` is true.
    - `dailyWinDate` becomes `'2026-10-23'`.
    - The totals count the match, the win, 3 goals for, 0 against and 110 XP
      earned.
  - `'the daily bonus pays once a day'`: a second win the same day has no
    `'FIRST WIN TODAY'` line. A win dated the next day has it.
  - `'a draw or a loss pays but does not advance the ladder'`.
  - `'winning match 10 makes him champion, and a rematch win stays at 10'`.
    Covers *Review Focus 5*:
    - with `ladderWins` 9, a win on match 10 gives `champion` and `beaten`
      true, and `ladderWins` 10;
    - again from 10, a win gives `beaten` false and `ladderWins` 10.
  - `'a win on an already-beaten match does not skip ahead'`: with
    `ladderWins` 3, a win on match 2 leaves it at 3.
  - `'upgradeReady when he can afford any stat'`.
  - `'applyMatch does not change its input'`.
  - `'localDate is the local calendar date'`:
    `localDate(new Date(2026, 9, 3, 23, 59))` is `'2026-10-03'`.

- [ ] **Step 2: Run them and check they fail**

  Run: `npx vitest run src/meta`
  Expected: the two new files fail to import.

- [ ] **Step 3: Implement**

  `applyMatch` does this:
  1. Daily win = a win and `p.dailyWinDate !== today`.
  2. Get `matchLines` and `matchXp`.
  3. `addXp`, then the level bonus.
  4. Coins.
  5. The ladder: it's beaten only if he won and
     `match === nextMatch(p.ladderWins)` and he isn't champion yet.
  6. The totals.
  7. `upgradeReady` from `cheapestUpgrade(after)`.

- [ ] **Step 4: Run them and check they pass**

  Run: `npx vitest run src/meta`
  Expected: PASS.

- [ ] **Step 5: Commit** `feat: add the Backyard Ladder and match rewards`

---

### Task 7: Context wiring and the Shop

**Files:**
- Modify: `src/scenes/context.ts`, `src/scenes/game.ts`,
  `src/scenes/scene.ts` (`SceneKind`), `src/scenes/art.ts` (`portraits`)
- Create: `src/scenes/testContext.ts`, `src/scenes/shopScene.ts`,
  `src/scenes/shopScene.test.ts`
- Modify (tests): `src/scenes/matchScene.test.ts`, `helpScene.test.ts`,
  `optionsScene.test.ts`, `titleScene.test.ts`, `titleMenuScene.test.ts`.
  Each switches its inline context to `testContext()`.

**Interfaces:**
- Consumes: `Profile`, `loadProfile` and `saveProfile` (Task 4), `buyStat`,
  `statPrice` and `STAT_INFO` (Task 5), `localDate` (Task 6), and
  `STAT_NAMES` (Task 2).
- Produces:
  - `GameContext` gains three members:
    - `profile: Profile`;
    - `saveProfile(p: Profile): void`, which sets `ctx.profile` and then
      stores it;
    - `today(): string`.
  - `GameArt.portraits: Record<Expression, HTMLCanvasElement>` replaces
    `portrait`. It holds all four expressions in the home kit palette.
  - `SceneKind` gains `'hub'`, `'results'` and `'shop'`.
  - `testContext(over?: Partial<GameContext>): GameContext & { audio: ReturnType<typeof recordingAudio>; savedProfiles: Profile[] }`.
    It uses default settings and `newProfile()`. `today()` returns
    `'2026-10-23'`. `saveProfile` records each save and sets `profile`.
  - `createShopScene(ctx: GameContext, back: () => Scene): ShopScene`.
    `ShopScene` has `readonly row: number` and `readonly message: string | null`.
  - `shopRow(stat: StatName, p: Profile): string`: `'SPEED  LV 2  205'`, or
    `'SPEED  LV 10  MAX'` at the top.
  - In the dev build, `window.__soccer` gains `ctx`, so a playtester can stage
    a profile.

- [ ] **Step 1: Write the failing tests** (`shopScene.test.ts`)

  - `'lists the four stats in order'`: covers `shopRow` for each of
    `STAT_NAMES` on a new profile, e.g. `'SPEED  LV 1  150'`.
  - `'A buys the selected stat, saves at once and plays buy'`: with 200
    coins, the confirm press leaves `ctx.profile.stats.speed` at 2 and coins
    at 50. `savedProfiles` has length 1, and `audio.played` includes `'buy'`.
  - `'short of coins: nope, a message, nothing saved'`: with 100 coins,
    `message` is `'NEED 50 MORE'` and `'nope'` plays.
  - `'at level 10: nope, nothing saved'`.
  - `'up and down pick a stat, wrapping'`.
  - `'B or Esc goes back with the back blip'`: `frame(['back'])` and
    `frame(['pause', 'back'])` both return `back()`, and `'menuBack'` plays.
  - `'plays the title theme'`.

- [ ] **Step 2: Run them and check they fail**

  Run: `npx vitest run src/scenes`
  Expected: `shopScene.test.ts` fails to import. The other scene tests fail
  type-checking until they use `testContext`.

- [ ] **Step 3: Implement**

  - **Context.** `game.ts` builds `profile: loadProfile(store)`,
    `saveProfile(p)` and `today: () => localDate(new Date())`.
  - **Tests.** Every scene test builds its context with `testContext()`.
  - **Shop.**
    - Use `backsOut` for B and Esc, and the `stepMenu` up/down pattern.
    - A press on `confirm` calls `buyStat`. On success it calls
      `ctx.saveProfile` and plays `'buy'`. Otherwise it plays `'nope'` and
      sets `message`:
      - `'NEED <n> MORE'` when he's short;
      - `'MAX LEVEL'` at the top.
    - Draw on `drawBackdrop`, in a panel like Options:
      - **SHOP** at the top, with `COINS <n>` beside it;
      - the four `shopRow`s, with ten pips per stat (gold up to his level,
        dark after);
      - the selected stat's `STAT_INFO.blurb`;
      - `message`, when set;
      - the B BACK footer, as in Options.

- [ ] **Step 4: Run the whole suite**

  Run: `npm test && npm run typecheck`
  Expected: all PASS.

- [ ] **Step 5: Commit** `feat: add the profile to the game and a shop`

---

### Task 8: The Hub, and matches use the profile

**Files:**
- Create: `src/scenes/hubScene.ts`, `src/scenes/hubScene.test.ts`
- Delete: `src/scenes/titleMenuScene.ts`, `src/scenes/titleMenuScene.test.ts`.
  Port each title-menu test to the Hub.
- Modify: `src/scenes/titleScene.ts` (go to the Hub), `src/scenes/scene.ts`
  (drop `'titleMenu'`), `src/scenes/matchScene.ts` (stats, `PAUSE_ITEMS`,
  quit), `src/scenes/helpScene.test.ts`, `src/scenes/optionsScene.test.ts`
- Test: `src/scenes/matchScene.test.ts`, `src/scenes/titleScene.test.ts`

**Interfaces:**
- Consumes: `testContext` and `createShopScene` (Task 7), and `nextMatch`,
  `maxStats`, `trainingLine` and `nextMatchLine` (Task 6).
- Produces:
  - `HUB_ITEMS = ['PLAY MATCH', 'SHOP', 'OPTIONS', 'HELP'] as const`.
  - `createHubScene(ctx: GameContext, index = 0): Scene`, of kind `'hub'`.
  - `MatchScene.ladderMatch: number`: the ladder match being played, fixed
    when the scene is created.
  - `newSeed(): number` moves from `titleMenuScene.ts` to `matchScene.ts` and
    is exported. The Hub and Results both use it.
  - `PAUSE_ITEMS` becomes
    `['RESUME', 'RESTART', 'HELP', 'OPTIONS', 'QUIT TO HUB']`.

- [ ] **Step 1: Write the failing tests**

  - `hubScene.test.ts`: port every `titleMenuScene.test.ts` case, with the
    Hub in place of the title menu and `PLAY MATCH` in place of
    `START GAME`. Add:
    - `'Press Start, A or Enter opens the Hub'`;
    - `'SHOP opens the shop, and B there comes back to the Hub on SHOP'`;
    - `'the Hub turns the crowd off and plays the title theme'`.
  - `matchScene.test.ts`:
    - `'Harrison plays with his bought stats'`: with a profile whose speed
      is 4, `s.world.home.stats.speed` is 4.
    - `'Max plays with the next ladder match’s stats'`: with `ladderWins` 2,
      `s.ladderMatch` is 3 and `s.world.away.stats` equals `maxStats(3)`.
    - `'a champion gets match 10'`: with `ladderWins` 10, `ladderMatch` is
      10.
    - Update the pause menu list test. The quit test becomes
      `'QUIT TO HUB goes to the Hub with the crowd off and saves nothing'`:
      `savedProfiles` is empty.

- [ ] **Step 2: Run them and check they fail**

  Run: `npx vitest run src/scenes`

- [ ] **Step 3: Implement**

  - **Hub behaviour.** The title menu's behaviour moves over unchanged:
    - Start confirms, and so does Enter;
    - B and Esc go to Press Start;
    - Help and Options come back on their own item.
  - **Hub draw.**
    - `drawBackdrop`, then a panel holding `art.portraits.neutral` (64×64).
    - `HARRISON` at scale 2.
    - `LEVEL <n>` with an XP bar (`xp / xpToNext(level)`), and
      `COINS <n>`.
    - `SPD <n>  PWR <n>  JMP <n>  CTL <n>`.
    - `nextMatchLine`, and `trainingLine` when it isn't null.
    - The menu, drawn with `drawMenu`.
  - **Match scene.**
    - Create the world with `ctx.profile.stats` for Harrison and
      `maxStats(ladderMatch)` for Max.
    - QUIT TO HUB returns `createHubScene(ctx)`.

- [ ] **Step 4: Run the whole suite**

  Run: `npm test && npm run typecheck`
  Expected: all PASS. No file imports `titleMenuScene`.

- [ ] **Step 5: Commit** `feat: add the hub and play with bought stats`

---

### Task 9: Awards at full time, and the Results screen

**Files:**
- Create: `src/scenes/resultsScene.ts`, `src/scenes/resultsScene.test.ts`
- Modify: `src/scenes/matchScene.ts` (track style goals, award, hand off to
  Results, remove the full-time menu, `RESULT_TEXT` and `FULL_TIME_ITEMS`)
- Test: `src/scenes/matchScene.test.ts`

**Interfaces:**
- Consumes: `applyMatch`, `MatchReward` and `StyleKind` (Tasks 5–6),
  `xpToNext`, `createHubScene` and `createShopScene`, and `LastKick` from
  `goalCallout.ts`.
- Produces:
  - `MatchScene.reward: MatchReward | null`.
  - `LINE_S = 0.3` and `XP_FILL_S = 0.8`: the tally's beats, in seconds.
  - `tallyAt(reward: MatchReward, t: number)`, which returns:
    - `lines: number`: how many reward lines are showing;
    - `xpDone: boolean`;
    - `levelUp: boolean`;
    - `done: boolean`.

    Lines appear one every `LINE_S`. Then the XP bar fills over `XP_FILL_S`.
    Then the level-up shows, if any. It's done one `LINE_S` later.
  - `ladderLine(reward: MatchReward): string`:
    - `'BACKYARD CHAMPION!'` when beaten and champion;
    - `'MATCH <m> BEATEN!'` when beaten;
    - `'REMATCH WON!'` for a win that didn't advance;
    - a try-again line otherwise, e.g. `'MAX TAKES THIS ONE. GO AGAIN!'`
      (the builder's wording).
  - `resultsItems(reward)`: `[win ? 'NEXT MATCH' : 'TRY AGAIN', 'SHOP', 'HUB']`.
  - `createResultsScene(ctx: GameContext, reward: MatchReward, skipTally = false): ResultsScene`.
    `ResultsScene` has `readonly tallyDone: boolean` and
    `readonly menu: MenuState | null`.

- [ ] **Step 1: Write the failing tests**

  `matchScene.test.ts`:
  - **Replace** `'offers play again after full time'` with
    `'full time awards once, then Results follows the banner'`:
    - Make the match live, set `clockS: 89.99` and a score of 2–1.
    - Run 0.1 s. `phase` is `'fullTime'`, `savedProfiles.length` is 1, and
      `s.reward` isn't null.
    - Run another 2 s, keeping the scenes returned. A `'results'` scene came
      back, and `savedProfiles.length` is still 1.
    - Covers *Review Focus 1*.
  - `'a golden-goal win is awarded once, after the moment'`: build on the
    existing golden-goal test. `savedProfiles` stays empty while `phase` is
    `'goal'`, and has length 1 once it's `'fullTime'`. Covers *Review Focus
    2*.
  - `'a header goal counts as a style goal'`: stage a header the way the
    `goalCallout` tests do and score. At full time,
    `s.reward!.summary.styleGoals` is `['header']`.
  - `'RESTART forfeits the match'`: `savedProfiles` is empty.
  - The existing jingle tests stay as they are. The jingle now comes from
    `createResultsScene`, so they must still pass.

  `resultsScene.test.ts`, using a reward built with `applyMatch` on
  `newProfile()`:
  - `'opening Results plays the result jingle'`: `audio.music` is
    `reward.summary.result`.
  - `'the tally shows a line every LINE_S with a coin tick'`: after
    `LINE_S × 2 + ε`, `tallyAt` shows 2 lines and 2 `'coin'` cues have
    played.
  - `'a level-up plays the fanfare once'`: `'levelUp'` appears in
    `audio.played` exactly once by the end.
  - `'a fresh A skips to the end without choosing'`: `frame(['confirm'])` at
    t = 0.1 gives `tallyDone` true, a non-null `menu`, and a `null` return.
    Covers *Review Focus 4*.
  - `'held buttons do not skip'`: 1 s of `frame([], ['shoot'])` and then
    `frame([], ['confirm'])` don't finish the tally before
    `tallyAt(...).done`. Covers *Review Focus 4*.
  - `'NEXT MATCH plays the next ladder match'`: once the tally is done,
    `confirm` returns a `'match'` scene whose `ladderMatch` is
    `nextMatch(ctx.profile.ladderWins)`.
  - `'a loss offers TRY AGAIN'`.
  - `'SHOP and back returns to Results, done, with no second save'`:
    `savedProfiles` is unchanged, and the returned scene is `'results'` with
    `tallyDone` true. Covers *Review Focus 1*.
  - `'B goes to the Hub with the back blip'`: Plan 4 minor 6.
  - `'ladderLine'`: covers the beaten, champion and rematch strings.

- [ ] **Step 2: Run them and check they fail**

  Run: `npx vitest run src/scenes`

- [ ] **Step 3: Implement**

  - **Match scene, at each home goal.** Before `lastKick` resets, push
    `lastKick.kind` to a `styleGoals` list when it's `header`, `volley` or
    `chip`.
  - **Match scene, at full time.** Once `world.match.phase === 'fullTime'`
    with a result and no reward yet:
    - build the summary from the score;
    - call `applyMatch(ctx.profile, summary, ladderMatch, ctx.today())`;
    - pass the result to `ctx.saveProfile`;
    - keep the reward.
  - **Match scene, hand-off.** At `RESULT_DELAY_S`, return
    `createResultsScene(ctx, reward)`.
  - **Results update.**
    - Step `t` and fire the cues each tally beat crosses:
      - `'coin'` per line;
      - `'coin'` as the total lands;
      - `'levelUp'` when the level-up shows.
    - A fresh `confirm` or `shoot` before the tally is done skips to the end,
      and that tick returns `null`.
    - Once the tally is done, the menu steps like the others.
    - `backsOut` goes to the Hub at any time, even mid-tally, since the reward
      is already saved.
  - **Results draw.**
    - Use the Backyard backdrop with a dark panel.
    - At the top: the result (`YOU WIN!`, `DRAW`, `YOU LOSE`) at scale 2, and
      `H - A` under it.
    - On the left: `art.portraits` (`celebrate`, `determined` or
      `disappointed`).
    - On the right:
      - the shown lines as `LABEL +N`;
      - `COINS +<n>`;
      - the XP bar;
      - `LEVEL UP! LEVEL <n>` with `LEVEL BONUS +<levelBonus>`;
      - `ladderLine`;
      - `UPGRADE READY IN THE SHOP!` when `upgradeReady`.
    - The menu below.

- [ ] **Step 4: Run the whole suite**

  Run: `npm test && npm run typecheck`
  Expected: all PASS.

- [ ] **Step 5: Commit** `feat: award coins and XP with a results screen`

---

### Task 10: Playtest, show the parent, and hand over

**Files:** none, unless the playtest finds a bug. Fix one with a test first,
using superpowers:systematic-debugging.

- [ ] **Step 1: Verify**

  Run: `npm test && npm run build`
  Expected: all tests PASS, and the build succeeds.

- [ ] **Step 2: Chrome playtest of the loop**

  - Start Vite as in the memory notes. Check port 5179 first.
  - Load the game in a fresh tab with an empty profile, then play the loop:
    - Press Start, then the Hub, showing LEVEL 1, COINS 0 and
      `NEXT: MAX - MATCH 1/10`.
    - Stage a win by setting the clock and score through
      `__soccer.scene().world.match`.
    - FULL TIME, then Results with a level-up.
    - Open the Shop from Results and buy SPEED.
    - Back to Results, then NEXT MATCH. Max now has match 2's stats.
  - Reload the page. The Hub still shows the new level, coins and speed.
  - Check Esc on Press Start, Esc on the Hub, and B on Results.

- [ ] **Step 3: Show the parent.** Send screenshots of the Hub, Results (with
  a level-up) and the Shop through SendUserFile. Saving them with `computer
  zoom` and `save_to_disk` avoids a browser download. Fix anything they flag
  before Step 4.

- [ ] **Step 4: Finish the branch.** Use
  superpowers:finishing-a-development-branch. **Ask the parent before merging
  into `main` and before any push.** Auto mode blocks the merge without that
  approval.

- [ ] **Step 5: Update memory.** Update `harrison-soccer-status.md`:
  - what shipped;
  - that Harrison's first live load creates his profile, so the
    save-compatibility rules now bind;
  - any deferred minors;
  - the next candidates: Career mode, or a power-move slice first (the
    parent's call), the owed save code, and the by-ear sound retune.
