import { CLIPS, SHOOT_CHARGE_FRAME, SHOOT_STRIKE_FRAME, SLIDE_HOLD_FRAME, type AnimName } from '../art/body/animations';
import { GRAVITY } from './constants';
import { BACKYARD, playerSpan, type Field } from './field';
import { TAP_CHARGE, type Aim } from './kick';
import { SPRINT_MULTIPLIER, chargeTime, jumpVelocity, runSpeed, type Stats } from './stats';

/**
 * jump is a one-tick pulse (pressed this tick); shootHeld/chipHeld are held
 * states whose release fires the kick. moveZ +1 is away from the camera.
 */
export interface PlayerIntent {
  moveX: number;
  moveZ: number;
  aim: Aim;
  jump: boolean;
  shootHeld: boolean;
  chipHeld: boolean;
  sprint: boolean;
}

export const NO_INTENT: Readonly<PlayerIntent> = Object.freeze({
  moveX: 0,
  moveZ: 0,
  aim: 'straight',
  jump: false,
  shootHeld: false,
  chipHeld: false,
  sprint: false,
});

export type PlayerState = 'ground' | 'air' | 'charging' | 'kicking' | 'chipping' | 'sliding' | 'fallen';

export interface Kick {
  kind: 'shot' | 'chip' | 'volley' | 'header' | 'slide';
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
  held: { shoot: boolean; chip: boolean };
  slideCooldown: number;
  /** Time until he can take another dribble touch. */
  touchCooldown: number;
  /** Seconds on the current looping animation. */
  animT: number;
}

export const PLAYER_W = 8,
  PLAYER_H = 40;
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
    held: { shoot: false, chip: false },
    slideCooldown: 0,
    touchCooldown: 0,
    animT: 0,
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
  return p.state === 'charging' || (p.state === 'chipping' && !p.kick) || p.state === 'air';
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

/** Drops a shot or chip that is still charging, without kicking (used when the game pauses). */
export function cancelCharge(p: Player): void {
  const charging = p.state === 'charging' || (p.state === 'chipping' && !p.kick);
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

export function stepPlayer(p: Player, intent: PlayerIntent, dt: number, field: Field, ballAtFeet: boolean): void {
  const shootPressed = intent.shootHeld && !p.held.shoot;
  const chipPressed = intent.chipHeld && !p.held.chip;
  p.held = { shoot: intent.shootHeld, chip: intent.chipHeld };
  p.aim = intent.aim;
  p.stateT += dt;
  p.slideCooldown = Math.max(0, p.slideCooldown - dt);
  p.touchCooldown = Math.max(0, p.touchCooldown - dt);

  if (p.state === 'ground') {
    if (intent.jump) {
      enter(p, 'air');
      p.vy = jumpVelocity(p.stats);
    } else if (shootPressed) {
      enter(p, 'charging');
    } else if (chipPressed && ballAtFeet) {
      enter(p, 'chipping');
    } else if (chipPressed && p.slideCooldown === 0) {
      startSlide(p);
    }
  }

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
    case 'air':
      if (shootPressed && !p.kick) {
        p.kick = { kind: 'volley', charge: 0, overchargeS: 0, aim: intent.aim, active: true };
        p.stateT = 0;
      }
      if (p.kick?.kind === 'volley') p.kick.active = p.stateT <= VOLLEY_ACTIVE_S;
      p.vx = approach(p.vx, target, dt, AIR_ACCEL, AIR_ACCEL);
      fall(p, dt);
      if (p.y <= 0 && p.vy <= 0) {
        p.y = 0;
        p.vy = 0;
        p.kick = null;
        enter(p, 'ground');
      }
      break;
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
  }

  const [minX, maxX] = playerSpan(field);
  p.x = Math.min(Math.max(p.x + p.vx * dt, minX + PLAYER_R), maxX - PLAYER_R);
  p.z = Math.min(Math.max(p.z + p.vz * dt, PLAYER_R), field.depth - PLAYER_R);
  updateStamina(p, sprinting, dt);

  const anim = chooseAnim(p, sprinting);
  p.animT = anim.name === p.anim.name ? p.animT + dt : 0;
  p.anim = anim;
}
