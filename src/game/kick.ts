import type { Rng } from '../engine/random';
import { maxShotSpeed, type Stats } from './stats';

export type Aim = 'up' | 'level' | 'down';

/** Releasing a charge inside this band is a PERFECT shot. */
export const SWEET_SPOT: readonly [number, number] = [0.82, 0.94];
export const TAP_CHARGE = 0.35,
  PERFECT_BONUS = 1.15,
  OVERCHARGE_MAX_ERROR_DEG = 12;
/** Harrison's aim error on non-perfect shots. */
export const HUMAN_AIM_ERROR_DEG = 4;

const MIN_SHOT_SPEED = 180;
const DRIVE_TOPSPIN = 0.6;
const SHOT_ANGLE: Record<Aim, number> = { up: 28, level: 12, down: 3 };
/** Seconds past full charge for the overcharge error to reach its maximum. */
const OVERCHARGE_FULL_S = 1;

const CHIP_ANGLE = 55;
const CHIP_BACKSPIN = -0.8;
const CHIP_MIN_SPEED = 160;
/** A full chip is this fraction of a full shot. */
const CHIP_POWER = 0.9;

const VOLLEY_CHARGE = 0.75;
const VOLLEY_ANGLE: Record<Aim, number> = { up: 20, level: 5, down: -10 };

const HEADER_MIN_SPEED = 200;
const HEADER_RETURN = 0.6;
const HEADER_ANGLE: Record<Aim, number> = { up: 35, level: 10, down: -20 };

export interface KickResult {
  vx: number;
  vy: number;
  spin: number;
  perfect: boolean;
}

const RAD = Math.PI / 180;
const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function kick(speed: number, angleDeg: number, facing: 1 | -1, spin: number, perfect = false): KickResult {
  return { vx: facing * speed * Math.cos(angleDeg * RAD), vy: speed * Math.sin(angleDeg * RAD), spin, perfect };
}

const driveSpin = (aim: Aim) => (aim === 'up' ? 0 : DRIVE_TOPSPIN);
const chargedSpeed = (stats: Stats, charge: number) => lerp(MIN_SHOT_SPEED, maxShotSpeed(stats), clamp01(charge));

/**
 * A ground shot. Inside the sweet spot it is faster and exact; otherwise the
 * angle wobbles by up to `aimErrorDeg`, plus more the longer it was overcharged.
 */
export function shot(stats: Stats, charge: number, overchargeS: number, aim: Aim, facing: 1 | -1, aimErrorDeg: number, rng: Rng): KickResult {
  const perfect = overchargeS === 0 && charge >= SWEET_SPOT[0] && charge <= SWEET_SPOT[1];
  if (perfect) return kick(chargedSpeed(stats, charge) * PERFECT_BONUS, SHOT_ANGLE[aim], facing, driveSpin(aim), true);
  const error = aimErrorDeg + OVERCHARGE_MAX_ERROR_DEG * clamp01(overchargeS / OVERCHARGE_FULL_S);
  return kick(chargedSpeed(stats, charge), SHOT_ANGLE[aim] + (rng() * 2 - 1) * error, facing, driveSpin(aim));
}

/** A lofted chip with backspin; the charge sets the distance. */
export function chip(stats: Stats, charge: number, facing: 1 | -1): KickResult {
  return kick(lerp(CHIP_MIN_SPEED, CHIP_POWER * maxShotSpeed(stats), clamp01(charge)), CHIP_ANGLE, facing, CHIP_BACKSPIN);
}

export function volley(stats: Stats, aim: Aim, facing: 1 | -1): KickResult {
  return kick(chargedSpeed(stats, VOLLEY_CHARGE), VOLLEY_ANGLE[aim], facing, driveSpin(aim));
}

export function header(_stats: Stats, aim: Aim, facing: 1 | -1, incomingSpeed: number): KickResult {
  return kick(Math.max(HEADER_RETURN * incomingSpeed, HEADER_MIN_SPEED), HEADER_ANGLE[aim], facing, 0);
}
