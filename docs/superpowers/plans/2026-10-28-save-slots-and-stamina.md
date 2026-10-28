# Save Slots and Stamina Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Five named save slots, each with its own difficulty, that
Harrison can create, play, switch between and delete (with a confirm),
his live save becoming save 1; and Stamina, a fifth Shop stat that makes
his sprint last longer, guarded so it can't undo a boss's lesson.

**Architecture:**
- **Stamina** is a fifth field on `Stats`, scaled by `curve` like the
  others. `staminaDrain`/`staminaRegen` replace the two constants in
  `player.ts`; level 1 returns them exactly. Every opponent's stats carry
  `stamina: 1`, and `harrisonStatsFor` leaves Stamina at the opponent's,
  so every scripted match plays as today.
- **Profile v5** adds `name`, `difficulty` and `stats.stamina`.
  `profileFrom(v, fallbackDifficulty)` takes the difficulty a save
  without one should get (the settings' difficulty). The save code keeps
  its four stats in their v1 place through its own `CODE_STATS` list and
  appends Stamina, then difficulty.
- **Slots** live in `src/meta/saveSlots.ts`: keys, read, list, write,
  remove, the last save played, and following another tab. A save that
  storage refused is kept in memory for the session.
- **The context plays one slot:** `GameContext` gains `slot` and `saves`.
  `saveProfile` writes to `ctx.slot`. `openSave(ctx, slot, p)` switches
  saves. Matches and Options read and write `ctx.profile.difficulty`.
- **Screens:** `savesScene.ts` (the list and the info box),
  `newSaveScene.ts` and `deleteSaveScene.ts`. PRESS START and the Hub
  lead to SAVES. RESET SAVE is deleted.

**Tech Stack:** Vite 8, TypeScript 7 (strict), Canvas 2D, Vitest 4. No
runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-28-save-slots-and-stamina-design.md`.
It wins over this plan if they ever disagree.

## Global Constraints

- **Every existing tuning test passes unchanged:** `maxTuning`,
  `crewTuning`, `samTuning`, `dogTuning` and `trickTuning`, the AI-vs-AI
  tests in `ai.test.ts`, the no-kit parity test, and the snapshots in
  `world.test.ts`. The only edit allowed in them is adding `stamina: 1`
  to literal stats.
- **Stamina level 1 is today's sprint, exactly:** drain 0.5/s, regen
  0.3/s (`curve(1, …)` returns `atMin`). Level 10 is drain 0.25, regen
  0.45. The 0.25 recovery threshold doesn't change.
- **Every opponent is at Stamina 1:** Max's ladder rows, the crew, Sam,
  the dog's `TUNING_STATS` and `SAM_TUNING_STATS`. Scripted Harrisons
  stay at Stamina 1.
- **The save rules:**
  - The version bumps to 5.
  - Nothing earned or bought is taken back; a confirmed delete is his
    choice.
  - The code's fields are append-only. **Stamina never joins the code
    through `STAT_NAMES`.**
  - Storage that throws never stops the game.
  - `profileFrom` loads field by field and caps.
- **Keys:**
  - Slot 1 is `harrisons-road-to-the-cup/profile`, today's key.
  - Slots 2–5 are `harrisons-road-to-the-cup/profile-2` to `-5`.
  - The last save played is at `harrisons-road-to-the-cup/last-save`,
    stored as `{ version: 1, slot: n }`.
  - Settings stay v2 and keep `difficulty`, read only as the loader's
    fallback. Nothing writes it any more.
- **Names:** up to 12 of `A–Z 0–9` and space. A loaded save whose name
  is missing or bad is `HARRISON`. A blank name on NEW SAVE becomes
  `SAVE n`.
- **On-screen text** uses only uppercase letters, digits and
  `' - : ! ? . , / + < >`. No parentheses.
- **No image, audio or font files, and no surname anywhere.**
- **Commits:**
  - Conventional Commits, 50/72, following the `commit-messages` skill.
  - No AI attribution trailers.
  - Run `git status --short` before each commit: reference photos must
    never be staged.
- **One branch, one merge.** Ask the parent before every merge into
  `main` and every push, because the push publishes to Pages.

## Review Focus

1. **His live save.** Slot 1 holds his v4 save and the settings say
   EASY. SAVES must show it as `HARRISON` and `EASY - LEVEL n` with
   every coin, star and stat. PLAY stores it as v5 with all of it. The
   Park playtest code still loads. Tests: Tasks 3 and 8.
2. **Typing a name with the game's keys.**
   - Z, C, X, V, A, D and F type letters: Z doesn't confirm and C
     doesn't go back.
   - Backspace deletes and doesn't leave. Space types a space.
   - Shift alone does nothing. The arrows move between rows without
     typing. Esc leaves.
   - Tests: Task 6.
3. **Switching saves.** Progress, Shop buys and Options' DIFFICULTY
   land only in the save being played. The other save stays as it was
   left, and the settings are never written. Test: Task 8.
4. **No storage, or a newer build's save in a slot.** NEW SAVE, PLAY and
   DELETE never throw. A save made without storage shows in its slot
   for the session. A newer build's save is never overwritten or
   deleted. Tests: Tasks 4 and 7.
5. **One press, one action.**
   - The A or Enter that opens the info box, NEW SAVE or DELETE SAVE
     doesn't also act on it.
   - DELETE SAVE opens on NO.
   - A NEW SAVE made right after playing a rich save carries nothing
     over from it.
   - Tests: Tasks 6, 7 and 8.

---

### Task 1: Stamina, the fifth stat

**Files:**
- Modify:
  - Stats and the sprint: `src/game/stats.ts`, `src/game/player.ts`
  - Opponents at Stamina 1: `src/meta/ladder.ts`, `src/game/crew.ts`,
    `src/game/sam.ts`, `src/game/dog.ts`, `src/game/samScripts.ts`
  - Scripted Harrisons: `src/game/maxScripts.ts`
  - The Shop, Hub and Help: `src/meta/economy.ts`,
    `src/scenes/shopScene.ts`, `src/scenes/hubScene.ts`,
    `src/scenes/helpScene.ts`
  - The code's stats: `src/meta/saveCode.ts`
- Test: `stats.test.ts`, `player.test.ts`, `opponents.test.ts`,
  `maxScripts.test.ts`, `economy.test.ts`, `saveCode.test.ts`,
  `shopScene.test.ts`, `hubScene.test.ts`, `matchScene.test.ts`. Also
  every test with literal stats (`npm run typecheck` lists them), and
  `ai.test.ts`'s `allAt`.

**Interfaces:**
- Produces:
  ```ts
  // stats.ts
  interface Stats { speed: number; power: number; jump: number; control: number; stamina: number }
  STAT_NAMES = ['speed', 'power', 'jump', 'control', 'stamina'];
  BASE_STATS = { speed: 1, power: 1, jump: 1, control: 1, stamina: 1 };
  /** Sprint spent per second: a full bar lasts 2 s at level 1, 4 s at level 10. */
  export const staminaDrain = (s: Stats): number => curve(s.stamina, 0.5, 0.25);
  /** Sprint won back per second, not sprinting. */
  export const staminaRegen = (s: Stats): number => curve(s.stamina, 0.3, 0.45);
  // economy.ts
  STAT_INFO.stamina = { label: 'STAMINA', blurb: 'SPRINT LONGER, GET YOUR BREATH BACK FASTER' };
  // saveCode.ts (module-private)
  /** The four stats every code carries mid-list, in their v1 order. Stamina is appended at the end (v5). */
  const CODE_STATS: readonly StatName[] = ['speed', 'power', 'jump', 'control'];
  // hubScene.ts
  statsLine(s): 'SPD 7  PWR 5  JMP 4  CTL 5  STA 3'
  ```

- [ ] **Step 1: Write the failing tests**
  - `stats.test.ts`:
    - `staminaDrain(BASE_STATS)` `toBe(0.5)` and `staminaRegen(BASE_STATS)`
      `toBe(0.3)`. These are exact, not close.
    - At `stamina: 10`, `toBeCloseTo` 0.25 and 0.45.
    - `BASE_STATS` equals `{ speed: 1, power: 1, jump: 1, control: 1,
      stamina: 1 }`.
  - `player.test.ts`, timed in ticks:
    - **"a full bar lasts 2 s of sprinting at Stamina 1 and 4 s at
      Stamina 10":** hold sprint and the stick forward from a full bar,
      and count the ticks until `exhausted`. Expect 120 ± 1 and 240 ± 1.
    - **"an empty bar refills in 3.3 s at Stamina 1 and 2.2 s at
      Stamina 10":** start at `stamina: 0` and `exhausted: true`,
      standing still, and count the ticks to reach 1. Expect 200 ± 1
      and 134 ± 1.
  - `opponents.test.ts`: "every opponent is at Stamina 1". Check
    `.stamina === 1` for each of `maxStats(1..10)`, every
    `CREW_STATS` entry, `SAM_STATS`, `TUNING_STATS` and
    `SAM_TUNING_STATS`.
  - `maxScripts.test.ts`: `harrisonStats(10)` equals `{ speed: 5, power:
    5, jump: 3, control: 4, stamina: 1 }`, and `harrisonStats(1)` equals
    `{ speed: 2, power: 2, jump: 2, control: 2, stamina: 1 }`.
  - `economy.test.ts`:
    - `STAT_INFO.stamina` has the label and blurb above.
    - `cheapestUpgrade` is 150 for stats at 10/10/10/10 with Stamina 1,
      and null with Stamina 10 too.
    - `buyStat` of `'stamina'` with 150 coins gives Stamina 2 and 0
      coins.
  - `saveCode.test.ts`: "the code still carries four stats, in their
    old place".
    - Give `RICH` `stamina: 1`.
    - `decodeFields(encodeSaveCode(RICH))` has length **41**.
    - Fields 4–7 are RICH's speed, power, jump and control.
  - `shopScene.test.ts`:
    - The rows end `'STAMINA  LV 1  150'`.
    - Four downs from SPEED reach STAMINA, and A buys it: Stamina 2,
      coins −150, saved.
    - A fifth down reaches the Energy Wave. Update the existing row
      indexes for the wave.
  - `hubScene.test.ts`:
    - `statsLine({ speed: 3, power: 2, jump: 1, control: 10, stamina:
      4 })` is `'SPD 3  PWR 2  JMP 1  CTL 10  STA 4'`.
    - `measureText` of the line with every stat at 10 is ≤ 200 (the
      card's text column).
  - `matchScene.test.ts`: a profile at Stamina 10 makes a match with
    `world.home.stats.stamina === 10` and `world.away.stats.stamina ===
    1`.

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/game/stats.test.ts src/game/player.test.ts src/game/opponents.test.ts src/game/maxScripts.test.ts src/meta/economy.test.ts src/meta/saveCode.test.ts src/scenes/shopScene.test.ts src/scenes/hubScene.test.ts src/scenes/matchScene.test.ts`
  Expected: FAIL (type errors and missing exports).

- [ ] **Step 3: Implement**
  - **`stats.ts`:** as in Interfaces.
  - **`player.ts`:** `updateStamina` uses `staminaDrain(p.stats)` and
    `staminaRegen(p.stats)`. Delete `STAMINA_DRAIN` and `STAMINA_REGEN`.
  - **The opponents:** add `stamina: 1` to every row of
    `LADDER_STATS`, to `CREW_STATS`, `SAM_STATS`, `TUNING_STATS` and
    `SAM_TUNING_STATS`.
  - **`harrisonStatsFor`:** raises every stat but Stamina, which stays
    the opponent's. Add a one-line comment saying why: so every scripted
    Harrison plays as he did before Stamina existed.
  - **`saveCode.ts`:** encode and decode the stats through
    `CODE_STATS`, not `STAT_NAMES`.
  - **`economy.ts`:** add `STAT_INFO.stamina`.
  - **`hubScene.ts`:** add `SHORT.stamina = 'STA'`, and make its doc
    say five stats.
  - **`shopScene.ts`:** `PANEL = { w: 220, h: 166, top: 7 }`, from the
    approved mockup. Everything else already follows `STAT_NAMES`.
  - **`helpScene.ts`:** on the MOVES page, after `'TOP LEFT. RUN IT
    DRY…'`, add `'STAMINA IN THE SHOP MAKES IT LAST LONGER.'`. Task 9
    checks that it sits above the footer. If it doesn't, Task 9 drops
    it.
  - **Tests:** add `stamina: 1` to every literal stats object.
    `ai.test.ts`'s `allAt(n)` keeps `stamina: 1`, so the stats-10
    AI-vs-AI test plays as before.

- [ ] **Step 4: Run everything**

  Run: `npm run typecheck && npx vitest run`
  Expected: all pass, and the tuning tests are unchanged.

- [ ] **Step 5: Commit**

  ```bash
  git status --short
  git add -A src
  git commit -m "feat: add stamina, a fifth stat in the shop"
  ```

### Task 2: The Stamina-10 guard (a stop point)

**Files:**
- Modify: `src/game/dogScripts.ts`, `src/game/samScripts.ts`, the spec
  (a new "As built: Stamina's measure" section at the end)
- Create: `src/game/staminaTuning.test.ts`

**Interfaces:**
- Consumes: `Stats.stamina` (Task 1).
- Produces:
  ```ts
  export function bossMatch(d: Difficulty, seed: number, harrison: ScriptedHarrison, stats: Readonly<Stats> = TUNING_STATS): BossMatch;
  export function samMatch(d: Difficulty, seed: number, harrison: SamScript, stats: Readonly<Stats> = SAM_TUNING_STATS): SamMatch;
  ```
  Each passes `{ ...stats }` to `createWorld` for Harrison.

- [ ] **Step 1: Add the `stats` parameter, then run the boss tests**

  Run: `npx vitest run src/game/dogTuning.test.ts src/game/samTuning.test.ts`
  Expected: PASS, unchanged.

- [ ] **Step 2: Measure**

  Write a scratch `npx tsx` script in the scratchpad. Don't commit it.
  It prints win rates on Easy, Normal and Hard:
  - **Biscuit** (seeds 100–131, as in `dogTuning`): chaser and blocker
    at `{ ...TUNING_STATS, stamina: 10 }`.
  - **Sam** (seeds 100–163, as in `samTuning`): racer and matador at
    `{ ...SAM_TUNING_STATS, stamina: 10 }`.
  - **Speed 10 + Stamina 10, for information:** the chaser and the
    racer with `speed: 10, stamina: 10` on top of those stats.
  - **Baselines at Stamina 1:** these must match today, the chaser 0 on
    Normal and the racer .188 / .094 / .109.

- [ ] **Step 3: Check the bars. STOP if any fails.**

  The bars:
  - the chaser wins **≤ 0.15 on Normal** against Biscuit;
  - the racer wins **≤ 0.15 on Normal** against Sam;
  - matador − racer is **≥ 0.3 on every difficulty**.

  If any bar fails, stop the build:
  - Send the parent the whole table from Step 2.
  - Don't tune anything, and don't commit the test.
  - The only fix in scope is gentler level-10 numbers in
    `staminaDrain`/`staminaRegen`, and only on the parent's word.

- [ ] **Step 4: Write `staminaTuning.test.ts`**

  Follow `samTuning.test.ts`: the same seeds, and a `played` map so
  each match runs once. Three tests:
  - **"at Stamina 10 a chaser still loses nearly every match against
    Biscuit on Normal":** `wins ≤ 0.15`.
  - **"at Stamina 10 a racer still loses nearly every match against Sam
    on Normal":** `wins ≤ 0.15`.
  - **"at Stamina 10 the matador still beats the racer by at least 0.3
    on every difficulty"**

  The file's doc comment lists every rate Step 2 measured, both the
  guarded ones and the ones for information.

- [ ] **Step 5: Run it**

  Run: `npx vitest run src/game/staminaTuning.test.ts`
  Expected: PASS. Step 2's measure was its failing-first check.

- [ ] **Step 6: Record and commit**

  Append "As built: Stamina's measure" to the spec, with the table and
  the Speed 10 + Stamina 10 numbers.

  ```bash
  git status --short
  git add src/game/dogScripts.ts src/game/samScripts.ts src/game/staminaTuning.test.ts docs/superpowers/specs/2026-10-28-save-slots-and-stamina-design.md
  git commit -m "test: guard the boss lessons at stamina 10"
  ```

### Task 3: Profile v5 and the save code

**Files:**
- Modify:
  - `src/game/ai.ts` (`DIFFICULTIES`)
  - `src/meta/profile.ts`, `src/meta/saveCode.ts`
  - `src/scenes/saveCodeScene.ts`: decode onto the current save, and
    update the `MAX_ENTRY` comment
  - `src/scenes/optionsScene.ts`: use the shared `DIFFICULTIES`
  - `src/scenes/game.ts`: `loadProfile`'s fallback
- Test: `profile.test.ts`, `saveCode.test.ts`, `saveCodeScene.test.ts`,
  `progress.test.ts`, `economy.test.ts`, and every literal `Profile` in
  tests (the type check lists them)

**Interfaces:**
- Consumes: `Stats.stamina` (Task 1).
- Produces:
  ```ts
  // ai.ts
  export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];
  // profile.ts
  interface Profile { version: 5; name: string; difficulty: Difficulty; /* every v4 field */ }
  export const PROFILE_VERSION = 5;
  export const DEFAULT_NAME = 'HARRISON';
  export const NAME_MAX = 12;
  /** Uppercased, keeping only A–Z, 0–9 and spaces. */
  export function nameChars(text: string): string;
  /** nameChars, trimmed, at most NAME_MAX; '' when nothing's left. */
  export function cleanName(text: string): string;
  /** A record with a numeric version ≥ 1: anything else in a slot means it's empty. */
  export function isSave(v: unknown): v is Record<string, unknown> & { version: number };
  export function profileFrom(v: unknown, fallbackDifficulty: Difficulty): Profile;
  // Until Task 4 removes them, loadProfile and followProfile take the fallback too:
  export function loadProfile(store: KeyValueStore | null, fallbackDifficulty: Difficulty): Profile;
  export function followProfile(target, store, fallbackDifficulty: Difficulty, apply: (p: Profile) => void): void;
  // newProfile(): name DEFAULT_NAME, difficulty 'normal', Stamina 1
  // saveCode.ts
  /** The progress in a code, onto the save `onto`: it keeps onto's name, and onto's difficulty unless the code carries one. */
  export function decodeSaveCode(text: string, onto: Profile): Profile | null;
  ```
  - **v5 code fields:** after every v4 field, `p.stats.stamina`, then
    `DIFFICULTIES.indexOf(p.difficulty) + 1`. The version field is 5.
  - **Decoding:** a difficulty field of 0, missing, or out of range
    means none.
  - **Loading a name:** `cleanName`, and empty means `DEFAULT_NAME`.

- [ ] **Step 1: Write the failing tests**
  - `profile.test.ts`:
    - **New profile:** `newProfile()` has version 5, name `'HARRISON'`,
      difficulty `'normal'` and Stamina 1.
    - **"his live v4 save loads into v5 without loss":** take the
      existing `SOME` as a v4 record, with no name, difficulty or
      Stamina. `profileFrom(SOME, 'easy')` equals `{ ...SOME, version:
      5, name: 'HARRISON', difficulty: 'easy', stats: { ...SOME.stats,
      stamina: 1 } }`.
    - **Names:**
      - `'bob the 2nd!'` loads as `'BOB THE 2ND'`.
      - A 20-character name loads cut to 12.
      - `'!!!'`, `'   '`, `7` and a missing name each load as
        `'HARRISON'`.
    - **Difficulty:** `'hard'` loads. `'insane'`, `3` and missing each
      load as the fallback.
    - **Stamina:** 10 loads; 11 loads as 10; 0 and `'x'` load as 1.
    - **Name helpers:** `nameChars('ab c-1!')` is `'AB C1'`.
      `cleanName('  harrison  ')` is `'HARRISON'`.
      `cleanName('abcdefghijklmnop')` is `'ABCDEFGHIJKL'`.
    - **`isSave`:** true for `{ version: 1 }`. False for `{ version: 0
      }`, `{ version: '4' }`, `[]`, `null` and `'x'`.
    - **Existing tests:** the loader tests stop going through a store:
      `loadProfile(stored(x))` becomes `profileFrom(x, 'normal')`. Their
      expectations gain version 5, the name, `'normal'` and Stamina 1.
      The storage tests (round trip, newer save, throwing storage,
      follow) keep `loadProfile` and `followProfile` with `'normal'`
      until Task 4 moves them.
  - `progress.test.ts` and `economy.test.ts`: `applyMatch` and
    `buyStat` on a profile named `'ZED'` on `'hard'` keep both.
  - `saveCode.test.ts`:
    - **Round trip:** `RICH` gains `name: 'NORMAL RUN'`, `difficulty:
      'hard'` and Stamina 7. `decodeSaveCode(encodeSaveCode(RICH),
      RICH)` equals RICH.
    - **"the code appends Stamina, then difficulty":** the fields have
      length 43. Field 0 is 5, field 41 is 7 and field 42 is 3. Fields
      4–7 still hold the four stats.
    - **"the name stays with the save":** decoding RICH's code onto
      `{ ...newProfile(), name: 'ZED' }` gives `'ZED'` and everything
      else from RICH.
    - **"a v4 code gets Stamina 1 and keeps the save's difficulty":**
      the first 41 fields, with field 0 set to 4, decoded onto an
      `'easy'` save.
    - **"a difficulty of 0 or out of range is none":** field 42 set to
      0, then to 9, keeps onto's difficulty.
    - **"the Park playtest code still loads":** decode the code below
      onto `newProfile()`. It has Park 1–4 stars, stats 7/5/4/5 and
      Stamina 1.
      `0K80Y-1G00W-2G818-A0000-00000-00000-00000-G20G2-08104-0G208-10408-10010-40820-001GA-0`
    - **The newer-build test** becomes `[6, ...fields.slice(1), 77]`.
    - **Every other existing test** passes an `onto`.
  - `saveCodeScene.test.ts`:
    - A v5 code with `'hard'`, entered on a save named `'ZED'` on
      `'easy'`, leaves `ctx.profile` named `'ZED'` on `'hard'`.
    - A v4 code leaves the difficulty `'easy'`.
    - The longest-code test's `max` gains Stamina 10 and `'hard'`. It
      still fits: 138 characters ≤ `MAX_ENTRY`, small scale, at most 4
      lines.

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/meta/profile.test.ts src/meta/saveCode.test.ts src/scenes/saveCodeScene.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement**
  - **`ai.ts`:** add `DIFFICULTIES`. `optionsScene.ts` imports it in
    place of its own list.
  - **`profile.ts`:** as in Interfaces. Check difficulty with
    `DIFFICULTIES.includes`. `statsFrom` already covers Stamina through
    `STAT_NAMES`.
  - **`saveCode.ts`, encoding:** append the two v5 fields.
  - **`saveCode.ts`, decoding:**
    - Set `record.name = onto.name`.
    - Set `record.stats.stamina` from the field read after the v4
      fields.
    - Set `record.difficulty = DIFFICULTIES[field - 1]`, which is
      undefined for none.
    - Return `profileFrom(record, onto.difficulty)`.
  - **`saveCodeScene.ts`:** call `decodeSaveCode(entry, ctx.profile)`.
    The `MAX_ENTRY` comment now says the longest code is 138 characters.
  - **`game.ts`:** load the settings first, then pass
    `settings.difficulty` to `loadProfile` and `followProfile`.

- [ ] **Step 4: Run everything**

  Run: `npm run typecheck && npx vitest run`
  Expected: all pass.

- [ ] **Step 5: Commit**

  ```bash
  git status --short
  git add -A src
  git commit -m "feat: add save names, difficulty and stamina in v5"
  ```

### Task 4: Five save slots in storage, and the context plays one

**Files:**
- Create: `src/meta/saveSlots.ts`, `src/meta/saveSlots.test.ts`,
  `src/meta/testStore.ts`, `src/scenes/context.test.ts`
- Modify:
  - `src/meta/storage.ts`: `removeItem` and `removeUnlessNewer`
  - `src/meta/profile.ts`: remove `loadProfile`, `saveProfile` and
    `followProfile`; keep `PROFILE_KEY`
  - `src/meta/profile.test.ts`: its storage tests move to
    `saveSlots.test.ts`
  - `src/meta/settings.test.ts`: use the shared `memoryStore`
  - `src/scenes/context.ts`, `src/scenes/testContext.ts`,
    `src/scenes/game.ts`

**Interfaces:**
- Consumes: `isSave`, `profileFrom`, `PROFILE_KEY` and `PROFILE_VERSION`
  (Task 3).
- Produces:
  ```ts
  // storage.ts
  interface KeyValueStore { getItem; setItem; removeItem(key: string): void }
  /** Removes `key`; false, leaving it, when it holds a record whose version is above `version`. Never throws. */
  export function removeUnlessNewer(store: KeyValueStore | null, key: string, version: number): boolean;
  // saveSlots.ts
  export const SLOT_COUNT = 5;
  export const LAST_SAVE_KEY = 'harrisons-road-to-the-cup/last-save';
  /** Slot 1 is today's key, so his live save never moves; 2–5 add -2 to -5. */
  export function slotKey(slot: number): string;
  export interface StorageEvents { addEventListener(type: 'storage', cb: (e: { key: string | null }) => void): void }
  export interface SaveSlots {
    /** The save in `slot`, read fresh; null when it's empty. */
    read(slot: number): Profile | null;
    /** Every slot, read fresh; index 0 is slot 1. */
    list(): (Profile | null)[];
    /** Stores at once; never throws; never over a newer build's save. */
    write(slot: number, p: Profile): void;
    /** Empties `slot`; false, leaving it, when it holds a newer build's save. */
    remove(slot: number): boolean;
    lastPlayed(): number | null;
    setLastPlayed(slot: number): void;
    /** Calls `apply` when another tab stores a save under the slot `slot()` names. A removed key or junk is ignored. */
    follow(target: StorageEvents, slot: () => number, apply: (p: Profile) => void): void;
  }
  export function createSaveSlots(store: KeyValueStore | null, fallbackDifficulty: Difficulty): SaveSlots;
  // testStore.ts
  export function memoryStore(initial?: Record<string, string>): KeyValueStore & { data: Record<string, string> };
  export const throwingStore: KeyValueStore;
  // context.ts
  GameContext.slot: number;      // the slot being played; saveProfile writes here
  GameContext.saves: SaveSlots;
  /** Plays `p` in `slot`: sets ctx.slot FIRST, then saveProfile(p) (stored at once), then setLastPlayed(slot). */
  export function openSave(ctx: GameContext, slot: number, p: Profile): void;
  ```
  - **Memory for no storage.** After `write`, if the key doesn't hold
    a save, keep `p` in a per-slot memory map; otherwise clear that
    slot's entry. `read` returns the stored save if there is one, else
    the memory copy, else null.
  - **`remove`** clears the memory copy as well as the key.
  - **The last save played** works the same way, with a remembered
    slot as the fallback.
  - **`lastPlayed`** returns only a whole number from 1 to
    `SLOT_COUNT`, else null.

- [ ] **Step 1: Write the failing tests** (`saveSlots.test.ts`, with
  `memoryStore` and `throwingStore`)
  - **Keys:**
    - `slotKey(1)` is `'harrisons-road-to-the-cup/profile'`.
    - `slotKey(5)` is `'harrisons-road-to-the-cup/profile-5'`.
    - `LAST_SAVE_KEY` is as above.
  - **`read`:**
    - It gives null for a missing key, and for `'{'`, `'"x"'`,
      `'{"version":0}'` and `'[]'`.
    - A v4 save loads with the fallback difficulty. A v5 save keeps
      its own.
  - **`list`:** it has 5 entries, and a save written straight into the
    store after `createSaveSlots` shows up. Nothing is cached.
  - **Write and read:** a save round-trips.
  - **A newer build's save:** a version-6 save is never written over.
    `remove` returns false and leaves the key byte for byte.
  - **`remove`:** it clears the key and returns true. Removing an empty
    slot also returns true.
  - **The last save played:**
    - It's null with none.
    - `setLastPlayed(3)` stores `{"version":1,"slot":3}` and reads
      back 3.
    - Junk, 0, 6 and `'2'` read as null.
  - **No storage** (`null`, `throwingStore`, and a store whose
    `setItem` alone throws):
    - `write(2, p)` makes `read(2)` and `list()[1]` return `p`.
    - `remove(2)` returns true, and `read(2)` is then null.
    - `setLastPlayed(4)` makes `lastPlayed()` return 4.
    - Nothing throws.
  - **`follow`:**
    - A storage event on `slotKey(slot())` with a save stored applies
      it.
    - An event for another slot's key doesn't.
    - A removed key or junk doesn't call `apply`.
    - Changing what `slot()` returns changes which key is followed.
  - `context.test.ts`, **openSave:** with `ctx.slot` 1 holding save A,
    `openSave(ctx, 2, B)`:
    - sets `ctx.slot` to 2 and `ctx.profile` to B;
    - stores B as v5 under `slotKey(2)`;
    - leaves slot 1 as A;
    - makes `lastPlayed()` return 2.

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/meta/saveSlots.test.ts src/scenes/context.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement**
  - **`storage.ts`:** as in Interfaces.
  - **`saveSlots.ts`:** as in Interfaces.
  - **`profile.ts`:** remove the storage functions. Move their tests
    (round trip, newer save untouched, throwing storage, junk, follow)
    into `saveSlots.test.ts` in slot form.
  - **`testContext.ts`:**
    - `over` may set `slot` and `saves`.
    - The defaults are `slot: 1` and `saves: createSaveSlots(memoryStore(),
      'normal')`.
    - `saveProfile` also calls `ctx.saves.write(ctx.slot, p)`, as the
      game does.
  - **`game.ts`:**
    - `const saves = createSaveSlots(store, settings.difficulty)`.
    - The context starts at `slot: 1`, with `profile: saves.read(1) ??
      newProfile()`.
    - `saveProfile(p)` sets `ctx.profile` and calls `saves.write(ctx.slot,
      p)`.
    - Call `saves.follow(window, () => ctx.slot, p => (ctx.profile = p))`
      in place of `followProfile`.

- [ ] **Step 4: Run everything**

  Run: `npm run typecheck && npx vitest run`
  Expected: all pass. The game still opens on slot 1, as today.

- [ ] **Step 5: Commit**

  ```bash
  git status --short
  git add -A src
  git commit -m "feat: keep five save slots in storage"
  ```

### Task 5: Difficulty belongs to the save; RESET SAVE goes

**Files:**
- Modify: `src/scenes/matchScene.ts`, `src/scenes/optionsScene.ts`,
  `src/meta/settings.ts` (the `difficulty` doc), `src/scenes/scene.ts`
  (drop `'reset'`)
- Delete: `src/scenes/resetScene.ts`, `src/scenes/resetScene.test.ts`
- Test: `optionsScene.test.ts`, `matchScene.test.ts`, `hubScene.test.ts`

**Interfaces:**
- Consumes: `Profile.difficulty` (Task 3); `ctx.slot` and `ctx.saves`
  (Task 4).
- Produces:
  ```ts
  // optionsScene.ts
  export function optionRow(row: OptionRow, s: Settings, difficulty: Difficulty): string;   // 'DIFFICULTY  < EASY >'
  export function changeOption(s: Settings, row: Exclude<OptionRow, 'DIFFICULTY'>, step: 1 | -1): Settings;
  /** One step through DIFFICULTIES, wrapping. */
  export function nextDifficulty(d: Difficulty, step: 1 | -1): Difficulty;
  const SAVE_ROWS = ['SAVE CODE'] as const;
  ```
  - **The DIFFICULTY row** shows `ctx.profile.difficulty`. Changing it
    calls `ctx.saveProfile({ ...ctx.profile, difficulty })` and never
    `ctx.save`.
  - **`matchScene`** reads `ctx.profile.difficulty` both at the start
    and in `backHere`.

- [ ] **Step 1: Write the failing tests**
  - `optionsScene.test.ts`:
    - Right on DIFFICULTY makes `ctx.profile.difficulty` `'hard'`, and
      `savedProfiles.at(-1)` has it. `savedSettings` stays empty.
    - Right again wraps to `'easy'`.
    - `optionRow('DIFFICULTY', DEFAULT_SETTINGS, 'easy')` is
      `'DIFFICULTY  < EASY >'`.
    - From the Hub, the rows are `[...OPTION_ROWS, 'SAVE CODE']`.
    - With `ctx.slot` 2 and another save in slot 1, a change leaves
      `ctx.saves.read(1)` as it was, and `ctx.saves.read(2).difficulty`
      is `'hard'`.
    - Update the reset test and the "same row" test, since SAVE CODE is
      now row 4 and last.
  - `matchScene.test.ts`:
    - A profile on `'easy'` with settings on `'hard'` plays Easy.
    - The difficulty-from-pause tests assert `ctx.profile.difficulty`,
      not `ctx.settings.difficulty`.
  - `hubScene.test.ts`: "a match reached from the Hub plays at the
    save's difficulty". Set it on the profile.

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/scenes/optionsScene.test.ts src/scenes/matchScene.test.ts src/scenes/hubScene.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement**
  - Make the changes in Interfaces, and update the Options doc comment.
  - Delete `resetScene.ts` and its test.
  - `settings.ts`: the `difficulty` field's doc says it's only the
    fallback for a save that has none, and nothing writes it.

- [ ] **Step 4: Run everything**

  Run: `npm run typecheck && npx vitest run`
  Expected: all pass.

- [ ] **Step 5: Commit**

  ```bash
  git status --short
  git add -A src
  git commit -m "feat: give each save its own difficulty"
  ```

### Task 6: NEW SAVE

**Files:**
- Create: `src/scenes/newSaveScene.ts`, `src/scenes/newSaveScene.test.ts`
- Modify: `src/engine/input.ts` (the arrows act in text mode),
  `src/scenes/scene.ts` (`'newSave'`)
- Test: `src/engine/input.test.ts`

**Interfaces:**
- Consumes: `openSave` (Task 4); `newProfile`, `nameChars`,
  `cleanName` and `NAME_MAX` (Task 3); `nextDifficulty` (Task 5);
  `createHubScene`.
- Produces:
  ```ts
  // input.ts
  TEXT_MODE_KEYS = Enter, Escape, ArrowUp, ArrowDown, ArrowLeft, ArrowRight
  // newSaveScene.ts
  export type NewSaveRow = 'name' | 'difficulty' | 'start';
  export interface NewSaveScene extends Scene { readonly row: NewSaveRow; readonly name: string; readonly difficulty: Difficulty }
  export function createNewSaveScene(ctx: GameContext, slot: number, back: () => Scene): NewSaveScene;
  ```
  **How it behaves** (the builder's call the spec left open, decided
  here):
  - **Text mode** is on for the whole screen (`wantsText: true`).
  - **Typing** reaches the name only on the NAME row. `'\b'` deletes.
    Anything else goes through `nameChars`, and typing past `NAME_MAX`
    is ignored.
  - **Up and down** move between the rows, wrapping.
  - **Left and right** change the difficulty with `nextDifficulty`, on
    the DIFFICULTY row only. It starts on NORMAL.
  - **`confirm`** (Enter or A) **starts the save from any row,** as the
    approved mockup's `ENTER STARTS IT` says. It calls `openSave(ctx,
    slot, { ...newProfile(), name: cleanName(name) || \`SAVE ${slot}\`,
    difficulty })` and goes to `createHubScene(ctx)`.
  - **`back`** (Esc or B) calls `back()`. Backspace types in text mode,
    so it never leaves. Start alone does nothing.
  - **Cues:** `menuMove` on a row or difficulty change, `menuConfirm`
    on start, `menuBack` on back.

  **The layout is the approved mockup's**, with `P = { x: 40, y: 20, w:
  240, h: 140 }`:
  - The title `NEW SAVE`, at scale 2 in gold, centred at `P.y + 6`.
  - **The NAME row:**
    - The label `NAME` at `(P.x + 14, P.y + 34)`, with a `+` at
      `P.x + 6` when the row is active.
    - The name box at `{ x: P.x + 50, y: P.y + 29, w: 170, h: 18 }`:
      charcoal, with a gold border while active and slate otherwise.
    - The name at scale 2 in white, at `(box.x + 4, box.y + 3)`.
    - An 8×13 blinking cursor after the name, at 2 Hz, while active.
  - **The hint** `TYPE A NAME ON THE KEYBOARD` in silver, centred at
    `P.y + 54`.
  - **The DIFFICULTY row:** the label at `(P.x + 14, P.y + 72)`, and
    `<  NORMAL  >` at `P.x + 120`, in gold when active.
  - **START:** a one-item `drawMenu` at `(BASE_W / 2, P.y + 88)`, with
    index 0 when active and −1 otherwise.
  - **The footer:** `ENTER STARTS IT` in gray at `P.y + 112`, and B BACK
    at `P.y + P.h - 12`.

- [ ] **Step 1: Write the failing tests**
  - `input.test.ts`:
    - "in text mode the arrows act and type nothing": ArrowDown gives
      `held` with `'down'` and `typed` of `''`.
    - Space types `' '`.
    - Shift types nothing and holds nothing. (Review Focus 2's input
      half: the Z/C/Backspace tests already exist.)
  - `newSaveScene.test.ts`:
    - **Typing:** `typed: 'Bob-2 x!'` on NAME gives `'BOB2 X'`.
    - **Game keys:** `typed: 'zcxvadf'` gives `'ZCXVADF'`, and the scene
      stays on NAME (Review Focus 2).
    - **Limits:** `'abcdefghijklmnop'` gives `'ABCDEFGHIJKL'`, and then
      `'\b'` gives `'ABCDEFGHIJK'`.
    - **Other rows:** typing on DIFFICULTY or START changes nothing.
    - **Rows:** down goes NAME → DIFFICULTY → START → NAME. Left on NAME
      changes nothing. Right on DIFFICULTY goes NORMAL → HARD → EASY.
    - **Starting:**
      - **"Enter starts it from any row":** with `'NORMAL RUN'`, hard,
        slot 3, `confirm` returns `kind` `'hub'`.
      - `ctx.slot` is 3, and `ctx.profile` equals `{ ...newProfile(),
        name: 'NORMAL RUN', difficulty: 'hard' }`.
      - `ctx.saves.read(3)` is equal to it, and `lastPlayed()` is 3.
    - **"a blank name becomes SAVE n":** `'   '` in slot 4 gives
      `'SAVE 4'`, and `'  BOB '` gives `'BOB'`.
    - **"fresh after a rich save":** `ctx.profile` is rich (level 6,
      coins, the wave and Golden Form, stars, today's daily win, stats
      7/5/4/5/3). The new save still equals `newProfile()` plus the
      name and difficulty exactly (Review Focus 5).
    - **"B or Esc goes back with nothing created":** `back()` is
      returned, `ctx.saves.read(slot)` is null, and `savedProfiles` is
      empty.
    - **Start alone** (`pause` without `back`) does nothing.
    - **`wantsText`** is true on every row.

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/engine/input.test.ts src/scenes/newSaveScene.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement** `createNewSaveScene` and the input change,
  as in Interfaces.

- [ ] **Step 4: Run everything**

  Run: `npm run typecheck && npx vitest run`
  Expected: all pass. The existing save-code entry tests still pass,
  since its update ignores the arrows.

- [ ] **Step 5: Commit**

  ```bash
  git status --short
  git add -A src
  git commit -m "feat: start a named save from an empty slot"
  ```

### Task 7: DELETE SAVE

**Files:**
- Create: `src/scenes/deleteSaveScene.ts`,
  `src/scenes/deleteSaveScene.test.ts`
- Modify: `src/scenes/scene.ts` (`'deleteSave'`)

**Interfaces:**
- Consumes: `ctx.saves.remove` (Task 4); `encodeSaveCode` (Task 3);
  `codeLines` (in `saveCodeScene.ts`); `stepMenu`, `menuCue`,
  `backsOut` and `drawMenu`.
- Produces:
  ```ts
  export interface DeleteSaveScene extends Scene { readonly code: string; readonly menu: MenuState }
  export function createDeleteSaveScene(ctx: GameContext, slot: number, save: Profile, back: () => Scene, deleted: () => Scene): DeleteSaveScene;
  ```
  - **The code:** `encodeSaveCode(save)`.
  - **The menu:** `['NO', 'YES']`, starting on NO.
  - **Backing out:** NO, `backsOut` (B, Esc or Start) all return
    `back()`.
  - **YES:** if `ctx.saves.remove(slot)` succeeds, play `menuConfirm`
    and return `deleted()`. If it's refused, play `nope`, return null
    and leave the save as it is.

  **The layout** is the approved mockup's, moved down for the name
  line. `PANEL = { x: 8, y: 6, w: 304, h: 168 }`:

  | What | Where |
  |---|---|
  | `DELETE SAVE ${slot}`, scale 2, gold | `y + 6` |
  | `${name}  -  ${DIFF}  -  LEVEL ${level}`, white | `y + 24` |
  | `ITS SAVE CODE, IN CASE`, silver | `y + 36` |
  | the `codeLines` code, from | `y + 46` |
  | `ARE YOU SURE?`, scale 2, red | `y + 100` |
  | the menu | `y + 120` |

  A big three-line code ends at `y + 92`, and a small four-line one at
  `y + 80`.

- [ ] **Step 1: Write the failing tests**
  - **Opening:** `code` is `encodeSaveCode(save)`, and the menu opens on
    NO.
  - **"A on NO, B, Esc and Start go back and keep the save":** `back()`
    is returned and `ctx.saves.read(slot)` is still the save.
  - **"down then A on YES empties the slot":** it returns `deleted()`
    and `ctx.saves.read(slot)` is null.
  - **"YES on a newer build's save plays nope, stays, and keeps it":**
    the slot key holds `{ version: 6, … }`, so the cues end `'nope'`,
    `update` returns null, and the key is unchanged (Review Focus 4).
  - **"the A that opened it doesn't confirm":** a held `confirm`
    (`frame([], ['confirm'])`) does nothing (Review Focus 5).

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/scenes/deleteSaveScene.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement** `createDeleteSaveScene` as in Interfaces.

- [ ] **Step 4: Run it**

  Run: `npm run typecheck && npx vitest run src/scenes/deleteSaveScene.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git status --short
  git add -A src
  git commit -m "feat: delete a save, with its code and a confirm"
  ```

### Task 8: SAVES, the info box, and the ways in and out

**Files:**
- Create: `src/scenes/savesScene.ts`, `src/scenes/savesScene.test.ts`
- Modify: `src/scenes/titleScene.ts` (to SAVES), `src/scenes/hubScene.ts`
  (the SAVES item, B to SAVES, the save label, the XP bar),
  `src/scenes/scene.ts` (`'saves'`)
- Test: `hubScene.test.ts` (its PRESS START tests now expect `'saves'`)

**Interfaces:**
- Consumes: `createNewSaveScene` (Task 6), `createDeleteSaveScene`
  (Task 7), `openSave` and `ctx.saves` (Task 4), `careerStars`,
  `careerCardLines`, `statsLine`, `drawCoins`, `drawStar`, `drawBar`
  and `drawMenu`.
- Produces:
  ```ts
  // savesScene.ts
  export interface SavesScene extends Scene {
    /** Read fresh when the scene opens; index 0 is slot 1. */
    readonly slots: readonly (Profile | null)[];
    /** The picked slot, 1–SLOT_COUNT. */
    readonly cursor: number;
    /** The info box's PLAY / DELETE / BACK; null while it's closed. */
    readonly box: MenuState | null;
  }
  /** `boxOpen` reopens the info box on `cursor`, for DELETE SAVE's way back; ignored on an empty slot. */
  export function createSavesScene(ctx: GameContext, cursor: number, boxOpen?: boolean): SavesScene;
  // hubScene.ts
  HUB_ITEMS = ['CAREER', 'SHOP', 'OPTIONS', 'HELP', 'SAVES'];
  /** The save's name and difficulty for the Hub card, e.g. HARRISON - EASY. */
  export function saveLabel(p: Profile): string;
  export const CARD, TEXT_X, XP_BAR;   // exported for the fit test; XP_BAR.w is 40 (it was 70)
  ```
  **How it behaves:**
  - **PRESS START** goes to `createSavesScene(ctx,
    ctx.saves.lastPlayed() ?? 1)`. `createSavesScene` calls
    `menuAudio(ctx)`, as the Hub does.
  - **The list:**
    - Up and down move the cursor, wrapping.
    - A, Enter or Start picks, as on the Hub. A full slot opens the
      box on PLAY. An empty slot opens `createNewSaveScene(ctx, slot, ()
      => createSavesScene(ctx, slot))`.
    - B or Esc goes back to PRESS START.
  - **The box:**
    - Start confirms the picked item, as A does.
    - **PLAY** calls `openSave(ctx, slot, save)` and goes to
      `createHubScene(ctx)`.
    - **DELETE** opens `createDeleteSaveScene(ctx, slot, save, () =>
      createSavesScene(ctx, slot, true), () => createSavesScene(ctx,
      slot))`.
    - **BACK**, B or Esc closes the box.
  - **The Hub:** SAVES and B both go to `createSavesScene(ctx,
    ctx.slot)`.

  **The layout is the approved mockup's:**
  - **The list.** `LIST = { x: 16, y: 6, w: 288, h: 168 }`.
    - The title `SAVES` at scale 2, centred at `y + 6`.
    - Rows from `y + 28`, `ROW_H` 24. The picked row gets a charcoal
      band at `(x + 4, rowY - 3, w - 8, ROW_H - 2)`.
    - The slot's number at scale 2 at `x + 10`, gold when picked and
      silver otherwise.
  - **A full slot's row,** with `r = x + w - 10` as its right edge:
    - The name at `(x + 30, rowY)`, gold when picked.
    - `EASY  -  LEVEL 6` in silver at `rowY + 10`.
    - The star count in gold, right-aligned at `r`, with a star 8 px
      to its left.
    - `drawCoins` at `(r, rowY + 10)`.
  - **An empty slot's row:**
    - `- EMPTY -` in gray at `(x + 30, rowY + 4)`.
    - When picked, `START A NEW SAVE` in silver, right-aligned at `r`.
  - **The list's footer:** A PICK and B BACK hints at `BASE_W / 2 ∓ 30`
    and `y + h - 11`.
  - **The info box.** First dim the whole list, as `roadMapScene`
    dims. `B = { x: 16, y: 14, w: 288, h: 152 }`: **widened from the
    mockup's 252, so the maxed stats line (189 px) fits the text
    column.**

    | What | Where |
    |---|---|
    | the portrait | `(B.x + 6, B.y + 8)` |
    | the name, scale 2, gold | `(tx, B.y + 6)`, with `tx = B.x + 76` |
    | `SAVE 1  -  EASY`, silver | `B.y + 22` |
    | `LEVEL n`, a 50×4 XP bar after it, and the coins right-aligned at `B.x + B.w - 8` | `B.y + 34` |
    | `statsLine` | `B.y + 46` |
    | a star and `28 STARS`, gold | `B.y + 58` |
    | the two career lines, from `B.x + 8` | `B.y + 80` and `B.y + 90` |
    | the menu | `(BASE_W / 2, B.y + 102)` |

  - **The Hub card:** `saveLabel` in silver, right-aligned at `CARD.x +
    CARD.w - 8` on the LEVEL row (`CARD.y + 26`). The XP bar shrinks to
    40 px so that `LEVEL 999`, the bar and a 12-character name on
    NORMAL all fit (96 + 44 + 6 + 40 = 186 < 192).

- [ ] **Step 1: Write the failing tests**
  - `savesScene.test.ts`:
    - **Opening:** the cursor starts on the given slot, and PRESS START
      opens SAVES on `lastPlayed()`, or 1 with none.
    - **Moving:** up and down move the cursor and wrap.
    - **Picking a full slot:** **"A on a full slot opens its box on
      PLAY and loads nothing."** `ctx.slot` is unchanged and
      `savedProfiles` is empty. A held `confirm` the next tick does
      nothing (Review Focus 5).
    - **"PLAY loads it, stores it at once and goes to the Hub":** for
      slot 2, `ctx.slot` is 2, `ctx.profile` is the save, and
      `lastPlayed()` is 2.
    - **Closing:** BACK, B and Esc close the box, with the cursor kept.
    - **Picking an empty slot:** A opens `'newSave'` for that slot, and
      B there comes back to SAVES on it.
    - **Deleting:** DELETE opens `'deleteSave'` on NO. Backing out
      returns to SAVES with the box open. YES returns to SAVES on that
      slot, now empty.
    - **Leaving:** B and Esc go back to `'pressStart'`.
    - **"his live save comes up as save 1, HARRISON on Easy, with
      everything" (Review Focus 1):**
      - Set up `saves = createSaveSlots(memoryStore({ [PROFILE_KEY]:
        JSON.stringify(V4) }), 'easy')`. `V4` is a v4 JSON save with
        Park 1–4 beaten, stats 7/5/4/5, coins and level, and no name,
        difficulty or Stamina.
      - `slots[0]` has name `'HARRISON'`, `'easy'`, and V4's coins,
        level and stars.
      - After PLAY, the stored JSON under `PROFILE_KEY` has version 5,
        name `'HARRISON'`, `'easy'`, Stamina 1 and V4's coins.
    - **"switching saves keeps each save's own" (Review Focus 3):**
      - Slot 1 is `'easy'` with 500 coins. Slot 2 is `'hard'`.
      - PLAY slot 1, buy SPEED in the Shop, go Hub, B, then PLAY slot 2.
        Change DIFFICULTY in Options.
      - Slot 1 reads back with the speed bought and `'easy'`. Slot 2 is
        on its new difficulty. `ctx.savedSettings` is empty.
  - `hubScene.test.ts`:
    - `HUB_ITEMS` ends in `'SAVES'`.
    - SAVES and B each give `'saves'` with `cursor === ctx.slot`.
    - `saveLabel` gives `'HARRISON - EASY'`.
    - **The fit:** `TEXT_X + measureText('LEVEL 999') + XP_BAR.gap +
      XP_BAR.w + 4 ≤ CARD.x + CARD.w - 8 -
      measureText(saveLabel(twelve M's on NORMAL))`.
    - Update the PRESS START tests to expect `'saves'`.

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/scenes/savesScene.test.ts src/scenes/hubScene.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement** as in Interfaces.

  If `savesScene.ts` passes ~250 lines, move the info box's drawing
  into `src/scenes/saveInfoBox.ts`.

- [ ] **Step 4: Run everything**

  Run: `npm run typecheck && npx vitest run && npm run build`
  Expected: all pass.

- [ ] **Step 5: Commit**

  ```bash
  git status --short
  git add -A src
  git commit -m "feat: pick, play and switch saves from a list"
  ```

### Task 9: Playtest, the parent's look, review and release

- [ ] **Step 1: The browser playtest**

  Start the dev server, `npx vite --port 5179 --strictPort --host
  127.0.0.1`, after checking the port with `ss -ltnp | rg 5179`. Drive
  it with Claude in Chrome, dispatching `KeyboardEvent`s with both
  `code` and `key`. localhost's storage is separate from the live
  site's, so Harrison's save is never touched. Check:
  - **The migration:**
    - Put a v4 save under `harrisons-road-to-the-cup/profile`. Use
      `JSON.stringify` of the Park playtest code's decode, with
      version 4 and no name, difficulty or Stamina.
    - Put settings with `difficulty: 'easy'` under
      `harrisons-road-to-the-cup/settings`.
    - Reload. SAVES shows `HARRISON`, `EASY - LEVEL n`, and the right
      stars and coins.
  - **NEW SAVE with real keys:**
    - Type a name with Z, C, Backspace and Space.
    - Use the arrows to reach DIFFICULTY and START.
    - Press Enter to start it.
  - **DELETE:** it opens on NO, and YES empties the slot.
  - **The Hub:** its label, and B back to SAVES.
  - **Options:** no RESET SAVE.
  - **The Shop:** the STAMINA row, a buy, and the blurb.
  - **Help's MOVES page:** the new Stamina line sits above the footer.
    If it doesn't, remove the line and commit that.
- [ ] **Step 2: The parent's look.**
  - Take pixel-exact stills of SAVES, the info box, NEW SAVE, DELETE
    SAVE, the Hub and the Shop, using the 320×180 overlay technique in
    the dev-environment notes.
  - Send them with SendUserFile, together with Task 2's Stamina table.
  - Ask for a look before merging.
- [ ] **Step 3: Final review.** Use superpowers:requesting-code-review
  for a fresh reviewer on the whole branch. Fix Critical and Important
  findings, and list the minor ones for the parent.
- [ ] **Step 4: Record the build.** Add an "As built" section to the
  spec covering:
  - the XP bar at 40;
  - the info box widened to 288;
  - Enter or A starting NEW SAVE from any row;
  - the arrows acting in text mode;
  - Start confirming on SAVES and in the box;
  - a refused delete playing `nope`;
  - any deferred minors.

  Commit it as `docs: record save slots and stamina as built`.
- [ ] **Step 5: Release.** Use superpowers:finishing-a-development-branch.
  Ask before the merge into `main` and before the push.
