import type { Rng } from '../engine/random';
import type { Field } from './field';
import { maxShotSpeed, type Stats } from './stats';

/** Up/down while striking: the far post (away from the camera), the near post, or straight along his line. */
export type Aim = 'far' | 'straight' | 'near';

/** The horizontal direction of a kick: dz per |dx| along his facing. */
export interface AimLine {
  facing: 1 | -1;
  slope: number;
}

/** Releasing a charge inside this band is a PERFECT shot. */
export const SWEET_SPOT: readonly [number, number] = [0.82, 0.94];
export const TAP_CHARGE = 0.35,
  PERFECT_BONUS = 1.15,
  OVERCHARGE_MAX_ERROR_DEG = 12;
/** Harrison's aim error on non-perfect shots. */
export const HUMAN_AIM_ERROR_DEG = 4;
/** Shot elevation from a soft tap to a full charge: always low enough for a hard, low drive. */
export const SHOT_ELEVATION_DEG: readonly [number, number] = [4, 16];
export const OVERCHARGE_LIFT_DEG = 18,
  VOLLEY_ELEVATION_DEG = 8,
  HEADER_ELEVATION_DEG = 14,
  CHIP_ELEVATION_DEG = 55;
/** The steepest a kick may be aimed across the pitch, and how far inside a post a post aim lands. */
export const MAX_AIM_SLOPE = 0.7,
  POST_INSET = 4;

const MIN_SHOT_SPEED = 180;
const DRIVE_TOPSPIN = 0.6;
/** Seconds past full charge for the overcharge error and lift to reach their maximum. */
const OVERCHARGE_FULL_S = 1;

const CHIP_BACKSPIN = -0.8;
const CHIP_MIN_SPEED = 160;
/** A full chip is this fraction of a full shot. */
const CHIP_POWER = 0.9;

const VOLLEY_CHARGE = 0.75;

const HEADER_MIN_SPEED = 200;
const HEADER_RETURN = 0.6;
/** Never divide by less than this distance to the goal line. */
const MIN_AIM_DX = 1;

export interface KickResult {
  vx: number;
  vy: number;
  vz: number;
  spin: number;
  perfect: boolean;
}

const RAD = Math.PI / 180;
const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Where a kick goes along the pitch: at a post of the goal he faces, or straight. */
export function aimLine(ball: { x: number; z: number }, facing: 1 | -1, aim: Aim, field: Field): AimLine {
  if (aim === 'straight') return { facing, slope: 0 };
  const goal = field.goals.find(g => g.side === (facing === 1 ? 'right' : 'left'))!;
  const targetZ = aim === 'far' ? goal.z1 - POST_INSET : goal.z0 + POST_INSET;
  const slope = (targetZ - ball.z) / Math.max(Math.abs(goal.lineX - ball.x), MIN_AIM_DX);
  return { facing, slope: Math.min(Math.max(slope, -MAX_AIM_SLOPE), MAX_AIM_SLOPE) };
}

/** A kick at `speed`, `elevationDeg` above the ground, along `line` turned sideways by `yawErrorDeg`. */
function kick(speed: number, elevationDeg: number, line: AimLine, spin: number, yawErrorDeg = 0, perfect = false): KickResult {
  const yaw = Math.atan(line.slope) + yawErrorDeg * RAD;
  const ground = speed * Math.cos(elevationDeg * RAD);
  return { vx: line.facing * ground * Math.cos(yaw), vy: speed * Math.sin(elevationDeg * RAD), vz: ground * Math.sin(yaw), spin, perfect };
}

const chargedSpeed = (stats: Stats, charge: number) => lerp(MIN_SHOT_SPEED, maxShotSpeed(stats), clamp01(charge));

/**
 * A driven shot. The charge sets its pace and lifts it a little; only
 * overcharging lifts it enough to clear the bar. Inside the sweet spot it is
 * faster and exact; otherwise it veers sideways by up to `aimErrorDeg`, plus
 * more the longer it was overcharged.
 */
export function shot(stats: Stats, charge: number, overchargeS: number, line: AimLine, aimErrorDeg: number, rng: Rng): KickResult {
  const over = clamp01(overchargeS / OVERCHARGE_FULL_S);
  const elevation = lerp(SHOT_ELEVATION_DEG[0], SHOT_ELEVATION_DEG[1], clamp01(charge)) + OVERCHARGE_LIFT_DEG * over;
  const perfect = overchargeS === 0 && charge >= SWEET_SPOT[0] && charge <= SWEET_SPOT[1];
  if (perfect) return kick(chargedSpeed(stats, charge) * PERFECT_BONUS, elevation, line, DRIVE_TOPSPIN, 0, true);
  const error = aimErrorDeg + OVERCHARGE_MAX_ERROR_DEG * over;
  return kick(chargedSpeed(stats, charge), elevation, line, DRIVE_TOPSPIN, (rng() * 2 - 1) * error);
}

/** A lofted chip with backspin; the charge sets the distance. */
export function chip(stats: Stats, charge: number, line: AimLine): KickResult {
  return kick(lerp(CHIP_MIN_SPEED, CHIP_POWER * maxShotSpeed(stats), clamp01(charge)), CHIP_ELEVATION_DEG, line, CHIP_BACKSPIN);
}

export function volley(stats: Stats, line: AimLine): KickResult {
  return kick(chargedSpeed(stats, VOLLEY_CHARGE), VOLLEY_ELEVATION_DEG, line, DRIVE_TOPSPIN);
}

export function header(_stats: Stats, line: AimLine, incomingSpeed: number): KickResult {
  return kick(Math.max(HEADER_RETURN * incomingSpeed, HEADER_MIN_SPEED), HEADER_ELEVATION_DEG, line, 0);
}
