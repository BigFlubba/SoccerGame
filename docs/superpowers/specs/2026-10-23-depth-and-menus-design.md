# Depth Band and Front-End Screens — Design

Amends `2026-10-22-harrison-soccer-design.md` (the main spec). Where the two
disagree, this document wins. Everything the main spec says that this one
doesn't touch still stands.

## Intent

Harrison played the first build (Plan 2: a 90-second 1v1 against Max in the
Backyard) at the live address on 2026-10-23. His verdict: it "feels pretty
good". He asked for four things:

1. A proper title screen before "Press Start", that explains the game a little.
2. A Help screen for the controls and how the game works.
3. **Depth.** Being stuck on one line "feels overly simple and unrealistic". He
   wants to step around Max, and Max to step around him.
4. Normal difficulty is right, but difficulty and other options belong in a
   menu, not in the address bar.

The parent's summary of the screens: "just make it look like a real game".

The depth band changes the foundation that everything later is built on: ball
physics, contacts, the AI, and later the goalkeepers, 2v2 and the training
drills. So it comes now, before more is built on the one-line pitch.

## What was decided

These were decided by Harrison and the parent. Lines marked *(approved
guess)* were proposed by the designer and explicitly approved.

### The pitch

- **Half and half.** Of the 320×180 screen, the grass fills the bottom
  **70 px**. The Backyard scenery (evening sky, houses, washing line, fence)
  stays in view above it. Option "big pitch" (110 px of grass, scenery reduced
  to a strip) was shown and not chosen.
- **Up the screen is further away.**
- The pitch stays **640 px long**, and the camera follows the ball left and
  right as now. *(Approved guess:)* the whole depth is always on screen, so the
  camera never scrolls up or down.
- Players run at the **same speed in every direction**, diagonals included.
  *(Approved guess.)*

### Shooting and aiming

**One aiming rule for every kick.** Up/down aims whenever he is striking the
ball, and moves him the rest of the time. "Striking" means any of:

- holding X to charge a shot;
- holding B to charge a chip;
- in the air, where a header or volley may happen.

While striking:

- up aims at the **far post** (away from the camera);
- down aims at the **near post**;
- *(approved guess)* level sends it straight along his current line.

This replaces the main spec's "holding up/down while shooting aims high/low"
and its high/low header aim.

- **In the air he keeps the depth direction he jumped with.** Up/down aims a
  header or volley; it doesn't steer the jump.
- **Headers and volleys** lose Plan 2's high/level/low aim. They leave at a
  fixed, slightly rising angle.
- **Shot height comes from how hard he charges.** B's chip is the lofted shot.
  *(Designer's call:)*
  - a soft shot skims along the grass, and a harder one flies a little higher;
  - from normal shooting range, a sweet-spot or full-charge shot stays under the
    bar, so a PERFECT shot is never punished by rising over it;
  - only overcharging adds the extra lift that can sail over;
  - so a hard, low drive is still possible.

### Goals and the ball

- **A goal has width:** a near post and a far post. A goal is scored when the
  whole ball crosses the goal line **between the posts and under the bar**.
- Goals are drawn slanted (an oblique view), so their width reads on screen.
- The ball moves in depth too. **Its shadow on the grass shows where it is.**

### Players are solid

**Decided by Harrison and the parent.** Players bump into each other and have
to go around. This replaces Plan 2's run-through-each-other.

- A player can shield the ball with his body.
- When two players run into each other at an angle, they slide off rather than
  sticking, so nobody gets wedged:
  - against each other;
  - against a fence or a net;
  - at kickoff.
- Max has to go around Harrison to reach the ball or get goal-side.

### Who can touch the ball *(approved guesses)*

- To kick, head, tackle or block, a player must be **roughly in line with the
  ball in depth**.
- **Players and ball are drawn in depth order, nearer on top.** This replaces
  Plan 2's cosmetic "Max steps back while crossing".
- A ball squeezed between two solid players must still never get stuck or be
  pushed through a body. *(Builder's call:)* Plan 2's "50/50 pop" rule stays,
  for squeezes that still happen.

### Max *(approved guess)*

- Max uses depth the way Harrison does:
  - he gets between the ball and his goal across the pitch;
  - he runs around Harrison;
  - he shoots at either post.
- Difficulty profiles (easy/normal/hard) carry over. Normal stays the default:
  Harrison says it's right.

### Later plans *(approved guess)*

Goalkeepers, 2v2 and the training drills are all built on this depth pitch.

### Screens

**Press Start screen.** The first thing that appears when the game loads.

- An animated Backyard behind it. *(Approved guess:)* the camera slowly pans
  along the pitch while Harrison does keepy-uppies.
- A big title: **HARRISON'S ROAD TO THE CUP**.
- A subtitle. *(Approved guess:)* **FROM THE BACKYARD TO THE WORLD CUP**.
- A blinking **PRESS START**. Start, A or Enter opens the title menu.

**Title menu: Start Game, Options, Help.**

- There is **no Quit**: a browser page can't close its own tab.
- Up/down chooses, A confirms, B goes back to the Press Start screen.
- *(Approved guess:)* Start Game kicks off a match against Max for now. When
  career mode arrives, it becomes the way into that.

**Help.** It covers three things:

- the controls, gamepad and keyboard;
- how a match works: 90 seconds, golden goal on a draw, the side that
  conceded kicks off;
- the moves: charging into the sweet spot for PERFECT, up/down for far/near
  post while charging, chip, slide tackle, header, volley, and sprint with
  stamina.

*(Approved guess:)* a few pages in the pixel font, flipped with left/right,
with A/B/X button pictures. B returns to wherever he came from.

**Options.**

- For now, just **Difficulty: Easy / Normal / Hard**, Normal by default,
  changed with left/right.
- **Remembered between visits.**
- *(Approved guess:)* B goes back and keeps the change.

**Pause menu: Resume, Restart, Help, Options, Quit to Title.** Quit to Title
returns to the Press Start screen. *(Designer's call, approved.)*

### Settings storage

- Settings are saved in `localStorage` under a game-specific key, so they don't
  clash with other sites on `dialmasterorg.github.io`.
- They use a **versioned schema**, the same way the main spec's save system
  (build step 4) will, so no later build ever loses them.

## Goals

- Harrison and Max can run anywhere on a 2-D pitch and get around each other.
  A defender can get goal-side by going round. Shots can be placed at either
  post.
- The game opens like a real game: Press Start, then the menu, then Help or
  Options, then the match. Pause offers the same Help and Options.
- Everything Plan 2 got right survives:
  - the feel targets (a full-power max-stat shot crosses the pitch in about
    1 s; a max-stat jump clears about 1.2× his height);
  - quick, arcade-like play;
  - the fixes from Plan 2's review: no stuck balls, no stuck held buttons, fair
    contested balls, pause on tab hide, blur or controller loss.

## Non-goals (this round)

- Sound, music, rumble, goal slow-motion, celebrations: the main spec's step 3,
  now step 4.
- Saves, coins, XP, career, venues beyond the Backyard, goalkeepers, 2v2.
- More options (sound volume, rumble). Add them when those features exist.
- An idle AI-vs-AI demo on the title screen. Harrison would like it later.
- Remappable controls.

## Anti-goals

These would make it a failure even if it technically works:

- **Losing the backyard feel.** The scenery has to stay a cosy evening backyard
  above the pitch.
- **Depth that makes play fiddly.** If lining up with the ball in depth is
  frustrating, the tolerance is too tight. Touching the ball should feel as easy
  as in Plan 2.
- **Controls that change meaning confusingly.** Up/down moves him, except while
  he's striking the ball, when it aims at a post. Nothing else changes.
- **Solid bodies that cause new stuck states.** Two players, or a player and a
  fence or net, must never lock together.
- **Regressing Plan 2's fixed bugs:**
  - a ball stuck on the net roof;
  - Max freezing beside a still Harrison;
  - B leaking out of the pause menu;
  - shots firing on blur or controller loss;
  - whoever's contacts resolve last winning contested balls.
- **A save or settings format that a later build can't read.**

## Constraints

Unchanged from the main spec and Plan 2:

- Vite + TypeScript (strict), Canvas 2D, no runtime dependencies.
- Internal resolution 320×180 with integer scaling.
- Simulation code in `src/game/` stays DOM-free and unit-tested, at a fixed
  60 Hz.
- `main` is what Harrison plays. Work happens on a branch, and pushes to the
  public repo need the parent's go-ahead.
- Photos of Harrison are never committed or deployed.
- Commits follow Conventional Commits (50/72) with no AI attribution.

Art approval:

- The parent approves art that changes the look before anything is built on
  it. This round, that means **the re-laid-out Backyard with the deep pitch and
  slanted goals**, shown as a composited screen in the character sheet or
  viewer.

## Also folded in: Plan 2's deferred review findings

1. A golden goal goes straight to FULL TIME with no GOAL! banner. The winning
   goal should get its GOAL! moment.
2. Holding X through a kickoff starts a charge on the first live tick. The
   "keep held buttons" code in `placeForKickoff` has no effect, because play
   outside the live phase clears them. Make a button held through the kickoff
   need a fresh press, as intended.
3. Max's charged-shot release can be re-armed by a decision on the same tick,
   so the occasional AI charge runs long.
4. A body block at the clamp limit can place the ball outside the fence for one
   frame.
5. CI pins Node 20, which reached end of life in April 2026. Move to a current
   LTS, with matching `@types/node`.

## Left to the builder

- **World geometry:**
  - how many world units deep the pitch is, and how depth maps to the 70 screen
    rows;
  - the oblique slant of the goals and stripes;
  - the goal mouth width;
  - whether the far fence and an invisible near board both bounce the ball (the
    main spec has no throw-ins, so the pitch stays enclosed).
- **Contact tolerances in depth** for touch, kick, head, tackle and block,
  within the "as easy as Plan 2" anti-goal.
- **How the near/far-post aim** maps to the ball's depth velocity.
- **Max's depth tactics** within "uses depth like Harrison".
- **The Press Start animation**, the Help page layout and wording, and the menu
  look.
- **Removing the `?difficulty=` address parameter.** Options replaces it. Keep
  `?viewer` for the sprite viewer, and the dev-only playtest hook.
- **Test approach.** It should include whole-match AI-vs-AI simulations, which
  caught Plan 2's worst bugs.

## Build order change

The main spec's build order shifts by one:

1. Pixel Harrison (done)
2. A basic match (done)
3. **Depth band and front-end screens (this document)**
4. Big moments and sound
5. Progression core
6. Career mode
7. Training Ground
8. Moves, power moves and cosmetics
9. Polish (now without the settings screen, which arrives here, but still with
   the quiet ease-off and the balancing pass)
