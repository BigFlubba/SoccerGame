# The Locker Room, First Round Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Locker Room off the Hub where Harrison buys and wears 23
cosmetics (10 kits, 9 boots, 4 extras) with his coins, earns four gifts
from his star milestones, sees the flashy ones burn, shine and trail in
matches, and never plays in a kit that clashes with his opponent's.

**Architecture:**
- **The catalogue and its rules** live in `src/meta/locker.ts`: item
  ids, prices, gifts, clash families, ownership, buy and wear. Starters
  and gifts are worked out (gifts from `career.milestonesPaid`), never
  stored.
- **Profile v6** appends a `locker` record (bought, kit, boots, extras,
  seen). The save code appends five fields after v5's difficulty.
- **His look** is an `Outfit` (kit, boots, extras). `outfitLook` and
  `outfitHeads` in `src/art/harrison/outfit.ts` turn it into colours and
  heads; `drawFigure` and `harrisonPortrait` take the extras. Three new
  logical colours: the glasses' rim and glint, and the armband.
- **The effects** are pure shaders and emitters in
  `src/art/harrison/outfitFx.ts`, and an `OutfitFx` particle system in
  `src/scenes/outfitView.ts`. They run at draw time only, on their own
  random numbers, so the match never sees them.
- **The art follows the save:** `GameArt.dress(outfit)` switches
  Harrison's sprite sets and portraits, baked lazily per outfit and
  cached. Every Harrison sprite is drawn through `art.harrison(...)`,
  which paints an animated kit live. `game.ts` dresses him whenever the
  profile is stored or another tab changes it.
- **Screens:** `lockerRoomScene.ts` (state and input) and
  `lockerRoomView.ts` (the room and panel), a LOCKER ROOM item and NEW
  tag on the Hub, and a gift line on Results.

**Tech Stack:** Vite 8, TypeScript 7 (strict), Canvas 2D, Vitest 4 (node
environment: scene tests draw through `fakeArt` and
`recordingContext`, so every canvas a scene draws must come from `art`).
No runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-28-locker-room-design.md`. It
wins over this plan if they ever disagree. Its appendix holds the
approved extras art pixel for pixel. The approved mockups and studies
are in `.superpowers/brainstorm/2325899-1793218293/` (gitignored): open
`content/locker-v1.html` and `content/locker-anim-v1.html` in a browser,
and read `sources/locker-anim.mts` for the effects' reference numbers
and `sources/extras-sheet.mts` for the extras.

## Global Constraints

- **Cosmetics never change play.** Nothing in `src/game/` reads the
  locker. Every existing tuning test, snapshot and AI-vs-AI test passes
  unchanged.
- **Effects are view-only:** drawn and stepped in `draw`, never in
  `update`, on their own seeded random numbers, never `Math.random` in
  the match's code path and never the match's seed stream.
- **The save rules:**
  - The version bumps to 6.
  - Nothing earned or bought is taken back. Gifts come from
    `career.milestonesPaid`, which never goes down.
  - The code's fields are append-only; `LOCKER_ITEMS`' order is the
    code's order and is append-only too.
  - Storage that throws never stops the game.
  - `profileFrom` loads field by field.
- **Prices:** WHITE, SKY, PURPLE 200; NAVY 250; BLACK GOLD 1000; ICE
  1200; INFERNO 1500; boots WHITE, BLACK 100; RED, BLUE, PINK 150; FIRE
  1500; HEADBAND 150; WRISTBANDS 100.
- **Gifts by milestone index:** 0 (10 stars) the captain's armband, 1
  (25) LIGHTNING boots, 2 (50) GOLD kit, 3 (75) GOLD boots.
- **Starters:** HOME and AWAY kits, VOLT boots, GLASSES (off at first).
- **Colours** are the spec's tables, exactly. The extras' art is the
  spec's appendix, exactly. Headband B only.
- **On-screen text** uses only uppercase letters, digits and
  `' - : ! ? . , / + < >`. No parentheses.
- **No image, audio or font files, and no surname anywhere.**
- **Commits:**
  - Conventional Commits, 50/72, following the `commit-messages` skill.
  - No AI attribution trailers.
  - Run `git status --short` before each commit: reference photos must
    never be staged.
- **One branch (`plan-10-locker-room`), one merge.** Ask the parent
  before every merge into `main` and every push, because the push
  publishes to Pages.

## Review Focus

1. **His live save.** A v5 save with `milestonesPaid` 2 loads with
   nothing bought, HOME, VOLT and no extras; the armband and LIGHTNING
   boots are owned and NEW; the Hub shows NEW; PLAY stores v6 with every
   coin, star and stat. The Park playtest code (v4) still loads, with an
   empty locker. Tests: Tasks 2 and 9.
2. **Try-on never sticks.** Leaving a row, switching tab, opening the
   buy box and saying NO, or backing out of the room puts back what he
   wears, saves nothing, and the next match uses what he wears. Tests:
   Task 8.
3. **One press never spends coins.** The A that opens the buy box
   doesn't buy; Start in the box backs out; an owned, locked or too-dear
   item never reaches the box; coins exactly equal to the price leave 0.
   Tests: Tasks 1 and 8.
4. **Switching saves switches his look.** Save 1 in INFERNO, save 2 in
   HOME: playing save 2 shows HOME in the match, the Hub and the
   backdrop; each save's info box shows its own portrait. Tests: Task 6
   (info box), Task 10 (browser).
5. **A gift seen stays seen; a locked gift is never NEW.** Resting the
   cursor on an unlocked gift saves it as seen in that save only;
   resting on a locked one does nothing. Tests: Task 8.

---

### Task 1: The catalogue and its rules

**Files:**
- Create: `src/meta/locker.ts`
- Modify: `src/meta/profile.ts` (the `Locker` type and an empty locker
  only; the version, loader and code are Task 2)
- Test: `src/meta/locker.test.ts`

**Interfaces:**
- Consumes: `Profile`, `newProfile`, `OpponentId`.
- Produces, in `profile.ts`:
  ```ts
  export interface Locker {
    /** Items bought with coins. Starters and gifts are never stored here. */
    bought: LockerItemId[];
    kit: KitItemId;
    boots: BootsItemId;
    extras: ExtraId[];
    /** Gifts whose NEW he's seen. */
    seen: LockerItemId[];
  }
  // Profile gains `locker: Locker`; newProfile() has
  // { bought: [], kit: 'home', boots: 'volt', extras: [], seen: [] },
  // and profileFrom gives every loaded save that empty locker until Task 2.
  ```
- Produces, in `locker.ts`:
  ```ts
  export type KitItemId = 'home' | 'away' | 'white' | 'sky' | 'purple' | 'navy' | 'blackGold' | 'ice' | 'inferno' | 'gold';
  export type BootsItemId = 'volt' | 'white' | 'black' | 'red' | 'blue' | 'pink' | 'fire' | 'lightning' | 'gold';
  export type ExtraId = 'glasses' | 'headband' | 'wristbands' | 'armband';
  export type LockerTab = 'kits' | 'boots' | 'extras';
  export type LockerItemId = `kit:${KitItemId}` | `boots:${BootsItemId}` | `extra:${ExtraId}`;
  export type ClashFamily = 'red' | 'black' | 'white' | 'blue' | 'purple' | 'orange' | 'yellow' | 'teal' | 'pink';
  export type ChangeKit = 'white' | 'black';
  export type ItemSource = 'starter' | { price: number } | { milestone: number };
  export interface LockerItem { id: LockerItemId; tab: LockerTab; label: string; blurb: string; source: ItemSource }
  export interface Outfit { kit: KitItemId; boots: BootsItemId; extras: readonly ExtraId[] }
  export type ItemStatus = 'wearing' | 'owned' | 'buy' | 'locked';

  /** All 23, in tab order: the save code's order, append-only. */
  export const LOCKER_ITEMS: readonly LockerItem[];
  export const KIT_IDS: readonly KitItemId[];      // LOCKER_ITEMS' kits, in order
  export const BOOTS_IDS: readonly BootsItemId[];
  export const EXTRA_IDS: readonly ExtraId[];      // glasses, headband, wristbands, armband
  /** Index = milestone index. */
  export const GIFTS: readonly LockerItemId[];     // ['extra:armband', 'boots:lightning', 'kit:gold', 'boots:gold']
  export const GIFT_NAMES: Readonly<Record<string, string>>; // "CAPTAIN'S ARMBAND", 'LIGHTNING BOOTS', 'GOLD KIT', 'GOLD BOOTS'
  export const KIT_CLASH: Readonly<Record<KitItemId, { family: ClashFamily; light: boolean }>>;
  export const OPPONENT_FAMILY: Readonly<Record<Exclude<OpponentId, 'biscuit'>, ClashFamily>>; // max blue, brick orange, leo purple, tia teal, pete yellow, sam pink
  export const DEFAULT_OUTFIT: Outfit; // { kit: 'home', boots: 'volt', extras: [] }

  export function item(id: LockerItemId): LockerItem;
  export function itemsIn(tab: LockerTab): LockerItem[];
  export function owns(p: Profile, id: LockerItemId): boolean;
  export function itemStatus(p: Profile, id: LockerItemId): ItemStatus;
  export function unseenGifts(p: Profile): LockerItemId[];
  export function outfitOf(p: Profile): Outfit;
  /** Stable and order-free in the extras, e.g. 'inferno/fire/glasses+headband'. */
  export function outfitKey(o: Outfit): string;
  /** p's outfit with `id` on (a kit or boots replaces, an extra joins). Doesn't check ownership: the try-on uses it. */
  export function dressedIn(o: Outfit, id: LockerItemId): Outfit;
  /** Buys and wears `id`; null when it's owned, locked, a starter or too dear. */
  export function buyItem(p: Profile, id: LockerItemId): Profile | null;
  /** Wears an owned item; null when he doesn't own it or already wears it. */
  export function wearItem(p: Profile, id: LockerItemId): Profile | null;
  /** Takes an extra off; null when it isn't on. */
  export function takeOff(p: Profile, id: `extra:${ExtraId}`): Profile | null;
  /** Marks an unlocked gift seen; the same profile when it's locked, already seen or not a gift. */
  export function markSeen(p: Profile, id: LockerItemId): Profile;
  export function changeKitFor(kit: KitItemId, opponent: Exclude<OpponentId, 'biscuit'>): ChangeKit | null;
  /** The Results line for a paid milestone, or null when it brings no gift. */
  export function giftLine(milestoneIndex: number): string | null; // 'NEW IN THE LOCKER ROOM: LIGHTNING BOOTS'
  ```
- Labels and blurbs are the spec's *Catalogue* and *Blurbs*, exactly.
  `KIT_CLASH` is the spec's kit table: WHITE and ICE are `light`.

- [ ] **Step 1: Write the failing tests** in `locker.test.ts`:
  - `'lists 10 kits, 9 boots and 4 extras, 23 in all, ids unique'`.
  - `'a new save owns only the starters'`: `owns(newProfile(), id)` is
    true exactly for `kit:home`, `kit:away`, `boots:volt`,
    `extra:glasses`.
  - `'a paid milestone owns its gift'`: `milestonesPaid: 2` owns
    `extra:armband` and `boots:lightning`, not `kit:gold`.
  - `'status: wearing, owned, buy, locked'` on a new save: HOME
    `wearing`, AWAY `owned`, SKY `buy`, `kit:gold` `locked`, GLASSES
    `owned` (off).
  - `'buying takes the price, owns it and wears it'`: 200 coins buy
    SKY: coins 0, `bought` `['kit:sky']`, kit `sky`.
  - `'buying refuses owned, starter, locked and too-dear items'`: each
    returns null (`kit:away`, `kit:gold` at `milestonesPaid` 0, SKY at
    199 coins).
  - `'an extra joins the outfit and comes off again'`: wear GLASSES,
    then HEADBAND: extras `['glasses', 'headband']`; `takeOff` glasses
    leaves `['headband']`; `takeOff` again is null.
  - `'wearing what he wears, or something he doesn't own, is null'`.
  - `'unseen gifts: paid and not seen, never locked'`: `milestonesPaid`
    2, seen `['extra:armband']` gives `['boots:lightning']`;
    `markSeen` on `kit:gold` (locked) returns the same profile.
  - `'outfitKey ignores the extras' order'`.
  - `'clashes: the spec's list'`: Max changes white for SKY and NAVY,
    black for ICE; Brick white for INFERNO; Leo white for PURPLE; Pete
    white for GOLD; HOME against every opponent, and every kit against
    Tia and Sam, is null.
  - `'giftLine names the gift'`: index 1 gives
    `'NEW IN THE LOCKER ROOM: LIGHTNING BOOTS'`; index 4 gives null.
  - `'every label and line uses only the game's characters'`: every
    label, blurb and gift line matches `/^[A-Z0-9 '\-:!?.,/+<>]*$/`.

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/meta/locker.test.ts`
  Expected: FAIL, the module doesn't exist.

- [ ] **Step 3: Implement `src/meta/locker.ts`** and the `Locker`
  type with the interfaces above. `locker.ts` imports `Profile` as a
  type only, as `catalog.ts` does.

- [ ] **Step 4: Run the tests**

  Run: `npx vitest run src/meta/locker.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit:** `feat: add the locker room's catalogue and rules`.

---

### Task 2: Profile v6 and the save code

**Files:**
- Modify: `src/meta/profile.ts`, `src/meta/saveCode.ts`,
  `src/scenes/saveCodeScene.ts` (`MAX_ENTRY`)
- Test: `src/meta/profile.test.ts`, `src/meta/saveCode.test.ts`,
  `src/scenes/saveCodeScene.test.ts`, and any test with a literal
  `version: 5` profile (`npm run typecheck` lists them)

**Interfaces:**
- Consumes: Task 1's `Locker`, ids, `LOCKER_ITEMS`, `KIT_IDS`,
  `BOOTS_IDS`, `EXTRA_IDS`, `GIFTS`, `owns`.
- Produces:
  ```ts
  interface Profile { version: 6; /* ...v5 fields and Task 1's locker... */ }
  export const PROFILE_VERSION = 6;
  ```
- The loader reads `locker` after `career` (gift ownership needs
  `milestonesPaid`): unknown or repeated ids dropped; `bought` keeps
  only items with a price; a kit, boots or extra he doesn't own falls
  back (HOME, VOLT, dropped); `seen` keeps only `GIFTS`.
- The code appends, after the difficulty, in this order: the bought
  mask over `LOCKER_ITEMS` (bit i = item i), the kit (`KIT_IDS` index +
  1), the boots (`BOOTS_IDS` index + 1), the extras mask over
  `EXTRA_IDS`, the seen mask over `GIFTS`. 0 or missing means none. The
  first field writes 6.

- [ ] **Step 1: Write the failing tests:**
  - profile: `'a v5 save loads into v6 with an empty locker and keeps
    everything else'` (a literal v5 save with coins, stars, stats and
    `milestonesPaid: 2`); `'the locker loads field by field'` (bad kit
    → HOME, unknown and repeated ids dropped, a starter or gift in
    `bought` dropped, an unowned extra dropped, a locked gift worn →
    default, `seen` keeps gifts only); `'newProfile's locker is empty
    and stores as version 6'`.
  - saveCode: `'a full locker round-trips'` (everything bought, GOLD
    kit, GOLD boots, all four extras, all gifts seen, `milestonesPaid`
    4); `'the Park playtest code (v4) loads with an empty locker'`
    using `0K80Y-1G00W-2G818-A0000-00000-00000-00000-G20G2-08104-0G208-10408-10010-40820-001GA-0`;
    `'a v5 code loads with an empty locker'` (encode a v5-shaped field
    list with `encodeFields`); `'the first field is 6'`.
  - saveCodeScene: update the longest-code test: the maxed profile
    gains the full locker; assert its new length exactly, that it is
    `≤ MAX_ENTRY`, and that `codeLines` shows it at scale 1 in at most 4
    lines.

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/meta src/scenes/saveCodeScene.test.ts`
  Expected: FAIL on the new tests.

- [ ] **Step 3: Implement** the v6 profile, `lockerFrom` (private), the
  five code fields in `encodeSaveCode` / `decodeSaveCode` (with a
  `// v6:` comment like the others), and raise `MAX_ENTRY` to the new
  longest code plus 2, updating its comment's number.

- [ ] **Step 4: Run the whole suite and the type check**

  Run: `npm run typecheck && npx vitest run`
  Expected: all PASS. Fix literal `version: 5` profiles in tests to 6
  with an empty locker.

- [ ] **Step 5: Commit:** `feat: store the locker in each save (v6)`.

---

### Task 3: His look in any outfit

**Files:**
- Modify: `src/art/colors.ts`, `src/art/body/drawFigure.ts`,
  `src/art/body/bake.ts`, `src/art/harrison/portrait.ts`,
  `src/art/harrison/look.ts`, `src/art/opponents/max.ts`,
  `src/art/opponents/sam.ts`, `src/art/opponents/crew.ts`
- Create: `src/art/harrison/extras.ts`, `src/art/harrison/outfit.ts`
- Test: `src/art/harrison/extras.test.ts`,
  `src/art/harrison/outfit.test.ts`, `src/art/body/drawFigure.test.ts`,
  `src/art/harrison/portrait.test.ts`

**Interfaces:**
- Consumes: Task 1's `Outfit`, ids, `DEFAULT_OUTFIT`.
- Produces:
  ```ts
  // colors.ts
  C.GlassesRim = 28; C.GlassesGlint = 29; C.Armband = 30;
  ART_LEGEND.g = C.GlassesRim; ART_LEGEND.G = C.GlassesGlint;
  /** The extras' fixed colours, spread into every look. */
  export const EXTRA_COLORS = { GlassesRim: 'silver', GlassesGlint: 'white', Armband: 'energyGold' } as const;
  // drawFigure.ts
  export interface BodyExtras { wristbands: boolean; armband: boolean }
  export const NO_BODY_EXTRAS: BodyExtras;
  export function drawFigure(pose: Pose, body: BodyProportions, heads: Record<HeadFacing, HeadSprite>, extras?: BodyExtras): IndexedImage;
  // bake.ts: bakeClip and bakeAll take the same optional `extras` last
  // extras.ts
  /** Draws `rows` over a copy of `img` at (dx, dy) in ART_LEGEND; '.' and short rows keep what's there. */
  export function overlay(img: IndexedImage, rows: readonly string[], dx?: number, dy?: number): IndexedImage;
  export function headsWith(heads: Record<HeadFacing, HeadSprite>, power: boolean, glasses: boolean, headband: boolean): Record<HeadFacing, HeadSprite>;
  export const PORTRAIT_GLASSES: { x: number; y: number; rows: readonly string[] };
  export const PORTRAIT_HEADBAND: { x: number; y: number; rows: readonly string[] };
  // portrait.ts
  export function harrisonPortrait(expression: Expression, extras?: { glasses: boolean; headband: boolean }): IndexedImage;
  // outfit.ts
  export const HARRISON_KITS: Readonly<Record<KitItemId, Record<KitSlots, MasterColor>>>;
  export const HARRISON_BOOTS: Readonly<Record<BootsItemId, Record<'BootShadow' | 'Boot' | 'BootLight', MasterColor>>>;
  export function outfitLook(o: Outfit, form?: PowerForm): LookColors;
  export function outfitHeads(o: Outfit, power: boolean): Record<HeadFacing, HeadSprite>;
  export function outfitBody(o: Outfit): BodyExtras;
  export function outfitPortrait(o: Outfit, expression: Expression): IndexedImage;
  ```
- The overlay grids are the spec's appendix (heads, power heads,
  portrait), headband before glasses. The headband and wristbands use
  `C.Trim` / `C.TrimShadow`. The armband: near upper arm from 0.22 to
  0.48 of shoulder-to-elbow, and the near sleeve stripe over the same
  stretch, in `C.Armband`; never the far arm. Wristbands: each forearm
  from 0.6 of elbow-to-hand, `C.Trim` near, `C.TrimShadow` far.
- `harrisonLook(kit, form)` stays (the sprite viewer uses it), now with
  `EXTRA_COLORS`. `maxLook`, `samLook` and `crewLook` spread
  `EXTRA_COLORS` too.

- [ ] **Step 1: Write the failing tests:**
  - drawFigure: `'without extras every frame is unchanged'` (bake
    Harrison's clips with and without `NO_BODY_EXTRAS`: identical data);
    `'wristbands only turn forearm skin into trim'` (every changed pixel
    was `Skin`/`SkinShadow` and is now `Trim`/`TrimShadow`, and some
    changed, on idle frame 0); `'the armband only recolours the near
    sleeve, in Armband'`.
  - extras: `'glasses on the side head: rim before the eye, the eye
    stays dark'` (`(8,4)` is `GlassesRim`, `(7,4)` stays `Outline`);
    `'the headband crosses the top of his head in trim'` (side head row
    2, x 0–1 `TrimShadow`, x 2–7 `Trim`; x 8–9 unchanged);
    `'powered up, the band crosses his brow'` (power side head row 6, x
    2–3 `TrimShadow`, x 4–10 `Trim`); `'overlay keeps '.' and short
    rows'`.
  - portrait: `'no extras: every expression unchanged'`; `'glasses: a
    glint on each lens'` (`(27,25)` and `(36,25)` are `GlassesGlint`);
    `'glasses go on after the expression'` (celebrate with glasses still
    has the rim at `(21,23)`); `'the headband crosses the crown'`
    (`(17,11)` `TrimShadow`, `(18,11)` `Trim`, row 13 x 16–51
    `TrimShadow`).
  - outfit: `'HOME and AWAY are the club kits'` (equal to `KITS.home`
    and `KITS.away`); `'every kit and boots matches the spec's table'`
    (spot-check INFERNO's trim `gold`/`energyGold` and ICE's jersey
    `electric`/`electricLight`/`white`); `'outfitLook keeps Golden
    Form's hair'`; `'outfitHeads adds only what's worn'`.

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/art`
  Expected: FAIL on the new tests.

- [ ] **Step 3: Implement** the slots, `EXTRA_COLORS` in every look, the
  `extras` parameter through `drawFigure` / `bakeClip` / `bakeAll`, the
  overlays and portrait extras, and `outfit.ts`.

- [ ] **Step 4: Run the art tests, then everything**

  Run: `npm run typecheck && npx vitest run`
  Expected: all PASS.

- [ ] **Step 5: Commit:** `feat: draw harrison in any outfit and extras`.

---

### Task 4: The effects

**Files:**
- Create: `src/art/harrison/outfitFx.ts`, `src/scenes/outfitView.ts`
- Test: `src/art/harrison/outfitFx.test.ts`,
  `src/scenes/outfitView.test.ts`

**Interfaces:**
- Consumes: Task 1's ids, Task 3's `C` slots, `ANCHOR` from `pose.ts`.
- Produces:
  ```ts
  // outfitFx.ts (pure)
  /** A kit's live recolour of one logical pixel at frame (x, y) and time t; null keeps it. */
  export type Shader = (id: number, x: number, y: number, t: number) => MasterColor | null;
  export interface ParticleSpec { x: number; y: number; vx: number; vy: number; life: number; colors: readonly MasterColor[]; shape: 'dot' | 'plus' | 'bolt' }
  export function kitShader(kit: KitItemId): Shader | null;          // inferno, ice, blackGold, gold
  /** Particles a kit gives off this tick, in frame pixels (y down). */
  export function kitParticles(kit: KitItemId, frame: IndexedImage, dt: number, rng: () => number): ParticleSpec[];
  /** Particles boots give off: a trail while sprinting, a burst on a landing. */
  export function bootParticles(boots: BootsItemId, frame: IndexedImage, dt: number, rng: () => number, sprinting: boolean, landed: { x: number; y: number } | null): ParticleSpec[];
  /** Where a boot newly meets the ground in `frame`, after `prev`, if one does. */
  export function landing(prev: IndexedImage | null, frame: IndexedImage): { x: number; y: number } | null;
  export function seeded(seed: number): () => number;
  // outfitView.ts
  export interface WorldPoint { x: number; y: number; z: number }
  export class OutfitFx {
    constructor(outfit: Outfit, seed: number);
    /**
     * Moves on to nowS (the step clamped to 0..0.1 s), gives off this
     * frame's particles from `image` (his frame now, logical pixels,
     * facing right) at his feet `at`, facing `facing`, and draws every
     * live particle through `toScreen` at `scale`.
     */
    draw(g: CanvasRenderingContext2D, nowS: number, image: IndexedImage, at: WorldPoint, facing: 1 | -1, sprinting: boolean, toScreen: (p: WorldPoint) => { x: number; y: number }, scale?: number): void;
    /** The room's cheer: a ring of gold sparkles round his middle. */
    sparkleBurst(): void;
  }
  ```
- The numbers are the spec's *The animated items* and
  `sources/locker-anim.mts`: INFERNO's climbing flames (26 px/s,
  flame / flameLight / energyGold / rare redDark on the jersey slots,
  not the trim) and embers (~14/s from his top 10 shirt rows, life
  0.55–0.85 s); ICE's shine (white / electricLight, every 1.4 s, 0.5 s
  to cross) and frost twinkles (~10/s); BLACK GOLD's shine
  (energyGoldLight / energyGold, 1.6 s); GOLD's shine (auraWhite /
  energyGoldLight, 1.6 s) and sparkles (~3/s). A shine covers every kit
  slot, trim included. Boots as the study: trails only while sprinting;
  a puff, two zaps or two glints on each landing; LIGHTNING's bolts ~8/s
  whenever he moves.
- A particle's frame pixel maps to the world as
  `x = at.x + (fx - ANCHOR.x) * facing`, height `ANCHOR.y - fy`, depth
  `at.z`; its velocity likewise (up is up).

- [ ] **Step 1: Write the failing tests:**
  - outfitFx: `'plain kits have no shader and give off nothing'` (HOME,
    SKY); `'INFERNO's flames move'` (the same id, x, y and t always give
    the same colour, and some jersey pixel of idle frame 0 differs
    between t 0 and t 0.25); `'INFERNO leaves the trim alone'`; `'a shine only touches kit slots'` (skin,
    hair and outline return null at every t); `'trails only while
    sprinting'` (FIRE gives none with `sprinting` false and no landing,
    some with true); `'a landing bursts'` (LIGHTNING with a landing and
    `sprinting` false gives a `bolt`); `'landing finds a boot newly on
    the ground'` (run clip frames: some frame lands, an idle frame after
    itself doesn't); `'seeded repeats'`.
  - outfitView: `'nothing animated draws nothing'` (HOME/VOLT: a
    recording context sees no `fillRect` after many draws);
    `'particles live and die'` (INFERNO: after 1 s of draws some
    `fillRect`s; a fresh `OutfitFx` with the same seed draws the same
    calls); `'a long pause doesn't flood'` (nowS jumping 10 s steps at
    most 0.1 s).

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/art/harrison/outfitFx.test.ts src/scenes/outfitView.test.ts`
  Expected: FAIL, the modules don't exist.

- [ ] **Step 3: Implement** both modules. `OutfitFx` keeps its last
  frame image for `landing`, and its particles in world space, so a
  trail stays on the pitch as he runs on.

- [ ] **Step 4: Run them**

  Expected: PASS.

- [ ] **Step 5: Commit:** `feat: add the flashy items' effects`.

---

### Task 5: The art follows the save

**Files:**
- Modify: `src/scenes/art.ts`, `src/scenes/game.ts`,
  `src/scenes/matchView.ts`, `src/scenes/matchScene.ts`,
  `src/scenes/backdrop.ts`, `src/scenes/vsScene.ts`,
  `src/scenes/savesScene.ts`
- Test: `src/scenes/matchScene.test.ts`, `src/scenes/vsScene.test.ts`,
  `src/scenes/savesScene.test.ts`, and draw tests whose recorded names
  change (`art.home.right.idle.0` becomes `art.harrison(...)`)

**Interfaces:**
- Consumes: Tasks 1, 3 and 4.
- Produces, on `GameArt`:
  ```ts
  export type HomeSet = 'home' | 'homePower' | 'homeGolden';
  /** Puts him in `o`: home, homePower, homeGolden and portraits follow from now on, baked once per outfit. */
  dress(o: Outfit): void;
  readonly outfit: Outfit;
  /** His frame now: the baked canvas, or for an animated kit, a scratch canvas painted with its shader at nowS. */
  harrison(set: HomeSet, facing: 1 | -1, clip: AnimName, frame: number, nowS: number): HTMLCanvasElement;
  /** The same frame's logical pixels, facing right, for the effects. */
  harrisonImage(set: HomeSet, clip: AnimName, frame: number): IndexedImage;
  /** Him in any outfit, facing right (the Locker Room's try-on); animated kits painted at nowS. */
  preview(o: Outfit, clip: AnimName, frame: number, nowS: number): HTMLCanvasElement;
  previewImage(o: Outfit, clip: AnimName, frame: number): IndexedImage;
  /** Portraits in any outfit (each save's info box). */
  portraitsOf(o: Outfit): Record<Expression, HTMLCanvasElement>;
  /** The juggler's effects on the backdrop, remade by dress(). */
  readonly backdropFx: OutfitFx;
  ```
- Under `fakeArt` every one of these is a harmless stand-in, so the
  existing draw tests keep working: scenes never iterate or inspect what
  `art` returns.
- `home`, `homePower`, `homeGolden` and `portraits` become getters for
  the current outfit; boot is `DEFAULT_OUTFIT`. Baking is lazy and
  cached by `outfitKey`; `preview` bakes only the clip it's asked for.
- `game.ts`: `saveProfile` and the `saves.follow` callback both call
  `ctx.art.dress(outfitOf(p))` (a no-op when the key hasn't changed).
- `MatchHud` gains `fx: OutfitFx | null` (one per match, seeded from the
  match's seed plus a constant, outfit from the profile at kick-off,
  null when nothing he wears animates). `HomeLook` gains `fx`.
  `pitchDrawables` draws Harrison with `art.harrison(...)` and adds one
  drawable at `w.home.z + BEHIND` that calls `fx.draw` with
  `art.harrisonImage(...)`, his feet, his facing and
  `w.home.anim.name === 'sprint'`. The aura keeps using the baked set.
- `backdrop.ts` draws the juggler with `art.harrison` and
  `art.backdropFx`. `vsScene` draws him with `art.harrison` and its own
  `OutfitFx`, made from `outfitOf(ctx.profile)` with the scene.
- The SAVES info box draws `art.portraitsOf(outfitOf(save)).neutral`.

- [ ] **Step 1: Write the failing tests:**
  - matchScene: `'cosmetics never change play'`: two match scenes with
    the same seed and match, one profile in HOME/VOLT with nothing
    else, the other in INFERNO, FIRE and all four extras (with
    `milestonesPaid` 4 and everything bought); feed both the same 600
    input frames (sprinting, shooting, moving); their `world`s are
    deep-equal.
  - matchScene draw: `'Harrison is drawn through art.harrison'` (a
    recorded name starts with `art.harrison(home,1,idle,0,`).
  - savesScene draw: `'the info box shows the save's own portrait'`
    (a recorded name starts with `art.portraitsOf(`, and none is
    `art.portraits.neutral`).
  - vsScene draw: update the recorded name for Harrison.

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/scenes`
  Expected: FAIL on the new and renamed draws (the parity test may
  already pass: it pins the rule for later).

- [ ] **Step 3: Implement** the `GameArt` changes, the `game.ts`
  dressing, and the drawing changes.

- [ ] **Step 4: Run everything, then look in the browser**

  Run: `npm run typecheck && npx vitest run && npm run build`
  Expected: all PASS. Then `npx vite --port 5179 --strictPort --host 127.0.0.1`
  and stage a match with INFERNO and FIRE through
  `window.__soccer` (see the memory's playtest notes): the flames, the
  embers and the trail show, and the frame rate holds.

- [ ] **Step 5: Commit:** `feat: dress harrison in his save's outfit`.

---

### Task 6: Change kits on a clash

**Files:**
- Modify: `src/art/kits.ts`, `src/scenes/art.ts`,
  `src/scenes/matchScene.ts`, `src/scenes/vsScene.ts`
- Test: `src/art/kits.test.ts` (create), `src/scenes/matchScene.test.ts`,
  `src/scenes/vsScene.test.ts`

**Interfaces:**
- Consumes: Task 1's `changeKitFor`, `ChangeKit`.
- Produces:
  ```ts
  // kits.ts
  /** An opponent's look in a change kit: white (or black) jersey, trim in their own jersey colours, socks to match, their own shorts. */
  export function changeLook(look: LookColors, change: ChangeKit): LookColors;
  // GameArt
  opponentIn(id: Exclude<OpponentId, 'biscuit'>, change: ChangeKit): SpriteSet; // baked once each, lazily
  ```
- White: jersey `silver`/`white`/`white`, socks `silver`/`white`.
  Black: jersey `charcoal`/`slate`/`gray`, socks `charcoal`/`slate`.
  Trim shadow / trim = the opponent's jersey shadow / jersey.
- The match's `awaySprites` getter and the VS card use
  `opponentIn(id, change)` when `changeKitFor(outfitOf(profile).kit, id)`
  isn't null, decided once when the scene is made.

- [ ] **Step 1: Write the failing tests:**
  - kits: `'a white change kit keeps their shorts and trims in their
    colour'` (Max: jersey white, trim `navy`/`blue`, shorts unchanged,
    socks `silver`/`white`); `'a black change kit'` (charcoal, slate,
    gray).
  - matchScene draw: `'Max changes when Harrison wears SKY'` (a recorded
    name starts with `art.opponentIn(max,white)`), `'and not in HOME'`.
  - vsScene draw: the same two for the VS card.

- [ ] **Step 2: Run them to see them fail.** Expected: FAIL.

- [ ] **Step 3: Implement** `changeLook`, `opponentIn`, and the two
  choices.

- [ ] **Step 4: Run everything.**

  Run: `npm run typecheck && npx vitest run`
  Expected: PASS.

- [ ] **Step 5: Commit:** `feat: change the opponent's kit on a clash`.

---

### Task 7: The Locker Room's room and panel

**Files:**
- Create: `src/scenes/lockerRoomView.ts`
- Test: `src/scenes/lockerRoomView.test.ts`

**Interfaces:**
- Consumes: Task 1, Task 5's `art.preview` / `art.previewImage`, Task
  4's `OutfitFx`.
- Produces:
  ```ts
  /** What the panel and Harrison show. */
  export interface LockerView {
    tab: LockerTab;
    row: number;
    /** What he's shown in: the try-on, or what he wears. */
    shown: Outfit;
    trying: boolean;
    /** A trail boot is picked: he sprints on the spot. */
    sprinting: boolean;
    /** Seconds left of the cheer, 0 for none. */
    cheerS: number;
    confirm: { label: string; price: number; yes: boolean } | null;
    message: string | null;
  }
  export function drawRoom(g: CanvasRenderingContext2D): void;
  export function drawLockerRoom(g: CanvasRenderingContext2D, art: GameArt, p: Profile, v: LockerView, fx: OutfitFx, nowS: number): void;
  /** One row's right-hand status text, e.g. 'WEARING', 'OWNED', '200', '50'. */
  export function statusText(p: Profile, id: LockerItemId): string;
  /** The A hint for a row: 'BUY', 'WEAR', 'TAKE OFF' or null. */
  export function aHint(p: Profile, id: LockerItemId): 'BUY' | 'WEAR' | 'TAKE OFF' | null;
  ```
- The layout is the approved mockup's (`sources/locker-mock.mts`):
  lockers 28 wide from x −1, his (the third) red with a white `12` at
  scale 2; bench and floor; Harrison at ×2 with feet at (68, 166); the
  panel at (140, 6, 174, 168); title at scale 2; coins on the tab row;
  tabs `<  KITS  BOOTS  EXTRAS  >`; rows from y 50, 11 apart, 8 shown,
  scroll marks; blurb (or the message, in `redLight`) at y 146; hints at
  the panel's foot. The buy box at (152, 52, 150, 68): `BUY ` + label +
  `?` at scale 2, the price with a coin, a `YES` / `NO` menu; the panel
  dims behind it, Harrison doesn't. TRYING ON on a small panel above his
  head. The cheer: the `celebrate` clip with a hop (`|sin|` of 2.5 Hz,
  6 px) while `cheerS > 0`.

- [ ] **Step 1: Write the failing tests:**
  - `'status text: WEARING, OWNED, the price, the stars a gift needs'`.
  - `'the A hint: BUY, WEAR, TAKE OFF, or none on what he wears and on a
    locked gift'` (a locked gift's A plays `nope`, so no hint).
  - draw (`fakeArt`, `recordingContext`): `'Harrison comes from
    art.preview'`; `'TRYING ON only while trying'`;
    `'NEW beside an unseen gift'`; `'the buy box over the list'`
    (`art.text(BUY INFERNO?,2,...)` recorded).

- [ ] **Step 2: Run them to see them fail.** Expected: FAIL.

- [ ] **Step 3: Implement `lockerRoomView.ts`.**

- [ ] **Step 4: Run them.** Expected: PASS.

- [ ] **Step 5: Commit:** `feat: draw the locker room`.

---

### Task 8: The Locker Room scene

**Files:**
- Create: `src/scenes/lockerRoomScene.ts`
- Test: `src/scenes/lockerRoomScene.test.ts`

**Interfaces:**
- Consumes: Tasks 1 and 7, `backsOut` from `menu.ts`.
- Produces:
  ```ts
  export interface LockerRoomScene extends Scene {
    readonly view: LockerView;
  }
  export function createLockerRoomScene(ctx: GameContext, back: () => Scene): LockerRoomScene;
  ```
- **Controls** (spec, *Controls*): up/down rows (wrapping), left/right
  tabs (wrapping, cursor to what he wears there, EXTRAS row 0); moving
  tries on (`dressedIn`); A per the spec; B, Esc or Start back to
  `back()`. In the buy box: up/down pick YES/NO, A or Enter acts, B, Esc
  or Start close it. YES: `buyItem`, save, `buy`, cheer 1.2 s,
  `fx.sparkleBurst()` on the next draw. Wearing an owned kit, boots or
  extra: save, `menuConfirm`, cheer. Taking off: save, `menuConfirm`,
  no cheer. Too dear: `NEED n MORE` and `nope`. Locked gift:
  `REACH n STARS` and `nope`. A message clears when he moves.
- **Seen:** when the cursor lands on a row (including opening on one),
  `markSeen`; save only if it changed.
- **Effects:** the scene keeps one `OutfitFx` for `view.shown`, made in
  `update` and remade when `outfitKey(view.shown)` changes, and passes
  it to `drawLockerRoom`.
- **Music:** `menuAudio(ctx)`.

- [ ] **Step 1: Write the failing tests** (`testContext`, `frame`):
  - `'opens on KITS at the kit he wears'` (wearing NAVY: row 5).
  - `'moving tries on, saves nothing'` (down from HOME: `view.shown.kit`
    is `away` and `view.trying` is true, since he isn't wearing it;
    `savedProfiles` is empty).
  - `'left and right switch tabs, wrapping, onto what he wears'`.
  - `'A on an owned kit wears it, saves and cheers'`.
  - `'A on what he wears does nothing'`.
  - `'A on something he can afford opens the box; that A doesn't buy'`.
  - `'YES buys: coins drop by the price, he wears it, buy plays'` and
    `'coins equal to the price leave 0'`.
  - `'NO, B, Esc and Start close the box without buying'` (Start never
    buys).
  - `'too dear: NEED 300 MORE and nope, no box'`.
  - `'a locked gift: REACH 50 STARS and nope, no box'`.
  - `'extras: A puts one on (cheer), A again takes it off (no cheer)'`.
  - `'resting on an unlocked gift marks it seen and saves once'` and
    `'resting on a locked gift doesn't'`.
  - `'B leaves with the try-on dropped and nothing saved'`; afterwards
    `outfitOf(ctx.profile)` is what he wore.

- [ ] **Step 2: Run them to see them fail.** Expected: FAIL.

- [ ] **Step 3: Implement `lockerRoomScene.ts`.**

- [ ] **Step 4: Run them, then everything.**

  Run: `npm run typecheck && npx vitest run`
  Expected: PASS.

- [ ] **Step 5: Commit:** `feat: buy and wear in the locker room`.

---

### Task 9: The Hub and Results

**Files:**
- Modify: `src/scenes/hubScene.ts`, `src/scenes/resultsScene.ts`
- Test: `src/scenes/hubScene.test.ts`, `src/scenes/resultsScene.test.ts`

**Interfaces:**
- Consumes: Task 1's `unseenGifts`, `giftLine`; Task 8's scene.
- Produces:
  ```ts
  export const HUB_ITEMS = ['CAREER', 'SHOP', 'LOCKER ROOM', 'OPTIONS', 'HELP', 'SAVES'] as const;
  // resultsScene.ts
  /** One line per milestone paid at this Results, each followed by its gift line. */
  export function milestoneLines(reward: MatchReward): string[];
  ```
- The Hub opens the room with `back` returning to the Hub on LOCKER
  ROOM, and draws `NEW` (scale 1, `flameLight`) just right of the
  LOCKER ROOM item while `unseenGifts(profile)` isn't empty.
- Results keeps `FOOT_LINES` 3: measured, a fourth line at
  `LADDER_Y + 3 × FOOT_LINE_H` (134) crosses the panel's bottom edge
  (134), so the existing cut applies, as the spec allows.
- No Help change.

- [ ] **Step 1: Write the failing tests:**
  - hub: `'LOCKER ROOM is third, and opens the room'`; `'B from the room
    comes back on LOCKER ROOM'`; draw: `'NEW beside LOCKER ROOM while a
    gift is unseen'` and `'not once it's seen'`. Update tests that
    count on the old item order.
  - results: `'a milestone with a gift adds its line after the
    milestone's'` (crossing 25 stars: `['25 STARS! +600 COINS', 'NEW IN
    THE LOCKER ROOM: LIGHTNING BOOTS']`).

- [ ] **Step 2: Run them to see them fail.** Expected: FAIL.

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Run everything and build.**

  Run: `npm run typecheck && npx vitest run && npm run build`
  Expected: PASS.

- [ ] **Step 5: Commit:** `feat: reach the locker room from the hub`.

---

### Task 10: Playtest, the parent's look, and as built

**Files:**
- Modify: `docs/superpowers/specs/2026-10-28-locker-room-design.md`
  (an "As built" section)

- [ ] **Step 1: Playtest in the browser** with real key presses (hold
  each ≥ 1.1 s; see the memory's notes), on a copy of his save in a
  spare slot, never his slot 1 unless the parent says so:
  - his save shows the armband and LIGHTNING as NEW; the Hub says NEW
    until he's looked;
  - try-on, buy (YES and NO), too dear, locked, extras on and off;
  - B leaves and the next match shows what he wears, not the try-on;
  - INFERNO with FIRE: flames, embers, the trail and the step puffs in
    a match, powered up and in Golden Form, at a steady frame rate;
  - SKY against Max: Max in white; ICE: Max in black;
  - switch to another save: his look, the backdrop and the info box
    follow (Review Focus 4).

- [ ] **Step 2: Send the parent the real art** with SendUserFile:
  stills of the Locker Room (KITS with a try-on, BOOTS with LIGHTNING
  NEW, EXTRAS, the buy box), the Hub with NEW, and one GIF of INFERNO
  and FIRE in a real match. Use the frame capture technique in the
  memory (pixel-exact stills through a localhost receiver). Wait for
  the parent's word before merging.

- [ ] **Step 3: Write "As built"** in the spec: anything settled on the
  way (where the effects draw in the depth sort, the cheer's cue, the
  Hub's NEW placement, `MAX_ENTRY`'s new value), and any deferred
  minors.

- [ ] **Step 4: Verify and commit:**

  Run: `npm run typecheck && npx vitest run && npm run build`
  Expected: all PASS.
  Commit: `docs: record the locker room as built`.

- [ ] **Step 5: Finish the branch** with
  `superpowers:finishing-a-development-branch`. Ask the parent before
  any merge into `main` and before any push.
