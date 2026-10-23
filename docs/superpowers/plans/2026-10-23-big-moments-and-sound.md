# Big Moments and Sound Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Harrison's goals a big moment (hit-stop, slow motion, shake,
GOAL!!!, "Point to the Back"), give the game synthesised sound and rumble with
volume and rumble options, and fix Plan 3's six deferred minors. All of it goes
live before 4:00 pm Pacific on 2026-10-23.

**Architecture:** A new `src/audio/` module holds the cue recipes as data, a
thin Web Audio synth behind a `GameAudio` interface, and a pure
`matchFeedback()` that turns each tick's `WorldEvents` into cues and rumble
pulses. `src/engine/rumble.ts` wraps `vibrationActuator`. The goal moment is a
pure timeline (`src/scenes/goalMoment.ts`) that the match scene uses to scale
the dt it feeds `stepWorld`. The simulation never sees slow motion except as a
smaller dt. `GameContext` gains `audio` and `rumble`.

**Tech Stack:** Vite 8, TypeScript 7 (strict), Canvas 2D, Web Audio,
Gamepad API, Vitest 4. No runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-23-big-moments-and-sound-design.md`
(read it first; it wins over this plan if they ever disagree).

## Global Constraints

- No audio, image or font files. Everything is synthesised or drawn in code.
- No runtime dependencies. Vitest tests run in Node with no DOM and no Web
  Audio.
- The base resolution is 320×180, and the fixed simulation steps at 60 Hz. The
  sim's rules, feel targets and headless AI-vs-AI matches must not change.
- Settings `version: 2` adds `musicVolume`, `sfxVolume` (integers 0–10) and
  `rumble` (boolean). Defaults: music 6, SFX 8, rumble on. A v1 save keeps its
  difficulty. A newer build's settings are never overwritten.
- Nothing plays before the first key press or click, and nothing ever throws
  when Web Audio, a gamepad or `vibrationActuator` is missing.
- One frame of white flash per goal, never a strobe.
- Likeness: no surname anywhere, the reference photos never leave
  `reference/`, and the parent approves the celebration card art.
- Run `git status --short` before every commit. Commits use Conventional
  Commits with a 50/72 message and **no AI attribution trailers**.
- Work on `feat/big-moments-and-sound`. Ask the parent before every push.
- **Times:** the safety push after Task 8 (target 2:30–3:00 pm), the card
  cutoff at 3:15 pm (after it, ship the arms-up fallback), the freeze at 3:30 pm
  (no new task starts after it).

## Review Focus

1. **A gamepad-only player.** Chrome doesn't count a pad press as a user
   gesture, so sound stays locked. The hint must show, and calling `unlock()`
   against a context whose `resume()` rejects must not throw and must leave
   `unlocked` false. *(Task 4 test.)*
2. **Pause or quit during the goal moment.** Opening the pause menu
   mid-slow-motion and resuming continues the moment from where it was, and the
   goal's cues and rumble don't fire again. Quitting to the title sets the
   crowd to `'off'`. *(Task 7 test.)*
3. **Restart and Play Again.** Starting a new match while one's crowd loop is
   running must not stack a second crowd loop. *(Task 4 test: `setCrowd`
   called twice creates one noise source.)*
4. **X held through the skip and the kickoff.** Holding shoot to skip the
   celebration, and still holding it through the kickoff, must not start a
   charge or fire a shot until a fresh press. *(Task 7 test.)*
5. **Audio requested before unlock.** The Press Start scene asks for the crowd
   to be off (and, in Task 10, for the title music) before any gesture. That
   request must take effect once sound unlocks, not be lost. *(Task 4 test;
   Task 10 test for music.)*

---

### Task 1: Simulation minors (roof trap, wall clamp, diagonal jump, header depth speed)

**Files:**
- Modify: `src/game/ball.ts` (roof/post-top trap), `src/game/player.ts:300-353` (air target, wall clamp), `src/game/bodies.ts:82-90` (`confine`), `src/game/contact.ts:86-95` (`headBall`)
- Test: `src/game/ball.test.ts`, `src/game/player.test.ts`, `src/game/contact.test.ts`

**Interfaces:**
- Consumes: existing `stepBall`, `stepPlayer`, `resolveBodies`, `resolveContacts`, `header`, `runSpeed`, `BACKYARD`.
- Produces: no new exports.

- [ ] **Step 1: Write the failing tests**

  - `ball.test.ts` › `'a ball resting on the roof exactly over a post (z 18 or 46) rolls off'`: for each goal and each `z` in `[g.z0, g.z1]`, place the ball at `x = g.lineX + 4·(into the goal)`, `y = g.barY + g.barThick + BALL_R`, `z`, at rest. Step 3 s at 1/60. Expect `ball.y` to be `BALL_REST_Y` (it's back on the grass).
  - `ball.test.ts` › `'a ball resting on a post top rolls off'`: the same with `x = g.lineX`.
  - `player.test.ts` › `'a diagonal jump is no faster than a run'`: run with `moveX 1, moveZ 1` for 1 s, then jump, then keep holding. On every airborne tick, expect `Math.hypot(p.vx, p.vz) <= runSpeed(p.stats) + 1e-6`.
  - `player.test.ts` › `'a player pushed into the fence moves away on the first tick he turns'`: start him at `fenceL + PLAYER_R`, hold `moveX -1` for 0.5 s, then hold `moveX 1` for one tick. Expect `p.x` to have increased. Also test the back fence with `moveZ`.
  - `contact.test.ts` › `'header speed counts the ball's depth speed'`: give an airborne player a ball in his head zone with `vx = -100·facing`, `vy = 0`, `vz = 200`. Expect the outgoing speed `hypot(vx, vy, vz)` to equal the speed `header(stats, line, Math.hypot(100, 0, 200))` gives.

- [ ] **Step 2: Run them and check they fail**

  Run: `npx vitest run src/game/ball.test.ts src/game/player.test.ts src/game/contact.test.ts`
  Expected: the five new tests FAIL. The roof-trap failures show the ball still on the roof. Use superpowers:systematic-debugging to find out why the ball sticks at exactly `z0`/`z1` before changing anything.

- [ ] **Step 3: Fix each one**

  - **Roof trap:** fix whatever the debugging finds. The ball must always leave the roof and the post tops, and the existing goal and post tests must still pass.
  - **Diagonal jump:** in the `'air'` case, normalise the air target the way the ground target is normalised (divide by `moveLen`), so `vx` can't reach full run speed while `vz` keeps its takeoff value.
  - **Wall clamp:** where `stepPlayer` (and `confine` in `bodies.ts`) clamps `x`/`z` to the fences, zero the velocity component that points into the wall it was clamped against.
  - **Header:** `const speed = Math.hypot(ball.vx, ball.vy, ball.vz);`

- [ ] **Step 4: Run the whole suite**

  Run: `npm test`
  Expected: all PASS, including the headless AI-vs-AI match tests in `src/game/ai.test.ts` and `world.test.ts`.

- [ ] **Step 5: Commit** `fix: roof trap, wall clamp, diagonal jump, headers`

---

### Task 2: Screen minors (goal drawn by depth, Esc/Start back out)

**Files:**
- Modify: `src/scenes/matchView.ts` (`drawGoalBacks`, `pitchDrawables`), `src/art/venues/backyard.ts` (`goalSprites`, `GoalArt`), `src/scenes/art.ts` (`GoalCanvases`), `src/engine/input.ts` (`KEYS`), `src/scenes/helpScene.ts`, `src/scenes/optionsScene.ts`, `src/scenes/titleMenuScene.ts`
- Test: `src/scenes/matchView.test.ts`, `src/art/venues/backyard.test.ts`, `src/scenes/helpScene.test.ts`, `src/scenes/optionsScene.test.ts`, `src/scenes/titleMenuScene.test.ts`, `src/engine/input.test.ts`

**Interfaces:**
- Produces: `GoalArt` and `GoalCanvases` replace `back` with `farNet` and `nearNet`.
  - `farNet` holds the back net, the far side net, the roof and the crossbar. It is drawn as a pitch `Drawable` at `z = goal.z1`.
  - `nearNet` holds the near side net. It is drawn as a `Drawable` at `z = goal.z0`.
  - `pitchDrawables` lists each goal's nets *before* its posts, so a tie at the same depth draws the post over the net.

- [ ] **Step 1: Write the failing tests**

  - `matchView.test.ts`: update the existing test to expect 11 drawables, with the zs including `18, 46` four times each (the posts and the nets).
  - `'a player behind a goal is drawn before its net and crossbar'`: put `home.z = 52` at the right goal's `lineX`. In `depthSorted(pitchDrawables(...))`, his index is lower than every z-46 item's.
  - `backyard.test.ts`: `farNet` and `nearNet` together cover exactly the pixels the old `back` did. Compare the union of their non-transparent pixels with the old sprite before deleting it, then keep that pixel count as the assertion.
  - `input.test.ts`: `Escape` maps to `['pause', 'back']`.
  - `helpScene.test.ts` and `optionsScene.test.ts`: `frame(['pause'])` returns the `back()` scene.
  - `titleMenuScene.test.ts`: `frame(['pause'])` starts the selected item, the same as `confirm`. `frame(['pause', 'back'])` (Esc) goes to Press Start.

- [ ] **Step 2: Run them and check they fail**

  Run: `npx vitest run src/scenes src/art/venues src/engine/input.test.ts`

- [ ] **Step 3: Implement**

  - Split the goal sprite as described under *Interfaces*.
  - Drop `drawGoalBacks` from `drawMatch`. The nets are now pitch drawables.
  - `KEYS.Escape = ['pause', 'back']`.
  - Help and Options go back on `back` or `pause`.
  - The title menu checks `back` first. `pause` then counts as `confirm` (use `stepMenu` on a frame with `confirm` added, or check both).

- [ ] **Step 4: Run** `npm test`. All pass. Then run `npm run dev -- --port 5179 --strictPort --host 127.0.0.1` (check `ss -ltnp | rg 5179` first). Stage `home` behind the right goal via `window.__soccer.scene()` and look: he's behind the crossbar.

- [ ] **Step 5: Commit** `fix: draw goals by depth, let esc and start back out`

---

### Task 3: Settings v2 and the four-row Options screen

**Files:**
- Modify: `src/meta/settings.ts`, `src/scenes/optionsScene.ts`, every test `CTX` that builds `settings: { version: 1, ... }` (`rg -l "version: 1" src`)
- Test: `src/meta/settings.test.ts`, `src/scenes/optionsScene.test.ts`

**Interfaces:**
- Produces (`src/meta/settings.ts`):
  ```ts
  export interface Settings { version: 2; difficulty: Difficulty; musicVolume: number; sfxVolume: number; rumble: boolean }
  export const VOLUME_MAX = 10;
  export const DEFAULT_SETTINGS: Readonly<Settings>; // { version: 2, difficulty: 'normal', musicVolume: 6, sfxVolume: 8, rumble: true }
  ```
- Produces (`src/scenes/optionsScene.ts`):
  ```ts
  export const OPTION_ROWS = ['DIFFICULTY', 'MUSIC', 'SFX', 'RUMBLE'] as const;
  export type OptionRow = (typeof OPTION_ROWS)[number];
  export function optionRow(row: OptionRow, s: Settings): string; // 'DIFFICULTY  < NORMAL >', 'MUSIC  < 6 >', 'SFX  < 8 >', 'RUMBLE  < ON >'
  export function changeOption(s: Settings, row: OptionRow, step: 1 | -1): Settings;
  ```
  `difficultyRow` is removed; its tests move to `optionRow`.

- [ ] **Step 1: Write the failing tests**

  - `settings.test.ts`:
    - `'a v1 save keeps its difficulty and takes the new defaults'`: stored `{version:1,difficulty:'hard'}` loads as `{ ...DEFAULT_SETTINGS, difficulty: 'hard' }`.
    - `'a bad volume falls back to its default, not the whole save'`: `musicVolume: 99`, `sfxVolume: '7'` and `rumble: 'yes'` each fall back to their own default, and the other fields survive.
    - `'volumes are whole numbers 0–10'`: `musicVolume: 3.6` loads as 4, and `-1` loads as the default.
    - `'a v3 save is never overwritten'`: keep the existing newer-version tests, now with `version: 3`.
  - `optionsScene.test.ts`:
    - up/down move the cursor over the four rows and wrap;
    - left/right on DIFFICULTY wrap through easy, normal and hard;
    - on MUSIC and SFX, right from 10 stays 10 and left from 0 stays 0;
    - on RUMBLE, left or right toggles it;
    - every change calls `ctx.save` once with the new settings;
    - `optionRow('SFX', { ...DEFAULT_SETTINGS })` is `'SFX  < 8 >'`.

- [ ] **Step 2: Run them and check they fail.** `npx vitest run src/meta src/scenes/optionsScene.test.ts`

- [ ] **Step 3: Implement**

  - `loadSettings` validates field by field. A v1 save is migrated, and `isNewer` compares against 2.
  - The Options scene keeps a `row` index. The selected row is drawn in `energyGold` behind a `+` cursor, matching `drawMenu`. Grow `PANEL.h` to fit four rows. Each row's height and the positions are the builder's choice.
  - Update every test `CTX` to `settings: { ...DEFAULT_SETTINGS }`.

- [ ] **Step 4: Run** `npm test && npm run typecheck`. Both pass.

- [ ] **Step 5: Commit** `feat: add music, sfx and rumble options`

---

### Task 4: The audio engine (cues, synth, unlock, hint)

**Files:**
- Create: `src/audio/cues.ts`, `src/audio/synth.ts`, `src/audio/testAudio.ts`
- Modify: `src/scenes/context.ts`, `src/scenes/game.ts`, `src/scenes/titleScene.ts`, every test `CTX` (add `audio: recordingAudio()`)
- Test: `src/audio/cues.test.ts`, `src/audio/synth.test.ts`, `src/scenes/titleScene.test.ts` (create)

**Interfaces:**
- Produces (`src/audio/cues.ts`):
  ```ts
  export type Cue = 'kickSoft' | 'kickHard' | 'tap' | 'bounce' | 'post' | 'fence' | 'tackle' | 'net' | 'perfect'
    | 'whistleShort' | 'whistleFull' | 'roar' | 'groan' | 'ooh' | 'menuMove' | 'menuConfirm' | 'menuBack';
  export type Wave = 'square' | 'triangle' | 'noise';
  export interface Voice {
    wave: Wave; at?: number; dur: number; gain: number; attack?: number;
    freq: number; toFreq?: number;                    // pitch, or the noise filter's centre for 'noise'
    filter?: { type: 'lowpass' | 'bandpass' | 'highpass'; q?: number };
    vibrato?: { hz: number; depth: number };
  }
  export interface CueRecipe { voices: readonly Voice[]; minGapS: number }
  export const CUES: Readonly<Record<Cue, CueRecipe>>;
  ```
- Produces (`src/audio/synth.ts`):
  ```ts
  export type CrowdLevel = 'off' | 'low' | 'match';
  export interface GameAudio {
    readonly available: boolean;   // a context can be made at all
    readonly unlocked: boolean;    // the context is running
    unlock(): void;                // create/resume; safe to call any number of times; never throws
    setVolumes(music: number, sfx: number): void;  // 0–10 each
    play(cue: Cue): void;          // ignored while locked; ignored if the same cue played < minGapS ago
    setCrowd(level: CrowdLevel): void;             // remembered while locked, applied on unlock
    suspend(): void;
    resume(): void;
  }
  export function volumeGain(level: number): number;  // (clamp(level, 0, 10) / 10) ** 2
  export function createAudio(makeContext: (() => AudioContext) | null): GameAudio;
  ```
- Produces (`src/audio/testAudio.ts`): `export function recordingAudio(): GameAudio & { played: Cue[]; crowd: CrowdLevel }`. It is always unlocked and records every `play` and `setCrowd`.
- Produces (`src/scenes/context.ts`): `GameContext` gains `audio: GameAudio`.

- [ ] **Step 1: Write the failing tests**

  - `cues.test.ts`:
    - every `Cue` has at least one voice;
    - every `at + dur <= 2.5`;
    - every `0 < gain <= 1`;
    - `'tap'` and `'bounce'` have `minGapS >= 0.06`;
    - `'tap'`'s loudest voice is at most a quarter of `'kickHard'`'s.
  - `synth.test.ts` uses a small hand-written fake `AudioContext` that counts the sources it creates and lets a test make `resume()` reject:
    - `'createAudio(null) is unavailable and every call is a no-op'`;
    - `'nothing plays before unlock'`;
    - `'unlock with a rejecting resume stays locked and does not throw'` (Review Focus 1);
    - `'setCrowd twice makes one crowd source'` (Review Focus 3);
    - `'a crowd level set while locked starts on unlock'` (Review Focus 5);
    - `'the same cue inside minGapS plays once'`;
    - `'volumeGain(0) is 0 and volumeGain(10) is 1'`.
  - `titleScene.test.ts`: `'shows the sound hint while audio is available but locked'`. Expose a `soundHint: boolean` getter on the Press Start scene, as the match scene does with `paused`.

- [ ] **Step 2: Run them and check they fail.** `npx vitest run src/audio src/scenes/titleScene.test.ts`

- [ ] **Step 3: Implement**

  - **Buses:** master → (music, sfx). Set the bus gains from `volumeGain`. Make a master ceiling constant (`MASTER_GAIN = 0.7`) so even 10/10 isn't harsh.
  - **Noise:** build one 1 s white-noise `AudioBuffer`, created once and reused.
  - **Crowd:** one looping noise source through a bandpass at about 500 Hz, with its own gain node, created once. `setCrowd` only changes that gain (`off` 0, `low` 0.04, `match` 0.12, then × the SFX bus). The crowd sits well under everything else.
  - **Recipes:** write them by ear. Kicks are short noise and triangle thumps, the post is a square ping around 1.2 kHz with a fast decay, and the whistle is a triangle around 1.9 kHz with vibrato (`hz 28, depth 60`). `whistleFull` has three blasts at `at` 0, 0.35 and 0.7, the last one longest. The roar is bandpass noise that swells over 0.8 s and fades by 2.5 s. The groan is noise with its filter falling from 700 to 250 Hz. The "ooh" is filtered noise rising and falling. The menu blips are tiny squares. Keep everything short and nothing shrill.
  - **`game.ts`:**
    - make `createAudio(typeof AudioContext === 'undefined' ? null : () => new AudioContext())`;
    - call `unlock()` on `keydown` and `pointerdown`, and whenever a polled frame has any pressed action (harmless if Chrome refuses);
    - apply `setVolumes` from the settings at boot and in `ctx.save`;
    - `suspend()` on `visibilitychange` when hidden, `resume()` when shown.
  - **Press Start:** call `ctx.audio.setCrowd('off')` when the scene is created. Draw `'CLICK OR PRESS A KEY FOR SOUND'` (scale 1, `silver`) while `available && !unlocked`.

- [ ] **Step 4: Run** `npm test && npm run typecheck`. Then in Chrome: no sound and the hint on load; one click, the hint goes. (There's nothing audible yet except what Task 5 wires.)

- [ ] **Step 5: Commit** `feat: add the synthesised audio engine`

---

### Task 5: Match and menu sounds

**Files:**
- Create: `src/audio/matchFeedback.ts`
- Modify: `src/scenes/matchScene.ts`, `src/scenes/menu.ts`, `src/scenes/titleScene.ts`, `src/scenes/titleMenuScene.ts`, `src/scenes/helpScene.ts`, `src/scenes/optionsScene.ts`
- Test: `src/audio/matchFeedback.test.ts`, `src/scenes/matchScene.test.ts`, `src/scenes/menu.test.ts`

**Interfaces:**
- Consumes: `World`, `WorldEvents`, `Phase` and `Cue` (Task 4), and `RumbleKind` (Task 6 defines it; in this task declare it in `src/engine/rumble.ts` as just the type, `export type RumbleKind = 'hardShot' | 'post' | 'tackle' | 'goal' | 'maxGoal' | 'tap';`).
- Produces:
  ```ts
  // src/audio/matchFeedback.ts
  export const HARD_KICK_SPEED = 350; // px/s of ball speed after the kick; tune by ear
  export interface MatchFeedback { cues: Cue[]; rumble: RumbleKind[] }
  export function matchFeedback(w: World, prevPhase: Phase): MatchFeedback;
  // src/scenes/menu.ts
  export function menuCue(before: MenuState, r: { m: MenuState; chosen: string | null; back: boolean }): Cue | null;
  ```

**`matchFeedback` rules.** The kicks are `[home, away]`, as the match scene already assumes. The rumble only ever reflects things Harrison feels.

| Event | Cues | Rumble |
|---|---|---|
| a kick with `kicked` set | `kickHard` if `hypot(ball.vx, ball.vy, ball.vz) >= HARD_KICK_SPEED`, else `kickSoft` | `hardShot` if it's home's kick and hard |
| `touched` with no `kicked` | `tap` | none |
| `perfect` | `perfect` | none |
| `tackledBall` or `trippedOpponent` (either team) | `tackle` | `tackle` |
| `ball.bounced` | `bounce` | none |
| `ball.hitPost` or `ball.hitBar` | `post`, `ooh` | `post` |
| `ball.hitWall` | `fence` | none |
| `ball.hitNet` | none: it fires every tick a ball rests against the net | none |
| `goal === 'home'` | `net`, `roar` | `goal` |
| `goal === 'away'` | `net`, `groan` | `maxGoal` |
| `prevPhase === 'kickoff'` and the phase is now `'playing'` | `whistleShort` | none |
| `prevPhase !== 'fullTime'` and the phase is now `'fullTime'` | `whistleFull` | none |

- [ ] **Step 1: Write the failing tests**

  - `matchFeedback.test.ts`: one test per table row, built from a `createWorld` with hand-set `events` and phases. Also `'a resting ball against the net makes no sound'`.
  - `menu.test.ts`: `menuCue` returns `menuMove` when the index changed, `menuConfirm` when something is chosen, `menuBack` on back, and otherwise null.
  - `matchScene.test.ts`:
    - `'a home goal plays net and roar'`: stage the ball just over the right goal line and step once;
    - `'the crowd is at match level in play and low while paused'`;
    - `'quit to title turns the crowd off'`.

- [ ] **Step 2: Run them and check they fail.** `npx vitest run src/audio src/scenes`

- [ ] **Step 3: Implement**

  - The match scene records `prevPhase` before `stepWorld`, then plays every cue from `matchFeedback`. It keeps the rumble list for Task 6.
  - On creation the match scene calls `setCrowd('match')`. Opening the pause menu sets `'low'`, resuming sets `'match'`, and quit to title sets `'off'`.
  - Every menu screen plays `menuCue`, and the Press Start confirm plays `menuConfirm`. A Help page flip is `menuMove` and its back is `menuBack`. An Options change is `menuMove`, played *after* `ctx.save`, so an SFX change is heard at its new level.

- [ ] **Step 4: Run** `npm test`. Then in Chrome play a minute: kicks, bounces, a post, the whistles, a goal roar. Tune `HARD_KICK_SPEED` and the gains by ear.

- [ ] **Step 5: Commit** `feat: play sounds for the match and menus`

---

### Task 6: Rumble

**Files:**
- Modify: `src/engine/rumble.ts`, `src/scenes/context.ts`, `src/scenes/game.ts`, `src/scenes/matchScene.ts`, `src/scenes/optionsScene.ts`, every test `CTX` (add `rumble: recordingRumble()`)
- Create: `src/engine/testRumble.ts`
- Test: `src/engine/rumble.test.ts`, `src/scenes/matchScene.test.ts`, `src/scenes/optionsScene.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // src/engine/rumble.ts
  export const RUMBLE: Readonly<Record<RumbleKind, { ms: number; strong: number; weak: number }>>;
  //   hardShot {120, 0.5, 0.3}  post {150, 0.6, 0.4}  tackle {100, 0.4, 0.6}
  //   goal {700, 1, 0.8}  maxGoal {150, 0.2, 0.3}  tap {80, 0.2, 0.2}
  export interface Rumble { enabled: boolean; pulse(kind: RumbleKind): void }
  export function createRumble(getPads: () => readonly (Gamepad | null)[]): Rumble;
  // src/engine/testRumble.ts
  export function recordingRumble(): Rumble & { pulses: RumbleKind[] };
  ```
  `GameContext` gains `rumble: Rumble`.

- [ ] **Step 1: Write the failing tests**

  - `rumble.test.ts`, with fake pads:
    - `'pulses the first connected pad with a dual-rumble effect'`: check `playEffect` gets `'dual-rumble'` and `{ duration: 700, strongMagnitude: 1, weakMagnitude: 0.8 }` for `goal`;
    - `'does nothing when disabled'`;
    - `'does nothing and does not throw with no pad, no vibrationActuator, or a rejecting playEffect'`.
  - `matchScene.test.ts`: `'a home goal rumbles goal; RUMBLE OFF is respected by the Rumble, not the scene'`. The scene always calls `pulse`, and `enabled` gates it.
  - `optionsScene.test.ts`: `'turning rumble on gives a tap pulse'`.

- [ ] **Step 2: Run them and check they fail.**

- [ ] **Step 3: Implement**

  - `pulse` wraps everything in try/catch and attaches `.catch(() => {})` to the promise.
  - `game.ts` makes `createRumble(() => navigator.getGamepads?.() ?? [])` and sets `enabled` from the settings at boot and in `ctx.save`.
  - The match scene pulses each kind in `matchFeedback(...).rumble`.

- [ ] **Step 4: Run** `npm test`. If a gamepad is attached, try it in Chrome. Otherwise check with a fake pad on `window.__soccer`.

- [ ] **Step 5: Commit** `feat: rumble the controller on big hits and goals`

---

### Task 7: The goal moment's timeline and the match scene

**Files:**
- Create: `src/scenes/goalMoment.ts`
- Modify: `src/game/match.ts` (add `endGoalPause`), `src/scenes/matchScene.ts`
- Test: `src/scenes/goalMoment.test.ts`, `src/game/match.test.ts`, `src/scenes/matchScene.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // src/scenes/goalMoment.ts (all times in real seconds since the goal)
  export const HIT_STOP_S = 0.1, SLOW_MO_END_S = 1.1, SLOW_MO_SCALE = 0.25, SHAKE_S = 0.8, SHAKE_PX = 4,
    FLASH_S = 1 / 60, BANNER_FROM_S = 0.3, CELEBRATE_FROM_S = 1.6, MOMENT_S = 3.8, SKIP_AFTER_S = 0.5;
  export interface GoalMoment { t: number; done: boolean }
  export function createGoalMoment(): GoalMoment;
  export function stepGoalMoment(gm: GoalMoment, dt: number, skip: boolean): void; // done at MOMENT_S, or on skip once t >= SKIP_AFTER_S
  export function simScale(gm: GoalMoment): number; // 0 before HIT_STOP_S; SLOW_MO_SCALE before SLOW_MO_END_S; 1 before CELEBRATE_FROM_S; 0 after (frozen behind the celebration)
  export function shakeOffset(gm: GoalMoment): { dx: number; dy: number }; // whole pixels, amplitude SHAKE_PX falling linearly to 0 over SHAKE_S after the hit-stop
  export function flashing(gm: GoalMoment): boolean;     // t < FLASH_S
  export function bannerShown(gm: GoalMoment): boolean;  // t >= BANNER_FROM_S
  export function celebrating(gm: GoalMoment): boolean;  // t >= CELEBRATE_FROM_S && !done
  // src/game/match.ts
  export function endGoalPause(m: MatchState): void; // in 'goal', jumps phaseT to GOAL_PAUSE_S so the next step moves on
  ```
  `MatchScene` gains `readonly moment: GoalMoment | null`, and `MatchHud` gains `moment: GoalMoment | null`.

- [ ] **Step 1: Write the failing tests**

  - `goalMoment.test.ts`:
    - `simScale` at t 0.05 → 0, 0.5 → 0.25, 1.3 → 1, 2.0 → 0;
    - `shakeOffset` is within `±SHAKE_PX` and is `{0, 0}` from `HIT_STOP_S + SHAKE_S` on;
    - `flashing` only on the first tick;
    - skip before 0.5 s is ignored, skip after it sets done;
    - the moment is done at 3.8 s without a skip.
  - `match.test.ts`: `'endGoalPause makes the next step kick off'`, and `'after a golden goal it goes to full time'`.
  - `matchScene.test.ts`:
    - `'Harrison's goal runs the moment, then kicks off'`: stage a home goal, step 3.9 s with no input, and expect the phase `'kickoff'` and `moment` null;
    - `'a confirm press after 0.5 s skips to the kickoff'`;
    - `'Max's goal has no moment and kicks off after GOAL_PAUSE_S'`;
    - `'a golden goal by Harrison runs the moment, then full time'`;
    - `'pausing mid-moment and resuming continues it, and the goal cues and rumble fire once'` (Review Focus 2);
    - `'holding shoot through the skip and the kickoff does not charge until a fresh press'` (Review Focus 4).

- [ ] **Step 2: Run them and check they fail.**

- [ ] **Step 3: Implement**

  - When the world reports `goal === 'home'`, the match scene sets `moment = createGoalMoment()`.
  - Each non-paused tick:
    ```ts
    const scale = moment ? simScale(moment) : 1;
    if (scale > 0) stepWorld(world, intent, think(..., dt * scale), dt * scale);
    if (moment) {
      stepGoalMoment(moment, dt, skipPressed);
      if (moment.done) { endGoalPause(world.match); moment = null; }
    }
    ```
    Here `skipPressed = input.pressed.has('confirm') || input.pressed.has('shoot')`.
  - Any other per-tick work (feedback, camera) runs only on ticks where the world stepped.
  - Headless matches never create a scene, so they're untouched.

- [ ] **Step 4: Run** `npm test`. All pass.

- [ ] **Step 5: Commit** `feat: slow motion goal moment for Harrison`

---

### Task 8: The goal moment on screen and the arms-up fallback

**Files:**
- Modify: `src/scenes/matchView.ts`, `src/art/body/animations.ts` (add `'celebrate'`), `src/scenes/art.ts` if needed
- Test: `src/scenes/matchView.test.ts`, `src/art/body/bake.test.ts` (if it lists the animations)

**Interfaces:**
- Consumes: `GoalMoment`, `shakeOffset`, `flashing`, `bannerShown`, `celebrating` (Task 7).
- Produces:
  - `AnimName` gains `'celebrate'`: both arms straight up, a two-key bob, `fps 6`, looping.
  - `export function banner(w: World, moment: GoalMoment | null): { text: string; scale: number } | null` (exported for tests). It returns:
    - `{ text: 'GOAL!!!', scale: 3 }` while `moment && bannerShown(moment)`;
    - `{ text: 'MAX SCORES', scale: 2 }` in `'goal'` when `lastScorer === 'away'`;
    - null in `'goal'` otherwise;
    - FULL TIME, KICK OFF and GOLDEN GOAL as now.

- [ ] **Step 1: Write the failing tests**

  - `banner` tests for each case above.
  - `'while celebrating without the card, Harrison is drawn with the celebrate clip'`: expose the clip choice as `export function homeClip(w: World, moment: GoalMoment | null, withCard = false): { name: AnimName; frame: number }` and test it.

- [ ] **Step 2: Run them and check they fail.**

- [ ] **Step 3: Implement** in `drawMatch`:
  - wrap the scenery and pitch drawing in `g.save(); g.translate(dx, dy)` from `shakeOffset` (the HUD and banners don't shake);
  - while `flashing`, fill the view white at `globalAlpha 0.6`;
  - GOAL!!! slams in: for its first 0.1 s draw it at scale 4, then at scale 3 with a small downward bounce that settles over about 0.2 s;
  - while `celebrating`, draw home with the `celebrate` frames, bobbing up 2 px on alternate frames.
  - Check the new pose in `?viewer`.

- [ ] **Step 4: Run** `npm test && npm run build`. Then playtest in Chrome: score with Harrison (stage it via `window.__soccer`, e.g. the ball on the right goal line with `vx` toward goal) and watch the hit-stop, slow motion, shake, GOAL!!!, arms up and kickoff. Then score as Max. Capture a short GIF (see the dev notes in memory) and send it to the parent.

- [ ] **Step 5: Commit** `feat: shake, flash and GOAL!!! for Harrison's goals`

### Safety checkpoint (after Task 8)

- [ ] Run `npm test`, `npm run build`, and the Chrome playtest of both goals with sound on.
- [ ] Merge to `main` locally (superpowers:finishing-a-development-branch, "merge locally"), then **ask the parent before pushing**. After the push, confirm the Pages deploy succeeded and that the live site plays sound.
- [ ] Continue on the branch for Tasks 9–10.

---

### Task 9: "Point to the Back" (art checkpoint)

**Files:**
- Create: `src/art/harrison/backCard.ts`
- Modify: `src/scenes/art.ts` (`GameArt.backCard`), `src/scenes/matchScene.ts` (draw it while `celebrating`), `tools/render-sheet.ts` (include the card)
- Test: `src/art/harrison/backCard.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const BACK_CARD = { w: 112, h: 104 }; // builder may adjust; it must fit 320×180 with a margin
  export function harrisonBackCard(): IndexedImage; // uses the harrisonLook('home') slots; HARRISON and 12 are part of the image, in the Trim slot with an Outline edge
  ```
  `GameArt` gains `backCard: HTMLCanvasElement`.

- [ ] **Step 1: Write the failing tests**

  - the card is `BACK_CARD.w × BACK_CARD.h`;
  - it only uses slot ids from `ART_LEGEND` that `harrisonLook('home')` resolves;
  - it contains the Trim pixels of both words;
  - it has no Skin pixels in the face region (it's a back view).

- [ ] **Step 2: Run it and check it fails.**

- [ ] **Step 3: Draw the card**

  It shows Harrison's head and shoulders from behind:
  - light-brown hair with golden-blond ends, and the faded sides (the `Fade` slot);
  - his ears, the red home shirt;
  - HARRISON across the shoulders (`renderText` at scale 1, blitted in with its ids remapped to Trim/Outline) and a big 12 below it (scale 3);
  - both thumbs pointing back over his shoulders at it.

  Work out the hair from behind from `src/art/harrison/head.ts`, the portrait grid and the reference photos (local only; look, never copy them out). Add the card to `npm run sheet` at a large scale.

- [ ] **Step 4: ART CHECKPOINT.** Run `npm run sheet`, crop the card from `preview/character-sheet.png` at 4×, and send it to the parent with SendUserFile. Ask: "Does this read as Harrison from behind?" Allow up to two rounds of changes. **If it isn't approved by 3:15 pm, stop: the arms-up fallback ships, and you go to Task 10.**

- [ ] **Step 5: Once approved, wire it in.** While `celebrating`, the match scene draws the scene darkened (an `ink` fill at `globalAlpha 0.5`), then the card centred, popping in over its first 0.15 s, with the thumbs jabbing on a 0.4 s beat if there's time. Draw nothing of Harrison's arms-up pose underneath. Pass `withCard = true` to `homeClip` once the card is wired, so it keeps the normal clip. Test: `'with the card, homeClip is the normal clip'`.

- [ ] **Step 6: Run** `npm test && npm run build`, then playtest a Harrison goal in Chrome and send the parent a screenshot.

- [ ] **Step 7: Commit** `feat: point to the back celebration`

---

### Task 10: Music (the cut line: skip it if it's past 3:30 pm)

**Files:**
- Create: `src/audio/music.ts`
- Modify: `src/audio/synth.ts` (`playMusic`), `src/audio/testAudio.ts`, `src/scenes/titleScene.ts`, `src/scenes/titleMenuScene.ts`, `src/scenes/matchScene.ts`
- Test: `src/audio/music.test.ts`, `src/audio/synth.test.ts`, `src/scenes/matchScene.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // src/audio/music.ts
  export type Track = 'title' | 'win' | 'lose' | 'draw';
  export interface Song { bpm: number; loop: boolean; parts: readonly { wave: 'square' | 'triangle'; gain: number; notes: string }[] }
  export const SONGS: Readonly<Record<Track, Song>>;
  // notes: space-separated 'C5', 'F#4:2', 'Bb3:0.5' or '-:1' for a rest; the default length is 1 beat
  export function parseNotes(s: string): { freq: number | null; beats: number }[];
  // src/audio/synth.ts: GameAudio gains
  playMusic(track: Track | null): void; // same track already playing → no-op; null stops; remembered while locked
  ```
  `recordingAudio()` gains `music: Track | null`.

- [ ] **Step 1: Write the failing tests**

  - `parseNotes('A4 -:2 C#5:0.5')` gives `[{440,1}, {null,2}, {554.37,0.5}]` (frequency within 0.01);
  - every song's parts have equal total beats;
  - `title` loops and the jingles don't;
  - every jingle is at most 3 s long at its bpm;
  - in the synth, `playMusic('title')` twice schedules one loop, and a track asked for while locked starts on unlock (Review Focus 5);
  - the match scene stops music on creation and plays `win`, `lose` or `draw` on entering full time.

- [ ] **Step 2: Run them and check they fail.**

- [ ] **Step 3: Implement**

  - **Scheduler:** a lookahead scheduler in the synth (`setInterval` 25 ms, schedule 0.1 s ahead on the music bus) with short envelopes per note.
  - **Title theme:** an 8-bar major-key loop, square lead plus triangle bass, around 140 bpm.
  - **Jingles:** win is a rising major arpeggio, lose a falling minor phrase, draw a neutral two-note shrug.
  - **Wiring:** Press Start and the title menu call `playMusic('title')` when created. Help and Options leave the music alone.

- [ ] **Step 4: Run** `npm test && npm run build`, then listen in Chrome: the title, a full match to full time, and the MUSIC slider at 0 and 10.

- [ ] **Step 5: Commit** `feat: add title theme and result jingles`

### Release (after Task 9 and/or 10, before 3:45 pm)

- [ ] Run `npm test`, `npm run build`, and a Chrome playtest of both goals and the full time.
- [ ] Use superpowers:requesting-code-review on the branch if time allows; otherwise note that it's owed.
- [ ] Merge locally and **ask the parent before pushing**. After the push, check that the Pages deploy succeeded and the live site works.
- [ ] Update the `harrison-soccer-status` memory: what shipped, what was cut, what's still owed.
