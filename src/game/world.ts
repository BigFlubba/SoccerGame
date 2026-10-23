import { BALL_R } from '../art/ball';
import { seeded, type Rng } from '../engine/random';
import { BALL_REST_Y, stepBall, type Ball, type BallEvents } from './ball';
import { resolveContacts, type ContactEvents } from './contact';
import { BACKYARD, goalScored, type Field } from './field';
import { createMatch, stepMatch, type MatchState, type Team } from './match';
import { NO_INTENT, createPlayer, stepPlayer, type Player, type PlayerIntent } from './player';
import type { Stats } from './stats';
import { ballIn, footZone } from './zones';

export interface WorldEvents {
  kicks: ContactEvents[];
  ball: BallEvents;
  goal: Team | null;
}

export interface World {
  field: Field;
  ball: Ball;
  home: Player;
  away: Player;
  match: MatchState;
  rng: Rng;
  aimErrorDeg: { home: number; away: number };
  events: WorldEvents;
  /** Fixed ticks so far; its parity decides who acts on the ball first. */
  tick: number;
}

/** Where the kicking-off player stands, behind the ball. */
const KICKOFF_GAP = 12;
/** How far inside his own half the other player waits. */
const KICKOFF_DEFENDER_DEPTH = 70;

const attackDir = (team: Team): 1 | -1 => (team === 'home' ? 1 : -1);

const quietEvents = (): WorldEvents => ({ kicks: [], ball: { bounced: false, hitBar: false, hitWall: false, hitNet: false }, goal: null });

export function createWorld(homeStats: Stats, awayStats: Stats, seed: number, aimErrorDeg: { home: number; away: number }): World {
  const centre = BACKYARD.width / 2;
  const w: World = {
    field: BACKYARD,
    ball: { x: centre, y: BALL_REST_Y, vx: 0, vy: 0, spin: 0, spinAngle: 0 },
    home: createPlayer('home', homeStats, centre, 1),
    away: createPlayer('away', awayStats, centre, -1),
    match: createMatch(),
    rng: seeded(seed),
    aimErrorDeg,
    events: quietEvents(),
    tick: 0,
  };
  placeForKickoff(w);
  return w;
}

/** Puts a player back on his feet at x, keeping his stamina and held buttons. */
function reset(p: Player, x: number): void {
  const { stamina, held, exhausted } = p;
  Object.assign(p, createPlayer(p.team, p.stats, x, attackDir(p.team)), { stamina, held, exhausted });
}

/** Ball on the centre spot, the kicking-off player just behind it, the other back in his own half. */
export function placeForKickoff(w: World): void {
  const centre = w.field.width / 2;
  Object.assign(w.ball, { x: centre, y: BALL_REST_Y, vx: 0, vy: 0, spin: 0 });
  for (const p of [w.home, w.away]) {
    const dir = attackDir(p.team);
    reset(p, p.team === w.match.kickoffTeam ? centre - KICKOFF_GAP * dir : centre - KICKOFF_DEFENDER_DEPTH * dir);
  }
}

/** The ball is at his feet when it's on the ground in reach of his foot. */
const ballAtFeet = (p: Player, ball: Ball): boolean => p.y === 0 && ball.y <= BALL_REST_Y && ballIn(footZone(p), ball, BALL_R);

/** One fixed tick: players, ball, contacts, then the match rules. Intents only count while the ball is in play. */
export function stepWorld(w: World, homeIntent: PlayerIntent, awayIntent: PlayerIntent, dt: number): void {
  const live = w.match.phase === 'playing';
  stepPlayer(w.home, live ? homeIntent : NO_INTENT, dt, w.field, ballAtFeet(w.home, w.ball));
  // Players run past each other (drawn one behind the other); only the ball is contested.
  stepPlayer(w.away, live ? awayIntent : NO_INTENT, dt, w.field, ballAtFeet(w.away, w.ball));

  const ball = stepBall(w.ball, dt, w.field);
  // The second player to act on the ball has the last word, so take turns going first.
  const contact = (p: Player, other: Player) => resolveContacts(p, other, w.ball, w.aimErrorDeg[p.team], w.rng, w.field);
  const homeFirst = w.tick % 2 === 0;
  const first = homeFirst ? contact(w.home, w.away) : contact(w.away, w.home);
  const second = homeFirst ? contact(w.away, w.home) : contact(w.home, w.away);
  const kicks = homeFirst ? [first, second] : [second, first];
  w.tick++;

  const before = { ...w.match.score };
  const { resetForKickoff } = stepMatch(w.match, dt, goalScored(w.field, { ...w.ball, z: w.field.depth / 2 }));
  const goal: Team | null = w.match.score.home > before.home ? 'home' : w.match.score.away > before.away ? 'away' : null;
  w.events = { kicks, ball, goal };
  if (resetForKickoff) placeForKickoff(w);
}
