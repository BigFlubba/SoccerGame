# The Locker Room, First Round — Design

Amends `2026-10-22-harrison-soccer-design.md` (the main spec), the
milestones in `2026-10-26-career-spine-design.md`, and follows
`2026-10-27-roadmap-after-the-park-design.md` (the roadmap), whose third
next plan this is. Where they disagree, this document wins. Anything it
doesn't touch still stands.

## Intent

Save slots and Stamina are live (`main` at `a22a113`, profile v5).
After the Park, Harrison asked to customize his look. He didn't name
anything: he wants "cool" cosmetics for his character, the kind most
games have now. This plan gives him a **Locker Room** off the Hub where
he buys and wears kits, boots and extras with his coins, and earns a few
special items from his career stars.

What would make it a failure:

- his hair or face changes, beyond the glasses and headband approved on
  the sheet;
- anything he's bought or earned is lost, or a fresh save isn't fresh;
- a cosmetic changes how anything plays;
- he can't tell himself from his opponent because the kits clash;
- coins go on something he didn't mean to buy;
- the flashy effects make a match stutter.

## What was decided

By the parent, in this brainstorm (2026-10-28):

- **The balance:** everyday items cost a match or two of winnings; a
  few flashy ones take real saving up, so they compete with upgrades
  without stalling them.
- **Milestones give gifts.** Each star milestone (10, 25, 50, 75) also
  unlocks one item that is never for sale, worked out from the
  milestones the save has already been paid. A save past 10 and 25
  stars finds both gifts waiting.
- **Kit clashes:** when Harrison's kit clashes with his opponent's,
  the **opponent changes** into a plain change kit, as in real football.
- **The mockups were approved** ("they look pretty cool"): the Hub with
  LOCKER ROOM, the room's KITS and BOOTS tabs with try-on, the buy
  confirm, and the starter catalogue.
- **The flashy items animate** (the parent asked for it): the four
  flashy kits shimmer or burn, the three trail boots crackle on every
  step as well as trailing, and the room cheers when he puts something
  on. The animated studies were approved ("The looks GREAT").
- **The character sheet was approved** ("this all looks great"): the
  glasses, headband, wristbands and captain's armband on his sprite,
  heads and portrait, and the opponents' change kits.
- **The rest was played back and approved** ("Nothing is wrong or
  missing"): where his look shows, the Hub's NEW tag, the Results line,
  number 12 on his locker, the clash list and the save.

**The designer's calls, shown to the parent and not objected to:**

- **Headband B:** the band sits high on his head with his fringe
  hanging out below it. Option A (under the fringe, showing only at the
  sides) kept every hair pixel but barely read as a headband. The
  parent was asked to pick, approved the sheet without picking, and was
  told B stands unless they say otherwise.
- He **buys and wears in the Locker Room**; the Shop keeps the stats
  and power moves.
- He owns his club's **red home and black away kits, volt boots and his
  own glasses** from the start. The glasses start off.
- **Extras stack:** any mix can be worn at once.
- The **headband and wristbands take the kit's trim colour**, so they
  always match. The armband is captain's gold.
- **His portrait stays still:** it shows his kit colours, glasses and
  headband, with no shimmer.
- **The prices and the catalogue** below, as mocked.

## The catalogue

23 items in three tabs: 10 kits, 9 boots and 4 extras. *Starter* items are owned from the start;
*gifts* are earned at a star milestone and never sold.

### Kits

Every kit is a number 12 kit. Colours are master colour names, in
`KitSlots` order: jersey shadow / jersey / jersey light, trim shadow /
trim, shorts shadow / shorts, socks shadow / socks.

| Kit | How he gets it | Jersey | Trim | Shorts | Socks | Clash family | Animated |
|---|---|---|---|---|---|---|---|
| HOME | starter | redDark red redLight | silver white | redDark red | redDark red | red | |
| AWAY | starter | charcoal slate gray | silver white | charcoal slate | charcoal slate | black | |
| WHITE | 200 | silver white white | navy navy | navy navy | silver white | white, light | |
| SKY | 200 | blueLight sky skyLight | silver white | silver white | blueLight sky | blue | |
| PURPLE | 200 | violetDark violet violetLight | silver white | violetDark violet | violetDark violet | purple | |
| NAVY | 250 | ink navy blue | goldDark gold | ink navy | ink navy | blue | |
| BLACK GOLD | 1000 | charcoal slate gray | goldDark energyGold | charcoal slate | goldDark gold | black | gold shine |
| ICE | 1200 | electric electricLight white | blue electric | silver white | electric electricLight | blue, light | frost shine and sparkles |
| INFERNO | 1500 | flameDark flame flameLight | gold energyGold | redDark red | flameDark flame | orange | flames and embers |
| GOLD | gift, 50 stars | goldDark gold energyGold | silver white | goldDark gold | silver white | yellow | white shine and sparkles |

HOME and AWAY are today's `KITS.home` and `KITS.away`. Harrison's
PURPLE is not Leo's `purple` (Leo has white shorts); the builder keeps
Harrison's kits apart from the opponents' table.

### Boots

| Boots | How he gets it | Boot shadow / boot / boot light | Animated |
|---|---|---|---|
| VOLT | starter | voltShadow volt voltLight | |
| WHITE | 100 | silver white white | |
| BLACK | 100 | black charcoal slate | |
| RED | 150 | redDark red redLight | |
| BLUE | 150 | navy blue blueLight | |
| PINK | 150 | pinkDark pink pinkLight | |
| FIRE | 1500 | flameDark flame flameLight | flame trail, fire puff each step |
| LIGHTNING | gift, 25 stars | blue electric electricLight | spark trail, crackling bolts, zap each step |
| GOLD | gift, 75 stars | goldDark gold energyGold | sparkle trail, glints each step |

### Extras

| Extra | How he gets it | Colour |
|---|---|---|
| GLASSES | starter (off at first) | clear frames: silver rim, white glint |
| HEADBAND | 150 | the kit's trim |
| WRISTBANDS | 100 | the kit's trim |
| CAPTAIN'S ARMBAND | gift, 10 stars | energyGold, on the near arm only |

### The gifts

| Milestone | Gift | Its name in lines |
|---|---|---|
| 10 stars | the captain's armband | `CAPTAIN'S ARMBAND` |
| 25 stars | the LIGHTNING boots | `LIGHTNING BOOTS` |
| 50 stars | the GOLD kit | `GOLD KIT` |
| 75 stars | the GOLD boots | `GOLD BOOTS` |

The game has 48 stars today, so the last two wait for the School Field.
Until then they show in the room, locked, with the stars they need.

### Blurbs

One silver line under the list, as mocked:

- Kits: `YOUR CLUB KIT`, `YOUR CLUB AWAY KIT`,
  `CLEAN WHITE WITH NAVY TRIM`, `SKY BLUE WITH WHITE SHORTS`,
  `PURPLE WITH WHITE TRIM`, `NAVY WITH GOLD TRIM`,
  `ALL BLACK WITH GOLD TRIM`, `ICY WHITE AND ELECTRIC BLUE`,
  `FIRE ORANGE WITH GOLD TRIM`, `EARNED AT 50 STARS`.
- Boots: `YOUR NEON YELLOW BOOTS`, `CLASSIC WHITE`, `CLASSIC BLACK`,
  `BRIGHT RED`, `BRIGHT BLUE`, `HOT PINK`, `FLAMES WHEN YOU SPRINT`,
  `BLUE SPARKS WHEN YOU SPRINT`, `GOLD SPARKLES WHEN YOU SPRINT`.
- Extras: `YOUR CLEAR FRAMES`, `IN YOUR KIT'S TRIM COLOUR` (headband
  and wristbands), `EARNED AT 10 STARS`.

The builder may reword a flashy kit's blurb to name its effect, within
the character rules.

## How the items look

### Kits and boots

Colour swaps on today's body, as every kit already is. Nothing changes
in `drawFigure`'s shapes for them.

### The extras

The approved art is in the appendix, pixel for pixel. In short:

- **Glasses:** on his side and three-quarter heads, a row of silver
  rim through the eye line with the eye left dark, and a front rim
  pixel below on the side view. On the portrait, two rims round the
  eyes, a bridge, arms back to his ears, and a white glint on each
  lens. Drawn after any expression patch.
- **Headband (B):** a band of the kit's trim across the top of his
  head, fringe hanging out below. Powered up, his fringe lifts and the
  band sits across his brow. On the portrait, a three-row band across
  the crown above the fringe.
- **Wristbands:** the last 40% of each forearm in the trim colour
  (trim shadow on the far arm).
- **Captain's armband:** the near upper arm's sleeve between 22% and
  48% of the upper arm, and the sleeve stripe there, in gold.

New logical colour slots for the extras: the glasses' rim and glint,
and the armband. The headband and wristbands use the
existing trim slots, so they follow every kit.

### The animated items

The approved studies are the authority for how they look and move:
`.superpowers/brainstorm/2325899-1793218293/content/locker-anim-v1.html`,
made by `sources/locker-anim.mts` in the same folder. The numbers there
are where the builder starts:

- **INFERNO:** the shirt's pixels are recoloured by a pattern that
  climbs about 26 px a second: mostly flame, with flameLight, energyGold
  and the odd redDark. Embers lift off his shoulders and blow back,
  about 14 a second, each living about 0.55 to 0.85 s.
- **ICE:** a white and electricLight shine sweeps diagonally across the
  kit every 1.4 s (0.5 s to cross), and plus-shaped frost sparkles
  twinkle round him, about 10 a second.
- **BLACK GOLD:** an energyGoldLight and energyGold shine every 1.6 s.
- **GOLD kit:** an auraWhite and energyGoldLight shine every 1.6 s, and
  gold sparkles about 3 a second.
- **A shine crosses every kit pixel, trim included,** so the headband
  and wristbands shine with the kit. INFERNO's flames stay on the shirt
  and leave the trim alone.
- **Trail boots, while he sprints:** particles leave his boots and stay
  behind on the pitch, fading: flames for FIRE, sparks for LIGHTNING,
  gold sparkles for GOLD. LIGHTNING also has little bolts crackling
  round the boots, about 8 a second.
- **Every step, running or sprinting:** a puff of fire (FIRE), two
  zigzag zaps (LIGHTNING) or two glints (GOLD) where the boot lands.
- **They play wherever his sprite is drawn live:** matches (normal,
  powered up, Golden Form, celebrating), the VS card, the Hub's
  juggling backdrop and the Locker Room. The trails only show while he
  sprints, so the backdrop and the room's idle never trail.
- **They are look only.** They never touch the match's world or its
  random numbers, so every headless test and tuning measure is
  unchanged.
- **They never cost a frame.** One player's effect a frame is small;
  the builder picks how (a recolour pass on the current frame, a mask,
  or baked phases), and keeps memory sensible.

## Where his look shows

- **His sprite** wears his kit, boots and extras everywhere: matches in
  every sprite set (normal, powered up, Golden Form), the VS card, the
  Hub's juggling backdrop and the Locker Room.
- **His portrait** wears his kit colours, glasses and headband on the
  Hub card and on Results. **Each save's info box shows that save's
  look.**
- Until a save is played (PRESS START, the SAVES list), the backdrop
  shows the default look: HOME, VOLT, no extras.
- His look is rebuilt when a save loads, when a save code is entered,
  and when he changes anything in the Locker Room.

## The Locker Room

The approved mockups are
`.superpowers/brainstorm/2325899-1793218293/content/locker-v1.html`
(made by `sources/locker-mock.mts`) and the room part of
`locker-anim-v1.html`.

### The screen

- **The room** is drawn in code: a wall of grey lockers, **his own red
  locker with a white 12** right behind him, a wooden bench, a dark
  tiled floor.
- **Harrison**, at twice size, stands in front of his locker on the
  left, idle. While a trail boot is picked, he sprints on the spot so
  its trail shows.
- **TRYING ON** shows on a small plate above his head whenever he's
  shown in something he isn't wearing, a locked gift included.
- **The panel** on the right: `LOCKER ROOM` (big, gold), his coins, the
  tabs `<  KITS  BOOTS  EXTRAS  >` (the open tab gold, the others
  grey), then the list.
- **Each row:** the name (white; gold behind the `+` cursor on a darker
  band when picked; grey for a locked gift), and on the right:
  - `WEARING` (volt);
  - `OWNED` (silver), with `NEW` (flameLight) before it on an unseen
    gift;
  - the price with a coin (gold, or grey when he can't afford it);
  - a grey star and the stars a locked gift needs.
- Eight rows show at once; small marks above and below say the list
  scrolls.
- **Under the list:** the blurb, then the button hints (`A BUY`,
  `A WEAR`, `A TAKE OFF`, or none) and `B BACK`.

### Controls

- **Up/down** pick a row (wrapping, as the Shop does). **Left/right**
  switch tabs (wrapping).
- **Moving onto anything tries it on** at once, bought or not. Leaving
  the row, the tab or the room puts back what he's wearing.
- **A** does what the hint says:
  - **an owned kit or boots he isn't wearing:** he wears it, and
    cheers;
  - **what he's wearing:** nothing;
  - **an owned extra:** puts it on (he cheers) or takes it off;
  - **something he can afford:** a box over the list asks
    `BUY INFERNO?` with the price and `YES` / `NO`, YES picked. YES
    buys it, puts it on, plays `buy` and he cheers. NO, B or Esc closes
    the box, and so does Start: it never buys. Harrison stays bright
    and in the item while it's open;
  - **something too dear:** `NEED 300 MORE`, and `nope`, as the Shop
    does;
  - **a locked gift:** `REACH 50 STARS`, and `nope`.
- **B, Esc or Start** go back to the Hub, on LOCKER ROOM.
- **It opens** on KITS with the cursor on the kit he's wearing.
  Switching tab puts the cursor on what he's wearing there (EXTRAS:
  the first row).
- **The cheer:** about 1.2 s of his celebrate clip with a little hop,
  and a burst of gold sparkles, as in the room study.
- **Every change saves at once:** a buy, a wear, a take-off, a gift
  seen.

### NEW

- A gift is NEW from the moment its milestone is paid until the cursor
  has been on its row. Then it's seen, for good, in that save. A locked
  gift is never NEW, and resting on it doesn't count as seeing it.
- **The Hub's LOCKER ROOM** item shows `NEW` beside it while any
  unlocked gift is unseen.

## The Hub and Results

- **The Hub menu:** CAREER, SHOP, LOCKER ROOM, OPTIONS, HELP, SAVES.
- **Results:** a milestone that brings a gift adds a line after its
  milestone line: `NEW IN THE LOCKER ROOM: LIGHTNING BOOTS`. The order
  stays career line, milestones with their gift lines, unlocks, then
  UPGRADE READY. Results has room for three lines today; the builder
  makes room for a fourth if the layout allows, and otherwise the
  existing cut applies (the last lines drop).
- **Help** may add a line about the Locker Room if it fits a page. The
  builder decides.

## Kit clashes

Every kit has a **clash family** (the tables above). Today's opponents:
Max blue, Brick orange, Leo purple, Tia teal, Pete yellow, Sam pink;
Biscuit has no kit.

- **When Harrison's family matches his opponent's, the opponent wears
  a change kit:** a white jersey (silver, white, white), or a black one
  (charcoal, slate, gray) when Harrison's kit is *light* (WHITE, ICE);
  trim in the opponent's own jersey colours (their jersey shadow and
  jersey); socks to match the jersey (silver/white or charcoal/slate);
  their own shorts.
- **Today that means:** Max changes for SKY, NAVY (white) and ICE
  (black); Brick for INFERNO; Leo for PURPLE; Pete for GOLD.
- The change kit shows wherever that opponent's sprite does in that
  match's run: the VS card and the match.
- **Every later venue's design checks its new opponents** against
  Harrison's kits and gives each a family.

## The save, version 6

### The new field

Profile **v6** appends a `locker` record, per save:

| Field | Meaning | Missing or bad in a loaded save |
|---|---|---|
| bought | the items bought with coins | none |
| kit | the kit he's wearing | HOME |
| boots | the boots he's wearing | VOLT |
| extras | the extras he has on | none |
| seen | the gifts whose NEW he's seen | none |

- **Starter items and gifts are never stored as bought.** A starter is
  always owned; a gift is owned when `career.milestonesPaid` has passed
  its milestone. `milestonesPaid` is stored and never goes down, so a
  gift can't be lost.
- **The loader stays field by field** (`profileFrom`): unknown ids are
  dropped, each id once; `bought` keeps only items sold for coins; a
  worn kit, boots or extra he doesn't own falls back to its default;
  `seen` keeps only gift ids.
- **Harrison's live v5 save loads into v6 without loss:** nothing
  bought, HOME, VOLT, no extras, nothing seen. The gifts his paid
  milestones have earned show NEW on his first visit. PLAY writes it
  back as v6.
- **A new save** (`newProfile()`) has an empty locker: only the
  starters, HOME and VOLT on, nothing else.
- A v5 build that meets a v6 save reads it as best it can and won't
  write over it (`writeUnlessNewer`), as every earlier bump worked.

### The save code

- **It appends the locker after every v5 field:** what's bought (a
  bitmask), the kit, the boots, the extras worn (a bitmask) and the
  gifts seen (a bitmask). Item order in the masks and indexes is fixed
  and append-only, like the save code's fields.
- The code's first field, the version, becomes 6.
- **Old codes still load:** a v1–v5 code gets an empty locker.
- **The longest code grows.** The builder checks `MAX_ENTRY` (140, with
  the longest v5 code 138 characters) and the code layouts on SAVE CODE
  and DELETE SAVE, and raises them to fit the longest v6 code.

## Parity

- **Cosmetics never change play.** A headless test pins it: a match
  with every item worn plays tick for tick as one with none.
- Every existing tuning test passes unchanged.

## Non-goals

- Balls, aura colours, celebrations and the Trophy Room (build step
  9). The room's cheer is not an equippable celebration.
- Any change to his hair or face beyond the approved glasses and
  headband.
- Choosing a shirt number. Every kit is number 12. The `HARRISON 12`
  shirt back stays with the "Point to the Back" celebration in step 9.
- Kit patterns beyond the approved effects, or colour pickers for the
  extras.
- Selling cosmetics in the Shop, or any stat from a cosmetic.
- Changing any opponent's own kit, or Biscuit.
- New milestone steps (the roadmap's 100 and 125). When they come, they
  can bring gifts of their own, appended.

## Constraints

Unchanged from the earlier specs:

- **The save rules:** a new field means a version bump; nothing earned
  or bought is ever taken back; the save code's fields are
  append-only; storage that throws never stops the game; `profileFrom`
  loads any version ≥ 1 field by field and caps runaway counts.
- **On-screen text** uses only uppercase letters, digits and
  `' - : ! ? . , / + < >`. No parentheses.
- **No image, audio or font files, and no surname anywhere.** The room,
  the extras and the effects are drawn in code; any new cue is
  synthesized in `src/audio/cues.ts`.
- **New art goes to the parent:** the build sends stills of the real
  Locker Room and a GIF of the effects in a real match before anything
  merges.
- **Ask before every merge into `main` and every push** (the push
  publishes to Pages).

## Left to the builder

- **The module layout.** A catalogue module in `src/meta/` (items,
  prices, gifts, ownership, buy and wear rules) and the look and
  effects in `src/art/harrison/` are the natural shape; how
  `harrisonLook` grows to take a whole outfit is the builder's.
- **How the effects are drawn** (see *The animated items*), and how
  their particles depth-sort with the players.
- **How and when the art rebuilds:** today `loadGameArt` bakes his
  sprites and portraits once at boot. They must follow the current
  save's look, the room's try-on must be instant, and each save's info
  box needs that save's portrait.
- **The change kits' art:** baked when needed or up front.
- **The cheer's cue:** an existing one (`star`, `levelUp`) or a new
  synthesized one.
- **Taking off an extra** is silent or plays `menuConfirm`; it doesn't
  cheer.
- **The Hub's NEW tag** placement, and the message line's place in the
  room (the Shop shows its message under the blurb).
- **The exact rows, spacing and colours,** within the approved mockups.

## Build order change

The build order, as amended by the roadmap and plan 9, with this plan
done:

7. Career mode and what Harrison asked for after the Park:
   - 7a. The career spine (done)
   - 7b. The Park, four opponents and Speedy Sam (done)
   - Skill moves: the stepover and the rainbow flick (done)
   - Save slots and the Stamina upgrade (done)
   - **The Locker Room, first round: kits, boots, extras (this plan)**
   - Quick Match
   - 7c onward, unchanged.

Step 9 keeps the rest of the Locker Room: balls, aura colours,
celebrations, the equipped power move and form, and the Trophy Room.

## Appendix: the approved art

From `sources/extras-sheet.mts` (sheet `sources/extras-sheet-v2.png`),
both in `.superpowers/brainstorm/2325899-1793218293/`. Overlays are
drawn over the existing image; `.` keeps the pixel underneath. Legend:
`g` rim, `G` glint, `r` trim, `R` trim shadow, `o` outline. A blank
string is a row left alone.

### Heads (`HARRISON_HEADS`, same origin as each head's grid)

```
glasses   side          ['', '', '', '', '....gggog', '........g']
          threeQuarter  ['', '', '', '', '.ggoggog']
          front         ['', '', '', '', '.goggggog']
headband  side          ['', '', 'RRrrrrrr']
          threeQuarter  ['', '', 'RRrrrrrr']
          front         ['', '', 'Rrrrrrrrr']
```

### Powered-up heads (`HARRISON_POWER_HEADS`)

```
glasses   side          ['', '', '', '', '', '', '', '......gggog', '..........g']
          threeQuarter  ['', '', '', '', '', '', '', '...ggoggog']
          front         ['', '', '', '', '', '', '', '..goggggog']
headband  side          ['', '', '', '', '', '', '..RRrrrrrrr']
          threeQuarter  ['', '', '', '', '', '', '..RRrrrrrrr']
          front         ['', '', '', '', '', '', '.Rrrrrrrrr.']
```

His clips use the side and three-quarter heads; the front overlays are
for completeness. The headband goes on before the glasses.

### The portrait (64×64, after any expression patch)

Glasses at (13, 23):

```
'........gggggggg......gggggggg........'
'gggggggg.......gggggggg.......gggggggg'
'.......g......Gg......gG......g.......'
'.......g.......g......g.......g.......'
'.......g.......g......g.......g.......'
'.......gggggggg........gggggggg.......'
```

Headband at (16, 11), before the glasses:

```
'.RrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrR'
'RRrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrRR'
'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR'
```

### The body (`drawFigure`)

- **Wristbands:** each forearm from 0.6 of the way from elbow to hand,
  in trim (near arm) or trim shadow (far arm). The hand stays skin.
- **Captain's armband:** the near upper arm, from 0.22 to 0.48 of the
  way from shoulder to elbow (inside the sleeve, which ends at 0.5),
  armband gold; the near sleeve's trim stripe takes the armband colour
  over the same stretch. Not on the far arm.
- **New colours:** rim `silver`, glint `white`, armband `energyGold`.
