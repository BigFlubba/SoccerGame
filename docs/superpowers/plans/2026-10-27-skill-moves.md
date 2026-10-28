# Skill Moves Implementation Plan (the stepover and the rainbow flick)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harrison's first skill moves. From level 4, RB does a
**stepover** and stick up + RB a **rainbow flick**. Either one fools a
defender who's squared up to him at the right moment: the stepover leaves
the defender confused, and the flick trips him up. A short cooldown and a
"wise to it" rule stop mashing. Each opponent reacts in their own way. A
trick that fools someone gets a callout, the crowd's "ooh" and a little
meter, and a goal straight after one is a TRICK GOAL. A scripted trickster
and a spammer in CI keep the tricks from being too hard or too easy.

**Architecture:**
- **The moves.** `src/game/tricks.ts` holds the tricks' numbers and two
  world steps, modelled on `dragBack.ts`. `startTrick` reads RB from
  `PlayerIntent.skill` and starts a trick when the ball is his.
  `stepTrick` runs the trick each tick: it carries the ball through a
  stepover, rides it up his calf and launches the flick, resolves **the
  sell**, and counts the fooled, wise and cooldown timers down. While
  `Player.trick` is set, `stepPlayer` substitutes his committed movement,
  as it does for the drag-back's turn.
- **Fooling.** The sell checks `squaredUp(w)`. A defender who is squared
  up gets `Player.fooled` (`confused` or `stumble`). One who only saw the
  trick gets `Player.wiseS`. A fooled player's ball contacts are skipped,
  and his body stays solid. The brain (`think`, and `dogThink` for
  Biscuit) has a fooled branch ahead of everything but a live wave: a sway
  and stand, a stumble with the stick let go (so Sam's soft brakes carry
  him on), a head tilt, or a tumble.
- **Who gets what.** `World.tricks: TrickSetup | null` is the window and
  base times for the difficulty plus this opponent's scale. It is null
  below level 4, so RB does nothing and the match plays exactly as
  before. `trickSetup(d, opponent)` in `opponents.ts` builds it: the human
  scales are keyed by `Style`, and Biscuit has `DOG_TRICKS`.
- **No dice.** Nothing in the tricks draws a random number, so every
  existing seeded test plays the same until a trick happens, and the
  scripted Harrisons never press RB.
- **Feel and rewards.** `TrickEvents` in `WorldEvents` drive the cues
  (`stepover`, `flick`, `ooh`), the callout and the meter. `goalCallout.ts`
  tracks the trick goal's chance. `StyleKind` and `GoalKind` gain
  `'trick'`.

**Tech Stack:** Vite 8, TypeScript 7 (strict), Canvas 2D, Web Audio, Gamepad
API, Vitest 4. No runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-27-skill-moves-design.md`. It
wins over this plan if they ever disagree.

## Global Constraints

- **Nobody else changes.** `maxTuning.test.ts`, `crewTuning.test.ts`,
  `samTuning.test.ts`, `dogTuning.test.ts`, the AI-vs-AI tests in
  `ai.test.ts`, the no-kit parity test and the handling snapshots in
  `world.test.ts` pass unchanged. Don't edit them.
- **No dice in the tricks:** no `w.rng()` or other random draw anywhere in
  the trick code. A world with `tricks` set and no RB press plays exactly
  as one without (Task 2 pins it).
- **No save change.** Owning the tricks comes from `profile.level >= 4`.
  There's no new profile field and no version bump.
- **On-screen text** uses only uppercase letters, digits and
  `' - : ! ? . , / + < >`. No image, audio or font files, and no surname
  anywhere.
- **The spec's numbers** (starting values, tuned in Task 6):
  - Windows: Easy 12–56 px, Normal 14–46 px, Hard 16–38 px.
  - Lane: 14 px. Seeing a trick: 120 px.
  - Base reaction times, from the sell: Easy 0.9 s, Normal 0.7 s, Hard 0.5 s.
  - Scales: Max ×1/×1, Brick ×0.3/×1.2, Leo ×1/×1, Tia ×0.6/×0.6,
    Pete ×1.5/×1.5, Sam ×1/×1, Biscuit ×1/×1.
  - Timings: stepover about 0.4 s and flick about 0.5 s, each sold half
    way. Cooldown 1 s. Wise 3 s. Trick goal within 4 s. Meter +0.1.
  - Unlock level 4.
- **Approvals:** the parent approves the tricks sheet and GIF before any
  merge. Ask before merging into `main` and before every push (Pages
  deploys on push). Commits follow Conventional Commits 50/72, with **no
  AI attribution trailers**. Run `git status --short` before each commit:
  no photo staged.
- **Two readings of the spec, settled here:**
  - The world can't see the brain's state. So "not wrong-footed after a
    steal" is done by the world setting the away player's `wiseS` to the
    profile's `wrongFootedS` on a clean steal. "Not holding his kickoff
    spot" is done by refusing the sell while the ball is still on the
    centre spot at Harrison's kickoff.
  - The flick's arc has to clear a 40 px player standing 12–56 px ahead.
    That needs an apex of about 80–90 px, not the spec's "about 50"; the
    clearance is the requirement and the 50 was a guess. Record the
    as-built arc in the spec's "As built" notes.

## Review Focus

1. **A trick beside a fence, a post or a net.** The stepover's carry and
   the flick's ride never put the ball through anything: they stop where
   `canPlace` fails, as the drag-back does. A flick into the end boards
   bounces back into play, and a flick that lands on a net's roof is no
   goal. Pinned in Task 2.
2. **Play stopping mid-trick.** On a full-time whistle, the end of golden
   goal, or a goal, a trick under way ends at once and he stands still.
   The kickoff after it clears `trick`, `trickCooldownS`, `fooled` and
   `wiseS` on both players. Pinned in Tasks 2 and 3.
3. **Pause and Options mid-trick.** Pausing mid-stepover or mid-confusion
   and resuming carries on where it was. An Options difficulty change sets
   `world.tricks` to the new difficulty's setup and leaves Sam's handling
   alone. Pinned in Task 5.
4. **A ball at a fooled player's feet.** A ball rolling into a confused
   defender's feet passes through, and `touchedBy` doesn't change to his
   team. A fooled Biscuit doesn't grab a ball at his muzzle. Pinned in
   Tasks 3 and 4.
5. **RB when no trick can start:** with no ball, in the air, mid-drag-back,
   stumbling after a missed steal, during a live wave, while Biscuit
   carries, during the cooldown, and below level 4. Nothing happens, no
   cooldown starts, and a held RB never repeats. Pinned in Task 2.

---

### Task 1: The tricks' frames, and the parent's sheet

**Files:**
- Modify: `src/art/body/animations.ts` (four clips), `src/art/opponents/biscuit.ts` (two dog clips), `tools/render-sheet.ts` (a tricks sheet)
- Test: `src/art/body/bake.test.ts`, `src/art/opponents/biscuit.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // animations.ts
  AnimName adds 'stepover' | 'flick' | 'fooled' | 'stumble';
  // stepover: 4 frames, ~10 fps, not looping: the foot circling over the ball, the body dipping to the side
  // flick:    6 frames, ~12 fps, not looping: ball between the feet, rolled up the calf, the heel flick, follow-through
  // fooled:   3 frames, ~6 fps, looping: leaning the wrong way, arms out
  // stumble:  4 frames, ~10 fps, not looping: the lurch, arms flailing, catching himself
  export const FLICK_RELEASE_FRAME = 3;   // the frame the heel lets the ball go
  // biscuit.ts
  DogAnim adds 'tilt' | 'tumble';         // tilt 2 frames ~3 fps; tumble 5 frames ~10 fps: spring, miss, roll, scramble up
  ```

- [ ] **Step 1: Write the failing tests**
  - `bake.test.ts`: `bakeAll` gives `stepover` 4, `flick` 6, `fooled` 3 and
    `stumble` 4 frames for `HARRISON_BODY` and for each opponent body,
    within each body's colour budget.
  - In the flick's release frame, the near heel is behind the hips and
    above ankle height (compare the pose's points, as `pose.test.ts`
    does).
  - In `stumble`'s first frame the torso leans forward of the hips.
  - `biscuit.test.ts`: `BISCUIT_FRAMES.tilt` has 2 frames and `tumble` has
    5, each the size of his other frames and within his palette.

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/art/body src/art/opponents/biscuit.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Draw them.** Add the keys in `animations.ts`'s style and
  the dog frames in `biscuit.ts`'s. In `render-sheet.ts`, write a second
  sheet, `preview/tricks-sheet.png`, with:
  - Harrison's stepover and flick in the home and away kits;
  - Max, each crew kid and Sam with their fooled and stumble frames, a
    white outlined pixel-font `?` above the head of the first fooled
    frame;
  - Biscuit's tilt (with the `?`) and tumble.

- [ ] **Step 4: Run the tests and render the sheet**

  Run: `npm test && npm run typecheck && npm run sheet`
  Expected: PASS. Read `preview/tricks-sheet.png` and check it.

- [ ] **Step 5: Commit** with `feat: draw the stepover and the rainbow flick`.

- [ ] **Step 6: Send the sheet** to the parent with SendUserFile. Say the
  GIF follows once the tricks are tuned (Task 6). Carry on meanwhile.

---

### Task 2: RB, and the two tricks on the ball

**Files:**
- Create: `src/game/tricks.ts`, `src/game/tricks.test.ts`
- Modify: `src/engine/input.ts` (`'skill'`), `src/game/player.ts` (fields, committed intent, animation), `src/game/dragBack.ts` (export the "ball is his" test), `src/game/steal.ts` (no steal mid-trick), `src/game/world.ts` (`tricks`, the start and step calls, the power-up's end, home contacts during a trick)
- Test: `src/engine/input.test.ts`, `src/game/player.test.ts`, `src/game/world.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // input.ts
  Action adds 'skill';                 // pad button 5 (RB), key KeyD
  // player.ts
  PlayerIntent.skill?: boolean;        // Harrison's RB, pressed this tick; absent for the computer
  Player.trick: null | { kind: TrickKind; t: number; side: 1 | -1; sold: boolean; pace: number };
  Player.trickCooldownS: number;
  // dragBack.ts
  export function ballIsHis(w: World): boolean;   // low, 0..DRAG_REACH ahead, within DRAG_SIDE in depth, not at the away player's feet (no dog) nor in the dog's mouth
  // tricks.ts
  export type TrickKind = 'stepover' | 'flick';
  export interface TrickProfile { near: number; far: number; confusedS: number; stumbleS: number }
  export interface TrickScale { stepover: number; flick: number }
  export interface TrickSetup { profile: TrickProfile; scale: TrickScale }
  /** Mutable, for headless sweeps. */
  export const TRICK_DIFFICULTY: Record<Difficulty, TrickProfile>;
  export const STEPOVER = { durationS: 0.4, sellS: 0.2, pace: 0.5, swayPx: 8 };
  export const FLICK = { durationS: 0.5, sellS: 0.25, vx: 100, vy: 380, rideY: 12 };
  export const TRICK_COOLDOWN_S = 1;
  export const STICK_UP = 0.5;         // moveZ at or above this on the press: the flick
  export interface TrickEvents { started: TrickKind | null; released: boolean; fooled: TrickKind | null }
  export const quietTricks = (): TrickEvents;
  export function startTrick(w: World, intent: PlayerIntent): TrickKind | null;
  export function stepTrick(w: World, dt: number): TrickEvents;
  // world.ts
  World.tricks: TrickSetup | null;
  WorldEvents.trick: TrickEvents;
  export function createWorld(..., awayHandling: Handling = NORMAL_HANDLING, tricks: TrickSetup | null = null): World;
  ```
  `tricks.ts` takes only *types* from `ai.ts` (`Difficulty`, `Style`),
  and `ai.ts` and `dogAi.ts` never import `tricks.ts`: it reaches `ai.ts`
  through `dragBack.ts` → `steal.ts`, so either direction would make a
  cycle. Everything the brains need is on `Player.fooled` (Task 3).

- [ ] **Step 1: Write the failing tests**
  - `input.test.ts`: pad button 5 and `KeyD` give `'skill'`.
  - `tricks.test.ts`, staged worlds with `tricks: { profile:
    TRICK_DIFFICULTY.normal, scale: { stepover: 1, flick: 1 } }` and the
    ball at Harrison's feet:
    - RB starts a stepover; RB with `moveZ` 0.6 starts a flick;
      `events.trick.started` names it.
    - **Stepover:** the ball stays within `FOOT_SPOT ± 3` px ahead of him
      for the whole 0.4 s. He moves forward at about half his run whatever
      the stick says. His own contacts are quiet.
    - **Flick:** the ball rides up behind him to `rideY` and is launched at
      `sellS`, with `events.trick.released` true that tick. Its top
      clears 45 px (`PLAYER_H` plus the ball and a little) everywhere
      12–56 px ahead of his release spot. It lands 60–100 px ahead.
      Harrison, holding the stick forward after the release, is 0–40 px
      behind where it lands, as it lands.
    - **Keep-out:** facing his own goal within `KEEP_OUT_X` of its line,
      RB with the stick up starts a stepover.
    - **Cooldown:** RB during the 1 s after a trick ends does nothing, and
      a press held through the end of the cooldown doesn't fire (it's a
      pulse).
    - **Committed:** a shot press during a trick waits for it to end, as
      in the drag-back. A steal press during a trick does nothing.
    - **Power-up:** a trick ends a power-up and keeps the meter.
    - **Review Focus 1:** a stepover running at the end fence and at a
      post, and a flick next to each, never put the ball inside a goal
      frame or past `fenceL`/`fenceR`. A flick from 30 px out landing on
      the net's roof scores nothing.
    - **Review Focus 5:** RB with no ball, in the air, mid-drag-back,
      stumbling, with a live wave, while the dog carries, during the
      cooldown, and with `tricks: null`, starts nothing and leaves
      `trickCooldownS` at 0 (or where it was).
    - **Review Focus 2 (the trick's part):** with `phase` set to
      `'fullTime'` and to `'goal'` mid-trick, `home.trick` is null after
      the next step, and he stands still.
  - `player.test.ts`: during a trick `anim.name` is the trick's clip,
    with frames running on `trick.t`.
  - `world.test.ts`, **parity:** for seeds 100–107, a headless
    `maxMatch`-style match with `tricks` set and no RB press gives the
    same score and the same final ball and player positions as with
    `tricks: null`.

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/game/tricks.test.ts src/engine/input.test.ts src/game/player.test.ts src/game/world.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement**
  - **`startTrick`** needs all of these:
    - `w.tricks` set and `intent.skill`;
    - play live, and him on the ground with `y === 0`;
    - `turnS`, `stumbleS` and `trickCooldownS` all 0, and no trick under
      way;
    - no live wave, the dog not carrying, and `ballIsHis(w)`.

    The kind is `'flick'` if `intent.moveZ >= STICK_UP`, unless he's
    facing his own goal within `KEEP_OUT_X` of its line. The stepover's
    `side` is the tighter half of the band: `home.z >= depth / 2 ? 1 :
    -1`. Set `ball.touchedBy = 'home'`.
  - **`stepPlayer`:** while `p.trick` is set, the intent is `{ ...NO_INTENT,
    moveX: p.facing, pace: p.trick.pace, faceX: p.facing }`, and `p.held`
    isn't updated from the given intent, as for `turnS`. `chooseAnim`
    shows the trick's clip ahead of the stumble, drag-back and skid
    poses.
  - **`stepTrick`** ends a trick when play isn't live. Otherwise it
    advances `t`:
    - **Stepover:** the ball is placed at `FOOT_SPOT` ahead each tick,
      where `canPlace` allows, as `carryAtFeet` does.
    - **Flick before `sellS`:** the ball moves from the foot spot up
      behind his heel to `rideY`.
    - **The sell** (at `sellS`): the flick launches with `(facing ×
      FLICK.vx, FLICK.vy, 0)` and `pace` becomes 1. Fooling comes in
      Task 3.
    - **At `durationS`** the trick ends and `trickCooldownS =
      TRICK_COOLDOWN_S`.
  - **`world.ts`:**
    - Call `startTrick` beside `startDragBack`, and `stepTrick` beside
      `stepDragBack`.
    - Home contacts are quiet while `home.trick` is set, and so is
      `dogContacts`.
    - `powerEnds` counts a trick as another move.
    - `resolveSteal` ignores a press while `home.trick` is set.
    - Store `w.events.trick`.
    - `createWorld` takes `tricks` last; `World.tricks` stays mutable.
  - **Tuning the flick:** pick the final `FLICK.vx`/`vy` so the flick
    tests pass with `AIR_DRAG`; the starting values are a guess.

- [ ] **Step 4: Run the whole suite and the type check**

  Run: `npm test && npm run typecheck`
  Expected: PASS, with every tuning test unchanged.

- [ ] **Step 5: Commit** with `feat: RB does a stepover or a rainbow flick`.

---

### Task 3: Fooling Max, the crew and Sam

**Files:**
- Modify: `src/game/tricks.ts` (the sell, wise, scales), `src/game/player.ts` (`fooled`, `wiseS`, animation), `src/game/world.ts` (fooled contacts, the steal's wise beat, the meter), `src/game/ai.ts` (the fooled branch), `src/game/power.ts` (`METER_GAIN.trick`), `src/game/opponents.ts` (`trickSetup`)
- Test: `src/game/tricks.test.ts`, `src/game/ai.test.ts`, `src/game/opponents.test.ts`, `src/game/world.test.ts`

**Interfaces:**
- Consumes: Task 2's `TrickSetup`, `stepTrick`, `TrickEvents`.
- Produces:
  ```ts
  // player.ts
  /** swayZ: the depth a confused player sways to, set at the sell: his z + trick.side × STEPOVER.swayPx, clamped to the band. */
  Player.fooled: null | { kind: 'confused' | 'stumble'; leftS: number; totalS: number; swayZ: number };
  Player.wiseS: number;
  // tricks.ts
  export const TRICK_SCALE: Record<Style, TrickScale>;   // allRound 1/1, blocker 0.3/1.2, shooter 1/1, dribbler 0.6/0.6, presser 1.5/1.5, speedster 1/1; mutable
  export const DOG_TRICKS: Record<Difficulty, TrickProfile>;  // starts as copies of TRICK_DIFFICULTY; mutable
  export const TRICK_LANE = 14;
  export const SEE_RANGE = 120;
  export const WISE_S = 3;
  export function squaredUp(w: World): boolean;
  export function seesTrick(w: World): boolean;
  // power.ts
  METER_GAIN.trick = 0.1;
  // opponents.ts
  export function trickSetup(d: Difficulty, opponent: HumanOpponentId | 'biscuit'): TrickSetup;  // humans: TRICK_DIFFICULTY[d] and TRICK_SCALE[opponentProfile(id, d).style]; biscuit: DOG_TRICKS[d], scale 1/1
  // ai.ts
  AiBrain.plan adds 'fooled';
  ```

- [ ] **Step 1: Write the failing tests**
  - `tricks.test.ts`, staged against Max at `maxStats(10)` on Normal:
    - **Squared up:** a stepover with Max 30 px ahead, in the lane and
      facing Harrison, confuses him at the sell
      (`events.trick.fooled === 'stepover'`). His `fooled.leftS` starts
      at 0.7 × 1. A flick in the same spot makes him stumble.
    - **Not squared up,** one test each: 10 px and 50 px ahead (outside
      14–46), 16 px off the lane, facing away, already fooled, wise, on
      the ball still on the centre spot at Harrison's kickoff, fallen.
      Each leaves `fooled` null.
    - **Wise to it:**
      - when the confusion ends, `wiseS` becomes 3, and a stepover 1 s
        later at the same spot doesn't fool him;
      - a stepover with Max 80 px ahead facing him fools nobody and
        makes him wise from its sell;
      - with Max 130 px ahead, or facing away, he isn't made wise;
      - after a clean steal, `wiseS` is the profile's `wrongFootedS`.
    - **The scales:** Brick's confusion lasts 0.3 × 0.7 s, Pete's 1.5 ×,
      Tia's 0.6 ×, Leo's and Sam's 1 ×. Brick's stumble lasts 1.2 ×.
    - **The meter:** a fooling trick adds 0.1 with a power move and does
      nothing without one.
  - `ai.test.ts`:
    - **Confused:** Max sways 6–10 px in depth toward the stepover's dip
      side (to `fooled.swayZ`), then stands facing the ball. Until his confusion ends he never slides,
      steals, jumps or plays the ball, even with the ball rolled to his
      feet. The tick after it ends he decides afresh.
    - **Stumble:** Max with the stick let go stops within a few px. Sam
      fooled at 200 px/s skids on 30 px or more on his own brakes, and
      shows the skid clip until he's slow, then the reaction's clip.
    - **Review Focus 4:** a ball rolled at 60 px/s into a confused Max's
      feet passes him, and `ball.touchedBy` isn't `'away'`.
  - `opponents.test.ts`: `trickSetup` for each opponent and difficulty
    gives the right profile and scale, and `'biscuit'` gives `DOG_TRICKS`.
  - `world.test.ts`:
    - a fooled player's body still stops Harrison running through him;
    - **Review Focus 2 (the fooled part):** the kickoff after a goal
      clears `fooled`, `wiseS`, `trick` and `trickCooldownS` on both
      players.

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/game/tricks.test.ts src/game/ai.test.ts src/game/opponents.test.ts src/game/world.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement**
  - **`squaredUp(w)`** is the spec's list, read from the world:
    - `gap = (away.x - home.x) * home.facing`, inside
      `[profile.near, profile.far]`;
    - `|dz| <= TRICK_LANE`;
    - `away.facing === -home.facing`;
    - on the ground with `y === 0` and not `fallen`, `bracing` or `blown`;
    - not `fooled`, and `wiseS === 0`;
    - no power-up active;
    - not Harrison's kickoff with the ball on the centre spot.
  - **`seesTrick(w)`:** facing Harrison, `0 < gap <= SEE_RANGE`, on his
    feet, not fooled, and not squared up.
  - **At the sell:**
    - Squared up: set `fooled` with `totalS = leftS = base ×
      scale[kind]` and `swayZ = away.z + trick.side × STEPOVER.swayPx`,
      clamped to the band. The kind is `confused` for a stepover and
      `stumble` for a flick. Report
      `fooled`, and add `'trick'` to the meter when there's one.
    - Otherwise, if he sees it: `wiseS = WISE_S`.

    The fooled and wise timers count down only while play is live. When
    `fooled` ends, `wiseS = WISE_S`.
  - **`world.ts`:** the contact closure returns `quietContact()` for a
    fooled player. On `steal === 'stole'`, `w.away.wiseS =
    Math.max(w.away.wiseS, w.maxProfile?.wrongFootedS ?? 0)`.
  - **`think`:** right after the wave branch, a fooled `me` gets
    `plan 'fooled'`:
    - confused: steer in depth to `fooled.swayZ` (stop within 1 px), then
      `NO_INTENT` facing the ball;
    - stumble: `NO_INTENT` with no `faceX`.

    Either way, clear `brain.fake` and set `nextDecisionS = 0`.
  - **`chooseAnim`:** while `fooled`, show `fooled` or `stumble` (on
    `totalS - leftS`), except a soft-braking player still above
    `SKID_SPEED` keeps the skid clip.

- [ ] **Step 4: Run the whole suite and the type check**

  Run: `npm test && npm run typecheck`
  Expected: PASS, every tuning test unchanged.

- [ ] **Step 5: Commit** with `feat: a trick at the right moment fools them`.

---

### Task 4: Fooling Biscuit

**Files:**
- Modify: `src/game/dogAi.ts` (the fooled branch), `src/game/dog.ts` (`canGrab`), `src/scenes/dogView.ts` (`tilt`, `tumble`)
- Test: `src/game/dogAi.test.ts`, `src/game/dog.test.ts`, `src/scenes/dogView.test.ts` (create it if there isn't one)

**Interfaces:**
- Consumes: Task 3's `Player.fooled`, `DOG_TRICKS`, `trickSetup(d, 'biscuit')`.
- Produces: `DogBrain.plan` adds `'tilt' | 'tumble'`. `dogClip` returns
  `tilt` or `tumble` while `w.away.fooled` is set, with frames running on
  `totalS - leftS`.

- [ ] **Step 1: Write the failing tests**
  - `dogAi.test.ts`, a staged dog world on Normal with `trickSetup('normal',
    'biscuit')`. Harrison dribbles; the dog closes for the ball:
    - a stepover with the dog 30 px ahead facing him tilts him: plan
      `'tilt'`, he stands facing the ball, and he never grabs for
      0.7 s;
    - a flick sails over him (the ball is above `DOG_CATCH_HEIGHT` as it
      passes) and he tumbles: plan `'tumble'`, still, then back to
      `react`/`chase` once it ends;
    - **Review Focus 4:** a ball rolled into a tilting dog's muzzle isn't
      grabbed (`canGrab` is false while fooled).
  - `dogView.test.ts`: `dogClip` gives `tilt` frame 0 at the sell and
    `tumble` frames running on, then his usual clips once it ends.

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/game/dogAi.test.ts src/game/dog.test.ts src/scenes/dogView.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement.** In `dogThink`, a fooled dog goes right after
  the wave branch: `tilt` gets `{ ...NO_INTENT, faceX: faceBall(w, me) }`,
  and `tumble` gets `NO_INTENT`. When it ends he reacts to the ball first,
  as after a pant. `canGrab` returns false while `w.away.fooled`. In
  `dogClip`, the fooled check comes after blown/brace and before the
  pant.

- [ ] **Step 4: Run the whole suite and the type check**

  Run: `npm test && npm run typecheck`
  Expected: PASS; `dogTuning.test.ts` unchanged.

- [ ] **Step 5: Commit** with `feat: Biscuit tilts his head and tumbles`.

---

### Task 5: Tricks in the match: callout, sound, trick goals, Help

**Files:**
- Create: `src/scenes/trickView.ts`, `src/scenes/trickView.test.ts`
- Modify:
  - `src/meta/catalog.ts` (the level)
  - `src/scenes/matchScene.ts` (wiring, the callout, trick goals)
  - `src/scenes/matchView.ts` (draws the marks and the callout)
  - `src/scenes/goalCallout.ts`
  - `src/meta/economy.ts`, `src/meta/objectives.ts`
  - `src/meta/progress.ts`, `src/scenes/resultsScene.ts` (the unlock line)
  - `src/audio/cues.ts`, `src/audio/matchFeedback.ts`
  - `src/scenes/helpScene.ts`, `src/art/glyphs.ts` (`RB`)
- Test: `src/meta/catalog.test.ts`, `src/meta/economy.test.ts`, `src/meta/objectives.test.ts`, `src/meta/progress.test.ts`, `src/scenes/goalCallout.test.ts`, `src/scenes/resultsScene.test.ts`, `src/audio/matchFeedback.test.ts`, `src/scenes/helpScene.test.ts`, `src/scenes/matchScene.test.ts`, `src/art/glyphs.test.ts`

**Interfaces:**
- Consumes: Tasks 2–3's `TrickEvents`, `trickSetup`, `Player.fooled`.
- Produces:
  ```ts
  // catalog.ts
  export const SKILL_MOVES_LEVEL = 4;
  export const hasSkillMoves = (p: Profile): boolean => p.level >= SKILL_MOVES_LEVEL;
  // economy.ts
  StyleKind adds 'trick';  GoalKind adds 'trick';
  STYLE_ORDER ends with 'trick';  STYLE_LABEL.trick = ['TRICK GOAL', 'TRICK GOALS'];
  // progress.ts
  Unlock adds 'skillMoves';          // UNLOCK_TEXT: 'NEW MOVES: STEPOVER + RAINBOW FLICK'
  // goalCallout.ts
  export const TRICK_GOAL_S = 4;
  export interface TrickChance { kind: TrickKind; sinceS: number; flicked: boolean }
  export function noteTrick(chance: TrickChance | null, w: World, dt: number): TrickChance | null;
  export function goalCallout(kick: LastKick | null, homeGoals: number, trick: TrickKind | null = null): string | null;
  // matchView.ts
  MatchHud.trickCallout: string | null;   // 'STEPOVER!' | 'RAINBOW FLICK!', for TRICK_CALLOUT_S = 1
  // trickView.ts
  /** The white outlined pixel-font ? bobbing over a confused player's (or tilting dog's) head. */
  export function drawTrickMarks(g: CanvasRenderingContext2D, cam: Camera, w: World, art: GameArt, nowS: number): void;
  // cues.ts
  Cue adds 'stepover' | 'flick';
  // glyphs.ts
  ButtonName adds 'RB';
  ```

- [ ] **Step 1: Write the failing tests**
  - `catalog.test.ts`: `hasSkillMoves` is false at level 3 and true at 4.
  - `progress.test.ts`: a match taking him from level 3 to 4 lists
    `'skillMoves'` in `unlocked`. One from 4 to 5 doesn't.
  - `resultsScene.test.ts`: the unlock line reads `NEW MOVES: STEPOVER +
    RAINBOW FLICK` and fits the screen.
  - `goalCallout.test.ts`:
    - a fooled event opens a chance;
    - an away touch, kick or tackle ends it, and so does 4 s going by;
    - Harrison's own dribble touches keep it;
    - an unfooled flick's chance lasts until anyone plays the ball;
    - `goalCallout` order: `ENERGY WAVE!`, `HAT-TRICK!`, then the trick's
      name for a trick goal (`STEPOVER!` or `RAINBOW FLICK!`, ahead of
      `PERFECT STRIKE!`), then as today. A header after a trick stays
      `HEADER!`.
  - `economy.test.ts`: one trick goal gives `TRICK GOAL +15`, and two
    give `2 TRICK GOALS +30`.
  - `objectives.test.ts`: two trick goals meet `SCORE 2 STYLE GOALS`.
  - `matchFeedback.test.ts`:
    - a stepover's start cues `stepover`;
    - a flick's release cues `flick`;
    - a fooling sell cues `ooh`;
    - a trick that fools nobody gives no `ooh`.
  - `matchScene.test.ts`:
    - at level 3 RB does nothing in a match (`world.tricks` is null);
    - at level 4 a fooling trick shows `STEPOVER!` for 1 s;
    - a goal 2 s after it records a `'trick'` goal, and Results counts it
      as a style goal;
    - **Review Focus 3:** pausing mid-stepover and mid-confusion, then
      resuming, carries on from the same `t` and `leftS`. An Options
      difficulty change sets `world.tricks` to `trickSetup(newD,
      opponent)` and leaves `world.away.handling` alone.
  - `trickView.test.ts`: the `?` is drawn over a confused player and a
    tilting dog, and over nobody else. Use the recording test context.
  - `helpScene.test.ts`:
    - a CONTROLS line starts `RB:` and is drawn with the RB picture;
    - the tricks lines say RB is a stepover, up + RB a rainbow flick,
      it works when someone's close in front facing you, too far off or
      too late fools nobody, and it's from level 4;
    - every line is in the character set and the page's width.
  - `glyphs.test.ts`: the `RB` glyph is a pill like `LB`'s.

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/meta src/scenes src/audio src/art/glyphs.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement**
  - **`matchScene`:** passes `hasSkillMoves(ctx.profile) ?
    trickSetup(difficulty, match.opponent) : null` into `createWorld`.
    `backHere` refreshes it. `harrisonIntent` sets `skill:
    input.pressed.has('skill')`.
    - **The callout:** on `fooled`, `hud.trickCallout` shows the trick's
      name for `TRICK_CALLOUT_S`. It's held back while a goal moment
      runs, as the bonus callout is.
    - **Trick goals:** keep a `TrickChance` beside `lastKick`. A goal is
      `'trick'` when the chance is live and `lastKick` isn't a header,
      volley, chip or wave.
  - **`objectives.ts`'s `isStyle`** and `matchScene`'s count `'trick'`.
  - **Cues:** `stepover` is a quick noise swish and `flick` a soft
    square pop, in `cues.ts`'s style, by design not by ear. Add them to
    the memory note's "never heard" list.
  - **Help:** add a TRICKS page after MOVES (the MOVES page is full), and
    an RB line on CONTROLS. Fit the wording to the font. Biscuit's and
    Sam's lines stay as they are.

- [ ] **Step 4: Run the whole suite, the type check and the build**

  Run: `npm test && npm run build`
  Expected: PASS.

- [ ] **Step 5: Commit** with `feat: callouts, trick goals and Help for tricks`.

---

### Task 6: The trickster and the spammer, the tuning, and the GIF

**Files:**
- Create: `src/game/trickScripts.ts`, `src/game/trickScripts.test.ts`, `src/game/trickTuning.test.ts`
- Modify: `src/game/tricks.ts` (tuned numbers, with the measured rates in a comment)

**Interfaces:**
- Consumes: `maxScripts.ts`'s `scriptMemo`, `harrisonIntent`,
  `harrisonStatsFor`; `samScripts.ts`'s `SAM_TUNING_STATS`;
  `dogScripts.ts`'s `blockerMemo`, `blockerIntent`; `dog.ts`'s
  `TUNING_STATS`; `trickSetup`.
- Produces:
  ```ts
  export type TrickScript = 'plain' | 'trickster' | 'spammer';
  export interface TrickStats {
    /** Tricks started. */
    tricks: number;
    /** Tricks that fooled the defender, by kind... */
    fooled: Record<TrickKind, number>;
    /** ...and of those, the ones that got him past the defender with the ball (BEAT's rule: 10 px past, ball within 24 px, inside 1.5 s). */
    beats: Record<TrickKind, number>;
    /** How far behind Harrison, along his attack, each fooled defender was when his reaction ended, px. */
    pastPx: number[];
  }
  export interface TrickMatch extends MaxMatch { trickStats: TrickStats }
  /** A whole headless match with Harrison owning the tricks, at the stats the opponent's own tuning uses. */
  export function trickMatch(opponent: HumanOpponentId | 'biscuit', d: Difficulty, seed: number, script: TrickScript): TrickMatch;
  ```
  The scripts:
  - **plain** is the opponent's existing scripted Harrison: `maxScripts`'
    for the humans and the dog's blocker for Biscuit.
  - **trickster** is plain, plus one RB press per exchange when the ball
    is his and the defender is in front, in the lane and facing him,
    within a `triggerGap`. Per exchange, from his own seeded rng (never
    `w.rng`), he draws `triggerGap` 10–70 px (so some are timed right and
    some aren't) and the kind (stepover or flick, half each).
  - **spammer** presses RB on every tick a trick could start,
    alternating the kinds.

  Stats: Max at rung 10 and the crew at `harrisonStatsFor(their stats)`,
  Sam at `SAM_TUNING_STATS`, Biscuit at the dog's `TUNING_STATS`.

- [ ] **Step 1: Write the failing tests**
  - `trickScripts.test.ts`, one staged test per rule:
    - the trickster presses once inside his `triggerGap` and not before;
    - he presses at most once per exchange;
    - the spammer presses whenever a trick could start;
    - `plain` never sets `skill`;
    - `trickMatch(..., 'plain')` against Max gives the same results as
      `maxMatch` on seeds 100–103.
  - `trickTuning.test.ts`, seeds 100–163 unless noted:
    - **Timed right, it works:** against Max,
      `beats / fooled` (both kinds) ≥ 0.8 on Easy, ≥ 0.7 on Normal and
      ≥ 0.55 on Hard.
    - **Mashing doesn't work:** on Normal against Max, the spammer's win
      rate ≤ the plain script's + 0.06, on the same seeds.
    - **Not a win button:** on Normal the trickster's win rate is above
      the plain script's, by no more than 0.20; on Hard it's ≤ 0.25.
    - **The personalities** (Normal, seeds 100–131): of fooled
      stepovers, the beat share runs Pete ≥ Max ≥ Tia ≥ Brick. The mean
      `pastPx` of a fooled Sam is at least twice a fooled Max's.
    - **Biscuit isn't made easy** (Normal): the trickster wins ≤ plain +
      0.20 and the spammer ≤ plain + 0.06.
    - **Nothing stuck:** every match ends with a result, and the ball is
      never still for over 4 s.

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/game/trickScripts.test.ts src/game/trickTuning.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Write the scripts, then tune.** Sweep the numbers at
  runtime from a scratch `npx tsx` script, mutating `TRICK_DIFFICULTY`,
  `TRICK_SCALE`, `DOG_TRICKS` and `STEPOVER`/`FLICK`, in this order:
  1. The base reaction times, for "timed right, it works".
  2. The windows, for "not a win button". Narrower is harder.
  3. `WISE_S`, `SEE_RANGE` and `TRICK_COOLDOWN_S`, for the spammer.
  4. The scales, for the personality order.
  5. `DOG_TRICKS`, for Biscuit.

  Keep Easy kinder than Normal and Normal kinder than Hard in every
  number. Write the tuned values into `tricks.ts`, with the measured
  rates in a comment as `sam.ts` does. If a target can't be met without
  breaking another, stop and report to the parent with the numbers.
  Don't widen the bands.

- [ ] **Step 4: Run the whole suite and the type check**

  Run: `npm test && npm run typecheck`
  Expected: PASS, every earlier tuning test unchanged.

- [ ] **Step 5: Commit** with `test: tune the tricks with a trickster and a spammer`.

- [ ] **Step 6: The GIF, and the parent's approval.** Start the dev
  server on 5179. Stage real match scenes with the in-page technique in
  `dev-environment-notes`: step the scene by hand, render every frame
  into one tall strip canvas, POST it once to a receiver on 5181, and
  assemble a GIF at 3× with PIL. Show:
  - a stepover past Max with the `?` and the STEPOVER! callout;
  - a flick over Max and his stumble;
  - a flick over a charging Sam into his skid;
  - a stepover against Pete;
  - Biscuit's tilt, and his tumble under a flick.

  Send it with SendUserFile, with the tricks sheet if that isn't
  approved yet. Nothing merges until the parent approves both.

---

### Task 7: Playtest, review, and release

- [ ] **Step 1: The parent's playtest.** Start the dev server and send the
  link. The playtest save code in `harrison-soccer-status` is past level
  4, so the tricks are on. The questions for them:
  - Do the tricks feel great to pull off?
  - Is the moment easy enough to find on Easy?
  - Does mashing RB get him nothing?
  - Does any opponent's reaction look wrong?

  Fold feedback in as tested commits, re-running `trickTuning.test.ts`
  and every earlier tuning test.

- [ ] **Step 2: The whole-branch review.** Use superpowers:requesting-code-review
  against `main..plan-8-skill-moves` with a fresh reviewer. Fix any
  Critical or Important finding. List the minors for the parent and
  record them in the memory note.

- [ ] **Step 3: As built.** Add "As built" notes to the spec: the tuned
  windows, times, scales, cooldown, wise time and flick arc, and the
  measured rates.

- [ ] **Step 4: Verify** with superpowers:verification-before-completion.

  Run: `npm test && npm run build && git status --short`
  Expected: PASS, a clean tree, and no photo staged.

- [ ] **Step 5: Finish the branch** with superpowers:finishing-a-development-branch.
  Ask the parent before merging into `main` and again before pushing.
  Pages deploys the push. After the push, check the Pages deploy and
  update `harrison-soccer-status.md`:
  - what's live, and the parent's calls;
  - the minors;
  - that save slots and the Stamina upgrade come next (to be
    brainstormed).

  Don't offer game-tour updates.
