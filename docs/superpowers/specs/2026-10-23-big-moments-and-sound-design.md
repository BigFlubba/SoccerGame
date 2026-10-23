# Big Moments and Sound — Design

Amends `2026-10-22-harrison-soccer-design.md` (the main spec) and follows
`2026-10-23-depth-and-menus-design.md` (Plan 3). Where they disagree, this
document wins. Anything it doesn't touch still stands.

## Intent

Plan 3 (depth band, intro, Help, Options) is live, and the parent's playtest
found it "pretty good as-is". Harrison plays it after school today, and the
parent wants the game to feel more complete by then, so this plan comes before
his feedback on Plan 3.

What's missing is the feeling. Right now the game is silent, and a goal gets a
small GOAL! banner and a 2 s pause. The main spec's goal is that "big moments
feel big: goals get slow motion, screen shake, crowd roar, rumble and
Harrison's own celebration". This plan delivers that goal for the one match
there is: Harrison against Max in the Backyard.

**Deadline:** a playable build on the live site before **4:00 pm Pacific on
2026-10-23**. Scope is cut to fit that. Where something has to give, music goes
first (see *Build order and cut line*).

## What was decided

The parent set the scope: sound, the goal moment, volume options, rumble, and
Plan 3's deferred minors. The anime effects wait. The parent then handed the
details to the designer ("I'll let you decide!") and approved this summary:

### When Harrison scores (about 4 s, skippable)

1. **Impact.** The ball crosses the line. Play freezes for about 0.1 s, the
   screen flashes white for one frame, and the net swishes. A long rumble
   starts, and the crowd roar begins to swell.
2. **Slow motion.** For about a second, play runs at quarter speed. The ball
   carries on into the net while the screen shakes, and the shake settles to
   nothing.
3. **GOAL!!!** slams in big (bigger than today's banner) and bounces to rest.
4. **Celebration: "Point to the Back".** The screen cuts to a close-up of
   Harrison from behind, both thumbs pointing over his shoulders at
   **HARRISON** and a big **12** on the back of his home shirt. The crowd roar
   peaks. It holds for about 2 s.
5. **Whistle, then kickoff**, as today.

Any confirm or shoot press, made fresh after the goal (not the held shot that
scored), skips straight to the kickoff.

The celebration is the main spec's default ("Point to the Back"; his own
favourite is still unknown). It is new likeness art: **the parent approves a
rendered image before it ships.** Our figures are only drawn from the side, so
the back view is the riskiest piece of the day. **Fallback:** if it isn't
approved in time, Harrison does a quick arms-up jump on the pitch instead,
using the existing side-view figure. The rest of the goal moment ships either
way.

### When Max scores

No slow motion and no celebration: the big moment stays Harrison's. The crowd
groans, a smaller **MAX SCORES** banner shows, there's a short weak rumble, and
the kickoff follows after about the same 2 s as today.

A golden goal gets the same moment as a normal goal, Harrison's or Max's, and
then goes to full time as now.

### Sound

All of it is synthesised with Web Audio in an 8-bit style (square, triangle
and noise voices). There are no sound files, as the main spec says.

- **Ball:** soft kick, hard kick, bounce, post/crossbar clang, net swish, fence
  thud.
- **Players:** tackle thud.
- **Match:** a short whistle when play starts at each kickoff; a long
  three-blast whistle at full time.
- **Crowd:** a low murmur under the whole match, a roar that swells on
  Harrison's goals, a groan on Max's goals, and an "ooh" when the ball hits the
  post or bar.
- **Menus:** move, confirm and back blips.
- **Music:** a short title theme that loops on the front-end screens (Press
  Start, the title menu, and Help and Options when they're opened from there).
  Win, lose and draw jingles play at full time. **There is no music during a
  match**, so the crowd carries it.

Browsers don't allow sound until the player presses a key or clicks. Pressing
start on the Press Start screen turns sound on (see *Audio unlock* below for
the gamepad catch).

### Options

The Options screen grows from one row to four:

- DIFFICULTY (easy / normal / hard), as now
- MUSIC volume, 0–10
- SFX volume, 0–10
- RUMBLE, on / off

They're saved alongside difficulty, as now: changed with left/right and saved
at once.

### Rumble

On gamepads that support it (`vibrationActuator`; Chrome and Edge do, Firefox
doesn't), there's a short pulse on hard shots, post or bar hits and tackles,
and a long one on Harrison's goals. Max's goals get a short weak pulse.
RUMBLE OFF stops all of it. Without a supporting pad, rumble does nothing,
silently.

### Also folded in: Plan 3's deferred minors

1. Players behind a goal are drawn over its crossbar. Split the goal's back
   (net and frame) by depth so that a player behind the goal is drawn behind
   the crossbar.
2. The ball can be trapped on the roof or post tops at exactly z 18 or z 46
   (the goal's edges in depth).
3. The wall clamp keeps the velocity that points into the wall, so a player
   pressed against the fence keeps a stale speed into it.
4. A diagonal jump is faster than a run.
5. Header speed ignores the ball's depth speed. `headBall` in
   `src/game/contact.ts` measures the incoming speed as
   `Math.hypot(ball.vx, ball.vy)`. *(Designer's call:)* add `ball.vz`. Don't
   switch to a speed relative to the player, because that would change the
   feel of headers.
6. Esc and the gamepad's Start don't close Help or Options, and Esc doesn't
   back out of the title menu. Enter keeps confirming everywhere.
   *(Designer's call:)* on the title menu, Start confirms the selected item, as
   it does on Press Start. Esc and B back out.

## Goals

- A goal by Harrison is the best moment in the game: you see it, hear it and
  feel it in your hands.
- The game always makes sound: kicks, bounces, the crowd and whistles. The
  front end has its own theme.
- Volume and rumble are under the player's control and remembered.
- Everything Plans 2 and 3 got right survives: the feel targets, the quick
  arcade pace, and the fixes for no stuck balls, no stuck held buttons, fair
  contested balls, and pausing on tab hide, blur or controller loss.
- It's live before 4:00 pm Pacific.

## Non-goals (this round)

- The anime effects: particles, speed lines, impact frames, shockwaves and
  auras. These go to a later plan (probably with the moves and power moves).
- A celebration choice, the other celebrations, and the Locker Room.
- Music during matches, a menu loop separate from the title theme, and coin,
  level-up or unlock jingles (there's nothing to earn yet).
- Commentary or voice.
- A net that bulges or ripples.
- Remappable controls, and audio settings beyond the three in *Options*.

## Anti-goals

These would make it a failure even if it technically works:

- **Annoying sound.** A shrill, harsh or relentless mix that a parent wants
  muted after a minute. Dribble touches happen all the time, so if they make
  a sound at all it must be very quiet and rate-limited. The crowd murmur sits
  well under everything else.
- **Blaring on load.** Sound must never start loud. The defaults are moderate,
  and nothing plays before the first press.
- **A goal moment that drags.** Max's goals stay short. Harrison's can be
  skipped, and the skip press must never be eaten by, or leak into, the next
  kickoff as a shot.
- **Changing how the game plays.** Slow motion and hit-stop are presentation.
  The simulation's rules, feel targets and headless AI-vs-AI matches must
  behave the same as before. A headless match still runs to full time without
  a screen or audio.
- **A broken page where audio isn't available.** No Web Audio, a blocked
  AudioContext, or no gamepad must never throw or stop the game. Tests run in
  Node without Web Audio.
- **Flashing.** One frame of flash per goal, never a strobe.
- **Likeness slips.** The parent approves the celebration art. No surname
  anywhere. The reference photos never leave `reference/`.

## Constraints

- Same stack and rules as Plans 1–3: Vite + TypeScript (strict), Canvas 2D,
  no game engine, no runtime dependencies, Vitest, Node 22 in CI. The base
  resolution is 320×180, and the fixed simulation steps at 60 Hz.
- No audio, image or font files. Everything is synthesised or drawn in code.
- **Settings stay versioned.** Bump them to version 2 with `musicVolume`,
  `sfxVolume` and `rumble`. A version 1 save keeps its difficulty and takes the
  new defaults. The existing rule still holds: a newer build's settings are
  never overwritten.
- **Default levels** *(designer's call)*: music 6, SFX 8, rumble on.
- **Audio unlock.** Create or resume the AudioContext on the first `keydown` or
  `pointerdown`. Chrome doesn't count a gamepad press as a user gesture, so a
  player using only a gamepad may still have no sound. If sound is still
  locked when the Press Start screen shows, put up a small hint (e.g. "CLICK OR
  PRESS A KEY FOR SOUND") until it unlocks. Wording and placement are the
  builder's.
- **Hidden tab.** Suspend audio while the tab is hidden, and resume it when the
  tab returns. The match already pauses itself.
- **Pause menu.** The crowd murmur drops low while the match is paused, and
  menu blips play as normal.
- `main` is what Harrison plays. Work on a branch, merge when it's done, and
  ask the parent before every push (the repo is public). The push deploys to
  GitHub Pages.

## Left to the builder

- The audio module's structure: a context and gain buses for master, music and
  SFX, the SFX recipes as data, and music as note data. Keep the decision of
  which cue plays for which world event pure and testable. Keep the Web Audio
  layer thin.
- The exact SFX timbres, the title theme and the jingles: catchy, short,
  8-bit, and in a major key for the title and the win jingle.
- How the slow motion is done (for example, the match scene feeding the world
  a scaled dt), as long as the sim's rules stay the same and its tests and
  headless matches still pass.
- How the goal moment's timeline fits with the match's `goal` phase, for
  example a longer pause for Harrison's goals or the scene holding the kickoff
  until the moment ends. Today's 2 s still applies to headless matches and to
  Max's goals.
- The exact timings, the shake size (a few pixels; the pitch shakes, the HUD
  doesn't) and the GOAL!!! animation.
- The celebration card: its size, framing, any small animation (a pop-in or a
  thumb jab), and its background. It must clearly read as Harrison from behind
  (light-brown hair with golden-blond ends, the faded sides, the home kit) and
  show HARRISON and 12 in the game's pixel font style. The approval image goes
  to the parent through SendUserFile. The reference photos may not show his
  back, so work out the hair from behind from the front and profile photos and
  the existing pixel head. *(Designer's call:)* allow up to two rounds of
  revisions. If the card isn't approved by **3:15 pm**, ship the arms-up
  fallback.
- The Options layout for four rows: a cursor row, how the volume shows (number
  or bar), and a blip at the new level when SFX volume changes.
- Whether to give a PERFECT strike its own little chime, and whether dribble
  touches get a sound at all.
- Rumble strengths and durations.
- **Test approach.** It must include headless AI-vs-AI matches as before. Unit
  tests cover the event-to-cue mapping, the settings migration, the goal
  moment's timeline and skip, and each deferred minor.

## Build order and cut line

Build in this order so that the earliest cut still ships something good:

1. The deferred minors (small, and they touch the sim first).
2. Settings v2 and the Options rows.
3. The audio engine, the SFX and their event wiring, the crowd and the
   whistles.
4. Rumble.
5. The goal moment (hit-stop, flash, slow motion, shake, GOAL!!!, Max's
   version, the skip), with the arms-up fallback in place.
6. The "Point to the Back" card, after the parent's art approval.
7. **Music** (the title theme and the jingles). **This is the cut line.** If
   time runs short, ship without it. The MUSIC row then stays in Options and
   does nothing until music arrives.

### Release checkpoints (approved by the parent)

- **Safety push:** as soon as steps 1–5 work and pass (around 2:30–3:00 pm),
  merge to `main` and, with the parent's OK, push. The live site then has
  sound, rumble, the goal moment with the arms-up fallback, and the fixes.
- **Second push:** with the celebration card and the music, if they make it.
  Again only with the parent's OK.
- **Freeze at 3:30 pm.** Nothing new starts after that. Only the work already
  done ships, so the live site is settled before 4:00.
- Before each push: the full test suite, a production build, and a quick Chrome
  playtest of a goal, both Harrison's and Max's.

## Build order change

The main spec's step 4 ("Big moments and sound") is split. This plan is its
first half. The anime effects move to the moves and power moves step (step 8),
where they're first needed. The rest of the order stands:

1. Pixel Harrison (done)
2. A basic match (done)
3. Depth band and front-end screens (done)
4. **Big moments and sound (this document; without the anime effects)**
5. Progression core
6. Career mode
7. Training Ground
8. Moves, power moves and cosmetics, plus the anime effects
9. Polish
