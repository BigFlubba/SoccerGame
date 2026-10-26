import { seeded, type Rng } from '../engine/random';
import { BALL_REST_Y, stepBall, type Ball, type BallEvents } from './ball';
import { resolveBodies } from './bodies';
import { resolveContacts, type ContactEvents } from './contact';
import { BACKYARD, goalScored, type Field } from './field';
import { createMatch, stepMatch, type MatchState, type Team } from './match';
import { NO_INTENT, createPlayer, stepPlayer, type Player, type PlayerIntent } from './player';
import type { Stats } from './stats';
import type { PowerState } from './power';
import { ballAtFeet } from './zones';

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
  /** Harrison's super meter; null unless he owns a power move, and then the match plays exactly as before. */
  power: PowerState | null;
  /** Fixed ticks so far; its parity decides who acts on the ball first. */
  tick: number;
}

/** Where the kicking-off player stands, behind the ball. */
const KICKOFF_GAP = 12;
/** How far inside his own half the other player waits. */
const KICKOFF_DEFENDER_DEPTH = 70;

const attackDir = (team: Team): 1 | -1 => (team === 'home' ? 1 : -1);

const quietEvents = (): WorldEvents => ({ kicks: [], ball: { bounced: false, hitBar: false, hitPost: false, hitWall: false, hitNet: false }, goal: null });

export function createWorld(homeStats: Stats, awayStats: Stats, seed: number, aimErrorDeg: { home: number; away: number }): World {
  const centre = BACKYARD.width / 2;
  const w: World = {
    field: BACKYARD,
    ball: { x: centre, y: BALL_REST_Y, z: BACKYARD.depth / 2, vx: 0, vy: 0, vz: 0, spin: 0, spinAngle: 0 },
    home: createPlayer('home', homeStats, centre, 1),
    away: createPlayer('away', awayStats, centre, -1),
    match: createMatch(),
    rng: seeded(seed),
    aimErrorDeg,
    events: quietEvents(),
    power: null,
    tick: 0,
  };
  placeForKickoff(w);
  return w;
}

/** Puts a player back on his feet at (x, z), keeping his stamina and held buttons. */
function reset(p: Player, x: number, z: number): void {
  const { stamina, held, exhausted } = p;
  Object.assign(p, createPlayer(p.team, p.stats, x, attackDir(p.team), z), { stamina, held, exhausted });
}

/** Ball on the centre spot, the kicking-off player just behind it, the other back in his own half. */
export function placeForKickoff(w: World): void {
  const centre = w.field.width / 2;
  Object.assign(w.ball, { x: centre, y: BALL_REST_Y, z: w.field.depth / 2, vx: 0, vy: 0, vz: 0, spin: 0 });
  for (const p of [w.home, w.away]) {
    const dir = attackDir(p.team);
    reset(p, p.team === w.match.kickoffTeam ? centre - KICKOFF_GAP * dir : centre - KICKOFF_DEFENDER_DEPTH * dir, w.field.depth / 2);
  }
}

/**
 * Steps a player on his intent while the ball is in play, standing still
 * otherwise. Buttons held outside play still count as held, so one held
 * through a goal pause or kickoff needs a fresh press.
 */
function stepOne(p: Player, intent: PlayerIntent, live: boolean, w: World, dt: number): void {
  stepPlayer(p, live ? intent : NO_INTENT, dt, w.field, ballAtFeet(p, w.ball));
  if (!live) p.held = { shoot: intent.shootHeld, chip: intent.chipHeld, power: intent.powerHeld };
}

/**
 * One fixed tick: players, then their bodies kept apart and out of the
 * goals, then the ball, contacts and the match rules. Intents only count
 * while the ball is in play.
 */
export function stepWorld(w: World, homeIntent: PlayerIntent, awayIntent: PlayerIntent, dt: number): void {
  const live = w.match.phase === 'playing';
  stepOne(w.home, homeIntent, live, w, dt);
  stepOne(w.away, awayIntent, live, w, dt);
  resolveBodies(w.home, w.away, w.field);

  const ball = stepBall(w.ball, dt, w.field);
  // The second player to act on the ball has the last word, so take turns going first.
  const contact = (p: Player, other: Player) => resolveContacts(p, other, w.ball, w.aimErrorDeg[p.team], w.rng, w.field);
  const homeFirst = w.tick % 2 === 0;
  const first = homeFirst ? contact(w.home, w.away) : contact(w.away, w.home);
  const second = homeFirst ? contact(w.away, w.home) : contact(w.home, w.away);
  const kicks = homeFirst ? [first, second] : [second, first];
  w.tick++;

  const before = { ...w.match.score };
  const { resetForKickoff } = stepMatch(w.match, dt, goalScored(w.field, w.ball));
  const goal: Team | null = w.match.score.home > before.home ? 'home' : w.match.score.away > before.away ? 'away' : null;
  w.events = { kicks, ball, goal };
  if (resetForKickoff) placeForKickoff(w);
}
