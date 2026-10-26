# Career Spine (Plan 7a) — Design

Amends `2026-10-22-harrison-soccer-design.md` (the main spec) and follows
`2026-10-23-progression-core-design.md` (Plan 5) and
`2026-10-25-energy-wave-design.md` (Plan 6). Where they disagree, this
document wins. Anything it doesn't touch still stands.

## Intent

Plans 1–6 are live: a 90-second 1v1 against Max in the Backyard with the
depth band, sound, the goal moment, a saved profile with coins, XP, levels and
a Shop, the ten-match Backyard Ladder, and the Energy Wave.

The main spec's Career mode is five venues, each with four matches and a
boss, stars, keepers from venue 3 and 2v2 from venue 4. That is far too big
for one plan, so the Plan 7 brainstorm (2026-10-26) split it into five, and
this document is the first of them: **the career spine**. It builds the
structure every later venue plugs into (the road map, the venue screen,
stars, bonus objectives, milestones, the save) and finishes venue 1, the
Backyard, by making the Ladder its matches and adding its boss, **Biscuit
the Dog**.

When it ships, Harrison opens CAREER, sees the road ahead with the Backyard
lit and four stops dark, earns stars on rungs he has already won, and meets
his first boss after rung 10. Nothing he has earned changes.

## What was decided

By the parent, in the Plan 7 brainstorm (2026-10-26):

- **Career mode is five plans, in this order.** Each gets its own brainstorm
  and its own session:
  - **7a, the career spine (this document).** The road map, the venue
    screen, stars with bonus objectives, milestones, profile v3, and Biscuit
    the Dog as the Backyard boss.
  - **7b, the Park.** Four new 1v1 opponents with distinct heads and the
    main spec's four AI personalities, Speedy Sam, the Park's parallax art,
    and Quick Match.
  - **7c, keepers and the School Field.** Keeper bodies, AI and art at both
    ends, then the venue, its four opponents and Goalie Gus.
  - **7d, 2v2 and the City Stadium.** Teammate AI, passing on LB, opponent
    pairs that press together, then the venue and The Twins.
  - **7e, the World Cup Final.** The crowd-and-fireworks venue, its four
    pairs and the Golden Boot champion, who ships without his power move
    until the Power Clash lands in Plan 9.
- **The Backyard Ladder *is* the Backyard venue.** The other venues get four
  matches and a boss. The Backyard, as home turf, keeps its ten rungs against
  Max and adds Biscuit after rung 10. Nothing migrates: the saved ladder wins
  stay the Backyard's progress, Max stays the only Backyard opponent, and
  MAX HAS BEEN TRAINING becomes each rung's blurb. The parent preferred this
  to a separate ladder plus four new Backyard faces.
- **How Biscuit plays.** Harrison never has to catch him. Biscuit can't
  shoot, so he scores only by carrying the ball across the line, which means
  he has to come to Harrison. The lesson of the boss is *stop chasing, start
  blocking*: get between the dog and the goal and let him come. When he
  reaches a player in his way he jinks around them, and that is his slow
  moment, when the ball can be won. Panting after a long run is the second
  window. Going forward, the answer is hard early shots into an open goal,
  because he runs down anything soft. The parent: "That sounds good!"
- **The career map is shape B: a road map, then the venue.** First a map of
  the five stops climbing to the Cup; A opens a venue, which gets a whole
  screen for its rungs and the chosen match. Chosen over a single cramped
  screen and over venue pages flipped with the shoulders. The mockups were
  drawn with the real art at 320×180 ("Looking excellent!").
- **Biscuit is a golden retriever.** Big and biscuit-coloured, floppy ear,
  tongue out, thick tail up. Chosen over a Jack Russell and a Border collie.
  He is not based on a real dog.
- **Biscuit's difficulty is in between.** Not a wall, and not "an easy
  one-off that you can beat the first or second time". The target: a
  Harrison with stats around the ladder-10 level beats him in about three to
  five tries on Normal, once the blocking idea has clicked.
- **A single nudge after a loss.** Biscuit's blurb states the facts only,
  and the first attempt is pure discovery. Once Harrison has lost to him,
  the VS card carries one tip line, `TIP: GET BETWEEN HIM AND YOUR GOAL`,
  and Help gains a line about him. Chosen over no nudge at all and over a
  tip from the first attempt.

**The designer's proposals that the parent heard played back and accepted**
("Sounds good! Nothing is wrong or missing"; "please proceed"):

- On the Hub, CAREER replaces PLAY MATCH. The road map opens with the cursor
  on the open venue, the venue screen with the cursor on the next match, so
  A then A kicks off.
- In 7a only the Backyard is open. The other four stops show a question mark
  and LOCKED. Once Biscuit is beaten, the Park reads COMING SOON until 7b
  ships: the journey is visible without pretending the Park exists.
- Any beaten match can be replayed from the map for full coins and XP and
  for more stars. Stars only ever go up.
- Rungs won before stars existed get one star each. If he is already
  Champion, Biscuit is waiting on day one.
- A short VS card before kickoff names the opponent and the bonus. A callout
  fires in the match when the bonus is done. Results gets a stars line and a
  milestone line.
- Biscuit carries the ball **in his mouth**, which also lays the groundwork
  for keepers holding the ball in 7c.
- The bonus objectives, milestones and save changes listed below.
- The quiet ease-off after repeated losses stays in Plan 10, as the main
  spec's build order has it. Biscuit stands on his own tuning.

## The career in this plan

### The catalog

The career is data: venues in order, each with its matches in order and a
boss. Every match has a stable string id that the save keys on. In 7a:

| Venue | Id | State in 7a |
|---|---|---|
| Backyard | `backyard` | open: rungs `backyard-1` … `backyard-10`, boss `backyard-boss` |
| The Park | `park` | locked stop, name only |
| School Field | `school` | locked stop, name only |
| City Stadium | `stadium` | locked stop, name only |
| World Cup Final | `worldCup` | locked stop, name only |

The rungs are the Ladder: match *n* is Max at `LADDER_STATS[n − 1]`, with
the training line as its blurb, exactly as today. The boss is Biscuit.

- A rung is **beaten** when `ladderWins ≥ n`, as today.
- The boss is **unlocked** when `ladderWins ≥ 10` (he's Champion) and
  **beaten** when his star entry is at least 1.
- The **next match** is rung `ladderWins + 1`, or the boss once Champion, or
  nothing once the boss is beaten.
- The venue's star total is the sum of its matches' stars, out of 33. The
  career total is out of 93 (33 + 4 × 15); only 33 are reachable in 7a.

### The road map

The first screen after CAREER. As mocked:

- Title **THE ROAD TO THE CUP**, with the career's star total under it
  (`STARS 9/93` with a star picture).
- Five stops rising left to right across the dimmed Backyard: Backyard
  bottom-left, then The Park, School, Stadium, World Cup top-right, joined by
  a dotted road.
- The open stop is a **postcard**: a crop of the venue's own art in a gold
  frame, its name in gold, and its stars (`9/33` with a star picture).
- A locked stop is a dark card with a large `?`, its name in grey and
  LOCKED. After Biscuit is beaten, the Park's card says COMING SOON instead
  of LOCKED. It still can't be entered.
- The cursor starts on the Backyard. Left/right move between stops (a locked
  stop can take the cursor, so its name reads, but A on it does nothing but
  the back blip). A enters the venue. B or Esc returns to the Hub.
- Hint line at the bottom: `A ENTER   B BACK`.

### The venue screen

As mocked:

- Title: the venue's name in gold, scale 2, over a darkened band; under it
  `STARS 9/33`.
- A panel with the ten rung nodes in a row, numbered, then the boss node,
  larger, with Biscuit's face (a dark silhouette until he's unlocked) and
  BOSS under it. **NEXT** sits over the next match. Three stars under each
  node, lit gold for the ones earned.
  - Beaten: dark fill, silver border, white number.
  - Next: dark fill, gold border, gold number.
  - Locked: grey fill, dark border, grey number.
- A panel below for the chosen match: Max's head and **MATCH 7 - MAX** in
  gold at scale 2, the training line in silver (or Biscuit's blurb), the
  bonus line in white (`BONUS: SCORE A HEADER`), the stars he has there
  (`STARS` and three star pictures), and `A PLAY   B BACK` at the right.
- The cursor starts on the next match (or the boss once everything is
  beaten). Left/right move along the nodes, including locked ones, so he can
  read what each bonus will be. A on a beaten or next match starts it. A on
  a locked node is the back blip. B or Esc returns to the road map.
- The Backyard drifts behind it, with Harrison juggling, as on the Hub.

### The Hub

- Items: **CAREER, SHOP, OPTIONS, HELP**. PLAY MATCH is gone; CAREER opens
  the road map. The Champion's rematch is gone too: replays come from the
  map.
- The card's two career lines, wording the builder's:
  - a rung next: `NEXT: MAX - MATCH 7/10` and the training line, as today;
  - the boss next: `NEXT: BISCUIT THE DOG` and `BACKYARD BOSS!`;
  - the boss beaten: `BACKYARD DONE! STARS 23/33` and `THE PARK: COMING
    SOON`.

### Around a match

- **The VS card.** Choosing a match shows a short card over the venue:
  `MATCH 7` with `HARRISON VS MAX` (or `BISCUIT THE DOG - BACKYARD BOSS`),
  the two of them standing facing each other, and the bonus line. A, X or
  Start kicks off at once; otherwise it kicks off itself after about two
  seconds. Results' NEXT MATCH and TRY AGAIN also pass through it. Once
  Harrison has lost to Biscuit, Biscuit's card adds the tip line (see
  *Teaching the lesson* below).
- **In the match,** the HUD names the opponent as today (`HARRISON 0-0
  BISCUIT`). When a bonus that can be known mid-match is completed, a gold
  **BONUS DONE!** callout plays with a chime, queued behind any goal moment
  so it never covers one. Bonuses settled at full time (clean sheets, margins)
  get no callout; Results says.
- **Results** keeps its tally and adds, in order:
  - **the stars**, three star pictures under the score, lighting up one at a
    time after the tally with a chime each, and a fanfare on the third;
  - a bonus line: `BONUS DONE: SCORE A HEADER` in gold or `BONUS MISSED:
    SCORE A HEADER` in white;
  - the career news in place of the ladder line: `MATCH 7 BEATEN!`,
    `BACKYARD CHAMPION! BISCUIT AWAITS`, `BISCUIT BEATEN! BACKYARD DONE!`,
    `NEW BEST: 3 STARS!` on a replay that improved, or the try-again
    wording;
  - any milestone: `25 STARS! +600 COINS`, with the coins added to the total
    on screen;
  - the unlocks and UPGRADE READY as today.

  The panel may grow for a fourth foot line. The menu stays NEXT MATCH /
  TRY AGAIN, SHOP, HUB; once the boss is beaten, NEXT MATCH becomes CAREER
  and opens the road map.

### Stars and bonus objectives

Per career match, as the main spec says:

- **1 star** for a win;
- **2 stars** for a win by two or more goals;
- **3 stars** for a win by two or more *and* the match's bonus objective in
  that same match.

A draw or a loss gives nothing and changes nothing. A match's stars are the
best he has ever done there; a worse replay never lowers them. Only stars
earned together in one match count: a bonus done in a lost match isn't
banked.

The Backyard's objectives, all possible with the starting moves, so a
Harrison without a power move can earn every star:

| Match | Bonus | Settled |
|---|---|---|
| 1 | SCORE 3 GOALS | in play |
| 2 | KEEP A CLEAN SHEET | full time |
| 3 | SCORE A HEADER | in play |
| 4 | SCORE FROM A CHIP | in play |
| 5 | SCORE A VOLLEY | in play |
| 6 | SCORE A PERFECT STRIKE | in play |
| 7 | SCORE IN THE FIRST 30 MINUTES | in play |
| 8 | WIN BY 3 | full time |
| 9 | SCORE 2 STYLE GOALS | in play |
| 10 | WIN 3-0 OR BETTER | full time |
| Biscuit | DON'T LET BISCUIT SCORE | full time |

A perfect strike is a goal from a charged shot released in the sweet spot
(the kick the callout already names PERFECT STRIKE!). A style goal is a
header, volley, chip or Energy Wave, as the Results tally counts them. "The
first 30 minutes" is the match clock, which runs a game minute a second.

To settle these, the match summary records each of Harrison's goals: the
clock minute, the kick kind and whether it was perfect. The objective rules
are pure functions of that summary, tested one by one.

### Milestones

Career star totals pay coins once, at the thresholds the main spec names:

| Stars | Coins |
|---|---|
| 10 | 300 |
| 25 | 600 |
| 50 | 1000 |
| 75 | 1500 |

Each also records a cosmetic for the Locker Room in Plan 9; what it is gets
decided there. The profile counts how many milestones have been paid.
Results pays every milestone whose threshold the career total has reached
and which hasn't been paid yet, so a save that crosses a line on load (ten
retroactive rung stars) is paid, visibly, at the next Results. Nothing is
paid silently.

### Replays

- Any beaten match can be played again from the venue screen: a rung against
  Max at that rung's stats, or Biscuit.
- Full coins and XP, the daily first-win bonus if due, and a shot at more
  stars. The ladder's `applyMatch` already treats a replay as a rematch that
  doesn't advance `ladderWins`.
- A lost replay costs nothing.

## Biscuit the Dog

### The look

A golden retriever, in the game's palette (the hair golds for his coat, the
darker gold for his ear, belly and far legs, the blush pink for his tongue).
Nose to tail about 30 px, about 20 px tall standing, so his back is around
Harrison's hip. Cool, not cute: a sports dog with a set jaw and his eye on
the ball, not a puppy. He has a dark outline like every sprite.

He is the main spec's "hand-animated quadruped": his own body system, not
the human skeleton. Clips, at the match's frame rates:

- **idle** (2 frames): standing, tail swinging;
- **run** (4 frames): a gallop;
- **carry** (4 frames): the gallop with the ball in his mouth; the ball is
  part of the sprite here, not the world ball;
- **grab** (1–2 frames): the snatch;
- **jink** (2 frames): the crouch and cut;
- **pant** (2 frames): stopped, tongue out, chest heaving, ball at his feet;
- **blown** (1–2 frames) and a landing: for the Energy Wave;
- a **face** for the boss node, the VS card and the HUD.

**The sheet needs the parent's approval** before the rest of Biscuit is
built on it: a character sheet PNG and a short GIF of him running with the
ball, sent as in [[parent-approval-workflow]]. The three palette studies from
the brainstorm are reference only; the real frames are drawn fresh.

### How he plays

He is the away player in a normal 90-second Backyard match with the usual
kickoff, golden goal, pause menu and goal moments. He attacks the left goal,
like Max.

- **He never kicks, never jumps for a header and never slides.**
- **Grab.** Any ball within reach of his muzzle that isn't flying fast is
  his: a loose ball, a slow roll, a chip, a weak shot, or the ball at
  Harrison's feet. A ball at Harrison's feet is a contest with no dice in
  it *(designer's call)*: a ball between dribble touches, knocked ahead of
  him, is Biscuit's at once; a ball under his control goes only after
  Biscuit's muzzle has been on it for a short dwell, a visible wind-up
  Harrison can turn away from. The dwell grows with Harrison's Control and
  shrinks with difficulty (builder's curve, so upgrades matter). A shot
  above his catch speed passes him.
- **Carry.** The ball goes in his mouth. While carried it isn't simulated:
  it rides at his muzzle, nobody else can touch it, and the HUD, camera and
  goal logic treat its position as the ball's. He runs it straight at
  Harrison's goal. A goal is scored when the carried ball crosses the goal
  line under the bar, which is to say when he runs into the net. Then the
  normal away-goal moment plays, and Harrison kicks off as the side that
  conceded. Harrison kicks off at the start, as in every match. When it's
  Biscuit's kickoff, after a Harrison goal, the ball sits live at the
  centre with him behind it, and he snatches it when play starts.
- **Speed.** Carrying or chasing, he runs about 10–15% faster than Harrison
  can sprint at the tuning stats below (builder's number). Chasing him from
  behind must lose.
- **The jink.** When a player stands or runs in his path, within a short
  distance ahead and in his depth lane, he jinks: a sharp slowdown for
  roughly half a second while he cuts up or down the band to go around.
  The jink is the window: a slide tackle or a touch that reaches the ball
  during it knocks it out of his mouth. It pops free ahead of the tackle,
  live. Outside the jink, a slide on a full-speed Biscuit misses: he's
  past it.
- **The pant.** His run has a stamina budget of a few seconds at full speed.
  When it's spent he stops, drops the ball at his feet and pants for about a
  second, during which he can't grab. If Harrison reaches the ball first,
  it's his. When the pant ends, Biscuit takes the ball again if it's still
  at his feet. The budget refills while he isn't running.
- **Loose balls.** He chases any ball he can catch, like a dog. A saved,
  missed or rebounding shot usually ends in his mouth, so the way to score
  is early and hard, while he's away from the goal and before he's set.
- **His goal is open.** He never keeps it. He defends by taking the ball.
- **The power-up.** He treats a powered-up Harrison exactly as Max does:
  backs off, faces him, never challenges him, with the same odds of getting
  it wrong by difficulty. His backpedal is pinned to Max's pace, which
  Harrison can sprint down, not to his own speed *(designer's call)*: the
  wave's skill of chasing him down must work against the dog as it does
  against Max. He braces the beam under Max's rules (on his feet,
  facing it, far enough down the beam), digging in with his ears back; the
  ball dies at his feet, and a dead ball at his feet is his: he snatches it
  and runs. A braced wave against the dog is therefore a turnover, which is
  the point: chase him down before firing. Otherwise he's blown away like
  Max, lands inside the field, on his feet, shakes himself off and comes
  again, and the ball rockets on at an open goal. No power moves of his own.
- **Bodies.** Running into him pushes the two apart, as with Max. Harrison
  never hurts the dog: a tackle takes the ball, nothing more.
- **Difficulty.** Easy / Normal / Hard set his reaction time, how early and
  how wide he jinks, how long he can run before panting, and how short the
  snatch's dwell is against Harrison's Control. The quiet ease-off is not in
  this plan.

### Teaching the lesson

Decided by the parent: one nudge, after a loss.

- Biscuit's blurb on the venue screen states the facts only, e.g. `HE CAN'T
  SHOOT. HE JUST RUNS IT IN.` (wording the builder's). Nothing on the first
  attempt tells Harrison what to do.
- The profile keeps a **loss streak per career match**: consecutive losses,
  reset to zero by a win. Once the boss's streak is at least one, his VS
  card shows one extra line, `TIP: GET BETWEEN HIM AND YOUR GOAL`. It stays
  on every later attempt until he wins; it's one line, never a lecture.
- The Help screen's match page gains one line about the dog, there from the
  start, so a player who reads Help can find it.
- The same streak is what Plan 10's quiet ease-off will read ("after three
  losses in a row on the same career match"), so it's recorded now and acted
  on later.

### Tuning target

The tuning Harrison is one stat level above Max's rung-10 table: Speed 5,
Power 5, Jump 3, Control 4 *(designer's call; Harrison's real save can
refine it later)*. On Normal, he beats Biscuit in about three to five tries
once he's stopped chasing. The builder measures this with two scripted
Harrisons at those stats in headless matches:

- a **chaser**, who runs at the ball wherever it is, must lose nearly every
  match;
- a **blocker**, who drops between Biscuit and the goal, waits for the jink,
  and shoots hard and early, must win about half.

Those runs are tests, so a tuning change that breaks the lesson fails CI.
The numbers are starting points, to revisit after Harrison plays.

**Starting values, as built (2026-10-26).** `src/game/dog.ts` and
`dogAi.ts`:

| | Easy | Normal | Hard |
|---|---|---|---|
| Reaction | 0.32 s | 0.18 s | 0.1 s |
| Snatch dwell at Control 1 (+0.08 s per level) | 0.55 s | 0.35 s | 0.2 s |
| Jinks when a blocker is this close | 18 px | 22 px | 30 px |
| Jink width | 14 px | 18 px | 22 px |
| Full-speed running before a pant | 2.2 s | 3 s | 4 s |

- His speed is 183 px/s, 1.12 × the tuning Harrison's sprint (163 px/s).
  Backing off from a power-up he goes at 98 px/s, Max's rung-10 pace.
- He catches a ball under 260 px/s whose centre is no higher than 16 px.
  The jink lasts 0.5 s at 0.35 × his speed, with 0.6 s before the next.
  A pant lasts 1.2 s.
- **Dodge, not jink, for a charging Harrison.** One closing on him faster
  than 60 px/s gets a full-speed dodge with no window. Only a Harrison who
  waits for him gets the jink. Without this, a head-on chaser won most
  matches.
- **Knocked off the ball,** he stands shaking it off for 1 s, then goes
  for it after his reaction time. A slide or touch that reaches the ball
  during a jink knocks it free, popping ahead of the tackle.
- **Pinned with the ball** (cornered beside a goal with Harrison in front)
  for 1 s, he sets it down.
- A ball pressed between the two of them is no 50/50: the dwell decides.

Measured by the headless runs (blocker wins on 32 seeds; the blocker's
reaction to a jink varies from 0.05 to 0.35 s per match): Easy 0.66,
Normal 0.59, Hard 0.41. The chaser wins 0.03 on Normal.

## The save: profile version 3

New fields, appended; everything else unchanged:

```ts
career: {
  /** Best stars per career match, by catalog id. Missing means 0. */
  stars: Record<string, number>;   // 0..3 each
  /** How many star milestones have been paid, 0..4. */
  milestonesPaid: number;
  /** Consecutive losses per career match, by catalog id; a win resets it. */
  lossStreaks: Record<string, number>;
}
```

- `profileFrom` reads any version ≥ 1 field by field, as now. A v1 or v2
  save loads with no stars and nothing paid.
- **Retroactive stars** are granted on every load, like `grantForms`: for
  each rung `n ≤ ladderWins`, `stars['backyard-n']` becomes at least 1.
  Idempotent, never lowers anything.
- Only catalog ids load; unknown ids are dropped. Stars clamp to 0–3,
  `milestonesPaid` to 0–4, loss streaks to 0–99.
- `ladderWins` stays the rungs' truth, 0–10. The boss's win lives only in
  `stars['backyard-boss']`.
- **The save code** appends the new fields in its append-only way: the
  eleven Backyard star counts, the milestones paid and the boss's loss
  streak (the rungs' streaks needn't travel). An older code still applies,
  with no stars. The confirm wording gains the stars, e.g.
  `LEVEL 6 - 780 COINS - LADDER 7/10 - STARS 9`.
- Storage that throws never stops the game. Two-tab sync is unchanged.

## Sound

Small, by design not by ear, like everything so far: a bark on the grab, a
panting loop while he pants, a chime per star on Results with the level-up
fanfare for the third, the BONUS DONE! chime, a short boss sting on
Biscuit's VS card, and the menu blips on the two new screens. Tune in
`cues.ts` once someone listens.

## Goals

- Harrison can see the whole road to the Cup, and where he is on it.
- Every rung he has already won shows a star; replaying one for three stars
  is a reason to go back.
- The first boss is a different kind of opponent, and beating him means
  learning something (block, don't chase) rather than out-statting him.
- The structure is data, so 7b–7e add venues, matches and bosses without
  touching the screens.
- His live save moves to v3 losing nothing. A v2 build's save and a tampered
  code still load.

## Non-goals (this round)

- **The Park, School Field, City Stadium and World Cup Final** beyond their
  locked stops on the map. No new venue art, no new human opponents.
- **Keepers, 2v2, Quick Match, the Power Clash,** and bosses 2–5.
- **The quiet ease-off** after repeated losses (Plan 10).
- **Biscuit using a power move,** or any new move for Harrison.
- **Cosmetics, the Locker Room, the Trophy Room.** Milestone cosmetics are
  recorded, not shown.
- **Retuning the Ladder table, prices, the meter or sound by ear.** It waits
  until Harrison or the parent has played and listened.
- **A venue trophy screen.** The Trophy Room (Plan 9) will show one for the
  Backyard from the boss's star entry.

## Anti-goals

These would make it a failure even if it technically works:

- **Losing or lowering progress.** Ladder wins, coins, XP, levels, stats,
  moves and forms all survive the v3 move untouched. Stars never go down.
  A beaten boss stays beaten.
- **Max's matches changing.** A rung against Max plays exactly as it does
  today: the headless AI-vs-AI tests pass unchanged, and a Harrison without
  a power move plays exactly as before (the no-kit parity rule).
- **A wall, or a pushover.** Biscuit beaten first time by a chaser is as
  wrong as Biscuit unbeatable by a blocker. The scripted-Harrison tests
  guard both.
- **A dog you beat with dice.** His steals, jinks and pants come from
  position and timing Harrison can read, never a roll he can't.
- **A cheesed boss.** The Energy Wave against Biscuit follows Max's brace
  rules, so a full meter isn't an automatic goal.
- **Anything cruel.** Harrison takes the ball; he never kicks, hits or hurts
  the dog. Blown away, Biscuit lands on his feet and shakes it off.
- **A babyish dog.** He's a cool sports dog in a cool sports game for a
  12-year-old.
- **Broken places.** Biscuit, carried balls and dropped balls obey every
  guarantee Plans 2–6 made: inside the field, never in a goal frame or its
  roof, never stuck.
- **Likeness slips.** No surname anywhere. The reference photos never leave
  `reference/`.

## Constraints

- **Saves:** the profile goes to v3; fields are only ever appended;
  `profileFrom` loads any version ≥ 1 field by field and caps runaway
  counts; nothing earned or bought is ever taken back; storage that throws
  never stops the game; the save code's fields are append-only.
- **No-kit parity** and the unchanged Max matches, above.
- **Approvals:** Biscuit's sheet and GIF before his tasks are built on;
  ask before every merge into `main` and every push (the repo is public and
  Pages deploys on push). Work on a branch.
- **On-screen text** uses only uppercase letters, digits and
  `' - : ! ? . , / + < >`. No parentheses. The star is a drawn picture, like
  the coin, not a glyph.
- **Assets:** no image, audio or font files. Biscuit is code, like
  everyone else.
- **The stack:** Vite, TypeScript, Canvas, Vitest; pure, tested modules for
  the catalog, the objective rules, stars, milestones and the save, as Plan 5
  did for the ladder and `applyMatch`.
- **Screens are 320×180.** The mockups are the target look; their embedded
  PNGs are in the gitignored brainstorm folder under
  `.superpowers/brainstorm/` for this machine only. Draw everything from the
  description if they're gone.

## Left to the builder

- Module and file layout: a career catalog module, the objective rules, the
  two new scenes, the VS card, Biscuit's art module, his AI and his body
  system, and where the carried-ball state lives in the world.
- The exact positions, sizes and colours within the mockups; the star
  picture; the postcard crop; the VS card's look; cursor and wrap rules.
- Biscuit's proportions, frames and face within the approved direction, and
  every number above: his speed, catch speed, reach, jink trigger distance,
  duration and width, stamina budget and pant length, the snatch-versus-
  Control curve, and the per-difficulty values.
- The headless chaser and blocker scripts, and how AI-vs-AI runs stage him.
- The wording of the Hub, Results and VS lines, within the character set.
- The cue sounds, with the usual caveat that no one has listened yet.
- The save code's encoding of the new fields, and its tests.
- Whether the Energy Wave's "blown" path needs any change for a four-legged
  body beyond the clips.

## Release

- Branch from `main` (`plan-7a-career-spine` or similar). Keep `main`
  playable.
- Biscuit's sheet and GIF go to the parent for approval as soon as they
  exist; the dog's AI and screens can proceed meanwhile, but nothing merges
  with unapproved art. It's one branch and one merge *(designer's call)*:
  the spine doesn't ship ahead of the dog, so no "boss not in the game yet"
  state is built.
- Before merging into `main` and before pushing, ask. Pages deploys the push.
- After release: update the memory note, and offer to move the game-tour
  page's sections along.

## Build order change

The main spec's build order, as amended by Plans 3–6:

1. Pixel Harrison (done)
2. A basic match (done)
3. Depth band and front-end screens (done)
4. Big moments and sound (done)
5. Progression core, with the Backyard Ladder (done)
6. The Energy Wave slice (done)
7. Career mode, in five plans:
   - **7a. The career spine (this document)**
   - 7b. The Park, four opponents, Speedy Sam, Quick Match
   - 7c. Keepers and the School Field
   - 7d. 2v2 and the City Stadium
   - 7e. The World Cup Final
8. Training Ground
9. The other power moves and their tiers, Storm and Ultra Forms, the Power
   Clash, skill moves, the Locker Room and cosmetics, the Trophy Room
10. Polish (settings beyond the save code, difficulty and the quiet
    ease-off, balancing)
