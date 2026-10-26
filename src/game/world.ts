import { seeded, type Rng } from '../engine/random';
import { BALL_REST_Y, stepBall, type Ball, type BallEvents } from './ball';
import { resolveBodies } from './bodies';
import { resolveContacts, type ContactEvents } from './contact';
import { BACKYARD, goalScored, type Field } from './field';
import { createMatch, stepMatch, type MatchState, type Team } from './match';
import { NO_INTENT, createPlayer, stepPlayer, type Player, type PlayerIntent } from './player';
import {
  POWERED_S,
  addMeter,
  canFireWave,
  canStartPower,
  createPower,
  maxGoal,
  maxGoalDir,
  onTarget,
  tickPower,
  trapAtFeet,
  type PowerKit,
  type PowerState,
} from './power';
import type { Stats } from './stats';
import { fireWave, stepWave, type Wave } from './wave';
import { ballAtFeet } from './zones';

/** What Harrison's power-up did this tick. All false without a power move. */
export interface PowerEvents {
  started: boolean;
  cancelled: boolean;
  fired: boolean;
  braced: boolean;
  blown: boolean;
}

export interface WorldEvents {
  kicks: ContactEvents[];
  ball: BallEvents;
  goal: Team | null;
  power: PowerEvents;
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
  /** The Energy Wave on screen, live or fading. */
  wave: Wave | null;
  /** Fixed ticks so far; its parity decides who acts on the ball first. */
  tick: number;
}

/** Where the kicking-off player stands, behind the ball. */
const KICKOFF_GAP = 12;
/** How far inside his own half the other player waits. */
const KICKOFF_DEFENDER_DEPTH = 70;

const attackDir = (team: Team): 1 | -1 => (team === 'home' ? 1 : -1);

const quietPower = (): PowerEvents => ({ started: false, cancelled: false, fired: false, braced: false, blown: false });
const quietContact = (): ContactEvents => ({ touched: false, kicked: null, perfect: false, tackledBall: false, trippedOpponent: false });
const quietEvents = (): WorldEvents => ({
  kicks: [],
  ball: { bounced: false, hitBar: false, hitPost: false, hitWall: false, hitNet: false },
  goal: null,
  power: quietPower(),
});

/** The kicks that make a goal a style goal. */
const STYLE_KINDS: ReadonlySet<PowerState['lastKind']> = new Set(['header', 'volley', 'chip', 'wave']);

/** `kit` gives Harrison his super meter; without one the match plays exactly as it always has. */
export function createWorld(
  homeStats: Stats,
  awayStats: Stats,
  seed: number,
  aimErrorDeg: { home: number; away: number },
  kit: PowerKit | null = null,
): World {
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
    power: kit ? createPower(kit) : null,
    wave: null,
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
function stepOne(p: Player, intent: PlayerIntent, live: boolean, w: World, dt: number, waveDir: 1 | -1 | null = null): void {
  stepPlayer(p, live ? intent : NO_INTENT, dt, w.field, ballAtFeet(p, w.ball), waveDir);
  if (!live) p.held = { shoot: intent.shootHeld, chip: intent.chipHeld, power: intent.powerHeld };
}

/** The meter's gains from Harrison's part in this tick's contacts. */
function creditMeter(power: PowerState, home: ContactEvents, w: World): void {
  if (home.touched) addMeter(power, 'touch');
  if (home.tackledBall) addMeter(power, 'tackle');
  if (home.kicked && onTarget(w.ball, maxGoal(w))) addMeter(power, 'onTarget');
}

/** Which of Harrison's kicks is still in play: Max playing the ball, or a dribble touch of his own, ends it. */
function noteLastKind(power: PowerState, [home, away]: ContactEvents[]): void {
  if (away && (away.touched || away.kicked || away.tackledBall)) power.lastKind = null;
  else if (home?.kicked) power.lastKind = home.kicked;
  else if (home?.touched) power.lastKind = null;
}

/**
 * Whether a power-up that didn't fire this tick is over: play stopped, he
 * was knocked down, Max played the ball, or he made any other move.
 */
function powerEnds(w: World, live: boolean, [, away]: ContactEvents[]): boolean {
  const home = w.home;
  const otherMove = (home.kick !== null && home.kick.kind !== 'wave') || home.state === 'charging' || home.state === 'chipping';
  const maxPlayed = away !== undefined && (away.touched || away.kicked !== null || away.tackledBall);
  return !live || home.state === 'fallen' || maxPlayed || otherMove;
}

/**
 * One fixed tick: players, then their bodies kept apart and out of the
 * goals, then the wave, the ball, contacts and the match rules. Intents
 * only count while the ball is in play.
 *
 * Harrison's power-up: a Y press with the ball powers him up at once, for
 * POWERED_S, while he keeps playing. While it lasts, X with the ball
 * strikes the Energy Wave. It ends unfired when the time runs out, play
 * stops, Max plays the ball or knocks him down, or he makes another move;
 * that keeps the meter, and only a fired wave spends it. While the wave is
 * live nobody else touches the ball: only Max standing in its path can
 * stop it.
 */
export function stepWorld(w: World, homeIntent: PlayerIntent, awayIntent: PlayerIntent, dt: number): void {
  const live = w.match.phase === 'playing';
  const power = quietPower();
  const home = w.home;
  const wasActive = (w.power?.activeS ?? 0) > 0;
  if (w.power) tickPower(w.power, dt);
  const waveDir = live && canFireWave(w) ? maxGoalDir(w) : null;
  stepOne(home, homeIntent, live, w, dt, waveDir);
  stepOne(w.away, awayIntent, live, w, dt);
  if (w.power && home.powerArmed && canStartPower(w)) {
    home.powerArmed = false;
    w.power.activeS = POWERED_S;
    power.started = true;
  }
  if (w.power && home.state === 'unleashing' && home.kick?.kind === 'wave' && home.kick.active) {
    home.kick.active = false;
    // He strikes it from his boot, wherever it was running ahead of him.
    trapAtFeet(home, w.ball);
    w.wave = fireWave(w);
    w.power.activeS = 0;
    power.fired = true;
  }
  resolveBodies(home, w.away, w.field);

  const { braced, blown } = stepWave(w, dt);
  [power.braced, power.blown] = [braced, blown];
  const ball = stepBall(w.ball, dt, w.field);
  // The second player to act on the ball has the last word, so take turns going first.
  const contact = (p: Player, other: Player) =>
    w.wave?.live ? quietContact() : resolveContacts(p, other, w.ball, w.aimErrorDeg[p.team], w.rng, w.field);
  const homeFirst = w.tick % 2 === 0;
  const first = homeFirst ? contact(home, w.away) : contact(w.away, home);
  const second = homeFirst ? contact(w.away, home) : contact(home, w.away);
  const kicks = homeFirst ? [first, second] : [second, first];
  w.tick++;
  if (w.power && !power.fired && (wasActive || power.started)) {
    if (w.power.activeS > 0 && powerEnds(w, live, kicks)) w.power.activeS = 0;
    if (w.power.activeS === 0) power.cancelled = true;
  }
  if (w.power) {
    creditMeter(w.power, kicks[0]!, w);
    noteLastKind(w.power, kicks);
  }

  const before = { ...w.match.score };
  const { resetForKickoff } = stepMatch(w.match, dt, goalScored(w.field, w.ball));
  const goal: Team | null = w.match.score.home > before.home ? 'home' : w.match.score.away > before.away ? 'away' : null;
  if (w.power && goal) {
    if (goal === 'home' && STYLE_KINDS.has(w.power.lastKind)) addMeter(w.power, 'styleGoal');
    w.power.lastKind = null;
  }
  w.events = { kicks, ball, goal, power };
  if (resetForKickoff) {
    placeForKickoff(w);
    w.wave = null;
  }
}
