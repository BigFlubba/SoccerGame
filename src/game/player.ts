import { CLIPS, SHOOT_CHARGE_FRAME, SHOOT_STRIKE_FRAME, SLIDE_HOLD_FRAME, type AnimName } from '../art/body/animations';
import { GRAVITY } from './constants';
import { BACKYARD, playerSpan, type Field } from './field';
import { TAP_CHARGE, type Aim } from './kick';
import { SPRINT_MULTIPLIER, chargeTime, jumpVelocity, runSpeed, type Stats } from './stats';

/**
 * jump is a one-tick pulse (pressed this tick); shootHeld/chipHeld/powerHeld
 * are held states whose release fires the kick. moveZ +1 is away from the
 * camera.
 */
export interface PlayerIntent {
  moveX: number;
  moveZ: number;
  aim: Aim;
  jump: boolean;
  shootHeld: boolean;
  chipHeld: boolean;
  powerHeld: boolean;
  sprint: boolean;
}

export const NO_INTENT: Readonly<PlayerIntent> = Object.freeze({
  moveX: 0,
  moveZ: 0,
  aim: 'straight',
  jump: false,
  shootHeld: false,
  chipHeld: false,
  powerHeld: false,
  sprint: false,
});

export type PlayerState =
  | 'ground'
  | 'air'
  | 'charging'
  | 'kicking'
  | 'chipping'
  | 'sliding'
  | 'fallen'
  | 'poweringUp'
  | 'unleashing'
  | 'bracing'
  | 'blown';

export interface Kick {
  kind: 'shot' | 'chip' | 'volley' | 'header' | 'slide' | 'wave';
  charge: number;
  overchargeS: number;
  aim: Aim;
  /** Whether it can still connect with the ball this swing. */
  active: boolean;
}

export interface Player {
  team: 'home' | 'away';
  stats: Stats;
  /** Feet position: x along the pitch, z in depth, y the height of the soles. */
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  facing: 1 | -1;
  state: PlayerState;
  /** Seconds in the current state (in the air: since the volley started). */
  stateT: number;
  charge: number;
  overchargeS: number;
  /** 0..1. */
  stamina: number;
  exhausted: boolean;
  kick: Kick | null;
  anim: { name: AnimName; frame: number };
  /** The stick's current aim, used for headers. */
  aim: Aim;
  /** Last tick's held buttons, so a press is only seen on its first tick. */
  held: { shoot: boolean; chip: boolean; power: boolean };
  slideCooldown: number;
  /** Time until he can take another dribble touch. */
  touchCooldown: number;
  /** Seconds on the current looping animation. */
  animT: number;
  /** Horizontal speed (px/s) at the last take-off: steering in the air never goes faster than this or a run. */
  takeoffSpeed: number;
}

export const PLAYER_H = 40;
/** Body radius on the ground plane. */
export const PLAYER_R = 5;
export const FALL_TIME = 0.9;
/** Where a new player stands in depth: the centre line of the pitch. */
const START_Z = BACKYARD.depth / 2;

export const ACCEL = 900;
const DECEL = 1200;
const AIR_ACCEL = 400;
const CHARGE_MOVE_FACTOR = 0.5;
/** A release below this charge is a tap and uses TAP_CHARGE. */
const TAP_THRESHOLD = 0.1;
/** The strike can connect this long either side of the middle of the strike frame. */
const STRIKE_WINDOW_S = 0.05;
const CHIP_STRIKE_FRAME = 1;
const VOLLEY_ACTIVE_S = 0.15;
const SLIDE_SPEED = 190;
const SLIDE_TIME = 0.45;
const SLIDE_COOLDOWN = 0.8;
const STAMINA_DRAIN = 0.5;
const STAMINA_REGEN = 0.3;
const EXHAUSTION_RECOVERY = 0.25;
/** Below this speed he stands still. */
const IDLE_SPEED = 5;
/** Jump clip frames: rising, then tucked once past the top. */
const JUMP_RISE_FRAME = 1;
const JUMP_FALL_FRAME = 2;

/** Seconds of powering up before the Energy Wave is ready. */
export const POWER_UP_S = 1;
/** A braced player is shoved back at this speed, easing to a stop over BRACE_S. */
export const BRACE_SKID_SPEED = 100;
export const BRACE_S = 0.5;
/** Blown away: launched back along the beam and up, then down for longer than a fall. */
export const BLOWN_SPEED = 260;
export const BLOWN_VY = 220;
export const BLOWN_DOWN_S = 1.5;
/** Fall frames for being blown away: flat out in the air, then pushing up, kneeling and standing once landed. */
const BLOWN_AIR_FRAME = 1;
const BLOWN_GET_UP_FRAME = 2;
/** How long a launch from the ground stays in the air. */
const BLOWN_FLIGHT_S = (2 * BLOWN_VY) / GRAVITY;

export function createPlayer(team: 'home' | 'away', stats: Stats, x: number, facing: 1 | -1, z = START_Z): Player {
  return {
    team,
    stats,
    x,
    y: 0,
    z,
    vx: 0,
    vy: 0,
    vz: 0,
    facing,
    state: 'ground',
    stateT: 0,
    charge: 0,
    overchargeS: 0,
    stamina: 1,
    exhausted: false,
    kick: null,
    anim: { name: 'idle', frame: 0 },
    aim: 'straight',
    held: { shoot: false, chip: false, power: false },
    slideCooldown: 0,
    touchCooldown: 0,
    animT: 0,
    takeoffSpeed: 0,
  };
}

/** Moves v toward target at `accel` when speeding up, `decel` when slowing or turning. */
function approach(v: number, target: number, dt: number, accel: number, decel: number): number {
  const speedingUp = Math.abs(target) > Math.abs(v) && Math.sign(target) !== -Math.sign(v);
  const step = (speedingUp ? accel : decel) * dt;
  return Math.abs(target - v) <= step ? target : v + Math.sign(target - v) * step;
}

/** Moves the velocity vector (vx, vz) toward (tx, tz): `accel` when speeding up along it, `decel` when slowing or turning. */
function approach2(p: Player, tx: number, tz: number, dt: number, accel: number, decel: number): void {
  const [dx, dz] = [tx - p.vx, tz - p.vz];
  const gap = Math.hypot(dx, dz);
  const speedingUp = Math.hypot(tx, tz) > Math.hypot(p.vx, p.vz) && tx * p.vx + tz * p.vz >= 0;
  const step = (speedingUp ? accel : decel) * dt;
  if (gap <= step) [p.vx, p.vz] = [tx, tz];
  else [p.vx, p.vz] = [p.vx + (dx / gap) * step, p.vz + (dz / gap) * step];
}

/** Striking the ball: charging a shot or chip, or in the air. Up/down aims instead of moving him. */
export function isStriking(p: Player): boolean {
  return p.state === 'charging' || (p.state === 'chipping' && !p.kick) || p.state === 'air' || p.state === 'poweringUp';
}

/** How long a kick's strike clip runs after release, and how long it can connect. */
function strikeTiming(clip: 'shoot' | 'chip', strikeFrame: number) {
  const { fps, frameCount } = CLIPS[clip];
  return { activeS: 0.5 / fps + STRIKE_WINDOW_S, doneS: (frameCount - strikeFrame) / fps };
}
const SHOT_TIMING = strikeTiming('shoot', SHOOT_STRIKE_FRAME);
const CHIP_TIMING = strikeTiming('chip', CHIP_STRIKE_FRAME);

function enter(p: Player, state: PlayerState): void {
  p.state = state;
  p.stateT = 0;
}

function release(p: Player, kind: 'shot' | 'chip', aim: Aim): void {
  p.kick = { kind, charge: p.charge < TAP_THRESHOLD ? TAP_CHARGE : p.charge, overchargeS: p.overchargeS, aim, active: true };
  p.charge = 0;
  p.overchargeS = 0;
  enter(p, kind === 'shot' ? 'kicking' : 'chipping');
}

function addCharge(p: Player, dt: number, allowOvercharge: boolean): void {
  p.charge += dt / chargeTime(p.stats);
  if (p.charge < 1) return;
  if (allowOvercharge) p.overchargeS += (p.charge - 1) * chargeTime(p.stats);
  p.charge = 1;
}

/** Strike follow-through: the kick connects early in the swing, then he recovers. */
function strike(p: Player, timing: { activeS: number; doneS: number }): void {
  if (p.kick) p.kick.active = p.stateT <= timing.activeS;
  if (p.stateT >= timing.doneS) {
    p.kick = null;
    enter(p, 'ground');
  }
}

function startSlide(p: Player): void {
  enter(p, 'sliding');
  p.slideCooldown = SLIDE_COOLDOWN;
  p.kick = { kind: 'slide', charge: 0, overchargeS: 0, aim: 'straight', active: true };
}

/** Knocked over: no control for FALL_TIME, and any charge or kick is cancelled. */
export function knockDown(p: Player): void {
  enter(p, 'fallen');
  p.charge = 0;
  p.overchargeS = 0;
  p.kick = null;
  p.vx = 0;
  p.vz = 0;
}

/** Braced against a beam travelling along `beamDirX`: he faces it and is shoved back, skidding. */
export function brace(p: Player, beamDirX: 1 | -1): void {
  enter(p, 'bracing');
  p.facing = beamDirX === 1 ? -1 : 1;
  p.charge = 0;
  p.overchargeS = 0;
  p.kick = null;
  p.vx = beamDirX * BRACE_SKID_SPEED;
  p.vz = 0;
}

/** Knocked flying along (dirX, dirZ), a unit direction: no control until he's back up at BLOWN_DOWN_S. */
export function blowAway(p: Player, dirX: number, dirZ: number): void {
  enter(p, 'blown');
  p.charge = 0;
  p.overchargeS = 0;
  p.kick = null;
  p.vx = dirX * BLOWN_SPEED;
  p.vz = dirZ * BLOWN_SPEED;
  p.vy = BLOWN_VY;
}

/** Drops a shot, chip or power-up that is still charging, without kicking (used when the game pauses). */
export function cancelCharge(p: Player): void {
  const charging = p.state === 'charging' || (p.state === 'chipping' && !p.kick) || p.state === 'poweringUp';
  if (!charging) return;
  enter(p, 'ground');
  p.charge = 0;
  p.overchargeS = 0;
}

function updateStamina(p: Player, sprinting: boolean, dt: number): void {
  p.stamina = Math.min(1, Math.max(0, p.stamina + (sprinting ? -STAMINA_DRAIN : STAMINA_REGEN) * dt));
  if (p.stamina === 0) p.exhausted = true;
  else if (p.exhausted && p.stamina >= EXHAUSTION_RECOVERY) p.exhausted = false;
}

function chooseAnim(p: Player, sprinting: boolean): { name: AnimName; frame: number } {
  const t = p.stateT;
  const clipFrame = (name: AnimName, from: number, time: number) =>
    Math.min(CLIPS[name].frameCount - 1, from + Math.floor(time * CLIPS[name].fps));
  switch (p.state) {
    case 'air':
      if (p.kick?.kind === 'volley') return { name: 'volley', frame: clipFrame('volley', 0, t) };
      if (p.kick?.kind === 'header') return { name: 'header', frame: clipFrame('header', 0, t) };
      return { name: 'jump', frame: p.vy > 0 ? JUMP_RISE_FRAME : JUMP_FALL_FRAME };
    case 'charging':
      return { name: 'shoot', frame: SHOOT_CHARGE_FRAME };
    case 'kicking':
      return { name: 'shoot', frame: clipFrame('shoot', SHOOT_STRIKE_FRAME, t) };
    case 'chipping':
      return { name: 'chip', frame: p.kick ? clipFrame('chip', CHIP_STRIKE_FRAME, t) : 0 };
    case 'sliding': {
      const fps = CLIPS.slide.fps;
      if (t < SLIDE_HOLD_FRAME / fps) return { name: 'slide', frame: Math.floor(t * fps) };
      return { name: 'slide', frame: t < SLIDE_TIME - 1 / fps ? SLIDE_HOLD_FRAME : SLIDE_HOLD_FRAME + 1 };
    }
    case 'fallen':
      return { name: 'fall', frame: Math.min(CLIPS.fall.frameCount - 1, Math.floor((t / FALL_TIME) * CLIPS.fall.frameCount)) };
    case 'poweringUp': {
      const time = p.anim.name === 'powerUp' ? p.animT : 0;
      return { name: 'powerUp', frame: Math.floor(time * CLIPS.powerUp.fps) % CLIPS.powerUp.frameCount };
    }
    case 'unleashing':
      return { name: 'shoot', frame: clipFrame('shoot', SHOOT_STRIKE_FRAME, t) };
    case 'bracing':
      return { name: 'brace', frame: 0 };
    case 'blown': {
      if (p.y > 0 || p.vy > 0) return { name: 'fall', frame: BLOWN_AIR_FRAME };
      const getUpFrames = CLIPS.fall.frameCount - BLOWN_GET_UP_FRAME;
      const down = Math.max(0, (t - BLOWN_FLIGHT_S) / (BLOWN_DOWN_S - BLOWN_FLIGHT_S));
      return { name: 'fall', frame: Math.min(CLIPS.fall.frameCount - 1, BLOWN_GET_UP_FRAME + Math.floor(down * getUpFrames)) };
    }
    default: {
      const name: AnimName = Math.hypot(p.vx, p.vz) < IDLE_SPEED ? 'idle' : sprinting ? 'sprint' : 'run';
      const time = name === p.anim.name ? p.animT : 0;
      return { name, frame: Math.floor(time * CLIPS[name].fps) % CLIPS[name].frameCount };
    }
  }
}

/** Exact under constant gravity, so the jump apex matches the stat curve. */
function fall(p: Player, dt: number): void {
  p.y += p.vy * dt - 0.5 * GRAVITY * dt * dt;
  p.vy -= GRAVITY * dt;
}

/**
 * Against a fence he keeps his speed into it only while he pushes that way:
 * once the stick lets go of the fence, that stale speed is gone, so he turns
 * away at once.
 */
function dropWallSpeed(p: Player, intent: PlayerIntent, field: Field): void {
  const [minX, maxX] = playerSpan(field);
  if (p.x <= minX + PLAYER_R && p.vx < 0 && intent.moveX >= 0) p.vx = 0;
  if (p.x >= maxX - PLAYER_R && p.vx > 0 && intent.moveX <= 0) p.vx = 0;
  if (p.z <= PLAYER_R && p.vz < 0 && intent.moveZ >= 0) p.vz = 0;
  if (p.z >= field.depth - PLAYER_R && p.vz > 0 && intent.moveZ <= 0) p.vz = 0;
}

/** `powerOk`: the world's say-so that a power press may start a power-up now (a full meter, the ball, a clear line). */
export function stepPlayer(p: Player, intent: PlayerIntent, dt: number, field: Field, ballAtFeet: boolean, powerOk = false): void {
  const shootPressed = intent.shootHeld && !p.held.shoot;
  const chipPressed = intent.chipHeld && !p.held.chip;
  const powerPressed = intent.powerHeld && !p.held.power;
  p.held = { shoot: intent.shootHeld, chip: intent.chipHeld, power: intent.powerHeld };
  p.aim = intent.aim;
  p.stateT += dt;
  p.slideCooldown = Math.max(0, p.slideCooldown - dt);
  p.touchCooldown = Math.max(0, p.touchCooldown - dt);

  if (p.state === 'ground') {
    if (powerPressed && powerOk) {
      enter(p, 'poweringUp');
      p.charge = 0;
    } else if (intent.jump) {
      enter(p, 'air');
      p.vy = jumpVelocity(p.stats);
      p.takeoffSpeed = Math.hypot(p.vx, p.vz);
    } else if (shootPressed) {
      enter(p, 'charging');
    } else if (chipPressed && ballAtFeet) {
      enter(p, 'chipping');
    } else if (chipPressed && p.slideCooldown === 0) {
      startSlide(p);
    }
  }

  dropWallSpeed(p, intent, field);
  const moving = intent.moveX !== 0 || intent.moveZ !== 0;
  const sprinting = p.state === 'ground' && intent.sprint && !p.exhausted && moving;
  const target = intent.moveX * runSpeed(p.stats);
  // On the ground he runs the same speed in every direction, diagonals included.
  const moveLen = Math.max(1, Math.hypot(intent.moveX, intent.moveZ));
  const runTarget = (runSpeed(p.stats) * (sprinting ? SPRINT_MULTIPLIER : 1)) / moveLen;
  const canTurn = p.state === 'ground' || (p.state === 'air' && !p.kick);
  if (canTurn && intent.moveX !== 0) p.facing = intent.moveX > 0 ? 1 : -1;

  switch (p.state) {
    case 'ground':
      approach2(p, intent.moveX * runTarget, intent.moveZ * runTarget, dt, ACCEL, DECEL);
      break;
    case 'air': {
      if (shootPressed && !p.kick) {
        p.kick = { kind: 'volley', charge: 0, overchargeS: 0, aim: intent.aim, active: true };
        p.stateT = 0;
      }
      if (p.kick?.kind === 'volley') p.kick.active = p.stateT <= VOLLEY_ACTIVE_S;
      // Normalised like the ground target, and capped against the depth speed he took off with,
      // so steering never makes him faster than a run, or than he left the ground.
      const limit = Math.max(runSpeed(p.stats), p.takeoffSpeed);
      const cap = Math.sqrt(Math.max(limit ** 2 - p.vz ** 2, 0));
      p.vx = approach(p.vx, Math.min(Math.max(target / moveLen, -cap), cap), dt, AIR_ACCEL, AIR_ACCEL);
      fall(p, dt);
      if (p.y <= 0 && p.vy <= 0) {
        p.y = 0;
        p.vy = 0;
        p.kick = null;
        enter(p, 'ground');
      }
      break;
    }
    case 'charging':
      if (!intent.shootHeld) {
        release(p, 'shot', intent.aim);
      } else {
        addCharge(p, dt, true);
        approach2(p, target * CHARGE_MOVE_FACTOR, 0, dt, ACCEL, DECEL);
      }
      break;
    case 'kicking':
      approach2(p, 0, 0, dt, ACCEL, DECEL);
      strike(p, SHOT_TIMING);
      break;
    case 'chipping':
      if (!p.kick && !intent.chipHeld) {
        release(p, 'chip', intent.aim);
      } else if (!p.kick) {
        addCharge(p, dt, false);
        approach2(p, target * CHARGE_MOVE_FACTOR, 0, dt, ACCEL, DECEL);
      } else {
        approach2(p, 0, 0, dt, ACCEL, DECEL);
        strike(p, CHIP_TIMING);
      }
      break;
    case 'sliding':
      p.vx = p.facing * SLIDE_SPEED * Math.max(0, 1 - p.stateT / SLIDE_TIME);
      p.vz = approach(p.vz, 0, dt, DECEL, DECEL);
      if (p.stateT >= SLIDE_TIME) {
        p.kick = null;
        enter(p, 'ground');
      }
      break;
    case 'fallen':
      p.vx = 0;
      p.vz = 0;
      if (p.y > 0 || p.vy > 0) fall(p, dt);
      if (p.y <= 0) [p.y, p.vy] = [0, 0];
      if (p.stateT >= FALL_TIME) enter(p, 'ground');
      break;
    case 'poweringUp':
      if (!intent.powerHeld) {
        if (p.charge >= 1) {
          p.kick = { kind: 'wave', aim: intent.aim, active: true, charge: 1, overchargeS: 0 };
          enter(p, 'unleashing');
        } else {
          enter(p, 'ground');
        }
        p.charge = 0;
      } else {
        p.charge = Math.min(1, p.charge + dt / POWER_UP_S);
        approach2(p, 0, 0, dt, ACCEL, DECEL);
      }
      break;
    case 'unleashing':
      // The world fires the wave as he enters this state (and clears kick.active); he just follows through.
      approach2(p, 0, 0, dt, ACCEL, DECEL);
      if (p.stateT >= SHOT_TIMING.doneS) {
        p.kick = null;
        enter(p, 'ground');
      }
      break;
    case 'bracing':
      p.vx = -p.facing * BRACE_SKID_SPEED * Math.max(0, 1 - p.stateT / BRACE_S);
      p.vz = 0;
      if (p.stateT >= BRACE_S) enter(p, 'ground');
      break;
    case 'blown':
      if (p.y > 0 || p.vy > 0) fall(p, dt);
      if (p.y <= 0 && p.vy <= 0) [p.y, p.vy, p.vx, p.vz] = [0, 0, 0, 0];
      if (p.stateT >= BLOWN_DOWN_S) enter(p, 'ground');
      break;
  }

  const [minX, maxX] = playerSpan(field);
  p.x = Math.min(Math.max(p.x + p.vx * dt, minX + PLAYER_R), maxX - PLAYER_R);
  p.z = Math.min(Math.max(p.z + p.vz * dt, PLAYER_R), field.depth - PLAYER_R);
  updateStamina(p, sprinting, dt);

  const anim = chooseAnim(p, sprinting);
  p.animT = anim.name === p.anim.name ? p.animT + dt : 0;
  p.anim = anim;
}
