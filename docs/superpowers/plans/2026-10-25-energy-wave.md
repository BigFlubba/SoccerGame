# Energy Wave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harrison's first power move. A super meter fills as he plays well.
With it full and the ball at his feet, he holds Y to power up, then lets go
to fire the **Energy Wave**, a beam that blows Max away or that Max braces
against. **Golden Form** turns the aura and hair gold at level 5. The Shop
sells the move, and Results announces unlocks. The profile moves to
version 2, with a save code and a reset. The Plan 5 minors are fixed.

**Architecture:**
- **Sim.** It grows two pure modules in `src/game/`:
  - `power.ts`: the meter, the start rules and the HUD hint;
  - `wave.ts`: the beam in flight, the brace and the blow-away.

  `World` gains `power` (null unless Harrison owns the move, so the sim is
  unchanged without it) and `wave`. `stepWorld` reports `events.power`, and
  sound, rumble, shake and callouts hang off those events, as they do for
  kicks.
- **Meta.** `src/meta/` gains:
  - `catalog.ts`: moves and forms, unlock levels, prices, grants;
  - `saveCode.ts`: encode and decode.

  `profile.ts` moves to v2.
- **Screens.**
  - `src/scenes/powerView.ts` draws the aura, debris, beam and POWER
    meter.
  - New scenes: `saveCodeScene.ts` and `resetScene.ts`.
  - The input gains a `power` action and a text mode for typing codes.

**Tech Stack:** Vite 8, TypeScript 7 (strict), Canvas 2D, Web Audio, Gamepad
API, Vitest 4. No runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-25-energy-wave-design.md`. Read it
first. It wins over this plan if they ever disagree.

## Global Constraints

- **No image, audio or font files.** On-screen text uses only uppercase
  letters, digits and `' - : ! ? . , / + < >`. There are no parentheses, so
  the spec's Help line `HOLD Y (V)` becomes `HOLD Y OR V`.
- **No runtime dependencies.** Vitest runs in Node, with no DOM and no Web
  Audio.
- **320×180, with a fixed 60 Hz sim.** A Harrison who doesn't own the
  Energy Wave plays exactly as today:
  - `World.power` is null;
  - there's no meter;
  - Y and V do nothing;
  - the existing headless AI-vs-AI tests pass unchanged.
- **Energy Wave:** unlocks at level 3, costs 600 coins, and is owned
  forever. Its blurb is `A HUGE BEAM THAT KNOCKS MAX FLYING`.
- **Golden Form:** free at level 5. It's granted on load and on level-up,
  and stored. It makes meter gains ×1.1.
- **An Energy Wave goal:** callout `ENERGY WAVE!`, which outranks every
  other callout, including `HAT-TRICK!`. It's a style goal, worth +15
  coins.
- **Profile:** key `harrisons-road-to-the-cup/profile`, now `version: 2`.
  - v1 saves load field by field.
  - A save from a newer build is never written over.
  - Level is stored.
  - Nothing earned or bought is ever taken back.
  - Storage that throws never stops the game.
- **The save code:**
  - its alphabet is Crockford base 32 (`0-9 A-Z` without `I L O U`), in
    groups of 5 joined by `-`;
  - it carries a checksum and the profile version;
  - fields are only ever appended.
- **Save code and reset only from the Hub.** `SAVE CODE` and `RESET SAVE`
  appear in Options only when it's opened from the Hub. Their confirms
  pre-select **NO**. Reset keeps the settings.
- **Likeness:** no surname anywhere. The reference photos never leave
  `reference/`. Only the approved heads are used: `HARRISON_HEADS`,
  `HARRISON_POWER_HEADS` and the `golden` hair colours.
- **Commits:** run `git status --short` before every commit. Commits use
  Conventional Commits with a 50/72 message and **no AI attribution
  trailers**.
- **Work on `plan-6-energy-wave`.** Ask the parent before every merge into
  `main` and every push.

## Review Focus

1. **Harrison's v1 save meeting the v2 loader.** Today `loadProfile` rejects
   any `version` below the current one (`!(v.version >= VERSION)`).
   Bumping to 2 unchanged would wipe his save to a new profile. A full v1
   record must load with every field intact. *(Task 1 test.)*
2. **A full charge when play stops.** Outside play, `stepWorld` feeds
   `NO_INTENT`, whose `powerHeld: false` reads as "let go". A full
   power-up at the full-time whistle, a goal pause, or a pause must
   cancel, never fire. The meter is kept. *(Task 7 and Task 10 tests.)*
3. **Y still held after a cancel or a resume.** A power-up cancelled by a
   tackle, or a resume from pause with Y down, must need a fresh press.
   Otherwise holding Y restarts it every tick. *(Task 5 and Task 10
   tests.)*
4. **A blown-away Max near his own goal.** Launched from the goal line or
   beside a post, he must land outside every goal box (`inGoalBox` with
   `PLAYER_R`), on the pitch and never on a roof. He must be on his feet
   within 1.5 s plus a tick. *(Task 7 test.)*
5. **Typing a code with the game's keys.** On the entry screen:
   - Z, X, C and V type letters and never confirm, back out or shoot;
   - lowercase, spaces, dashes and `O` for `0` all decode;
   - Enter on an empty entry shows `THAT CODE DOESN'T WORK`, not a crash.

   *(Task 3 and Task 12 tests.)*

---

### Task 1: Profile v2, the catalogue and safe loading

**Files:**
- Create: `src/meta/catalog.ts`
- Create: `src/game/power.ts`, holding only `export interface PowerKit {
  golden: boolean }` for now. Task 6 fills it in.
- Modify: `src/meta/profile.ts`
- Test: `src/meta/catalog.test.ts`, `src/meta/profile.test.ts`

**Interfaces:**
- **Produces:**
  - `type PowerMoveId = 'energyWave'` and `type PowerFormId = 'golden'`.
  - `Profile.version: 2`, plus these fields:
    - `powerMoves: { owned: PowerMoveId[]; equipped: PowerMoveId | null }`
    - `powerForms: { owned: PowerFormId[]; equipped: PowerFormId | null }`
  - `profileFrom(v: unknown): Profile`. It's the field-by-field loader,
    exported for the save code. `loadProfile(store)` becomes
    `profileFrom(readStored(store, PROFILE_KEY))`.
  - `MAX_LOADED = { level: 999, xp: 1_000_000, count: 999_999_999 }`.
    Loaded coins and totals are capped at `count`.
  - In `catalog.ts`:
    - `POWER_MOVES: Record<PowerMoveId, { label: string; blurb: string; unlockLevel: number; price: number }>`,
      with `energyWave: { label: 'ENERGY WAVE', blurb: 'A HUGE BEAM THAT KNOCKS MAX FLYING', unlockLevel: 3, price: 600 }`.
    - `POWER_FORMS: Record<PowerFormId, { label: string; unlockLevel: number }>`,
      with `golden: { label: 'GOLDEN FORM', unlockLevel: 5 }`.
    - `grantForms(p: Profile): Profile`. It adds every form whose
      `unlockLevel <= p.level`, and equips it if nothing is equipped. It
      never changes `p`.
    - `moveStatus(p: Profile, id: PowerMoveId): 'locked' | 'buy' | 'owned'`
    - `buyMove(p: Profile, id: PowerMoveId): Profile | null`. It returns
      null when locked, already owned, or unaffordable. Buying equips the
      move.
    - `powerKit(p: Profile): PowerKit | null`. It's null unless a move is
      equipped. `PowerKit` is imported type-only from `src/game/power.ts`.
  - Export `TOTAL_NAMES` from `profile.ts`, for the save code.

- [ ] **Step 1: Write the failing tests**

  - `profile.test.ts` › `'a full v1 save loads into v2 with every field kept'`.
    It covers Review Focus 1.
    - Store a v1 record with `coins: 640`, `level: 4`, `xp: 30`, stats
      `{ speed: 3, power: 2, jump: 2, control: 1 }`, `ladderWins: 4`, a
      `dailyWinDate`, and non-zero totals.
    - Expect each value back, `version: 2`, and `powerMoves` equal to
      `{ owned: [], equipped: null }`.
  - `'a v1 save at level 5 or more loads with Golden Form owned and equipped'`.
  - `'unknown, duplicate and unowned power entries are dropped'`. For
    example `owned: ['energyWave', 'energyWave', 'blazeShot']` and
    `equipped: 'blazeShot'` load as `['energyWave']`, equipped null.
  - `'absurd counts are capped so loading and levelling finish'`.
    - Load `xp: 1e300`, `coins: 1e300`, `level: 1e9`, and
      `totals.goalsFor: 1e300`.
    - Expect the `MAX_LOADED` caps.
    - Expect `addXp(p.level, p.xp, 100)` to return. Give the test
      Vitest's default timeout.
  - Add `coins: 'lots'` to the existing bad-field test (Plan 5 nit), and
    expect `coins` to be 0.
  - `catalog.test.ts`:
    - `moveStatus` is `'locked'` at level 2, `'buy'` at level 3, and
      `'owned'` after buying;
    - `buyMove` at exactly 600 coins leaves 0, owns and equips the move,
      and doesn't change the input;
    - `buyMove` returns null when locked, owned or unaffordable;
    - `grantForms` at level 4 adds nothing, and at level 5 adds and equips
      `golden`;
    - `powerKit` is null with no move, `{ golden: false }` with the move,
      and `{ golden: true }` with both.

- [ ] **Step 2: Run them and check they fail**

  Run: `npx vitest run src/meta`
  Expected: the new tests FAIL. The v1 test fails on `version` and
  `powerMoves`.

- [ ] **Step 3: Implement**

  - Set `VERSION = 2`.
  - The loader accepts any record with `typeof v.version === 'number' &&
    v.version >= 1`.
  - The loader ends with `grantForms(...)`.
  - `newProfile()` starts with empty `powerMoves` and `powerForms`.
  - `catalog.ts` imports `Profile` type-only, and `profile.ts` imports
    `grantForms`, so there's no value cycle.

- [ ] **Step 4: Run the meta tests**

  Run: `npx vitest run src/meta`
  Expected: PASS. Then run `npm run typecheck` and fix any spread of
  `Profile` that the new fields broke.

- [ ] **Step 5: Commit**

  ```bash
  git add src/meta
  git commit -m "feat: move the profile to version 2"
  ```

### Task 2: Rewards for Energy Wave goals and unlocks

**Files:**
- Modify: `src/meta/economy.ts`, `src/meta/progress.ts`
- Test: `src/meta/economy.test.ts`, `src/meta/progress.test.ts`

**Interfaces:**
- **Consumes:** `grantForms`, `moveStatus` and `POWER_MOVES` (Task 1).
- **Produces:**
  - `StyleKind = 'header' | 'volley' | 'chip' | 'wave'`, with the labels
    `['ENERGY WAVE', 'ENERGY WAVES']`, listed after chip.
  - `canUpgrade(p)`: true also when `moveStatus(p, 'energyWave') ===
    'buy'` and `p.coins >= 600`.
  - `type Unlock = 'energyWave' | 'goldenForm'`.
  - `MatchReward.unlocked: Unlock[]`:
    - `'energyWave'` when the level crosses 3 and he doesn't own it;
    - `'goldenForm'` when `grantForms` newly adds `golden`.
  - `applyMatch` returns a profile that has been through `grantForms`.

- [ ] **Step 1: Write the failing tests**

  - `economy.test.ts` › `'an Energy Wave goal is a style line worth 15'`.
    `matchLines` with `styleGoals: ['wave']` includes `{ label: 'ENERGY
    WAVE', coins: 15 }`.
  - `'the Energy Wave counts as an upgrade only when unlocked and affordable'`.
  - `progress.test.ts`:
    - `'reaching level 3 announces the Energy Wave once'`;
    - `'jumping from level 2 to 6 announces both unlocks and grants Golden Form'`;
    - `'owning the move already means no Energy Wave unlock line'`.

- [ ] **Step 2: Run them and check they fail**

  Run: `npx vitest run src/meta`
  Expected: the new tests FAIL.

- [ ] **Step 3: Implement**

  Make the changes listed in Interfaces.

- [ ] **Step 4: Run the meta tests and check they pass**

  Run: `npx vitest run src/meta`
  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add src/meta
  git commit -m "feat: pay energy wave goals, announce unlocks"
  ```

### Task 3: The save code

**Files:**
- Create: `src/meta/saveCode.ts`
- Test: `src/meta/saveCode.test.ts`

**Interfaces:**
- **Consumes:** `profileFrom` and `Profile` (Task 1).
- **Produces:**
  - `encodeSaveCode(p: Profile): string`: groups of 5 joined by `-`.
  - `decodeSaveCode(text: string): Profile | null`: null on a bad
    checksum, too little data, or nothing typed.
  - `normaliseCode(text: string): string`: uppercases, maps `O` to `0` and
    `I`/`L` to `1`, and drops every character outside the alphabet.
  - `groupCode(chars: string): string`: groups of 5 joined by `-`. The
    entry screen uses it.

The encoding:
- unsigned LEB128 varints, in this fixed order, then a 16-bit Fletcher
  checksum of the payload, then Crockford base 32;
- the fields:
  - `version`, `coins`, `level`, `xp`;
  - the stats, in `STAT_NAMES` order;
  - `ladderWins`;
  - `dailyWinDate` as days since 2000-01-01 plus 1, or 0 for none;
  - the 8 totals, in `TOTAL_NAMES` order;
  - the owned-moves bitmask and the equipped move's index plus 1, then the
    same two for forms. Each bitmask follows its catalogue's key order;
- decoding:
  - builds a plain record and passes it through `profileFrom`;
  - fields missing at the end take their defaults, and extra fields at the
    end are ignored.

- [ ] **Step 1: Write the failing tests**

  - `'a profile survives a round trip'`. Use a rich profile with both
    unlocks owned, a date and totals.
  - `'a new profile survives a round trip'`.
  - `'only the alphabet and dashes appear, in groups of 5'`. Match
    `/^[0-9A-HJKMNP-TV-Z]{1,5}(-[0-9A-HJKMNP-TV-Z]{1,5})*$/`.
  - `'lowercase, spaces, missing dashes and O for 0 still decode'`. This
    covers Review Focus 5.
  - `'one wrong character fails the checksum'`. Change each position in
    turn, and expect `decodeSaveCode` to return null every time.
  - `'empty and junk input decode to null'`. Use `''`, `'----'` and
    `'HELLO'`.
  - `'a code from a newer build with an extra field still loads'`. Encode,
    append a varint field, re-checksum through a test helper, and decode.
  - `'a tampered code that passes the checksum loads clamped'`. Use stats
    of 99 and a huge xp. The clamps come from `profileFrom`.

- [ ] **Step 2: Run them and check they fail**

  Run: `npx vitest run src/meta/saveCode.test.ts`
  Expected: FAIL, because the module doesn't exist.

- [ ] **Step 3: Implement `src/meta/saveCode.ts`**

  Write it to the encoding above.

- [ ] **Step 4: Run the test and check it passes**

  Run: `npx vitest run src/meta/saveCode.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add src/meta/saveCode.ts src/meta/saveCode.test.ts
  git commit -m "feat: export and import a save code"
  ```

### Task 4: The power button and typing

**Files:**
- Modify: `src/engine/input.ts`
- Modify: `src/scenes/scene.ts`
- Modify: `src/scenes/game.ts` (`carry`, the loop)
- Test: `src/engine/input.test.ts`

**Interfaces:**
- **Produces:**
  - The action `'power'`: pad button 3 (Y) and `KeyV`.
  - `InputFrame.typed: string`: text typed this frame. Backspace is `'\b'`.
    It's always `''` outside text mode.
  - `InputTracker.next(held, moveX, moveY, typed = '')`
  - `createInput(...)` also returns `setTextMode(on: boolean): void`. In
    text mode:
    - keydown appends single-character `e.key` values (and Backspace as
      `'\b'`) to a buffer, and prevents the default;
    - only `Enter` and `Escape` still reach `keysDown`;
    - a `paste` event appends `clipboardData.getData('text')`;
    - leaving text mode clears the buffer and `keysDown`.
  - `Scene.wantsText?: boolean`
  - `game.ts` calls `input.setTextMode(scene.wantsText === true)` before
    each poll, and `carry` concatenates `typed`.

- [ ] **Step 1: Write the failing tests**

  - `'Y on the pad and V on the keyboard hold power'`. Use `padActions` with
    button 3 pressed, and `keyActions(new Set(['KeyV']))`.
  - `'the tracker passes typed text through, and frames default to none'`.
  - The rest of `createInput` needs a window, so test it with a minimal
    fake `EventTarget` that has `navigator.getGamepads`. The test is
    `'in text mode Z, X, C and V type letters and act as nothing; Enter
    and Esc still act'`. It covers Review Focus 5.
    - Dispatch keydown `{ code: 'KeyZ', key: 'z' }` and the others.
    - Expect `typed === 'zxcv'` and `held` to be empty.
    - Then Enter: expect `held` to have `confirm`.
  - `'a paste in text mode arrives as typed text'`.

- [ ] **Step 2: Run them and check they fail**

  Run: `npx vitest run src/engine/input.test.ts`
  Expected: the new tests FAIL.

- [ ] **Step 3: Implement**

  Make the changes listed in Interfaces. Leave every existing key mapping
  as it is.

- [ ] **Step 4: Run the whole suite and check it passes**

  Run: `npx vitest run`
  Expected: PASS. Scene tests build `InputFrame`s through helpers: add
  `typed: ''` there (`src/scenes/testInput.ts`), not in each test.

- [ ] **Step 5: Commit**

  ```bash
  git add src/engine src/scenes
  git commit -m "feat: add the power button and text typing"
  ```

### Task 5: Player states for powering up, bracing and flying

**Files:**
- Modify: `src/game/player.ts`
- Modify: `src/art/body/animations.ts` (a `brace` clip)
- Modify: `src/viewer/spriteViewer.ts` and `tools/render-sheet.ts`, if they
  enumerate clips
- Test: `src/game/player.test.ts`, `src/art/body/bake.test.ts`

**Interfaces:**
- **Produces:**
  - `PlayerState`: adds `'poweringUp' | 'unleashing' | 'bracing' |
    'blown'`.
  - `Kick.kind`: adds `'wave'`.
  - `PlayerIntent.powerHeld: boolean`. `NO_INTENT` has it false.
  - `Player.held`: becomes `{ shoot; chip; power }`.
  - `stepPlayer(p, intent, dt, field, ballAtFeet, powerOk = false)`
  - `POWER_UP_S = 1`. While powering up, `p.charge` runs from 0 to 1 over
    `POWER_UP_S`.
  - **On a fresh power press,** with `powerOk` and `p.state === 'ground'`,
    he enters `'poweringUp'`. In that state:
    - his speed approaches 0;
    - letting go with `charge >= 1` enters `'unleashing'` with
      `kick = { kind: 'wave', aim: intent.aim, active: true, charge: 1,
      overchargeS: 0 }`;
    - letting go earlier enters `'ground'`.
  - **`'unleashing'`** stands still on `SHOT_TIMING`, with the shoot clip
    from `SHOOT_STRIKE_FRAME`, then enters `'ground'`.
  - **`brace(p, beamDirX: 1 | -1)`** enters `'bracing'` facing
    `-beamDirX`:
    - he's shoved along `beamDirX` at `BRACE_SKID_SPEED = 100`, falling
      linearly to 0 over `BRACE_S = 0.5`;
    - then he enters `'ground'`.
  - **`blowAway(p, dirX, dirZ)`** enters `'blown'` with
    `vx = dirX * BLOWN_SPEED`, `vz = dirZ * BLOWN_SPEED` and
    `vy = BLOWN_VY`, where `BLOWN_SPEED = 260` and `BLOWN_VY = 220`:
    - in the air he falls under gravity;
    - on landing his speed drops to 0;
    - at `stateT >= BLOWN_DOWN_S = 1.5` he enters `'ground'`.
  - **`cancelCharge(p)`** also drops `'poweringUp'` to `'ground'`.
    `knockDown` already cancels it.
  - **Animations:**
    - powering up uses `powerUp`;
    - bracing uses the new one-frame `brace` clip. Its pose is in the
      spec's *Left to the builder*: lean in, arms thrust forward, front
      foot planted, back leg driving;
    - blown uses `fall` frame 1 in the air, then frames 2 to 4 spread over
      the time left.

- [ ] **Step 1: Write the failing tests** (in `player.test.ts`)

  - `'a power press with powerOk starts powering up and stands him still'`.
  - `'without powerOk, a power press does nothing'`.
  - `'holding a full second then letting go unleashes a wave kick aimed by the stick'`.
  - `'letting go early drops back to ground with no kick'`.
  - `'holding past full keeps it ready until let go'`. Hold for 3 s, check
    it's still `'poweringUp'` with `charge` 1, then let go and expect
    `'unleashing'`.
  - `'a tackle cancels the power-up'`: use `knockDown`.
  - `'cancelCharge drops a power-up'`.
  - `'Y still held after a cancel needs a fresh press'`. Cancel, keep
    `powerHeld` true with `powerOk` for 10 ticks, and expect `'ground'`
    throughout. This covers Review Focus 3.
  - `'bracing skids him about 25 px back over half a second'`. Expect the
    distance to be within 20 to 30, then `'ground'`.
  - `'blown away he flies, lands and is up at 1.5 s'`.
  - `bake.test.ts`: the `brace` clip bakes for Harrison's and Max's heads.

- [ ] **Step 2: Run them and check they fail**

  Run: `npx vitest run src/game/player.test.ts src/art`
  Expected: the new tests FAIL.

- [ ] **Step 3: Implement**

  Make the changes listed in Interfaces. Leave every existing state's
  behaviour unchanged.

- [ ] **Step 4: Run the whole suite and check it passes**

  Run: `npx vitest run`
  Expected: PASS, including the unchanged headless AI tests. The AI's
  intents spread `NO_INTENT`, so they get `powerHeld: false`.

- [ ] **Step 5: Commit**

  ```bash
  git add src/game src/art src/viewer tools
  git commit -m "feat: power up, brace and blown-away states"
  ```

### Task 6: The super meter and the start rules

**Files:**
- Modify: `src/game/power.ts` (Task 1 created it with `PowerKit`)
- Modify: `src/game/kick.ts` (export `POST_INSET`)
- Modify: `src/game/zones.ts`, `src/game/world.ts` (move `ballAtFeet`)
- Test: `src/game/power.test.ts`

**Interfaces:**
- **Consumes:** `Player` and its states (Task 5).
- **Produces:**
  - `interface PowerKit { golden: boolean }`
  - `interface PowerState { golden: boolean; meter: number; sinceFullS: number; lastKind: 'shot' | 'chip' | 'volley' | 'header' | 'wave' | null }`
  - `createPower(kit: PowerKit): PowerState`, with `meter` 0 and
    `sinceFullS` set to `Infinity`.
  - `METER_GAIN = { touch: 0.01, tackle: 0.15, onTarget: 0.2, styleGoal: 0.4 }`
  - `TOUCH_CEILING = 0.5`: touches add nothing at or above this.
  - `GOLDEN_GAIN = 1.1`
  - `METER_MIN_REFILL_S = 20`. After the meter last became full, gains
    stop at `0.99` until `sinceFullS >= 20`.
  - `addMeter(s: PowerState, e: keyof typeof METER_GAIN): void`. Reaching
    1 sets `sinceFullS = 0`.
  - `tickPower(s: PowerState, dt: number): void`: advances `sinceFullS`.
  - `onTarget(ball: { x; y; z; vx; vy; vz }, goal: Goal): boolean`. It
    projects the ball's flight to the goal line, ignoring bounces and with
    height clamped at 0, and checks the crossing is between the posts and
    under the bar.
  - `WAVE_MIN_DX = 24`.
  - `waveTarget(goal: Goal, aim: Aim): number`, the target z:
    - far: `goal.z1 - POST_INSET`;
    - near: `goal.z0 + POST_INSET`;
    - straight: the mouth's middle.
  - `waveClear(ball, goal: Goal): boolean`: the ball is at least
    `WAVE_MIN_DX` in front of the goal line.
  - `canStartPower(w: World): boolean`. All of these must hold:
    - `w.power` and `meter === 1`;
    - the phase is `'playing'`;
    - Harrison is in `'ground'` and faces Max's goal;
    - the ball is at his feet;
    - `waveClear`.

    Only starting when he already faces the goal is how this plan meets
    the spec's "turns to face Max's goal": a beam can never fly at his own
    goal.
  - `powerHint(w: World): 'none' | 'lit' | 'dim'`:
    - `'none'` when the meter isn't full or `w.power` is null;
    - `'dim'` when the ball is at his feet but he's facing away or
      `!waveClear`;
    - otherwise `'lit'`.
  - Move `ballAtFeet(p, ball)` from `world.ts`, where it's private, into
    `zones.ts`, and export it. Both `world.ts` and `power.ts` import it
    from there, so `power.ts` only needs `World` as a type and there's no
    value cycle.

- [ ] **Step 1: Write the failing tests**

  - `'touches fill a little, but never past half'`.
  - `'tackles, shots on target and style goals fill more'`.
  - `'Golden Form gains are 10% bigger'`.
  - `'after filling, it cannot fill again within 20 s'`. Fill it, set it
    to 0 as a fired wave would, add gains for 19 s of ticks (it stays
    below 1), then at 20 s it fills.
  - `'onTarget: a low shot at the mouth is on target; wide, over the bar
    and away from goal are not'`.
  - `'waveTarget aims at the inset posts and the middle'`.
  - `'canStartPower needs every condition'`. Use one table row per
    condition, turning that one condition false.
  - `'powerHint is dim with the ball at his feet beside the goal line, lit
    in open play, none when not full'`.

- [ ] **Step 2: Run them and check they fail**

  Run: `npx vitest run src/game/power.test.ts`
  Expected: FAIL, because the module doesn't exist.

- [ ] **Step 3: Implement `src/game/power.ts`**

  Write it to the Interfaces block.

- [ ] **Step 4: Run the test and check it passes**

  Run: `npx vitest run src/game/power.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add src/game
  git commit -m "feat: add the super meter and power-up rules"
  ```

### Task 7: The wave in the world

**Files:**
- Create: `src/game/wave.ts`
- Modify: `src/game/world.ts`, `src/game/contact.ts`
- Test: `src/game/wave.test.ts`, `src/game/world.test.ts`

**Interfaces:**
- **Consumes:**
  - `brace`, `blowAway` and `cancelCharge` (Task 5);
  - `PowerState`, `PowerKit`, `createPower`, `addMeter`, `tickPower`,
    `onTarget`, `waveTarget` and `canStartPower` (Task 6).
- **Produces:**
  - `WAVE_SPEED = 960`, `WAVE_HALF_WIDTH = 8`, `BRACE_DISTANCE = 90` and
    `WAVE_LINGER_S = 0.35`.
  - `interface Wave { originX: number; originZ: number; dirX: number; dirZ: number; ageS: number; live: boolean; outcome: null | 'braced' | 'blown'; endX: number; endZ: number }`.
    `endX` and `endZ` are where the beam stops drawing: the brace point,
    or the ball.
  - `fireWave(w: World): Wave`:
    - aims from the ball at `waveTarget` on Max's goal;
    - sets the ball to `y = BALL_REST_Y`, `vy = 0` and `spin = 0`, moving
      at `WAVE_SPEED` along the line;
    - sets `w.power.meter = 0` and `lastKind = 'wave'`.
  - `stepWave(w: World, dt: number): { braced: boolean; blown: boolean }`.
    It's called before `stepBall`. While the wave is live:
    - **Its speed holds.** It restores the ball to `WAVE_SPEED` along the
      line.
    - **It decides if this tick's head reaches Max.** Max counts when
      his lateral distance from the line is at most `WAVE_HALF_WIDTH +
      PLAYER_R`, and he's ahead along it.
    - **Brace or blow.** He braces if he's in `'ground'`, facing against
      the beam, and the head's travel when it reaches him (his distance
      along the line minus `PLAYER_R`) is at least `BRACE_DISTANCE`.
    - **On a brace:** `brace(max, Math.sign(dirX) as 1 | -1)`. The ball
      stops dead just in front of him, and the wave ends live.
    - **Otherwise:** `blowAway(max, dirX, dirZ)`, and the ball carries on.
    - **When it stops being live:** once the ball is past the goal line,
      or the phase isn't `'playing'`.
    - `ageS` keeps counting, and `w.wave` is cleared after
      `WAVE_LINGER_S` past the end of live.
  - `World.power: PowerState | null` and `World.wave: Wave | null`.
  - `createWorld(homeStats, awayStats, seed, aimErrorDeg, kit: PowerKit | null = null)`
  - `WorldEvents.power: { started: boolean; cancelled: boolean; fired: boolean; braced: boolean; blown: boolean }`.
    It's all false when `power` is null.
  - **The `stepWorld` order:**
    1. `tickPower`;
    2. `powerOk = canStartPower(w)` for home;
    3. the players. When play isn't live, cancel a home power-up first,
       before stepping on `NO_INTENT` (Review Focus 2);
    4. fire on entering `'unleashing'`, setting `kick.active = false`;
    5. `resolveBodies`;
    6. `stepWave`, then `stepBall`, then the contacts;
    7. cancel a power-up whose ball has left his feet;
    8. the meter gains from this tick's home events: touch, `tackledBall`,
       a kick that's `onTarget`, and a home goal whose `lastKind` is a
       style kind;
    9. `lastKind` updates like `noteKick`: an away
       touch/kick/tackle, or a home dribble touch, clears it;
    10. the match step. A kickoff reset clears `w.wave`.
  - **`contact.ts`:**
    - `resolveContacts` returns at once for a player in `'blown'`, so he
      doesn't block, dribble or head while flying;
    - `strike` ignores kick kind `'wave'`.

- [ ] **Step 1: Write the failing tests**

  - `wave.test.ts` stages worlds directly:
    - `'a wave with Max out of the lane scores'`. Step until
      `w.events.goal === 'home'`.
    - `'Max upright, facing and 150 px away braces: he skids, the ball dies at his feet'`.
    - `'Max 40 px away is blown away and the ball goes on to score'`.
    - `'Max sliding, in the air or facing away is blown away even from far'`.
    - `'a lane width away, the wave misses Max'`. Use a lateral distance
      of `WAVE_HALF_WIDTH + PLAYER_R + 1`.
    - `'the brace boundary: exactly BRACE_DISTANCE braces, one px less blows'`.
    - `'a blown-away Max launched beside his own goal lands outside every goal box and is up in time'`.
      Launch from the goal line, from beside each post, and from 30 px in
      front of the goal. Assert `inGoalBox(g, max.x, max.z, 0)` is false
      on every tick, and that he's in `'ground'` by 1.5 s plus 1 tick.
      This covers Review Focus 4.
    - `'the wave beats any shot: WAVE_SPEED exceeds 1.25 × the level-10 max shot speed × PERFECT_BONUS'`.
  - `world.test.ts`:
    - `'without a kit, power is null and holding Y changes nothing'`. Run
      two worlds with the same seed for 600 ticks. In one, every home
      intent has `powerHeld: true`. Expect identical positions.
    - `'a full charge at full time cancels and keeps the meter'`. This
      covers Review Focus 2.
    - `'the ball leaving his feet cancels the power-up and keeps the meter'`.
    - `'firing spends the meter and reports fired once'`.
    - `'a cancelled power-up reports cancelled, a started one started'`.

- [ ] **Step 2: Run them and check they fail**

  Run: `npx vitest run src/game`
  Expected: the new tests FAIL.

- [ ] **Step 3: Implement `wave.ts`, the world changes and the contact changes**

  Make them as listed in Interfaces.

- [ ] **Step 4: Run the whole suite and check it passes**

  Run: `npx vitest run`
  Expected: PASS, with the existing headless tests unchanged.

- [ ] **Step 5: Commit**

  ```bash
  git add src/game
  git commit -m "feat: fire the energy wave, brace or blow max away"
  ```

### Task 8: Max comes for him, and the headless guarantees

**Files:**
- Modify: `src/game/ai.ts`
- Test: `src/game/ai.test.ts`

**Interfaces:**
- **Consumes:** `World.power`, `World.wave` and the player states (Tasks 5
  and 7).
- **Produces:**
  - `AiProfile` gains `rushDelayS` and `rushSprint`:
    - easy: `0.3` and `false`;
    - normal: `0.1` and `false`;
    - hard: `0` and `true`.
  - `AiBrain.plan` adds `'rush'`.
  - **In `decide`,** when `them.state === 'poweringUp'`:
    - After `rushDelayS` from the start of the power-up (counted in the
      brain), he heads for the ball along the beam's lane. At his x, the
      lane's z is the line from the ball toward `waveTarget` with the
      stick's current aim; `them.aim` is fine.
    - He sprints if `rushSprint`.
    - He slides when within `SLIDE_RANGE` and in line, ignoring
      `aggression` but respecting `slideReadyS`.
    - He never plants and waits.

- [ ] **Step 1: Write the failing tests**

  - `'when Harrison powers up far away, Max steps into the lane and runs at him'`.
    After 0.5 s, Max is nearer and his z is within `WAVE_HALF_WIDTH` of
    the lane.
  - `'when Harrison powers up close, Max slides in'`.
  - `'Easy Max starts later than Hard Max'`.
  - `'the release window on Normal is about half a second'`.
    - Use level-1 stats and Max starting 160 px away in the lane.
    - Step until his head-on distance drops below `BRACE_DISTANCE +
      PLAYER_R`, then until he's within `SLIDE_RANGE`.
    - Expect the time between to be in 0.35 to 0.8 s.
  - **Headless guarantees with waves in play.** Extend `wholeMatches` with
    an option `power: true`. Home gets a kit, and the home intent comes
    from a test-only power bot:
    - it uses `think()`;
    - with the meter full and `canStartPower`, it holds `powerHeld` for a
      hold drawn from 0.2 to 2.0 s by a seeded generator kept in the test;
    - each tick it refills the meter to 1 when no wave is live, to force
      many waves.

    Run `it.each(['easy', 'normal', 'hard'])` over seeds `[41, 42, 43]`.
    Expect every existing guarantee to hold, plus:
    - neither player ever inside a goal box;
    - across the seeds, at least one `braced` and at least one `blown`;
    - at least one wave goal.
  - **The meter's pace.** `'with no refills, the meter fills about once or
    twice in an AI-vs-AI match on Normal'`. Home has a kit and plain
    `think()`, without the power bot. Across seeds `[51, 52, 53, 54, 55]`,
    expect every match to fill it 0 to 3 times, at least 3 of the 5 to
    fill it at least once, and no two fills within 20 s. Tune
    `METER_GAIN` (Task 6) to pass. The parent's playtest has the final
    say.

- [ ] **Step 2: Run them and check they fail**

  Run: `npx vitest run src/game/ai.test.ts`
  Expected: the new tests FAIL.

- [ ] **Step 3: Implement the rush in `ai.ts`**

  Tune `rushDelayS`, `BRACE_DISTANCE` (Task 7) and `POWER_UP_S` (Task 5)
  only within the ranges the window test allows.

- [ ] **Step 4: Run the whole suite and check it passes**

  Run: `npx vitest run`
  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add src/game
  git commit -m "feat: max rushes a powering-up harrison"
  ```

### Task 9: Drawing the power-up, the beam and the POWER meter

**Files:**
- Create: `src/scenes/powerView.ts`
- Modify: `src/art/glyphs.ts` (a `Y` glyph)
- Modify: `src/scenes/art.ts` (`homePower` and `homeGolden` sprite sets,
  and the `Y` button)
- Modify: `src/scenes/matchView.ts`
- Test: `src/art/glyphs.test.ts`, `src/scenes/powerView.test.ts`,
  `src/scenes/matchView.test.ts`

**Interfaces:**
- **Consumes:** `powerHint`, `Wave`, `World.power` and the player states.
- **Produces:**
  - `ButtonName` adds `'Y'`: an `M.gold` face with an `M.outline` label.
  - `GameArt` gains:
    - `homePower: SpriteSet`: `HARRISON_POWER_HEADS` with
      `harrisonLook('home')`;
    - `homeGolden: SpriteSet`: power heads with `harrisonLook('home',
      'golden')`;
    - `buttons.Y`.
  - `MatchHud` gains:
    - `shake: { px: number; untilS: number } | null`;
    - `impactFrames: number`: drawn frames left of the high-contrast
      silhouette;
    - `goldenCelebration: boolean`.
  - In `powerView.ts`:
    - `drawPowerMeter(g, art, meter: number, hint: 'none' | 'lit' | 'dim', nowS: number): void`.
      Top right, as in the approved mockup:
      - the `POWER` label in `energyGold`, right-aligned at x 316, y 1;
      - a bar from x 272 to 316, y 8 to 13: gold with a lighter top row,
        and a pulse of `auraWhite` pixels when full;
      - the Y glyph at about x 260. It's dimmed (drawn at `globalAlpha =
        0.35`) for `'dim'` and hidden for `'none'`.
      - Nothing is drawn when `w.power` is null.
    - `drawAura(g, cam, p: Player, golden: boolean, strength: number, nowS: number): void`:
      - rings dilated from the sprite's silhouette, with flame tongues
        licking upward and a glow pool at the feet;
      - the ring colours are `goldDark`/`energyGold`/`energyGoldLight`/
        `auraWhite` with Golden Form, and `silver`/`white`/`auraWhite`
        without.
    - `drawDebris(g, cam, p: Player, strength: number, nowS: number): void`:
      grass, pebbles and clods rising around his feet.
    - `drawPowerBar(g, cam, p: Player): void`: the gold charge bar where
      `drawChargeBar` draws.
    - `drawBeam(g, cam, wave: Wave, nowS: number): void`:
      - the electric band with its wavy edge, the light band and the white
        core. It's the same blue-white in every form;
      - a glowing orb at the origin, and a shockwave ring spreading from it
        for the first 0.2 s;
      - speed lines while live;
      - when braced, a splash of rays at `endX`/`endZ`, with skid marks and
        dust behind Max;
      - the beam fades over `WAVE_LINGER_S`.
    - `shakeFor(power: PowerState | null, home: Player, hud: MatchHud, nowS: number): { dx: number; dy: number }`:
      - powering up: up to 2 px, growing with `charge`;
      - a fired wave: 4 px for 0.3 s;
      - a brace: 2 px for 0.2 s;
      - never more than the goal moment's own `shakeOffset` peak. Lower
        these if that peak is smaller.
  - **`drawMatch`:**
    - Harrison is drawn from `homePower` or `homeGolden` while
      `'poweringUp'` or `'unleashing'`, and from `homeGolden` while
      `hud.goldenCelebration`;
    - the aura and debris go just behind him in the depth sort;
    - the beam goes over the pitch. A braced Max is redrawn over the
      beam's end;
    - while `impactFrames > 0`, the pitch draws as `outline`/`white`
      silhouettes, and the count drops by one per drawn frame;
    - the POWER meter is drawn in `drawHud`;
    - the off-screen ball arrow keeps clear of the meter (x ≤ 250).

- [ ] **Step 1: Write the failing tests**

  - `glyphs.test.ts` › `'the Y glyph is a gold disc with a dark Y'`.
  - `powerView.test.ts`: test the pure parts only, since there's no
    canvas:
    - `shakeFor` grows with charge, and is 4 px right after firing and 0
      after 0.3 s;
    - the clip and sprite set chosen for Harrison in each state. Export
      this as `homeSprites(w, hud): 'home' | 'homePower' | 'homeGolden'`.
  - `matchView.test.ts` › `'the off-screen arrow never overlaps the POWER meter'`.

- [ ] **Step 2: Run them and check they fail**

  Run: `npx vitest run src/art src/scenes`
  Expected: the new tests FAIL.

- [ ] **Step 3: Implement**

  Make the changes listed in Interfaces. Keep `matchView.ts` to wiring.
  The drawing goes in `powerView.ts`.

- [ ] **Step 4: Run the whole suite and the build, and check both pass**

  Run: `npx vitest run && npm run build`
  Expected: PASS, and the build succeeds.

- [ ] **Step 5: Commit**

  ```bash
  git add src/art src/scenes
  git commit -m "feat: draw the aura, the beam and the power meter"
  ```

### Task 10: The match plays it: wiring, sound, rumble and the callout

**Files:**
- Modify: `src/scenes/matchScene.ts`, `src/scenes/goalCallout.ts`
- Modify: `src/audio/matchFeedback.ts`, `src/audio/cues.ts`
- Modify: `src/engine/rumble.ts`
- Test: `src/scenes/matchScene.test.ts`, `src/scenes/goalCallout.test.ts`,
  `src/audio/matchFeedback.test.ts`, `src/audio/cues.test.ts`

**Interfaces:**
- **Consumes:**
  - `powerKit(ctx.profile)` (Task 1);
  - `createWorld(..., kit)` and `events.power` (Task 7);
  - the `MatchHud` fields (Task 9).
- **Produces:**
  - **The match scene:**
    - passes `powerKit(ctx.profile)` to `createWorld`;
    - `harrisonIntent` sets `powerHeld: input.held.has('power')`;
    - the resume sets `world.home.held.power` from the input, so a held Y
      needs a fresh press (Review Focus 3);
    - `openPause` (through `cancelCharge`) cancels a power-up with the
      meter kept.
  - **`LastKick.kind`** adds `'wave'`:
    - `noteKick` returns `{ kind: 'wave', perfect: false, distance }` on
      `w.events.power.fired`;
    - `goalCallout` returns `'ENERGY WAVE!'` for `'wave'`, ahead of
      `HAT-TRICK!`;
    - the scene's `isStyle` includes `'wave'`, so the goal is pushed to
      `styleGoals`.
  - **`hud.goldenCelebration`** is set when a wave goal starts the moment
    with `world.power.golden`, and cleared with the moment.
  - **New cues**, synthesised and kept quiet and short, like Plan 4's:
    - `powerUp`: a 1 s hum rising from about 110 to 440 Hz;
    - `waveBlast`;
    - `beam`: about 0.4 s;
    - `brace`: a thud with a noisy skid;
    - `whoosh`.
  - **New rumble kinds:**
    - `charge1`, `charge2` and `charge3`, rising in strength;
    - `wave`: long and strong;
    - `brace`.
  - **`matchFeedback`** adds:
    - `started`: `powerUp`, `ooh` (the crowd's gasp) and `charge1`;
    - `charge2` and `charge3` when `home.charge` crosses 1/3 and 2/3 while
      powering up;
    - `fired`: `waveBlast`, `beam` and `wave`;
    - `braced`: `brace` for both sound and rumble;
    - `blown`: `whoosh`.
  - **On `fired`,** the scene sets `hud.flash` and `hud.impactFrames = 2`.
  - **Plan 5 nit:** remove the trailing blank line in `cues.test.ts`.

- [ ] **Step 1: Write the failing tests**

  - `goalCallout.test.ts`:
    - `'a wave goal is ENERGY WAVE!, even as the third goal'`;
    - `'Max touching the ball after a wave clears it'`.
  - `matchFeedback.test.ts`:
    - one test per `events.power` flag and its cues and rumble;
    - `'the charge rumble steps up at a third and two thirds'`.
  - `matchScene.test.ts`:
    - `'with the move owned, holding power with a full meter powers up'`.
      Stage the meter through `world.power`.
    - `'without the move, the world has no power'`.
    - `'pausing mid power-up cancels it and keeps the meter; on resume, a held Y needs a fresh press'`.
    - `'a wave goal pays the style bonus and shows ENERGY WAVE!'`.
    - `'a Golden Form wave goal celebrates golden'`.

- [ ] **Step 2: Run them and check they fail**

  Run: `npx vitest run src/scenes src/audio`
  Expected: the new tests FAIL.

- [ ] **Step 3: Implement**

  Make the changes listed in Interfaces.

- [ ] **Step 4: Run the whole suite and check it passes**

  Run: `npx vitest run`
  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add src/scenes src/audio src/engine
  git commit -m "feat: play the energy wave in a match"
  ```

### Task 11: Shop, Results, Help and the Plan 5 screen minors

**Files:**
- Modify: `src/scenes/shopScene.ts`, `src/scenes/resultsScene.ts`,
  `src/scenes/helpScene.ts`, `src/scenes/hubScene.ts` and/or
  `src/scenes/backdrop.ts`
- Test: `src/scenes/shopScene.test.ts`, `src/scenes/resultsScene.test.ts`,
  `src/scenes/helpScene.test.ts`

**Interfaces:**
- **Consumes:** `moveStatus`, `buyMove`, `POWER_MOVES` and
  `MatchReward.unlocked` (Tasks 1 and 2).
- **Produces:**
  - **The Shop:**
    - `PANEL = { w: 220, h: 160, top: 12 }`;
    - a `POWER MOVES` divider under the stats, then row 4. Up and down
      wrap through all 5 rows.
    - `moveRow(p: Profile): string` is one of `'ENERGY WAVE  600'`,
      `'ENERGY WAVE  LV 3 TO UNLOCK'` or `'ENERGY WAVE  OWNED'`. Locked
      rows are drawn in `gray`.
    - **A on a locked row:** `nope`, with the message `REACH LEVEL 3`.
    - **A when he can't afford it:** `nope` and the existing can't-afford
      message.
    - **A buys:** `buy`, `ctx.saveProfile`, and the message `HOLD Y WITH
      A FULL POWER METER`.
    - **A when owned:** the same as a maxed stat.
    - The move's blurb comes from `POWER_MOVES`.
    - `createShopScene` calls `ctx.audio.setCrowd('off')` (Plan 5 minor).
  - **Results:**
    - with the level-up, it shows `ENERGY WAVE UNLOCKED IN THE SHOP!` and
      `GOLDEN FORM UNLOCKED!` for each entry in `reward.unlocked`. The
      layout is the builder's call, within the panel;
    - after the press that skips the tally, the menu ignores `confirm`,
      `shoot` and `pause` for `SKIP_GRACE_S = 0.25` (Plan 5 minor).
  - **Help:**
    - the controls page gains `Y: POWER UP WITH A FULL POWER METER. KEY V`;
    - a new last page titled `POWER MOVES` has the lines
      `BUY THE ENERGY WAVE IN THE SHOP. FILL THE POWER`,
      `METER, HOLD Y OR V TO POWER UP, LET GO TO UNLEASH.`,
      `GET CLOSE AND MAX GOES FLYING. FROM FAR AWAY HE`,
      `CAN BRACE AND STOP IT, AND IF HE REACHES YOU`,
      and `FIRST, HE TACKLES YOU. PICK YOUR MOMENT!`.
  - **The Hub:** the backdrop's juggling Harrison is drawn where the menu
    panel doesn't cover him (Plan 5 minor). Check it in the Task 13
    screenshots.

- [ ] **Step 1: Write the failing tests**

  - `shopScene.test.ts`:
    - `'the cursor wraps through five rows'`;
    - `'a locked Energy Wave plays nope and says REACH LEVEL 3'`;
    - `'buying the Energy Wave saves, owns it and teaches the button'`;
    - `'the Shop turns the crowd off'`.
  - `resultsScene.test.ts`:
    - `'unlock lines show with the level-up'`;
    - `'a confirm 0.1 s after skipping the tally does not pick NEXT MATCH'`;
    - `'a confirm after the grace picks it'`.
  - `helpScene.test.ts`: `'every Help line uses only the font's characters and fits 320 px'`.
    If the existing test already covers this, add the new page to it.

- [ ] **Step 2: Run them and check they fail**

  Run: `npx vitest run src/scenes`
  Expected: the new tests FAIL.

- [ ] **Step 3: Implement**

  Make the changes listed in Interfaces.

- [ ] **Step 4: Run the whole suite and check it passes**

  Run: `npx vitest run`
  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add src/scenes
  git commit -m "feat: sell the energy wave, announce unlocks"
  ```

### Task 12: Options: the save code and the reset

**Files:**
- Create: `src/scenes/saveCodeScene.ts`, `src/scenes/resetScene.ts`
- Modify:
  - `src/scenes/optionsScene.ts`, `src/scenes/hubScene.ts`;
  - `src/scenes/context.ts`, `src/scenes/game.ts`,
    `src/scenes/testContext.ts`;
  - `src/scenes/scene.ts` (`SceneKind`).
- Test: `src/scenes/optionsScene.test.ts`, `src/scenes/saveCodeScene.test.ts`,
  `src/scenes/resetScene.test.ts`

**Interfaces:**
- **Consumes:** `encodeSaveCode`, `decodeSaveCode`, `normaliseCode` and
  `groupCode` (Task 3); `newProfile` (Task 1); `InputFrame.typed` and
  `Scene.wantsText` (Task 4).
- **Produces:**
  - **The context:** `GameContext.copyText(s: string): Promise<boolean>`:
    - `game.ts` implements it with `navigator.clipboard.writeText`. It
      resolves false on any failure or when the clipboard is missing;
    - `testContext` records the copies and resolves true.
  - **`SceneKind`** adds `'saveCode' | 'reset'`.
  - **Options:**
    - `createOptionsScene(ctx, back, fromHub = false)`;
    - with `fromHub`, the rows are `[...OPTION_ROWS, 'SAVE CODE', 'RESET
      SAVE']`. A on those two opens their scenes, and they come back to
      `createOptionsScene(ctx, back, true)`;
    - the Hub passes `true`, and the pause menu doesn't.
  - **`createSaveCodeScene(ctx, back)`**, in three stages:
    1. **`'show'`:**
       - the title `SAVE CODE`;
       - the code at scale 2, 4 groups per line;
       - `COPIED TO THE CLIPBOARD` once `copyText` resolves true;
       - otherwise `WRITE IT DOWN OR TAKE A PHOTO`;
       - a menu of `ENTER A CODE` and `BACK`.
    2. **`'enter'`**, with `wantsText` true:
       - `TYPE OR PASTE A CODE - KEYBOARD ONLY`;
       - the typed code shown through `groupCode(normaliseCode(...))`, with
         `'\b'` deleting a character;
       - `confirm` submits and `back` returns to `'show'`;
       - a code that doesn't decode shows `THAT CODE DOESN'T WORK`.
    3. **`'confirm'`:**
       - the summary `LEVEL 6 - 840 COINS - LADDER 4/10` (from the decoded
         profile);
       - `REPLACE THIS SAVE?`, with the menu `NO`, `YES` and index 0;
       - YES runs `ctx.saveProfile(decoded)`, then returns to `'show'`
         with the new code and `SAVE LOADED!`;
       - NO or B returns to `'enter'`.
  - **`createResetScene(ctx, back)`:**
    - the current code first, under `YOUR SAVE CODE, IN CASE`;
    - then `ARE YOU SURE?`, with the menu `NO`, `YES` and index 0;
    - YES runs `ctx.saveProfile(newProfile())` and goes back;
    - the settings are untouched.

- [ ] **Step 1: Write the failing tests**

  - `optionsScene.test.ts`:
    - `'from the Hub, Options has SAVE CODE and RESET SAVE'`;
    - `'from the pause menu, it does not'`.
  - `saveCodeScene.test.ts`:
    - `'opening copies the code'`;
    - `'typing a good code, Enter, then YES replaces the save'`;
    - `'NO is pre-selected, and confirming it changes nothing'`;
    - `'a bad code says THAT CODE DOESN'T WORK and changes nothing'`;
    - `'Enter on an empty entry says THAT CODE DOESN'T WORK'`;
    - `'backspace deletes'`;
    - `'the entry stage wants text, and the others do not'`.
  - `resetScene.test.ts`:
    - `'NO is pre-selected'`;
    - `'YES saves a fresh profile and keeps the settings'`;
    - `'B backs out with nothing changed'`.

- [ ] **Step 2: Run them and check they fail**

  Run: `npx vitest run src/scenes`
  Expected: the new tests FAIL.

- [ ] **Step 3: Implement**

  Make the changes listed in Interfaces.

- [ ] **Step 4: Run the whole suite, the typecheck and the build, and check they pass**

  Run: `npx vitest run && npm run typecheck && npm run build`
  Expected: PASS, and the build succeeds.

- [ ] **Step 5: Commit**

  ```bash
  git add src/scenes
  git commit -m "feat: save code and reset in options"
  ```

### Task 13: Playtest, show the parent, merge and hand off

**Files:**
- Modify: memory (`harrison-soccer-status.md`, `MEMORY.md`), outside the
  repo.

- [ ] **Step 1: Run the full suite and the production build**

  Run: `npx vitest run && npm run build`
  Expected: every test passes, and the build succeeds.

- [ ] **Step 2: Playtest in Chrome**

  Start Vite on 127.0.0.1:5179 (see `dev-environment-notes` in memory).
  Stage each beat through `window.__soccer`:
  - buy the move in the Shop;
  - a full meter in a match;
  - a cancelled power-up;
  - a wave that blows Max away and scores, showing `ENERGY WAVE!` and the
    style line on Results;
  - a wave Max braces;
  - Max's rush tackling a held charge;
  - Golden Form at level 5;
  - a save code out, then back in;
  - a reset.

  Fix anything found, with a test, before going on.

- [ ] **Step 3: Make the parent's review set**

  Capture these with the pixel-exact technique in memory:
  - GIFs of the power-up and both outcomes, in base and Golden Form;
  - stills of the HUD meter, the Shop, the Results unlock lines, the
    save-code screens and the Hub.

  Send them with SendUserFile, with how to see it live. **Wait for the
  parent's approval.** This is new art of Harrison.

- [ ] **Step 4: Finish the branch**

  Use `superpowers:finishing-a-development-branch`. **Ask before merging
  into `main` and before pushing.** The push moves Harrison's live save to
  v2.

- [ ] **Step 5: Update memory**

  - Plan 6 is live, or how far it got.
  - The tuning to check after Harrison plays: meter pace, the release
    window, price and level.
  - Offer to update the game-tour page.
