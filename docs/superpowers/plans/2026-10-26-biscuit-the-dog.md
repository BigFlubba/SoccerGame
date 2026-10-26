# Biscuit the Dog Implementation Plan (Plan 7a, part 2 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Backyard's boss. Biscuit, a golden retriever, replaces part 1's
stand-in: he grabs the ball and carries it in his mouth, runs it into the
net, jinks around a blocker, pants after a long run, and answers the Energy
Wave as Max does. The lesson is block, don't chase, and a scripted chaser
and blocker in CI keep him tuned to it. Part 1
(`2026-10-26-career-spine.md`) must be done first, on the same branch.

**Architecture:**
- **Sim.** `src/game/dog.ts` is a pure module: `DogState` (carry, dwell,
  jink, pant, stamina), `DogProfile` per difficulty, `createDog`,
  `stepDog`. `World` gains `dog: DogState | null`, null in every Max
  match, so the sim is unchanged without him (the `power` pattern).
  Biscuit's body is the ordinary away `Player` (bodies, goals, camera, the
  wave and the HUD all work on it); `stepDog` moves it on the ground, and
  `stepPlayer` still runs its `bracing` and `blown` states. A carried ball
  isn't simulated: it rides at his muzzle. `src/game/dogAi.ts` gives him
  intents, with the power-up answer pinned to Max's backpedal pace.
- **Art.** `src/art/opponents/biscuit.ts` holds hand-authored frames
  (grids in master colours) for his clips, his face, and his anchor.
  `art.ts` bakes them into a `DogSprites` set. `src/scenes/dogView.ts`
  draws him; `matchView.ts` calls it for the away side when `w.dog`.
- **Screens.** `matchScene.ts` builds a dog world for `kind: 'boss'` and
  thinks with `dogAi`. The VS card gets his sprite, the boss sting and the
  one-loss tip. The venue screen's boss node gets his face. Help gains a
  line.
- **Tuning.** `src/game/dogTuning.test.ts` runs a scripted chaser and
  blocker at the tuning stats on every difficulty and pins the targets.

**Tech Stack:** Vite 8, TypeScript 7 (strict), Canvas 2D, Web Audio, Gamepad
API, Vitest 4. No runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-26-career-spine-design.md`, the
section *Biscuit the Dog* above all. It wins over this plan if they ever
disagree.

## Global Constraints

- **No image, audio or font files.** Biscuit is code: `IndexedImage` grids
  in `MASTER` colours. On-screen text uses only uppercase letters, digits
  and `' - : ! ? . , / + < >`.
- **A Max match plays exactly as today.** `World.dog` is null there; every
  existing headless test passes unchanged; a Harrison without a power move
  plays exactly as before.
- **He never kicks, jumps for a header, or slides.** He takes the ball; he
  is never tripped, kicked or hurt. Blown away, he lands inside the field
  on his feet.
- **No dice in the snatch.** A loose ball, a slow ball, or a ball knocked
  ahead between dribble touches is his at once when his muzzle reaches
  it. A ball at Harrison's feet goes after a dwell that grows with Control
  and shrinks with difficulty. Nothing about the steal is rolled.
- **The power-up.** He backs off and never challenges a powered-up
  Harrison, with Max's odds of getting it wrong, backpedalling at Max's
  pace (`runSpeed(maxStats(10)) × 0.9`), not his own. He braces under
  `stepWave`'s rules; a braced ball is his once the brace ends.
- **Tuning stats:** Harrison at Speed 5, Power 5, Jump 3, Control 4. On
  Normal, the chaser must lose nearly every match and the blocker win about
  half. Biscuit's straight-line speed is 10–15% above that Harrison's
  sprint.
- **Every guarantee stands:** players and the ball inside the field, never
  in a goal frame or on a net roof, never stuck.
- **Approvals:** the parent approves Biscuit's sheet and GIF before the
  branch merges; ask before merging into `main` and before pushing.
  Commit messages: Conventional Commits, 50/72, no AI attribution
  trailers.

## Review Focus

1. **A kickoff with Biscuit carrying** can't happen: `placeForKickoff`
   clears the carry and the ball is live at the centre. Pinned in Task 2.
2. **A ball squeezed between Harrison's body and the dog's mouth** never
   gets stuck: a carried ball isn't simulated, a dropped ball goes through
   `canPlace`-safe placement, and the existing pinned-ball pop still runs
   when it's loose. Pinned in Task 2 (the drop test near a fence and a
   post).
3. **A wave fired while Biscuit carries** can't happen (Harrison needs the
   ball), but a wave fired the tick after a drop can: the dog in `blown`
   never re-grabs mid-air, and `stepDog` leaves the `blown` and `bracing`
   states to `stepPlayer`. Pinned in Task 4.
4. **The tip line appears only after a loss to Biscuit**, never after a
   loss to Max, and stays until he wins. Pinned in Task 6.
5. **Pausing during a pant or a jink** freezes the timers like everything
   else (intents only count while live). Pinned in Task 2.

---

### Task 1: Biscuit's art, and the parent's approval

**Files:**
- Create: `src/art/opponents/biscuit.ts`
- Modify: `tools/render-sheet.ts` (a Biscuit row and a GIF strip)
- Test: `src/art/opponents/biscuit.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type DogAnim = 'idle' | 'run' | 'carry' | 'grab' | 'jink' | 'pant' | 'blown' | 'brace';
  export const BISCUIT_NAME = 'BISCUIT THE DOG';
  /** Frames face right. The anchor is the pixel on the ground under his chest. */
  export const BISCUIT_ANCHOR: Point;                    // builder's, inside every frame
  export const BISCUIT_FPS: Readonly<Record<DogAnim, number>>;   // run/carry 10, grab 8, jink 8, pant 4, idle 3, blown 6, brace 1
  export const BISCUIT_FRAMES: Readonly<Record<DogAnim, readonly IndexedImage[]>>;  // idle 2, run 4, carry 4, grab 2, jink 2, pant 2, blown 2, brace 1
  /** His face for the boss node and the VS card: 12×12, outlined. */
  export const BISCUIT_FACE: IndexedImage;
  /** Where the ball's centre sits in a carry frame, relative to the anchor; the sim places the world ball there. */
  export const MUZZLE: Point;                             // e.g. { x: 14, y: -9 } (y up)
  ```
  Frames are the same size (about 34×24, builder's), parsed with
  `parseGrid` and a local legend in master ids: `o` outline, `g` hairTip
  (coat), `d` hairLight (ear, belly, far legs), `s` hairShadow (nose, eye),
  `w` white (eye glint, the ball), `p` blush (tongue), `k` outline for the
  ball's panels. The carry frames include the ball at `MUZZLE`. Cool, not
  cute: set jaw, eye on the ball. Every frame has a one-pixel outline.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { M } from '../colors';
import { BISCUIT_ANCHOR, BISCUIT_FACE, BISCUIT_FPS, BISCUIT_FRAMES, MUZZLE, type DogAnim } from './biscuit';

const COUNTS: Record<DogAnim, number> = { idle: 2, run: 4, carry: 4, grab: 2, jink: 2, pant: 2, blown: 2, brace: 1 };

describe("Biscuit's frames", () => {
  it('has every clip at its frame count, all one size, with the anchor inside', () => {
    const [w, h] = [BISCUIT_FRAMES.idle[0]!.width, BISCUIT_FRAMES.idle[0]!.height];
    for (const [name, n] of Object.entries(COUNTS) as [DogAnim, number][]) {
      expect(BISCUIT_FRAMES[name], name).toHaveLength(n);
      for (const f of BISCUIT_FRAMES[name]) expect([f.width, f.height], name).toEqual([w, h]);
      expect(BISCUIT_FPS[name]).toBeGreaterThan(0);
    }
    expect(BISCUIT_ANCHOR.x).toBeGreaterThanOrEqual(0);
    expect(BISCUIT_ANCHOR.x).toBeLessThan(w);
    expect(BISCUIT_ANCHOR.y).toBeLessThan(h);
  });
  it('uses only master colours and is outlined', () => {
    const ids = new Set(Object.values(M));
    for (const frames of Object.values(BISCUIT_FRAMES)) for (const f of frames) {
      let outline = 0;
      f.data.forEach(id => { if (id !== 0) expect(ids.has(id)).toBe(true); if (id === M.outline) outline++; });
      expect(outline).toBeGreaterThan(20);
    }
  });
  it('the carry frames hold a ball at the muzzle, the run frames do not', () => {
    const at = (f: { get(x: number, y: number): number }) => f.get(BISCUIT_ANCHOR.x + MUZZLE.x, BISCUIT_ANCHOR.y + MUZZLE.y);
    for (const f of BISCUIT_FRAMES.carry) expect(at(f)).not.toBe(0);
    for (const f of BISCUIT_FRAMES.run) expect(at(f)).toBe(0);
  });
  it('the face is 12×12', () => {
    expect([BISCUIT_FACE.width, BISCUIT_FACE.height]).toEqual([12, 12]);
  });
});
```

- [ ] **Step 2: Run to see them fail, then draw him**

Run: `npx vitest run src/art/opponents/biscuit.test.ts`. Draw the frames
as grids. Start from the brainstorm's golden study for proportions (nose
to tail about 30 px, 20 px tall) and give him a gallop (run), the same
gallop with the ball (carry), a snatch (grab), a crouch-and-cut (jink), a
stopped heaving chest with the tongue out (pant), a flat-out flier and a
four-legs-up tumble (blown), and dug-in, ears back (brace).

- [ ] **Step 3: Add him to the sheet and render a GIF strip**

In `tools/render-sheet.ts`, add a row of every Biscuit frame, his face,
and a Backyard view with him carrying the ball toward the left goal and
Harrison blocking. `npm run sheet` writes `preview/character-sheet.png`
(gitignored). Assemble a GIF of the carry gallop at 3× with the Python
PIL route in the dev-environment notes.

- [ ] **Step 4: Send both to the parent and wait**

Send the sheet and the GIF with `SendUserFile` and ask for approval, as
[[parent-approval-workflow]] says. Tasks 2–5 may proceed meanwhile.
Nothing merges until he is approved; redraw on request.

- [ ] **Step 5: Run the tests, then commit**

Run: `npx vitest run src/art` → PASS.

```bash
git add src/art/opponents/biscuit.ts src/art/opponents/biscuit.test.ts tools/render-sheet.ts
git commit -m "feat: draw Biscuit the Dog"
```

### Task 2: The dog in the world

**Files:**
- Create: `src/game/dog.ts`
- Modify: `src/game/world.ts` (`dog`, `createWorld`, `stepWorld`,
  `placeForKickoff`, `WorldEvents.dog`)
- Modify: `src/game/contact.ts:236` (`resolveContacts` takes
  `{ trips: boolean }`, default true)
- Test: `src/game/dog.test.ts`, `src/game/world.test.ts`

**Interfaces:**
- Consumes: `Player`, `stepPlayer`, `NO_INTENT`, `PLAYER_R`; `Ball`,
  `BALL_REST_Y`; `ballAtFeet`, `ballIn`, `REACH_Z`; `playerSpan`,
  `inGoalBox`; `runSpeed`, `SPRINT_MULTIPLIER`, `maxStats`,
  `LADDER_MATCHES`; `MUZZLE` (Task 1).
- Produces, in `dog.ts`:
  ```ts
  export type Difficulty = 'easy' | 'normal' | 'hard';   // re-export from ai.ts
  export interface DogProfile {
    reactionS: number;      // easy 0.32, normal 0.18, hard 0.1
    /** Seconds a ball at Harrison's feet must sit in his muzzle before it's his, at Control 1. */
    dwellS: number;         // easy 0.55, normal 0.35, hard 0.2
    /** He jinks when a blocker is within this far ahead... */
    jinkAhead: number;      // easy 18, normal 24, hard 30
    /** ...and goes this wide. */
    jinkWidth: number;      // easy 14, normal 18, hard 22
    /** Seconds of full-speed running before he pants. */
    staminaS: number;       // easy 2.2, normal 3, hard 4
    braceSense: number;     // as DIFFICULTY[d].braceSense
  }
  export const DOG_DIFFICULTY: Readonly<Record<Difficulty, DogProfile>>;
  export const TUNING_STATS: Stats = { speed: 5, power: 5, jump: 3, control: 4 };
  export const DOG_SPEED_OVER_SPRINT = 1.12;
  /** His flat-out speed, px/s: the tuning Harrison's sprint and a bit. */
  export const DOG_SPEED: number;                 // Math.round(runSpeed(TUNING_STATS) * SPRINT_MULTIPLIER * DOG_SPEED_OVER_SPRINT)
  export const DOG_BACKPEDAL_SPEED: number;       // Math.round(runSpeed(maxStats(LADDER_MATCHES)) * 0.9)
  export const DOG_ACCEL = 1400;
  export const DOG_CATCH_SPEED = 260;             // a ball faster than this passes him
  export const DOG_CATCH_HEIGHT = 16;             // ball centre no higher than this
  export const MUZZLE_REACH = { ahead0: 4, ahead1: 14 };   // his muzzle zone along his facing, REACH_Z either side
  export const DWELL_PER_CONTROL = 0.08;          // dwellS grows this much per Control level above 1
  export const JINK_S = 0.5;
  export const JINK_SLOW = 0.35;                  // his speed during a jink, as a fraction of DOG_SPEED
  export const JINK_COOLDOWN_S = 0.6;
  export const PANT_S = 1.2;
  export const REGRAB_S = 0.4;                    // after a drop or a pant he can't grab for this long
  export const DROP_POP = { vx: 90, vy: 60 };     // a knocked-out ball pops this fast, ahead of the tackle
  export interface DogState {
    profile: DogProfile;
    carrying: boolean;
    dwellS: number;         // muzzle time on a controlled ball so far
    jinkS: number;          // time left in the jink
    jinkSide: 1 | -1;
    jinkCooldownS: number;
    runS: number;           // full-speed running so far since he last rested
    pantS: number;          // time left panting
    regrabS: number;
  }
  export interface DogEvents { grabbed: boolean; dropped: boolean; jinked: boolean; panted: boolean }
  export function createDog(profile: DogProfile): DogState;
  export function dwellFor(profile: DogProfile, control: number): number;   // profile.dwellS + DWELL_PER_CONTROL * (control - 1)
  /** His muzzle zone, facing-relative like footZone. */
  export function muzzleZone(p: Player): Rect;
  /** Whether a loose or controlled ball can be taken this tick (reach, speed, height, not on a roof, not fallen/blown/bracing, no regrab wait, not panting). */
  export function canGrab(w: World): boolean;
  /** He's slow and the ball can be won: jinking or panting. */
  export const vulnerable = (d: DogState): boolean;
  /**
   * One tick of the dog, after Harrison has stepped and before contacts: moves his body on `intent`
   * (ground only; bracing/blown are stepPlayer's), the stamina budget and the pant, the jink,
   * the grab and the dwell, and parks a carried ball at the muzzle. Returns the events.
   */
  export function stepDog(w: World, intent: PlayerIntent, live: boolean, dt: number): DogEvents;
  /** Lets go: the ball at the muzzle, live, popped forward (`pop`) or set down (pant). */
  export function dropBall(w: World, pop: boolean): void;
  ```
  In `world.ts`: `World.dog: DogState | null`; `WorldEvents.dog: DogEvents`
  (all false without a dog); `createWorld(..., kit, dog: DogProfile | null = null)`.
  `stepWorld`, when `w.dog`: step Harrison as now; for the away body, if
  its state is `bracing` or `blown` call `stepPlayer(away, NO_INTENT, ...)`,
  else `stepDog`; `resolveBodies` as now; the wave as now; `stepBall` only
  when not carried; contacts: Harrison's `resolveContacts` runs only when
  the ball isn't carried or the dog is vulnerable (with `{ trips: false }`
  against the dog); the dog has no `resolveContacts` of its own, and the
  away `ContactEvents` reports `touched: true` on a grab so `noteKick`,
  `powerEnds` and `noteLastKind` see the ball played. After contacts, if
  the ball was carried and Harrison's slide `tackledBall` or his touch
  reached it, `dropBall(w, true)` with `dropped`. A carried ball's position
  is written after everything moves: `ball.x = away.x + away.facing * MUZZLE.x`,
  `ball.y = -MUZZLE.y`, `ball.z = away.z`, velocities 0, so `goalScored`
  sees it cross the line. `placeForKickoff` resets the dog
  (`carrying`, `dwellS`, `jinkS`, `pantS`, `regrabS` to 0).

  The grab rule: the ball in `muzzleZone(away)` (or within `PLAYER_R + BALL_R`
  of his centre), `|v| ≤ DOG_CATCH_SPEED`, `y ≤ DOG_CATCH_HEIGHT`, not on a
  roof, play live, `canGrab`. If `ballAtFeet(home, ball)`: `dwellS += dt`
  and grab when `dwellS ≥ dwellFor(profile, home.stats.control)`; else
  grab now. `dwellS` resets to 0 whenever the ball leaves his muzzle zone.
  The pant: `runS` counts seconds moving at or above `0.8 × DOG_SPEED`,
  decays at the same rate when slower; at `staminaS` he pants: drop (set
  down), `pantS = PANT_S`, `runS = 0`, `regrabS = PANT_S`. The jink: set by
  `dogAi` through the intent (Task 3), timed here: while `jinkS > 0` his
  speed cap is `DOG_SPEED × JINK_SLOW`.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { BALL_R } from '../art/ball';
import { MUZZLE } from '../art/opponents/biscuit';
import { BALL_REST_Y } from './ball';
import { DOG_CATCH_SPEED, DOG_DIFFICULTY, DOG_SPEED, DWELL_PER_CONTROL, JINK_S, PANT_S, REGRAB_S, TUNING_STATS, dwellFor } from './dog';
import { BACKYARD } from './field';
import { NO_INTENT, type PlayerIntent } from './player';
import { SPRINT_MULTIPLIER, runSpeed } from './stats';
import { createWorld, placeForKickoff, stepWorld, type World } from './world';

const STEP = 1 / 60;
const ERR = { home: 4, away: 6 };
const still = NO_INTENT;
const run = (moveX: number, moveZ = 0, sprint = false): PlayerIntent => ({ ...NO_INTENT, moveX, moveZ, sprint });

/** A boss world in play, with the dog and Harrison where the test wants them and the ball at (bx, bz). */
function boss(opts: { dog: [number, number]; home: [number, number]; ball: [number, number]; control?: number; d?: 'easy' | 'normal' | 'hard' } ): World {
  const w = createWorld({ ...TUNING_STATS, control: opts.control ?? TUNING_STATS.control }, { speed: 1, power: 1, jump: 1, control: 1 }, 7, ERR, null, DOG_DIFFICULTY[opts.d ?? 'normal']);
  w.match.phase = 'playing';
  [w.away.x, w.away.z] = opts.dog;
  [w.home.x, w.home.z] = opts.home;
  Object.assign(w.ball, { x: opts.ball[0], z: opts.ball[1], y: BALL_REST_Y, vx: 0, vy: 0, vz: 0 });
  return w;
}
const ticks = (w: World, n: number, home = still, dog = still) => { for (let i = 0; i < n; i++) stepWorld(w, home, dog, STEP); };

describe('the dog', () => {
  it('is faster than the tuning Harrison can sprint, by 10 to 15 percent', () => {
    const sprint = runSpeed(TUNING_STATS) * SPRINT_MULTIPLIER;
    expect(DOG_SPEED / sprint).toBeGreaterThanOrEqual(1.1);
    expect(DOG_SPEED / sprint).toBeLessThanOrEqual(1.15);
  });

  it('takes a loose ball at once when his muzzle reaches it, and carries it', () => {
    const w = boss({ dog: [300, 32], home: [100, 32], ball: [310, 32] });
    ticks(w, 1, still, run(1));
    expect(w.dog!.carrying).toBe(true);
    expect(w.events.dog.grabbed).toBe(true);
    expect(w.events.kicks[1]?.touched).toBe(true);
    ticks(w, 10, still, run(-1));
    expect(w.ball.x).toBeCloseTo(w.away.x - MUZZLE.x, 0);
    expect(w.ball.y).toBe(-MUZZLE.y);
    expect([w.ball.vx, w.ball.vy, w.ball.vz]).toEqual([0, 0, 0]);
  });

  it('a hard shot passes him', () => {
    const w = boss({ dog: [300, 32], home: [100, 32], ball: [292, 32] });
    w.ball.vx = DOG_CATCH_SPEED + 50;
    ticks(w, 3);
    expect(w.dog!.carrying).toBe(false);
  });

  it('a ball at Harrison\'s feet needs a dwell that grows with Control and shrinks with difficulty', () => {
    expect(dwellFor(DOG_DIFFICULTY.normal, 4)).toBeCloseTo(DOG_DIFFICULTY.normal.dwellS + 3 * DWELL_PER_CONTROL);
    expect(dwellFor(DOG_DIFFICULTY.hard, 4)).toBeLessThan(dwellFor(DOG_DIFFICULTY.normal, 4));
    for (const control of [1, 10]) {
      const w = boss({ dog: [118, 32], home: [100, 32], ball: [108, 32], control });   // the ball at Harrison's foot, the dog's muzzle on it
      const need = dwellFor(DOG_DIFFICULTY.normal, control);
      ticks(w, Math.floor(need / STEP) - 2, still, run(-1));
      expect(w.dog!.carrying, `control ${control} early`).toBe(false);
      ticks(w, 4, still, run(-1));
      expect(w.dog!.carrying, `control ${control} after the dwell`).toBe(true);
    }
  });

  it('turning away resets the dwell', () => { /* two ticks on the ball, step Harrison away with run(1) so the ball leaves the muzzle zone, back again: dwellS starts over */ });

  it('a carried ball into the net is a goal for him, and the kickoff clears the carry', () => {
    const w = boss({ dog: [80, 32], home: [500, 32], ball: [78, 32] });
    ticks(w, 1, still, run(-1));
    expect(w.dog!.carrying).toBe(true);
    ticks(w, 90, still, run(-1));
    expect(w.match.score.away).toBe(1);
    expect(w.match.phase).toBe('goal');
    ticks(w, 200);                                   // through the goal pause to the kickoff
    expect(w.dog!.carrying).toBe(false);
    expect(w.match.kickoffTeam).toBe('home');
    expect(w.ball.x).toBe(BACKYARD.width / 2);
  });

  it('pants after staminaS of running: sets the ball down, cannot grab, then takes it again', () => {
    const w = boss({ dog: [600, 32], home: [100, 60], ball: [598, 32] });
    ticks(w, 1, still, run(-1));
    const need = Math.ceil(DOG_DIFFICULTY.normal.staminaS / STEP);
    ticks(w, need + 2, still, run(-1));
    expect(w.dog!.pantS).toBeGreaterThan(0);
    expect(w.dog!.carrying).toBe(false);
    expect(w.events.dog.panted || w.dog!.pantS > PANT_S - 3 * STEP).toBe(true);
    expect(w.ball.y).toBe(BALL_REST_Y);
    ticks(w, Math.ceil(PANT_S / STEP) + 2, still, run(-1));
    expect(w.dog!.carrying).toBe(true);
  });

  it('a slide during a jink knocks the ball out ahead of the tackle; at full speed it misses', () => {
    // jinking: set w.dog.jinkS = JINK_S by hand, Harrison beside the muzzle sliding (chipHeld press) toward it
    // expect dropped, tackledBall on kicks[0], ball.vy > 0; then the same with jinkS 0: still carrying
  });

  it('Harrison is never tripped by sliding at the dog', () => { /* slide into the dog's feet with the ball elsewhere: away.state stays 'ground', trippedOpponent false */ });

  it('a dropped ball beside the fence or a post lands somewhere it may be', () => { /* dog at x 10 facing left, drop: ball inside the fences; dog at the left post, drop: not through the net */ });

  it('a pause freezes the dog: nothing moves or counts while play is not live', () => {
    const w = boss({ dog: [300, 32], home: [100, 32], ball: [298, 32] });
    ticks(w, 1, still, run(-1));
    w.dog!.jinkS = JINK_S;
    w.match.phase = 'kickoff';
    ticks(w, 30, still, run(-1));
    expect(w.dog!.jinkS).toBe(JINK_S);
    expect(w.away.x).toBe(300);
  });

  it('a world without a dog has no dog events and steps as before', () => {
    const w = createWorld(TUNING_STATS, { speed: 1, power: 1, jump: 1, control: 1 }, 7, ERR);
    expect(w.dog).toBeNull();
    stepWorld(w, still, still, STEP);
    expect(w.events.dog).toEqual({ grabbed: false, dropped: false, jinked: false, panted: false });
  });
});
```

Fill the three sketched tests with the file's own staging (they decide the
assertions; the setup follows the pattern above). `REGRAB_S` is covered by
the pant test (he can't take it back during the pant).

- [ ] **Step 2: Run to see them fail, implement, run to see them pass**

Run: `npx vitest run src/game/dog.test.ts`, then the whole `src/game`
folder: the existing world, AI and power tests must pass unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/game/dog.ts src/game/dog.test.ts src/game/world.ts src/game/world.test.ts src/game/contact.ts
git commit -m "feat: Biscuit grabs, carries, drops and pants in the sim"
```

### Task 3: Biscuit thinks

**Files:**
- Create: `src/game/dogAi.ts`
- Modify: `src/game/ai.ts` (export `rollBackOff` and `BACK_OFF_GOAL_ROOM`;
  nothing else changes)
- Test: `src/game/dogAi.test.ts`

**Interfaces:**
- Consumes: `DogState`, `DOG_SPEED`, `DOG_BACKPEDAL_SPEED`, `JINK_S`,
  `JINK_COOLDOWN_S` (Task 2); `rollBackOff`, `AiProfile` fields
  `reactionS`, `braceSense` (`ai.ts`); `predictBall`-style lead (re-derive
  locally; `ai.ts` keeps its own private).
- Produces:
  ```ts
  export interface DogBrain {
    profile: DogProfile;
    nextDecisionS: number;
    intent: PlayerIntent;
    plan: 'chase' | 'carry' | 'jink' | 'pant' | 'backOff' | 'hesitate' | 'faceWave';
    backOff: null | 'stay' | { gap: number; inS: number };
  }
  export function createDogBrain(profile: DogProfile): DogBrain;
  /** His intent this tick. moveX/moveZ are a unit direction; `sprint` true means flat out (DOG_SPEED), false means DOG_BACKPEDAL_SPEED. */
  export function dogThink(brain: DogBrain, w: World, dt: number): PlayerIntent;
  ```
  Plans, re-decided every `reactionS` except where noted:
  - **carry** (he has the ball): run at the left goal's line, centre
    depth, flat out; the jink is checked every tick: Harrison on his feet
    within `profile.jinkAhead` ahead along his run and within `PLAYER_R + 6`
    in depth, and `jinkCooldownS === 0` → start a jink (`w.dog.jinkS = JINK_S`,
    `jinkSide` toward the side with more room, `jinkCooldownS = JINK_COOLDOWN_S`,
    `jinked` event); while jinking he steers `moveZ = jinkSide × 1`,
    `moveX` toward goal, and `stepDog` caps his speed.
  - **pant**: still, facing the ball.
  - **chase** (loose, or Harrison's): run at where the ball will be, flat
    out; `stepDog` decides the grab.
  - **backOff / hesitate / faceWave**: as Max's (`think`'s powered and wave
    branches), with `rollBackOff(profile-as-AiProfile, w.rng)` for the
    odds, standing `gap` from the ball in line with it, facing Harrison,
    at `DOG_BACKPEDAL_SPEED` (`sprint: false`). He never moves toward a
    powered-up Harrison.

- [ ] **Step 1: Write the failing tests**

```ts
describe('dogThink', () => {
  it('with the ball, runs at the left goal flat out', () => { /* carrying dog at 300: intent.moveX < 0, sprint true; plan 'carry' */ });
  it('jinks when Harrison blocks the lane, to the roomier side, then not again until the cooldown', () => {
    /* dog carrying at 200 facing left, Harrison at 180, same depth 32: after one think, w.dog.jinkS === JINK_S, plan 'jink', events.dog.jinked; moveZ === jinkSide; step past the jink: no new jink while jinkCooldownS > 0 */
  });
  it('does not jink for a fallen Harrison or one off the lane', () => { /* home.state 'fallen', or z 50: jinkS stays 0 */ });
  it('chases a loose ball and a ball at Harrison\'s feet', () => { /* plan 'chase', moving toward the ball */ });
  it('when Harrison powers up, backs off at Max\'s pace, facing him, and never closes', () => {
    /* world with a kit, meter 1, power him up as the Energy Wave tests do; over 2 s the dog's speed never exceeds DOG_BACKPEDAL_SPEED + 1 and his distance to the ball never shrinks; faceX toward Harrison */
  });
  it('gets it wrong at Max\'s odds', () => { /* over 400 power-ups on each difficulty, the share of 'stay' or late/too-close rolls matches 1 - braceSense within 0.08, as ai.test.ts does for Max */ });
  it('a live wave: he holds the lane', () => { /* fire a wave as the wave tests do; plan 'faceWave' */ });
});
```

- [ ] **Step 2: Run to see them fail, implement, run to see them pass**

Run: `npx vitest run src/game/dogAi.test.ts src/game/ai.test.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/game/dogAi.ts src/game/dogAi.test.ts src/game/ai.ts
git commit -m "feat: Biscuit's brain: chase, carry, jink, back off"
```

### Task 4: The Energy Wave against the dog

**Files:**
- Modify: `src/game/dog.ts` (nothing new; the tests pin the behaviour),
  `src/game/world.ts` only if a guard is missing
- Test: `src/game/dog.test.ts`

**Interfaces:** none new. `stepWave` already braces or blows the away
body; `stepPlayer` runs those states for the dog; `canGrab` is false in
`bracing` and `blown` and while `regrabS > 0`.

- [ ] **Step 1: Write the failing tests**

```ts
describe('the wave and the dog', () => {
  it('braced from range: he digs in, the ball dies at his feet, and he takes it once the brace ends', () => {
    /* a kit world with the dog 150 px in front of Harrison, facing him, on the ground; power up, wait WAVE_READY_S, fire (as ai.test.ts "braces it" does); expect events.power.braced, away.state 'bracing', ball still; step BRACE_S + REGRAB_S + 2 ticks with the dog's intent still: dog.carrying true */
  });
  it('fired from close: he is blown away, lands inside the field on his feet, and the ball runs on', () => {
    /* dog 40 px away: events.power.blown; while away.state === 'blown' canGrab is false and ball.vx stays WAVE_SPEED; after BLOWN_DOWN_S: away.state 'ground', y 0, x inside [fenceL + PLAYER_R, fenceR - PLAYER_R], not in a goal box */
  });
  it('a wave never fires while he carries, because Harrison has no ball', () => { /* carrying dog, meter 1, Y: events.power.started false */ });
});
```

- [ ] **Step 2: Run, fix anything that fails, commit**

```bash
git add src/game/dog.ts src/game/dog.test.ts src/game/world.ts
git commit -m "test: the Energy Wave braced and blown against Biscuit"
```

### Task 5: Drawing him

**Files:**
- Create: `src/scenes/dogView.ts`
- Modify: `src/scenes/art.ts` (`art.biscuit: DogSprites`, `art.biscuitFace`),
  `src/scenes/matchView.ts` (`pitchDrawables`, `drawImpact`, the shadow,
  the carried ball), `src/scenes/powerView.ts` only if `drawSkid` assumes
  the human anchor
- Test: `src/scenes/dogView.test.ts`

**Interfaces:**
- Consumes: `BISCUIT_FRAMES`, `BISCUIT_FPS`, `BISCUIT_ANCHOR`,
  `BISCUIT_FACE` (Task 1); `DogState` (Task 2); `SpriteCache`.
- Produces:
  ```ts
  // art.ts
  export type DogSprites = Record<DogAnim, FacingFrames>;
  // GameArt gains `biscuit: DogSprites` and `biscuitFace: HTMLCanvasElement`.

  // dogView.ts
  export interface DogClip { name: DogAnim; frame: number }
  /** Which clip and frame the dog shows: pant while pantS > 0; jink while jinkS > 0; grab for GRAB_SHOW_S after a grab; carry when carrying and moving; run when moving; blown/brace from the body state; idle otherwise. Looping clips run on `nowS`. */
  export function dogClip(w: World, nowS: number): DogClip;
  export const GRAB_SHOW_S = 0.2;
  export function drawDog(g: CanvasRenderingContext2D, cam: Camera, w: World, art: GameArt, nowS: number, flat?: boolean): void;
  ```
  `pitchDrawables`: when `w.dog`, the away drawable is `drawDog` and the
  ball drawable is left out while `w.dog.carrying` (the carry frame holds
  it). `drawImpact` silhouettes him with `flat`. The dog's shadow is a
  wider patch (9 px). The HUD, banner and callouts are unchanged (the name
  already flows from the match).

- [ ] **Step 1: Write the failing tests**

```ts
describe('dogClip', () => {
  it('picks pant, jink, grab, carry, run, blown, brace and idle in that order of precedence', () => {
    /* build a boss world as dog.test does; set state and timers by hand; assert the clip name for each; the grab shows for GRAB_SHOW_S after events.dog.grabbed (the view keeps the time of the last grab in a closure or a field on the hud: builder's call, test through drawDog's exported helper) */
  });
  it('looping clips advance with time at their fps', () => { /* carry at nowS 0 and 0.1 → frames 0 and 1 at 10 fps */ });
});
```

- [ ] **Step 2: Run to see them fail, implement, run to see them pass**

Run: `npx vitest run src/scenes/dogView.test.ts src/scenes/matchView.test.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/dogView.ts src/scenes/dogView.test.ts src/scenes/art.ts src/scenes/matchView.ts src/scenes/powerView.ts
git commit -m "feat: draw Biscuit on the pitch"
```

### Task 6: The boss match, the card, the node and the tip

**Files:**
- Modify: `src/scenes/matchScene.ts` (the stand-in goes; a boss builds a
  dog world and thinks with `dogAi`)
- Modify: `src/audio/cues.ts` (`bark`, `pant`, `bossSting`),
  `src/audio/matchFeedback.ts` (dog events → cues)
- Modify: `src/scenes/vsScene.ts` (his sprite, the sting, the tip line),
  `src/scenes/venueScene.ts` (the boss node's face),
  `src/scenes/helpScene.ts` (one line)
- Test: `src/scenes/matchScene.test.ts`, `src/audio/matchFeedback.test.ts`,
  `src/scenes/vsScene.test.ts`, `src/scenes/helpScene.test.ts`

**Interfaces:**
- Consumes: `createWorld(..., DOG_DIFFICULTY[difficulty])`,
  `createDogBrain`, `dogThink` (Tasks 2–3); `drawDog`, `art.biscuitFace`
  (Task 5); `career.lossStreaks` (part 1).
- Produces:
  - `createMatchScene`: `match.kind === 'boss'` → a world with
    `DOG_DIFFICULTY[difficulty]`, away stats `{1,1,1,1}`, intents from
    `dogThink`; `backHere` re-applies the dog profile too. The `MatchScene`
    gains `readonly dog: DogState | null`.
  - `Cue` gains `'bark' | 'pant' | 'bossSting'`. `matchFeedback`: `grabbed`
    → `bark`; `panted` → `pant`; `dropped` → `tackle` only when
    `kicks[0].tackledBall` (already there); a dog goal keeps `groan`.
  - `vsLines(match, p)`: for the boss, appends
    `TIP: GET BETWEEN HIM AND YOUR GOAL` when
    `(p.career.lossStreaks['backyard-boss'] ?? 0) >= 1`. The card draws
    his idle sprite facing left and plays `bossSting` on open.
  - `HELP_PAGES[1]` (THE MATCH) gains, as its last line:
    `BISCUIT CAN'T SHOOT: BLOCK HIS WAY TO YOUR GOAL.`
  - The venue screen's boss node draws `art.biscuitFace`, as a dark
    silhouette (every non-zero pixel in `outline`) while locked.

- [ ] **Step 1: Write the failing tests**

```ts
// matchScene.test.ts
it('the boss match has a dog, no stand-in', () => {
  const s = createMatchScene(testContext({ profile: { ...newProfile(), ladderWins: 10 } }), 1);
  expect(s.match.id).toBe('backyard-boss');
  expect(s.dog).not.toBeNull();
  expect(s.world.dog?.profile).toEqual(DOG_DIFFICULTY.normal);
});
it('a rung has no dog', () => { expect(createMatchScene(testContext(), 1).dog).toBeNull(); });
it('Options mid-match re-applies the dog profile', () => { /* pause → OPTIONS → change difficulty to hard → back: s.world.dog.profile is DOG_DIFFICULTY.hard */ });

// matchFeedback.test.ts
it('a grab barks, a pant pants', () => { /* events.dog.grabbed → 'bark'; panted → 'pant' */ });

// vsScene.test.ts
it('the tip appears only after a loss to Biscuit, and not for Max', () => {
  const fresh = newProfile();
  expect(vsLines(matchById(BOSS_ID)!, fresh)).toHaveLength(3);
  const lost = { ...fresh, career: { ...fresh.career, lossStreaks: { 'backyard-boss': 1 } } };
  expect(vsLines(matchById(BOSS_ID)!, lost).at(-1)).toBe('TIP: GET BETWEEN HIM AND YOUR GOAL');
  const lostToMax = { ...fresh, career: { ...fresh.career, lossStreaks: { 'backyard-3': 2 } } };
  expect(vsLines(matchById('backyard-3')!, lostToMax)).toHaveLength(3);
  expect(vsLines(matchById(BOSS_ID)!, lostToMax)).toHaveLength(3);
});
it('the boss card plays the sting', () => { /* ctx.audio.played contains 'bossSting' for the boss, not for a rung */ });

// helpScene.test.ts
it('THE MATCH page tells him how to beat the dog', () => { expect(HELP_PAGES[1]!.lines.at(-1)).toBe("BISCUIT CAN'T SHOOT: BLOCK HIS WAY TO YOUR GOAL."); });
```

- [ ] **Step 2: Run to see them fail, implement, run the whole suite**

Run: `npm run typecheck && npx vitest run` → PASS. Part 1's stand-in test
("the boss is a stand-in for now") is replaced by the dog test above.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/matchScene.ts src/scenes/matchScene.test.ts src/audio/cues.ts src/audio/matchFeedback.ts src/audio/matchFeedback.test.ts src/scenes/vsScene.ts src/scenes/vsScene.test.ts src/scenes/venueScene.ts src/scenes/helpScene.ts src/scenes/helpScene.test.ts
git commit -m "feat: Biscuit is the Backyard boss"
```

### Task 7: The chaser, the blocker and the tuning

**Files:**
- Create: `src/game/dogScripts.ts` (the two scripted Harrisons, used by
  tests and by the dev playtest hook)
- Create: `src/game/dogTuning.test.ts`
- Modify: `src/game/dog.ts` and `src/game/dogAi.ts` constants, as the
  runs demand

**Interfaces:**
- Produces:
  ```ts
  /** A Harrison who runs at the ball wherever it is, sprinting, and shoots as soon as it's at his feet. */
  export function chaserIntent(w: World, t: number): PlayerIntent;
  /**
   * A Harrison who, when the dog has the ball, drops to a spot between the dog and his own goal
   * (BLOCK_AHEAD px goal-side of the dog, on the dog's depth), faces him, and slides when the dog is
   * jinking within SLIDE_AT px; otherwise runs the ball at the right goal and, within SHOOT_FROM px of
   * its line with the dog more than CLEAR px away, charges for CHARGE_S and lets go.
   */
  export function blockerIntent(w: World, t: number, memo: BlockerMemo): PlayerIntent;
  export interface BlockerMemo { chargingSinceS: number | null }
  export const BLOCK_AHEAD = 36, SLIDE_AT = 20, SHOOT_FROM = 220, CLEAR = 40, CHARGE_S = 0.8;
  /** Plays a whole boss match headlessly and returns the result from Harrison's side. */
  export function playBossMatch(d: Difficulty, seed: number, harrison: 'chaser' | 'blocker'): 'win' | 'draw' | 'lose';
  ```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { playBossMatch } from './dogScripts';

const SEEDS = [...Array(16)].map((_, i) => 100 + i);
const wins = (d: 'easy' | 'normal' | 'hard', who: 'chaser' | 'blocker') => SEEDS.filter(s => playBossMatch(d, s, who) === 'win').length / SEEDS.length;

describe('Biscuit stays tuned to his lesson', () => {
  it('a chaser loses nearly every match on Normal', () => { expect(wins('normal', 'chaser')).toBeLessThanOrEqual(0.15); });
  it('a blocker wins about half on Normal', () => {
    const r = wins('normal', 'blocker');
    expect(r).toBeGreaterThanOrEqual(0.35);
    expect(r).toBeLessThanOrEqual(0.65);
  });
  it('Easy is kinder and Hard is harsher to the blocker', () => {
    expect(wins('easy', 'blocker')).toBeGreaterThanOrEqual(wins('normal', 'blocker'));
    expect(wins('hard', 'blocker')).toBeLessThanOrEqual(wins('normal', 'blocker'));
  });
  it('every match ends with a result and nothing stuck', () => { /* for each seed on Normal: result non-null, and the ball never sat still outside a pause for more than 4 s (track it inside playBossMatch and expose the longest still spell) */ });
});
```

- [ ] **Step 2: Run them, then tune until they pass**

Run: `npx vitest run src/game/dogTuning.test.ts`. The constants to turn,
in order of leverage: `DOG_SPEED_OVER_SPRINT`, `jinkAhead`/`jinkWidth`,
`JINK_SLOW`, `staminaS`, `dwellS`, `DOG_CATCH_SPEED`. Keep the whole
suite under about 60 s (`npx vitest run` prints the duration); drop
`SEEDS` to 12 if the tuning test alone passes 15 s. Record the final
numbers in the spec's "Tuning target" section as the starting values.

- [ ] **Step 3: Commit**

```bash
git add src/game/dogScripts.ts src/game/dogTuning.test.ts src/game/dog.ts src/game/dogAi.ts docs/superpowers/specs/2026-10-26-career-spine-design.md
git commit -m "test: a chaser loses to Biscuit and a blocker beats him"
```

### Task 8: Look at it, then finish the branch

**Files:** none new.

- [ ] **Step 1: Build and play**

Run: `npm run build` → clean. Start Vite as in part 1's Task 15, open the
game, stage `ladderWins` 10, and play Biscuit with the controller or the
keyboard: watch a grab, a carry goal, a jink, a pant, a wave braced and
one blown. Capture a GIF of a carry-and-jink for the parent through the
frame-capture route in the dev-environment notes.

- [ ] **Step 2: Fix what looks wrong, keeping the tuning tests green**

Run: `npm run typecheck && npx vitest run` → PASS. Commit.

- [ ] **Step 3: Confirm the approvals and hand over**

Biscuit's sheet must have been approved (Task 1). Then use
`superpowers:finishing-a-development-branch`: ask before merging into
`main`, and again before pushing, since Pages deploys the push. After the
push, update the memory note and offer the game-tour page update.
