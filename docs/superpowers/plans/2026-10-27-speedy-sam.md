# Speedy Sam Implementation Plan (Plan 7b, part 2 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Park's boss. Speedy Sam replaces part 1's stand-in (Pete
under Sam's name). He's the fastest player in the game, all gas and no
brakes: he skids on every turn, overshoots a drag-back, dribbles with long
touches Harrison can step into, and has a weak shot a sprinting Harrison
can run down. A scripted racer and matador in CI keep him tuned to the
lesson: don't race him, make him overshoot. Part 1
(`2026-10-27-the-park-and-crew.md`) must be done first, on the same branch.

**Architecture:**
- **Handling.** `Player` gains `handling: Handling`: how hard he can brake,
  how far his touch knocks the ball, how hard his shot goes, and how far
  ahead his ball can run and still be his. `NORMAL_HANDLING` is today's
  numbers exactly, so Harrison, Max and the crew are untouched. Sam's
  `SAM_HANDLING` brakes softly, touches long and shoots weakly. The skid,
  the overshoot and the gap between touches come from these numbers and the
  existing physics, not from scripted events.
- **Brain.** `src/game/sam.ts` holds his stats, per-difficulty profiles and
  handling. `styles.ts` gains `speedster`: he defends at the ball flat out
  like the presser, and when Harrison blocks his run he sometimes tries his
  weak shot from range (`AiProfile.rangeShot`). `opponents.ts` maps `'sam'`
  to him. Every human opponent's backpedal from a powered-up Harrison is
  pinned to Max's rung-10 pace.
- **Art and feel.** `src/art/opponents/sam.ts` is his head and look. A new
  `skid` clip joins the shared body's clips. `src/scenes/samView.ts` draws
  his dust, speed lines and skid spray from the world state, and two cues,
  `whoosh` and `skid`, come from `matchFeedback`.
- **Tuning.** `src/game/samScripts.ts` has the racer and the matador.
  `src/game/samTuning.test.ts` pins the targets.

**Tech Stack:** Vite 8, TypeScript 7 (strict), Canvas 2D, Web Audio, Gamepad
API, Vitest 4. No runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-27-the-park-design.md`, the
section *Speedy Sam* above all. It wins over this plan if they ever
disagree.

## Global Constraints

- **No image, audio or font files.** On-screen text uses only uppercase
  letters, digits and `' - : ! ? . , / + < >`.
- **Nobody else changes.** `NORMAL_HANDLING` reproduces today's physics
  exactly. `maxTuning.test.ts`, `dogTuning.test.ts`, `crewTuning.test.ts`,
  the AI-vs-AI tests and the no-kit parity test pass unchanged.
- **Every fair rule applies to Sam:** the steal (a steal on his ball
  between touches counts as off his feet), the wrong-footed beat, the
  kickoff hold, the keep-out zone, the slide clear and the drag-back. The
  Energy Wave answer uses Max's `braceSense` and `backOffS`, backpedalling
  at Max's rung-10 pace.
- **No dice in the big moments.** The overshoot, the gap and the slow range
  shot come from position and timing. Only *whether* he tries the range
  shot when blocked is rolled (`rangeShot`), and what follows it is
  physics.
- **His pace:** about 1.2 times the tuning Harrison's sprint (Speed 7:
  176 px/s, so about 212 px/s) on Normal, and faster than Biscuit's
  183 px/s on every difficulty.
- **Tuning Harrison:** Speed 7, Power 5, Jump 4, Control 5. On Normal the
  racer loses nearly every match and the matador wins about half (about
  0.8 on Easy, 0.3 on Hard).
- **Approvals:** the parent approves Sam's sheet and GIF before the merge.
  Ask before merging into `main` and before pushing. Commit messages
  follow Conventional Commits 50/72, with no AI attribution trailers.

## Review Focus

1. **Sam skidding into a goal frame, a post or the end hedge** at full
   speed: his soft braking must never push him or the ball through
   anything. `keepOutOfGoals` and the fence clamps run on his position as
   on anyone's. Pinned in Task 2 with a staged run at a post and at an end
   hedge.
2. **A kickoff while he's mid-skid** starts clean: `placeForKickoff` zeroes
   his velocity, so he doesn't slide off his spot. Pinned in Task 2.
3. **His long touch never runs the ball into Harrison's net unplayed**
   from a dribble: a touch is a dribble push, not a shot. His range shot
   is his only shot from distance. Covered by the samTuning "nothing
   stuck" and own-goal counts, and pinned in Task 3 with one staged
   dribble at Harrison's goal.
4. **A powered-up Harrison chasing Sam down** works: Sam's backpedal is
   pinned to Max's pace, so the wave's chase-down scores as against Max.
   Pinned in Task 3.
5. **Pausing or Options mid-skid** keeps the skid's state, and a
   difficulty change swaps his profile but keeps `SAM_HANDLING`. Pinned in
   Task 5.

---

### Task 1: Sam's art, and the parent's approval of the sheet

**Files:**
- Create: `src/art/opponents/sam.ts`, `src/art/opponents/sam.test.ts`
- Modify: `src/art/body/animations.ts` (`skid` clip), `src/art/kits.ts`, `src/art/colors.ts` (only if his kit needs a colour), `src/scenes/art.ts` (`opponents.sam` becomes his own), `tools/render-sheet.ts`
- Test: `src/art/body/bake.test.ts` (the new clip bakes for every body)

**Interfaces:**
- Produces:
  ```ts
  export const SAM_HEADS: Readonly<Record<HeadFacing, HeadSprite>>;
  export function samLook(): LookColors;
  // animations.ts
  AnimName adds 'skid';   // 2 frames, ~8 fps, not looping: leaning back, front foot planted ahead, arms back
  export const SKID_FRAME_HOLD = 1;   // the frame he holds while still braking
  ```

- [ ] **Step 1: Write the failing tests**
  - Sam's heads are 8–10 px tall with their necks inside, and his frames
    stay within 13 colours.
  - His jersey colour is unlike Harrison's, Max's and every crew kid's.
  - His headband is a band of one colour across the brow in every facing.
    Use the `Trim` role (`r` in `ART_LEGEND`) so it takes his kit's trim.
  - `bakeAll(HARRISON_BODY, ...).skid` has 2 frames. In its planted frame
    the near foot is ahead of the hips and the torso leans back (compare
    the head's x to the hips' x in the pose, as `pose.test.ts` does).

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/art/opponents/sam.test.ts src/art/body`
  Expected: FAIL.

- [ ] **Step 3: Draw him.** Lean and quick, with a headband or sweatband,
  a kit that's unmistakably his, and a cool sports kid's face. Add the
  skid keys to `animations.ts`. In `art.ts`, `opponents.sam` gets his own
  sprites and face, and the part 1 stand-in comment goes. In the sheet
  tool, add a Sam row: face, three facings, idle, run, sprint, shoot and
  both skid frames.

- [ ] **Step 4: Run the tests and render the sheet**

  Run: `npm test && npm run typecheck && npm run sheet`
  Expected: PASS. Read `preview/character-sheet.png`.

- [ ] **Step 5: Commit** with `feat: draw Speedy Sam and the skid`.

- [ ] **Step 6: Send the sheet** (Sam's row) to the parent with
  SendUserFile. Say that the GIF of him flying past a drag-back follows
  once he moves (Task 5). Carry on meanwhile.

---

### Task 2: Handling: soft brakes, long touches, a weak shot

**Files:**
- Modify: `src/game/player.ts` (`Handling`, `Player.handling`, braking with `handling.decel`, the skid animation), `src/game/contact.ts` (dribble push), `src/game/kick.ts` (shot speed), `src/game/steal.ts` (`maxHasBall` reach), `src/game/world.ts` (`createWorld` takes the away handling)
- Test: `src/game/player.test.ts`, `src/game/contact.test.ts`, `src/game/steal.test.ts`, `src/game/world.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface Handling {
    /** px/s² when slowing or turning on the ground. */
    decel: number;
    /** Scales his dribble touch's push (touchPush). */
    touchScale: number;
    /** Scales his kicks' speed. */
    shotScale: number;
    /** A ball this far ahead of him, on his line, low, is still his (between touches), px. */
    ballAhead: number;
  }
  export const NORMAL_HANDLING: Readonly<Handling>;   // { decel: DECEL (1200), touchScale: 1, shotScale: 1, ballAhead: MAX_BALL_AHEAD }
  Player.handling: Handling;                            // createPlayer gives NORMAL_HANDLING
  /** Braking hard on the ground with soft brakes: still fast and slowing or turning against his run. */
  export function skidding(p: Player, intent: PlayerIntent): boolean;
  export function createWorld(..., maxProfile: AiProfile | null = null, awayHandling: Handling = NORMAL_HANDLING): World;
  // steal.ts
  export function maxHasBall(max: Player, ball: Ball): boolean;   // uses max.handling.ballAhead in place of MAX_BALL_AHEAD
  ```

- [ ] **Step 1: Write the failing tests**
  - **Parity:** a player with `NORMAL_HANDLING` produces the same
    positions and velocities over a scripted 120-tick run (a turn, a
    dribble, a shot) as before. Record the expected numbers from the
    current code before changing it, so the test is a snapshot of today.
  - **Soft brakes:** a player at 212 px/s with `decel: 500` reversing the
    stick takes 0.35–0.5 s to stop, travelling 40–60 px. With 1200 it
    stops in under 0.2 s. `skidding` is true while braking and `anim.name`
    is `'skid'`. A normal-handling player never shows `'skid'`.
  - **Long touch:** with `touchScale` set so his touch pushes about
    3.5 times as hard, a dribble touch at full pace leaves the ball 30–45
    px ahead at its furthest before he catches it again. `maxHasBall`
    with `ballAhead: 48` is true at 40 px ahead, and with
    `NORMAL_HANDLING` false at 40 px.
  - **Weak shot:** a full-charge shot with `shotScale: 0.55` leaves at
    0.55 of the normal speed.
  - **Review Focus 1:** Sam staged running at 212 px/s straight at a post,
    then at the end hedge, reversing at 20 px: he never overlaps the goal
    box or passes `fenceR`/`fenceL`, and the ball at his feet never enters
    a goal frame.
  - **Review Focus 2:** `placeForKickoff` with Sam mid-skid leaves his
    velocity zero and his state `ground`.

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/game/player.test.ts src/game/contact.test.ts src/game/steal.test.ts src/game/world.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement**
  - `approach2` and `approach` calls on the ground use `p.handling.decel`
    where they use `DECEL`.
  - `dribble` multiplies `touchPush` by `touchScale`.
  - The kick's launch speed multiplies by `shotScale`.
  - `maxHasBall` reads `max.handling.ballAhead`.
  - `chooseAnim` picks `'skid'` (holding `SKID_FRAME_HOLD`) when
    `skidding`, which needs `decel < DECEL`, speed above about 120 px/s,
    and the stick against his velocity (dot < 0) or released.
  - `createWorld` sets `w.away.handling = awayHandling`.

  The dribble AI's `POSSESSION_RANGE` stays 16. Between long touches Sam
  is "chasing a loose ball" in `decide` and runs onto it, which is the
  behaviour wanted.

- [ ] **Step 4: Run the whole suite and the type check**

  Run: `npm test && npm run typecheck`
  Expected: PASS, with every tuning test unchanged.

- [ ] **Step 5: Commit** with `feat: give players handling, for Speedy Sam`.

---

### Task 3: Sam's brain and numbers

**Files:**
- Create: `src/game/sam.ts`, `src/game/sam.test.ts`
- Modify: `src/game/ai.ts` (`Style` adds `'speedster'`, `AiProfile.rangeShot?`, the range-shot branch, the pinned backpedal), `src/game/styles.ts`, `src/game/opponents.ts` (`'sam'` is real; `opponentHandling`), `src/scenes/matchScene.ts` (passes the handling)
- Test: `src/game/ai.test.ts`, `src/game/styles.test.ts`, `src/game/opponents.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const SAM_STATS: Readonly<Stats>;          // { speed: 10, power: 1, jump: 3, control: 3 }
  export const SAM_HANDLING: Readonly<Handling>;    // starting values: { decel: 500, touchScale: 3.5, shotScale: 0.55, ballAhead: 48 }
  /** Mutable like DIFFICULTY, for headless sweeps. paceFactor about 1.0 / 1.08 / 1.12 (E/N/H). */
  export const SAM_PROFILES: Record<Difficulty, AiProfile>;   // style 'speedster', shootRange ~90, rangeShot ~0.5 / 0.35 / 0.2
  AiProfile.rangeShot?: number;    // chance per decision, when blocked, of trying his shot from range; speedster only
  export const RANGE_SHOT = { blockedAhead: 60, lane: 12, from: 320 };   // in styles.ts, starting values
  export function opponentHandling(id: HumanOpponentId): Handling;    // SAM_HANDLING for 'sam', else NORMAL_HANDLING
  ```

- [ ] **Step 1: Write the failing tests**
  - `opponents.test.ts`:
    - `'sam'` gives `SAM_STATS`, `SAM_PROFILES[d]` and `SAM_HANDLING`;
    - every other id gives `NORMAL_HANDLING`;
    - his profiles keep Max's `braceSense` and `backOffS`, and are gentler
      on Easy (Easy ≥ Normal ≥ Hard for `reactionS`, `cleanSteal`,
      `wrongFootedS` and `rangeShot`; Easy ≤ Normal ≤ Hard for
      `paceFactor`).
  - `sam.test.ts`:
    - `runSpeed(SAM_STATS) × SPRINT_MULTIPLIER × paceFactor` exceeds 183
      on every difficulty;
    - on Normal it's within 5% of 1.2 × the tuning Harrison's sprint;
    - his full-charge shot speed is under 300 px/s.
  - `ai.test.ts`, staged worlds:
    - **The overshoot:** Harrison on the ball at x 300; Sam starting 120
      px off and running at it. Harrison reverses the stick (a drag-back)
      when Sam is 20 px away. Half a second later, Sam is past
      Harrison's x by at least 15 px and hasn't touched the ball, and
      Harrison has it at his feet. The same script against Max at
      `maxStats(10)` doesn't leave Max past by 15 px. That shows the
      overshoot is Sam's.
    - **Blocked:** Sam on the ball 250 px from goal with Harrison 40 px
      ahead in his lane. With an rng that rolls under `rangeShot` he
      plans `'charge'`; with one that rolls over, he dribbles. With
      Harrison out of his lane, he never charges from 250 px.
    - **Review Focus 3:** Sam dribbling at Harrison's goal unopposed
      never kicks until within his `shootRange`. The ball crosses the
      line only from a touch or a shot inside the range, never from a
      range shot unless blocked.
    - **Review Focus 4:** a powered-up Harrison: Sam's backpedal speed is
      `runSpeed(maxStats(10)) × 0.9` within 1 px/s. A crew kid's is too,
      and Max's at rung 10 is unchanged.

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/game/sam.test.ts src/game/ai.test.ts src/game/opponents.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement**
  - **`speedster` in `styles.ts`:** `defendSpot` returns the ball, as the
    presser's does. `pressSprint` is always true while he has stamina. He
    plays the ball flat out and never eases off near it.
  - **`decide`'s has-ball branch:** a speedster blocked (Harrison within
    `RANGE_SHOT.blockedAhead` ahead and `RANGE_SHOT.lane` of his line),
    and within `RANGE_SHOT.from` of goal, rolls `rangeShot` once per
    decision and charges if it comes up.
  - **`backOff`:** pins the intent's `pace` so the speed is `runSpeed(
    maxStats(LADDER_MATCHES)) / runSpeed(me.stats)`, capped at 1. Max at
    rung ≤ 10 is unchanged.
  - **Wiring:** `matchScene` and `maxScripts.playMatchup` pass
    `opponentHandling(id)` into `createWorld`. `Matchup` gains `handling`,
    defaulting to normal.

- [ ] **Step 4: Run the whole suite and the type check**

  Run: `npm test && npm run typecheck`
  Expected: PASS. `crewTuning` and `maxTuning` don't move: the pinned
  backpedal only engages for an opponent faster than rung-10 Max, and
  the crew tuning matches don't power up.

- [ ] **Step 5: Commit** with `feat: Speedy Sam plays all gas, no brakes`.

---

### Task 4: The racer, the matador, and Sam's tuning

**Files:**
- Create: `src/game/samScripts.ts`, `src/game/samScripts.test.ts`, `src/game/samTuning.test.ts`
- Modify: `src/game/sam.ts` (tuned numbers)

**Interfaces:**
- Produces:
  ```ts
  export const SAM_TUNING_STATS: Readonly<Stats>;   // { speed: 7, power: 5, jump: 4, control: 5 }
  export function racerIntent(w: World, t: number): PlayerIntent;
  export interface MatadorMemo { /* per-exchange draws: reactS, holdAt, chargeS; rng */ }
  export function matadorMemo(rng: () => number): MatadorMemo;
  export function matadorIntent(w: World, t: number, dt: number, memo: MatadorMemo): PlayerIntent;
  export function samMatch(d: Difficulty, seed: number, harrison: 'racer' | 'matador'): MaxMatch & { ownGoals: number };
  ```
  Model the shape on `dogScripts.ts`.
  - **The racer** sprints at the ball wherever it is. He slides at Sam
    head-on when within 26 px of Sam's ball, and shoots (a fixed 0.7 s
    charge) whenever he has the ball within 300 px of goal. He never taps
    steal, never reverses with the ball and never waits.
  - **The matador**, when Sam has the ball or it's loose near Sam, stands
    goal-side in Sam's lane, `holdAt` (30–60 px) ahead of him, and waits.
    He taps steal whenever `inStealReach(w)` and the ball isn't at Sam's
    feet: the gap, or a slow range shot rolling past. With the ball, he
    reverses the stick when Sam closes within 24 px at over 150 px/s, the
    drag-back, after `reactS`. He shoots (`chargeS`) once Sam is behind
    him or more than 50 px away. He takes the kickoff shot as the decent
    kid does.
  - Per exchange he draws `reactS` 0.05–0.4 s, `holdAt` 30–60 px and
    `chargeS` 0.5–0.9 s, as Biscuit's blocker varies.

- [ ] **Step 1: Write the failing tests**
  - `samScripts.test.ts`: the racer's and the matador's intents in staged
    positions do what's described above, one test per rule (he waits, he
    steals in the gap, he drag-backs, he shoots early).
  - `samTuning.test.ts`, seeds 100–163, tuning stats:
    - Normal: the racer wins ≤ 0.15, and the matador wins 0.4–0.65;
    - Easy: the matador wins 0.65–0.95; Hard: 0.15–0.45;
    - the matador beats the racer by at least 0.3 on each difficulty;
    - every match ends with a result and the ball is never still for over
      4 s;
    - Sam's own goals (scored for Harrison off Sam's touch) are under 10%
      of Harrison's goals, so he isn't beaten by his own brakes alone.

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/game/samScripts.test.ts src/game/samTuning.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Write the scripts, then tune Sam.** Sweep `SAM_PROFILES`
  and `SAM_HANDLING` at runtime from a scratch `npx tsx` script, in this
  order:
  1. `decel`, the strongest dial for the overshoot. Keep the skid 0.3–0.5
     s.
  2. `touchScale`, for the gap.
  3. `rangeShot`.
  4. `paceFactor` within the pace constraint.
  5. `reactionS`, `cleanSteal` and `wrongFootedS`.

  Write the numbers into `sam.ts` with the measured rates in a comment. If
  the targets can't be met without breaking the pace or the skid's
  length, stop and report. Don't widen the bands.

- [ ] **Step 4: Run the whole suite and the type check**

  Run: `npm test && npm run typecheck`
  Expected: PASS.

- [ ] **Step 5: Commit** with `test: tune Speedy Sam with a racer and a matador`.

---

### Task 5: Sam in the game: dust, whoosh, Help, the GIF

**Files:**
- Create: `src/scenes/samView.ts`, `src/scenes/samView.test.ts`
- Modify: `src/scenes/matchView.ts` (calls `drawSpeed` for a soft-braking away player), `src/audio/matchFeedback.ts`, `src/audio/cues.ts` (`whoosh`, `skid`), `src/scenes/helpScene.ts`
- Test: `src/audio/matchFeedback.test.ts`, `src/scenes/helpScene.test.ts`, `src/scenes/matchScene.test.ts`

**Interfaces:**
- Produces:
  ```ts
  /** Dust puffs behind his boots over ~150 px/s, speed lines over ~190 px/s, a dust spray ahead of his front foot while skidding. Drawn from the player alone: no state. */
  export function drawSpeed(g: CanvasRenderingContext2D, cam: Camera, p: Player, nowS: number): void;
  export const WHOOSH = { within: 14, speed: 170, cooldownS: 0.8 };
  ```
  `matchFeedback` plays `whoosh` when the away player passes Harrison
  within `WHOOSH.within` px at over `WHOOSH.speed`, at most once per
  `cooldownS`, and `skid` on the tick the away player starts skidding.
  Both fire only for a player whose `handling.decel < DECEL`, so Max's and
  the crew's matches sound as before.

- [ ] **Step 1: Write the failing tests**
  - `samView.test.ts`: `drawSpeed` draws nothing for a still player, puffs
    above the puff speed, lines above the line speed, and the spray while
    `skidding`. Use the recording test context.
  - `matchFeedback.test.ts`:
    - a staged pass by Sam at 200 px/s within 10 px of Harrison cues
      `whoosh` once, and a second pass inside the cooldown doesn't;
    - the skid's first tick cues `skid`;
    - Max doing the same cues neither.
  - `helpScene.test.ts`: the match page has a line about Sam, within the
    character set and the page's width, e.g. `SPEEDY SAM CAN'T STOP: TURN
    AND LET HIM FLY PAST.`
  - `matchScene.test.ts` (Review Focus 5):
    - pausing mid-skid and resuming continues the skid;
    - an Options difficulty change sets `SAM_PROFILES[d]` and leaves
      `world.away.handling` as `SAM_HANDLING`;
    - Sam's VS card shows his tip after a loss (the catalog's tip from
      part 1) and not before.

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/scenes/samView.test.ts src/audio src/scenes/helpScene.test.ts src/scenes/matchScene.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement.** The effects use the master palette's dust
  colours (`fade`, `silver`) and white streaks. The cues are short noise
  and square sweeps in `cues.ts`'s style, by design not by ear. Note them
  in the memory note's "never heard" list.

- [ ] **Step 4: Run the whole suite, the type check and the build**

  Run: `npm test && npm run build`
  Expected: PASS.

- [ ] **Step 5: Commit** with `feat: Speedy Sam's dust, whoosh and Help line`.

- [ ] **Step 6: The GIF, and the parent's approval.** In the browser:
  - start the dev server on 5179;
  - stage a Park match against Sam with the in-page stepping technique
    (`dev-environment-notes`: import the match scene, step it by hand,
    draw frames to a canvas, POST them to a local receiver on 5181);
  - Harrison on the ball, Sam flying in, a drag-back at about 20 px, Sam
    skidding past in a spray of dust, joggers going by behind;
  - assemble a GIF at 3× with PIL.

  Send it with SendUserFile, alongside the Sam sheet if it hasn't been
  approved yet. Nothing merges until the parent approves both.

---

### Task 6: Playtest, review, and release

- [ ] **Step 1: The parent's playtest.** Start the dev server and send the
  link, with how to reach Sam quickly: a save code with match 4 of the
  Park beaten, or the DEV hooks. The questions for them:
  - Is Sam fun?
  - Does making him overshoot feel great?
  - Is he a few tries on Normal?

  Fold feedback in as tested commits, re-running `samTuning.test.ts` and
  `crewTuning.test.ts`.

- [ ] **Step 2: The whole-branch review.** Use superpowers:requesting-code-review
  against `main..plan-7b-park` with a fresh reviewer. Fix any Critical or
  Important finding. List the minors for the parent and record them in the
  memory note.

- [ ] **Step 3: As built.** Add "As built" notes to the spec: the crew's and
  Sam's final numbers, and the measured rates on 64 and 128 seeds.

- [ ] **Step 4: Verify** with superpowers:verification-before-completion.

  Run: `npm test && npm run build && git status --short`
  Expected: PASS, a clean tree, and no photo staged.

- [ ] **Step 5: Finish the branch** with superpowers:finishing-a-development-branch.
  Ask the parent before merging into `main` and before pushing. Pages
  deploys the push. After the push, check the Pages deploy and update
  `harrison-soccer-status.md`: what's live, the parent's calls, the
  minors, and that Quick Match comes next (to be brainstormed). Don't
  offer game-tour updates.
