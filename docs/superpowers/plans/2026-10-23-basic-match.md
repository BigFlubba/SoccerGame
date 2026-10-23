# Basic Match Implementation Plan (Plan 2 of 8)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A playable 90-second 1v1 match in the Backyard: Harrison against a computer opponent, with ball physics, all starting moves, goals, score, clock, kickoff and golden goal. It plays on a gamepad or keyboard, deploys automatically to GitHub Pages, and Harrison playtests it at the real address.

**Architecture:**
- The game simulation (ball, players, contacts, match rules, AI, camera) is pure TypeScript in `src/game/`, stepped at a fixed 60 Hz, with no DOM. That keeps every rule unit-testable.
- `src/engine/` holds the browser side: the resilient loop, the screen, input and the font.
- `src/art/` gains the new animations, the opponent, the ball and the Backyard scenery. Scenery uses indexed images whose ids point straight into the master palette.
- `src/scenes/` wires the title, match, pause and full-time screens.
- The sprite viewer from Plan 1 stays available at `?viewer`.

**Tech Stack:** Vite 8, TypeScript 7 (strict), Vitest 4, Canvas 2D, GitHub Actions + GitHub Pages. No runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-22-harrison-soccer-design.md`. Read "The game" (camera, match format, controls, physics, computer players), "Art direction" and "Technical approach → Hosting".

## Global Constraints

- **Stack:** no runtime dependencies, no game engine. Simulation code in `src/game/` must not touch the DOM.
- **Resolution:** internal 320×180, integer device-pixel scaling. The ground line is at screen y **164**; the HUD lives in the top **14** rows.
- **Field (Backyard):**
  - width **640**, fences at x **4** and **636**
  - goal lines at x **28** and **612**; net backs at x **12** and **628**
  - crossbar underside at height **28**, crossbar thickness **2**
  - Harrison (team `home`) attacks the **right** goal
- **Match rules:**
  - The clock runs **0'→90'** at one game-minute per real second. It stops during goal pauses and kickoffs.
  - Tied at 90': **golden goal** for up to **45 s**, then a draw.
  - The side that conceded kicks off.
- **Controls** (spec): left stick or D-pad moves; A jumps (heading the ball mid-jump); X shoots (tap, or hold to charge with a sweet spot; in the air it volleys); B chips when he has the ball or slide-tackles when he doesn't; RT sprints using stamina; Start pauses. Keyboard: arrows, Z, X, C, Shift, Enter/Esc. Menus: A, Enter or Z to confirm; B, Backspace or C to go back. Y/RB/LB stay unbound until later plans.
- **Feel targets** (spec): a full-power max-stat shot crosses the field in about **1 s**; a max-stat jump clears about **1.2×** his height; quick and arcade-like, not floaty.
- **Stats** (levels 1–10, all **1** in this plan): Speed, Shot Power, Jump, Control. Every physics number that depends on a stat comes from `src/game/stats.ts`.
- **Photos:** the repo is public. Photos stay in gitignored `reference/` and are never committed or deployed. Run `git status --short` before each commit.
- **Branching:** work on `feat/basic-match`. `main` is what Harrison plays once deployed. **Ask the parent before pushing to GitHub or changing repo settings** (Task 15).
- **Commits:** Conventional Commits, 50/72, no AI attribution trailers (user rule).
- **Deferred Plan 1 minors folded in here:**
  - DPR change tracking, viewport scale-0 clamp and a resilient loop: Task 1.
  - Optional-call `getGamepads`: Task 2.
  - Move `HeadSprite` to `art/body`, and fix the mirrorHalf sampling bug: Task 4.
  - Pin `@types/node@^20`: Task 1.
  - Clean the `package.json` repository URL: Task 15.

## Review Focus

1. **Tunnelling:** a full-power shot moves about 10 px per tick, more than the 6 px ball. It must never pass through the crossbar, net or fences, or skip over the goal line undetected. Tests in Task 7.
2. **Stuck ball:** a ball resting on top of the crossbar, or pinned between a player and the fence or net, must not sit there forever. Tests in Task 7 (rolls off the bar) and Task 10 (a pinned ball pops free).
3. **Awkward input timing:**
   - holding shoot through a jump or a fall
   - pausing mid-charge
   - a controller disconnecting mid-match

   None of these may leave a stuck "held" state. Tests in Task 2 (disconnect clears held) and Task 9 (charge cancels on a fall; pause releases the charge).
4. **Huge frame gaps** (alt-tab, laptop sleep, slow tab): no spiral of death, no teleporting ball. Hiding the tab pauses the match. Tests in Task 1 (dt clamp) and Task 14 (visibility pause).
5. **Scoring edge cases:**
   - a goal on the same tick the clock reaches 90'
   - a goal during the goal pause
   - an own goal
   - the golden goal timing out on the same tick as a goal

   The score and result must come out right. Tests in Task 11.

---

### Task 1: Resilient loop and screen

**Files:**
- Create: `src/engine/loop.ts`, `src/engine/screen.ts`
- Modify: `src/engine/viewport.ts` (clamp), `package.json` (`@types/node@^20`)
- Test: `src/engine/loop.test.ts`, `src/engine/viewport.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // loop.ts
  export const STEP = 1 / 60;
  export const MAX_FRAME = 0.25;            // seconds of real time simulated per frame, at most
  export interface FixedStepper { advance(dtSeconds: number): number }  // returns the number of steps run
  export function createStepper(step: (dt: number) => void): FixedStepper;
  export function startLoop(frame: (dtSeconds: number) => void, onError: (e: unknown) => void): () => void; // returns stop()
  // screen.ts
  export interface Screen { game: CanvasRenderingContext2D; present(): void }
  export function createScreen(canvas: HTMLCanvasElement): Screen;  // tracks resize + DPR changes
  ```
- `startLoop` schedules the next `requestAnimationFrame` **before** calling `frame`. It catches and reports errors via `onError` without stopping. dt is computed from consecutive rAF timestamps, clamped to `[0, MAX_FRAME]`.
- `createScreen` owns the 320×180 game canvas, re-runs `computeViewport` on `resize` and on `matchMedia('(resolution: Xdppx)')` change, and sets CSS size = backing ÷ dpr.
- `computeViewport` clamps `scale` to at least `0.01`.

- [ ] **Step 1: Write the failing tests**

```ts
it('runs whole steps and carries the remainder', () => {
  let n = 0; const s = createStepper(() => n++);
  expect(s.advance(STEP * 2.5)).toBe(2);
  expect(s.advance(STEP * 0.6)).toBe(1);      // 0.5 carried + 0.6 ≥ 1
});
it('clamps huge frame gaps so the game never spirals', () => {
  let n = 0; const s = createStepper(() => n++);
  s.advance(30);                               // laptop slept for 30 s
  expect(n).toBe(Math.floor(MAX_FRAME / STEP));
});
it('ignores negative frame times', () => {
  let n = 0; const s = createStepper(() => n++);
  expect(s.advance(-0.005)).toBe(0);
});
it('never returns scale 0 for a zero-size window', () => {
  expect(computeViewport(0, 0, 1).scale).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run `npm test`; the new tests fail.**
- [ ] **Step 3: Implement** `loop.ts`, `screen.ts` and the viewport clamp, and pin `@types/node@^20`.
- [ ] **Step 4: Run `npm test` and `npm run typecheck`; both pass.**
- [ ] **Step 5: Commit** — `feat: add resilient fixed-step loop and screen`

---

### Task 2: Input (gamepad + keyboard)

**Files:**
- Create: `src/engine/input.ts`
- Test: `src/engine/input.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Action = 'left' | 'right' | 'up' | 'down' | 'jump' | 'shoot' | 'chip' | 'sprint' | 'pause' | 'confirm' | 'back';
  export interface InputFrame {
    moveX: number; moveY: number;                 // -1..1 (deadzoned stick, D-pad or arrows; up is -1)
    held: ReadonlySet<Action>; pressed: ReadonlySet<Action>; released: ReadonlySet<Action>;
  }
  export interface PadSnapshot { buttons: readonly { pressed: boolean; value: number }[]; axes: readonly number[] }
  export const STICK_DEADZONE = 0.25;
  export const TRIGGER_THRESHOLD = 0.3;
  export function padActions(pad: PadSnapshot | null): { held: Set<Action>; moveX: number; moveY: number };
  export function keyActions(keysDown: ReadonlySet<string>): { held: Set<Action>; moveX: number; moveY: number };
  export class InputTracker { next(held: ReadonlySet<Action>, moveX: number, moveY: number): InputFrame }
  export function createInput(target: Window): { poll(): InputFrame; releaseAll(): void };
  ```

**Mapping** (Xbox standard):

| Gamepad | Action |
|---|---|
| A (0) | jump + confirm |
| B (1) | chip + back |
| X (2) | shoot |
| RT (7) | sprint, when `value > 0.3` |
| Start (9) | pause |
| D-pad (12–15) | up/down/left/right |
| Left stick (axes 0,1) | move, with deadzone |

| Keyboard (`KeyboardEvent.code`) | Action |
|---|---|
| ArrowLeft/Right/Up/Down | move |
| KeyZ | jump + confirm |
| KeyX | shoot |
| KeyC | chip + back |
| ShiftLeft / ShiftRight | sprint |
| Enter | pause + confirm |
| Escape | pause |
| Backspace | back |

Gamepad and keyboard are merged (union of held; `moveX`/`moveY` take whichever has the larger magnitude). `navigator.getGamepads?.()` is optional-called. `releaseAll()` clears held keys; call it on `blur`. A disconnected pad yields an empty held set.

- [ ] **Step 1: Write the failing tests**

```ts
it('maps the Xbox layout', () => {
  const pad = fakePad({ 0: true, 2: true }, [0, 0], { 7: 0.8 });
  expect([...padActions(pad).held].sort()).toEqual(['confirm', 'jump', 'shoot', 'sprint']);
});
it('applies the stick deadzone', () => {
  expect(padActions(fakePad({}, [0.2, -0.1])).moveX).toBe(0);
  expect(padActions(fakePad({}, [0.9, 0])).moveX).toBeCloseTo(0.9);
});
it('maps keyboard codes', () => {
  expect([...keyActions(new Set(['KeyX', 'ArrowLeft'])).held].sort()).toEqual(['left', 'shoot']);
  expect(keyActions(new Set(['ArrowLeft'])).moveX).toBe(-1);
});
it('reports pressed and released edges once', () => {
  const t = new InputTracker();
  expect(t.next(new Set(['shoot']), 0, 0).pressed.has('shoot')).toBe(true);
  expect(t.next(new Set(['shoot']), 0, 0).pressed.has('shoot')).toBe(false);
  expect(t.next(new Set(), 0, 0).released.has('shoot')).toBe(true);
});
it('a disconnected pad releases everything it held', () => {
  const t = new InputTracker();
  t.next(padActions(fakePad({ 2: true })).held, 0, 0);
  expect(t.next(padActions(null).held, 0, 0).released.has('shoot')).toBe(true);
});
```

`fakePad(buttons, axes, values)` is a test helper building a `PadSnapshot` with 17 buttons.

- [ ] **Step 2: Run `npm test`; the new tests fail.**
- [ ] **Step 3: Implement** `input.ts`.
- [ ] **Step 4: Run `npm test`; all pass.**
- [ ] **Step 5: Commit** — `feat: add merged gamepad and keyboard input`

---

### Task 3: Bitmap font

**Files:**
- Create: `src/art/font.ts`
- Test: `src/art/font.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const GLYPH_W = 4, GLYPH_H = 6, GLYPH_GAP = 1;
  export function glyph(ch: string): IndexedImage;                 // 4×6, value 1 = ink; unknown chars → '?'
  export function measureText(text: string, scale?: number): number;
  export function renderText(text: string, scale?: number): IndexedImage; // ink = 1, with a 1 px outline = 2 baked in
  ```
- Glyphs are hand-authored 4×6 grids for `A–Z 0–9 space ' - : ! ? . , / +` (uppercase only; `renderText` upper-cases).
- `renderText` output resolves through a two-entry palette at draw time (ink colour, outline colour).

- [ ] **Step 1: Write the failing tests**

```ts
it('every supported glyph is 4×6 with some ink', () => {
  for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-':!?.,/+") {
    const g = glyph(ch); expect([g.width, g.height]).toEqual([4, 6]); expect(g.data.includes(1)).toBe(true);
  }
});
it('unknown characters fall back to ?', () => {
  expect(glyph('~').data).toEqual(glyph('?').data);
});
it('measures text with gaps and scale', () => {
  expect(measureText('AB')).toBe(4 + 1 + 4);
  expect(measureText('AB', 2)).toBe(18);
});
it('renderText is lower-case insensitive and outlined', () => {
  const img = renderText('goal');
  expect(img.data).toEqual(renderText('GOAL').data);
  expect(img.data.includes(2)).toBe(true);
});
```

- [ ] **Step 2: Run `npm test`; the new tests fail.**
- [ ] **Step 3: Implement** `font.ts`, authoring the glyph grids.
- [ ] **Step 4: Run `npm test`; all pass.** Add a text row ("HARRISON 0-0 MAX 45'") to the character sheet and eyeball legibility at scale 1 and 2.
- [ ] **Step 5: Commit** — `feat: add 4x6 bitmap font`

---

### Task 4: Match animations

**Files:**
- Create: `src/art/body/head.ts` (move the `HeadSprite` type here from `harrison/head.ts`, re-exported there for compatibility)
- Modify: `src/art/body/animations.ts`, `src/art/body/bake.ts` (mirrorHalf fix), `tools/render-sheet.ts`
- Test: `src/art/body/bake.test.ts`

**Interfaces:**
- Consumes: `clipsFor`, `plantLeg`, `samplePoses`, `bakeAll`
- Produces: `AnimName` gains `'sprint' | 'chip' | 'header' | 'volley' | 'slide' | 'fall'`. Frame counts and fps:

| clip | frames | fps | loop | notes |
|---|---|---|---|---|
| sprint | 8 | 16 | yes, mirrorHalf | the run's half-cycle with torso 20, longer stride (plant ±9), arms pumping harder |
| chip | 4 | 15 | no | short scooping kick: near hip −30 → 35, ankle −20 (toes up, under the ball), torso −15 |
| header | 3 | 12 | no | airborne (hip +3): torso −20 → 15 → 25, `head.dx` +1 on the hit frame, arms out |
| volley | 4 | 15 | no | airborne (hip +3): near leg cocked (hip −20, knee 80) → strike (hip 70, knee 5) → follow-through → tuck |
| slide | 4 | 12 | no | ground (hip −12): near leg extended forward (hip 80, knee 0) and far leg tucked; frame 2 is held while sliding |
| fall | 5 | 10 | no | stumble (torso 40) → on the ground (hip −15, torso 80) → push up → kneel → stand |

- mirrorHalf fix: the last frame of the first half interpolates toward `mirrorPose(keys[0])`, and `frameCount` must be even (throw otherwise).
- `ShotPhase` frame indices used by the player controller: `SHOOT_CHARGE_FRAME = 1`, `SHOOT_STRIKE_FRAME = 2`, `SLIDE_HOLD_FRAME = 2`. Export these from `animations.ts`.

- [ ] **Step 1: Write the failing tests**

```ts
it('bakes the new clips with spec frame counts', () => {
  expect([baked.sprint, baked.chip, baked.header, baked.volley, baked.slide, baked.fall].map(c => c.frames.length))
    .toEqual([8, 4, 3, 4, 4, 5]);
});
it('mirrorHalf rejects odd frame counts', () => {
  expect(() => samplePoses({ ...CLIPS.run, frameCount: 7 })).toThrow(/even/);
});
it('mirrorHalf interpolates toward the mirrored first key', () => {
  const clip = { ...CLIPS.run, frameCount: 16 };
  const poses = samplePoses(clip);
  expect(poses[7]!.nearLeg.hip).toBeCloseTo(lerpPose(clip.keys[3]!, mirrorPose(clip.keys[0]!), 0.5).nearLeg.hip);
});
it('grounded clips keep the sole on the anchor row', () => {
  for (const clip of [baked.chip, baked.slide]) for (const f of clip.frames) {
    const b = opaqueBounds(f)!; expect(b.y + b.h - 1).toBe(54);
  }
});
```

The existing margin, colour-budget and every-kit/form tests automatically cover the new clips; keep them green.

- [ ] **Step 2: Run `npm test`; the new tests fail.**
- [ ] **Step 3: Implement** the clips, the `HeadSprite` move and the mirrorHalf fix.
- [ ] **Step 4: Run `npm test`; all pass.** Add the new clips to the sheet and tune by eye: the slide should read as a slide tackle, the chip as a scoop, the header as a lunge.
- [ ] **Step 5: Commit** — `feat: add sprint, chip, header, volley, slide and fall animations`

---

### Task 5: Opponent "Max" and new kit colours

**Files:**
- Create: `src/art/opponents/max.ts`
- Modify: `src/art/colors.ts` (add `navy #1c3c8c`, `blue #2c64c8`, `blueLight #5a8ce6`), `src/art/kits.ts` (add `blue` kit), `tools/render-sheet.ts`
- Test: `src/art/opponents/max.test.ts`, `src/art/colors.test.ts`

**Interfaces:**
- Consumes: `HeadSprite`, `parseGrid`, `ART_LEGEND`, `KITS`
- Produces:
  ```ts
  export const MAX_HEADS: Record<HeadFacing, HeadSprite>;
  export function maxLook(): LookColors;   // blue kit, white boots (BootShadow silver, Boot white, BootLight white)
  export const MAX_NAME = 'MAX';
  ```
- Max is the neighbour kid: short, messy dark-brown hair with no fade (`HairShadow → black`, `Hair → hairShadow`, `HairTip → hair`), same face budget as Harrison (`H h t k s e o`, but no earring: `e` unused). The look must differ from Harrison at a glance: dark hair, blue kit, white boots.
- `KitId` gains `'blue'`: jersey `navy/blue/blueLight`, trim `silver/white`, shorts and socks `navy/blue`.

- [ ] **Step 1: Write the failing tests**

```ts
it.each(['side', 'threeQuarter', 'front'] as const)('%s head fits the size budget and is dark-haired', facing => {
  const { image } = MAX_HEADS[facing]; const b = opaqueBounds(image)!;
  expect(b.h).toBeGreaterThanOrEqual(8); expect(b.h).toBeLessThanOrEqual(10);
  expect(new Set(image.data).has(C.Fade)).toBe(false);
});
it('Max looks different from Harrison', () => {
  expect(maxLook().Jersey).toBe('blue'); expect(maxLook().Hair).not.toBe(harrisonLook().Hair);
  expect(maxLook().Boot).toBe('white');
});
it('Max frames stay within 13 colours', () => { /* bakeAll(HARRISON_BODY, MAX_HEADS) resolved with maxLook() */ });
```

The existing "kit colours clear of the outline" test covers the blue kit automatically. Raise the `MASTER` size bound in `colors.test.ts` to ≤ 48.

- [ ] **Step 2: Run `npm test`; the new tests fail.**
- [ ] **Step 3: Implement** the colours, the kit and Max's heads and look.
- [ ] **Step 4: Run `npm test`; all pass.** Add Max's idle/run rows to the sheet and check he reads as a different kid.
- [ ] **Step 5: Commit** — `feat: add neighbour opponent max`

---

### Task 6: Backyard scenery, goal and ball sprites

**Files:**
- Create: `src/art/scenery.ts`, `src/art/venues/backyard.ts`, `src/art/ball.ts`
- Modify: `src/art/colors.ts` (`M` ids + `masterPalette()`), `tools/render-sheet.ts`
- Test: `src/art/venues/backyard.test.ts`, `src/art/ball.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // colors.ts
  export const M: Readonly<Record<MasterColor, number>>;  // 1-based ids in MASTER key order
  export function masterPalette(): ResolvedPalette;         // id → MASTER colour, 0 transparent
  // scenery.ts (drawing helpers on IndexedImage with M ids)
  export function fillRect(img: IndexedImage, x: number, y: number, w: number, h: number, id: number): void;
  // venues/backyard.ts
  export interface VenueLayers { far: IndexedImage; mid: IndexedImage; near: IndexedImage; ground: IndexedImage }
  export const PARALLAX = { far: 0.2, mid: 0.5, near: 0.8, ground: 1 } as const;
  export function backyardLayers(): VenueLayers;           // widths: far 320, mid ≥ 480, near ≥ 576, ground 640; height 180
  export function goalSprites(): { back: IndexedImage; front: IndexedImage };  // left goal; flipX for the right
  // ball.ts
  export const BALL_R = 3;
  export function ballFrames(): IndexedImage[];            // 4 rotation frames, 7×7, M ids
  ```

**Backyard** (spec): an evening sky (skyLight fading to energyGoldLight with flame near the horizon) and a low sun. Mid layer: house roofs and trees in silhouette. Near layer: a wooden plank fence along the back with a washing line and pegged clothes. Ground layer: grass with mowing stripes every 32 px from y 164 down, plus short side fences at both ends.

**Goal** (left goal; world x 12–28):
- A white crossbar at height 28–30 spanning x 12–28.
- A back post at x 12.
- A silver net mesh (diagonal pixels) filling the frame.
- `front` is just the front post at the goal line, drawn over the players.

- [ ] **Step 1: Write the failing tests**

```ts
it('builds layers at the documented widths and full height', () => {
  const L = backyardLayers();
  expect([L.far.width, L.ground.width, L.ground.height]).toEqual([320, 640, 180]);
  expect(L.mid.width).toBeGreaterThanOrEqual(480); expect(L.near.width).toBeGreaterThanOrEqual(576);
});
it('ground layer is opaque grass from the ground line down', () => {
  const g = backyardLayers().ground;
  for (const x of [0, 200, 639]) expect([M.grass, M.grassLight, M.grassDark, M.wood]).toContain(g.get(x, 170));
});
it('goal crossbar sits at height 28–30', () => {
  const { back } = goalSprites();   // sprite origin: bottom-left at world (12, 0); row = spriteHeight − 1 − height
  expect(back.get(8, back.height - 1 - 29)).toBe(M.white);
});
it('ball frames are 7×7 round sprites', () => {
  for (const f of ballFrames()) { expect([f.width, f.height]).toEqual([7, 7]); expect(f.get(0, 0)).toBe(0); expect(f.get(3, 3)).not.toBe(0); }
});
```

- [ ] **Step 2: Run `npm test`; the new tests fail.**
- [ ] **Step 3: Implement** scenery, Backyard, goal and ball.
- [ ] **Step 4: Run `npm test`; all pass.** Render a composited Backyard (layers at camera 0 and 320, goals and ball) into the sheet and check it reads as a cosy evening backyard.
- [ ] **Step 5: Commit** — `feat: add backyard scenery, goals and ball`

---

### Task 7: Field and ball physics

**Files:**
- Create: `src/game/constants.ts`, `src/game/field.ts`, `src/game/ball.ts`
- Test: `src/game/ball.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // constants.ts (starting values; tune in playtest)
  export const GRAVITY = 900, AIR_DRAG = 0.25, BALL_RESTITUTION = 0.55, WALL_RESTITUTION = 0.6, BAR_RESTITUTION = 0.7;
  export const ROLL_FRICTION = 160, SPIN_DIP = 300, SPIN_DECAY = 0.5, NET_DAMPING = 0.2, BALL_SUBSTEP_PX = 2;
  // field.ts
  export interface Goal { side: 'left' | 'right'; lineX: number; backX: number; barY: number; barThick: number }
  export interface Field { width: number; fenceL: number; fenceR: number; goals: readonly [Goal, Goal] }
  export const BACKYARD: Field;
  export function goalScored(field: Field, b: { x: number; y: number }): 'left' | 'right' | null; // whole ball past line, under bar
  // ball.ts — world: x right, y = height above ground (up)
  export interface Ball { x: number; y: number; vx: number; vy: number; spin: number; spinAngle: number }
  export interface BallEvents { bounced: boolean; hitBar: boolean; hitWall: boolean; hitNet: boolean }
  export function stepBall(ball: Ball, dt: number, field: Field): BallEvents;
  ```

**Physics:**
- **In the air:** gravity, plus `spin × SPIN_DIP` extra downward pull for topspin (spin > 0). Air drag multiplies velocity by `1 − AIR_DRAG·dt`.
- **On the ground** (y ≤ 0): `vy` reflects × `BALL_RESTITUTION`; below 30 px/s it settles to 0. Topspin adds `vx × 0.1·spin` on a bounce (skip); backspin removes it (checks up). Rolling friction is `ROLL_FRICTION`. Spin decays toward 0.
- **Walls:** fences reflect `vx` × `WALL_RESTITUTION`.
- **Crossbar:** a solid rectangle from `lineX` to `backX` at `barY..barY+barThick`, reflecting off whichever face it hits × `BAR_RESTITUTION`.
- **Net back:** a vertical wall from 0 to `barY`, reflecting × `NET_DAMPING`.
- **Swept movement:** each `stepBall` moves in substeps of at most `BALL_SUBSTEP_PX` (no tunnelling).
- **Rolling look:** `spinAngle` advances by `vx·dt / BALL_R` for the rolling animation.

- [ ] **Step 1: Write the failing tests**

```ts
it('falls and bounces lower each time', () => { /* drop from y 60: successive peak heights strictly decrease, ends at rest y=0 */ });
it('rolls to a stop on grass', () => { /* vx 200 on ground → vx 0 within 3 s, never reverses */ });
it('bounces off the fence', () => { const b = ball({ x: 630, vx: 300 }); run(b, 0.2); expect(b.vx).toBeLessThan(0); expect(b.x).toBeLessThan(636); });
it('detects a goal only when the whole ball is past the line and under the bar', () => {
  expect(goalScored(BACKYARD, { x: 612 + 3, y: 10 })).toBe('right');
  expect(goalScored(BACKYARD, { x: 612 + 2, y: 10 })).toBeNull();
  expect(goalScored(BACKYARD, { x: 620, y: 27 })).toBeNull();   // ball top above the bar underside
});
it('never tunnels through the crossbar at full power', () => {
  const b = ball({ x: 560, y: 29, vx: 700, vy: 0 }); run(b, 0.3);
  expect(b.y < 28 - 3 || b.y > 30 + 3 || b.x < 612).toBe(true);  // never inside the bar
});
it('a 700 px/s shot under the bar is caught by the net, not the fence', () => {
  const b = ball({ x: 560, y: 8, vx: 700 }); run(b, 0.5);
  expect(b.x).toBeLessThanOrEqual(628 - 3); expect(b.x).toBeGreaterThan(612);
});
it('a ball resting on top of the crossbar rolls off', () => {
  const b = ball({ x: 620, y: 30 + 3, vx: 0, vy: 0 }); run(b, 3);
  expect(b.y).toBe(0);
});
```

`ball(partial)` and `run(ball, seconds)` (fixed 1/60 steps against `BACKYARD`) are test helpers. To make "rolls off" work, the crossbar top is slightly rounded: a ball resting on the bar gets a 20 px/s nudge toward the nearer end.

- [ ] **Step 2: Run `npm test`; the new tests fail.**
- [ ] **Step 3: Implement** constants, field and ball.
- [ ] **Step 4: Run `npm test`; all pass.**
- [ ] **Step 5: Commit** — `feat: add ball physics with swept collisions`

---

### Task 8: Stats and kick maths

**Files:**
- Create: `src/game/stats.ts`, `src/game/kick.ts`, `src/engine/random.ts`
- Test: `src/game/stats.test.ts`, `src/game/kick.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // random.ts
  export type Rng = () => number;                  // [0,1)
  export function seeded(seed: number): Rng;       // mulberry32
  // stats.ts
  export interface Stats { speed: number; power: number; jump: number; control: number }  // levels 1..10
  export const BASE_STATS: Stats;                  // all 1
  export function runSpeed(s: Stats): number;      // lv1 95 → lv10 135 px/s
  export const SPRINT_MULTIPLIER = 1.45;
  export function jumpVelocity(s: Stats): number;  // apex lv1 32 px → lv10 48 px (v = √(2·GRAVITY·h))
  export function maxShotSpeed(s: Stats): number;  // lv1 430 → lv10 640 px/s
  export function chargeTime(s: Stats): number;    // seconds to full charge: lv1 0.9 → lv10 0.6
  export function touchPush(s: Stats): number;     // dribble push ahead: lv1 60 → lv10 25 px/s
  // kick.ts
  export type Aim = 'up' | 'level' | 'down';
  export const SWEET_SPOT: readonly [number, number] = [0.82, 0.94];
  export const TAP_CHARGE = 0.35, PERFECT_BONUS = 1.15, OVERCHARGE_MAX_ERROR_DEG = 12;
  export const HUMAN_AIM_ERROR_DEG = 4;           // Harrison's error on non-perfect shots
  export interface KickResult { vx: number; vy: number; spin: number; perfect: boolean }
  export function shot(stats: Stats, charge: number, overchargeS: number, aim: Aim, facing: 1 | -1, aimErrorDeg: number, rng: Rng): KickResult;
  export function chip(stats: Stats, charge: number, facing: 1 | -1): KickResult;     // 55°, backspin −0.8
  export function volley(stats: Stats, aim: Aim, facing: 1 | -1): KickResult;          // charge 0.75, no error
  export function header(stats: Stats, aim: Aim, facing: 1 | -1, incomingSpeed: number): KickResult;
  ```

**Rules:**
- Stat curves are linear from level 1 to level 10 (clamp the level to 1..10).
- **Shot speed** is `lerp(180, maxShotSpeed, charge)`. Inside `SWEET_SPOT` it is `× PERFECT_BONUS` with no error, and `perfect` is true.
- **Shot angles:** up 28°, level 12°, down 3°. The error is `aimErrorDeg` plus overcharge error (0 → `OVERCHARGE_MAX_ERROR_DEG` over 1 s past full), applied as `(rng()·2 − 1)·error`.
- **Spin:** level and down drives get topspin `+0.6`.
- **Header:** speed `max(0.6·incoming, 200)`; angles up 35°, level 10°, down −20°.
- **Volley:** angles up 20°, level 5°, down −10°.

- [ ] **Step 1: Write the failing tests**

```ts
it('stat curves hit their level 1 and 10 targets', () => {
  expect(runSpeed(BASE_STATS)).toBe(95); expect(runSpeed({ ...BASE_STATS, speed: 10 })).toBe(135);
  expect(maxShotSpeed({ ...BASE_STATS, power: 10 })).toBe(640);
});
it('a max-stat jump clears about 1.2× his height', () => {
  const v = jumpVelocity({ ...BASE_STATS, jump: 10 }); expect((v * v) / (2 * GRAVITY)).toBeCloseTo(48, 0);
});
it('a full-power max-stat shot crosses the field in about a second', () => {
  const k = shot({ ...BASE_STATS, power: 10 }, 1, 0, 'level', 1, 0, seeded(1)); expect(640 / k.vx).toBeGreaterThan(0.85); expect(640 / k.vx).toBeLessThan(1.25);
});
it('the sweet spot is perfect: faster and exact', () => {
  const a = shot(BASE_STATS, 0.88, 0, 'level', 1, 6, seeded(2)); const b = shot(BASE_STATS, 0.88, 0, 'level', 1, 6, seeded(99));
  expect(a.perfect).toBe(true); expect(a).toEqual(b);
});
it('overcharging makes shots wilder', () => {
  const spread = (over: number) => { const r = seeded(3); const ys = Array.from({ length: 50 }, () => shot(BASE_STATS, 1, over, 'level', 1, 0, r).vy); return Math.max(...ys) - Math.min(...ys); };
  expect(spread(1)).toBeGreaterThan(spread(0) + 50);
});
it('facing left mirrors vx', () => { expect(chip(BASE_STATS, 1, -1).vx).toBeLessThan(0); });
it('chips rise steeply with backspin', () => { const c = chip(BASE_STATS, 1, 1); expect(c.vy / c.vx).toBeGreaterThan(1.3); expect(c.spin).toBeLessThan(0); });
```

- [ ] **Step 2: Run `npm test`; the new tests fail.**
- [ ] **Step 3: Implement** random, stats and kick.
- [ ] **Step 4: Run `npm test`; all pass.**
- [ ] **Step 5: Commit** — `feat: add stat curves and kick maths`

---

### Task 9: Player controller

**Files:**
- Create: `src/game/player.ts`, `src/game/zones.ts`
- Test: `src/game/player.test.ts`, `src/game/zones.test.ts`

**Interfaces:**
- Consumes: `Stats`, stat curves, `Aim`, `GRAVITY`, `AnimName`, the frame constants from Task 4
- Produces:
  ```ts
  // jump is a one-tick pulse (pressed this tick); shootHeld/chipHeld are held states whose release fires the kick
  export interface PlayerIntent { moveX: number; aim: Aim; jump: boolean; shootHeld: boolean; chipHeld: boolean; sprint: boolean }
  export const NO_INTENT: PlayerIntent;
  export type PlayerState = 'ground' | 'air' | 'charging' | 'kicking' | 'chipping' | 'sliding' | 'fallen';
  export interface Player {
    team: 'home' | 'away'; stats: Stats; x: number; y: number; vx: number; vy: number; facing: 1 | -1;
    state: PlayerState; stateT: number; charge: number; overchargeS: number; stamina: number; exhausted: boolean;
    kick: null | { kind: 'shot' | 'chip' | 'volley' | 'header' | 'slide'; charge: number; overchargeS: number; aim: Aim; active: boolean };
    anim: { name: AnimName; frame: number };
  }
  export const PLAYER_W = 8, PLAYER_H = 40;
  export function createPlayer(team: 'home' | 'away', stats: Stats, x: number, facing: 1 | -1): Player;
  export function stepPlayer(p: Player, intent: PlayerIntent, dt: number, field: Field, ballAtFeet: boolean): void;
  // zones.ts — facing-relative hit areas in world units (see the zone table in Task 10)
  export interface Rect { x0: number; x1: number; y0: number; y1: number }
  export function footZone(p: Player): Rect; export function headZone(p: Player): Rect; export function touchZone(p: Player): Rect;
  export function slideZone(p: Player): Rect; export function bodyBox(p: Player): Rect;
  export function ballIn(r: Rect, b: { x: number; y: number }, radius: number): boolean; // circle–rect overlap
  export function knockDown(p: Player): void;     // → 'fallen' for FALL_TIME, cancels any charge or kick
  export function separatePlayers(a: Player, b: Player): void;
  ```

**State machine:**

| State | Behaviour |
|---|---|
| ground | Accelerates toward `moveX × speed` (×`SPRINT_MULTIPLIER` while sprinting and not exhausted). Accel 900, decel 1200 px/s². |
| air | Entered on jump with `jumpVelocity`; gravity applies. `shootHeld` pressed in the air → volley (`kick.kind 'volley'`, active for 0.15 s). |
| charging | `shootHeld` on the ground. Moves at 50 % speed. `charge` rises over `chargeTime`; past 1, `overchargeS` accumulates. Releasing → `kicking` with a shot (charge < 0.1 is a tap and uses `TAP_CHARGE`). |
| kicking / chipping | The kick is `active` (can connect) for the strike window (`SHOOT_STRIKE_FRAME` time ± 0.05 s), then returns to ground. |
| chipping | B pressed on the ground with `ballAtFeet`: charges like a shot; release → chip maths. |
| sliding | B pressed without `ballAtFeet`: speed burst 190 px/s decaying over 0.45 s, low hitbox; cooldown 0.8 s. |
| fallen | `FALL_TIME = 0.9` s; plays the `fall` clip; no control. |

- Facing follows `moveX` sign, except while charging, kicking or sliding.
- **Stamina** drains 0.5/s while sprinting and moving and regenerates 0.3/s. At empty he is `exhausted` until stamina is back to 0.25.
- `aim` is read when the kick is released.
- `anim` is chosen from the state:
  - idle / run / sprint on the ground
  - jump frame by `vy` in the air
  - shoot: charge frame held while charging, then strike frames
  - chip, slide (hold frame), volley, header, fall
- `separatePlayers` pushes overlapping grounded players apart equally.

- [ ] **Step 1: Write the failing tests**

```ts
it('accelerates to run speed and sprints faster', () => { /* 1 s of moveX 1 → vx ≈ 95; with sprint ≈ 95×1.45 */ });
it('jumps to the stat apex and lands', () => { /* peak y ≈ 32 ± 1, back on ground state */ });
it('charges while held and fires a shot on release', () => { /* hold 0.5 s → charge ≈ 0.5/0.9; release → state kicking, kick.kind shot */ });
it('a quick tap uses the tap charge', () => { /* hold 1 tick → kick.charge === TAP_CHARGE */ });
it('falling cancels a charge (no stuck shot)', () => { /* charging → knockDown → state fallen, charge 0, kick null; later shootHeld false → no kick */ });
it('releasing shoot while paused-equivalent (intent cleared) fires once, never twice', () => { /* NO_INTENT after charging → exactly one kick */ });
it('stamina drains while sprinting and exhaustion blocks sprint until 0.25', () => {});
it('facing is locked while charging', () => {});
it('separatePlayers removes overlap between grounded players', () => {});
it('B with the ball at his feet starts a chip; without it starts a slide', () => {});
it('zones mirror with facing', () => { /* footZone of a left-facing player at x=100 spans 86..98 */ });
```

- [ ] **Step 2: Run `npm test`; the new tests fail.**
- [ ] **Step 3: Implement** `player.ts`.
- [ ] **Step 4: Run `npm test`; all pass.**
- [ ] **Step 5: Commit** — `feat: add player controller state machine`

---

### Task 10: Ball–player contact

**Files:**
- Create: `src/game/contact.ts`
- Test: `src/game/contact.test.ts`

**Interfaces:**
- Consumes: `Player`, `Ball`, `kick.ts`, `Rng`, `zones.ts` (the table below gives the numbers `zones.ts` implements in Task 9)
- Produces:
  ```ts
  export interface ContactEvents { touched: boolean; kicked: null | 'shot' | 'chip' | 'volley' | 'header'; perfect: boolean; tackledBall: boolean; trippedOpponent: boolean }
  export function resolveContacts(p: Player, opponent: Player, ball: Ball, aimErrorDeg: number, rng: Rng): ContactEvents;
  ```

**Zones** (facing-relative, world units):

| Zone | x | height | Effect |
|---|---|---|---|
| foot | +2..+14 | 0..12 relative to `p.y` | active ground kicks and chips |
| volley | the foot zone | while airborne | volleys |
| head | −4..+10 | `p.y`+30..`p.y`+44 | headers while airborne; the ball must be moving toward him or slower than 300 px/s |
| touch (dribble) | +4..+10 | ball on the ground | while moving at > 20 px/s and not kicking: ball `vx = p.vx + facing·touchPush`; cooldown 0.12 s |
| body | the `PLAYER_W × PLAYER_H` box | — | blocks the ball: reflects `vx` × 0.4 so it never passes through him |
| slide | +0..+16 | 0..8 | ball → `vx = facing·220, vy = 80`; or the opponent's feet (on the ground) → `knockDown(opponent)` |

**Pinned ball:** if the ball overlaps a body box while also touching a fence or net back, it pops up (`vy = 160`) so it can't stay wedged.

- [ ] **Step 1: Write the failing tests**

```ts
it('an active shot in reach kicks the ball with shot maths', () => { /* ball.vx === shot(stats, charge, 0, aim, facing, err, sameSeed).vx; kicked === 'shot' */ });
it('a whiffed kick (ball out of reach) does nothing', () => { /* ball 30 px away: velocity unchanged, kicked null */ });
it('running into the ball dribbles it ahead with the control stat push', () => { /* p.vx 95 → ball.vx === 95 + touchPush(BASE_STATS) (60) */ });
it('a still player blocks a rolling ball instead of letting it pass through', () => { /* after 1 s the ball is still on its original side */ });
it('an airborne player heads a dropping ball, aimed by the stick', () => { /* aim up → ball.vy > 0 and kicked === 'header' */ });
it('a slide tackle knocks the ball away', () => { /* ball.vx === 220·facing, vy === 80 */ });
it('a slide tackle that misses the ball trips the opponent', () => { /* opponent.state === 'fallen' */ });
it('a ball pinned between a player and the fence pops free', () => { /* ball.vy === 160 */ });
it('each kick connects once per swing', () => { /* two ticks in reach during one active window → one kicked event */ });
```

- [ ] **Step 2: Run `npm test`; the new tests fail.**
- [ ] **Step 3: Implement** `contact.ts`.
- [ ] **Step 4: Run `npm test`; all pass.**
- [ ] **Step 5: Commit** — `feat: add dribbling, kicks, headers and tackles`

---

### Task 11: Match rules and world step

**Files:**
- Create: `src/game/match.ts`, `src/game/world.ts`
- Test: `src/game/match.test.ts`, `src/game/world.test.ts`

**Interfaces:**
- Consumes: everything in `src/game/`
- Produces:
  ```ts
  // match.ts
  export const FULL_TIME_MIN = 90, GOLDEN_GOAL_MAX_S = 45, GOAL_PAUSE_S = 2, KICKOFF_S = 1;
  export type Phase = 'kickoff' | 'playing' | 'goal' | 'fullTime';
  export interface MatchState { phase: Phase; phaseT: number; clockS: number; goldenGoal: boolean; goldenS: number;
    score: { home: number; away: number }; lastScorer: 'home' | 'away' | null; kickoffTeam: 'home' | 'away';
    result: null | 'win' | 'lose' | 'draw' }
  export function createMatch(): MatchState;
  export function stepMatch(m: MatchState, dt: number, goal: 'left' | 'right' | null): { resetForKickoff: boolean };
  export function clockMinute(m: MatchState): number;    // 0..90, then 90 during golden goal
  // world.ts
  export interface World { field: Field; ball: Ball; home: Player; away: Player; match: MatchState; rng: Rng; events: WorldEvents }
  export interface WorldEvents { kicks: ContactEvents[]; ball: BallEvents; goal: 'home' | 'away' | null }
  export function createWorld(homeStats: Stats, awayStats: Stats, seed: number, aimErrorDeg: { home: number; away: number }): World;
  export function stepWorld(w: World, homeIntent: PlayerIntent, awayIntent: PlayerIntent, dt: number): void; // computes ballAtFeet per player via zones
  export function placeForKickoff(w: World): void;
  ```

**Rules:**
- A ball in the **right** goal scores for `home`; the **left** goal scores for `away`.
- Goals only count in phase `playing`.
- After a goal: phase `goal` for `GOAL_PAUSE_S`, then `kickoff` for `KICKOFF_S` with the conceding team's `kickoffTeam`, then `playing`.
- The clock advances only in `playing`.
- At 90' (`clockS ≥ 90`):
  - if not tied → `fullTime` with a result;
  - if tied → `goldenGoal = true`, and play continues up to `GOLDEN_GOAL_MAX_S`. The first goal ends it; a timeout is a `draw`.
- A goal on the exact tick the clock reaches 90' counts first, then the full-time check runs with the new score.
- Inputs are ignored during `kickoff`, `goal` and `fullTime` (`stepWorld` substitutes `NO_INTENT`).

**Kickoff placement:**
- The ball sits at (320, 0).
- The kicking-off player stands at 320 − 12·attackDir, facing the goal he attacks.
- The other player stands 70 px inside his own half.

- [ ] **Step 1: Write the failing tests**

```ts
it('runs 90 game minutes in 90 playing seconds and stops for goals', () => { /* 91 s of playing ticks at 0-1 → fullTime, result 'lose'; clock frozen during 'goal' */ });
it('a ball in the right goal scores for home; in the left for away (own goals included)', () => {});
it('the conceding team kicks off after the goal pause', () => { /* away concedes → kickoffTeam 'away'; phase goal → kickoff after 2 s → playing after 1 s */ });
it('goals during the goal pause are ignored', () => { /* score unchanged */ });
it('a goal on the tick the clock hits 90 counts before full time is decided', () => { /* 0-0, home scores on that tick → result 'win', not golden goal */ });
it('tied at 90 goes to golden goal; the first goal wins', () => {});
it('golden goal times out to a draw at 45 s', () => { /* result 'draw', clockMinute stays 90 */ });
it('a golden goal on the timeout tick still wins', () => {});
it('stepWorld ignores intents outside play and places players for kickoff', () => { /* during kickoff a moveX 1 intent leaves home.x unchanged; ball at (320,0) */ });
```

- [ ] **Step 2: Run `npm test`; the new tests fail.**
- [ ] **Step 3: Implement** `match.ts` and `world.ts`.
- [ ] **Step 4: Run `npm test`; all pass.**
- [ ] **Step 5: Commit** — `feat: add match rules, clock and golden goal`

---

### Task 12: Opponent AI

**Files:**
- Create: `src/game/ai.ts`
- Test: `src/game/ai.test.ts`

**Interfaces:**
- Consumes: `World`, `Player`, `PlayerIntent`, `Rng`
- Produces:
  ```ts
  export type Difficulty = 'easy' | 'normal' | 'hard';
  export interface AiProfile { reactionS: number; aimErrorDeg: number; aggression: number; shootRange: number }
  export const DIFFICULTY: Record<Difficulty, AiProfile>;  // easy {0.32,10,0.3,150} normal {0.18,6,0.55,180} hard {0.1,3,0.8,210}
  export interface AiBrain { profile: AiProfile; nextDecisionS: number; intent: PlayerIntent; plan: 'chase' | 'dribble' | 'charge' | 'defend' | 'jump' }
  export function createBrain(profile: AiProfile): AiBrain;
  export function think(brain: AiBrain, w: World, me: Player, them: Player, dt: number): PlayerIntent;
  ```

**Decisions** (re-evaluated every `reactionS`; the intent is held between decisions):
- **Has the ball** (ball within 16 px ahead of it, on the ground): dribble toward the goal it attacks. Within `shootRange` of the goal line: `charge` for 0.25–0.8 s (rng), then release with aim `level` or `up` (rng).
- **Ball loose:** run to the ball's predicted landing x, offset 8 px on the far side so it pushes toward its attacking goal. If the ball is above 30 px and within 30 px horizontally, jump (`plan 'jump'`).
- **Opponent has the ball** (ball within 16 px of `them`): `defend`, staying between the ball and its own goal 20 px goal-side. If within 26 px and the rng is below `aggression`, slide (B) with its own 1.2 s cooldown.
- Sprints when the ball is more than 120 px away and stamina is above 0.4.
- `jump` is emitted for exactly one tick per decision; held intents never re-trigger it.

- [ ] **Step 1: Write the failing tests**

```ts
it('chases a loose ball', () => { /* ball at x 400, AI at 500 → moveX < 0 */ });
it('dribbles toward the goal it attacks when it has the ball', () => { /* away attacks left goal → moveX < 0 */ });
it('charges and shoots inside shooting range', () => { /* 150 px from goal line: shootHeld true, later false (release) */ });
it('defends goal-side when Harrison has the ball', () => { /* AI moves to ball.x + 20 toward its own (right) goal */ });
it('slide-tackles when close and aggressive, then waits out its cooldown', () => { /* aggression 1: chipHeld pulse; no second slide within 1.2 s */ });
it('only changes its mind every reactionS', () => { /* world changes mid-interval → intent unchanged until reactionS elapses */ });
it('jumps for a high ball overhead', () => { /* ball at height 40 within 30 px → jump true for one tick */ });
it('a whole simulated match between two AIs finishes with a result and no exceptions', () => {
  /* seeded world, both sides AI (normal), stepWorld at 1/60 until fullTime: result !== null, total goals < 40, no NaN positions */
});
```

- [ ] **Step 2: Run `npm test`; the new tests fail.**
- [ ] **Step 3: Implement** `ai.ts`.
- [ ] **Step 4: Run `npm test`; all pass.**
- [ ] **Step 5: Commit** — `feat: add opponent ai with difficulty profiles`

---

### Task 13: Camera and match rendering

**Files:**
- Create: `src/game/camera.ts`, `src/engine/sprites.ts`, `src/scenes/art.ts`, `src/scenes/matchView.ts`
- Test: `src/game/camera.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // camera.ts
  export interface Camera { x: number }
  export const VIEW_W = 320, CAMERA_LOOKAHEAD_S = 0.25, CAMERA_SMOOTHING = 6;
  export function updateCamera(cam: Camera, ball: Ball, dt: number, fieldWidth: number): void; // smooth follow + lookahead, clamped [0, width − 320]
  export function offscreenArrow(ball: Ball, cam: Camera): null | { x: number };               // ball above screen top → arrow x on screen
  // sprites.ts (browser)
  export class SpriteCache { constructor(); frames(key: string, make: () => { frames: IndexedImage[]; palette: ResolvedPalette }): { right: HTMLCanvasElement[]; left: HTMLCanvasElement[] } }
  // art.ts (browser) — everything baked and resolved once at boot
  export interface SpriteSet { right: Record<AnimName, HTMLCanvasElement[]>; left: Record<AnimName, HTMLCanvasElement[]> }
  export interface GameArt {
    layers: Record<keyof VenueLayers, HTMLCanvasElement>; goal: { back: HTMLCanvasElement; front: HTMLCanvasElement; backFlipped: HTMLCanvasElement; frontFlipped: HTMLCanvasElement };
    ball: HTMLCanvasElement[]; home: SpriteSet; away: SpriteSet; portrait: HTMLCanvasElement;
    text(s: string, scale: number, ink: MasterColor, outline: MasterColor): HTMLCanvasElement;   // cached
  }
  export function loadGameArt(): GameArt;
  // matchView.ts (browser)
  export function drawMatch(g: CanvasRenderingContext2D, w: World, cam: Camera, art: GameArt, nowS: number): void;
  ```

**Draw order:**
1. The far, mid and near layers with `PARALLAX` (x offset = `−cam.x × factor`).
2. The ground.
3. Goal backs.
4. Away player, then home player (Harrison on top).
5. The ball (rotation frame from `spinAngle`), with a 1-px shadow on the grass under an airborne ball.
6. Goal fronts.
7. The charge bar above a charging player: 12×2, with a gold sweet-spot band and a red flash when overcharged.
8. The HUD:
   - top centre: `HARRISON 0-0 MAX`, with the clock below (`45'`, or `90+12` in golden goal)
   - bottom left: a stamina bar
9. A `PERFECT` popup above the kicker for 0.6 s after a perfect shot (from `WorldEvents.kicks`; the match scene keeps the timer).
10. Banners: `KICK OFF`, `GOAL!`, `GOLDEN GOAL`, `FULL TIME`. These are font scale 2, white with an outline, centred.
11. The off-screen arrow.

World → screen: `sx = x − cam.x`, `sy = 164 − y`. Sprites are drawn at the anchor.

- [ ] **Step 1: Write the failing tests**

```ts
it('centres on the ball with lookahead in its direction of travel', () => { /* settled: cam.x ≈ ball.x + vx·0.25 − 160 */ });
it('clamps at both ends of the field', () => { /* ball x 10 → cam.x 0; ball x 630 → cam.x 320 */ });
it('moves smoothly, not instantly', () => { /* one 1/60 step toward a far target moves < 25 % of the gap */ });
it('shows an arrow only when the ball is above the screen', () => { /* ball height > 164 → arrow at ball.x − cam.x; else null */ });
```

- [ ] **Step 2: Run `npm test`; the new tests fail.**
- [ ] **Step 3: Implement** camera, sprite cache and the match view.
- [ ] **Step 4: Run `npm test`; all pass.** The view is checked visually in Task 14.
- [ ] **Step 5: Commit** — `feat: add camera and match rendering`

---

### Task 14: Scenes and game flow

**Files:**
- Create: `src/scenes/scene.ts`, `src/scenes/titleScene.ts`, `src/scenes/matchScene.ts`, `src/scenes/menu.ts`
- Modify: `src/main.ts` (game by default, sprite viewer at `?viewer`), `index.html` (no HUD div; the viewer creates its own)
- Test: `src/scenes/menu.test.ts`, `src/scenes/matchScene.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface Scene { update(input: InputFrame, dt: number): Scene | null; draw(g: CanvasRenderingContext2D, nowS: number): void; onHidden?(): void }
  export interface MenuState { items: readonly string[]; index: number }
  export function stepMenu(m: MenuState, input: InputFrame): { m: MenuState; chosen: string | null; back: boolean };
  export function createTitleScene(art: GameArt): Scene;
  export function createMatchScene(art: GameArt, difficulty: Difficulty, seed: number): Scene;
  ```

**Flow:**
- **Title:** the portrait, `HARRISON'S ROAD TO THE CUP`, and a blinking `PRESS START`. Start, A, Enter or Z → match.
- **Match:** Start, Enter or Esc → pause menu `RESUME / RESTART / QUIT`.
- **Full time:** `YOU WIN!`, `YOU LOSE` or `DRAW` with the score, then a menu `PLAY AGAIN / TITLE`.
- **Hidden tab:** `document.visibilitychange` to hidden → the match opens the pause menu (`onHidden`).
- **Releasing the charge:** pausing calls `input.releaseAll()` semantics on the match intents, so a held charge is released, not fired (the plan's "pause releases the charge").
- **Difficulty:** `normal` by default, overridable with `?difficulty=easy|hard` for playtesting.

- [ ] **Step 1: Write the failing tests**

```ts
it('menu moves with up/down, wraps, and confirms', () => { /* index 0, up → last; confirm → chosen item */ });
it('match scene pauses when the tab hides and does not advance the clock while paused', () => {});
it('pausing mid-charge cancels the charge instead of shooting', () => { /* charging → pause → resume with shoot released → no kick, charge 0 */ });
it('restart from the pause menu returns a fresh 0-0 match', () => {});
```

The match scene's `draw` is not called in these tests; `update` must not need the DOM.

- [ ] **Step 2: Run `npm test`; the new tests fail.**
- [ ] **Step 3: Implement** the scenes and flow; wire up `main.ts` with `startLoop`, `createScreen`, `createInput` and `createStepper`.
- [ ] **Step 4: Run `npm test` and `npm run build`; both pass.**
- [ ] **Step 5: Playtest it in Chrome yourself** (dev server, simulated keyboard input via the extension). Confirm:
  - title → match → goal → kickoff → full time → play again;
  - the pause menu works;
  - the charge bar and PERFECT sweet spot show;
  - chips, headers and slides happen;
  - the AI plays back;
  - the console has no errors.
  Record a short GIF of a goal for the parent.
- [ ] **Step 6: Commit** — `feat: add title, match, pause and full-time flow`

---

### Task 15: Deploy to GitHub Pages and hand over

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `package.json` (`repository.url` → `git+https://github.com/DialmasterOrg/SoccerGame.git`)

**The workflow:**
- Triggers on push to `main` and on `workflow_dispatch`.
- Permissions: `contents: read`, `pages: write`, `id-token: write`.
- Concurrency group: `pages`.
- **Job `build`:** `actions/checkout`, `actions/setup-node` (node 20, npm cache), `npm ci`, `npm test`, `npm run build`, then `actions/upload-pages-artifact` with `path: dist`.
- **Job `deploy`:** needs `build`; environment `github-pages`; runs `actions/deploy-pages`.
- Use the current major versions of each action.

- [ ] **Step 1:** Write the workflow. Check it locally for syntax (`npx --yes yaml-lint` is not allowed, since there are no new deps; instead re-read it carefully against the GitHub docs).
- [ ] **Step 2:** Run `npm test` and `npm run build` one last time. Run `git status --short` and `git ls-files | rg -i '\.(jpe?g|heic|webp|png)$'` and confirm no image is tracked.
- [ ] **Step 3:** Merge `feat/basic-match` into `main` locally (fast-forward).
- [ ] **Step 4: Ask the parent** for go-ahead on two outward-facing actions:
  1. push `main` to `DialmasterOrg/SoccerGame` (public);
  2. set the Pages source to GitHub Actions (`gh api -X POST repos/DialmasterOrg/SoccerGame/pages -f build_type=workflow`, or the repo settings page).
- [ ] **Step 5:** After approval: push, enable Pages, and watch the run with `gh run watch`. Confirm `https://dialmasterorg.github.io/SoccerGame/` loads and plays in Chrome with no console errors.
- [ ] **Step 6:** Hand over to the parent: the URL, controls on a card (gamepad and keyboard), and what to watch for in Harrison's first playtest: is it fun, too hard or too easy, does the shooting feel good. His feedback shapes Plan 3.
