import type { RumbleKind } from '../engine/rumble';
import type { Phase } from '../game/match';
import type { World } from '../game/world';
import type { Cue } from './cues';

/** Ball speed (px/s) after a kick at or above which it sounds hard. */
export const HARD_KICK_SPEED = 350;

export interface MatchFeedback {
  cues: Cue[];
  rumble: RumbleKind[];
}

/** The power-up's rumble steps up as the charge passes these. */
const CHARGE_STEPS: readonly [at: number, kind: RumbleKind][] = [
  [1 / 3, 'charge2'],
  [2 / 3, 'charge3'],
];

/**
 * The sounds and rumbles one tick's events make. The kicks are [home, away].
 * The rumble only ever reflects what Harrison feels. A ball resting against
 * the net reports a hit every tick, so the net only sounds on a goal.
 * `prevCharge` is his charge before the tick, so the power-up's rumble can
 * step up as it builds.
 */
export function matchFeedback(w: World, prevPhase: Phase, prevCharge = 0): MatchFeedback {
  const cues = new Set<Cue>();
  const rumble = new Set<RumbleKind>();
  const { ball, kicks, goal, power } = w.events;
  if (power.started) {
    cues.add('powerUp').add('ooh');
    rumble.add('charge1');
  }
  if (w.home.state === 'poweringUp') {
    for (const [at, kind] of CHARGE_STEPS) if (prevCharge < at && w.home.charge >= at) rumble.add(kind);
  }
  if (power.fired) {
    cues.add('waveBlast').add('beam');
    rumble.add('wave');
  }
  if (power.braced) {
    cues.add('brace');
    rumble.add('brace');
  }
  if (power.blown) cues.add('whoosh');
  const hard = Math.hypot(w.ball.vx, w.ball.vy, w.ball.vz) >= HARD_KICK_SPEED;
  kicks.forEach((k, i) => {
    if (k.kicked) {
      cues.add(hard ? 'kickHard' : 'kickSoft');
      if (hard && i === 0) rumble.add('hardShot');
    } else if (k.touched) {
      cues.add('tap');
    }
    if (k.perfect) cues.add('perfect');
    if (k.tackledBall || k.trippedOpponent) {
      cues.add('tackle');
      rumble.add('tackle');
    }
  });
  if (ball.bounced) cues.add('bounce');
  if (ball.hitPost || ball.hitBar) {
    cues.add('post').add('ooh');
    rumble.add('post');
  }
  if (ball.hitWall) cues.add('fence');
  if (goal) {
    cues.add('net').add(goal === 'home' ? 'roar' : 'groan');
    rumble.add(goal === 'home' ? 'goal' : 'maxGoal');
  }
  const phase = w.match.phase;
  if (prevPhase === 'kickoff' && phase === 'playing') cues.add('whistleShort');
  if (prevPhase !== 'fullTime' && phase === 'fullTime') cues.add('whistleFull');
  return { cues: [...cues], rumble: [...rumble] };
}
