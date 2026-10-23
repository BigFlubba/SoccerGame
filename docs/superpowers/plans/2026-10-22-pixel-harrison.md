# Pixel Harrison Implementation Plan (Plan 1 of 8)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the project and produce Harrison as 8-bit pixel art: a 64×64 portrait in four expressions, his head in three facings, a pose-skeleton body, and baked idle/run/jump/shoot animations in his home and away kits. Also lay the groundwork for the Dragon Ball Z-style power forms: a power-up stance animation, spiky lifted "power" hair, and golden/ultra hair colours. Output is a character sheet PNG and an in-browser animated viewer for the parent to approve. Auras and particle effects come in Plans 3 and 7.

**Architecture:** All art code is DOM-free TypeScript working on `IndexedImage`, a pixel buffer of *logical colour* ids (skin, hair, jersey…). A `LookColors` map resolves logical colours to a fixed master palette, so kit swaps are palette swaps. Heads and the portrait are hand-authored character grids. The body is a 2D skeleton (`Pose` → `Joints`) drawn as pixel limbs with clothing regions and an automatic outline. Node tools encode PNGs (via `node:zlib`, no dependencies) so the art can be reviewed without a browser. A small viewer page shows the animations live.

**Tech Stack:** Vite, TypeScript (strict), Vitest, tsx (for Node tools), Canvas 2D. No runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-22-harrison-soccer-design.md` (read "Art direction" → "Harrison" before starting)

## Global Constraints

- Vite + TypeScript strict, plain Canvas 2D, no game engine, no runtime dependencies.
- Internal resolution 320×180, scaled by the largest whole number that fits, letterboxed, smoothing off.
- Master palette of about 40 colours, including energy colours for auras and power moves. In-game sprites use **about 12 colours**; tests cap each frame at **13 distinct resolved colours**. The 64×64 portrait may use **up to 20** (designer's call: a shaded face needs more).
- In-game Harrison: standing height about 40 px, standing width ≤ 24 px, head about 1/6 of his height, realistic proportions (not chibi).
- Sprite frame is **49×56** with the anchor (centre of the feet, on the sole row) at **(24, 53)**. That leaves room for a full-extension kick, raised arms and spiky power hair plus the outline. The width is odd so a horizontal flip keeps the anchor column.
- Portrait 64×64, expressions: neutral, celebrate (shouting), determined, disappointed.
- Default kit = **home**: red jersey with white stripes over the shoulders and down the sleeves, red shorts with white side stripes, red socks. **Away**: the same in black. Boots: neon volt-yellow. No real logos, sponsor text or crest.
- Harrison's look (from the spec): light-brown hair with golden-blond ends, long swept fringe to the eyebrows, high taper fade on the sides and back; fair peachy skin with pink cheeks; light blue-grey eyes; silver stud earrings; tall and lean.
- **The repo is public.** Photos (`*.jpg`) are gitignored and must never be committed or deployed. Run `git status --short` before every commit and confirm no image other than generated PNGs under ignored paths appears. No surname anywhere.
- Work on branch `feat/pixel-harrison`. Do not merge to `main` without the parent's go-ahead (`main` becomes the live site in Plan 2).
- Commit messages: Conventional Commits, 50/72, **no AI attribution trailers** (user rule).
- Node 20.19 is installed. If the latest Vite/Vitest majors require newer Node, pin the newest majors that support 20.19.

## Review Focus

1. **Small or odd windows** (smaller than 320×180, ultrawide, tall): the game must stay visible and letterboxed and never get scale 0. Test in Task 10.
2. **Fractional `devicePixelRatio`** (Windows laptops at 125%/150%): scale must be an integer in *device* pixels so every game pixel is the same size. Test in Task 10.
3. **Facing left:** a mirrored frame must keep the feet on the same anchor column (no 1 px jump when he turns). Tests in Task 1 (flip of odd-width image) and Task 8 (anchor-centred frames).
4. **Extreme poses** (kick follow-through, jump tuck, power hair) pushing limbs or outline off the 49×56 frame and getting silently clipped. Test in Task 8: every baked frame keeps a 1 px transparent margin.
5. **Kit or power-form swaps** leaving a logical colour unresolved (holes or black patches in the away kit or golden hair). Test in Task 8: every logical colour used by any frame resolves to an opaque colour in every kit × form combination.

---

### Task 1: Project scaffold and IndexedImage

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html` (placeholder body, replaced in Task 10), `src/main.ts` (empty export, replaced in Task 10)
- Modify: `.gitignore` (add `preview/`)
- Create: `src/art/indexedImage.ts`
- Test: `src/art/indexedImage.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export class IndexedImage {
    constructor(width: number, height: number, data?: Uint8Array);
    readonly width: number; readonly height: number; readonly data: Uint8Array;
    get(x: number, y: number): number;            // 0 when out of bounds
    set(x: number, y: number, c: number): void;   // no-op when out of bounds
    clone(): IndexedImage;
  }
  export function parseGrid(rows: readonly string[], legend: Readonly<Record<string, number>>): IndexedImage; // '.' is always 0
  export function blit(dst: IndexedImage, src: IndexedImage, dx: number, dy: number): void; // skips 0 pixels
  export function flipX(img: IndexedImage): IndexedImage; // x → width-1-x
  ```

- [ ] **Step 1: Scaffold the project**

`git checkout -b feat/pixel-harrison`. `npm init -y`, then `npm install -D vite typescript vitest tsx @types/node`. Scripts: `"dev": "vite"`, `"build": "tsc --noEmit && vite build"`, `"typecheck": "tsc --noEmit"`, `"test": "vitest run"`, `"sheet": "tsx tools/render-sheet.ts"`. Set `"type": "module"`. `tsconfig.json`: `strict`, `target`/`lib` ES2022 + DOM, `module` ESNext, `moduleResolution` bundler, `types: ["node", "vite/client"]`, `include: ["src", "tools"]`, `noEmit`. `vite.config.ts`: `base: '/SoccerGame/'`, `test.include: ['src/**/*.test.ts', 'tools/**/*.test.ts']`.

- [ ] **Step 2: Write the failing tests**

```ts
describe('parseGrid', () => {
  const legend = { a: 3, b: 7 };
  it('maps legend chars and treats . as transparent', () => {
    const img = parseGrid(['a.', '.b'], legend);
    expect([img.width, img.height]).toEqual([2, 2]);
    expect([img.get(0, 0), img.get(1, 0), img.get(1, 1)]).toEqual([3, 0, 7]);
  });
  it('throws on ragged rows, naming the row', () => {
    expect(() => parseGrid(['aa', 'a'], legend)).toThrow(/row 1/);
  });
  it('throws on unknown characters, naming char and row', () => {
    expect(() => parseGrid(['ax'], legend)).toThrow(/'x'.*row 0/);
  });
});
describe('IndexedImage', () => {
  it('returns 0 and ignores writes out of bounds', () => {
    const img = new IndexedImage(2, 2);
    img.set(5, 5, 9);
    expect(img.get(-1, 0)).toBe(0);
    expect(img.get(5, 5)).toBe(0);
  });
});
describe('blit', () => {
  it('copies non-zero pixels at an offset and keeps dst where src is 0', () => {
    const dst = parseGrid(['bbb', 'bbb'], { b: 7 });
    blit(dst, parseGrid(['a.'], { a: 3 }), 1, 1);
    expect([dst.get(1, 1), dst.get(2, 1), dst.get(0, 0)]).toEqual([3, 7, 7]);
  });
});
describe('flipX', () => {
  it('mirrors an odd-width image around its centre column', () => {
    const f = flipX(parseGrid(['a.b.c'], { a: 1, b: 2, c: 3 }));
    expect([f.get(0, 0), f.get(2, 0), f.get(4, 0)]).toEqual([3, 2, 1]);
  });
});
```

- [ ] **Step 3: Run `npm test` and confirm the tests fail** (module not found).

- [ ] **Step 4: Implement `src/art/indexedImage.ts`** to the interface above. `data` is row-major, `y * width + x`.

- [ ] **Step 5: Run `npm test` and `npm run typecheck`; both pass.**

- [ ] **Step 6: Commit** (`git status --short` first: no `.jpg` listed) — `feat: scaffold project with indexed pixel images`

---

### Task 2: Colours, master palette and kits

**Files:**
- Create: `src/art/colors.ts`, `src/art/kits.ts`
- Test: `src/art/colors.test.ts`

**Interfaces:**
- Consumes: `IndexedImage` (Task 1)
- Produces:
  ```ts
  // colors.ts
  export const C = { None: 0, Outline: 1, SkinShadow: 2, Skin: 3, SkinLight: 4, Blush: 5, Lip: 6,
    EyeWhite: 7, Iris: 8, Pupil: 9, HairShadow: 10, Hair: 11, HairLight: 12, HairTip: 13, Fade: 14,
    Earring: 15, JerseyShadow: 16, Jersey: 17, JerseyLight: 18, TrimShadow: 19, Trim: 20,
    ShortsShadow: 21, Shorts: 22, SocksShadow: 23, Socks: 24, BootShadow: 25, Boot: 26, BootLight: 27 } as const;
  export type Slot = Exclude<keyof typeof C, 'None'>;
  export const MASTER: Readonly<Record<MasterColor, string>>;  // name → '#rrggbb'
  export type MasterColor = /* union of MASTER keys */;
  export type LookColors = Record<Slot, MasterColor>;
  export type RGBA = readonly [number, number, number, number];
  export type ResolvedPalette = readonly RGBA[];               // indexed by logical colour id; [0] = transparent
  export function resolvePalette(look: LookColors): ResolvedPalette;
  export function toRGBA(img: IndexedImage, palette: ResolvedPalette): Uint8ClampedArray;
  export const ART_LEGEND: Readonly<Record<string, number>>;   // grid chars → C ids, used by every hand-authored grid
  // kits.ts
  export type KitSlots = 'JerseyShadow'|'Jersey'|'JerseyLight'|'TrimShadow'|'Trim'|'ShortsShadow'|'Shorts'|'SocksShadow'|'Socks';
  export type KitId = 'home' | 'away';
  export const KITS: Record<KitId, Record<KitSlots, MasterColor>>;
  export const VOLT_BOOTS: Record<'BootShadow'|'Boot'|'BootLight', MasterColor>;
  ```

`ART_LEGEND` chars: `o` Outline, `s` SkinShadow, `k` Skin, `l` SkinLight, `b` Blush, `m` Lip, `w` EyeWhite, `i` Iris, `p` Pupil, `H` HairShadow, `h` Hair, `L` HairLight, `t` HairTip, `f` Fade, `e` Earring, `J` JerseyShadow, `j` Jersey, `q` JerseyLight, `R` TrimShadow, `r` Trim.

Starting master palette (the builder may tune hex values; keep about 32 entries and these names): `outline #1a1423`, `ink #2b3040`, `white #f4f4f4`, `silver #c8ccd4`, `gray #7c7c88`, `black #24242c`, `charcoal #3a3a46`, `skinShadow #c27c62`, `skin #e8a888`, `skinLight #f2c4a4`, `blush #e0857a`, `lip #c96a6a`, `iris #7e98a8`, `hairShadow #5c3a22`, `hair #8a5a32`, `hairLight #b9884e`, `hairTip #e0bc78`, `fade #a88a72`, `redDark #7a1820`, `red #c0242c`, `redLight #e2464a`, `voltShadow #8fa818`, `volt #c8e030`, `voltLight #eef68a`, `grassDark #2f6b2a`, `grass #3f8a36`, `grassLight #5aa84a`, `sky #6ab4e8`, `skyLight #a8d8f0`, `wood #6b4a2e`, `gold #f0c040`, `goldDark #b07818`, and these energy colours: `auraWhite #fff8d8`, `energyGold #ffd84a`, `energyGoldLight #fff2a0`, `electric #58c8ff`, `electricLight #c8f0ff`, `flame #ff8c1a`, `flameDark #d0401a`, `violet #9058e0`.

Home kit: jersey `redDark/red/redLight`, trim `silver/white`, shorts `redDark/red`, socks `redDark/red`. Away kit: jersey `black/charcoal/gray`, trim `silver/white`, shorts `black/charcoal`, socks `black/charcoal`. Boots: `voltShadow/volt/voltLight`.

- [ ] **Step 1: Write the failing tests**

```ts
const fullLook = (): LookColors => /* every Slot → 'white' except Jersey → 'red' */;
it('resolves logical ids to RGBA with index 0 transparent', () => {
  const pal = resolvePalette(fullLook());
  expect(pal[C.None]).toEqual([0, 0, 0, 0]);
  expect(pal[C.Jersey]).toEqual([0xc0, 0x24, 0x2c, 255]);
});
it('converts an IndexedImage to RGBA bytes', () => {
  const img = new IndexedImage(2, 1); img.set(1, 0, C.Jersey);
  expect(Array.from(toRGBA(img, resolvePalette(fullLook())))).toEqual([0, 0, 0, 0, 0xc0, 0x24, 0x2c, 255]);
});
it('every MASTER colour is a valid #rrggbb', () => {
  for (const hex of Object.values(MASTER)) expect(hex).toMatch(/^#[0-9a-f]{6}$/);
});
it('both kits define every kit slot', () => {
  for (const kit of Object.values(KITS)) expect(Object.keys(kit).sort()).toEqual([...KIT_SLOT_NAMES].sort());
});
it('ART_LEGEND does not use the reserved transparent char', () => {
  expect('.' in ART_LEGEND).toBe(false);
});
```

- [ ] **Step 2: Run `npm test`; the new tests fail.**
- [ ] **Step 3: Implement `colors.ts` and `kits.ts`.** Export `KIT_SLOT_NAMES` (a readonly array of `KitSlots`) from `kits.ts` for the test.
- [ ] **Step 4: Run `npm test` and `npm run typecheck`; both pass.**
- [ ] **Step 5: Commit** — `feat: add logical colours, master palette and kits`

---

### Task 3: Raster primitives

**Files:**
- Create: `src/art/raster.ts`
- Test: `src/art/raster.test.ts`

**Interfaces:**
- Consumes: `IndexedImage`, `C`
- Produces:
  ```ts
  export interface Point { x: number; y: number }
  export function drawSegment(img: IndexedImage, a: Point, b: Point, width: number, color: (t: number) => number): void;
  export function fillPolygon(img: IndexedImage, pts: readonly Point[], color: number): void;
  export function addOutline(img: IndexedImage, outline: number): void;
  export function opaqueBounds(img: IndexedImage): { x: number; y: number; w: number; h: number } | null;
  ```
`drawSegment`: round `a` and `b`, walk Bresenham from a to b, and at each step stamp a `width×width` square brush. The brush covers `x - floor((width-1)/2)` to `x + ceil((width-1)/2)`. Colour each stamp with `color(t)`, where `t` is the step index divided by the step count (0 at a, 1 at b; 0 for a single point). `fillPolygon`: even-odd scanline fill, sampling pixel centres. `addOutline`: every transparent pixel with a 4-neighbour that is opaque and not `outline` becomes `outline` (one pass over a snapshot).

- [ ] **Step 1: Write the failing tests**

```ts
it('drawSegment colours both endpoints and passes t from 0 to 1', () => {
  const img = new IndexedImage(10, 10);
  drawSegment(img, { x: 1, y: 1 }, { x: 1, y: 8 }, 1, t => (t < 0.5 ? 3 : 7));
  expect([img.get(1, 1), img.get(1, 8)]).toEqual([3, 7]);
});
it('drawSegment width 3 covers three columns on a vertical line', () => {
  const img = new IndexedImage(10, 10);
  drawSegment(img, { x: 5, y: 2 }, { x: 5, y: 6 }, 3, () => 1);
  expect([img.get(3, 4), img.get(4, 4), img.get(5, 4), img.get(6, 4), img.get(7, 4)]).toEqual([0, 1, 1, 1, 0]);
});
it('fillPolygon fills a 4×4 square exactly', () => {
  const img = new IndexedImage(8, 8);
  fillPolygon(img, [{ x: 2, y: 2 }, { x: 6, y: 2 }, { x: 6, y: 6 }, { x: 2, y: 6 }], 5);
  expect(img.data.filter(v => v === 5).length).toBe(16);
});
it('addOutline rings a single pixel with 4 outline pixels', () => {
  const img = new IndexedImage(5, 5); img.set(2, 2, 3);
  addOutline(img, 1);
  expect([img.get(2, 1), img.get(1, 2), img.get(3, 2), img.get(2, 3), img.get(1, 1)]).toEqual([1, 1, 1, 1, 0]);
});
it('opaqueBounds returns null for an empty image and the tight box otherwise', () => {
  const img = new IndexedImage(6, 6);
  expect(opaqueBounds(img)).toBeNull();
  img.set(1, 2, 3); img.set(4, 3, 3);
  expect(opaqueBounds(img)).toEqual({ x: 1, y: 2, w: 4, h: 2 });
});
```

- [ ] **Step 2: Run `npm test`; the new tests fail.**
- [ ] **Step 3: Implement `raster.ts`.**
- [ ] **Step 4: Run `npm test`; all tests pass.**
- [ ] **Step 5: Commit** — `feat: add pixel raster primitives`

---

### Task 4: PNG encoder and character sheet tool

**Files:**
- Create: `tools/png.ts`, `tools/sheet.ts`, `tools/render-sheet.ts`
- Test: `tools/png.test.ts`, `tools/sheet.test.ts`

**Interfaces:**
- Consumes: `MASTER` (for the swatch row)
- Produces:
  ```ts
  // png.ts
  export function encodePNG(width: number, height: number, rgba: Uint8Array | Uint8ClampedArray): Uint8Array;
  // sheet.ts
  export interface SheetItem { width: number; height: number; rgba: Uint8Array | Uint8ClampedArray }
  export interface SheetOptions { scale: number; gap: number; background: readonly [number, number, number] }
  export function composeSheet(rows: readonly SheetItem[][], opts: SheetOptions): { width: number; height: number; rgba: Uint8ClampedArray };
  ```
`encodePNG`: 8-bit RGBA (colour type 6), filter byte 0 on every scanline, IDAT via `zlib.deflateSync`, CRC-32 implemented with a lookup table (Node 20 has no `zlib.crc32`). `composeSheet`: rows stacked top to bottom, items left to right, `gap` game pixels between items and rows and around the edge, everything nearest-neighbour scaled by `scale`, transparent pixels showing `background`. `render-sheet.ts` builds the rows, composes at scale 4 with gap 4 and background `[200, 204, 212]`, and writes `preview/character-sheet.png` (creating `preview/`). For now it writes one row: a 6×6 swatch per `MASTER` colour. Later tasks add rows.

- [ ] **Step 1: Write the failing tests**

```ts
it('encodePNG writes the PNG signature and IHDR size', () => {
  const png = encodePNG(3, 2, new Uint8Array(3 * 2 * 4));
  expect(Array.from(png.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(png.buffer, png.byteOffset);
  expect([view.getUint32(16), view.getUint32(20)]).toEqual([3, 2]);
});
it('encodePNG IDAT inflates to filter-0 scanlines of the input', () => {
  const rgba = Uint8Array.from({ length: 2 * 2 * 4 }, (_, i) => i);
  const raw = inflateSync(extractIdat(encodePNG(2, 2, rgba)));   // test helper walks chunks
  expect(Array.from(raw)).toEqual([0, ...rgba.slice(0, 8), 0, ...rgba.slice(8)]);
});
it('composeSheet sizes the canvas from rows, gap and scale', () => {
  const item = { width: 2, height: 3, rgba: new Uint8Array(24) };
  const sheet = composeSheet([[item, item], [item]], { scale: 2, gap: 1, background: [9, 9, 9] });
  expect([sheet.width, sheet.height]).toEqual([(1 + 2 + 1 + 2 + 1) * 2, (1 + 3 + 1 + 3 + 1) * 2]);
  expect(Array.from(sheet.rgba.slice(0, 4))).toEqual([9, 9, 9, 255]);
});
```

- [ ] **Step 2: Run `npm test`; the new tests fail.**
- [ ] **Step 3: Implement `png.ts`, `sheet.ts` and `render-sheet.ts`.**
- [ ] **Step 4: Run `npm test`, then `npm run sheet`.** Open `preview/character-sheet.png` (Read tool) and confirm one row of 32 colour swatches.
- [ ] **Step 5: Commit** (confirm `preview/` is not staged) — `feat: add png encoder and character sheet tool`

---

### Task 5: Pose skeleton

**Files:**
- Create: `src/art/body/proportions.ts`, `src/art/body/pose.ts`
- Test: `src/art/body/pose.test.ts`

**Interfaces:**
- Consumes: `Point` (Task 3)
- Produces:
  ```ts
  // proportions.ts
  export interface BodyProportions { thigh: number; shin: number; foot: number; ankleHeight: number; torso: number;
    upperArm: number; forearm: number; thighWidth: number; shinWidth: number; upperArmWidth: number;
    forearmWidth: number; torsoWidth: number }
  export const HARRISON_BODY: BodyProportions = { thigh: 9, shin: 9, foot: 4, ankleHeight: 1, torso: 12,
    upperArm: 7, forearm: 6, thighWidth: 4, shinWidth: 3, upperArmWidth: 3, forearmWidth: 2, torsoWidth: 6 };
  export const standingHipHeight = (b: BodyProportions): number => b.thigh + b.shin + b.ankleHeight;
  // pose.ts
  export const FRAME_W = 49, FRAME_H = 56;
  export const ANCHOR: Point = { x: 24, y: 53 };
  export type HeadFacing = 'side' | 'threeQuarter' | 'front';
  export interface ArmPose { shoulder: number; elbow: number }
  export interface LegPose { hip: number; knee: number; ankle: number }
  export interface Pose { x: number; hipHeight: number; torso: number;
    head: { facing: HeadFacing; dx: number; dy: number };
    nearArm: ArmPose; farArm: ArmPose; nearLeg: LegPose; farLeg: LegPose }
  export interface LimbJoints { elbow: Point; hand: Point }
  export interface LegJoints { knee: Point; ankle: Point; toe: Point }
  export interface Joints { hip: Point; neck: Point; shoulder: Point;
    nearArm: LimbJoints; farArm: LimbJoints; nearLeg: LegJoints; farLeg: LegJoints }
  export function solvePose(pose: Pose, body: BodyProportions): Joints;
  export function lerpPose(a: Pose, b: Pose, t: number): Pose;
  export function mirrorPose(p: Pose): Pose;
  export function standingPose(body: BodyProportions): Pose;   // all angles 0, facing 'side'
  ```

The figure faces **right** (+x). Screen y points down. All angles are in degrees. A direction "down, rotated forward by θ" is `(sin θ, cos θ)`.

- **hip** = `(ANCHOR.x + pose.x, ANCHOR.y − pose.hipHeight)`.
- **torso**: 0 is upright, positive leans forward. `up = (sin τ, −cos τ)`; neck = hip + torso·up; shoulder = hip + (torso − 1)·up.
- **Arms**, relative to the torso: upper-arm angle `a = τ + shoulder`, elbow = shoulder + upperArm·(sin a, cos a). Forearm angle `a + elbow` (positive bends forward and up), hand = elbow + forearm·(…).
- **Legs**, absolute from vertical: thigh angle `h = hip`, knee = hip + thigh·(sin h, cos h). Shin angle `h − knee` (positive bends the shin backward), ankle = knee + shin·(…). Foot: toe = ankle + foot·(cos φ, sin φ) with `φ = ankle` (0 points the toes forward horizontally, positive points them down).
- **Joints** stay unrounded. Rounding happens when drawing.
- **lerpPose** lerps every number. It takes `head.facing` from `a` when `t < 0.5`, otherwise from `b`.
- **mirrorPose** swaps near/far arms and legs.

- [ ] **Step 1: Write the failing tests**

```ts
const B = HARRISON_BODY;
it('standing pose puts ankles at ankle height and toes forward', () => {
  const j = solvePose(standingPose(B), B);
  expect(j.hip).toEqual({ x: 24, y: 53 - 19 });
  expect(j.nearLeg.ankle.y).toBeCloseTo(52);
  expect(j.nearLeg.toe.x).toBeCloseTo(28);
  expect(j.neck.y).toBeCloseTo(34 - 12);
});
it('arms hang straight down when standing', () => {
  const j = solvePose(standingPose(B), B);
  expect(j.nearArm.hand.y).toBeCloseTo(j.shoulder.y + 13);
  expect(j.nearArm.hand.x).toBeCloseTo(j.shoulder.x);
});
it('hip 90 puts the knee directly in front of the hip', () => {
  const p = standingPose(B); p.nearLeg.hip = 90;
  const k = solvePose(p, B).nearLeg.knee;
  expect([k.x, k.y]).toEqual([expect.closeTo(33), expect.closeTo(34)]);
});
it('knee 90 with hip 0 points the shin backward', () => {
  const p = standingPose(B); p.nearLeg.knee = 90;
  const j = solvePose(p, B).nearLeg;
  expect(j.ankle.x).toBeCloseTo(j.knee.x - 9);
});
it('positive torso leans the neck forward', () => {
  const p = standingPose(B); p.torso = 30;
  expect(solvePose(p, B).neck.x).toBeGreaterThan(20);
});
it('lerpPose halfway averages numbers; mirrorPose swaps sides', () => {
  const a = standingPose(B), b = standingPose(B); b.nearLeg.hip = 40; b.hipHeight = 17;
  const m = lerpPose(a, b, 0.5);
  expect([m.nearLeg.hip, m.hipHeight]).toEqual([20, 18]);
  expect(mirrorPose(b).farLeg.hip).toBe(40);
});
```

- [ ] **Step 2: Run `npm test`; the new tests fail.**
- [ ] **Step 3: Implement `proportions.ts` and `pose.ts`.**
- [ ] **Step 4: Run `npm test`; all tests pass.**
- [ ] **Step 5: Commit** — `feat: add 2d pose skeleton`

---

### Task 6: Harrison's head (three facings) and look

**Files:**
- Create: `src/art/harrison/head.ts`, `src/art/harrison/look.ts`
- Modify: `tools/render-sheet.ts` (add a heads row)
- Test: `src/art/harrison/head.test.ts`

**Interfaces:**
- Consumes: `parseGrid`, `ART_LEGEND`, `C`, `LookColors`, `KITS`, `VOLT_BOOTS`, `HeadFacing`
- Produces:
  ```ts
  export interface HeadSprite { image: IndexedImage; neck: Point }   // neck = head-image pixel placed on Joints.neck
  export const HARRISON_HEADS: Record<HeadFacing, HeadSprite>;
  export const HARRISON_POWER_HEADS: Record<HeadFacing, HeadSprite>; // spiky, lifted hair for powered-up forms
  export type PowerForm = 'base' | 'golden' | 'storm' | 'ultra';
  export function harrisonLook(kit?: KitId, form?: PowerForm): LookColors; // defaults 'home', 'base'
  ```

`harrisonLook` maps skin slots to `skinShadow/skin/skinLight`, `Blush → blush`, `Lip → lip`, `EyeWhite → white`, `Iris → iris`, `Pupil → ink`, hair slots to `hairShadow/hair/hairLight/hairTip`, `Fade → fade`, `Earring → white`, `Outline → outline`, then the kit's slots and `VOLT_BOOTS`. The power form only changes the four hair slots:

| Form | HairShadow, Hair, HairLight, HairTip |
|---|---|
| base | `hairShadow`, `hair`, `hairLight`, `hairTip` |
| golden, storm | `goldDark`, `energyGold`, `energyGoldLight`, `auraWhite` |
| ultra | `gray`, `electric`, `electricLight`, `auraWhite` |

Head grids are hand-authored with `ART_LEGEND` chars and no outline (the figure gets one later), facing right. They follow the spec's description of his hair and face:

- **side** (about 10 wide × 9–10 tall, crown to chin about 8 px):
  - Hair is a forward-sweeping wedge: the fringe (`h`/`L`, with `t` tips at the front edge) overhangs the forehead and reaches the eyebrow line.
  - Below and behind the hair line the side and back are faded (`f`, with `s` at the nape).
  - The ear sits mid-back with an `e` pixel at the lobe.
  - One `o` eye pixel under the fringe, a one-pixel nose bump, and the jaw in `k`/`s`.
- **threeQuarter**: same features turned toward the viewer, with the far side of the fringe shorter.
- **front** (about 9 wide):
  - The fringe covers the forehead to the brows, swept slightly to one side.
  - Faded sides above both ears, with an `e` stud on each lobe.
  - Two `o` eye pixels and an `s` mouth line.
- **Colour budget:** in-game heads use only `H h t` (hair), `f`, `k s` (skin), `e` and `o`, so every frame stays within the 13-colour cap. Iris, lips and blush are for the portrait.

- **Power heads** (all three facings): the same face, with the hair swept up and back into 3–5 sharp spikes in the anime power-up style. They may be up to 3 px taller than the normal heads, with the fringe lifted off the brow and the fade covered. The neck point stays in the same place relative to the face as on the normal heads, so the face doesn't jump when he powers up.

Use `harrison_profile.jpg` and `harrison_front.jpg` (local only, never committed) as reference while authoring.

- [ ] **Step 1: Write the failing tests**

```ts
it.each(['side', 'threeQuarter', 'front'] as const)('%s head fits the size budget', facing => {
  const { image, neck } = HARRISON_HEADS[facing];
  const b = opaqueBounds(image)!;
  expect(b.h).toBeGreaterThanOrEqual(8); expect(b.h).toBeLessThanOrEqual(10);
  expect(b.w).toBeLessThanOrEqual(11);
  expect(neck.x).toBeGreaterThanOrEqual(0); expect(neck.x).toBeLessThan(image.width);
  expect(neck.y).toBeLessThanOrEqual(image.height);
});
it.each(['side', 'threeQuarter', 'front'] as const)('%s head uses hair, fade, skin and earring colours', facing => {
  const used = new Set(HARRISON_HEADS[facing].image.data);
  for (const c of [C.Hair, C.Fade, C.Skin, C.Earring]) expect(used.has(c)).toBe(true);
});
it('harrisonLook defaults to the home kit and swaps to away', () => {
  expect(harrisonLook().Jersey).toBe('red');
  expect(harrisonLook('away').Jersey).toBe('charcoal');
  expect(harrisonLook().Boot).toBe('volt');
});
it('power forms recolour only the hair', () => {
  const base = harrisonLook('home'), gold = harrisonLook('home', 'golden');
  expect(gold.Hair).toBe('energyGold');
  expect(harrisonLook('home', 'ultra').Hair).toBe('electric');
  const changed = (Object.keys(base) as Slot[]).filter(s => base[s] !== gold[s]).sort();
  expect(changed).toEqual(['Hair', 'HairLight', 'HairShadow', 'HairTip']);
});
it.each(['side', 'threeQuarter', 'front'] as const)('%s power head is spikier but keeps the face aligned', facing => {
  const n = HARRISON_HEADS[facing], p = HARRISON_POWER_HEADS[facing];
  const nb = opaqueBounds(n.image)!, pb = opaqueBounds(p.image)!;
  expect(pb.h).toBeGreaterThan(nb.h); expect(pb.h).toBeLessThanOrEqual(nb.h + 3);
  const eye = (h: HeadSprite) => { const i = h.image.data.indexOf(C.Outline); return { x: i % h.image.width - h.neck.x, y: Math.floor(i / h.image.width) - h.neck.y }; };
  expect(eye(p)).toEqual(eye(n));   // first eye pixel sits at the same offset from the neck
});
```

- [ ] **Step 2: Run `npm test`; the new tests fail.**
- [ ] **Step 3: Implement `look.ts` and author the head grids (normal and power) in `head.ts`.**
- [ ] **Step 4: Run `npm test`; all tests pass.**
- [ ] **Step 5: Add a heads row to the sheet and check it.** The row shows the normal heads in base form, then the power heads in golden and ultra form. Each head is outlined with `addOutline` on a clone and resolved with `harrisonLook(kit, form)`. Run `npm run sheet` and view the PNG next to the reference photos. Check that the wedge fringe, fade, ear stud and eye line read as him, and that the power heads read as unmistakably "powered up". Revise the grids until they do.
- [ ] **Step 6: Commit** — `feat: add harrison head sprites and look`

---

### Task 7: Figure renderer

**Files:**
- Create: `src/art/body/drawFigure.ts`
- Modify: `tools/render-sheet.ts` (add a standing-figure row, both kits)
- Test: `src/art/body/drawFigure.test.ts`

**Interfaces:**
- Consumes: `Pose`, `Joints`, `solvePose`, `BodyProportions`, `FRAME_W`, `FRAME_H`, `HeadSprite`, `drawSegment`, `fillPolygon`, `addOutline`, `blit`, `C`
- Produces:
  ```ts
  export function drawFigure(pose: Pose, body: BodyProportions, heads: Record<HeadFacing, HeadSprite>): IndexedImage; // FRAME_W×FRAME_H, outlined
  ```

Draw order (back to front): far arm, far leg, torso, near leg, head, near arm. Then `addOutline(img, C.Outline)`. Far limbs use the shadow slot of each region; near limbs use the base slot. Each region is coloured by `t` along its segment:

| Segment | Width | Colour by t |
|---|---|---|
| thigh (hip→knee) | `thighWidth` | `t < 0.6` Shorts, else Skin. The near thigh's shorts part gets a 1 px `Trim` line along its axis (side stripe) |
| shin (knee→ankle) | `shinWidth` | first 2 px Skin, then Socks |
| foot (ankle→toe) | 2 | Boot; the bottom row of the foot is BootShadow |
| upper arm | `upperArmWidth` | `t < 0.5` Jersey with 1 px `Trim` along its top edge (sleeve stripe), else Skin |
| forearm | `forearmWidth` | Skin, plus a 2×2 Skin hand at `hand` |
| torso | `torsoWidth` (polygon hip→shoulder) | Jersey with JerseyShadow on the back edge; top 1 px across the shoulder `Trim`; bottom 3 px Shorts (waistband) |

Head: blit `heads[pose.head.facing]` so its `neck` pixel lands on the rounded `Joints.neck`, offset by `pose.head.dx/dy`. All joint coordinates are rounded before drawing. These are starting rules; tune them on the sheet.

- [ ] **Step 1: Write the failing tests**

```ts
const fig = () => drawFigure(standingPose(HARRISON_BODY), HARRISON_BODY, HARRISON_HEADS);
it('returns a 49×56 frame with a 1 px transparent margin', () => {
  const img = fig(); const b = opaqueBounds(img)!;
  expect([img.width, img.height]).toEqual([49, 56]);
  expect(b.x).toBeGreaterThanOrEqual(1); expect(b.y).toBeGreaterThanOrEqual(1);
  expect(b.x + b.w).toBeLessThanOrEqual(48); expect(b.y + b.h).toBeLessThanOrEqual(55);
});
it('standing figure is about 40 px tall (plus outline) and at most 24 px wide', () => {
  const b = opaqueBounds(fig())!;
  expect(b.h).toBeGreaterThanOrEqual(38); expect(b.h).toBeLessThanOrEqual(44);
  expect(b.w).toBeLessThanOrEqual(24);
});
it('puts the boot sole on the anchor row', () => {
  const b = opaqueBounds(fig())!;
  expect(b.y + b.h - 1).toBe(53 + 1);   // sole on row 53, outline below it
});
it('paints boots at the toes, socks on the shin and jersey on the torso', () => {
  const p = standingPose(HARRISON_BODY); p.nearArm.shoulder = p.farArm.shoulder = 90;   // arms forward, torso unobstructed
  const img = drawFigure(p, HARRISON_BODY, HARRISON_HEADS); const j = solvePose(p, HARRISON_BODY);
  expect(img.get(Math.round(j.nearLeg.toe.x) - 1, Math.round(j.nearLeg.toe.y))).toBe(C.Boot);
  expect(img.get(24, Math.round(j.nearLeg.ankle.y) - 3)).toBe(C.Socks);
  expect(img.get(24, Math.round((j.hip.y + j.neck.y) / 2))).toBe(C.Jersey);
});
it('outlines the figure', () => {
  expect(fig().data.includes(C.Outline)).toBe(true);
});
```

- [ ] **Step 2: Run `npm test`; the new tests fail.**
- [ ] **Step 3: Implement `drawFigure.ts`.**
- [ ] **Step 4: Run `npm test`; all tests pass.**
- [ ] **Step 5: Add the standing-figure row (home and away) to the sheet, run `npm run sheet` and check it.** Look for a lean build, a readable red kit with white stripes, volt boots and a clean outline. Adjust the region rules or `HARRISON_BODY` as needed and keep the tests green.
- [ ] **Step 6: Commit** — `feat: render posed figures with kit regions`

---

### Task 8: Animations and baking

**Files:**
- Create: `src/art/body/animations.ts`, `src/art/body/bake.ts`
- Modify: `tools/render-sheet.ts` (one row per clip, home then away)
- Test: `src/art/body/bake.test.ts`

**Interfaces:**
- Consumes: `Pose`, `lerpPose`, `mirrorPose`, `standingPose`, `standingHipHeight`, `drawFigure`, `HARRISON_HEADS`, `HARRISON_POWER_HEADS`, `HARRISON_BODY`, `harrisonLook`, `resolvePalette`, `opaqueBounds`
- Produces:
  ```ts
  export type AnimName = 'idle' | 'run' | 'jump' | 'shoot' | 'powerUp';
  export interface AnimationClip { name: AnimName; keys: readonly Pose[]; frameCount: number; fps: number; loop: boolean; mirrorHalf?: boolean }
  export const CLIPS: Record<AnimName, AnimationClip>;
  export interface BakedClip { name: AnimName; frames: IndexedImage[]; fps: number; loop: boolean }
  export function bakeClip(clip: AnimationClip, body: BodyProportions, heads: Record<HeadFacing, HeadSprite>): BakedClip;
  export function bakeAll(body: BodyProportions, heads: Record<HeadFacing, HeadSprite>): Record<AnimName, BakedClip>;
  export function frameIndexAt(clip: Pick<BakedClip, 'frames' | 'fps' | 'loop'>, timeMs: number): number;
  ```

**Sampling.**
- With `mirrorHalf`, the keys describe half a cycle. Frames `0…n/2−1` sample the keys and frames `n/2…n−1` are `mirrorPose` of the same samples.
- Otherwise, with `k` keys and `n` frames, frame `i` sits at position `u = i·k/n` when looping (wrapping last→first) or `u = i·(k−1)/(n−1)` when not. The pose there is `lerpPose(keys[⌊u⌋], keys[⌈u⌉ mod k], u − ⌊u⌋)`.
- When `k === n` this returns the keys exactly.

**frameIndexAt:** `⌊timeMs·fps/1000⌋`. Loop clips take it modulo the frame count; non-loop clips clamp it to the last frame.

**Clips** (frame counts and fps are fixed; the angles are starting points to tune on the sheet):
- **idle:** 4 keys, 4 frames, 6 fps, loop. A relaxed stance: arms slightly forward (`shoulder 5, elbow 10`), knees soft (`knee 3`). Keys 1–2 drop `hipHeight` by 1 and add 2° of torso (breathing).
- **run:** 4 keys, 8 frames, 12 fps, loop, `mirrorHalf`. Starting keys, with torso 12 throughout:

  | key | hipHeight | nearLeg (hip, knee, ankle) | farLeg | nearArm (shoulder, elbow) | farArm |
  |---|---|---|---|---|---|
  | contact | 18 | 30, 5, −10 | −25, 40, 30 | −35, 70 | 40, 80 |
  | down | 17 | 15, 20, 0 | −10, 80, 35 | −20, 70 | 25, 75 |
  | pass | 18 | −5, 10, 0 | 20, 95, 30 | 0, 70 | 0, 70 |
  | up | 19 | −25, 25, 25 | 35, 50, 0 | 25, 75 | −20, 70 |

- **jump:** 3 keys, 3 frames, 10 fps, no loop.
  1. Crouch: `hipHeight` 15, knees about 60, arms back.
  2. Rise: legs extended, ankles pointed about 40, arms up.
  3. Tuck/fall: near hip 40 and knee 70, arms out.
- **shoot** (the near leg kicks): 5 keys, 5 frames, 15 fps, no loop.
  1. Wind-up: near hip −40, knee 90, arms out, torso −5.
  2. Charge-hold: near hip −55, knee 100.
  3. Strike: near hip 45, knee 10, ankle 20, torso −10.
  4. Follow-through: near hip 75, knee 5, far arm up.
  5. Recover: near hip 20, knee 15.
- **powerUp** (the charging stance from the design's "Powering up"): 4 keys, 4 frames, 12 fps, loop.
  - A wide, low stance: near hip 20, far hip −20, both knees about 35, `hipHeight` 15.
  - Chest out (torso −5), arms down and tensed slightly back with fists at the hips (shoulder −20, elbow 30).
  - Head `side`, tilted back with `head.dy` −1 (roaring).
  - Keys alternate `x` between −1 and +1 and `hipHeight` between 15 and 14, so he trembles with power.
  - In powered forms this clip is baked with `HARRISON_POWER_HEADS`.

- [ ] **Step 1: Write the failing tests**

```ts
const baked = bakeAll(HARRISON_BODY, HARRISON_HEADS);
const powered = bakeAll(HARRISON_BODY, HARRISON_POWER_HEADS);
it('bakes the spec frame counts', () => {
  expect(Object.fromEntries(Object.values(baked).map(c => [c.name, c.frames.length])))
    .toEqual({ idle: 4, run: 8, jump: 3, shoot: 5, powerUp: 4 });
});
it('keeps a 1 px transparent margin on every frame (no clipping), including power heads', () => {
  for (const clip of [...Object.values(baked), ...Object.values(powered)]) for (const f of clip.frames) {
    const b = opaqueBounds(f)!;
    expect(b.x >= 1 && b.y >= 1 && b.x + b.w <= 48 && b.y + b.h <= 55).toBe(true);
  }
});
it('keeps run frames on or near the ground', () => {
  for (const f of baked.run.frames) { const b = opaqueBounds(f)!; expect(b.y + b.h - 1).toBeGreaterThanOrEqual(53 - 3); }
});
it('uses at most 13 distinct resolved colours per frame in every kit and form', () => {
  for (const kit of ['home', 'away'] as const) for (const form of ['base', 'golden', 'storm', 'ultra'] as const) {
    const pal = resolvePalette(harrisonLook(kit, form));
    for (const clip of Object.values(form === 'base' ? baked : powered)) for (const f of clip.frames) {
      const colours = new Set([...f.data].filter(id => id !== C.None).map(id => pal[id]!.join(',')));
      expect(colours.size).toBeLessThanOrEqual(13);
    }
  }
});
it('resolves every logical colour used to an opaque colour in every kit and form', () => {
  const used = new Set([...Object.values(baked), ...Object.values(powered)].flatMap(c => c.frames.flatMap(f => [...f.data])));
  used.delete(C.None);
  for (const kit of ['home', 'away'] as const) for (const form of ['base', 'golden', 'storm', 'ultra'] as const) {
    const pal = resolvePalette(harrisonLook(kit, form));
    for (const id of used) expect(pal[id]?.[3]).toBe(255);
  }
});
it('jump starts in a crouch', () => {
  expect(CLIPS.jump.keys[0]!.hipHeight).toBeLessThan(standingHipHeight(HARRISON_BODY));
});
it('frameIndexAt loops or clamps', () => {
  expect(frameIndexAt(baked.run, 1000)).toBe(12 % 8);
  expect(frameIndexAt(baked.shoot, 10_000)).toBe(4);
});
```

- [ ] **Step 2: Run `npm test`; the new tests fail.**
- [ ] **Step 3: Implement `animations.ts` and `bake.ts`.**
- [ ] **Step 4: Run `npm test`; all tests pass.**
- [ ] **Step 5: Add animation rows to the sheet, run `npm run sheet` and check them.** Add one row per clip in the home kit, one per clip in the away kit, and the `powerUp` clip in golden and ultra form with power heads. Check that:
  - the run reads as a smooth, Prince of Persia-style stride with arms opposite legs,
  - the kick has a clear wind-up and strike,
  - the power-up reads as straining and gathering power.
  Tune the key angles until it looks right, keeping the tests green.
- [ ] **Step 6: Commit** — `feat: add core and power-up animations`

---

### Task 9: Portrait (four expressions)

**Files:**
- Create: `src/art/harrison/portrait.ts`
- Modify: `tools/render-sheet.ts` (portrait row, first row of the sheet)
- Test: `src/art/harrison/portrait.test.ts`

**Interfaces:**
- Consumes: `parseGrid`, `blit`, `ART_LEGEND`
- Produces:
  ```ts
  export type Expression = 'neutral' | 'celebrate' | 'determined' | 'disappointed';
  export const PORTRAIT_SIZE = 64;
  export const PORTRAIT_FACE_BOX = { x: 12, y: 14, w: 40, h: 38 };   // region expression patches may change
  export function harrisonPortrait(expression: Expression): IndexedImage;
  ```

Data: one 64-row `BASE` grid (the neutral face) plus, per non-neutral expression, patches `{ x, y, rows }` for the brows/eyes and mouth, applied with `blit`. Composition: head and shoulders, three-quarter or front view, the top of the hair near row 3, shoulders in the home jersey (white shoulder stripes) across the bottom rows, and a transparent background.

- [ ] **Step 1: Make a tracing reference (throwaway, scratchpad only, never committed).**

Write a Python/PIL script in the session scratchpad that:
- crops `harrison_front.jpg` to a square around head and shoulders (start near x 175–775, y 40–640),
- downsamples to 64×64,
- maps each pixel to the nearest `ART_LEGEND` colour as resolved by `harrisonLook()`,
- prints 64 rows of legend chars.

Use the output as an underlay for proportions only. Hand-clean every row:
- Clean shapes, deliberate shading ramps, no noise.
- Repaint the shirt as the jersey and make the background transparent.
- One-pixel `e` studs on the earlobes, `i`/`p` eyes with a `w` highlight.
- The fringe sweeps forward and slightly to one side, down to the brows, with `t` tips. Faded sides in `f`.

- [ ] **Step 2: Write the failing tests**

```ts
const all = ['neutral', 'celebrate', 'determined', 'disappointed'] as const;
it.each(all)('%s portrait is 64×64', e => {
  const p = harrisonPortrait(e);
  expect([p.width, p.height]).toEqual([64, 64]);
});
it.each(all)('%s portrait uses at most 20 colours', e => {
  expect(new Set(harrisonPortrait(e).data).size - 1).toBeLessThanOrEqual(20);
});
it.each(['celebrate', 'determined', 'disappointed'] as const)('%s differs from neutral only inside the face box', e => {
  const n = harrisonPortrait('neutral'), p = harrisonPortrait(e);
  let changed = 0;
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (n.get(x, y) !== p.get(x, y)) {
    changed++;
    const B = PORTRAIT_FACE_BOX;
    expect(x >= B.x && x < B.x + B.w && y >= B.y && y < B.y + B.h).toBe(true);
  }
  expect(changed).toBeGreaterThan(0);
});
```

- [ ] **Step 3: Run `npm test`; the new tests fail.**
- [ ] **Step 4: Author `portrait.ts`** (BASE plus patches: celebrate = open shouting mouth with brows up; determined = brows down and lips pressed; disappointed = eyes lowered and mouth turned down).
- [ ] **Step 5: Run `npm test`; all tests pass.**
- [ ] **Step 6: Put the portraits in the first row of the sheet, run `npm run sheet`, and compare against `harrison_front.jpg`.** The row is the four expressions in base form, then `celebrate` in golden form (a palette swap, free). Revise until the likeness holds: fringe shape, eye colour, face shape, cheeks, studs.
- [ ] **Step 7: Commit** (confirm the trace script and photos are not staged) — `feat: add harrison portrait with four expressions`

---

### Task 10: Viewport and sprite viewer

**Files:**
- Create: `src/engine/viewport.ts`, `src/engine/bitmaps.ts`, `src/viewer/spriteViewer.ts`
- Modify: `index.html`, `src/main.ts`
- Test: `src/engine/viewport.test.ts`

**Interfaces:**
- Consumes: `bakeAll`, `frameIndexAt`, `FRAME_W`, `ANCHOR`, `HARRISON_HEADS`, `HARRISON_POWER_HEADS`, `HARRISON_BODY`, `harrisonPortrait`, `harrisonLook`, `PowerForm`, `resolvePalette`, `toRGBA`, `flipX`
- Produces:
  ```ts
  export const BASE_W = 320, BASE_H = 180;
  export interface Viewport { scale: number; x: number; y: number; deviceW: number; deviceH: number }
  export function computeViewport(cssW: number, cssH: number, dpr: number): Viewport; // all values in device pixels
  export function toCanvas(img: IndexedImage, palette: ResolvedPalette): HTMLCanvasElement;
  export function startSpriteViewer(canvas: HTMLCanvasElement): void;
  ```

**computeViewport:**
- `deviceW = round(cssW·dpr)`, `deviceH = round(cssH·dpr)`, and `s = min(deviceW/320, deviceH/180)`.
- `scale = s ≥ 1 ? ⌊s⌋ : s`.
- `x = ⌊(deviceW − 320·scale)/2⌋`, and `y` likewise.

**Viewer:**
- A full-window canvas with its backing size set to device pixels and `imageSmoothingEnabled = false`. A 320×180 offscreen game canvas is drawn to it at the viewport.
- The scene: a sky/grass backdrop, Harrison at centre playing the current clip, and the current portrait in the top-left corner.
- Keyboard: `1–5` choose the clip, `K` toggles home/away, `G` cycles the power form, `F` flips facing, `E` cycles the expression.
- Gamepad (polled with `navigator.getGamepads()`): A = next clip, X = kit, B = power form, Y = expression, D-pad left/right = facing.
- Any form other than base uses the power heads.
- Facing left draws `flipX` frames at the same anchor position.
- Rebuild the bitmaps when the kit changes, and recompute the viewport on `resize`.

- [ ] **Step 1: Write the failing tests**

```ts
it('integer-scales a 1080p window', () => expect(computeViewport(1920, 1080, 1)).toMatchObject({ scale: 6, x: 0, y: 0 }));
it('letterboxes 1366×768', () => expect(computeViewport(1366, 768, 1)).toMatchObject({ scale: 4, x: 43, y: 24 }));
it('scales in device pixels at dpr 1.5', () => expect(computeViewport(1280, 800, 1.5)).toMatchObject({ scale: 6, deviceW: 1920, deviceH: 1200, x: 0, y: 60 }));
it('never returns scale 0 for tiny windows', () => {
  const v = computeViewport(300, 150, 1);
  expect(v.scale).toBeGreaterThan(0); expect(v.scale).toBeCloseTo(150 / 180);
});
it('handles ultrawide windows', () => expect(computeViewport(3440, 1440, 1)).toMatchObject({ scale: 8, y: 0 }));
```

- [ ] **Step 2: Run `npm test`; the new tests fail.**
- [ ] **Step 3: Implement `viewport.ts`, `bitmaps.ts`, `spriteViewer.ts`; wire up `index.html` and `main.ts`.**
- [ ] **Step 4: Run `npm test`, `npm run build`; both pass.**
- [ ] **Step 5: Run `npm run dev` and check it in Chrome.** Screenshot it and confirm:
  - all five clips animate,
  - the power-form toggle swaps the hair,
  - the kit toggle works,
  - flipping facing doesn't shift his feet,
  - the portrait cycles through expressions,
  - the pixels stay crisp at a couple of window sizes.
- [ ] **Step 6: Commit** — `feat: add sprite viewer with integer scaling`

---

### Task 11: Likeness review and parent approval

- [ ] **Step 1:** Run `npm run sheet`. Review `preview/character-sheet.png` next to all four reference photos against this checklist:
  - The fringe wedge and golden tips read.
  - The fade is visible.
  - The studs are visible.
  - The blue-grey eyes show in the portrait.
  - The build is lean.
  - The red kit has white shoulder and sleeve stripes; the away kit is black.
  - The boots are volt.
  - The golden and ultra power forms read as powered up.
  - No frame is clipped.
  Fix anything that fails.
- [ ] **Step 2:** Send the parent the sheet with SendUserFile, plus a short note:
  - how to see him animated (`npm run dev`, then open the printed URL),
  - the viewer controls,
  - a request for their verdict and Harrison's.
- [ ] **Step 3:** Apply the feedback. Repeat steps 1–2 until the parent approves. Commit each round (`fix: ...` or `feat: ...`).
- [ ] **Step 4:** After approval, ask the parent before merging `feat/pixel-harrison` into `main`. Plan 2 (basic match and GitHub Pages deploy) is written next.
