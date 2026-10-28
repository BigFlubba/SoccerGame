# Save Slots and the Stamina Stat — Design

Amends `2026-10-22-harrison-soccer-design.md` (the main spec) and follows
`2026-10-27-roadmap-after-the-park-design.md` (the roadmap), whose second
next plan this is. Where they disagree, this document wins. Anything it
doesn't touch still stands.

## Intent

The skill moves are live (`main` at `5740e81`, profile v4). After the
Park, Harrison asked for two things this plan delivers together, because
both change the save:

- **Several save games**, so he can start over without losing his
  career. In the parent's words: saves he can *name*, so he could "play
  through the game on Easy if he wanted to, and then create a new save
  to start over on Normal hardness which would give him an entirely
  fresh start." He also wants to **delete** saves, "with confirmation so
  it doesn't happen on accident!", and to **load and switch** between
  them.
- **More upgrades, such as Stamina:** a fifth stat in the Shop.

What would make it a failure:

- his current save loses anything, or doesn't become save 1;
- a save gets deleted by accident;
- a "fresh" save isn't completely fresh;
- Max, Biscuit, the Park crew or Sam play differently from today;
- a maxed Stamina undoes a boss's lesson (chasing Biscuit, racing Sam).

## What was decided

By the parent, in this brainstorm (2026-10-28):

- **Five save slots.**
- **Each save has a name**, typed on the computer's keyboard. No
  controller letter picker: "He's using a computer, he can just use the
  keyboard."
- **Difficulty belongs to the save**, not to the whole game. It's picked
  when the save is created.
- **A new save is completely fresh:** every stat and all career progress
  back at the very start.
- **Delete, with a confirm.**
- **Load and switch between saves.**
- **Before a save loads, a box pops up with its basic information**, so
  Harrison can see what the save "is".
- **His existing save becomes save 1.**
- **The screens:** the five mockups (SAVES, the info box, NEW SAVE,
  DELETE SAVE, the Hub) were approved as drawn ("Looks good, please
  proceed"), and so were the Shop and Hub with Stamina.
- **Stamina as proposed** ("Sounds good"): level 1 is today's sprint
  exactly, level 10 sprints about twice as long and gets its breath back
  faster, it costs what the other stats cost, every opponent stays at
  level 1, and a new measure checks the bosses' lessons at Stamina 10
  against the bars today's boss tuning tests already set (*The new
  measure*).

**The designer's calls, shown to the parent and not objected to:**

- Save 1 is named **HARRISON**, with the difficulty Options holds today
  (Harrison plays on Easy).
- Names are **up to 12 characters**: capital letters, digits and spaces.
- **RESET SAVE leaves Options.** Deleting a save and starting a new one
  replaces it.
- **A save's difficulty can still be changed in Options**, and the
  change applies to that save only.
- **Music, SFX and rumble stay shared** by every save.

## Save slots

### The flow

```
PRESS START ──> SAVES ──(full slot)──> info box ──PLAY──> Hub
                  │                       │
                  │                       └─DELETE─> DELETE SAVE ──YES──> SAVES
                  │
                  └─(empty slot)──> NEW SAVE ──START──> Hub

Hub: SAVES (new menu item) or B ──> SAVES        SAVES: B ──> PRESS START
```

### SAVES

Comes straight after PRESS START, every time.

- A panel titled **SAVES** with five rows, numbered 1 to 5 in big
  digits.
- **A full slot** shows its name (gold when picked), then under it
  `EASY  -  LEVEL 6`. On the right are its career stars (a star and the
  total) and, under them, its coins (a coin and the amount).
- **An empty slot** shows `- EMPTY -` in grey. When picked it also
  shows `START A NEW SAVE` on the right.
- The picked row sits on a darker band. Up/down move (wrapping), A or
  Enter picks, B or Esc goes back to PRESS START. The footer shows `A
  PICK` and `B BACK`.
- **The cursor starts on the last save he played.** With none, it
  starts on slot 1.

### The info box

Picking a full slot opens a box over the dimmed list. Nothing loads yet.

- Harrison's portrait on the left. On the right: the save's name, big
  and gold; `SAVE 1  -  EASY`; `LEVEL 6` with the XP bar, and the coins
  on the right; the stats line, Stamina included
  (`SPD 7  PWR 5  JMP 4  CTL 5  STA 3`); a star and `28 STARS`.
- Across the bottom, the same two career lines as the Hub card (e.g.
  `NEXT: SPEEDY SAM` / `THE PARK BOSS!`).
- A small menu: **PLAY** (picked first), **DELETE**, **BACK**.
- PLAY loads the save and goes to the Hub. DELETE goes to DELETE SAVE.
  BACK, B or Esc closes the box.

### NEW SAVE

Picking an empty slot opens NEW SAVE.

- **NAME:** a box that takes typing from the keyboard, with a blinking
  cursor, and the hint `TYPE A NAME ON THE KEYBOARD` under it. Letters
  come out as capitals, and digits and spaces are kept; anything else
  is dropped. Backspace deletes. Up to 12 characters; extra typing is
  ignored.
- **DIFFICULTY:** `<  NORMAL  >`, changed with left/right, starting on
  NORMAL.
- **START:** creates the save in that slot, saves it at once and goes
  to the Hub.
- Leading and trailing spaces are trimmed. A name left blank (or only
  spaces) becomes `SAVE 3` (its slot number). Two saves may share a
  name.
- B or Esc goes back to SAVES with nothing created.
- The NAME row is active first. Arrow keys must reach DIFFICULTY and
  START, and Enter must be able to finish. How text mode and the rows
  share the keyboard is the builder's (see *Left to the builder*).

**A new save is exactly `newProfile()`** plus its name and difficulty:
level 1, no XP, no coins, every stat at 1 (Stamina included), no power
moves or forms, no career stars, milestones or loss streaks, zero
totals, and no daily win.

### DELETE SAVE

From the info box's DELETE.

- Title `DELETE SAVE 2`, then the save's name, difficulty and level on
  one line.
- `ITS SAVE CODE, IN CASE`, then the save's code, laid out by
  `codeLines` as RESET SAVE shows it today (the mockup's five groups to
  a line was only a sketch).
- `ARE YOU SURE?` in red, then **NO** and **YES**, with **NO picked**.
- YES empties the slot and returns to SAVES. NO, B or Esc returns to the
  info box.

Deleting is the one way a save's progress goes away, and only on a
confirmed YES. The "nothing earned or bought is ever taken back" rule
means the game never takes anything; this is his choice. The code on
screen lets him bring it back: make a new save, then enter the code.

### The Hub

- **The card shows the save's name and difficulty**, e.g.
  `HARRISON - EASY` (silver), on the LEVEL row's right in the approved
  mockup. It must fit a 12-character name and `NORMAL` without touching
  the XP bar (see *Left to the builder*).
- **The stats line gains Stamina:** `SPD 7  PWR 5  JMP 4  CTL 5  STA 3`.
- **The menu gains SAVES**, last: CAREER, SHOP, OPTIONS, HELP, SAVES.
  SAVES and B both go back to the SAVES list, which starts on this save.
  B no longer goes to PRESS START.

### Options

- **DIFFICULTY now changes the current save's difficulty** and saves the
  save at once. Changing it mid-match still applies at once, as today.
- **From the Hub:** DIFFICULTY, MUSIC, SFX, RUMBLE, then SAVE CODE.
  **RESET SAVE is gone**, and the reset screen with it.
- **SAVE CODE** shows and copies the current save's code, as today.
  Entering a code replaces the current save's progress. It keeps the
  save's name. It takes the code's difficulty when the code has one
  (any code from this version on) and otherwise keeps the save's own.

### Storage

- **Slot 1 stays at today's key**, `harrisons-road-to-the-cup/profile`,
  so Harrison's live save never moves and an older build still finds
  it. Slots 2 to 5 are at `harrisons-road-to-the-cup/profile-2` to
  `profile-5`.
- **A slot is empty** when its key is missing, or holds something that
  isn't a save (not a record with a numeric `version` ≥ 1).
- **The last save played** is remembered under its own small key,
  `harrisons-road-to-the-cup/last-save` (`{ version: 1, slot: n }`). Not
  in the settings: a settings version bump would make older builds load
  default settings.
- **Delete removes the slot's key.** `KeyValueStore` gains
  `removeItem`, which never throws. Delete never removes a newer build's
  save: it refuses one whose version is above this build's, so
  `writeUnlessNewer`'s rule holds for removing too. *Designer's call:*
  a refused delete plays the `nope` cue, stays on DELETE SAVE and
  leaves the save as it is.
- **Settings keep their `difficulty` field** (settings stay v2, so
  older builds read them as today). This build reads it only as the
  loader's fallback difficulty: in practice, to give save 1 its
  difficulty the first time the v4 save loads, and for any slot whose
  difficulty is missing or bad. Options no longer writes it.
- **Storage that refuses or throws never stops the game.** Without
  storage, a save he creates or plays lives in memory until the page
  closes, and the SAVES list shows it in its slot for the session.
- **Two tabs:** a tab follows only its own slot's key. A removed key, or
  a value that isn't a save, doesn't replace the profile it's playing.
  The SAVES list reads every slot fresh each time it opens.

## The save, version 5

Profile **v5** appends three fields:

| Field | Type | Missing or bad in a loaded save |
|---|---|---|
| `name` | string, 1–12 of `A–Z 0–9` and space | `HARRISON` |
| `difficulty` | `'easy' \| 'normal' \| 'hard'` | the loader's fallback: the settings' difficulty |
| `stats.stamina` | whole number, 1–10 | 1 |

- **Harrison's live v4 save loads into v5 without loss.** Every v4
  field loads as today. Then name = `HARRISON`, difficulty = the
  settings' difficulty, Stamina = 1. PLAY writes it back as v5 at once.
- **The loader stays field by field** (`profileFrom`): a bad name or
  difficulty falls back to its own default, and the rest load. A loaded
  name is cleaned to the allowed characters and cut to 12; empty after
  cleaning means the default.
- **The save code appends two fields** after every v4 field, in this
  order: Stamina's level, then difficulty (1 easy, 2 normal, 3 hard; 0
  or missing means none). **Stamina must not join the code through
  `STAT_NAMES`.** Today's code writes the four stats in the middle of
  the field list, so adding Stamina there would shift every later field
  and break old codes. The code's first field, the version, becomes 5.
- **Old codes still load:** a v1–v4 code gets Stamina 1 and keeps the
  save's difficulty.
- **The name isn't in the code.** A code applied to a save keeps that
  save's name.
- **The longest code grows.** `MAX_ENTRY` (140 today, with the longest
  code 135 characters) and the code layouts on the save-code and
  delete screens must still fit the longest v5 code. The builder checks
  and raises them if needed.
- A v4 build that meets a v5 save reads it as best it can and won't
  write over it (`writeUnlessNewer`), as every earlier bump worked.

## Stamina

### What it does

Today a full bar lasts **2 s** of sprinting (drain 0.5 a second) and
refills from empty in about **3.3 s** (regen 0.3 a second). Run dry, he
can't sprint until a quarter of the bar is back.

Stamina scales the drain and the regen on the same straight line from
level 1 to 10 as the other stats (`curve` in `stats.ts`):

| Stamina | Drain /s | Full sprint | Regen /s | Empty to full |
|---|---|---|---|---|
| 1 | 0.5 | 2.0 s | 0.3 | 3.3 s |
| 10 | 0.25 | 4.0 s | 0.45 | 2.2 s |

- **Level 1 must equal today's constants exactly** (`curve(1, …)`
  returns `atMin`), so every player at Stamina 1 moves identically,
  tick for tick.
- The quarter-bar recovery threshold stays as it is. A faster regen
  shortens the wait on its own.
- The HUD's stamina bar is unchanged: it still shows the fraction.

### Where it appears

- **The Shop:** STAMINA is the fifth stat row, under CONTROL, at the
  same prices (150, then ×1.35 a level). Its blurb is
  `SPRINT LONGER, GET YOUR BREATH BACK FASTER`. The panel grows a little
  to fit, as in the approved mockup.
- **UPGRADE READY** on Results counts it, as it counts every stat.
- **The Hub card, the info box and anywhere else a stats line appears**
  gain `STA n`. The maxed line, `SPD 10  PWR 10  JMP 10  CTL 10  STA 10`
  (about 190 px), must fit in each place. It's wider than the info
  box's text column in the mockup, so that box's layout gives it room.
- **Help:** the sprint lines may add that the Shop's STAMINA makes the
  sprint last, if it fits the page. The builder decides.

### Opponents and parity

- `Stats` gains `stamina`. **Every opponent's stats get Stamina 1:**
  Max's ladder rows, the crew, Sam, the dog's tuning stats and every
  test's literal stats. So Max, Biscuit, the Park crew and Sam play
  exactly as now.
- Biscuit's own stamina (`DOG_DIFFICULTY[d].staminaS`, his pant) is a
  different system and doesn't change.
- **The scripted Harrisons in every existing tuning test stay at
  Stamina 1**, so every tuning test passes unchanged, with the same
  numbers.

### The new measure

A new tuning test runs the **wrong way** against each boss at
**Stamina 10**, everything else as the existing measures have it, on
Easy, Normal and Hard:

- **Biscuit:** the chaser script (`dogScripts.ts`) at the dog tuning
  stats plus Stamina 10. Today the chaser wins none.
- **Speedy Sam:** the racer script (`samScripts.ts`) at
  `SAM_TUNING_STATS` plus Stamina 10. Today it wins .188 / .094 / .109
  (E / N / H).
- For information, the same measure reports the right way at Stamina 10
  (blocker vs Biscuit, matador vs Sam).
- Also for information, it runs both wrong-way scripts with Speed 10
  and Stamina 10, the most a real Harrison can buy. *Designer's call,
  after the builder check:* a Speed 10 sprint (about 196 px/s) already
  outruns Biscuit (183 px/s) today, so the parent should see what the
  pair does, but it isn't guarded.

**The guard** (the parent asked for the designer's recommendation,
2026-10-28: the existing lesson bars, not the "more than half" first
proposed). At Stamina 10, with the tuning stats otherwise, the same
bars the boss tuning tests set today must hold:

- the chaser wins **at most 0.15 on Normal** against Biscuit
  (`dogTuning.test.ts`);
- the racer wins **at most 0.15 on Normal** against Sam, and the
  matador beats the racer by **at least 0.3 on every difficulty**
  (`samTuning.test.ts`).

If any bar fails, the build stops and the numbers go to the parent
before anything is tuned. The only fix in scope is gentler level-10
Stamina numbers, since the bosses don't change. When they hold, the
measured rates are pinned the way the existing tuning tests pin theirs.

## Non-goals

- Copying a save to another slot. A save code already does it.
- Renaming a save after it's made.
- A controller letter picker for names.
- Different rewards, stars or prices by difficulty.
- Stamina for any opponent above 1, or any other new stat.
- Any change to the Backyard, the Park, the crew, Sam, Biscuit or Max.
- Hair, face or kit changes (the Locker Room is the next plan).

## Constraints

Unchanged from the earlier specs:

- **The save rules:** a new field means a version bump; nothing earned
  or bought is ever taken back; the save code's fields are append-only;
  storage that throws never stops the game; `profileFrom` loads any
  version ≥ 1 field by field and caps runaway counts.
- **Harrison's live save loads into v5 without loss** and becomes save
  1, named HARRISON.
- **Every existing tuning test passes unchanged.**
- **On-screen text** uses only uppercase letters, digits and
  `' - : ! ? . , / + < >`. No parentheses.
- **No image, audio or font files, and no surname anywhere.**
- **Ask before every merge into `main` and every push** (the push
  publishes to Pages).

## Left to the builder

- How NEW SAVE shares the keyboard between typing and its rows. Today
  text mode drops the arrow keys, so either let the arrows through
  while typing (they type nothing) or move from NAME to DIFFICULTY on
  Enter. The arrows, Enter and Esc must all do what *NEW SAVE* says.
- Where exactly the save's name and difficulty sit on the Hub card. The
  mockup puts them on the LEVEL row's right, which is too tight for
  12 characters with a two-digit level; a shorter XP bar or a line of
  their own both work.
- The module layout. A small `saveSlots` module in `src/meta/` (keys,
  list, load, create, delete, last played) is the natural shape.
- The cues for the new screens (the existing menu cues fit), and
  whether a delete plays a sound of its own.
- The exact rows, spacing and colours, within the approved mockups.

## Build order change

The build order, as amended by the roadmap, with this plan done:

7. Career mode and what Harrison asked for after the Park:
   - 7a. The career spine (done)
   - 7b. The Park, four opponents and Speedy Sam (done)
   - Skill moves: the stepover and the rainbow flick (done)
   - **Save slots and the Stamina upgrade (this plan)**
   - The Locker Room, first round: kits, boots, accessories
   - Quick Match
   - 7c onward, unchanged.

## As built: Stamina's measure

Measured on 2026-10-28 with the boss tuning tests' seeds (32 for
Biscuit, 64 for Sam), win rates Easy / Normal / Hard. The Stamina 1 runs
reproduce today's numbers exactly.

| Run | Stamina 1 | Stamina 10 |
|---|---|---|
| Chaser vs Biscuit | 0 / 0 / 0 | 0 / **0** / 0 |
| Blocker vs Biscuit | .875 / .594 / .219 | .844 / .688 / .281 |
| Racer vs Sam | .188 / .094 / .109 | .203 / **.141** / .156 |
| Matador vs Sam | .922 / .609 / .422 | .984 / .781 / .547 |
| Matador − racer | .734 / .516 / .313 | **.781 / .641 / .391** |

Every bar holds at Stamina 10: the chaser wins 0 on Normal (≤ .15), the
racer .141 on Normal (≤ .15), and the matador leads the racer by at
least .391 (≥ .3). The racer's .141 is 9 wins in 64, one win under the
bar. `staminaTuning.test.ts` guards all three.

For information, not guarded, with **Speed 10 and Stamina 10**, the
most a real Harrison can buy:

- the chaser vs Biscuit: 0 / 0 / .031;
- the racer vs Sam: .516 / .313 / .203.

A fully bought Harrison who races Sam wins about a third of the time on
Normal, and half on Easy.
