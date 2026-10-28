import type { ContactEvents } from '../game/contact';
import type { TrickKind } from '../game/tricks';
import type { World } from '../game/world';
import type { GoalKind } from '../meta/economy';

/** Harrison's last kick, while the ball is still his: what it was and how far from Max's goal line. */
export interface LastKick {
  kind: GoalKind;
  perfect: boolean;
  distance: number;
}

/** A goal kicked from at least this far out (px from the goal line) is a screamer. */
export const SCREAMER_PX = 200;
export const HAT_TRICK_GOALS = 3;

/**
 * Updates Harrison's last kick from one tick's events (kicks are [home, away]).
 * Max touching the ball, or Harrison dribbling it on, means a goal no longer
 * came from that kick.
 */
export function noteKick(last: LastKick | null, w: World): LastKick | null {
  const [home, away] = w.events.kicks;
  if (away && (away.touched || away.kicked || away.tackledBall)) return null;
  if (!home) return last;
  const goal = w.field.goals.find(g => g.side === 'right')!;
  if (w.events.power.fired) return { kind: 'wave', perfect: false, distance: Math.abs(goal.lineX - w.ball.x) };
  if (home.kicked) return { kind: home.kicked, perfect: home.perfect, distance: Math.abs(goal.lineX - w.ball.x) };
  return home.touched ? null : last;
}

/** A trick goal is scored within this long of the sell, s. */
export const TRICK_GOAL_S = 4;

/** Each trick's name, as it's called out when it fools someone and under GOAL!!! for a trick goal. */
export const TRICK_CALLOUT: Readonly<Record<TrickKind, string>> = { stepover: 'STEPOVER!', flick: 'RAINBOW FLICK!' };

/** The kicks that make a goal a style goal of their own: one style per goal, so a trick before one doesn't count too. */
const STYLE_KICKS: ReadonlySet<GoalKind> = new Set(['header', 'volley', 'chip', 'wave']);

/** A goal now would be a trick goal: the trick, how long since its sell, and whether it's a flick that fooled nobody. */
export interface TrickChance {
  kind: TrickKind;
  sinceS: number;
  /** A flick that fooled nobody: a goal counts only if it drops straight in, so anyone playing the ball ends it. */
  flicked: boolean;
}

const played = (k: ContactEvents | undefined): boolean => k !== undefined && (k.touched || k.kicked !== null || k.tackledBall);

/**
 * Updates the trick goal's chance from one tick's events. A trick that
 * fools someone opens it for TRICK_GOAL_S, through Harrison's own touches;
 * the opponent playing the ball ends it. A flick that fools nobody opens it
 * until anyone plays the ball.
 */
export function noteTrick(chance: TrickChance | null, w: World, dt: number): TrickChance | null {
  const { trick, kicks } = w.events;
  const [home, away] = kicks;
  if (trick.fooled) return { kind: trick.fooled, sinceS: 0, flicked: false };
  if (trick.released) return { kind: 'flick', sinceS: 0, flicked: true };
  if (!chance || played(away) || (chance.flicked && played(home))) return null;
  const sinceS = chance.sinceS + dt;
  return chance.flicked || sinceS <= TRICK_GOAL_S ? { ...chance, sinceS } : null;
}

/** The trick a goal now counts as, or null: a live chance, unless the scoring kick is a style of its own. */
export function trickGoal(chance: TrickChance | null, kick: LastKick | null): TrickKind | null {
  return chance && !(kick && STYLE_KICKS.has(kick.kind)) ? chance.kind : null;
}

/** The line under GOAL!!! that names Harrison's goal, if it was special. A trick goal names its trick. */
export function goalCallout(kick: LastKick | null, homeGoals: number, trick: TrickKind | null = null): string | null {
  if (kick?.kind === 'wave') return 'ENERGY WAVE!';
  if (homeGoals === HAT_TRICK_GOALS) return 'HAT-TRICK!';
  if (trick && !(kick && STYLE_KICKS.has(kick.kind))) return TRICK_CALLOUT[trick];
  if (!kick) return null;
  if (kick.perfect) return 'PERFECT STRIKE!';
  if (kick.kind === 'header') return 'HEADER!';
  if (kick.kind === 'volley') return 'VOLLEY!';
  if (kick.kind === 'chip') return 'CHIP!';
  return kick.distance >= SCREAMER_PX ? 'SCREAMER!' : null;
}
