import { matchFeedback } from '../audio/matchFeedback';
import type { InputFrame } from '../engine/input';
import { BASE_W } from '../engine/viewport';
import { DIFFICULTY, createBrain, think, type Difficulty } from '../game/ai';
import { updateCamera, type Camera } from '../game/camera';
import { HUMAN_AIM_ERROR_DEG, type Aim } from '../game/kick';
import { cancelCharge, type PlayerIntent } from '../game/player';
import { endGoalPause } from '../game/match';
import { createWorld, stepWorld, type World } from '../game/world';
import type { StyleKind } from '../meta/economy';
import { maxStats, nextMatch } from '../meta/ladder';
import { applyMatch, type MatchReward } from '../meta/progress';
import type { GameContext } from './context';
import { drawMenu, menuCue, stepMenu, type MenuState } from './menu';
import { HAT_TRICK_GOALS, goalCallout, noteKick, type LastKick } from './goalCallout';
import { createGoalMoment, simScale, stepGoalMoment, type GoalMoment } from './goalMoment';
import { stepTrail, type TrailPoint } from './shotTrail';
import { drawMatch, type MatchHud } from './matchView';
import type { Scene } from './scene';
import { createHelpScene } from './helpScene';
import { createOptionsScene } from './optionsScene';
import { createResultsScene } from './resultsScene';
import { createHubScene } from './hubScene';

export interface MatchScene extends Scene {
  readonly world: World;
  readonly paused: boolean;
  /** Max's difficulty right now: a change in Options mid-match applies at once. */
  readonly difficulty: Difficulty;
  /** Harrison's goal moment, while it runs. */
  readonly moment: GoalMoment | null;
  /** The line under GOAL!!! naming his goal (HEADER!, HAT-TRICK!...), while the moment runs. */
  readonly callout: string | null;
  /** Where a hard-hit ball has just been, newest first. */
  readonly trail: readonly TrailPoint[];
  /** The Backyard Ladder match being played, fixed when the match is made. */
  readonly ladderMatch: number;
  /** What the match paid, from the tick it reached full time. */
  readonly reward: MatchReward | null;
  /** The goal flash is owed to the next drawn frame. */
  readonly flash: boolean;
}

export const PAUSE_ITEMS = ['RESUME', 'RESTART', 'HELP', 'OPTIONS', 'QUIT TO HUB'] as const;
/** The FULL TIME banner shows this long before Results. */
const RESULT_DELAY_S = 1.5;
const PERFECT_SHOW_S = 0.6;
/** How far the stick must lean up or down to aim a shot. */
const AIM_THRESHOLD = 0.5;
/** A hat-trick's second roar comes in this long (real seconds) into the moment. */
const HAT_TRICK_ROAR_S = 1.2;

/** A fresh seed per match so every game plays differently. */
export const newSeed = (): number => Math.floor(Math.random() * 2 ** 32);

const isStyle = (kind: LastKick['kind']): kind is Extract<StyleKind, LastKick['kind']> => kind === 'header' || kind === 'volley' || kind === 'chip';

/** Harrison's intent from the controller: the stick moves and aims, buttons act. */
function harrisonIntent(input: InputFrame): PlayerIntent {
  const aim: Aim = input.moveY < -AIM_THRESHOLD ? 'far' : input.moveY > AIM_THRESHOLD ? 'near' : 'straight';
  return {
    moveX: input.moveX,
    // The stick's up is away from the camera.
    moveZ: -input.moveY,
    aim,
    jump: input.pressed.has('jump'),
    shootHeld: input.held.has('shoot'),
    chipHeld: input.held.has('chip'),
    sprint: input.held.has('sprint'),
  };
}

/**
 * A 90-second ladder match against Max: Harrison with his bought stats, Max
 * with the match's. It pays out on the tick it reaches full time, then hands
 * over to Results after the FULL TIME banner.
 */
export function createMatchScene(ctx: GameContext, seed: number): MatchScene {
  const { art } = ctx;
  let difficulty = ctx.settings.difficulty;
  const thinking = DIFFICULTY[difficulty];
  const ladderMatch = nextMatch(ctx.profile.ladderWins);
  const world = createWorld({ ...ctx.profile.stats }, maxStats(ladderMatch), seed, { home: HUMAN_AIM_ERROR_DEG, away: thinking.aimErrorDeg });
  const brain = createBrain(thinking);
  const cam: Camera = { x: world.ball.x - BASE_W / 2 };
  const hud: MatchHud = { perfect: null, moment: null, callout: null, trail: [], flash: false };
  let lastKick: LastKick | null = null;
  /** Harrison's header, volley and chip goals, for the style bonus. */
  const styleGoals: StyleKind[] = [];
  let pause: MenuState | null = null;
  let reward: MatchReward | null = null;
  let results: Scene | null = null;
  let t = 0;
  ctx.audio.setCrowd('match');
  // No music in a match: the crowd carries it.
  ctx.audio.playMusic(null);

  /** Steps a menu, blipping as it goes. */
  const step = (m: MenuState, input: InputFrame) => {
    const r = stepMenu(m, input);
    const cue = menuCue(m, r);
    if (cue) ctx.audio.play(cue);
    return r;
  };
  const openPause = () => {
    pause = { items: PAUSE_ITEMS, index: 0 };
    // A held charge is dropped, not fired, so pausing can't shoot.
    cancelCharge(world.home);
    ctx.audio.setCrowd('low');
  };
  const restart = () => createMatchScene(ctx, seed + 1);
  /** Saved at once, so closing the tab during the FULL TIME banner loses nothing. Called once, on the full-time tick. */
  const award = (result: NonNullable<World['match']['result']>) => {
    const { home, away } = world.match.score;
    const done = applyMatch(ctx.profile, { result, goalsFor: home, goalsAgainst: away, styleGoals: [...styleGoals] }, ladderMatch, ctx.today());
    ctx.saveProfile(done.profile);
    reward = done.reward;
  };
  /** Help and Options come back to this match, still paused, with any new difficulty applied to Max. */
  const backHere = (): Scene => {
    difficulty = ctx.settings.difficulty;
    brain.profile = DIFFICULTY[difficulty];
    world.aimErrorDeg.away = brain.profile.aimErrorDeg;
    return scene;
  };

  const scene: MatchScene = {
    kind: 'match',
    world,
    get paused() {
      return pause !== null;
    },
    get difficulty() {
      return difficulty;
    },
    get moment() {
      return hud.moment;
    },
    get callout() {
      return hud.callout;
    },
    get trail() {
      return hud.trail;
    },
    ladderMatch,
    get reward() {
      return reward;
    },
    get flash() {
      return hud.flash;
    },
    onHidden() {
      if (!pause && world.match.phase !== 'fullTime') openPause();
    },
    update(input, dt) {
      if (pause) {
        const r = step(pause, input);
        pause = r.m;
        if (r.chosen === 'RESTART') return restart();
        if (r.chosen === 'HELP') return createHelpScene(ctx, backHere);
        if (r.chosen === 'OPTIONS') return createOptionsScene(ctx, backHere);
        if (r.chosen === 'QUIT TO HUB') return createHubScene(ctx);
        if (r.chosen === 'RESUME' || r.back || (!r.chosen && input.pressed.has('pause'))) {
          pause = null;
          ctx.audio.setCrowd(hud.moment ? 'roar' : 'match');
          // Buttons held while the menu closes (B is also "back") need a fresh press to act in play.
          world.home.held = { shoot: input.held.has('shoot'), chip: input.held.has('chip') };
        }
        return null;
      }
      if (results) return results;
      if (input.pressed.has('pause') && world.match.phase !== 'fullTime' && !(hud.moment && input.pressed.has('confirm'))) {
        // During Harrison's moment Enter (pause plus confirm) skips it instead; Esc and Start still pause.
        openPause();
        return null;
      }

      t += dt;
      // Harrison's goal moment slows or freezes the match; the simulation only sees a smaller dt.
      const moment = hud.moment;
      const simDt = dt * (moment ? simScale(moment) : 1);
      if (simDt > 0) {
        const prevPhase = world.match.phase;
        stepWorld(world, harrisonIntent(input), think(brain, world, world.away, world.home, simDt), simDt);
        const feedback = matchFeedback(world, prevPhase);
        for (const cue of feedback.cues) ctx.audio.play(cue);
        for (const kind of feedback.rumble) ctx.rumble.pulse(kind);
        world.events.kicks.forEach((k, i) => {
          if (k.perfect) hud.perfect = { team: i === 0 ? 'home' : 'away', untilS: t + PERFECT_SHOW_S };
        });
        updateCamera(cam, world.ball, simDt, world.field);
        stepTrail(hud.trail, world.ball);
        lastKick = noteKick(lastKick, world);
        if (world.events.goal === 'home') {
          hud.moment = createGoalMoment();
          hud.flash = true;
          hud.callout = goalCallout(lastKick, world.match.score.home);
          if (lastKick && isStyle(lastKick.kind)) styleGoals.push(lastKick.kind);
          // The roar cue swells; the crowd holds it through the celebration.
          ctx.audio.setCrowd('roar');
        }
        if (world.events.goal) lastKick = null;
      }
      if (moment) {
        const before = moment.t;
        // A fresh press skips it; the held shot that scored doesn't, since presses are edges.
        stepGoalMoment(moment, dt, input.pressed.has('confirm') || input.pressed.has('shoot'));
        if (world.match.score.home === HAT_TRICK_GOALS && hud.callout && before < HAT_TRICK_ROAR_S && moment.t >= HAT_TRICK_ROAR_S) {
          ctx.audio.play('roar');
        }
        if (moment.done) {
          endGoalPause(world.match);
          hud.moment = null;
          hud.callout = null;
          ctx.audio.setCrowd('match');
        }
      }
      if (world.match.phase !== 'fullTime' || !world.match.result) return null;
      if (!reward) award(world.match.result);
      // Results brings in the jingle, after the full-time whistle.
      if (world.match.phaseT >= RESULT_DELAY_S) results = createResultsScene(ctx, reward!);
      return results;
    },
    draw(g) {
      drawMatch(g, world, cam, art, t, hud);
      if (pause) drawMenu(g, art, pause, BASE_W / 2, 70);
    },
  };
  return scene;
}
