# Skill Moves: the Stepover and the Rainbow Flick — Design

Amends `2026-10-22-harrison-soccer-design.md` (the main spec) and follows
`2026-10-27-roadmap-after-the-park-design.md` (the roadmap), whose first
next plan this is. Where they disagree, this document wins. Anything it
doesn't touch still stands.

## Intent

Plan 7b is live (`main` at `f4953c8`). Harrison played the Park through to
Speedy Sam on Easy, says the game "feels really fun now", and asked for
two moves by name: the **stepover** and the **rainbow flick**. The parent's
brief: *"We just want them to feel great to pull off."*

They matter for a second reason. Showtime Shay, the State Championship's
boss, will beat defenders with these same tricks, and the lesson of that
match is "don't bite on the trick". Harrison learns both tricks himself
first, so by the time he meets Shay he knows exactly what she's doing.

How Harrison pictures them (his words, through the parent): after a
rainbow flick the defender gets **tripped up a bit**; after a stepover the
defender is **briefly "confused"**.

What would make it a failure, in Harrison's words: *"If it makes things too
hard or too easy or if it's not 'fun'."* Read as:

- **too hard:** fiddly to pull off, or it seems to fail for no reason he
  can see;
- **too easy:** a trick that wins matches on its own, or that works when
  he just mashes RB;
- **not fun:** pulling one off doesn't feel like a moment.

## What was decided

By the parent, in the skill-moves brainstorm (2026-10-27):

- **Both tricks, on RB:** a stepover by default, the rainbow flick with
  the stick up, as the main spec's controls table has it.
- **What they do to a defender:** a stepover leaves him confused for a
  moment; a rainbow flick trips him up a bit.
- **Picking the moment matters.** A trick only fools a defender who's
  close and coming at him, so mashing RB doesn't work. After the review,
  the parent confirmed that "coming at him" includes a defender standing
  in his way facing him (*squared up*, below).
- **A mistimed trick still plays out and fools nobody.** It costs the time
  it takes, not a loose touch. After the review, the parent added two
  guards against mashing: **a short cooldown** between tricks (the
  parent's own idea) and **a defender who sees a trick coming is wise to
  it** for a few seconds (the designer's, accepted).
- **Free, and both unlock together, as soon as the update loads.** No
  coins.
- **When a trick works:** a STEPOVER! or RAINBOW FLICK! callout, the
  crowd's "ooh", a small boost to the super meter, the defender visibly
  fooled (confused after a stepover, stumbling after a flick), and a goal
  straight after a trick counts as a style goal.
- **Each opponent's reaction** was left to the designer ("use your best
  judgment"). The proposal under *How each opponent reacts* was played
  back and accepted ("Sounds good!").

**The designer's proposals that the parent heard played back and
accepted:** unlocking at level 4; a defender fooled once can't be fooled
again for a few seconds; Hard's right moment is narrower; the per-opponent
reactions; the art list and its approval.

## The tricks

### Controls

| Input | With the ball at his feet |
|---|---|
| RB (key D) | Stepover |
| Stick up + RB (Up arrow + D) | Rainbow flick |

- "Stick up" is the same up he aims shots with: the stick pushed up past
  half way on the tick RB is pressed. Anything else (no stick, left,
  right, down) is a stepover.
- **When he can start one:** on his feet in play, the ball his (low, just
  ahead of him, in his lane, not at the opponent's feet nor in Biscuit's
  mouth, the drag-back's test), and not already in a trick, a drag-back,
  a stumble, a shot or chip wind-up, the air, or with the Energy Wave live.
- **Without the ball, or below level 4,** RB does nothing.
- **During a trick** he's committed: other presses wait for it to end, as
  in the drag-back. A trick is "another move", so it ends a power-up and
  keeps the meter, as a chip does.
- **The cooldown:** for **1 s** after a trick ends, RB does nothing, and a
  press in that time isn't saved for later. The steal button already works
  this way.

### The stepover

- His foot circles over the ball and his body dips to one side. The ball
  stays at his feet throughout and his own touches don't knock it on,
  as in the drag-back.
- **About 0.4 s** long. He eases forward at about half his run along his
  facing, then he's free again.
- **The sell** is the moment the foot passes over the ball, about half way
  through. If a defender is *squared up* to him at that moment (see
  *Picking the moment*), the defender is **confused**.
- **Confused:** the defender sways a step toward the side the stepover
  dipped, about 8 px in depth, and stands facing the ball. For the length
  of his confusion he doesn't challenge, slide, steal, jump or head, and
  he can't play the ball at all: it can roll past his feet. His body stays
  solid, so Harrison still has to go round him. Then he plays on as
  normal.
- **Which side it dips:** toward the tighter side of the band, so the
  defender's sway closes the tight side and opens the roomy one, the same
  rule Tricky Tia's fake uses. *(Designer's call.)*

### The rainbow flick

- He traps the ball between his feet, rolls it up the back of his leg
  with the other foot, and flicks it with his heel over his own head.
- **About 0.5 s** long. **The sell** is the release, about half way
  through. If a defender is squared up at that moment, he **stumbles**.
- **The ball's path:** forward along his facing, up to about 50 px (high
  enough to clear a standing player's head) and landing about 80 px
  ahead. After the release Harrison runs on at his normal pace and
  arrives about when it lands. The builder sets the exact arc; it should
  clear any player's head between 12 and 56 px ahead and land in front of
  where a running Harrison gets to.
- **Stumbles:** the defender lurches on a step or two at his own brakes,
  arms out, catches himself, then turns round to chase. While he
  stumbles he can't play the ball, jump or head, and his body stays
  solid. Then he plays on as normal.
- **Facing his own goal near it,** the flick could drop into his own
  net. Inside the keep-out zone (the 150 px in front of his own goal
  line) and facing that goal, stick up + RB does a stepover instead.
  *(Designer's call.)*
- A flick that drops straight into the opponent's net counts as a trick
  goal (see *When a trick works*).

### Picking the moment

A defender is **squared up** to Harrison at the sell when he:

- stands in front of Harrison along his facing, between a near and a far
  edge (the *window*, below);
- is in Harrison's lane, within about 14 px in depth;
- faces Harrison;
- is on his feet and playing as normal: not already fooled, not fallen,
  braced or blown away, not backing off from a powered-up Harrison, not
  wrong-footed after a steal, not holding his kickoff spot; and
- isn't **wise to it** (below).

"Close and coming at him" means *squared up to challenge him*: coming at
him, or standing in his way facing him (confirmed by the parent). Max
defends from a spot about 20 px goal-side of the ball and slides in from
close, so as Harrison dribbles at him the gap closes through the window.
The builder check measured him inside the Normal window, in the lane and
facing Harrison, about a fifth of the time Harrison has the ball: that
fifth is the moment to pick.

**Wise to it.** A defender can't be fooled for **3 s**:

- after his confusion or stumble ends, so a fooled defender can't be
  fooled again straight away; and
- after he **sees a trick that doesn't fool him**: at its sell he faced
  Harrison from in front, within about 120 px, but wasn't squared up (too
  far, too close, out of the lane, or already wise). The 3 s run from that
  sell. A trick thrown too early uses up Harrison's chance against that
  defender for a moment, and a string of tricks keeps him wise.

**The window**, the gap from Harrison to the defender along his facing,
starting values for the builder to tune:

| | Near edge | Far edge |
|---|---|---|
| Easy | 12 px | 56 px |
| Normal | 14 px | 46 px |
| Hard | 16 px | 38 px |

Closer than the near edge he's already on the ball; further than the far
edge he's too far off to bite.

**Nothing is left to luck.** A defender who is squared up at the sell is
always fooled; one who isn't never is. There are no dice in it, so a trick
timed right always works and Harrison can see why one didn't. This also
means the tricks draw no random numbers, which keeps every existing seeded
test the same. *(Designer's call.)*

**A mistimed trick** still plays out in full and fools nobody. It costs
the time it takes, the cooldown, and, if the defender saw it, his 3 s of
being wise to it. A defender who isn't fooled plays on as normal
throughout, so he may challenge the ball at Harrison's feet during a
stepover, or jump and head a flick that goes up in front of him, exactly
as he would today.

## How each opponent reacts

**Everyone plays exactly as today until fooled.** Fooled, an opponent goes
through the reaction, then plays on as normal. How long the reaction lasts
is a base time by difficulty, scaled per opponent.

Base times, starting values:

| | Confused (stepover) | Stumble (flick) |
|---|---|---|
| Easy | 0.9 s | 0.9 s |
| Normal | 0.7 s | 0.7 s |
| Hard | 0.5 s | 0.5 s |

Both are counted from the sell.

| Opponent | Reaction | Scale (stepover / flick) |
|---|---|---|
| **Max** | The baseline: sways and stands; stumbles, turns and chases. | ×1 / ×1 |
| **Big Brick** | Waits deep rather than rushing in, and a stepover barely moves him: a flinch. The flick still goes over his head, and he's big and slow to turn round. Against him, flick rather than stepover. | ×0.3 / ×1.2 |
| **Boomer Leo** | Like Max. | ×1 / ×1 |
| **Tricky Tia** | A trickster herself, she's fooled for less time. | ×0.6 / ×0.6 |
| **Pesky Pete** | Commits flat out, so he bites hardest, just as a clean steal leaves him standing longer. | ×1.5 / ×1.5 |
| **Speedy Sam** | Fooled at full speed, his soft brakes do the rest: confused or stumbling, he skids a long way past. A flick over a charging Sam is the big payoff. | ×1 / ×1 |
| **Biscuit** | A stepover makes him stop and tilt his head. A flick sails over him (he can't take a ball above his catch height anyway) and he leaps for it, misses and tumbles, then scrambles up. | ×1 / ×1 |

- Sam's skid needs nothing new: while fooled his stick lets go, and his
  own brakes carry him on. His stumble lurches at his brakes too.
- Pete and Sam come at Harrison fast, so they pass through the window
  quickly: the timing is tighter against them, which is the point.
- Biscuit only meets a trick while Harrison has the ball, so the dog's
  carrying, jinking and panting are untouched. His tilt and tumble are
  new states of his own, like his daze.
- **The scale numbers are the builder's to tune** to the personality
  checks under *Measuring it*; the order (Pete bites hardest, Brick's
  stepover least) is the design.
- **"Flick, don't stepover" is Brick's alone.** Against everyone else the
  two tricks fool equally well; they differ only in what follows. The
  stepover keeps the ball at his feet. The flick puts it in the air,
  where a defender who wasn't fooled may head it. Help doesn't teach a
  general rule. *(Designer's call.)*

## When a trick works

All of this happens only when a trick fools someone:

- **A callout:** STEPOVER! or RAINBOW FLICK! for about a second, in the
  small pixel font over play. It never covers a goal moment.
- **The crowd's "ooh"** (the `ooh` cue).
- **The super meter:** +0.1 (`METER_GAIN.trick`), only with a power move
  owned, as every meter gain is. For comparison, a tackle is 0.15.
- **The defender visibly fooled:** the confused sway with a small pixel
  "?" over his head, or the stumble. Biscuit tilts his head with the same
  "?".

Sound that plays whether or not anyone is fooled: a quick swish for the
stepover and a soft pop as the flick leaves his heel. The builder designs
both; like every cue so far, they're by design, not by ear.

**Trick goals.** A goal is a **trick goal** when a trick fooled someone and
Harrison then scored within **4 s** of the sell with no opponent playing
the ball in between. Dribble touches of his own in between are fine. A
flick that drops straight in is one too, fooled or not.

- It's a **style goal**: +15 coins on Results as **TRICK GOAL** (or **2
  TRICK GOALS**, and so on), the meter's style-goal gain, and it counts
  toward the SCORE 2 STYLE GOALS bonus and the style-goal total.
- **One style per goal.** If the scoring kick is itself a header, volley,
  chip or Energy Wave, the goal is that kind of style goal, as today, and
  isn't also a trick goal.
- **The line under GOAL!!!:** ENERGY WAVE! and HAT-TRICK! come first, as
  today. Then a trick goal shows its trick, STEPOVER! or RAINBOW FLICK!.
  Then the rest as today (PERFECT STRIKE!, HEADER!, VOLLEY!, CHIP!,
  SCREAMER!).

## Unlocking

- **Both tricks unlock at level 4,** between the Energy Wave (level 3)
  and Golden Form (level 5). Owning them is worked out from his level, so
  there's **no save field and no save version change**. Harrison is well
  past level 4 (sixteen wins to reach Sam pay several times the 450 XP it
  takes), so they're his the moment the update loads.
- **Levelling into 4** (a fresh career, or a save code from early on)
  shows a Results unlock line, as the Energy Wave's does: NEW MOVES:
  STEPOVER + RAINBOW FLICK.
- **He finds out about them** from the Help screen, with the parent
  telling him. *(Designer's call: a one-time "new moves" notice would need
  a saved flag and a save version change, which isn't worth it here.)*
- **Help:** the CONTROLS page gains an RB line (with a new RB button
  picture), and the moves get their own lines: RB when someone's close in
  front of you fools them with a stepover; with up, flicks the ball over
  their head; too far off or too late fools nobody; from level 4. The
  builder fits the wording and pages to the pixel font.

## Art, and the parent's approval

New frames, all on the shared skeleton and baked per look:

- **Harrison:** the stepover (4 frames: foot circling over the ball, the
  body dipping to the side) and the rainbow flick (6 frames: ball between
  the feet, rolled up the calf, the heel flick, the follow-through), in
  home and away kits. The ball is drawn following his foot until the
  release.
- **The human opponents,** shared by Max, the crew and Sam: *fooled* (3
  frames: the lean the wrong way, arms out, with the "?" mark) and
  *stumble* (4 frames: the lurch, arms flailing, catching himself).
- **Biscuit:** the head tilt (2 frames, with the "?") and the leap and
  tumble (5 frames: springing at the ball, missing, rolling, scrambling
  up).

**Approval checkpoint:** a character sheet with every new frame for
Harrison and each opponent in their kits, and a GIF of the tricks in real
match scenes (a stepover past Max, a flick over Max, a flick over a
charging Sam into his skid, a stepover against Pete, Biscuit's tilt and
tumble), go to the parent. **Nothing merges until the parent approves.**

## Measuring it

### What must not change

- **Every existing tuning test passes unchanged:** `maxTuning`,
  `crewTuning`, `samTuning`, `dogTuning`, the AI-vs-AI matches, the
  no-kit parity test and the handling snapshots. The scripted Harrisons
  never press RB.
- **A world without the tricks plays exactly as before.** The match knows
  whether Harrison has them (his level), the way it knows whether he has a
  power move; without them RB does nothing. With them, nothing changes
  until he starts a trick, and the trick code draws no random numbers.

### Unit tests (rules, not tuning)

- Each trick starts only when the ball is his, and not below level 4.
- A defender squared up at the sell is fooled; one outside the window, out
  of the lane, facing away, already fooled, or wise to it is not.
- Wise to it: 3 s after a confusion or stumble ends, and 3 s from the sell
  of a trick he saw (facing Harrison, within 120 px in front) that didn't
  fool him; a defender who didn't see it isn't made wise.
- The cooldown: RB does nothing for 1 s after a trick ends, and a press
  then isn't saved.
- A fooled defender doesn't challenge, slide, steal, jump, head or play
  the ball until his reaction ends, and his body stays solid.
- The flick clears a standing player's head across the window and lands
  in front of a running Harrison; inside the keep-out zone facing his own
  goal it's a stepover.
- A trick ends a power-up and keeps the meter; a fooling trick adds 0.1
  to the meter only with a power move owned.
- Trick goals: scored within 4 s with no opponent touch; an opponent's
  touch or the time running out ends the chance; one style per goal; the
  callout's order; the Results line; the bonus and the totals count them.
- The Results unlock line appears on the level-up into 4 and never again.

### Tuning targets (headless, CI)

A **scripted trickster**: the existing scripted Harrison who, when he has
the ball and the defender comes into range, does a trick, with his own
seeded reaction so that some are timed right and some aren't. Played
against Max at rung 10 on seeds 100–163, Harrison at the usual tuning
stats. Starting targets for the builder, who records what he measures and
brings any miss to the parent:

- **Timed right, it works (not too hard):** tricks with the defender
  squared up at the sell get Harrison past him with the ball (the face-off
  *beat* measure the crew's checks already use) at least 80% on Easy, 70%
  on Normal and 55% on Hard.
- **Mashing doesn't work (not too easy):** a spammer who presses RB
  whenever he can wins no more than 0.06 above the plain scripted Harrison
  on Normal, on the same seeds.
- **Not a win button (not too easy):** the trickster's Normal win rate is
  above the plain script's, by no more than 0.20; his Hard win rate stays
  at or under 0.25 (the plain script's is 0.016).
- **The personalities show,** on Normal, 32 seeds each: of the stepovers
  that fooled the defender, the share that went on to beat him runs Pete
  ≥ Max ≥ Tia ≥ Brick, and a fooled Sam ends up at least twice as far
  past Harrison as a fooled Max. Counting only stepovers that fooled
  someone keeps the check about each opponent's reaction, not about how
  often he happens to be squared up. *(Designer's call.)*
- **Biscuit isn't made easy.** The builder check measured him squared up
  about a third more often than Max, and a confused dog can't snatch, which
  is his whole threat. Against the dog's own blocker script on Normal
  (seeds 100–163), a trickster wins no more than 0.20 above the plain
  blocker, and a spammer no more than 0.06. The levers are the dog's own
  base times and window. *(Designer's call.)*

**Not fun** is the parent's and Harrison's call, on the sheet, the GIF and
a playtest.

## Non-goals

- The bicycle and scorpion kicks: they stay in the main spec's step 9.
- Opponents doing tricks. Showtime Shay's tricks are designed with the
  State Championship. Tricky Tia's fake stays as it is.
- Changing how any opponent plays, apart from its reaction to a trick.
- New bonus objectives for existing matches, Training drills, or trick
  counts in the saved totals.
- Any save change.

## Constraints

Unchanged from the earlier specs:

- the save rules, and the no-kit parity rule;
- on-screen text uses only uppercase letters, digits and
  `' - : ! ? . , / + < >`;
- no image, audio or font files, and no surname anywhere;
- new art goes to the parent for approval before anything merges;
- ask before every merge into `main` and every push, since Pages deploys
  on push.

## Left to the builder

The poses and frame timing; the exact durations, window edges, scales and
the flick's arc, within the targets above; the ball's path during each
trick; the sounds; the callout's placement; the scripted trickster and
spammer; the Help wording and layout; module layout (a `tricks.ts` beside
`dragBack.ts` is the obvious home; the confused state can likely reuse
the brain's wrong-footed handling).

## Designer's calls (not confirmed by the parent)

- No luck: a defender squared up at the sell is always fooled.
- The sell moment, half way through each trick.
- A fooled defender can't play the ball at all; his body stays solid.
- The stepover dips toward the tighter side.
- Seeing a trick means facing Harrison from in front within 120 px; the
  cooldown's 1 s.
- The meter's +0.1; the trick goal's 4 s and its place in the callout
  order; a flick that drops in counting fooled or not.
- No flick toward his own net inside the keep-out zone.
- "Flick, don't stepover" being Brick's alone.
- The personality check counting only stepovers that fooled someone, and
  the targets against Biscuit.
- The "?" mark; the Help lines instead of a one-time notice; the Results
  unlock line.

## As built (2026-10-28)

What shipped, where it differs from the starting values above. The code
(`src/game/tricks.ts`, `trickScripts.ts`, `trickTuning.test.ts`) is the
authority for the numbers.

**Controls (changed after the build, the parent's call 2026-10-28).**
RB and stick up + RB were hard to do mid-dribble, so the tricks moved to
the right stick, which nothing else uses: **flick it up for a rainbow
flick, down for a stepover** (keys **F** and **D**). A push fires once
it passes three-quarters of the way along its stronger axis (a push
mostly sideways does nothing, left free for later tricks) and fires
again only after the stick comes back near the middle. RB does nothing.
The left stick no longer picks the trick. Facing his own goal in the
keep-out zone, a flick is still a stepover. Help's CONTROLS line shows
an RS picture, and the TRICKS page says right stick down and up.

**The tricks.** Stepover 0.4 s, sold at 0.2 s, at half pace; the ball held
8 px ahead. Rainbow flick 0.5 s: he stands while the ball rides from his
foot up behind his heel (6 px back, 12 px up), and it leaves his heel at
0.25 s at 130 px/s forward and 360 px/s up, with backspin (-6). It peaks
about 78 px up, clears a standing player 12-56 px ahead, lands about
90 px on, and the backspin sits it down for him; at Speed 1-7 he is 8-18
px behind it as it lands. Cooldown 1 s, wise 3 s, seeing range 120 px,
lane 14 px. A trick press with the stick back is the trick, not a drag-back.

**Windows and times.** The windows are the spec's (Easy 12-56, Normal
14-46, Hard 16-38 px). Base reaction times Easy 0.9 s, Normal 0.7 s,
**Hard 0.6 s** (from 0.5: at 0.5 only .53 of fooling tricks got him past
Max on Hard, under the .55 floor). Scales as the spec's table: Max, Leo
and Sam ×1, Brick ×0.3 / ×1.2, Tia ×0.6, Pete ×1.5. Biscuit's own
profile starts as copies of these and was not changed.

**Measured** (seeds 100-163 unless noted, the scripted trickster
pressing once an exchange at a random gap, the spammer whenever he can):

| | Easy | Normal | Hard |
|---|---|---|---|
| Fooling tricks that get past Max | .84 | .76 | .74 |
| Wins vs Max: plain / trickster / spammer | .875 / .688 / .438 | .625 / .672 / .203 | .016 / .063 / .047 |
| Wins vs Sam: plain / spammer | .672 / .719 | .516 / .500 | .281 / .422 |

Against Biscuit on Normal: plain .625, trickster .656, spammer 0.
Personalities (Normal, seeds 100-131): of fooling stepovers, the share
that got past runs Max 1.00, Tia .57, Brick 0; Pete .87 over 64 seeds; a
Sam fooled at speed ends 49.4 px past Harrison, a fooled Max 29.4.

**The parent's calls on the checks** (2026-10-28): the beat share can't
rank Pete above Max (fooled for 0.7 s or more, nearly every stepover
beats him), so Pete has his own .7 floor over 64 seeds and the order
check is Max ≥ Tia ≥ Brick. Sam is rarely fast when squared up at the
sell, so his skid is checked on the Sams fooled at speed, at 1.5× a
fooled Max. A trial of Pete and Sam at ×2 let mashing RB beat Sam on
Easy .906 to .672, so they stayed at ×1.5 and ×1, and the tuning now
guards Sam against the spammer on Easy and Normal.

**Rules worth knowing.**
- A fooled defender can't play the ball at all, and it's never a 50/50
  with him: Harrison just plays it.
- A trick whose ball is taken, or whose spot is behind a fence, post or
  net, plays out without it and fools nobody.
- A clean steal leaves Max wise for his wrong-footed beat.
- A trick goal's meter gain comes from the match scene.
- The trick callout draws over Harrison and clears when he scores.
- The scripted trickster takes the opening after fooling someone, as a
  player would; the beat counts only with the ball past the defender
  and down.

**Open for the parent.** After a stepover Harrison's first touch sends
the ball straight on. Max sways out of the lane, so he carries it past,
but a tilting Biscuit doesn't sway: the ball sits at his nose and he
takes it when the tilt ends. On Hard, mashing RB still beats Sam (.422
vs .281); no target covers it. Deferred minors from the final review:
PERFECT, STEPOVER! and SHOOT! share a spot over Harrison; Biscuit's
nosing-in dwell carries through his tilt; a defender who took the ball
mid-trick isn't made wise; one tick of trick movement after the whistle.
