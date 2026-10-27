# The Park and the Crew Implementation Plan (Plan 7b, part 1 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Beating Biscuit opens the Park: a summer-afternoon venue with its
own art and joggers, four new opponents from the Park crew who each play
differently (Big Brick the blocker, Boomer Leo the long-range shooter,
Tricky Tia the dribbler, Pesky Pete the presser), and a boss node for
Speedy Sam, played by a stand-in until part 2 (`2026-10-27-speedy-sam.md`).

**Architecture:**
- **Career data.** `src/meta/career.ts` grows from "the Backyard plus
  locked names" to venues that open in order. Each `CareerMatch` names its
  `opponent`, its `blurb` and its boss `tip`. The rules that decide what's
  beaten, next, open or COMING SOON become venue-generic. The screens
  already read these functions.
- **Opponents.** `src/game/crew.ts` holds the four kids' stats and
  per-difficulty `AiProfile`s. `src/game/opponents.ts` maps any human
  opponent id to its stats and profile, with Max going through the ladder
  as today. The world already applies every fair rule to any non-dog away
  player through `World.maxProfile` (steal odds, wrong-footing, kickoff
  spot), and to Harrison's keep-out zone and slide clear. The crew pass
  their own profile there.
- **Personalities.** `AiProfile.style` picks one of `allRound` (Max),
  `blocker`, `shooter`, `dribbler` or `presser`. `src/game/styles.ts` holds
  what each style changes at `ai.ts`'s decision points: where to defend,
  when to charge and for how long, the dribbler's fake, and the presser's
  rush. Max is `allRound` and plays exactly as before.
- **Art.** `src/art/venues/park.ts` draws the four Park layers and the
  joggers. `src/art/opponents/crew.ts` draws the four heads, looks and
  Brick's body. `GameArt` gains `venues` and `opponents`. `drawLayers`
  takes the venue, and `MatchHud` carries the away sprites and the venue.
- **Tuning.** `maxScripts.ts` generalises to any human opponent, records a
  few personality traits per match, and `crewTuning.test.ts` pins each
  kid's win bands and personality, beside `maxTuning.test.ts`.

**Tech Stack:** Vite 8, TypeScript 7 (strict), Canvas 2D, Web Audio, Gamepad
API, Vitest 4. No runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-27-the-park-design.md`. It wins
over this plan if they ever disagree. The fair-Max spec
(`2026-10-27-fair-max-design.md` and its amendments) is the authority on
the fair rules.

## Global Constraints

- **No image, audio or font files.** The Park and the crew are code:
  `IndexedImage` grids and drawing helpers in `MASTER` colours.
- **On-screen text** uses only uppercase letters, digits and
  `' - : ! ? . , / + < >`. No parentheses.
- **The Backyard plays exactly as today.** `maxTuning.test.ts`,
  `dogTuning.test.ts`, the AI-vs-AI tests and the no-kit parity test pass
  unchanged. Max's profiles get `style: 'allRound'` and nothing else.
- **Every fair rule applies to every Park opponent:** steal button (own
  clean-steal odds per difficulty), wrong-footed beat, kickoff hold and
  spot, keep-out zone, slide clear, drag-back. Energy Wave answers:
  `braceSense` and `backOffS` stay at Max's values per difficulty.
- **Profiles:** every Easy number is gentler than Normal's, and every
  Normal number gentler than Hard's.
- **Crew stats** (Speed / Power / Jump / Control), starting points the
  tuning may move while keeping each kid a little stronger overall than
  the one before: Brick 3/4/2/4, Leo 4/6/2/3, Tia 5/3/2/6, Pete 6/4/3/4.
- **Saves:** the profile goes to **v4** with no new fields. The save code
  appends the five Park star counts and Sam's loss streak. Nothing earned
  is ever taken back, and storage that throws never stops the game.
- **Approvals:** the parent approves the crew sheet and the Park still
  before the branch merges. Ask before every merge into `main` and every
  push. Commit messages follow Conventional Commits 50/72, with no AI
  attribution trailers.
- **Work on `plan-7b-park`**, which already holds the spec. Part 2 follows
  on the same branch, and there's one merge for the whole of 7b.

## Review Focus

1. **A save from before 7b** that has beaten Biscuit lands on the Park:
   the Hub says `NEXT: BIG BRICK - THE PARK 1/4`, Results after a Biscuit
   replay offers NEXT MATCH (Park 1), not CAREER, and the road map opens
   on the Park. Pinned in Tasks 1 and 7.
2. **A v3 tab left open** can't write over a v4 save with Park stars
   (`writeUnlessNewer`), and a v3 save code still applies with no Park
   stars. Pinned in Task 3.
3. **Changing difficulty mid-match** against a crew kid applies their own
   profile for the new difficulty, not Max's. Pinned in Task 6.
4. **The steals bonus** fires BONUS DONE! on the third clean steal off
   Tia, even with no goal moment running, and never for a trapped loose
   ball or a poke. Pinned in Task 6.
5. **Tia's fake or Pete's rush never walk the ball into a goal frame or
   pin it** against a fence. The "nothing stuck" check in the crew tuning
   test covers every kid on every difficulty. Pinned in Task 8 (harness)
   and each kid's task.

---

### Task 1: The Park in the catalog

**Files:**
- Modify: `src/meta/career.ts`
- Test: `src/meta/career.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type OpponentId = 'max' | 'biscuit' | 'brick' | 'leo' | 'tia' | 'pete' | 'sam';
  export interface CareerMatch {
    id: string; venue: VenueId;
    /** 'rung' is beaten by ladderWins; 'match' and 'boss' by their stars. */
    kind: 'rung' | 'match' | 'boss';
    /** Its number in the venue: 1–10 for a rung, 1–4 for a match, 0 for a boss. */
    rung: number;
    name: string; hudName: string; opponent: OpponentId;
    /** The facts-only line under the name; null for rungs (theirs is the training line). */
    blurb: string | null;
    /** A boss's one-line nudge once he has beaten Harrison; null otherwise. */
    tip: string | null;
    bonus: BonusId;
  }
  export const PARK: Venue;                 // park-1..park-4, park-boss
  export const PARK_BOSS_ID = 'park-boss';
  export function venueMaxStars(venue: VenueId): number;   // matches × 3: 33, 15, 0...
  export function venueOpen(p: Profile, venue: VenueId): boolean;
  // Unchanged names, generalised: isBeaten, nextCareerMatch, matchState, venueStars,
  // careerStars, venueDone, allBeaten (open venues only), stopLabel, careerCardLines.
  ```
  `VENUE_STARS` goes; use `venueMaxStars('backyard')`. Its users are the
  venue and road map scenes and their tests. `BOSS_ID` stays as
  Biscuit's id.

- [ ] **Step 1: Write the failing tests** in `career.test.ts`. Replace the
  7a assertions that pin the old shape (`VENUES.slice(1)` all empty,
  `MATCH_IDS` length 11, `matchById('park-1')` undefined, `VENUE_STARS`):

```ts
const beatBiscuit = (stars: Record<string, number> = {}) => p(10, { [BOSS_ID]: 1, ...stars });

it('the Park: four crew matches, then Speedy Sam', () => {
  expect(PARK.matches.map(m => m.id)).toEqual(['park-1', 'park-2', 'park-3', 'park-4', PARK_BOSS_ID]);
  expect(PARK.matches.map(m => [m.kind, m.rung, m.name, m.hudName, m.opponent, m.bonus])).toEqual([
    ['match', 1, 'BIG BRICK', 'BRICK', 'brick', 'chip'],
    ['match', 2, 'BOOMER LEO', 'LEO', 'leo', 'cleanSheet'],
    ['match', 3, 'TRICKY TIA', 'TIA', 'tia', 'steals3'],
    ['match', 4, 'PESKY PETE', 'PETE', 'pete', 'perfect'],
    ['boss', 0, 'SPEEDY SAM', 'SAM', 'sam', 'noSamGoals'],
  ]);
  expect(PARK.matches.every(m => m.blurb !== null)).toBe(true);
  expect(matchById(PARK_BOSS_ID)?.tip).toBe("TIP: DON'T RACE HIM. MAKE HIM OVERSHOOT");
  expect(matchById(BOSS_ID)?.tip).toBe('TIP: GET BETWEEN HIM AND YOUR GOAL');
  expect(MATCH_IDS).toHaveLength(16);
  expect([venueMaxStars('backyard'), venueMaxStars('park'), venueMaxStars('school')]).toEqual([33, 15, 0]);
});

it('the Park opens when Biscuit is beaten, its matches in order', () => {
  expect(venueOpen(p(10), 'park')).toBe(false);
  expect(venueOpen(beatBiscuit(), 'park')).toBe(true);
  expect(venueOpen(beatBiscuit(), 'school')).toBe(false);
  expect(nextCareerMatch(beatBiscuit()).id).toBe('park-1');
  expect(matchState(beatBiscuit(), matchById('park-2')!)).toBe('locked');
  expect(matchState(p(10), matchById('park-1')!)).toBe('locked');
  const three = beatBiscuit({ 'park-1': 1, 'park-2': 2, 'park-3': 1 });
  expect(nextCareerMatch(three).id).toBe('park-4');
  expect(matchState(three, matchById(PARK_BOSS_ID)!)).toBe('locked');
  const four = beatBiscuit({ 'park-1': 1, 'park-2': 1, 'park-3': 1, 'park-4': 1 });
  expect(matchState(four, matchById(PARK_BOSS_ID)!)).toBe('next');
  const done = { ...four.career.stars, [PARK_BOSS_ID]: 1 };
  expect(nextCareerMatch(p(10, done)).id).toBe(PARK_BOSS_ID);   // everything beaten: Sam as a replay
});

it('a Park match is beaten by its stars, never by ladder wins', () => {
  expect(isBeaten(p(10), matchById('park-1')!)).toBe(false);
  expect(isBeaten(beatBiscuit({ 'park-1': 1 }), matchById('park-1')!)).toBe(true);
});

it('stops: the Park shows its stars once open; School says COMING SOON after Sam', () => {
  expect(stopLabel(p(10), 'park')).toBe('LOCKED');
  expect(stopLabel(beatBiscuit({ 'park-1': 3 }), 'park')).toBe('3/15');
  expect(stopLabel(beatBiscuit(), 'school')).toBe('LOCKED');
  expect(stopLabel(beatBiscuit({ [PARK_BOSS_ID]: 1 }), 'school')).toBe('COMING SOON');
});

it('the Hub card follows him into the Park', () => {
  expect(careerCardLines(beatBiscuit())).toEqual({ first: 'NEXT: BIG BRICK - THE PARK 1/4', second: "HE NEVER DIVES IN." });
  const four = beatBiscuit({ 'park-1': 1, 'park-2': 1, 'park-3': 1, 'park-4': 1 });
  expect(careerCardLines(four)).toEqual({ first: 'NEXT: SPEEDY SAM', second: 'THE PARK BOSS!' });
  expect(careerCardLines(p(10, { ...four.career.stars, [PARK_BOSS_ID]: 2 }))).toEqual({ first: 'THE PARK DONE! STARS 6/15', second: 'SCHOOL: COMING SOON' });
});

it('allBeaten counts the open venues only', () => {
  expect(allBeaten(beatBiscuit())).toBe(false);
});
```

  Keep the 7a tests for the Backyard's rungs, its boss and its Hub lines;
  they must pass unchanged, except `allBeaten` with Biscuit beaten, which
  is now false.

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/meta/career.test.ts`
  Expected: FAIL (`PARK` is not exported).

- [ ] **Step 3: Implement**

  The catalog data:
  - Blurbs: Brick `HE NEVER DIVES IN.`, Leo `HE SHOOTS FROM ANYWHERE.`, Tia
    `SHE FAKES ONE WAY, THEN GOES THE OTHER.`, Pete `HE'S ON YOU THE
    MOMENT YOU HAVE IT.`, Sam `THE FASTEST KID IN THE PARK. HIS SHOT IS
    WEAK.`, Biscuit's `HE CAN'T SHOOT. HE JUST RUNS IT IN.`, which moves
    here from `venueScene.ts`.
  - Rungs have `opponent: 'max'`, `blurb: null` and `tip: null`.

  The rules:
  - `venueOpen`: the Backyard always. Any later venue when it has matches
    and the venue before it is done.
  - `isBeaten`: by `ladderWins` for a rung, otherwise by stars ≥ 1.
  - `nextCareerMatch`: the first unbeaten match in the open venues in
    order. When everything open is beaten, the last open venue's boss.
  - `matchState`: `locked` if its venue isn't open, or it's a boss whose
    venue still has an unbeaten non-boss match. Otherwise `next` if it's
    the next match, else `locked`.
  - `allBeaten`: every match in the open venues.
  - `stopLabel`: an open venue shows `n/max`. A venue with no matches
    whose predecessor is done shows `COMING SOON`. Anything else shows
    `LOCKED`.
  - `careerCardLines`:
    - with no next unbeaten match: `${venue} DONE! STARS n/max` for the
      last open venue, and `${next venue}: COMING SOON`;
    - a boss next: `NEXT: ${name}` and `${venue name} BOSS!`;
    - a rung next: as today;
    - a match next: `NEXT: ${name} - ${venue name} ${n}/4` and its blurb.
  - `TOTAL_STARS` stays 93.

  Drop `venueScene.ts`'s `BOSS_BLURB` and `vsScene.ts`'s `BOSS_TIP` in
  favour of the catalog fields: `panelLines` uses `match.blurb ??
  trainingLine(rung)`, and `vsLines` pushes `match.tip` once the streak is
  ≥ 1. Point their tests at the catalog's text.

- [ ] **Step 4: Run the career, venue, VS, road map and Hub tests, then
  the whole suite**

  Run: `npx vitest run src/meta src/scenes && npm run typecheck`
  Expected: PASS. Fix any scene test that pinned `VENUE_STARS` or the old
  `allBeaten`.

- [ ] **Step 5: Commit**

```bash
git add src/meta/career.ts src/meta/career.test.ts src/scenes/venueScene.ts src/scenes/vsScene.ts src/scenes/*.test.ts
git commit -m "feat: add the Park to the career catalog"
```

---

### Task 2: The steals bonus and Sam's bonus

**Files:**
- Modify: `src/meta/objectives.ts`, `src/meta/economy.ts` (`MatchSummary`), `src/meta/progress.ts`
- Test: `src/meta/objectives.test.ts`, `src/meta/progress.test.ts`

**Interfaces:**
- Produces: `BonusId` adds `'steals3'` (label `WIN THE BALL WITH 3 STEALS`,
  in play) and `'noSamGoals'` (label `DON'T LET SAM SCORE`, full time,
  same rule as `noBossGoals`). `MatchSummary` and `BonusInput` gain
  `steals: number`: Harrison's clean steals (`'stole'`), not traps or
  pokes. `export const STEALS_FOR_BONUS = 3`.

- [ ] **Step 1: Write the failing tests**

```ts
it('three clean steals settle the steals bonus in play', () => {
  const s = { goalsFor: 0, goalsAgainst: 0, goals: [], result: null, steals: 2 };
  expect(BONUSES.steals3.done(s)).toBe(false);
  expect(BONUSES.steals3.done({ ...s, steals: 3 })).toBe(true);
  expect(BONUSES.steals3).toMatchObject({ label: 'WIN THE BALL WITH 3 STEALS', inPlay: true });
});
it("Sam's bonus is a clean sheet at full time, with his name", () => {
  expect(BONUSES.noSamGoals.label).toBe("DON'T LET SAM SCORE");
  expect(BONUSES.noSamGoals.done({ goalsFor: 2, goalsAgainst: 0, goals: [], result: 'win', steals: 0 })).toBe(true);
  expect(BONUSES.noSamGoals.done({ goalsFor: 2, goalsAgainst: 0, goals: [], result: null, steals: 0 })).toBe(false);
});
it('starsFor reads the steals: a 2-0 win over Tia with 3 steals is 3 stars', () => {
  expect(starsFor({ result: 'win', goalsFor: 2, goalsAgainst: 0, styleGoals: [], goals: [], steals: 3 }, 'steals3')).toBe(3);
  expect(starsFor({ result: 'win', goalsFor: 2, goalsAgainst: 0, styleGoals: [], goals: [], steals: 2 }, 'steals3')).toBe(2);
});
```
  In `progress.test.ts`: `applyMatch` on `park-3` with `steals: 3` reports
  `career.bonusDone` true. Add `steals: 0` to every existing
  `MatchSummary` literal in the tests.

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/meta/objectives.test.ts src/meta/progress.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement.** Add the two bonuses and the `steals` field.
  `starsFor` and `applyMatch`'s `bonusDone` pass `s.steals` through.
  `matchScene.ts`'s `award` passes `steals: 0` for now; Task 6 counts
  them.

- [ ] **Step 4: Run the meta and scene tests and the type check**

  Run: `npx vitest run src/meta src/scenes && npm run typecheck`
  Expected: PASS.

- [ ] **Step 5: Commit** with `feat: add the steals bonus and Sam's bonus`.

---

### Task 3: Profile v4 and the save code

**Files:**
- Modify: `src/meta/profile.ts`, `src/meta/saveCode.ts`, `src/scenes/saveCodeScene.ts` (`MAX_ENTRY`)
- Test: `src/meta/profile.test.ts`, `src/meta/saveCode.test.ts`, `src/scenes/saveCodeScene.test.ts`

**Interfaces:**
- Produces: `Profile.version: 4`. The save code appends
  `...PARK.matches.map(stars)` and `lossStreaks[PARK_BOSS_ID]` after the v3
  fields, and the decoder reads them back into `career.stars` (Backyard
  and Park ids) and `career.lossStreaks` (both bosses).

- [ ] **Step 1: Write the failing tests**
  - A v3 save with `career.stars` holding `park-2: 3` loads at version 4
    and keeps it, because Park ids are catalog ids. A v3 save without Park
    ids loads with no Park stars.
  - `saveProfile` of a v4 profile writes over a stored v3 save. A v3
    `writeUnlessNewer` (a stored `{ version: 4 }` and an incoming v3
    profile) leaves the stored save alone. Use the storage test's existing
    pattern.
  - Round trip: a profile with Park stars 3/2/1/3/1 and Sam's streak 2
    encodes and decodes to the same Park stars and streak.
  - A v3-era code (the existing fixture, or one encoded without the six
    new fields) applies with no Park stars.
  - The longest-code test in `saveCodeScene.test.ts` maxes the new fields
    (Park stars 3, Sam's streak 99) and still fits `MAX_ENTRY` and the
    screen's four lines.

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/meta/profile.test.ts src/meta/saveCode.test.ts src/scenes/saveCodeScene.test.ts`
  Expected: FAIL on the version and the round trip.

- [ ] **Step 3: Implement.** Set `VERSION = 4` and the type to `version:
  4`, with a comment that v4 adds no fields and exists so a v3 tab can't
  drop Park stars. Add the save-code fields with a `// v4:` comment like
  v3's. Raise `MAX_ENTRY` to the smallest round number that fits the
  longest code, about 140.

- [ ] **Step 4: Run the whole suite and the type check**

  Run: `npm test && npm run typecheck`
  Expected: PASS.

- [ ] **Step 5: Commit** with `feat: move the profile to v4 for the Park`.

---

### Task 4: The Park's art

**Files:**
- Create: `src/art/venues/park.ts`, `src/art/venues/park.test.ts`
- Modify: `src/art/venues/backyard.ts` (export the shared pitch helper and layer widths), `src/scenes/art.ts`, `src/scenes/matchView.ts` (`drawLayers`), `src/scenes/backdrop.ts`, `src/scenes/roadMapScene.ts`, `src/scenes/venueScene.ts`, `src/scenes/vsScene.ts`, `src/scenes/matchScene.ts`
- Test: the scenes' existing tests

**Interfaces:**
- Produces:
  ```ts
  // park.ts
  export function parkLayers(): VenueLayers;              // same sizes as backyardLayers()
  /** A jogger's two run frames, in master ids, with this shirt and hair. ~7×10 px, facing right. */
  export function joggerFrames(shirt: MasterColor, hair: MasterColor): readonly [IndexedImage, IndexedImage];
  export interface Jogger { shirt: MasterColor; hair: MasterColor; speed: number; dir: 1 | -1; startX: number }
  export const JOGGERS: readonly Jogger[];                 // 3 joggers, builder's colours and pace
  /** The path's screen row the joggers' feet stand on (mid layer). */
  export const PATH_Y: number;
  // backyard.ts
  export function pitchGround(endFence: (img: IndexedImage, x0: number, x1: number) => void): IndexedImage;
  export const MID_W = 496, NEAR_W = 600;
  // art.ts
  GameArt.venues: Partial<Record<VenueId, VenueCanvases>>;  // backyard and park
  export interface VenueCanvases { layers: Record<keyof VenueLayers, HTMLCanvasElement>; joggers: readonly (readonly [HTMLCanvasElement, HTMLCanvasElement])[] }
  // matchView.ts
  export function drawLayers(g: CanvasRenderingContext2D, cam: Camera, art: GameArt, venue: VenueId = 'backyard', nowS = 0): void;
  ```
  `GameArt.layers` goes away. `drawLayers` falls back to the Backyard for
  a venue with no art. Joggers draw on the mid layer's parallax, moving at
  `speed` px/s from `startX` in `dir`, wrapping over `MID_W`, two-frame
  run at about 8 fps.

- [ ] **Step 1: Write the failing tests** in `park.test.ts`, mirroring
  `backyard.test.ts`:
  - each layer is the same size as the Backyard's;
  - `far` tiles seamlessly (its first and last columns match as the
    Backyard test checks), and its top rows are `sky`;
  - `near` has a hedge in the grass greens along the row just above the
    far touchline, and no `wood`;
  - `ground` has hedge greens, not `wood`, in the end-fence columns (x
    0–4 and 636–640 at the near board), and its pitch stripes equal the
    Backyard's;
  - `joggerFrames` gives two different frames of at most 12 px height,
    each with the given shirt colour, and every jogger in `JOGGERS` has a
    different shirt.
  - In `matchView.test.ts` or `venueScene.test.ts`: `drawLayers` with
    `'park'` draws the Park's far layer (a test context's canvas records
    which canvas was drawn, as existing scene tests do).

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/art/venues/park.test.ts`
  Expected: FAIL (module missing).

- [ ] **Step 3: Implement** the layers as mockup A, from the spec's *The
  Park's look*:
  - **far:** sky fading paler down, with three puffy clouds, kept off the
    tiling seam.
  - **mid:** rolling hills, a row of small far trees, the gravel path at
    `PATH_Y`, three big leafy trees, a bench and a lamp.
  - **near:** a bumpy hedge about 8 px tall on the far touchline.
  - **ground:** `pitchGround` with an end hedge in the end-fence footprint,
    the same x 0–4 and 636–640 faces, drawn like the fence's visible faces
    but in hedge greens.

  The brainstorm mockup script is a reference for shapes and colours:
  `park-looks.mts` in the 7b brainstorm session's scratchpad, if it still
  exists. Its PNGs are in `.superpowers/brainstorm/` on this machine.

  Then wire the venue through:
  - the match draws `match.venue`, carried on `MatchHud.venue`;
  - the venue screen's backdrop draws its own venue (`drawBackdrop(g,
    art, nowS, venue)`);
  - the VS card draws the match's venue;
  - the road map's postcard for each open venue draws that venue's
    layers, and the map's dimmed backdrop stays the Backyard;
  - the Hub's backdrop stays the Backyard.

- [ ] **Step 4: Run the tests and look at it.** Run `npm test && npm run
  typecheck`, expecting PASS. Then render a 320×180 still of the Park with
  Harrison and the stand-in away player, using the sheet tool's
  `backyardView` pattern with a `parkView`, and Read the PNG. Check it
  matches mockup A's feel: the hedge reads, the joggers read, and nothing
  clashes with the players.

- [ ] **Step 5: Commit** with `feat: draw the Park, with joggers`.

---

### Task 5: The crew's art, and the parent's approval

**Files:**
- Create: `src/art/opponents/crew.ts`, `src/art/opponents/crew.test.ts`, `src/game/crew.ts` (just `CrewId` for now; Task 6 fills it in)
- Modify: `src/art/colors.ts` (new colours), `src/art/colors.test.ts` (cap), `src/art/kits.ts` (crew kits), `src/art/body/proportions.ts` (`BRICK_BODY`), `src/scenes/art.ts`, `tools/render-sheet.ts`

**Interfaces:**
- Consumes: `OpponentId` (Task 1).
- Produces:
  ```ts
  // src/game/crew.ts: the one definition
  export type CrewId = 'brick' | 'leo' | 'tia' | 'pete';
  // src/art/opponents/crew.ts
  export const CREW_HEADS: Readonly<Record<CrewId, Record<HeadFacing, HeadSprite>>>;
  export function crewLook(id: CrewId): LookColors;
  export const CREW_BODY: Readonly<Record<CrewId, BodyProportions>>;   // HARRISON_BODY except Brick's BRICK_BODY
  // art.ts
  GameArt.opponents: Record<Exclude<OpponentId, 'biscuit'>, { sprites: SpriteSet; face: HTMLCanvasElement }>;
  // 'max' replaces GameArt.away and GameArt.maxFace; 'sam' is Pete's art until part 2.
  ```
  Task 6 names `Exclude<OpponentId, 'biscuit'>` as `HumanOpponentId` in
  `src/game/opponents.ts`. Once it exists, `art.ts` uses that name.

- [ ] **Step 1: Write the failing tests** in `crew.test.ts`, on the pattern
  of `max.test.ts`:
  - each head in each facing is 8–10 px tall, with its neck inside the
    image;
  - each kid's frames stay within 13 colours;
  - no two kits share a jersey colour, and none is Harrison's `red` or
    Max's `blue`;
  - skin tones vary: at least three different `Skin` colours across the
    four kids and Max;
  - Tia's side head is wider than its face, for the ponytail;
  - `CREW_BODY.brick` is wider than `HARRISON_BODY` in torso and thigh, and
    standing hip height is the same, so the feet and anchor don't move.
  - Raise the palette test's cap from 48 to 64, with a comment: around 40
    was the main spec's guide, and the crew's skin tones and kits need
    more.

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/art/opponents/crew.test.ts src/art/colors.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Draw them.** Head grids use `ART_LEGEND`, like Max's. The
  looks, from the spec and the designer's call:
  - **Brick:** big and stocky, buzz cut (hair only a pixel or two above
    the brow), dark brown skin.
  - **Leo:** curly hair, a mid skin tone.
  - **Tia:** a ponytail behind (the side and three-quarter heads run a
    pixel or two wider), light skin.
  - **Pete:** messy, spiky hair, freckles if they read at this size.

  Add the master colours this needs: two more skin tones, each with a
  shadow, base, light and lip, and kit colours for four distinct kits.
  Kits are colours only, no logos. `BRICK_BODY` widens the thighs, torso
  and upper arms by about a pixel and keeps every length.

  In `art.ts`, bake each kid with their own body. Replace `away` and
  `maxFace` with `opponents.max`, updating `matchView.drawPlayer` (Task 6
  passes the sprites in), `vsScene` and `venueScene`. For now, keep the
  Max sprites the default in `drawPlayer` until Task 6.

  In `tools/render-sheet.ts`, add a crew row (faces, three head facings,
  idle, run and shoot frames per kid in their kit) and a Park still, the
  Task 4 `parkView` at 320×180 with Harrison and two crew kids on it.

- [ ] **Step 4: Run the tests and render the sheet**

  Run: `npm test && npm run typecheck && npm run sheet`
  Expected: PASS, and `preview/character-sheet.png` written. Read it and
  fix anything that clashes before sending it.

- [ ] **Step 5: Commit** with `feat: draw the Park crew`.

- [ ] **Step 6: The parent's approval.** Send the sheet and the Park still
  with SendUserFile (crop the crew rows and the still into one PNG if the
  whole sheet is large). Include one line per kid naming their look and
  how they play, and say that Sam comes in part 2. Carry on with Tasks 6–11
  meanwhile; nothing merges until the parent approves. Iterate on any
  change they ask for, and send it again.

---

### Task 6: The match plays the catalog's opponent

**Files:**
- Create: `src/game/crew.ts`, `src/game/opponents.ts`, `src/game/opponents.test.ts`
- Modify: `src/game/ai.ts` (`AiProfile.style`, `DIFFICULTY` gains `style: 'allRound'`), `src/game/maxScripts.ts` (`HARRISON_SCRIPT.style`), `src/scenes/matchScene.ts`, `src/scenes/matchView.ts` (`MatchHud.awaySprites`, `MatchHud.venue`), `src/scenes/vsScene.ts`, `src/scenes/venueScene.ts`
- Test: `src/scenes/matchScene.test.ts`, `src/scenes/vsScene.test.ts`, `src/scenes/venueScene.test.ts`

**Interfaces:**
- Consumes: `CareerMatch.opponent` (Task 1), `BonusInput.steals` (Task 2), `GameArt.opponents` and `GameArt.venues` (Tasks 4–5).
- Produces:
  ```ts
  // ai.ts
  export type Style = 'allRound' | 'blocker' | 'shooter' | 'dribbler' | 'presser';
  AiProfile.style: Style;
  // crew.ts
  export type CrewId = 'brick' | 'leo' | 'tia' | 'pete';
  export const CREW_STATS: Readonly<Record<CrewId, Readonly<Stats>>>;
  /** Mutable like DIFFICULTY, so headless sweeps can tune them at runtime. */
  export const CREW_PROFILES: Record<CrewId, Record<Difficulty, AiProfile>>;
  // opponents.ts
  export type HumanOpponentId = 'max' | CrewId | 'sam';
  export function opponentStats(id: HumanOpponentId, rung: number): Stats;     // max: maxStats(rung); sam: Pete's until part 2
  export function opponentProfile(id: HumanOpponentId, d: Difficulty): AiProfile;  // max: DIFFICULTY[d]; sam: Pete's until part 2
  // matchView.ts
  MatchHud.awaySprites: SpriteSet; MatchHud.venue: VenueId;
  ```
  Each crew profile starts as `{ ...DIFFICULTY[d], style }`, with the
  kid's style (`blocker`, `shooter`, `dribbler` or `presser`). Tasks 8–11
  tune them. Sam's stand-in carries a `// Stand-in until Sam lands (part
  2)` comment, as Biscuit's did.

- [ ] **Step 1: Write the failing tests**
  - `opponents.test.ts`:
    - `opponentStats('max', 7)` equals `maxStats(7)`;
    - `opponentProfile('max', d)` is `DIFFICULTY[d]` for each difficulty;
    - each crew kid's stats match the Global Constraints;
    - each crew profile's style is its kid's;
    - every crew profile keeps Max's `braceSense` and `backOffS` per
      difficulty;
    - Easy ≥ Normal ≥ Hard for `reactionS`, `aimErrorDeg`, `cleanSteal`
      and `wrongFootedS`, and Easy ≤ Normal ≤ Hard for `paceFactor`.
  - In a Leo world, the fair rules hold with no new code:
    - a steal tap on his ball uses `CREW_PROFILES.leo[d].cleanSteal`;
    - Harrison running at his own goal with the ball inside the keep-out
      zone shields it (`keepingOut`);
    - at Harrison's kickoff Leo holds his own `kickoffSpot`.
  - `matchScene.test.ts`:
    - a match on `park-2` builds Leo's world: `world.away.stats` are
      Leo's, `world.maxProfile` is `CREW_PROFILES.leo[difficulty]`, the
      HUD reads `LEO`, `hud.venue` is `'park'`, and `hud.awaySprites` is
      Leo's set;
    - changing difficulty in Options mid-match sets Leo's profile for the
      new difficulty (Review Focus 3);
    - a rung match still builds Max at `maxStats(rung)` with
      `DIFFICULTY[d]`.
  - The steals bonus (Review Focus 4):
    - in a `park-3` match, three ticks with `world.events.steal ===
      'stole'` set `hud.bonusCallout` to BONUS DONE! on the third, with no
      goal moment, and play `'star'` once;
    - `'trapped'` and `'poked'` never count;
    - the summary at full time carries `steals: 3`.

    Stage the events the way the existing bonus tests stage goals.
  - `vsScene.test.ts`: the `park-1` card says `MATCH 1` / `HARRISON VS BIG
    BRICK` and draws Brick's idle sprite. The `park-boss` card says `THE
    PARK BOSS` / `HARRISON VS SPEEDY SAM` and plays `bossSting`.
  - `venueScene.test.ts`: the Park's panel lines for `park-2` are `MATCH 2
    - BOOMER LEO`, `HE SHOOTS FROM ANYWHERE.`, `BONUS: KEEP A CLEAN SHEET`.
    Four nodes sit in a row and the boss node uses the Sam stand-in's face.

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/game/opponents.test.ts src/scenes`
  Expected: FAIL.

- [ ] **Step 3: Implement**
  - `matchScene`:
    - build the world from `opponentStats` and `opponentProfile` for any
      human opponent, and the dog for `opponent === 'biscuit'`, which is
      the existing `boss` path keyed on the opponent now, not on `kind`;
    - Options' difficulty change re-reads `opponentProfile(match.opponent,
      d)`;
    - count `'stole'` events into `steals`. When the bonus is `steals3` and
      becomes done, owe the callout. Show an owed callout as soon as no
      goal moment is running, so a steal shows at once and a goal's bonus
      still waits for its moment: extract the existing "show if owed" step
      into one function called in both places;
    - pass `steals` into `award`.
  - `matchView.drawPlayer`: draw the away player with `hud.awaySprites`.
    The power and impact silhouettes use the same set.
  - `vsScene`: draw `art.opponents[opponent]`'s idle frame for a human
    opponent.
  - `venueScene`:
    - face from `art.opponents[opponent].face` (Biscuit's for him), in
      silhouette while locked, as now;
    - node x positions spread evenly for the venue's non-boss matches:
      the Backyard's ten keep today's x;
    - the boss node draws the boss's face, Biscuit or Sam.

- [ ] **Step 4: Run the whole suite and the type check**

  Run: `npm test && npm run typecheck`
  Expected: PASS, with `maxTuning` and `dogTuning` unchanged.

- [ ] **Step 5: Commit** with `feat: play the Park crew in career matches`.

---

### Task 7: The career screens in the Park

**Files:**
- Modify: `src/scenes/roadMapScene.ts`, `src/scenes/resultsScene.ts`, `src/scenes/hubScene.ts` (only if it pins Backyard text)
- Test: `src/scenes/roadMapScene.test.ts`, `src/scenes/resultsScene.test.ts`, `src/scenes/hubScene.test.ts`

**Interfaces:**
- Consumes: `venueOpen`, `stopLabel`, `careerCardLines`, `nextCareerMatch`, `allBeaten` (Task 1).

- [ ] **Step 1: Write the failing tests**
  - Road map:
    - with Biscuit beaten, A on the Park opens the Park's venue screen,
      and the Park's card is a postcard;
    - before that, A on the Park blips;
    - after Sam is beaten, the School's label is COMING SOON and A on it
      still blips;
    - `createRoadMapScene(ctx)` with no index puts the cursor on the stop
      holding `nextCareerMatch` (Review Focus 1).
  - Results `careerLine`:
    - first win at `park-1` gives `MATCH 1 BEATEN!`;
    - first win at `park-4` gives `SPEEDY SAM AWAITS!`;
    - first win over Sam gives `SAM BEATEN! THE PARK DONE!`;
    - first win over Biscuit still gives `BISCUIT BEATEN! BACKYARD DONE!`;
    - a loss to Brick gives `BRICK TAKES THIS ONE. GO AGAIN!`.
  - Results menu: after a first win over Biscuit, the first item is NEXT
    MATCH and choosing it starts `park-1` through the VS card (Review
    Focus 1). After the first win over Sam it's CAREER.
  - Hub: a profile with Biscuit beaten shows `NEXT: BIG BRICK - THE PARK
    1/4`.

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/scenes/roadMapScene.test.ts src/scenes/resultsScene.test.ts src/scenes/hubScene.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement.**
  - **Road map:** `isOpen` becomes `venueOpen(p, venue.id)`, and the
    default cursor is the next match's venue. Callers that pass an index
    keep it.
  - **`careerLine`:**
    - champion as today;
    - first win over a boss: `${hudName} BEATEN! ${venue name} DONE!`;
    - first win over the last numbered match of a venue with a boss
      (`kind: 'match'`): `${boss name} AWAITS!`;
    - otherwise as today.

- [ ] **Step 4: Run the whole suite and the type check**

  Run: `npm test && npm run typecheck`
  Expected: PASS.

- [ ] **Step 5: Commit** with `feat: lead the career screens into the Park`.

---

### Task 8: Styles, Big Brick, and the crew tuning harness

**Files:**
- Create: `src/game/styles.ts`, `src/game/styles.test.ts`, `src/game/crewTuning.test.ts`
- Modify: `src/game/ai.ts` (decision points call the style), `src/game/maxScripts.ts` (generalise, record traits), `src/game/crew.ts` (Brick's profile)
- Test: also `src/game/maxTuning.test.ts` (must pass unchanged)

**Interfaces:**
- Produces:
  ```ts
  // styles.ts
  /** Where it stands while the opponent has the ball. allRound: Max's spot, as today. */
  export function defendSpot(style: Style, w: World, me: Player, defending: Goal): { x: number; z: number };
  export const BLOCKER = { cover: 0.5, minAhead: 24, offLine: 48 };   // starting values
  // maxScripts.ts
  export interface Matchup { stats: Stats; profile: AiProfile }
  export interface Traits {
    /** Distance from the goal line it attacks at each of its shots and chips, px. */
    shotsFrom: number[];
    slides: number;
    /** Mean distance from its own goal line while Harrison has the ball, px. */
    defendDepth: number;
    /** Mean distance from the ball while Harrison has it, px. */
    pressGap: number;
    /** Fakes started (the dribbler's). */
    fakes: number;
  }
  export interface OpponentMatch extends MaxMatch { traits: Traits }
  export function harrisonStatsFor(opponent: Stats): Stats;          // each stat +1, capped; harrisonStats(rung) uses it
  export function playMatchup(m: Matchup, seed: number): OpponentMatch;
  export function opponentMatch(id: HumanOpponentId, d: Difficulty, seed: number, rung?: number): OpponentMatch;
  // maxMatch(d, seed, rung) = opponentMatch('max', d, seed, rung)
  ```
  Recording traits must not draw from any RNG or change the order of
  steps, so `maxMatch`'s results stay identical: `maxTuning.test.ts`
  passes with the same rates.

- [ ] **Step 1: Write the failing tests**
  - `styles.test.ts`, a staged world (`createWorld` plus positions set by
    hand, as `ai.test.ts` does). Harrison is on the ball at x 400, z 20,
    running right at the away goal. Then:
    - `defendSpot('allRound', ...)` is the spot Max's `decide` uses today:
      `ball.x + DEFEND_OFFSET` and a third of the way across in depth;
    - `defendSpot('blocker', ...)` sits at least 30 px deeper (closer to
      his own goal line) than allRound's, and at least `BLOCKER.offLine`
      off the line;
    - its z lies on the line from the ball to his goal's centre, within
      1 px;
    - with the ball 40 px from his goal line, the blocker's spot stays
      `BLOCKER.offLine` off the line, never on it.
  - In `ai.test.ts`: a blocker brain whose opponent has the ball
    moves toward `defendSpot('blocker', ...)`. A Max brain does exactly
    what it did. The existing `ai.test.ts` cases pass unchanged.
  - `crewTuning.test.ts`, written as a `describe.each` over the crew so
    each later kid only adds its id. Rung 10's stats aren't used: each kid
    plays at their own stats. Seeds 100–163, the scripted Harrison
    `harrisonStatsFor(kid)`:
    - Easy in [0.7, 0.9], Normal in [0.5, 0.7];
    - Hard ≤ `MAX_HARD_CEILING`, set from Max's measured Hard (about
      0.02): use 0.1;
    - Easy ≥ Normal ≥ Hard;
    - every match has a result and `longestStillS ≤ 4`, on all three
      difficulties;
    - **the personality check**, Brick: over the Normal seeds,
      `defendDepth` is at least 30 px less than Max's (Max's profile
      `DIFFICULTY.normal` at Brick's stats, through `playMatchup`), and
      his slides are at most half of Max's.

    Start the list with `['brick']` only.

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/game/styles.test.ts src/game/crewTuning.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement**
  - `styles.ts` with `defendSpot`. `ai.ts`'s defend branch calls it in
    place of its inline spot. Only a blocker's spot moves.
  - The blocker never stands within `BLOCKER.offLine` of his line, and
    stays at least `BLOCKER.minAhead` goal-side of the ball. His z is on
    the ball-to-goal-centre line at that x, so he's in the shot's lane.
    His low sliding comes from his profile's `aggression`.
  - Generalise `maxScripts.ts` to `playMatchup` and record `Traits` from
    the world each tick:
    - `w.events.kicks` for the away side's shots and chips, and where they
      started;
    - the away player entering `sliding`;
    - the depth and gap while `maxHasBall(w.home, ...)`, Harrison's ball;
    - `brain.fakes` (Task 10 adds the counter, so read 0 until then).

  Then **tune Brick**: sweep his `CREW_PROFILES.brick[d]` at runtime from
  a scratch `npx tsx` script (the `DIFFICULTY` sweep technique), starting
  from Max's dials with `aggression` about a third of Max's and
  `shootRange` about 200. Move `reactionS`, `paceFactor`, `aggression`,
  `cleanSteal`, `wrongFootedS` and `kickoffSpot` until Easy, Normal and
  Hard sit in their bands. Write the values into `crew.ts` with the
  measured rates in a comment. If the bands can't be reached without
  breaking his personality, stop and report the numbers. Don't widen the
  bands.

- [ ] **Step 4: Run the whole suite and the type check**

  Run: `npm test && npm run typecheck`
  Expected: PASS. `maxTuning.test.ts` gives the same rates as before (log
  them once to compare: Easy 0.859, Normal 0.641, Hard 0.016 at rung 10 on
  64 seeds).

- [ ] **Step 5: Commit** with `feat: Big Brick defends deep, measured in CI`.

---

### Task 9: Boomer Leo, the long-range shooter

**Files:**
- Modify: `src/game/styles.ts`, `src/game/ai.ts` (the has-ball branch asks the style how long to charge), `src/game/crew.ts`, `src/game/crewTuning.test.ts`
- Test: `src/game/styles.test.ts`, `src/game/ai.test.ts`

**Interfaces:**
- Produces: `export function chargeHold(style: Style, rng: () => number): number`.
  allRound gives `CHARGE_MIN_S + rng() * CHARGE_SPREAD_S` exactly as
  today, with the same single draw. The shooter's `SHOOTER_CHARGE = {
  from: 0.55, spread: 0.3 }` is a fuller wind-up, also one draw.

- [ ] **Step 1: Write the failing tests**
  - `ai.test.ts`, a staged world: Leo on the ball 300 px from the goal he
    attacks plans `'charge'` (his `shootRange` starts at Easy 300, Normal
    320, Hard 340), and Max at the same spot plans `'dribble'`.
  - `styles.test.ts`: `chargeHold('shooter', () => 0)` is 0.55, and
    `chargeHold('allRound', () => 0)` equals `CHARGE_MIN_S`.
  - `crewTuning.test.ts`: add `'leo'` to the list. His personality check:
    the mean of `shotsFrom` over the Normal seeds is at least 80 px more
    than Max's at Leo's stats.

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/game/styles.test.ts src/game/ai.test.ts src/game/crewTuning.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement** `chargeHold`, call it in `decide`'s charge
  branch, and set Leo's `shootRange`. Then tune Leo into the bands as in
  Task 8 Step 3. A steal works on his ball while he winds up: `maxHasBall`
  counts a charging player. Check with one staged test that a steal tap
  during his charge takes the ball and cancels his shot.

- [ ] **Step 4: Run the whole suite and the type check**

  Run: `npm test && npm run typecheck`
  Expected: PASS.

- [ ] **Step 5: Commit** with `feat: Boomer Leo shoots from anywhere`.

---

### Task 10: Tricky Tia, the dribbler

**Files:**
- Modify: `src/game/styles.ts`, `src/game/ai.ts` (`AiBrain.fake`, `fakeReadyS`, `fakes`; `think` runs a fake tick by tick, as it does the back-off), `src/game/crew.ts`, `src/game/crewTuning.test.ts`
- Test: `src/game/styles.test.ts`, `src/game/ai.test.ts`

**Interfaces:**
- Produces:
  ```ts
  AiBrain.fake: null | { side: 1 | -1; t: number };   // side: +1 deeper, −1 nearer, the way she leans first
  AiBrain.fakeReadyS: number;
  /** Fakes started this match, for the personality check. */
  AiBrain.fakes: number;
  export const FAKE = { trigger: 30, lane: 10, leanS: 0.25, leanPace: 0.6, cutS: 0.35, cooldownS: 1.2 };   // starting values
  /** Her move this tick while faking: lean one way in depth, then cut the other way past him; null once it's over. */
  export function fakeMove(fake: { side: 1 | -1; t: number }, dir: 1 | -1): { moveX: number; moveZ: number; pace: number } | null;
  ```

- [ ] **Step 1: Write the failing tests**
  - `ai.test.ts`, a staged world: Tia dribbling left at goal, Harrison
    standing 24 px ahead in her lane.
    - Within `reactionS` she starts a fake (`brain.fake` set, `fakes` 1).
    - Over the next `FAKE.leanS` her z moves toward `side`, then over
      `FAKE.cutS` it moves the other way, past where it started.
    - She ends past Harrison's x with the ball still at her feet
      (`maxHasBall`).
  - A slide aimed along her starting line, launched as her cut begins,
    doesn't win the ball. Stage Harrison sliding with `chipHeld` at the
    cut's first tick, and assert she still has the ball afterwards. There
    are no dice in this: it's her position.
  - With nobody ahead she never fakes. `fakeReadyS` blocks a second fake
    for `FAKE.cooldownS`.
  - `crewTuning.test.ts`: add `'tia'`. Her personality check: `fakes`
    average at least 2 per Normal match, and Max's is 0.

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/game/ai.test.ts src/game/crewTuning.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement** the fake.
  - **Start:** in `decide`'s dribble branch, for a `dribbler` whose
    opponent stands within `FAKE.trigger` ahead and `FAKE.lane` of her
    line, with `fakeReadyS` 0. `side` is `roomySide`.
  - **Run:** `think` drives `fakeMove` every tick until it returns null,
    then lets `decide` resume.
  - **Stop:** a fake ends early if she loses the ball.
  - **Shooting:** her `shootRange` starts at about 110, so she shoots
    only from close in. Her `aggression` is a little under Max's.

  Then tune her into the bands as in Task 8 Step 3.

- [ ] **Step 4: Run the whole suite and the type check**

  Run: `npm test && npm run typecheck`
  Expected: PASS.

- [ ] **Step 5: Commit** with `feat: Tricky Tia fakes one way and goes the other`.

---

### Task 11: Pesky Pete, the presser

**Files:**
- Modify: `src/game/styles.ts` (`defendSpot('presser')`, `pressSprint`), `src/game/ai.ts`, `src/game/crew.ts`, `src/game/crewTuning.test.ts`
- Test: `src/game/styles.test.ts`, `src/game/ai.test.ts`

**Interfaces:**
- Produces: `defendSpot('presser', ...)` is the ball itself, approached
  from his side of it. `export function pressSprint(style: Style, dist:
  number, stamina: number): boolean` is true for a presser at any distance
  with stamina above `SPRINT_MIN_STAMINA`. allRound keeps today's rule
  (`dist > SPRINT_DISTANCE`).

- [ ] **Step 1: Write the failing tests**
  - `styles.test.ts`:
    - with Harrison on the ball 200 px from Pete's goal,
      `defendSpot('presser', ...)` is within 8 px of the ball;
    - `pressSprint('presser', 30, 0.9)` is true, and
      `pressSprint('allRound', 30, 0.9)` is false.
  - `ai.test.ts`: a staged Pete reaches Harrison's ball sooner than a Max
    at the same stats from the same start, measured in ticks.
  - `crewTuning.test.ts`: add `'pete'`. His personality check: `pressGap`
    at least 20 px less than Max's at Pete's stats, and slides at least
    Max's.

- [ ] **Step 2: Run them to see them fail**

  Run: `npx vitest run src/game/styles.test.ts src/game/ai.test.ts src/game/crewTuning.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement**, then tune Pete into the bands as in Task 8
  Step 3. Start from Max's dials with faster reactions (E 0.18 / N 0.13 /
  H 0.09) and more aggression (E 0.5 / N 0.7 / H 0.9). A drag-back or a
  turn as he arrives should leave him behind: that comes from his
  committing run and needs no special code. If the Normal band can't be
  reached, report the numbers. Check that each kid is a little stronger
  overall than the one before: on Normal, against one fixed scripted
  Harrison (Brick's `harrisonStatsFor`), Pete's win rate for that Harrison
  is no higher than Brick's. Log it, don't pin it.

- [ ] **Step 4: Run the whole suite and the type check**

  Run: `npm test && npm run typecheck`
  Expected: PASS.

- [ ] **Step 5: Commit** with `feat: Pesky Pete presses and slides`.

---

### Task 12: The parent's playtest of part 1

**Files:** none new. Notes go in the memory note.

- [ ] **Step 1: Run the whole suite, the type check and the build**

  Run: `npm test && npm run build`
  Expected: PASS, with the test count up from 1032.

- [ ] **Step 2: Start the dev server** for the parent:
  `npx vite --port 5179 --strictPort --host 127.0.0.1` (check `ss -ltnp |
  rg 5179` first). Tell them how to reach the Park quickly: a save code
  with Biscuit beaten, or the DEV `window.__soccer` hooks. Ask them to try
  each kid on Normal. The questions for them:
  - Does each kid feel different?
  - Is anyone unfair?
  - Does the Park look right?

  Sam is still Pete's stand-in.

- [ ] **Step 3: Fold in their feedback,** each change as its own commit
  with tests, re-running `crewTuning.test.ts`. Record the art approval and
  any tuning calls in the memory note, and add the measured rates to the
  spec as an "As built" note under *Measuring the crew*.

- [ ] **Step 4: Hand off to part 2.** Update
  `harrison-soccer-status.md`: the branch, what's done, the stand-in, and
  that `2026-10-27-speedy-sam.md` is next, in a fresh session. Don't merge
  or push. 7b ships in one merge after part 2.
