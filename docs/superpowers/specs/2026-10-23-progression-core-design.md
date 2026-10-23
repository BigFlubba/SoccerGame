# Progression Core — Design

Amends `2026-10-22-harrison-soccer-design.md` (the main spec) and follows
`2026-10-23-big-moments-and-sound-design.md` (Plan 4). Where they disagree,
this document wins. Anything it doesn't touch still stands.

## Intent

Plans 1–4 are live: one match against Max in the Backyard, with the depth
band, sound, rumble and Harrison's goal moment. The parent's view is that it
feels like "a single-level demo" rather than a real game, and they're most
excited about progression, upgrades and power-ups.

This plan gives the game its core loop:

**Hub → next match → Results (coins, XP, level-up) → Shop → a harder match.**

Every match now pays coins and XP, saved to a profile that survives every
later build. The coins buy Speed, Shot Power, Jump and Control in a shop, and
those stats change how Harrison plays. Max gets tougher match by match on a
ten-match **Backyard Ladder**, so upgrades matter in a way Harrison can feel.
This is the main spec's "Progression core" step, cut to a slice that ships in
one session.

The parent asked for this plan to be drafted straight from the main spec and
memory, without a question round. Every choice below that the main spec or
the parent didn't make is marked *(designer's call)*.

## What was decided

From the main spec (parent-approved scope):

- A **saved profile**: coins, XP and level, and the four stats.
- **Coins and XP after every match**, at the main spec's reward rates.
- A **Results screen** that tallies coins and XP with sound, shows level-ups,
  and offers to play again or go back.
- A **Hub**: Harrison's portrait, level and coins, and the way into
  everything.
- A **Shop** selling the four stats, levels 1–10, each level about 35% dearer
  than the last.

From the parent's view in memory: aim the plan at the core loop, ending in "a
harder match". That's what the ladder is for.

From the parent's request for this session:

- Fold in the seven deferred Plan 4 minors (see *Also folded in*).
- Scope it so a playable slice can ship in one session.

### The Backyard Ladder *(designer's call)*

Career mode (venues, new opponents, bosses, stars) is the next plan. Until it
lands, the "harder match" is Max himself, improving between matches.

- **Ten matches** against Max in the Backyard, played in order. Winning match
  *n* unlocks match *n + 1*. A draw or a loss leaves him on the same match, to
  try again, with his coins and XP kept. The ladder never goes backwards.
- Each match, Max's stats rise. He starts at level 1 in everything, exactly as
  today, and adds about one stat level per match:

  | Match | Speed | Power | Jump | Control |
  |---|---|---|---|---|
  | 1 | 1 | 1 | 1 | 1 |
  | 2 | 2 | 1 | 1 | 1 |
  | 3 | 2 | 2 | 1 | 1 |
  | 4 | 2 | 2 | 1 | 2 |
  | 5 | 3 | 2 | 1 | 2 |
  | 6 | 3 | 3 | 1 | 2 |
  | 7 | 3 | 3 | 2 | 2 |
  | 8 | 3 | 3 | 2 | 3 |
  | 9 | 4 | 3 | 2 | 3 |
  | 10 | 4 | 4 | 2 | 3 |

  This roughly tracks what Harrison can afford by then, a level or so behind
  his upgrades and skill. The builder may tune it from headless matches.
- The Hub says which match is next and what Max has been working on, e.g.
  **NEXT: MAX — MATCH 3/10** and **MAX HAS BEEN TRAINING: POWER UP**. The
  wording is the builder's. It's worked out by comparing that match's stats
  with the previous one's.
- Beating match 10 makes Harrison **BACKYARD CHAMPION**. After that the Hub
  offers a rematch at match 10's stats, and rewards carry on as normal.
- The Options difficulty (Easy / Normal / Hard) still sets how Max thinks
  (reaction, aim, aggression). The ladder sets his stats. They stack, as the
  main spec's "difficulty comes from reaction time, accuracy, aggression and
  stats" says.
- **Carry-over:** Career mode must keep his ladder progress. Its plan decides
  how, e.g. by counting ladder wins toward the Backyard's matches.

### Rewards

The main spec's starting numbers, unchanged:

| For | Coins |
|---|---|
| Win / draw / loss | 60 / 30 / 15 |
| Each goal he scores | +10 |
| Each style goal: a header, volley or chip | +15 |
| A clean sheet (Max scores none) | +20 |
| His first win of the day | +50 |

- Style goals are the main spec's list, as far as it exists today: header,
  volley and chip. The bicycle kick and power moves join when they're built. A
  PERFECT STRIKE or SCREAMER is a callout, not a style goal *(designer's
  call)*. A goal counts as a header, volley or chip from the same kick the
  callout uses, even when HAT-TRICK! is what the callout shows.
- A clean sheet counts on any result, including a 0–0 draw.
- "Of the day" uses the computer's local date. Missing a day costs nothing,
  and nothing on screen nags about it.
- **XP** equals the match's coins *without* the daily bonus *(designer's
  call)*. So XP stays "roughly proportional to coins".
- **Levels** start at 1 and have no cap. Going from level *n* to *n + 1* takes
  **100 + 50 × (n − 1)** XP: 100 to reach level 2, 700 in total to reach
  level 5, 2,700 to reach level 10 *(designer's call)*.
- **Each level gained pays 50 coins** *(designer's call)*. Nothing unlocks by level
  yet; moves and shop items join that later. Until then the bonus makes a
  level-up worth something now.
- **Quitting or restarting a match forfeits its rewards** (main spec), with no
  other penalty.

### Shop prices

Four stats, levels 1–10. Raising a stat from level *L* to *L + 1* costs
**150 × 1.35^(L − 1)**, rounded to the nearest 5 *(designer's call)*:

| To level | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|
| Coins | 150 | 205 | 275 | 370 | 500 | 675 | 910 | 1225 | 1655 |

Pacing check against the main spec: his first win pays about 140 coins with
the daily bonus, so the first upgrade comes after his second match. Early
upgrades come every two matches or so, and the later levels every five or
more. Maxing all four stats costs 23,860 coins, which is more than the ladder
pays. The career's later venues will pay more.

### The screens

**Press Start → Hub.** The Hub replaces Plan 3's title menu *(designer's
call)*. It holds the same OPTIONS and HELP, so nothing is lost, and the main
spec's flow goes from "Press Start" straight to the Hub.

**Hub.** The Backyard backdrop drifting behind, as on the title menu, with:

- Harrison's portrait (the existing approved neutral one);
- **HARRISON**, his **LEVEL** with an XP bar, and his **COINS**;
- his four stat levels;
- the next ladder match and Max's training line;
- a menu: **PLAY MATCH**, **SHOP**, **OPTIONS**, **HELP**.

Up/down choose, and A or Start confirms. B or Esc goes back to Press Start,
as the title menu did. The title theme keeps playing.

**Match.** As today, except:

- Harrison plays with his bought stats, and Max with the ladder match's.
- The pause menu's QUIT TO TITLE becomes **QUIT TO HUB**.
- The full-time menu goes away. After the FULL TIME banner (1.5 s, as now)
  the game moves on to Results by itself.

**Results.** It shows the result and score, and a portrait to match: the
celebrate face on a win, determined on a draw, disappointed on a loss.
Then, one line at a time with a coin tick each:

- each reward line, e.g. **WIN +60**, **3 GOALS +30**, **HEADER +15**,
  **CLEAN SHEET +20**, **FIRST WIN TODAY +50**;
- the coin total, rolling up;
- the XP bar filling from where it was. If it crosses a level: **LEVEL UP!**,
  the new level, a level-up jingle and **LEVEL BONUS +50**;
- the ladder line: **MATCH 3 BEATEN!**, or **BACKYARD CHAMPION!** after match
  10, or a short try-again line on a draw or loss;
- **UPGRADE READY IN THE SHOP!** if he can now afford any upgrade
  *(designer's call)*.

The result jingle plays as the screen opens, as it does at full time today.
A fresh A, X or Enter skips the tally to the end. The skip press doesn't also
choose a menu item. Then the menu:

- **NEXT MATCH** after a win, or **TRY AGAIN** otherwise. Either plays the
  next ladder match.
- **SHOP**. Backing out of the shop comes back to Results.
- **HUB**. B or Esc does the same.

The whole tally takes about 3 s unskipped.

**Shop.** One row per stat:

- the stat's name, its level as ten pips, and the price of the next level, or
  **MAX** at level 10;
- a one-line description of the selected stat at the bottom (e.g. SPEED:
  "RUN AND SPRINT FASTER"), with his coins at the top.

Up/down choose a stat. **A buys the next level at once** *(designer's call:
no confirm step, since every upgrade is useful and nothing is wasted)*. A
purchase plays a ka-ching and is saved at once. With too few coins, A plays a
low "nope" and shows how many more he needs. At MAX, A does nothing but the
nope. B or Esc goes back.

### Sound

New 8-bit cues, written like Plan 4's *(designer's call)*:

- a quiet, rate-limited **coin** tick for the tally;
- a **purchase** ka-ching;
- a **level-up** fanfare, as a short SFX so it can play over the result
  jingle;
- a low **nope** for "can't afford".

The front-end screens (Press Start, Hub, Shop, Help, Options) keep the title
theme. There is no separate menu loop yet.

### Also folded in: Plan 4's deferred minors

1. **Diagonal jumps in the air.** The Plan 4 fix was partial: take off
   diagonally, then push sideways, and air speed reaches about 116 px/s
   against a run of 95. In the air, steering must never make him faster than
   the greater of his run speed and his speed at take-off. Cap the air target
   for `vx` at √(limit² − vz²). Sprint jumps keep the speed they leave the
   ground with.
2. **The goal flash can be missed** when two simulation ticks run in one drawn
   frame. The white flash must show on exactly one drawn frame per goal,
   however many ticks that frame covers.
3. **Audio unlock.** Also unlock on `pointerup`, for touch. Only try to
   unlock from a gamepad press when `navigator.userActivation` says the page
   has one, where the browser supports that check. That stops the console
   warnings Chrome logs for a refused start.
4. **No synth test of suspend and resume.** Add tests: suspending a running
   context and resuming it restarts the crowd and music. Resume without a
   suspend does nothing. Suspending while still locked doesn't unlock on
   resume.
5. **Esc on Press Start goes forward.** Esc is pause plus back, and Press
   Start treats pause as "go on". On Press Start, Esc does nothing. Start, A
   and Enter still go on.
6. **The full-time menu plays a back blip that does nothing.** It goes away
   with the full-time menu. On Results, B goes to the Hub with the back blip.
7. **`homeClip`'s dead `withCard` parameter.** Remove it.

## Goals

- Every match ends with something earned, shown on a Results screen that
  feels like a reward, and most short sessions end with something to buy.
- Upgrades are felt in play, and Max's improvement is too.
- Progress is never lost: every result and purchase is saved at once, in a
  versioned profile that every later build can read.
- Everything Plans 2–4 got right survives at every stat level: the feel
  targets, the arcade pace, and the fixes for stuck balls, stuck held buttons,
  fair contested balls, and pausing on tab hide, blur or controller loss.
- A playable slice is ready to ship within one session.

## Non-goals (this round)

- Save code export and import, and resetting the save. Both are in the main
  spec and stay owed. The save code goes to the Settings work, before the
  career's bigger stakes if possible.
- Career mode: the five venues, new opponents, bosses, stars and bonus
  objectives, keepers, 2v2 and Quick Match.
- Unlocking moves or anything else by level, and level-gated shop items.
- Power moves and the super meter. The parent is excited about them, so a
  power-move slice is a strong candidate to come next, alongside or ahead of
  Career mode. That's the parent's call.
- Training, the Locker Room, cosmetics, the Trophy Room and achievements.
  The profile does keep running totals (see *Constraints*) so the Trophy Room
  can show them later.
- The quiet ease-off after repeated losses (main spec, Polish step).
- Retuning the Plan 4 sound by ear. That waits until the parent or Harrison
  has listened.
- Refunds or re-speccing stats.

## Anti-goals

These would make it a failure even if it technically works:

- **Losing progress.** A result is saved the moment the match ends, before the
  FULL TIME banner, so closing the tab on Results can't lose it. Storage that
  throws (private browsing) never stops the game; progress then lasts until
  the page closes. A broken or partly bad save loads what it can, field by
  field, and never crashes the game.
- **Rewards counted twice, or not at all.** Going Results → Shop → Results,
  or pressing NEXT MATCH, never pays again. A golden-goal winner is paid once,
  after his goal moment.
- **A wall.** Losses still pay, the ladder never goes backwards, nothing is
  gated by level, and Options can still lower the difficulty.
- **Mobile-game feel.** No timers, countdowns, "come back tomorrow" nags,
  sales, flashing BUY prompts, or fake scarcity. The daily bonus only shows
  when it's earned.
- **A Results screen that drags.** About 3 s, and skippable.
- **Changing how the game plays at level 1.** A level-1 Harrison against
  match 1's Max plays exactly as today. The existing headless AI-vs-AI tests
  pass unchanged.
- **A babyish tone.** It's a cool sports game for a 12-year-old. Max's
  training lines can be funny, not cute.
- **Likeness slips.** No surname anywhere. The reference photos never leave
  `reference/`. Only the approved portraits are used.

## Constraints

- Same stack and rules as Plans 1–4: Vite + TypeScript (strict), Canvas 2D,
  no engine, no runtime dependencies, Vitest, Node 22 in CI. The base
  resolution is 320×180, and the simulation steps at a fixed 60 Hz.
- No image, audio or font files. Everything is drawn or synthesised in code.
  The font has uppercase letters, digits and `' - : ! ? . , / + < >`, so on
  screen text uses only those (e.g. `3 X 10`, not `3×10`).
- **The profile** is its own `localStorage` entry next to the settings, under
  a game-specific key (`harrisons-road-to-the-cup/profile`), `version: 1`.
  It holds:
  - coins;
  - level, and the XP he has toward the next level;
  - the four stat levels;
  - ladder wins (0–10);
  - the date of his last first-win-of-the-day bonus;
  - running totals: matches, wins, draws, losses, goals for, goals against,
    style goals and total XP earned.
- **Saves survive development.** These rules come from the main spec:
  - Load field by field, so one bad value falls back to its own default and
    the rest load. Clamp stat levels to 1–10, the ladder to 0–10, and
    counts to whole numbers ≥ 0.
  - A save from a newer build is read as best it can be, and **never written
    over**.
  - Level is stored, not worked out from XP, so a later change to the XP
    curve can never take a level away. Prices and the curve may be
    rebalanced. Nothing he has earned or bought is ever taken back.
- **Saved at once** after every result and every purchase. Settings keep
  saving as they do now.
- **Awarded when the match reaches full time**, on the tick its phase becomes
  `fullTime`, not when Results opens.
- **The sim at every stat level.** Stats 1–10 are already on curves in
  `src/game/stats.ts` but have only ever been played at level 1. Headless
  AI-vs-AI matches at level 10 on both sides, and at 10 against 1 both ways,
  must keep every existing guarantee: a result, no NaN, no ball resting
  unreached for over 5 s, and nobody stuck for over 10 s.
- `main` is what Harrison plays. Work on `feat/progression-core`, merge when
  it's done, and **ask the parent before every push** (the repo is public,
  and a push deploys to GitHub Pages).
- Commits follow Conventional Commits, 50/72, with no AI attribution
  trailers. Run `git status --short` before every commit.

## Left to the builder

- Module layout. A guide: profile load/save, economy (rewards, XP, prices),
  the ladder and "apply a match to the profile" as pure, tested modules in
  `src/meta/`. Settings and the profile should share one small storage helper
  rather than copy it.
- The layouts of the Hub, Results and Shop, within 320×180. That includes a
  small coin symbol drawn in code, if wanted.
- The tally's exact timing, the XP bar's look, and Max's training lines.
- Cue timbres, kept as quiet and short as Plan 4's.
- Test approach. It must cover:
  - the reward table and its edge cases (0–0 draw, golden goal, hat-trick of
    headers);
  - the XP curve, multi-level jumps and the level bonus;
  - prices, buying and can't-afford;
  - profile load and save, including bad fields, a newer version and storage
    that throws;
  - ladder advance, the champion state and the rematch;
  - the once-only award;
  - the Results skip, and that it doesn't pick a menu item;
  - each folded-in minor;
  - the high-stat headless matches.

## Release

- **Before merging:** the full test suite, a production build, and a Chrome
  playtest of the whole loop, staged through the dev hook:
  - Hub, a win, Results with a level-up, the Shop;
  - a purchase, then the next match with Max's new stats.
- **Show the parent** screenshots of the Hub, Results and Shop
  (SendUserFile) before asking to merge. They're new screens, not likeness
  art, so building doesn't wait on them.
- **Ask before the push.** Harrison's first live load creates his profile.
  From then on, the save-compatibility rules bind every later build.

## Build order change

The main spec's build order, as already amended by Plans 3 and 4:

1. Pixel Harrison (done)
2. A basic match (done)
3. Depth band and front-end screens (done)
4. Big moments and sound (done)
5. **Progression core (this document), with the Backyard Ladder standing in
   for the career until it lands**
6. Career mode
7. Training Ground
8. Moves, power moves and cosmetics, plus the anime effects
9. Polish

The save code moves from step 5 to Polish's Settings work, or earlier if the
parent wants it before the career.
