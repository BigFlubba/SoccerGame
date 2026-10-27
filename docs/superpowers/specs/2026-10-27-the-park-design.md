# The Park (Plan 7b) — Design

Amends `2026-10-22-harrison-soccer-design.md` (the main spec) and follows
`2026-10-26-career-spine-design.md` (Plan 7a) and
`2026-10-27-fair-max-design.md` (the fair-Max plan, with its three
"Amended" sections). Where they disagree, this document wins. Anything it
doesn't touch still stands.

## Intent

Plan 7a and the fair-Max changes are live (`main` at `3c61bea`). Harrison
can climb the Backyard's ten rungs against Max, beat Biscuit the Dog, and
see the road to the Cup with the Park reading COMING SOON. He's happy with
everything as it is.

7b opens the second stop. Beating Biscuit unlocks **the Park**: a bright
summer park with its own background, four new opponents from the local
pickup crew, each of whom plays in a way you can see, and a boss, **Speedy
Sam**. The parent's one brief: *"we just want it to be fun."* Read that as:
new faces who feel different to play against, a boss with moments that
feel great when you beat him, and nothing that's unfair the way Max used to
be on Easy and Normal.

## What was decided

By the parent, in the 7b brainstorm (2026-10-27):

- **The Park's opponents are the Park crew,** the local kids who play
  pickup there, a step up from Max next door. Each kid's look tells you
  how they play. This was chosen over a rival club's squad in one kit, and
  over a mixed cast that included teens or adults.
- **The Park stays one-on-one,** open goals, no keepers, like the
  Backyard. The crew is the group the opponents come from, and each match
  is Harrison against one of them. Keepers arrive at the School Field (7c)
  and a teammate at the City Stadium (7d), as planned.
- **Speedy Sam is "all gas, no brakes"** (the designer's proposal; the
  parent: "Yes, sounds good"). He's the fastest thing in the game, can't
  stop or turn sharply, takes long touches and has a weak shot (see *Speedy
  Sam* below).
- **The names and looks are the designer's to choose,** with the sheet and
  GIF going to the parent for approval as with Biscuit.
- **Quick Match leaves 7b.** It's built after the Park is done. When and
  where is decided then.
- **The Park's look is the summer afternoon** (mockup A, chosen over autumn
  and a city park): blue sky and clouds, rolling hills, big leafy trees, a
  gravel path behind a low hedge with joggers running along it, a bench and
  a lamp. It's the opposite of the Backyard's evening.

**The designer's proposals that the parent heard played back and accepted**
("Sounds good, ready to implement"):

- The crew in order, each with a personality, a lesson and a bonus (the
  catalog below).
- The crew and Sam play by the rules that made Max fair, and every one of
  them is measured in CI: the crew the way Max is now, Sam the way Biscuit
  is.
- Brick starts about as strong as Max at match 10, and each kid after him
  is a little stronger, with one standout stat apiece.
- Sam is "in between" like Biscuit: a Harrison who races him loses, and
  one who makes him overshoot and shoots early wins about half his matches
  on Normal. After a loss, his VS card carries one tip line.
- Each kid plays differently, not just with different numbers: Brick's
  positioning, Tia's fake and Sam's skids are new behaviour, not new dials
  on Max.
- Hedges at the ends of the pitch too, where the Backyard has fences.

## The Park in the career

### The catalog

The Park joins the career catalog as data, as 7a planned: four matches and a
boss, each with a stable id the save keys on.

| # | Id | Opponent (HUD name) | How they play | Bonus | Settled |
|---|---|---|---|---|---|
| 1 | `park-1` | BIG BRICK (BRICK) | the blocker | SCORE FROM A CHIP | in play |
| 2 | `park-2` | BOOMER LEO (LEO) | the long-range shooter | KEEP A CLEAN SHEET | full time |
| 3 | `park-3` | TRICKY TIA (TIA) | the dribbler | WIN THE BALL WITH 3 STEALS | in play |
| 4 | `park-4` | PESKY PETE (PETE) | the presser | SCORE A PERFECT STRIKE | in play |
| Boss | `park-boss` | SPEEDY SAM (SAM) | all gas, no brakes | DON'T LET SAM SCORE | full time |

- The names are the designer's. They stand unless the parent changes them
  when the sheet comes back.
- **The new bonus:** WIN THE BALL WITH 3 STEALS counts Harrison's clean
  steals off Tia's feet with the steal button (the `'stole'` outcome). A
  trapped loose ball, a poke and a slide tackle don't count. It's settled
  in play, so BONUS DONE! fires on the third. The match summary records
  his clean-steal count so the rule stays a pure function of the summary.
- **Sam's bonus** reads `DON'T LET SAM SCORE`: the same rule as Biscuit's,
  with his name.
- The venue's stars are out of 15. The career total stays out of 93; after
  7b, 48 are reachable.

### Unlocking and progress

- **The Park opens when Biscuit is beaten** (the Backyard is done). Before
  that its stop stays LOCKED, as today.
- Its matches unlock in order by winning, and Sam unlocks once match 4 is
  beaten. A Park match is **beaten** when its stars are at least 1, the
  same rule as the boss in 7a. `ladderWins` stays the Backyard rungs' truth
  and is untouched.
- **The next match** is the first unbeaten match in the first venue that
  isn't done: rung, Biscuit, Park 1 to 4, Sam. Once everything open is
  beaten, it's Sam, as a replay.
- Replays, stars that only go up, loss streaks and milestones all work
  exactly as in 7a.

### The road map

- Once Biscuit is beaten, the Park's stop is a **postcard** like the
  Backyard's: a crop of the Park's own art in a gold frame, its name in
  gold and its stars (`0/15` with a star picture). A enters it.
- Once Sam is beaten, the **School** stop reads COMING SOON in place of
  LOCKED, as the Park did after Biscuit. It still can't be entered.
- The cursor starts on the stop holding the next match.

### The venue screen

The 7a venue screen, generalised to a venue with four matches and a boss:

- Title `THE PARK` with `STARS n/15` under it.
- Four numbered match nodes and the boss node with Sam's face (a dark
  silhouette until he's unlocked) and BOSS under it. NEXT, the star rows
  and the beaten/next/locked looks are the same as the Backyard's. With
  four nodes the spacing is the builder's.
- The match panel shows the opponent's head, `MATCH 2 - BOOMER LEO` (or
  `SPEEDY SAM` for the boss), a one-line blurb in silver, then the bonus
  line, the stars and `A PLAY   B BACK`.
- **Blurbs state the facts only** and leave the lesson for Harrison to
  find. Suggested wording (the builder's):
  - Brick: `HE NEVER DIVES IN.`
  - Leo: `HE SHOOTS FROM ANYWHERE.`
  - Tia: `SHE FAKES ONE WAY, THEN GOES THE OTHER.`
  - Pete: `HE'S ON YOU THE MOMENT YOU HAVE IT.`
  - Sam: `THE FASTEST KID IN THE PARK. HIS SHOT IS WEAK.`
- The Park drifts behind it, with Harrison juggling, as the Backyard does
  on its own screen.

### The Hub, the VS card and Results

- **The Hub's career lines** (wording the builder's):
  - a Park match next: `NEXT: BIG BRICK - THE PARK 1/4` and his blurb;
  - Sam next: `NEXT: SPEEDY SAM` and `THE PARK BOSS!`;
  - Sam beaten: `THE PARK DONE! STARS 12/15` and `SCHOOL: COMING SOON`.
  The Hub's backdrop stays the Backyard: it's home.
- **The VS card** works as in 7a: `MATCH 2` with `HARRISON VS BOOMER LEO`,
  or `SPEEDY SAM - PARK BOSS` with the boss sting; the two of them facing
  each other, over the Park, and the bonus line.
- **Sam's tip.** Once Harrison has lost to Sam (his loss streak is at
  least 1), Sam's VS card adds one line until he wins, suggested `TIP:
  DON'T RACE HIM. MAKE HIM OVERSHOOT`. It's one line, never a lecture. The
  crew get no tip: their blurbs are enough.
- **Help** gains one line about Sam, there from the start, like Biscuit's.
- **Results' career news** gains the Park's lines, e.g. `MATCH 2 BEATEN!`,
  `SPEEDY SAM AWAITS!` after match 4, `SAM BEATEN! THE PARK DONE!`, and
  `NEW BEST: 3 STARS!` on an improved replay. Once Sam is beaten, NEXT
  MATCH becomes CAREER as it does after Biscuit.

## The Park's look

- **Summer afternoon, as mockup A.** The mockup's background is a sketch;
  the real layers are drawn fresh in the game's art style, in the same
  four parallax layers as the Backyard:
  - **far:** a bright blue sky fading paler toward the horizon, with puffy
    white clouds. It tiles seamlessly.
  - **mid:** rolling green hills with a row of small far trees, then a
    gravel path with big leafy trees, a bench and a lamp post along it.
  - **near:** a low, bumpy hedge along the far touchline, in place of the
    Backyard's fence.
  - **ground:** the same mown pitch, with **hedges at both ends** in place
    of the wooden end fences.
- **Joggers** run along the path in both directions: a few small figures
  (about 10 px tall, a two-frame run) in different shirt colours, moving at
  their own pace on the mid layer and wrapping round. They're scenery and
  never interact with play.
- **The pitch's geometry is the Backyard's** *(designer's call)*: the same
  size, goals, boards and bounce, so every physics guarantee, AI rule and
  tuning measure carries over unchanged. The hedges are solid like the
  fences, and only the art differs.
- The goals use the same goal sprites.

## The crew and Sam: the fair rules

Every human opponent in the Park plays by the rules that made Max fair
(the fair-Max spec and its amendments are the authority):

- Harrison's **steal button** works on them as on Max: the same reach
  (round them from behind), near-miss, whiff, cooldown and Control curve.
  Each opponent has its own clean-steal odds per difficulty.
- After a clean steal they're **wrong-footed** for a beat and don't slide
  during it.
- **The kickoff hold:** at Harrison's kickoff they hold a spot until he
  plays the ball (or, with `kickoffRush`, starts winding up), off the
  ball's line on Easy and Normal and on it on Hard. Each opponent has its
  own spot.
- **The keep-out zone** in front of Harrison's own goal applies against
  them as against Max, and so do the sideways slide clear and the
  drag-back. *(Designer's call: the zone was "against Max only" because
  Max was the only human opponent; it now covers every human one. Biscuit
  is unchanged.)*
- **The Energy Wave** plays against them as against Max: they back off from
  a powered-up Harrison with Max's braceSense and backOffS odds, never
  challenge him, and brace by Max's rules. None has a power move.
- **Difficulty** (Easy / Normal / Hard in Options) applies to them as to
  Max, mid-match included.

**Each opponent has its own three difficulty profiles** *(designer's
call)*: Max's `AiProfile` fields (reaction, aim, aggression, shoot range,
braceSense, backOffS, cleanSteal, wrongFootedS, kickoffSpot, kickoffRush,
paceFactor), starting from Max's values and tuned per kid, plus whatever
fields their personality needs. As for Max, every Easy number is gentler
than Normal's and every Normal number gentler than Hard's. `braceSense`
and `backOffS` stay at Max's values for each difficulty, so the Energy
Wave plays against every Park opponent exactly as against Max
*(designer's call)*.

## The crew

Each kid uses the shared human body system with their own head (side,
three-quarter and front), hair, skin tone and kit. Their bodies in physics
are the same size as Max's *(designer's call)*, so the measures and the
solid-body rules hold. The stats below are starting points *(designer's
call)*; the builder may move them while tuning, keeping each kid a little
stronger overall than the one before.

### 1. Big Brick, the blocker

- **The look:** big and stocky, buzz cut. A wider body drawing is welcome,
  on the same physics body.
- **Defending,** which is his whole personality: he drops to a spot
  between the ball and the centre of his goal, deeper than Max, facing the
  ball, and shuffles across in depth to stay in the line of a shot. A shot
  straight at him hits him. He hardly ever slides and only challenges when
  the ball comes within his reach. He never stands on his goal line: he
  keeps far enough out (builder's number) that a chip can drop in behind
  him.
- **Attacking:** patient. He dribbles at a steady pace and shoots from
  middle range.
- **The lesson:** don't shoot into him. Go round him in depth, or chip him.
  That's why his bonus is SCORE FROM A CHIP.
- **Stats:** Speed 3, Power 4, Jump 2, Control 4 (Max at match 10 is
  4 / 4 / 2 / 3).

### 2. Boomer Leo, the long-range shooter

- **The look:** the designer's.
- **Attacking:** he shoots from far out, from around the halfway line,
  winds up fully, and aims mostly at the posts. His shots are hard.
- **Defending:** ordinary, much like Max.
- **The lesson:** close him down before he winds up, and stay goal-side
  in his shooting lane. A shot into Harrison's body is blocked, and the
  steal works on the ball at his feet while he winds up. His bonus is KEEP
  A CLEAN SHEET.
- **Stats:** Speed 4, Power 6, Jump 2, Control 3.

### 3. Tricky Tia, the dribbler

- **The look:** a ponytail. The rest is the designer's.
- **Attacking:** close control. When Harrison stands in her path a short
  way ahead, she **fakes**: she leans and shifts one way in depth for a
  beat, a tell Harrison can see, then cuts the other way past him with the
  ball. A slide at the line she was on misses because she's not there any
  more. It's position, not a dice roll. She shoots only from close in.
- **Defending:** ordinary, a little less aggressive than Max.
- **The lesson:** don't dive in. Wait for the cut and time the steal from
  beside or behind her. Her bonus is three clean steals.
- **Stats:** Speed 5, Power 3, Jump 2, Control 6.

### 4. Pesky Pete, the presser

- **The look:** the designer's (messy or spiky hair).
- **Defending:** he presses. The moment Harrison has the ball he comes
  straight at it, wherever it is, rather than dropping goal-side. He
  reacts fast and slides often. When he loses the ball he chases hard.
- **Attacking:** direct. He runs at goal and shoots from middle range.
- **The lesson:** he commits. A drag-back or a turn as he arrives leaves
  him behind and his goal open, and a quick early shot beats his press.
  His bonus is SCORE A PERFECT STRIKE: a calm, charged shot under pressure.
- He's deliberately the warm-up for Sam: the same answer (turn away from
  a rusher), in a milder form.
- **Stats:** Speed 6, Power 4, Jump 3, Control 4.

## Speedy Sam

### The look

Lean and quick, with a sweatband or headband and a kit that's
unmistakably his. The rest is the designer's, for the parent's approval.
He's the main spec's "blazing pace" made visible:

- dust puffs from his boots at full pace, and speed lines when he's flat
  out;
- a **skid**: a new pose, leaning back with the front foot planted and a
  spray of dust, for when he's braking or overshooting. This is new art,
  so it goes on the sheet;
- a whoosh when he flies past Harrison close by.

### How he plays

He's a normal human opponent: the shared body, the fair rules above, a
90-second match with golden goal and the usual goal moments. What makes
him Sam:

- **Blazing pace.** He's the fastest player in the game: about 1.2 times
  the tuning Harrison's sprint, faster than Biscuit's 183 px/s (builder's
  number). Chasing him from behind loses.
- **No brakes.** He can't stop or turn sharply. When he has to slow down,
  or the thing he's running at swings behind him, he **skids**: he brakes
  hard over a short distance (around 0.3–0.5 s, builder's number) before
  he can go the new way, with the skid pose and dust. This goes for
  everything: chasing a loose ball, closing down Harrison, turning with the
  ball.
- **Overshooting.** He challenges at full speed, straight at the ball. If
  the ball leaves his line in the last few pixels of his run, for example
  from a drag-back, a sharp turn or a step aside, he can't follow: he flies
  past and skids to a halt, and Harrison has a moment. This is the big
  moment of the match, and it comes from position and timing, not a dice
  roll.
- **Long touches.** With the ball he knocks it well ahead, around 30–45 px
  (builder's number, against Max's 13–16 px), and races onto it. Between
  touches the ball is out of his reach and can be in Harrison's: a steal
  there, stepping into the gap, counts as a steal off Sam's feet (it's his
  ball, as for Max between touches). The tell is the touch itself.
- **A weak shot.** His shooting power is low and his shot is slow. Close
  in, it still beats an open goal, so he mostly tries to run the ball right
  up to it. When Harrison is goal-side and in his way, he sometimes tries
  his shot from range instead (builder's odds by difficulty). That's a
  slow roller a sprinting Harrison can run down and clear, or trap with the
  steal button: the last-ditch clearance moment. The keep-out zone keeps
  that clearance from going into his own goal.
- **Back in a flash.** When Harrison breaks away, Sam gets back fast, so
  Harrison has to shoot early.
- **The Energy Wave:** like Biscuit, his backpedal from a powered-up
  Harrison is pinned to Max's pace, not his own, so the wave's chase-down
  skill works against him. He braces by Max's rules.
- **Stats** *(designer's call)*: Power 1, Control 3, Jump 3, with his pace
  set directly (as Biscuit's is) or through his Speed and `paceFactor`
  (builder's choice).

**The lesson,** never stated in the game except by the one tip after a
loss: don't race him. Make him overshoot, step into the gaps in his
dribble, run down his weak shots, and shoot early.

### Tuning target

Measured like Biscuit, with scripted Harrisons in headless matches, at
tuning stats one level above Pete's (Speed 7, Power 5, Jump 4, Control 5)
*(designer's call)*:

- a **racer**, who chases the ball flat out, challenges Sam head-on and
  slides at him, and never waits or turns, must lose nearly every match on
  Normal;
- a **matador**, who waits goal-side, steps into the gap between Sam's
  touches with the steal, drag-backs as Sam closes in to make him
  overshoot, and shoots early, must win about half on Normal (around 0.8 on
  Easy and 0.3 on Hard, like Biscuit's blocker).

The scripted Harrisons vary per exchange, as Biscuit's do (reaction to the
overshoot, how long they wait, how long they hold each shot), so a win rate
is a smooth measure. Every match also ends with a result and no ball
sitting still for long. Sam doesn't get the crew's "decent kid" Easy and
Normal bands: the racer and matador are his measure. These runs are
tests, so a change that breaks the
lesson fails CI. The numbers are starting points, to revisit after
Harrison plays.

## Measuring the crew

Each crew kid gets a tuning test beside `maxTuning.test.ts`, built the same
way (`maxScripts.ts`'s scripted Harrison, the "decent kid", with his steal
taps and kickoff shot), at stats one level above that kid's (capped), on the
same seeds:

- **Easy** about 80% (band 0.7–0.9), **Normal** about 60% (band 0.5–0.7),
  and **Hard** about as tough as Max's Hard (the builder sets the band from
  Max's measured Hard, about 0.02 today);
- Easy ≥ Normal ≥ Hard;
- every match ends with a result and no ball sitting still for long.

**Personality checks.** So the crew can't drift into four Maxes in
different shirts, each kid also gets a test that their personality shows
in the same headless matches, against Max at the same stats (measures and
bands the builder's). For example:

- Brick defends deeper and slides far less;
- Leo's shots start much further out;
- Tia fakes, and gets past the scripted Harrison more often while
  dribbling;
- Pete gets to the ball carrier faster and slides more.

If a target can't be reached without breaking the personality, the builder
stops and reports the numbers rather than widening the bands.

**Nothing in the Backyard moves.** `maxTuning.test.ts`,
`dogTuning.test.ts`, the AI-vs-AI tests and the no-kit parity test pass
unchanged. Max and Biscuit play exactly as they do today.

**As built (part 1, 2026-10-27).** Measured by `crewTuning.test.ts` on
seeds 100–163, the scripted Harrison a level up on each kid's stats.
Max measures E 0.875 / N 0.625 / H 0.016 on main and on the branch alike.

| Kid | Easy | Normal | Hard | Personality, against Max's Normal brain at the kid's stats |
|---|---|---|---|---|
| Brick | 0.828 | 0.594 | 0.031 | defends 208 px from his line to Max's 305; 1.0 slides a match to 3.6 |
| Leo | 0.859 | 0.625 | 0.063 | his wind-ups start 177 px out to Max's 97 |
| Tia | 0.766 | 0.594 | 0.000 | 10.3 fakes a match; Max none |
| Pete | 0.797 | 0.641 | 0.031 | sprints 30% of Harrison's time on the ball, Max 0%; 4.0 slides to 3.5 |

- Hard's band is at most 0.1. Depth and pressing are measured in open
  play, leaving out the kickoff hold every opponent keeps alike.
- **Leo's shots are measured where his wind-up starts.** The scripted
  Harrison steals most long wind-ups, which is the lesson, so released
  shots alone come from close in.
- **Pete's press is measured by intensity, not distance.** Max already
  defends 20 px from the ball, so no opponent can stand 20 px closer.
  Pete sprints at the ball carrier and slides more, and he commits: a
  clean steal leaves him standing longer than Max, and his shooting is
  wilder.
- **Brick counts a dribble touch ahead of Harrison as Harrison's ball,**
  so he holds his spot while Harrison dribbles at him. He goes for a
  ball lying beside or behind Harrison that Harrison can't play.
- **Tia's fake uses close control:** the ball stays at her feet through
  the lean, the cut and a short straightening-up at goal. It's placed
  before steals and tackles resolve, so both still work on her, and the
  fake ends the moment Harrison touches, kicks, tackles, pokes or traps
  her ball. She leans toward the tighter side and cuts into the room, and
  starts the move 60 px out, before the scripted Harrison's steal can
  reach. A slide down her line as she starts to lean misses; a slide
  that reaches her ball at the cut wins it.
- **Open: Tia doesn't get past the scripted Harrison more often than
  Max.** In a face-off (him standing within 30 px in her lane), she gets
  past with the ball 6% of the time, Max 5%. The scripted Harrison never
  dives in, which is the answer to her fake. That's for the parent's
  playtest to judge.
- Against one fixed Harrison (Brick's level-up), Normal: Brick 0.594,
  Leo 0.609, Tia 0.422, Pete 0.313. Pete is tougher than Brick, as
  planned; Leo is level with Brick.

## The save: profile version 4

- **No new fields.** The Park adds catalog ids (`park-1` … `park-4`,
  `park-boss`), which `career.stars` and `career.lossStreaks` load because
  they're in the catalog.
- **The version goes to 4 anyway** *(designer's call)*. A v3 build drops
  ids it doesn't know, and `writeUnlessNewer` only refuses to write over a
  *newer* version, so a v3 tab left open could write over Park stars. The
  bump stops that. A v1–v3 save loads with no Park progress.
- **The save code** appends, in its append-only way, the five Park star
  counts and Sam's loss streak. An older code still applies, with no Park
  stars. The confirm wording is unchanged (it already shows the star
  total). The longest code grows to about 135 characters, so the entry
  screen's `MAX_ENTRY` (130) goes up to fit; it still shows in four small
  lines.
- Clamps as in 7a: stars 0–3, streaks 0–99. Retroactive stars stay
  Backyard-only. Storage that throws never stops the game. Two-tab sync is
  unchanged.

## Sound

Small, by design not by ear, like everything so far: Sam's whoosh when he
flies past close by, a skid scrape, Sam's boss sting on his VS card (the
Biscuit sting or a variant), and the Park's own ambience if any (the
builder's call: the Backyard's crowd level, or quieter, or birdsong).
Tune in `cues.ts` once someone listens.

## Art and approval

**New art, all code-drawn like everything else:**

- the five heads (side, three-quarter, front) and their front faces for
  the venue panel, VS card and HUD;
- their kits, hair and skin tones. The crew should look like a varied
  bunch of park kids, including skin tones. The master palette may gain
  the few colours that needs (more skin tones, a kit colour or two); it
  has 45 and its test caps it at 48, so the cap goes up deliberately to
  match (around 40 was the main spec's guide, not a limit). No
  two kits alike, none red like Harrison's home kit and none blue like
  Max's;
- Brick's stockier body drawing, if the builder gives him one;
- Sam's skid pose, dust puffs and speed lines;
- the Park's four layers, the joggers and the venue postcard.

**The sheet and GIF need the parent's approval** before anything merges,
as with Biscuit:

- a **character sheet PNG**: the five kids in their kits (faces, heads in
  three facings, idle, run and shoot frames, Sam's skid), and the Park
  background at 320×180 with a match in it;
- a **GIF** of Sam flying past a drag-back and skidding to a halt, with
  joggers going by behind.

The AI, catalog and screens can proceed meanwhile. Nothing merges with
unapproved art.

## Goals

- The Park is a new place to be, bright and alive, and clearly the next
  step up the road.
- Four opponents who each feel different to play against within a minute
  of kickoff, each with a trick Harrison can work out.
- A boss with moments that feel great: Sam flying past a drag-back, and
  the last-ditch run-back clearance.
- Every Park opponent is fair on Easy and Normal, in CI: the crew by Max's
  measure, Sam by Biscuit's.
- His save moves to v4 losing nothing.

## Non-goals (this round)

- **Quick Match.** It's built after the Park.
- **Keepers, 2v2, the School Field** and later venues beyond the School's
  COMING SOON.
- **Any change to the Backyard:** Max, Biscuit, the ladder, their tuning.
- **New moves for Harrison,** power moves for opponents, or any new shop
  item.
- **The quiet ease-off** (Plan 10). The loss streaks it'll read are
  already recorded.
- **Extending the keep-out zone to Harrison's own kicks and headers**
  (raised after fair Max, not approved).
- **Retuning by ear** (sound) or Harrison's real save (prices, pace).

## Anti-goals

These would make it a failure even if it technically works:

- **Four Maxes in different shirts.** If you can't tell the crew apart by
  how they play, it's failed; the personality checks guard it.
- **Unfair the way Max used to be:** own goals when catching them,
  kickoffs taken straight off his foot, no way to turn. Every fair rule
  applies to every Park opponent.
- **A wall, or a pushover.** Sam beaten first time by racing him is as
  wrong as Sam unbeatable by a matador. The scripted tests guard both.
- **Beaten by dice.** Brick's positioning, Tia's fake, Pete's commitment
  and Sam's overshoot all come from position and timing Harrison can read.
- **Losing or lowering progress.** The v4 move keeps everything; stars
  never go down; the Backyard's progress is untouched.
- **Broken places.** Every Park opponent and ball obeys every guarantee
  Plans 2–7a made: inside the field, never in a goal frame or its roof,
  never stuck.
- **A babyish tone.** Cool park kids in a cool sports game for a
  12-year-old.
- **Likeness slips.** The crew and Sam are made up and not based on real
  children. No surname anywhere.

## Constraints

- **Saves:** fields are only ever appended; `profileFrom` loads any
  version ≥ 1 field by field and caps runaway counts; nothing earned or
  bought is ever taken back; storage that throws never stops the game; the
  save code's fields are append-only.
- **No-kit parity** and the unchanged Backyard, above.
- **On-screen text** uses only uppercase letters, digits and
  `' - : ! ? . , / + < >`. No parentheses.
- **Assets:** no image, audio or font files. Everyone is code.
- **The stack:** Vite, TypeScript, Canvas, Vitest. Pure, tested modules
  for the catalog, the objective rules and the save, as before.
- **Screens are 320×180.** The brainstorm mockups (the summer afternoon)
  are in the gitignored `.superpowers/brainstorm/` folder for this machine
  only. Draw from the description if they're gone.
- **Approvals:** the sheet and GIF before merging; ask before every merge
  into `main` and every push (the repo is public and Pages deploys on
  push). Work on a branch.

## Left to the builder

- Module and file layout: how opponents become data (name, heads, look,
  stats, per-difficulty profiles, personality), how `matchScene` picks the
  opponent and the venue art from the catalog, where the personalities and
  Sam's skid and long touch live. `ai.ts` is near 500 lines, so the
  personalities probably want their own module.
- Every number marked as the builder's: Brick's depth and how far out he
  keeps from the line, Leo's range, Tia's fake (trigger distance, lean,
  width, timing), Pete's press, Sam's speed, braking, skid, overshoot
  window, touch length and range-shot odds, each kid's per-difficulty
  profile, and the exact test bands and seeds.
- The scripted racer and matador, and the personality measures.
- Looks within the descriptions; names stand unless the parent changes
  them; wording of blurbs, Hub, Results, VS and Help lines within the
  character set.
- The venue screen's spacing for four nodes, the postcard crop, the
  joggers' number, colours and pace.
- Whether 7b is one plan document or two (for example, the Park and the
  crew, then Sam), executed in order on one branch with one merge, as 7a
  was.

## Release

- Branch from `main` (`plan-7b-park` or similar). Keep `main` playable.
- The sheet and GIF go to the parent as soon as they exist; nothing merges
  with unapproved art. It's one branch and one merge *(designer's call)*,
  so no "boss not in the game yet" state is built.
- Before merging into `main` and before pushing, ask. Pages deploys the
  push.
- After release, update the memory note. The game-tour page is retired, so
  don't offer updates to it.

## Build order change

The build order, as amended by Plans 3–7a:

7. Career mode, in five plans:
   - 7a. The career spine (done)
   - **7b. The Park, four opponents and Speedy Sam (this document)**
   - Quick Match, after the Park (when and where to be decided)
   - 7c. Keepers and the School Field
   - 7d. 2v2 and the City Stadium
   - 7e. The World Cup Final
8. Training Ground
9. The other power moves, forms, Power Clash, skill moves, Locker Room,
   cosmetics, Trophy Room
10. Polish (settings, difficulty and the quiet ease-off, balancing)
