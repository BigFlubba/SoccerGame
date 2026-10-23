# Depth Band and Front-End Screens Implementation Plan (Plan 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the one-line match into a pitch with depth, where solid players go around each other and shots are aimed at the near or far post. Wrap it in a real game front end: a Press Start screen, a title menu, Help and Options, with saved settings.

**Architecture:**
- The simulation in `src/game/` gains a depth axis `z`: `x` runs along the pitch, `z` runs away from the camera, and `y` is height.
- One projection (`camera.ts`) turns world positions into screen positions, with a fixed oblique slant: `sx = x + z·0.3 − cam.x`, `sy = 176 − z − y`. That slant is why the goals and mowing stripes lean.
- Everything that draws sorts itself by `z` (painter's order). The goal posts are entries in that sort.
- Screens live in `src/scenes/` and share a `GameContext` (art, settings, save).
- Settings live in a new `src/meta/settings.ts`, behind an injectable key-value store.

**Tech Stack:** Vite 8, TypeScript 7 (strict), Vitest 4, Canvas 2D, GitHub Actions + Pages. No runtime dependencies.

**Spec:**
- `docs/superpowers/specs/2026-10-23-depth-and-menus-design.md` (this amendment wins on conflicts).
- `docs/superpowers/specs/2026-10-22-harrison-soccer-design.md` (the main spec).
- Read both before Task 1.

## Global Constraints

- **Stack:**
  - No runtime dependencies and no game engine.
  - `src/game/` must not touch the DOM.
  - The fixed simulation step is 60 Hz (`STEP` in `src/engine/loop.ts`).
- **Screen:**
  - 320×180 with integer scaling.
  - The HUD lives in the top 14 rows.
  - The pitch (grass) fills the bottom 70 rows: the far touchline is at screen row **112**, the near touchline at row **176**.
- **Projection:**
  - `sx = x + z·DEPTH_SHEAR − cam.x`, with `DEPTH_SHEAR = 0.3`.
  - `sy = NEAR_SY − z − y`, with `NEAR_SY = 176`.
- **Field (Backyard), world units:**
  - length **640**; end fences at x **4** and **636**;
  - depth **64**: a near board at z **0**, the back fence at z **64** (both bounce the ball, as there are no throw-ins);
  - goal lines at x **28** and **612**; net backs at x **12** and **628**;
  - posts at z **18** and **46**;
  - crossbar underside at height **28**, thickness **2**;
  - Harrison (team `home`) attacks the right goal.
- **Controls** (spec):
  - The stick or D-pad moves him in x and in depth, at the **same speed in every direction**.
  - **While he's striking the ball, up/down aims instead of moving him.** "Striking" means charging X, charging B, or in the air. Up aims at the **far** post (z+), down at the **near** post, level straight.
  - In the air he keeps the depth velocity he jumped with.
  - A jumps; X shoots or volleys; B chips with the ball, slide-tackles without; RT sprints; Start pauses.
  - Keyboard: arrows, Z, X, C, Shift, Enter/Esc.
- **Shot height** (spec): from charge.
  - From normal shooting range (≤ 210 px from the goal line), a sweet-spot or full-charge shot stays under the bar.
  - Only overcharge lifts a shot over.
  - The chip is the lofted shot.
  - Headers and volleys leave at a fixed, slightly rising angle.
- **Players are solid.**
  - They slide off each other at an angle.
  - They never wedge against each other, a fence, a net or the goal frame.
  - Nobody can stand inside a goal.
- **Feel targets:**
  - A full-power max-stat shot crosses the field in about 1 s.
  - A max-stat jump clears about 1.2× his height.
  - Touching the ball must feel **as easy as Plan 2**.
- **Screens:**
  - Press Start: title `HARRISON'S ROAD TO THE CUP`, subtitle `FROM THE BACKYARD TO THE WORLD CUP`.
  - Title menu: `START GAME / OPTIONS / HELP`, with no quit.
  - Pause menu: `RESUME / RESTART / HELP / OPTIONS / QUIT TO TITLE`.
  - Options: `DIFFICULTY: EASY / NORMAL / HARD`, Normal by default.
- **Settings:**
  - Stored in `localStorage` key `harrisons-road-to-the-cup/settings`.
  - Versioned, with `version: 1`.
  - Missing or corrupt data falls back to defaults.
- **Process:**
  - Work on branch `feat/depth-and-menus` (it already holds the design commit).
  - **The parent approves the re-laid-out Backyard composite (Task 2) before Task 10 draws the match with it.**
  - Ask the parent before pushing.
  - Photos are never committed.
  - Run `git status --short` before each commit.
  - Commits use Conventional Commits, 50/72, with **no AI attribution trailers**.
- **Folded-in Plan 2 review minors:**
  - golden-goal GOAL! banner (Task 8);
  - a button held through a kickoff needs a fresh press (Task 8);
  - AI charge re-arm race (Task 9);
  - ball placed outside the field by a body push (Task 7);
  - CI on Node 22 LTS (Task 15).

## Review Focus

1. **Wedging.** Solid players must never lock together: with each other (head-on, at kickoff), against a fence, or against the goal frame. Tests in Task 6, plus the whole-match simulations in Task 9.
2. **Unreachable ball.** A ball must never come to rest where nobody can reach it: behind the goal line beside the goal, in a corner between an end fence and the near board or back fence, or on a net roof. Tests in Task 3 and Task 9.
3. **Depth tolerance.** Running at a ball up to `REACH_Z` off his line still touches it, and dribbling on a diagonal keeps the ball. Tests in Task 7.
4. **Fast shots through the new solids.** A 736 px/s shot must never pass through a post, the side netting or a roof edge. No goal may register through the side netting. Tests in Task 3.
5. **Presses leaking between screens.** Backing out of Help or Options into a paused match with B, then resuming, must not slide or chip. Up/down held as a charge ends must move him smoothly, with no lurch. Tests in Task 5 and Task 14.

---

### Task 1: Depth geometry and projection

**Files:**
- Modify: `src/game/field.ts`, `src/game/camera.ts`
- Test: `src/game/field.test.ts` (new), `src/game/camera.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // field.ts
  export interface Goal { side: 'left' | 'right'; lineX: number; backX: number; barY: number; barThick: number; z0: number; z1: number } // posts at z0 (near) and z1 (far)
  export interface Field { width: number; depth: number; fenceL: number; fenceR: number; goals: readonly [Goal, Goal] }
  export const BACKYARD: Field;                    // values in Global Constraints
  export function goalScored(field: Field, b: { x: number; y: number; z: number }): 'left' | 'right' | null; // whole ball past the line, under the bar, between the posts
  export function inGoalBox(g: Goal, x: number, z: number, margin?: number): boolean; // between back and line, between posts (grown by margin)
  export function playerSpan(field: Field): [x0: number, x1: number]; // now fenceL..fenceR (players may walk round the goals)
  // camera.ts
  export const NEAR_SY = 176, DEPTH_SHEAR = 0.3;
  export function project(x: number, y: number, z: number, camX: number): { sx: number; sy: number };
  export function updateCamera(cam: Camera, ball: { x: number; z: number; vx: number }, dt: number, field: Field): void; // follows x + z·DEPTH_SHEAR, clamps [0, field.width + field.depth·DEPTH_SHEAR − VIEW_W]
  export function offscreenArrow(ball: { x: number; y: number; z: number }, cam: Camera): null | { x: number }; // when project(...).sy < 0
  ```
- `GROUND_SY` is removed; every use moves to `project`. `roofSpan` (from Plan 2's review fix) now spans only the goal box: x between line and back. The ball can now get round the goal, so the roof no longer needs to reach the fence. Task 3 owns that change.

- [ ] **Step 1: Write the failing tests**

```ts
it('scores only between the posts', () => {
  expect(goalScored(BACKYARD, { x: 615, y: 10, z: 32 })).toBe('right');
  expect(goalScored(BACKYARD, { x: 615, y: 10, z: 46 - 2 })).toBeNull(); // ball pokes past the far post
  expect(goalScored(BACKYARD, { x: 615, y: 10, z: 10 })).toBeNull();     // wide of the near post
});
it('projects depth up the screen with the oblique slant', () => {
  expect(project(100, 0, 0, 0)).toEqual({ sx: 100, sy: 176 });
  expect(project(100, 0, 64, 0)).toEqual({ sx: 100 + 64 * 0.3, sy: 112 });
});
it('clamps the camera so the far end of the slanted pitch stays reachable', () => { /* ball at x 640, z 64 → cam.x settles at 640 + 64·0.3 − 320 */ });
```

Keep the existing camera tests, with their ball objects gaining `z`.

- [ ] **Step 2: Run `npm test`.** The new tests fail. Compile errors in the files that still use `GROUND_SY` are expected.
- [ ] **Step 3: Implement** the geometry and projection, then fix compile errors in the callers. `matchView.ts` switches to `project` mechanically: draw everything at `z = BACKYARD.depth / 2` until Task 10, so the game still runs.
- [ ] **Step 4: Run `npm test` and `npm run typecheck`.** Both pass. Ball, player and contact tests may still use the 1-D model, with `z` defaulting to the field's centre depth. That's fine until Tasks 3–7.
- [ ] **Step 5: Commit** `feat: add depth to the field and camera projection`

---

### Task 2: The Backyard re-laid out for a deep pitch (parent approval)

**Files:**
- Modify: `src/art/venues/backyard.ts`, `tools/render-sheet.ts`
- Test: `src/art/venues/backyard.test.ts`

**Interfaces:**
- Consumes: `BACKYARD`, `project`, `DEPTH_SHEAR`, `NEAR_SY`
- Produces:
  ```ts
  export function backyardLayers(): VenueLayers;   // far 320 wide; mid ≥ 480; near ≥ 576; ground ≥ 640 + ceil(64·0.3); all 180 high
  export interface GoalArt { back: IndexedImage; nearPost: IndexedImage; farPost: IndexedImage; origin: { x: number; y: number } } // sprites placed at project(lineX, 0, 0, cam) + origin
  export function goalSprites(side: 'left' | 'right'): GoalArt; // drawn from the geometry; NOT a flipX of the other side (the slant is global)
  ```
- Layout:
  - The scenery moves up so the back fence's foot sits on row 112: sky, sun and houses above, the washing line above the fence.
  - The ground layer holds the slanted mowing stripes (every 32 px along x, leaning with the slant) from row 112 to 180, plus the end fences drawn slanted across the depth.
  - The near board is invisible: a 1-px darker grass line on row 177.
- Goal art:
  - `back`: net back, side nets, roof mesh and the crossbar from the near-post top to the far-post top.
  - `nearPost` and `farPost`: separate sprites, so Task 10 can depth-sort them against the players.

- [ ] **Step 1: Write the failing tests**

```ts
it('puts the back fence foot on the far touchline', () => { /* near layer: row 111 is fence (wood), row 113 is transparent */ });
it('ground layer is grass across the whole pitch', () => { /* get(x, 112..179) ∈ grass ids for x across 0..658, except the end-fence columns */ });
it('goal posts land on the projected post positions', () => {
  const g = goalSprites('right'); /* nearPost's opaque column sits at project(612, 0, 18).sx relative to origin; farPost at project(612, 0, 46).sx */
});
```

- [ ] **Step 2: Run `npm test`.** The new tests fail.
- [ ] **Step 3: Implement** the layout, and add composite Backyard views (camera 0 and max) with both players and the ball at different depths to the character sheet.
- [ ] **Step 4: Run `npm test` and `npm run sheet`.**
  - Check the composite by eye. It must read as the half-and-half mockup the parent chose: cosy evening backyard above, deep pitch below, slanted goals.
  - **Send the composite PNG to the parent and ask for approval.** Carry on with Tasks 3–9 while waiting. **Do not start Task 10 until approved.** Make any requested changes here first.
- [ ] **Step 5: Commit** `feat: re-lay the backyard for a deep pitch`

---

### Task 3: Ball physics in depth

**Files:**
- Modify: `src/game/ball.ts`, `src/game/constants.ts`
- Test: `src/game/ball.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface Ball { x: number; y: number; z: number; vx: number; vy: number; vz: number; spin: number; spinAngle: number }
  export const POST_R = 1;   // posts are solid uprights at (lineX, z0) and (lineX, z1) from the ground to the bar
  export function stepBall(ball: Ball, dt: number, field: Field): BallEvents; // BallEvents gains hitPost
  ```

**Physics changes:**
- **Horizontal motion** is the vector `(vx, vz)`.
  - Rolling friction slows the vector's magnitude without turning it.
  - Air drag applies to all three components.
  - `spinAngle` advances by the horizontal speed.
- **Walls:**
  - The end fences (x) and the near board and back fence (z) reflect with `WALL_RESTITUTION`.
  - The ball stays inside `[fenceL+R, fenceR−R] × [R, depth−R]`.
- **Each goal is a box** spanning x between line and back, and z between the posts:
  - the crossbar box spans only that x range, and only z within the posts;
  - the roof covers the box, and a ball resting on it rolls off toward the field (x), as in Plan 2;
  - the net back is at `backX` and the side nets at `z0` and `z1`, all reflecting with `NET_DAMPING`;
  - the side nets block from both sides, so a ball can't enter or leave through them;
  - the posts are vertical cylinders, reflecting with `BAR_RESTITUTION`.
- **Substeps** use the largest of `|vx|`, `|vz|` and `|vy| + g·dt`, at most `BALL_SUBSTEP_PX` each.
- **A ball wide of the goal**, behind the goal line, is open grass that players can reach.

- [ ] **Step 1: Write the failing tests** (keep and adapt Plan 2's; add):

```ts
it('rolls on a diagonal and stops without curving', () => { /* vx 150, vz 80 → stops; final (dx, dz) parallel to (150, 80) */ });
it('bounces off the near board and the back fence', () => {});
it('a 736 px/s shot at the near post rebounds, never passes through', () => { /* aim at (612, z 18), y 10: every tick the ball centre stays ≥ R+POST_R from the post axis; hitPost */ });
it('the side netting stops a ball entering the goal from the side', () => { /* ball at x 620, z 8, vz 300 → never reaches z > 18 − R while x > 612 + R; goalScored never true */ });
it('a ball in the net cannot leave through the side netting', () => {});
it('a shot under the bar between the posts is caught by the net', () => {});
it('a ball resting on the net roof rolls off', () => {});
it.each([[8, 3], [632, 3], [8, 61], [632, 61], [20, 6]])('a ball left at (%i, z %i) comes to rest somewhere a player can stand', (x, z) => {
  /* after 5 s at rest: not inside any goal box (inGoalBox with margin R) and inside the player area */
});
it('never tunnels: 2000 random 736 px/s shots never end a tick inside a post, a net plane, the bar box or past a wall', () => {});
```

- [ ] **Step 2: Run `npm test`.** The new tests fail.
- [ ] **Step 3: Implement** the depth physics.
- [ ] **Step 4: Run `npm test`.** All pass.
- [ ] **Step 5: Commit** `feat: give the ball depth, posts and side nets`

---

### Task 4: Kick maths with near/far aim and charge height

**Files:**
- Modify: `src/game/kick.ts`
- Test: `src/game/kick.test.ts`

**Interfaces:**
- Consumes: `Field`, `Goal`
- Produces:
  ```ts
  export type Aim = 'far' | 'straight' | 'near';
  export interface AimLine { facing: 1 | -1; slope: number }                  // dz per |dx|, clamped to ±MAX_AIM_SLOPE
  export interface KickResult { vx: number; vy: number; vz: number; spin: number; perfect: boolean }
  export const SHOT_ELEVATION_DEG: readonly [number, number] = [4, 16];       // soft → full charge
  export const OVERCHARGE_LIFT_DEG = 18, VOLLEY_ELEVATION_DEG = 8, HEADER_ELEVATION_DEG = 14, CHIP_ELEVATION_DEG = 55;
  export const MAX_AIM_SLOPE = 0.7, POST_INSET = 4;
  export function aimLine(ball: { x: number; z: number }, facing: 1 | -1, aim: Aim, field: Field): AimLine;
  export function shot(stats: Stats, charge: number, overchargeS: number, line: AimLine, aimErrorDeg: number, rng: Rng): KickResult;
  export function chip(stats: Stats, charge: number, line: AimLine): KickResult;
  export function volley(stats: Stats, line: AimLine): KickResult;
  export function header(stats: Stats, line: AimLine, incomingSpeed: number): KickResult;
  ```

**Rules:**
- **`aimLine`:**
  - Straight gives slope 0.
  - Far or near aims at that post of the goal in the `facing` direction, inset by `POST_INSET` (`z1 − 4` or `z0 + 4`), arriving at its line: `slope = (targetZ − ball.z) / |lineX − ball.x|`.
  - The slope is clamped to ±0.7.
- **Shot speed** as in Plan 2: `lerp(180, maxShotSpeed, charge)`, ×1.15 and exact when perfect.
- **Shot elevation:** `lerp(4°, 16°, charge)`, plus `OVERCHARGE_LIFT_DEG × min(overchargeS, 1)`.
- **Aim error** turns the horizontal direction (yaw) by `(rng()·2 − 1) × (aimErrorDeg + 12·min(overchargeS, 1))`. A perfect shot has no error.
- **Spin:** shots and volleys +0.6; the chip −0.8; headers 0.
- **Volley:** charge 0.75 at a fixed 8°.
- **Header:** speed `max(0.6·incoming, 200)` at a fixed 14°.

- [ ] **Step 1: Write the failing tests** (replace Plan 2's aim tests; keep the stat, perfect and overcharge ones, adapted):

```ts
it('far aims at the far post, near at the near post, both arriving at the line', () => {
  const far = aimLine({ x: 500, z: 32 }, 1, 'far', BACKYARD); expect(32 + far.slope * 112).toBeCloseTo(46 - 4);
  const near = aimLine({ x: 500, z: 32 }, 1, 'near', BACKYARD); expect(32 + near.slope * 112).toBeCloseTo(18 + 4);
});
it('clamps the slope right next to the goal', () => { expect(Math.abs(aimLine({ x: 608, z: 2 }, 1, 'far', BACKYARD).slope)).toBe(0.7); });
it('a full-charge max-power shot from 210 px stays under the bar', () => {
  /* shot(power 10, charge 1, overcharge 0, straight) from (402, R, 32) stepped with stepBall: max y before x passes 612 ≤ 28 − R */
});
it('a sweet-spot shot from 210 px stays under the bar', () => {});
it('a full second of overcharge can sail over the bar', () => { /* same shot with overchargeS 1 rises above 28 + 2 + R before the line */ });
it('a full-power max-stat shot crosses the field in about a second', () => {});
it('headers and volleys leave at their fixed angles whatever the aim', () => {});
it('a hard shot keeps a low, hard option: a full charge is faster and no higher than 16°', () => {});
```

- [ ] **Step 2: Run `npm test`.** The new tests fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run `npm test`.** All pass.
- [ ] **Step 5: Commit** `feat: aim kicks at the near or far post`

---

### Task 5: Moving in depth and the striking rule

**Files:**
- Modify: `src/game/player.ts`
- Test: `src/game/player.test.ts`

**Interfaces:**
- Consumes: `Aim`
- Produces:
  ```ts
  export interface PlayerIntent { moveX: number; moveZ: number; aim: Aim; jump: boolean; shootHeld: boolean; chipHeld: boolean; sprint: boolean } // moveZ +1 = away from the camera
  // Player gains z, vz; NO_INTENT gains moveZ 0, aim 'straight'
  export const PLAYER_R = 5;                        // body radius on the ground plane (replaces PLAYER_W's half-width)
  export function isStriking(p: Player): boolean;   // charging, chipping before release, or in the air
  export function stepPlayer(p: Player, intent: PlayerIntent, dt: number, field: Field, ballAtFeet: boolean): void;
  ```

**Rules:**
- The move vector `(moveX, moveZ)` is normalised when its length is over 1, so diagonals aren't faster. Acceleration and deceleration apply to the velocity vector.
- **While `isStriking`, `moveZ` is ignored:**
  - on the ground, the depth velocity decelerates to 0;
  - in the air, `vz` keeps its take-off value.
  - The kick's `aim` is read at release, as in Plan 2. For volleys it's read at the press.
- Facing still follows only the sign of `moveX`, and stays locked while charging, kicking or sliding.
- Players stay within `x ∈ [fenceL + PLAYER_R, fenceR − PLAYER_R]` and `z ∈ [PLAYER_R, depth − PLAYER_R]`. Goal boxes are solid to players: Task 6 owns that.

- [ ] **Step 1: Write the failing tests:**

```ts
it('runs in depth and diagonally at the same speed', () => { /* moveZ 1 → |vz| ≈ 95; moveX 1, moveZ 1 → hypot(vx, vz) ≈ 95 */ });
it('up/down aims instead of moving while charging', () => { /* charging with moveZ 1 for 0.5 s → z unchanged, vz 0; release with aim 'far' → kick.aim 'far' */ });
it('keeps his jump’s depth direction in the air', () => { /* jump with vz 60; mid-air moveZ −1 → vz still 60 */ });
it('starts moving smoothly when a charge ends with up held', () => { /* release with moveZ 1 → |vz| rises by at most ACCEL·dt per tick, no jump to full speed */ });
it('stays inside the pitch in depth', () => {});
```

Adapt Plan 2's tests to the new intent shape.

- [ ] **Step 2: Run `npm test`.** The new tests fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run `npm test`.** All pass.
- [ ] **Step 5: Commit** `feat: move in depth and aim while striking`

---

### Task 6: Solid players

**Files:**
- Modify: `src/game/player.ts`
- Create: `src/game/bodies.ts`
- Test: `src/game/bodies.test.ts`

**Interfaces:**
- Consumes: `PLAYER_R` (Task 5)
- Produces:
  ```ts
  export function separatePlayers(a: Player, b: Player): void;              // resolves overlap along the centre line
  export function keepOutOfGoals(p: Player, field: Field): void;           // pushes a player out of any goal box (+PLAYER_R) along the shortest way
  ```

**Rules:**
- Two grounded players overlap when the distance between their `(x, z)` points is under `2·PLAYER_R`. The overlap is removed along the centre line.
- The correction is split in proportion to each player's speed toward the other, or equally when neither is moving toward the other. A runner can't bulldoze a standing player.
- An airborne player clears a grounded one if his feet are above 20.
- Called from `stepWorld` after both players step (Task 8), then `keepOutOfGoals` for each.

- [ ] **Step 1: Write the failing tests:**

```ts
it('a runner cannot push straight through a still player', () => { /* home runs +x into away (same z) for 1 s → home.x < away.x − 2·PLAYER_R + 0.5 and away.x moved < 3 px */ });
it('a runner slightly off-line slides round', () => { /* same, away 3 px deeper → after 1 s home.x > away.x */ });
it('players never end a tick overlapping, whatever they do', () => { /* 2000 random intent ticks from random starts, including both inside the same spot: distance ≥ 2·PLAYER_R − 0.01 after separation */ });
it('nobody wedges against a fence, the boards or a goal', () => {
  /* random pairs pushed hard toward each corner and each goal box for 3 s, then both told to walk out: each moves ≥ 20 px within 1 s */
});
it('players are pushed out of the goal box', () => {});
it('kickoff placement never overlaps', () => {});
```

- [ ] **Step 2: Run `npm test`.** The new tests fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run `npm test`.** All pass.
- [ ] **Step 5: Commit** `feat: make players solid so they go around`

---

### Task 7: Ball contact in depth

**Files:**
- Modify: `src/game/zones.ts`, `src/game/contact.ts`
- Test: `src/game/zones.test.ts`, `src/game/contact.test.ts`

**Interfaces:**
- Consumes: `aimLine`, the kick functions, `PLAYER_R`
- Produces:
  ```ts
  export const REACH_Z = 7;                                               // depth tolerance for every zone
  export interface Rect { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number }
  export function ballIn(r: Rect, b: { x: number; y: number; z: number }, radius: number): boolean;
  export function touchPoint(p: Player): null | { x: number; z: number }; // 7 px ahead along (vx, vz) when running > 20 px/s
  // resolveContacts keeps Plan 2's signature: (p, opponent, ball, aimErrorDeg, rng, field) => ContactEvents
  ```

**Rules:**
- **Plan 2's zones keep their x and y extents** and gain `z ∈ p.z ± REACH_Z`.
- **The dribble touch** fires when the ball is on the ground within 5 px of `touchPoint` in `(x, z)`. It sets the ball's velocity to the player's velocity plus `touchPush` along his run direction.
- **Kicks** use `aimLine(ball, p.facing, kick.aim, field)`. Headers and volleys use `p.aim`.
- **The body is a cylinder** of `PLAYER_R`, 40 high. A ball inside it is pushed out along the `(x, z)` normal, and its normal velocity is reflected ×0.4.
  - The push never places the ball outside the walls, which fixes the Plan 2 minor: clamp it into the field.
  - It never pushes the ball onto a roof, as in Plan 2.
- **Squeeze and pin rules** carry over from Plan 2: the 50/50 pop, and the roof being out of reach of bodies.

- [ ] **Step 1: Write the failing tests:**

```ts
it('touches a ball up to REACH_Z off his line', () => { /* running +x, ball 6 px deeper and ahead → touched */ });
it('misses a ball beyond REACH_Z', () => {});
it('dribbles on a diagonal and keeps the ball', () => { /* stepWorld-free loop: player runs (1, 0.7) for 2 s with touches → ball stays within 14 px of the player */ });
it('a shot aimed far heads for the far post', () => { /* kicking, aim far, ball in reach → ball.vz > 0 and the projected arrival z within the post inset */ });
it('the body blocks a ball rolling in on a diagonal and never lets it through', () => {});
it('a body push never puts the ball outside the field', () => { /* player at the fence corner, ball squeezed into the corner → ball stays inside the walls */ });
```

Adapt the existing contact and zone tests to add `z`.

- [ ] **Step 2: Run `npm test`.** The new tests fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run `npm test`.** All pass.
- [ ] **Step 5: Commit** `feat: contact in depth with a reach tolerance`

---

### Task 8: World, match rules and kickoff in depth

**Files:**
- Modify: `src/game/world.ts`, `src/game/match.ts`
- Test: `src/game/world.test.ts`, `src/game/match.test.ts`

**Interfaces:**
- Consumes: `separatePlayers`, `keepOutOfGoals`
- Produces:
  - `placeForKickoff` puts the ball and both players at `z = depth / 2`.
  - `stepWorld` steps both players, then `separatePlayers`, then `keepOutOfGoals`, then the ball, then the contacts (alternating first mover, as in Plan 2), then the match.
  - `MatchState` keeps its shape. A golden goal now enters `phase 'goal'` with `result` already set, then `fullTime` after `GOAL_PAUSE_S`, not a kickoff. `stepMatch` returns `resetForKickoff: false` for it.

**Rules:**
- **Outside live play**, players still get `NO_INTENT`. Afterwards, set `p.held = { shoot: intent.shootHeld, chip: intent.chipHeld }`, so a button held through a goal pause or kickoff needs a fresh press. This fixes the Plan 2 minor.

- [ ] **Step 1: Write the failing tests:**

```ts
it('a golden goal gets its GOAL! moment, then full time', () => { /* golden goal, home scores → phase 'goal', result 'win'; after 2 s → 'fullTime', no kickoff */ });
it('a shot held through the kickoff needs a fresh press', () => { /* shootHeld true through the kickoff → first live tick: state 'ground', charge 0 */ });
it('kickoff puts everyone on the centre line in depth', () => {});
```

Update Plan 2's golden-goal test to expect `'goal'` and then `'fullTime'`.

- [ ] **Step 2: Run `npm test`.** The new tests fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run `npm test`.** All pass.
- [ ] **Step 5: Commit** `feat: play the match on the deep pitch`

---

### Task 9: Max in depth

**Files:**
- Modify: `src/game/ai.ts`
- Test: `src/game/ai.test.ts`

**Interfaces:**
- Produces: `think(brain, w, me, them, dt): PlayerIntent`, now with `moveZ` and a far/near/straight `aim`. Profiles are unchanged.

**Decisions:**
- **Chasing:** run to a point 8 px behind the ball along x, at the ball's predicted z.
- **Defending:** stand 20 px goal-side in x, at a z one third of the way from the ball toward his own goal's centre. Turn to face the ball when close (Plan 2 fix).
- **Going round:** when the opponent sits within 16 px ahead on his path and within 10 in z, add a sidestep in z toward the side with more room.
- **Shooting:** pick `far`, `near` or `straight` with the rng (½, ⅓ and ⅙ respectively). Charge as in Plan 2.
- **Release race fix** (Plan 2 minor): on the tick the charge timer releases, don't run a decision.

- [ ] **Step 1: Write the failing tests:**

```ts
it('chases a ball off to the side in depth', () => { /* ball at (420, z 50), Max (500, z 20) → moveX < 0 and moveZ > 0 */ });
it('defends goal-side across the pitch', () => {});
it('goes round a still Harrison between him and the ball', () => { /* Harrison idle on the line between Max and the ball → Max touches the ball within 3 s */ });
it('aims at both posts over many shots', () => {});
it('a charge release is never swallowed by a same-tick decision', () => { /* force the timer to expire on a decision tick → the next intent has shootHeld false */ });
it('a whole AI-vs-AI match on each difficulty: result, no NaN, both sides score at least once over 3 seeds, the ball never rests unreached for over 5 s, and no player stays still for over 10 s in play', () => {});
it('Max scores against an idle Harrison on every difficulty', () => {});
```

- [ ] **Step 2: Run `npm test`.** The new tests fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run `npm test`.** All pass. Also run the AI-vs-AI simulation script (scratchpad, `npx tsx`) over 40 seeds and record in the ledger:
  - score balance;
  - goals per match;
  - the longest unreached ball;
  - the longest stall.
- [ ] **Step 5: Commit** `feat: teach max to use depth`

---

### Task 10: Drawing the match in depth (needs Task 2's approval)

**Files:**
- Modify: `src/scenes/matchView.ts`, `src/scenes/art.ts`
- Create: `src/scenes/depthSort.ts`
- Test: `src/scenes/depthSort.test.ts`, `src/scenes/matchView.test.ts`

**Interfaces:**
- Consumes: `project`, `GoalArt`
- Produces:
  ```ts
  export interface Drawable { z: number; draw(g: CanvasRenderingContext2D): void }
  export function depthSorted(items: readonly Drawable[]): Drawable[];  // far (high z) first; ties keep input order
  // GameArt.goal becomes Record<'left' | 'right', { back: HTMLCanvasElement; nearPost: HTMLCanvasElement; farPost: HTMLCanvasElement; origin: { x: number; y: number } }>
  ```

**Draw order:**
1. Layers. The far sky wraps, as in Plan 2.
2. Goal backs.
3. Shadows: the ball, and both players (5×1 dark grass at `y = 0`).
4. One depth-sorted pass over both players, the ball and the four posts. Posts get `z0` and `z1`.
5. Charge bars.
6. The HUD. The stamina bar moves to the top left (x 4, y 2).
7. Popups, banners, the off-screen arrow.

`crossingDepth` (Plan 2's cosmetic step-back) and its test are removed.

- [ ] **Step 1: Write the failing tests:**

```ts
it('draws far things first and near things last', () => {});
it('a post sorts between a player behind it and a player in front', () => {});
```

- [ ] **Step 2: Run `npm test`.** The new tests fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run `npm test` and `npm run build`.** Both pass. Check in Chrome on the dev server:
  - players pass in front of and behind each other and the posts;
  - the ball's shadow tracks depth;
  - the goal reads as wide.
- [ ] **Step 5: Commit** `feat: draw the match in depth order`

---

### Task 11: Saved settings

**Files:**
- Create: `src/meta/settings.ts`
- Test: `src/meta/settings.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface Settings { version: 1; difficulty: Difficulty }
  export const SETTINGS_KEY = 'harrisons-road-to-the-cup/settings';
  export const DEFAULT_SETTINGS: Settings;                                  // { version: 1, difficulty: 'normal' }
  export interface KeyValueStore { getItem(key: string): string | null; setItem(key: string, value: string): void }
  export function loadSettings(store: KeyValueStore | null): Settings;
  export function saveSettings(store: KeyValueStore | null, s: Settings): void;  // never throws
  ```

**Rules:**
- Missing data, broken JSON or an unknown difficulty gives the defaults.
- A newer `version` than this build knows is ignored, giving the defaults, and **never overwritten** by `saveSettings`, so a future save survives a rollback.
- A throwing store (private mode) is caught.

- [ ] **Step 1: Write the failing tests:**

```ts
it('round-trips a difficulty', () => {});
it('falls back to defaults for missing or corrupt data', () => {});
it('ignores and preserves settings from a newer version', () => {});
it('survives a store that throws', () => {});
```

- [ ] **Step 2: Run `npm test`.** The new tests fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run `npm test`.** All pass.
- [ ] **Step 5: Commit** `feat: remember settings between visits`

---

### Task 12: Press Start screen and title menu

**Files:**
- Modify: `src/art/body/animations.ts` (add `juggle`), `src/scenes/titleScene.ts` (becomes the Press Start screen), `src/scenes/game.ts`
- Create: `src/scenes/context.ts`, `src/scenes/titleMenuScene.ts`
- Test: `src/scenes/titleMenuScene.test.ts`, `src/art/body/bake.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface GameContext { art: GameArt; settings: Settings; save(s: Settings): void }
  export function createPressStartScene(ctx: GameContext): Scene;
  export function createTitleMenuScene(ctx: GameContext): Scene;   // START GAME → match; OPTIONS → options (back here); HELP → help (back here); B → Press Start
  export function createMatchScene(ctx: GameContext, seed: number): MatchScene; // difficulty from ctx.settings
  ```
- Animation: `AnimName` gains `'juggle'`, with 4 frames, 8 fps, looping. The near leg lifts a keepy-uppie: knee up, foot up, down, set. The sole stays on the anchor row in frames 0 and 3.
- **Press Start screen:**
  - The Backyard with a slow camera drift.
  - Harrison juggling in view, with the ball bouncing in time with the clip.
  - Title `HARRISON'S ROAD TO THE CUP` and subtitle `FROM THE BACKYARD TO THE WORLD CUP` in the bitmap font; the layout is the builder's call, but it must fit 320 px.
  - A blinking `PRESS START`.
  - Start, A or Enter opens the title menu.
- `game.ts` builds the context from `loadSettings(localStorage)` and boots the Press Start screen. `difficultyFrom` and `?difficulty=` are removed. `?viewer` and the dev hook stay.

- [ ] **Step 1: Write the failing tests:**

```ts
it('title menu has START GAME, OPTIONS, HELP and no quit', () => {});
it('START GAME starts a match at the saved difficulty', () => { /* ctx.settings.difficulty 'hard' → match brain profile hard */ });
it('B on the title menu goes back to Press Start', () => {});
it('bakes the juggle clip with 4 frames', () => {});
```

- [ ] **Step 2: Run `npm test`.** The new tests fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run `npm test` and `npm run build`.** Both pass.
- [ ] **Step 5: Commit** `feat: add press start screen and title menu`

---

### Task 13: Help screen with button pictures

**Files:**
- Create: `src/art/glyphs.ts`, `src/scenes/helpScene.ts`
- Test: `src/art/glyphs.test.ts`, `src/scenes/helpScene.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type ButtonName = 'A' | 'B' | 'X' | 'RT' | 'START';
  export function buttonGlyph(b: ButtonName): IndexedImage;   // M ids; A green (grassLight), B red, X blue, RT/START slate; white letters
  export function createHelpScene(ctx: GameContext, back: () => Scene): Scene;
  export const HELP_PAGES: readonly { title: string; lines: readonly string[] }[]; // CONTROLS, THE MATCH, MOVES
  ```
- Navigation: left/right flips pages, with wraparound and a `1/3` indicator. B, Backspace or C returns to `back()`.
- **Copy must cover:**
  - every control, gamepad and keyboard;
  - 90 seconds, golden goal on a draw, and that the side that conceded kicks off;
  - charge and the gold sweet spot for PERFECT; up/down picking the far or near post while charging or in the air; chip vs slide on B; headers and volleys; sprint and stamina.
- All copy uses only the font's characters.

- [ ] **Step 1: Write the failing tests:**

```ts
it('help covers the controls, the match and the moves', () => { /* page titles; lines mention PERFECT, FAR POST, NEAR POST, GOLDEN GOAL */ });
it('every help line fits the screen and uses only font characters', () => { /* measureText(line) ≤ 300; every char has a glyph other than the ? fallback, except a real ? */ });
it('flips pages and returns with B', () => {});
it('glyphs are distinct and round', () => {});
```

- [ ] **Step 2: Run `npm test`.** The new tests fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run `npm test`.** All pass.
- [ ] **Step 5: Commit** `feat: add help screen`

---

### Task 14: Options and the new pause menu

**Files:**
- Create: `src/scenes/optionsScene.ts`
- Modify: `src/scenes/matchScene.ts`
- Test: `src/scenes/optionsScene.test.ts`, `src/scenes/matchScene.test.ts`

**Interfaces:**
- Produces: `createOptionsScene(ctx: GameContext, back: () => Scene): Scene`
  - One row, `DIFFICULTY  < NORMAL >`. Left and right change it, with wraparound.
  - Every change calls `ctx.save`, so it's remembered.
  - B returns to `back()`.
- **Pause menu:** `RESUME / RESTART / HELP / OPTIONS / QUIT TO TITLE`.
  - Help and Options return to the **still-paused** match.
  - A difficulty change from the pause menu applies to the current match at once: Max's brain profile and his aim error.
  - Quit to Title opens the Press Start screen.

- [ ] **Step 1: Write the failing tests:**

```ts
it('changes and saves difficulty', () => {});
it('pause menu lists RESUME, RESTART, HELP, OPTIONS, QUIT TO TITLE', () => {});
it('help from pause returns to the paused match', () => {});
it('a difficulty change from pause applies to the current match', () => {});
it('backing out of Help with B and resuming does not slide or chip', () => { /* B held from Help back through the menu and resume → home.state 'ground' */ });
it('quit to title opens the Press Start screen', () => {});
```

- [ ] **Step 2: Run `npm test`.** The new tests fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run `npm test` and `npm run build`.** Both pass.
- [ ] **Step 5: Commit** `feat: add options and grow the pause menu`

---

### Task 15: CI, playtest and handover

**Files:**
- Modify: `.github/workflows/deploy.yml` (node-version 22), `package.json` (`@types/node@^22`)

- [ ] **Step 1:** Switch CI to Node 22 LTS and `@types/node` to `^22`. Run `npm test`, `npm run typecheck` and `npm run build`.
- [ ] **Step 2: Playtest in Chrome** (dev server; keyboard driven via `javascript_tool`; `window.__soccer` to stage). Confirm:
  - Press Start → title menu → Help pages → Options (change, reload, still set) → match;
  - running in depth;
  - going round Max, and Max going round Harrison;
  - shots at both posts;
  - a post rebound;
  - a goal;
  - pause → Help/Options → resume;
  - full time → Play Again;
  - no console errors.

  Record a short GIF of Harrison going round Max and scoring at the far post, assembled from saved frames.
- [ ] **Step 3: Commit** `ci: build on node 22 lts`. Then follow the plan's finishing steps:
  - final whole-branch review;
  - merge locally to `main`;
  - **ask the parent before pushing**;
  - check the live site after deploy;
  - send the parent the GIF and what changed for Harrison's next playtest.
