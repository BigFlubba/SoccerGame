import type { World } from '../game/world';

/** Harrison's last kick, while the ball is still his: what it was and how far from Max's goal line. */
export interface LastKick {
  kind: 'shot' | 'chip' | 'volley' | 'header';
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
  if (home.kicked) {
    const goal = w.field.goals.find(g => g.side === 'right')!;
    return { kind: home.kicked, perfect: home.perfect, distance: Math.abs(goal.lineX - w.ball.x) };
  }
  return home.touched ? null : last;
}

/** The line under GOAL!!! that names Harrison's goal, if it was special. */
export function goalCallout(kick: LastKick | null, homeGoals: number): string | null {
  if (homeGoals === HAT_TRICK_GOALS) return 'HAT-TRICK!';
  if (!kick) return null;
  if (kick.perfect) return 'PERFECT STRIKE!';
  if (kick.kind === 'header') return 'HEADER!';
  if (kick.kind === 'volley') return 'VOLLEY!';
  if (kick.kind === 'chip') return 'CHIP!';
  return kick.distance >= SCREAMER_PX ? 'SCREAMER!' : null;
}
