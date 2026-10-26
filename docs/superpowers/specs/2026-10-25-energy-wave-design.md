# Energy Wave — Design

Amends `2026-10-22-harrison-soccer-design.md` (the main spec) and follows
`2026-10-23-progression-core-design.md` (Plan 5). Where they disagree, this
document wins. Anything it doesn't touch still stands.

## Intent

Plans 1–5 are live: a 90-second 1v1 against Max in the Backyard, with the
depth band, sound, Harrison's goal moment, and a saved profile with coins, XP,
levels, a Shop for four stats and the ten-match Backyard Ladder.

The parent asked from the start for some upgrades to be "big, powerful
effects: think Dragon Ball Z", and is most excited about progression, upgrades
and power-ups. This plan pulls the first power move forward, ahead of Career
mode. It gives the Shop its first big-ticket item, something worth saving
coins for, and gives Harrison the game's showpiece moment: powering up with an
aura and floating debris, then firing a beam across the screen that sends Max
flying.

It's one move, done properly: the super meter, powering up, the **Energy
Wave**, Max's ways of stopping it, **Golden Form**, and the Shop and Results
changes to earn them. The rest of the main spec's power moves, forms, tiers
and the Power Clash come later.

## What was decided

By the parent, in the Plan 6 brainstorm (2026-10-25):

- **A power-move slice comes before Career mode.** Career mode becomes the
  next plan.
- **The Energy Wave is the move.** It's Harrison's pick from the three power
  moves on the game-tour page.
- **Max should sometimes get to stop it.** The parent accepted the proposal
  that the stop comes from timing, not luck:
  - **Tackle during the power-up.** If Max reaches Harrison while he's
    powering up and tackles him, the power-up is cancelled, but he keeps
    the meter. The main spec already says this.
  - **Brace from range.** If Max is standing in the beam's path with
    enough distance to see it coming, he braces and soaks it up. He gets
    shoved back skidding, and the ball dies at his feet. Up close, he gets
    no time to brace and is blown off his feet while the ball rockets on.
  - This gives Harrison a real choice. Powering up far from Max is safe from
    the tackle, but Max can brace. Getting close nearly guarantees the goal,
    but risks the tackle. The best moment is when Max is beaten or out of
    the lane.
- **While Harrison holds a full charge, Max keeps coming.** The parent chose
  the designer's recommendation over a planted Max with a time limit on the
  charge. Max steps into the beam's lane and runs in to tackle, so the skill
  is *when to let go*:
  - too early, while Max is still far away: he braces;
  - too late: he tackles Harrison;
  - in between, as Max closes in: he's blown away.

  It feels like an anime standoff: let him come, then blast him. Because
  Max always closes in, it never stalls, and the charge needs no time
  limit.
- **No cost per use and no fixed number of uses.** He buys the move once and
  keeps it forever. What limits it is the super meter: it starts empty each
  match, and one full meter pays for one Energy Wave. It should fill **about
  once or twice in a match**, a little more if he plays well.
- **Golden Form is in this plan.**
- **The super meter sits top right, labelled POWER.** The parent chose this
  over tucking it under the stamina bar. It mirrors the stamina bar: a
  `POWER` label in gold with the bar under it.
- **The mockups were approved as the target look** ("everything looks
  good"). They were drawn with the real sprites and the Backyard at
  320×180:
  - **Powering up:** golden Harrison in the `powerUp` stance with a gold
    aura licking upward and a glowing pool at his feet. Pebbles, clods and
    grass float up around him, and a gold charge bar over his head fills.
    Max is running in.
  - **Blown away:** the game-tour concept. Harrison's beam is blue-white,
    with a bright white core and a wavy electric-blue edge, and it carries
    Max off his feet toward the goal.
  - **Braced:** Max leans into the beam with both arms thrust out, front
    foot planted and back leg driving. The beam ends in a splash of rays at
    his hands. There are skid marks in the grass, with dust kicked off his
    heels, and the ball sits dead at his feet.
  - **The Shop:** a **POWER MOVES** divider under the four stats, then one
    row: `ENERGY WAVE  600` when he can buy it, `ENERGY WAVE  LV 3 TO
    UNLOCK` greyed out below level 3, and `ENERGY WAVE  OWNED` once bought.
    Its blurb is `A HUGE BEAM THAT KNOCKS MAX FLYING`. The panel grows
    taller to fit.

**The designer's proposals that the parent heard played back and accepted**
("sounds good"):

- The meter only appears once he owns the Energy Wave.
- He needs the ball at his feet to power up.
- Letting go of Y early cancels the power-up and keeps the meter, like a
  tackle does.
- Up/down aims the beam at the far or near post, like a charged shot.
- An Energy Wave goal shouts **ENERGY WAVE!** and pays the +15 style bonus.
- Max never gets power moves on the ladder. The Power Clash is for the
  career's bosses 4 and 5, as the main spec says.
- The Energy Wave unlocks at **level 3** and costs **600 coins** *(starting
  numbers, to tune after Harrison plays)*.
- Golden Form unlocks **free at level 5**, is used automatically from then
  on, and fills the meter **about 10% faster**.
- Results announces **GOLDEN FORM UNLOCKED!**
- The save goes to `version: 2`.

## The slice in detail

### The super meter

- Harrison's only, one per match: empty at kickoff and kept across goals
  and kickoffs within the match. Max has none.
- **Hidden and inert until he owns the Energy Wave.** Before that, the HUD,
  the controls and the sim are exactly as they are today.
- **What fills it** (main spec): his dribbling touches, tackles he wins,
  his shots on target, and his style goals.
  - Touches give a little each. Tackles and shots on target give more.
  - Each style goal gives a big chunk.
  - "On target" is the builder's to define. A good definition: a shot that
    scores, hits the frame, or is blocked by Max on its way in.
  - The weights are the builder's, tuned to these targets:
    - **an ordinary match fills it about once, a good one about twice;**
    - a match spent just dribbling never fills it;
    - it can't fill twice within about 20 s.
- **Golden Form** makes every gain about 10% bigger.
- It stops filling when it's full. It's spent the moment the wave fires,
  not when the power-up starts.
- **On the HUD:** top right, mirroring the stamina bar.
  - A gold `POWER` label, with the bar under it.
  - The bar is gold with a lighter top row.
  - When it's full, the bar glows (a pulse of light pixels along it) and a
    **Y button** lights up beside it.
- The game has no Y glyph yet. Add one in the style of the existing A, B
  and X glyphs, as a yellow disc with a dark Y, since Y is yellow on an Xbox
  pad.

### Amended after the parent's playtest (2026-10-25)

The parent played the build on a controller and found the hold-and-release
power-up too hard to use. Max defends close, so the one-second stand-still
charge was nearly always tackled. The parent rejected an aura that blasts
Max back, because it could be spammed. They chose this instead, and it
replaces *Powering up* and *Max and the power-up* below wherever they
disagree:

- **Y powers up at once.** With a full meter, the ball his, and play on,
  pressing Y powers him up straight away. A press made while Y is held
  waits for the ball.
- **He keeps playing.** He runs and dribbles at full speed with the aura
  and the power hair. A gold bar over his head counts down the power-up's
  time: about 2.5 s *(designer's pick within the parent's 2–3 s)*. SHOOT!
  flashes over him.
- **The wave is ready about 1 s after he powers up** *(the parent chose a
  short ready-up; 1 s is the designer's tuning of the suggested 0.75 s)*.
  SHOOT! appears then, with a chime and a sharp rumble, and the aura
  grows to full as it readies.
- **Then his next kick, X, is the Energy Wave.** It fires at once at
  Max's goal, from where the ball is, with no shot charge. He turns to
  face that goal as he strikes, and up/down aim it as before. While he's
  powered up, X never fires a normal shot: until the wave can fire, the
  press does nothing. The bracing and blow-away rules of *The Energy
  Wave* are unchanged.
- **It ends without firing** when the time runs out, when Max plays the
  ball or knocks him down, when he makes any other move (a chip, a slide,
  a volley or a header), when play stops, and when the game pauses. The
  meter is kept: only a fired wave spends it *(designer's call, in line
  with the anti-goal)*.
- **Max backs off and braces** *(the parent's choice, after an instant
  wave scored almost every time)*. When Harrison powers up, Max reacts
  after his usual reaction time and backpedals toward his own goal,
  facing Harrison, to about 110–130 px away, then stands square. He
  backpedals at 90% of his run, slower than Harrison can sprint, so
  Harrison can chase him down; in front of his goal he runs out of room.
  While Harrison is powered up, Max never challenges him: before he
  reacts he hesitates where he is.
- **Max doesn't always get it right** *(the parent's choice)*. Each
  power-up he gets it right with a chance set by the difficulty: Easy
  half the time, Normal three in four, Hard nine in ten. Otherwise he
  makes one of three mistakes, each as likely: he reacts late, he stops
  too close, or he hesitates where he is instead of backing off. It's a
  dice roll, but its result is always on screen before Harrison shoots,
  which keeps the anti-goal's "timing and position he can read".
- **Measured in headless matches with Max's AI:** firing as soon as it's
  ready, without chasing, scores about 46% on Easy, 35% on Normal and 24%
  on Hard; chasing him down first scores nearly every time.
- Once the wave is on its way, Max stays square to it until it reaches
  him. The rush and the release window are gone.

### Powering up

- **Input:** Y on the pad (standard-mapping button 3). On the keyboard it's
  **V**, next to Z, X and C. This is a new `power` action.
- **He can start when** all of these are true:
  - he owns the Energy Wave;
  - the meter is full;
  - the ball is at his feet;
  - he's on the ground and free to act (not in the air, falling, sliding,
    mid-kick or charging a shot);
  - the match phase is `playing`;
  - a straight line from the ball can enter Max's goal mouth clear of the
    posts. This rules out spots beside or behind the goal line. The beam
    may take whatever angle reaches inside the posts; it isn't held to a
    shot's `MAX_AIM_SLOPE` *(designer's call)*.

  Otherwise Y does nothing. While the meter is full but no clean line
  exists, the HUD's Y button dims *(designer's call)*.
- **While Y is held:**
  - He turns to face Max's goal and plants in the `powerUp` stance.
    Turning means a beam can never fly at his own goal.
  - He stands still with the ball at his feet.
  - Over **about 1 s** the moment builds:
    - the aura flares and grows;
    - his hair lifts, using the power heads (`HARRISON_POWER_HEADS`);
    - grass, pebbles and clods float up around him;
    - the screen shake and the controller rumble ramp up;
    - a charging hum rises;
    - the crowd gasps as it starts.
  - A gold charge bar over his head shows the progress. It's the same
    place as the shot-charge bar, in gold.
- **The aura's colour comes from his form:** white before Golden Form, gold
  with Golden Form. With Golden Form his hair is also gold
  (`harrisonLook(kit, 'golden')`).
- **Fully charged:** he can hold it as long as he likes. It stays ready
  until he lets go, with the aura at full, while Max closes in (see *Max
  and the power-up*). Letting go after full always fires. There's no time
  limit, because Max ends every standoff by coming for him.
- **Cancelled, keeping the meter**, if any of these happen:
  - he's tackled or knocked down;
  - the ball leaves his feet;
  - he lets go before it's full;
  - the match stops being `playing`;
  - the game pauses, including the existing auto-pause on a hidden tab,
    blur or controller loss.

  A cancel drops him back to normal play at once. The aura fades out and
  the shake stops.

### The Energy Wave

Released at full charge:

- **The strike.** He strikes the ball and the beam fires along the aim line
  to Max's goal:
  - up = far post, down = near post, neither = centre, as for a charged
    shot;
  - **no aim error**;
  - the line is kept clear of the posts and under the bar.
- **The big moment.** It uses the main spec's anime effects:
  - one or two impact frames at the strike;
  - a shockwave ring off his boot;
  - speed lines across the screen;
  - a white flash, a heavy shake and a big rumble;
  - a blast sound, then the beam's roar.
- **The beam:**
  - it's a huge horizontal band, blue-white, with a bright white core and a
    wavy electric-blue edge;
  - it runs from his boot with a glowing orb at the head, the ball inside
    it;
  - its head crosses the screen in a fraction of a second, far faster than
    any normal shot;
  - the body lingers briefly, then fades;
  - the beam is the same colour in every form; only the aura changes.
- **The ball** travels at the beam's head, low and straight. Nothing but
  Max can stop it, so if Max isn't in its path it's a goal.
- **When the beam head reaches Max:** he counts as in its path if his body
  overlaps the beam's corridor in depth. The beam has a real depth width:
  stepping into its lane matters, and so does being a lane away. Then:
  - **He braces** if all of these are true:
    - he's on his feet (not sliding, falling, in the air or mid-kick);
    - he's facing the beam;
    - the beam head has travelled at least a bracing distance before
      reaching him. The designer's starting value is about 90 px, roughly
      a third of the screen; tune it.

    When he braces:
    - he plants in a bracing pose and is shoved back, skidding about
      20–30 px over about half a second;
    - the skid leaves short skid marks and kicks dust off his heels;
    - the beam breaks against his hands in a splash of rays, and the ball
      drops dead at his feet;
    - it's a big thud, with a shake.
  - **Otherwise he's blown away:**
    - he's knocked flying, up and back along the beam;
    - he lands and stays down longer than a normal fall, about 1.5 s
      against `FALL_TIME`'s 0.9 s;
    - the ball carries on.
- **A goal** is a normal goal moment (slow motion, GOAL!!!, the roar),
  plus:
  - the callout **ENERGY WAVE!**, which outranks every other callout;
  - a style goal worth +15 coins, which shows on Results as its own line;
  - **with Golden Form, his celebration keeps the gold look** for that
    goal (main spec: forms show "while powered up and during
    celebrations"). Without Golden Form, he celebrates in his normal look
    *(designer's call)*.

### Max and the power-up

When Harrison starts powering up, Max's AI does one thing, decided by the
parent: **he comes for him.**

- He steps into the beam's lane and runs in to tackle, facing Harrison all
  the way.
- He keeps coming whether the charge is still building or already full.
  He never plants and waits.

His bracing isn't a separate AI choice. It follows from the brace rule in
*The Energy Wave*. A Max still far away when the wave fires is upright,
facing it, and beyond the bracing distance, so he braces. Once he's inside
the bracing distance, he's blown away. If Harrison waits too long, Max
reaches him and tackles.

**The release window.** The stretch between the bracing distance and Max's
tackle reach is Harrison's window. Tune the power-up time, the bracing
distance and Max's closing speed so that:

- **On Normal the window is about half a second** as Max closes in: short
  enough to be a skill, long enough for a 12-year-old to learn.
- **Powering up with Max already close** usually ends in a tackle before
  the charge completes.

The difficulty setting and Max's ladder match scale his reaction and closing
speed *(designer's call)*:

- Easy Max reacts late and closes slowly, so the window is wider.
- Hard Max reacts at once and closes fast, so the window is tighter.

Tune it to these targets:

- **On Normal, a well-chosen wave scores almost every time.** That means
  firing as Max closes into range, or powering up with Max beaten, behind
  Harrison, or out of position.
- **A careless one is usually stopped.** That means firing at once into a
  far, square Max (braced), or powering up with Max close, or holding too
  long (tackled).

### Golden Form

- **Unlocks free at level 5** and is used automatically from then on. There's
  no Locker Room yet, so there's no choice to make, and nothing is bought.
- **Grants are worked out from his progress** (main spec): a save that's
  already level 5 or higher gets Golden Form the moment it loads. Once
  granted it's stored in the profile, so a later change to the unlock level
  can never take it away.
- **What it changes:**
  - the gold aura and gold spiky hair while powering up, firing, and
    celebrating an Energy Wave goal;
  - meter gains about 10% bigger.
- **Results** announces **GOLDEN FORM UNLOCKED!** with the level-up that
  reaches level 5.

### The Shop

- Below the four stats, add a **POWER MOVES** divider and the Energy Wave
  row, as in the approved mockup. The panel grows taller to fit, and the
  cursor moves through all five rows.
- **Below level 3:**
  - the row is shown greyed as `ENERGY WAVE  LV 3 TO UNLOCK`;
  - A plays the `nope` cue with the message `REACH LEVEL 3`.
- **At level 3 and up:**
  - the row reads `ENERGY WAVE  600`, and A buys it at once with the
    ka-ching, saved at once;
  - with too few coins it plays `nope` and the existing can't-afford
    message.
- **After buying:**
  - the row reads `ENERGY WAVE  OWNED`;
  - the message line teaches the control: `HOLD Y WITH A FULL POWER
    METER`.
- **Blurb:** `A HUGE BEAM THAT KNOCKS MAX FLYING`.
- **Results** treats the Energy Wave like any other purchase:
  - **UPGRADE READY IN THE SHOP!** counts it when he's level 3 or higher
    and can afford it;
  - the level-up that reaches level 3 adds **ENERGY WAVE UNLOCKED IN THE
    SHOP!**

### Help

The Help screen gains a short power-move entry. It's always shown, phrased
for both before and after he owns it *(designer's call)*:

`BUY THE ENERGY WAVE IN THE SHOP. FILL THE POWER METER, HOLD Y (V) TO POWER
UP, LET GO TO UNLEASH.`

Split it over lines as the screen needs.

## The save: profile version 2

New fields mean a version bump, because a v1 build drops unknown fields when
it writes.

- **The profile becomes `version: 2`.** It adds:
  - the power moves he owns;
  - the power forms he owns;
  - which of each is equipped.

  Store "equipped" now, even though it's automatic for now, so the Locker
  Room can arrive later without another bump. The exact shape is the
  builder's.
- **v1 saves load field by field into v2.** They start with no moves, and
  with Golden Form if they're already level 5 or higher.
- **A v2 save is never overwritten by a v1 build.** `writeUnlessNewer`
  already guarantees this. The live v1 build reads a v2 save as best it
  can, and doesn't write it.
- **Unknown move or form names in a save are dropped** on load. So are
  duplicates, and an equipped item he doesn't own.
- All the Plan 5 rules still bind:
  - level is stored;
  - nothing earned or bought is ever taken back;
  - storage that throws never stops the game;
  - a broken field falls back on its own.

### Save code, and resetting the save

These are owed from the main spec. The stakes of the save rise with this
plan, so they come with it *(designer's call: the handoff said "before or
with" the power moves)*. They're both reached from **Options**, as two new
rows under RUMBLE: `SAVE CODE` and `RESET SAVE`. These two rows only appear
when Options is opened from the Hub, never from the pause menu in a match
*(designer's call)*.

- **The save code** (main spec): "a copyable string with a checksum, as a
  backup and for moving computers".
  - **Format.** The code encodes the whole profile with a checksum and the
    profile version. Its alphabet must fit the game font (uppercase letters
    and digits; `-` for grouping), e.g. Crockford base 32 in groups of 5.
  - **Showing it.** `SAVE CODE` opens a screen that shows the current code
    in large, grouped characters, so it can be photographed or written
    down. The same screen also copies the code to the clipboard. If the
    copy fails, it still shows the code.
  - **Entering a code.** From that screen, `ENTER A CODE` takes a code
    typed on the keyboard or pasted. Characters outside the alphabet are
    ignored, and case and spaces don't matter. A gamepad can't type, so
    this part is keyboard-only, and the screen says so.
  - **Typing doesn't drive the game.** While a code is being typed, the
    game's own keys are off. Z, X, C and V type letters rather than
    confirming or backing out. Only Esc leaves, and Enter submits
    *(designer's call)*.
  - **Future builds can read today's codes.** Lay out the encoding so later
    builds only ever add fields at the end. A code from an older build then
    still reads, and a newer one reads as best it can *(designer's call)*.
  - **Checking a code.** A code that fails its checksum or doesn't decode
    shows `THAT CODE DOESN'T WORK` and changes nothing.
  - **Applying a code.** A good code shows what it holds (`LEVEL 6 - 840
    COINS - LADDER 4/10`). Applying it needs a confirm with **NO**
    pre-selected. It replaces the current save and goes through the same
    field-by-field loader, so a code from a newer build loads as best it
    can.
  - The code has the checksum to catch typos, not to stop tampering. A
    tampered code that passes the checksum loads with every field clamped.
- **Reset save** (main spec: "with a confirmation step"):
  - `RESET SAVE` opens a confirm screen. It shows the current save code
    first, so a reset can be undone, then asks **ARE YOU SURE?** with
    **NO** pre-selected.
  - YES starts a fresh level-1 profile and saves it at once. Settings are
    not reset.

## Also folded in

- **The Plan 5 deferred minors:**
  1. **An absurd `xp` in a tampered save makes `addXp` loop forever** (for
     example `1e300`). Cap the loaded counts (xp, coins, totals) at sane
     ceilings so loading and levelling always finish fast. The save code
     makes this more urgent.
  2. **The match crowd follows him from Results into the Shop.** Add
     `setCrowd('off')` in `createShopScene`.
  3. **Mashing A can skip the tally and then pick NEXT MATCH about 0.1 s
     later.** Add a short grace after the skip before the menu takes A.
  4. **The Hub's menu hides the backdrop's juggling Harrison.** Move one or
     the other so he's visible.
  5. **Test nits:** a trailing blank line in `cues.test.ts`, and
     `coins: "lots"` missing from the bad-field test.
- **New sound cues**, synthesised and kept as short and quiet as Plan 4's:
  - the power-up hum, rising with the charge;
  - the release blast;
  - the beam's roar;
  - the brace thud with the skid;
  - Max's blown-away whoosh;
  - the crowd gasp, if the crowd synth can make one.

## Goals

- **Harrison gets the moment the parent asked for:** a power-up and a beam
  that feel like an anime special move, earned by playing well and saved up
  for in the Shop.
- **Max can stop it,** but only through timing and position. Harrison can
  learn to beat that by picking his moment, and a well-picked moment scores.
- **The Shop has its first item worth saving for,** and levels finally
  unlock something.
- **The save gets safer as it gets more valuable:**
  - v2 loads every v1 save;
  - a save code can back it up or move it;
  - reset can be undone with that code.
- **Everything Plans 2–5 got right survives,** including the arcade pace, the
  feel targets, and the stuck-ball and stall fixes.

## Non-goals (this round)

- **Other power moves:** Blaze Shot, Dragon Strike, Blink Dash, Meteor
  Volley and Thunder Header.
- **The three tiers of power-move upgrades** (main spec). The Energy Wave
  ships at one level. Tiers come with the next power moves.
- **Storm Form and Ultra Form, the Locker Room,** and choosing a form or
  move.
- **The Power Clash.**
- **Max, or anyone else, using a power move.**
- **Level-unlocked skill moves:** the step-over, rainbow flick, bicycle
  kick and scorpion kick.
- **Career mode, Training Ground, cosmetics, the Trophy Room.**
- **Retuning the Plan 4 and 5 sound by ear.** It waits until the parent or
  Harrison has listened. The same goes for the upgrade pace, the ladder
  table and the Results tally length.
- **Refunds or re-speccing.**

## Anti-goals

These would make it a failure even if it technically works:

- **Changing the game before he owns the move.** A level-1 Harrison, or any
  Harrison who hasn't bought the Energy Wave, plays exactly as today:
  - no meter on the HUD;
  - Y and V do nothing;
  - the existing headless AI-vs-AI tests pass unchanged.
- **A move that always scores, or never does.** Max's stops must come from
  timing and position that Harrison can read, never a dice roll.
- **Players flung into broken places.** A blown-away Max must:
  - land inside the field;
  - never end up inside a goal frame, its netting or its roof;
  - never be stuck.

  Plans 2–3 fixed roof traps and stuck players; keep every guarantee.
- **Losing the meter unfairly.** A cancelled power-up never costs the
  meter. Only a fired wave spends it.
- **Losing or corrupting progress:**
  - the v1 to v2 load drops nothing;
  - a bad save code changes nothing;
  - reset never happens without the confirm;
  - storage that throws never stops the game.
- **Effects that hide the play or hurt to watch:**
  - shake and flash stay within what Plan 4's goal moment already does;
  - the beam never blanks the whole screen;
  - impact frames are one or two frames, not a strobe.
- **A babyish tone.** It's a cool sports game for a 12-year-old.
- **Likeness slips.** No surname anywhere. The reference photos never leave
  `reference/`. Only the approved head art is used: the normal heads, the
  power heads and their golden colours.

## Constraints

- **Stack and rules:** the same as Plans 1–5:
  - Vite + TypeScript (strict), Canvas 2D, no engine, no runtime
    dependencies, Vitest, Node 22 in CI;
  - 320×180, with the sim at a fixed 60 Hz.
- **No image, audio or font files.** Everything is drawn or synthesised in
  code.
- **On-screen text** uses only uppercase letters, digits and
  `' - : ! ? . , / + < >`.
- **The sim stays deterministic and headless-testable.** Power-ups, beams,
  braces and blow-aways are part of `stepWorld`, with their events reported
  like the existing kicks and goals. Effects and sound hang off those
  events.
- **The sim at every stat level, with the move in play.** Headless
  AI-vs-AI matches that trigger power-ups and waves (at random moments and
  ranges, with both brace and blow-away happening) must keep every existing
  guarantee:
  - a result;
  - no NaN;
  - no ball resting unreached for over 5 s;
  - nobody stuck for over 10 s;
  - also: no player ever inside a goal frame.
- **Work on the `plan-6-energy-wave` branch.** `main` is what Harrison
  plays, so **ask the parent before every merge and every push** (the repo
  is public, and a push deploys to GitHub Pages).
- **Commits** follow Conventional Commits, 50/72, with no AI attribution
  trailers. Run `git status --short` before every commit.

## Left to the builder

- **Constants**, tuned to the targets above:
  - meter weights;
  - power-up time;
  - beam speed, length, depth width and fade;
  - bracing distance;
  - skid distance;
  - blow-away launch and landing;
  - Max's reaction by difficulty.
- **The look of the effects**, within the approved mockups and the main
  spec's anime-effects list:
  - aura shapes and animation;
  - the debris;
  - the beam's edge;
  - the splash and skid marks;
  - the impact frames.
- **Max's bracing pose** as an animation clip. The mockup's pose leans in
  with both arms thrust forward, the front foot planted and the back leg
  driving. Max's blow-away can reuse or extend `fall`.
- **Module layout.** A guide:
  - the meter and the power-up as pure, tested sim modules in `src/game/`;
  - the catalogue (moves and forms, unlock levels, prices) in
    `src/meta/`;
  - effects in the match view;
  - the save code's encode and decode as a pure module with tests.
- **The save code's exact encoding and checksum.**
- **The layouts** of the Options rows, the save-code screens and the taller
  Shop panel, within 320×180.
- **Test approach.** It must cover:
  - meter gains and the fill targets;
  - every start condition and every cancel;
  - that a cancel keeps the meter and only a fired wave spends it;
  - aim lines;
  - the clean-line start condition, and the dimmed Y where it fails;
  - brace against blow-away at the boundary of every condition;
  - the blow-away landing never inside a goal;
  - Max closing in on a power-up: braced too early, blown away in the
    window, a tackle too late;
  - the callout's precedence and the style-goal payout;
  - Shop locked, buy, can't-afford and owned;
  - the Results unlock lines;
  - v1 to v2 load, and Golden Form granted on load;
  - a v2 save untouched by v1 rules;
  - save code round trips, bad checksums, junk input and a newer version;
  - reset's confirm;
  - each folded-in minor;
  - the headless matches with waves in play;
  - that a Harrison who doesn't own the move plays exactly as before.

## Release

- **Before merging:**
  - the full test suite;
  - a production build;
  - a Chrome playtest, staged through the dev hook (`window.__soccer`),
    covering:
    - buying the move;
    - a full meter;
    - a cancelled power-up;
    - a wave that blows Max away and scores;
    - a wave Max braces;
    - Golden Form at level 5;
    - a save code out and back in;
    - a reset.
- **Show the parent before asking to merge** (SendUserFile, plus how to see
  it live). This is new art of Harrison, so the parent approves it:
  - GIFs of the power-up and both outcomes, in base and Golden Form;
  - stills of the new HUD, the Shop and the save-code screens.
- **Ask before the push.** The live build moves Harrison's save to v2. Once
  that's live, every later build must read v2.
- **After it ships:** update the game-tour page. Its "Next update" section
  is now live, and the Energy Wave moves from "Coming later" to "In the
  game now".

## Build order change

The main spec's build order, as amended by Plans 3–5:

1. Pixel Harrison (done)
2. A basic match (done)
3. Depth band and front-end screens (done)
4. Big moments and sound (done)
5. Progression core, with the Backyard Ladder (done)
6. **The Energy Wave slice (this document): super meter, power-up, Energy
   Wave, Golden Form, plus save code and reset**
7. Career mode
8. Training Ground
9. The other power moves and their tiers, Storm and Ultra Forms, the Power
   Clash, skill moves, the Locker Room and cosmetics, the Trophy Room
10. Polish (settings beyond the save code, difficulty and the quiet
    ease-off, balancing)
