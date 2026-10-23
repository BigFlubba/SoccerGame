import { MASTER } from '../art/colors';
import type { InputFrame } from '../engine/input';
import { BASE_W } from '../engine/viewport';
import { DIFFICULTY, createBrain, think, type Difficulty } from '../game/ai';
import { updateCamera, type Camera } from '../game/camera';
import { HUMAN_AIM_ERROR_DEG, type Aim } from '../game/kick';
import { cancelCharge, type PlayerIntent } from '../game/player';
import { BASE_STATS } from '../game/stats';
import { createWorld, stepWorld, type World } from '../game/world';
import type { GameContext } from './context';
import { drawMenu, stepMenu, type MenuState } from './menu';
import { drawMatch, type MatchHud } from './matchView';
import type { Scene } from './scene';
import { createHelpScene } from './helpScene';
import { createOptionsScene } from './optionsScene';
import { createPressStartScene } from './titleScene';

export interface MatchScene extends Scene {
  readonly world: World;
  readonly paused: boolean;
  /** Max's difficulty right now: a change in Options mid-match applies at once. */
  readonly difficulty: Difficulty;
}

export const PAUSE_ITEMS = ['RESUME', 'RESTART', 'HELP', 'OPTIONS', 'QUIT TO TITLE'] as const;
const FULL_TIME_ITEMS = ['PLAY AGAIN', 'TITLE'] as const;
/** The FULL TIME banner shows this long before the result and menu. */
const RESULT_DELAY_S = 1.5;
const PERFECT_SHOW_S = 0.6;
/** How far the stick must lean up or down to aim a shot. */
const AIM_THRESHOLD = 0.5;
const RESULT_TEXT = { win: 'YOU WIN!', lose: 'YOU LOSE', draw: 'DRAW' } as const;

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

/** A 90-second match against Max, with pause and full-time menus. */
export function createMatchScene(ctx: GameContext, seed: number): MatchScene {
  const { art } = ctx;
  let difficulty = ctx.settings.difficulty;
  const profile = DIFFICULTY[difficulty];
  const world = createWorld(BASE_STATS, BASE_STATS, seed, { home: HUMAN_AIM_ERROR_DEG, away: profile.aimErrorDeg });
  const brain = createBrain(profile);
  const cam: Camera = { x: world.ball.x - BASE_W / 2 };
  const hud: MatchHud = { perfect: null };
  let pause: MenuState | null = null;
  let fullTime: MenuState | null = null;
  let t = 0;

  const openPause = () => {
    pause = { items: PAUSE_ITEMS, index: 0 };
    // A held charge is dropped, not fired, so pausing can't shoot.
    cancelCharge(world.home);
  };
  const restart = () => createMatchScene(ctx, seed + 1);
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
    onHidden() {
      if (!pause && world.match.phase !== 'fullTime') openPause();
    },
    update(input, dt) {
      if (pause) {
        const r = stepMenu(pause, input);
        pause = r.m;
        if (r.chosen === 'RESTART') return restart();
        if (r.chosen === 'HELP') return createHelpScene(ctx, backHere);
        if (r.chosen === 'OPTIONS') return createOptionsScene(ctx, backHere);
        if (r.chosen === 'QUIT TO TITLE') return createPressStartScene(ctx);
        if (r.chosen === 'RESUME' || r.back || (!r.chosen && input.pressed.has('pause'))) {
          pause = null;
          // Buttons held while the menu closes (B is also "back") need a fresh press to act in play.
          world.home.held = { shoot: input.held.has('shoot'), chip: input.held.has('chip') };
        }
        return null;
      }
      if (fullTime) {
        const r = stepMenu(fullTime, input);
        fullTime = r.m;
        if (r.chosen === 'PLAY AGAIN') return restart();
        if (r.chosen === 'TITLE') return createPressStartScene(ctx);
      } else if (input.pressed.has('pause') && world.match.phase !== 'fullTime') {
        openPause();
        return null;
      }

      t += dt;
      stepWorld(world, harrisonIntent(input), think(brain, world, world.away, world.home, dt), dt);
      world.events.kicks.forEach((k, i) => {
        if (k.perfect) hud.perfect = { team: i === 0 ? 'home' : 'away', untilS: t + PERFECT_SHOW_S };
      });
      updateCamera(cam, world.ball, dt, world.field);
      if (world.match.phase === 'fullTime' && !fullTime && world.match.phaseT >= RESULT_DELAY_S) {
        fullTime = { items: FULL_TIME_ITEMS, index: 0 };
      }
      return null;
    },
    draw(g) {
      drawMatch(g, world, cam, art, t, hud);
      if (pause) drawMenu(g, art, pause, BASE_W / 2, 70);
      if (fullTime && world.match.result) {
        const { home, away } = world.match.score;
        g.fillStyle = MASTER.outline;
        g.fillRect(0, 50, BASE_W, 70);
        const result = art.text(RESULT_TEXT[world.match.result], 2, 'energyGold', 'outline');
        g.drawImage(result, Math.round(BASE_W / 2 - result.width / 2), 56);
        const score = art.text(`${home} - ${away}`, 1, 'white', 'outline');
        g.drawImage(score, Math.round(BASE_W / 2 - score.width / 2), 74);
        drawMenu(g, art, fullTime, BASE_W / 2, 88);
      }
    },
  };
  return scene;
}
