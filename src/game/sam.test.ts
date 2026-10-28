import { describe, expect, it } from 'vitest';
import { seeded } from '../engine/random';
import { BALL_REST_Y } from './ball';
import { shot, SWEET_SPOT } from './kick';
import { NO_INTENT, createPlayer, stepPlayer } from './player';
import { BACKYARD } from './field';
import { SAM_HANDLING, SAM_PROFILES, SAM_STATS } from './sam';
import { SPRINT_MULTIPLIER, runSpeed } from './stats';
import { createWorld, stepWorld } from './world';

const DIFFS = ['easy', 'normal', 'hard'] as const;
/** Biscuit's top speed, px/s. */
const BISCUIT = 183;
/** The tuning Harrison's sprint: Speed 7. */
const TUNING_SPRINT = runSpeed({ speed: 7, power: 5, jump: 4, control: 5, stamina: 1 }) * SPRINT_MULTIPLIER;
const flatOut = (d: (typeof DIFFS)[number]) => runSpeed(SAM_STATS) * SPRINT_MULTIPLIER * SAM_PROFILES[d].paceFactor;

describe('Speedy Sam', () => {
  it('is the fastest player in the game: faster flat out than Biscuit on every difficulty', () => {
    for (const d of DIFFS) expect(flatOut(d), d).toBeGreaterThan(BISCUIT);
  });

  it('on Normal he runs about 1.2 times the tuning Harrison sprint', () => {
    expect(Math.abs(flatOut('normal') / (1.2 * TUNING_SPRINT) - 1)).toBeLessThanOrEqual(0.05);
  });

  it('his shot is weak: even a perfect strike leaves under 300 px/s', () => {
    for (const charge of [1, SWEET_SPOT[1]]) {
      const k = shot(SAM_STATS, charge, 0, { facing: -1, slope: 0 }, 0, seeded(1));
      expect(Math.hypot(k.vx, k.vy, k.vz) * SAM_HANDLING.shotScale, `charge ${charge}`).toBeLessThan(300);
    }
  });

  it('flat out on Normal, his touch runs 30 to 45 px ahead of him, inside his reach for his own ball', () => {
    const w = createWorld({ speed: 7, power: 5, jump: 4, control: 5, stamina: 1 }, SAM_STATS, 1, { home: 0, away: 0 }, null, null, SAM_PROFILES.normal, SAM_HANDLING);
    w.match.phase = 'playing';
    Object.assign(w.home, { x: 600, z: 60 });
    Object.assign(w.away, { x: 500, z: 32, facing: -1, vx: -flatOut('normal') });
    Object.assign(w.ball, { x: 490, y: BALL_REST_Y, z: 32, vx: -flatOut('normal'), vy: 0, vz: 0 });
    let [furthest, touches] = [0, 0];
    for (let t = 0; t < 80; t++) {
      stepWorld(w, NO_INTENT, { ...NO_INTENT, moveX: -1, sprint: true, pace: SAM_PROFILES.normal.paceFactor }, 1 / 60);
      touches += w.events.kicks[1]!.touched ? 1 : 0;
      if (touches > 0) furthest = Math.max(furthest, w.away.x - w.ball.x);
    }
    expect(touches).toBeGreaterThanOrEqual(2);
    expect(furthest).toBeGreaterThanOrEqual(30);
    expect(furthest).toBeLessThanOrEqual(45);
    expect(furthest).toBeLessThan(SAM_HANDLING.ballAhead);
  });

  it('reversing from flat out on Normal, he shows the skid for 0.3 to 0.5 s', () => {
    const p = Object.assign(createPlayer('away', SAM_STATS, 300, -1), { handling: SAM_HANDLING, vx: -flatOut('normal') });
    let skidS = 0;
    for (let t = 0; t < 60; t++) {
      stepPlayer(p, { ...NO_INTENT, moveX: 1, sprint: true, pace: SAM_PROFILES.normal.paceFactor }, 1 / 60, BACKYARD, false);
      if (p.anim.name === 'skid') skidS += 1 / 60;
    }
    expect(skidS).toBeGreaterThanOrEqual(0.3);
    expect(skidS).toBeLessThanOrEqual(0.5);
  });

  it('from flat out his brakes take 0.3 to 0.5 s to stop him', () => {
    const v = flatOut('normal');
    expect(v / SAM_HANDLING.decel).toBeGreaterThanOrEqual(0.3);
    expect(v / SAM_HANDLING.decel).toBeLessThanOrEqual(0.5);
  });
});
