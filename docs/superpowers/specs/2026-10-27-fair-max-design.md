# A fairer Max: winning the ball, kickoff room, turning, and Easy/Normal

Amends the main spec (`2026-10-22-harrison-soccer-design.md`) and the
plans since. Comes before Plan 7b.

## Intent

Harrison and his parent played the live game (Plan 7a, `main` at
`eb18095`) on Easy and Normal against Max and both found it hard to win.
Hard is fine as it is. Harrison named three things that make it hard,
and they read like causes, not just difficulty numbers:

1. When Max has the ball and is running at Harrison's goal, catching
   him and trying to win it back often knocks the ball into Harrison's
   own goal.
2. At Harrison's kickoff, his shot is very often taken by Max straight
   off his kick.
3. With the ball, it's hard to turn round and keep it.

What the code says about each (found while brainstorming):

- **Winning it back.** Catching Max means running toward your own goal,
  and every way Harrison touches the ball sends it the way he's going:
  running into it pushes it on at his speed plus his Control's touch
  push (60 px/s at Control 1), and a slide tackle that wins it fires it
  along his facing at 220 px/s. Max keeps the ball within 16 px ahead of
  him, between Harrison and his goal.
- **Kickoff.** At Harrison's kickoff Max waits 70 px away on the same
  line as the ball and the goal's centre (`KICKOFF_DEFENDER_DEPTH`). A
  shot from the spot runs into him, low enough to hit him; aiming at a
  post moves it only about 3 px off his line by the time it reaches him.
- **Turning.** He turns at once, but the ball doesn't: it keeps rolling
  the old way, ahead of him after each touch, so he has to brake and run
  back round it.

The parent added one idea of their own: a button to steal the ball cleanly,
with some skill or chance in it, and riskier on Hard.

**The intent:** fix those three so the game is fair to an 8-year-old,
then make Easy and Normal genuinely winnable, keep Hard as tough as it
plays today, and measure all of it in CI the way Biscuit is measured, so
a later change can't quietly make it hard again.

## Goals

1. **A steal button.** A tap takes the ball off Max's feet cleanly, from
   any side, including from behind, with odds that make Hard riskier.
2. **Tackles never clear toward his own goal.**
3. **Room at kickoff.** Max holds his spot until Harrison plays the
   ball; on Easy and Normal a good straight shot from the spot gets past
   him.
4. **A drag-back turn.** Reversing with the ball at his feet turns him
   with it.
5. **Easy and Normal retuned** to clear win-rate targets; **Hard as tough
   as today**, measured before and after.
6. **A headless measure in CI** of a scripted Harrison against Max on
   every difficulty, alongside Biscuit's.

## How it plays

### 1. The steal button *(Harrison only; the parent's idea)*

- **A new button: LB on the pad, A on the keyboard** *(designer's call:
  both are free, LB sits under the left index finger while the thumb
  steers, and A sits beside Z X C V)*. The Help screen's controls gain
  one line for it, within the on-screen text rules.
- **Tapping it with Max's ball in reach** (the ball at Max's feet, the
  one he's dribbling or standing on, within Harrison's foot reach and a
  little more, builder's number; a ball Max has just knocked ahead of
  himself between touches counts) makes Harrison jab for it. It works
  from any side, including catching Max from behind or alongside. There
  are two outcomes:
  - **A clean steal:** he traps it. The ball ends at his feet, slowed
    with him (he checks his run rather than carrying it on at a sprint),
    so he can turn with the drag-back, dribble or shoot. Max is
    **wrong-footed** for a short beat before he challenges again
    (builder's number, around 0.3 to 0.5 s: long enough that the steal
    sticks, short enough that Max is still a threat), and he doesn't
    slide during it.
  - **Poked loose:** the jab gets a toe to it but no control. The ball
    squirts away along his run, as a hard touch would, so it can still
    go toward his own goal: the risk the parent asked for on Hard. Max
    isn't wrong-footed; it's a loose ball for whoever gets there.
- **The odds of a clean steal** depend on the difficulty *(starting
  numbers, the builder's to measure)*: about 90% on Easy, 75% on Normal
  and 55% on Hard. Better Control raises them a little (builder's
  curve), so upgrades matter.
- **Timing is the skill.** Tapping it with no ball of Max's in reach is
  a whiff: a short stumble (builder's number, around 0.25 s) in which he
  can't act, and a short wait before he can try again. Mashing the
  button doesn't work.
- **A loose ball in reach** (at nobody's feet): the tap traps it, always
  cleanly. It's a "grab the ball" button wherever the ball is loose.
- **Without the button,** running into Max's ball plays as today: a
  running touch knocks it on. The button is how you take it cleanly.
- **Against Biscuit:** during his jink, a tap with the ball in reach
  counts as a touch and knocks it out, exactly as a running touch or
  slide does today. Outside the jink it does nothing, with no stumble:
  nobody takes the ball out of a running dog's mouth. *(Designer's call:
  no new way to beat Biscuit.)*
- Only on the ground and not winding up a kick. Max doesn't get the
  button; he takes the ball from Harrison as he does today.

### 2. Tackles never clear toward his own goal *(Harrison only)*

- A Harrison slide that wins the ball while he's facing **his own goal**
  sends it out to the side, toward the nearer board, and a little
  upfield, never toward his goal. Facing the goal he attacks, a slide
  plays exactly as today.
- **Against Biscuit, nothing changes:** his knock-out pop keeps today's
  rule. (The builder check found the tuned scripted blocker slides
  facing his own goal in about a third of his knock-outs, so applying
  the rule there would move Biscuit's numbers, and Harrison is happy
  with Biscuit.)
- Max's slides are unchanged.

### 3. Room at Harrison's kickoff

- At Harrison's kickoff against Max, **Max holds his spot until
  Harrison plays the ball** (his first touch or kick), or until a
  timeout if Harrison never does (builder's number, around 2 s). This is
  the game's version of the real rule that the other side waits outside
  the centre circle until the ball is in play. *(Designer's call: the
  builder check measured that moving his spot alone does nothing,
  because during a full wind-up his normal defending walks him back onto
  the ball's line and he tackles: today a full straight kickoff shot
  scored 0 of 40 on every difficulty.)*
- **Where he waits** *(the parent's choice)*:
  - **On Easy and Normal, off the ball's line,** further back, so a
    full straight shot from the spot passes him: not into his body, not
    into his foot. Checked by a headless test over the whole set of
    full-charge shots (straight and at each post) and kept inside the
    pitch. Such a shot scores a bit more than half the time (the builder
    check measured about 58% with Harrison's aim error).
  - **On Hard, on the line as today,** but holding until Harrison plays
    the ball, so he's never robbed straight off his kick. A shot still
    hits Max; Harrison has to dribble or go round him first.
- None of the retune's levers touch a free kickoff shot, which is why
  Hard doesn't get one.
- Max's own kickoff, where Harrison defends, is unchanged. **Biscuit's
  kickoff spots are unchanged** (he's tuned and Harrison is happy with
  him).

### 4. The drag-back turn *(Harrison only)*

- With the ball at his feet, on the ground and not winding up a kick,
  when Harrison **reverses the stick along the pitch** (pushes against
  the way he's facing), he does a drag-back: he stops the ball with his
  sole and pulls it round to his new front, then goes on the new way at
  his normal acceleration. The turn is quick (builder's number, around
  0.15 to 0.25 s) and the ball ends at his feet, going his new way.
- "At his feet" includes the ball he's dribbling that is just ahead of
  him between touches (builder's reach, a little beyond his foot zone),
  so the turn works at a run, not only from standing. A ball he has
  knocked well ahead is not his to turn: he has to chase it.
- During the turn the ball is a real ball: Max can still challenge for
  it.
- It's one of Harrison's controls, so it works in every match,
  Biscuit's included. If it moves Biscuit's tuning tests (for example
  the scripted blocker reversing the stick while it goes round a ball),
  the fix is in the scripted Harrisons, not Biscuit's profiles or the
  test bands.
- Optional, builder's call: better Control makes the turn a little
  quicker, so upgrades matter.
- **No new art.** It reuses existing frames (for example the planted
  shoot-charge frame for the sole, then the run). If the builder finds a
  new frame is needed, it goes to the parent for approval first, like
  every sprite.

### 5. Retuning Max on Easy and Normal

- **The measure.** Headless matches between a scripted Harrison and Max
  on each difficulty, at stats one level above Max's for the rung (the
  ladder's own assumption: Max is "a level or so behind what Harrison
  can afford by then"). The scripted Harrison plays like a decent kid:
  chases loose balls, dribbles at goal, shoots from range, gets
  goal-side and tackles when Max has it, with human reaction times and
  `HUMAN_AIM_ERROR_DEG`. He varies per exchange (reaction, shot hold)
  from a seed, so the win rate is a smooth measure rather than one
  replayed exchange (the lesson from tuning Biscuit). One way to build
  him is Max's own brain driving the home player with a human profile;
  the builder decides.
- **Hard is measured first, before any change**, with that scripted
  Harrison. That number is Hard's target afterwards.
- **Targets** *(designer's call, to revisit after Harrison plays)*: the
  scripted Harrison wins about **80% on Easy**, about **60% on
  Normal**, and **Hard within about 5 points of its measured baseline**.
  Checked at the ladder's last rung, with a sanity check at the first
  rung that Easy and Normal are at least as winnable there.
- **Levers**, Easy and Normal first: Max's reaction time, aim error, how
  often he slides (`aggression`), how far out he shoots
  (`shootRange`), the wrong-footed beat, and a pace factor on his run
  speed, on any difficulty that needs it. Hard is tightened with the
  same levers only if the new mechanics pushed it above its baseline.
  If a target still can't be reached, the builder stops and reports the
  numbers rather than widening the bands *(designer's call)*.
- The scripted Harrison takes the kickoff shot whenever he has the
  ball at the spot, so the measure sees the kickoff change, and taps
  the steal button when Max's ball is in his reach, so it sees the
  steal's odds.
- **Calibrating him** *(designer's call; the playtest gave no counts)*:
  on today's code, before any change, he should find Easy and Normal
  hard, as the parent and Harrison did ("pretty difficult to win
  matches" on both): under half his matches on Easy, and fewer on
  Normal. If he's stronger than that, he's weakened first (slower
  reactions, more aim error), so the targets mean something.
- **Baseline before any change (2026-10-27): Easy 0.438, Normal 0.156,
  Hard 0.000 on 64 seeds** (100–163, rung 10; on 128 seeds Easy 0.492,
  Normal 0.133, Hard 0.016; Hard's average score 1.7–9.8). Hard's target
  is 0.000. The script as first built (reactions from 0.2 s) won 0.578 on
  Easy, so his reactions were slowed to 0.30–0.46 s; lowering his
  `aggression` made him stronger, not weaker, so it stays at 0.4.
- **As built (2026-10-27).** The new tools overshot every target before
  the retune (64 seeds: Easy 0.938, Normal 0.891, Hard 0.141), so Max
  was made *tougher* on all three. Hard's rise came from the kickoff hold
  (without it Hard measured 0.047): no lever but pace moved it, so Hard
  got a pace factor.

  | | reaction | aim | slides | shoots from | back-off | clean steal | wrong-footed | kickoff spot | pace |
  |---|---|---|---|---|---|---|---|---|---|
  | Easy | 0.20 s | 8° | 0.3 | 150 | 0.32 s | 0.90 | 0.35 s | 110 back, 18 off | 1.00 |
  | Normal | 0.14 s | 6° | 0.55 | 180 | 0.18 s | 0.75 | 0.30 s | 110 back, 18 off | 1.03 |
  | Hard | 0.10 s | 2° | 0.8 | 210 | 0.10 s | 0.55 | 0.20 s | 70 back, on the line | 1.08 |

  Was: Easy 0.32 s / 10°, Normal 0.18 s, Hard 3°; no wrong-footing, no
  pace. "Back-off" (`backOffS`) is how fast he starts backing off from a
  powered-up Harrison: his old reactions, kept so the Energy Wave plays as
  it did. The pace factor scales his run and sprint while he plays the
  ball, not while he backs off. Every Easy number is gentler than
  Normal's, and every Normal number gentler than Hard's.
- **Measured as built:** rung 10, 64 seeds: **Easy 0.797, Normal 0.641,
  Hard 0.016**; 128 seeds: 0.820 / 0.648 / 0.016 (Hard's 128-seed
  baseline was 0.016). Rung 1: 32 seeds 1.000 / 0.813 / 0.063, 128 seeds
  0.914 / 0.789 / 0.047, so the first rung is the easier one. Average
  scores at rung 10: Easy 5.5–3.7, Normal 5.7–5.0, Hard 1.2–5.8.
- **Kickoff reaction (builder's ruling):** once Harrison plays the
  kickoff ball, Max, who has been standing, reacts after his reaction
  time. Without it his decision clock ran on through the hold and he
  reacted the instant the ball was struck: kickoff shots then scored
  53–62% at rung 10 but only 3–15% at rung 1, and the first rung was the
  harder one. With it, 58–72% at both.
- **Watch in the playtest:** on Easy and Normal the kickoff shot scores
  about two times in three, so a goal for Max is often answered at once.
- The ladder's stat table (`LADDER_STATS`) stays as it is.

### 6. In CI

- A Max tuning test beside `dogTuning.test.ts`: Easy and Normal inside
  bands around their targets, Hard inside a band around its baseline,
  Easy ≥ Normal ≥ Hard, and every match ends with a result and no ball
  sitting still for long.
- One test per complaint, written to fail first against today's code:
  catching Max from behind and tapping steal with his ball in reach
  takes it cleanly on Easy (seeded), and pokes it loose about as often
  as Hard's odds say over many tries; a whiff stumbles; a slide facing
  his own goal clears sideways; Max holds his kickoff spot until
  Harrison plays the ball, and a straight full shot from Harrison's
  kickoff passes him on Easy and Normal; dribbling at a run and
  reversing comes away the other way with the ball.
- Existing tests that pin today's numbers (`difficulty profiles match
  the plan` and the like) are updated deliberately, not loosened.
  `dogTuning.test.ts` stays green without changes to Biscuit's profiles.

## Non-goals

- **Biscuit.** No retune; his rules and kickoff spots stay. Only the
  shared slide rule touches him, and his tuning tests must stay green.
- **The quiet ease-off** after repeated losses stays in Plan 10.
- **Max getting the new tools.** He doesn't steal, drag back or clear
  sideways.
- **The ladder's stat table**, prices and rewards.
- **New art**, unless the drag-back truly needs a frame (then parent
  approval first).

## Anti-goals

- **A game that plays itself.** No magnet ball, no steal from a
  distance, no auto-turn: Harrison still has to reach the ball and push
  the stick.
- **Hard getting easier.** The parent said Hard is fine.
- **Max looking broken.** A wrong-footed Max reacts; he doesn't freeze
  for long or wander off. Easy should feel like an easier opponent, not
  a confused one.

## Constraints

- Every rule in the main spec's "Rules that bind every plan" holds:
  on-screen text uses only uppercase letters, digits and
  `' - : ! ? . , / + < >`; no image, audio or font files; nothing earned
  is taken back.
- No save changes: the profile stays v3.
- The Energy Wave's rules and Max's back-off against a powered-up
  Harrison are unchanged.
- Work on a branch; ask before merging into `main` and before pushing
  (Pages deploys from `main`).

## Left to the builder

- The wrong-footed beat, the kickoff spot and hold timeout, the
  drag-back's reach, timing and frames, the steal's reach, odds curve,
  stumble and frames (existing frames, as for the drag-back), and the
  side-clear's speeds, within the rules above.
- The scripted Harrison's design, the seeds and how many, and the exact
  test bands.
- Whether Control speeds the drag-back.
