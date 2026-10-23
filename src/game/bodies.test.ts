import { describe, expect, it } from 'vitest';
import { seeded } from '../engine/random';
import { keepOutOfGoals, resolveBodies, separatePlayers } from './bodies';
import { BACKYARD, inGoalBox } from './field';
import { NO_INTENT, PLAYER_R, createPlayer, stepPlayer, type Player, type PlayerIntent } from './player';
import { BASE_STATS } from './stats';
import { createWorld, placeForKickoff } from './world';

const STEP = 1 / 60;
const ticks = (s: number) => Math.round(s / STEP);
const gap = (a: Player, b: Player) => Math.hypot(a.x - b.x, a.z - b.z);
const home = (x: number, z: number) => createPlayer('home', BASE_STATS, x, 1, z);
const away = (x: number, z: number) => createPlayer('away', BASE_STATS, x, -1, z);
const move = (moveX: number, moveZ: number): PlayerIntent => ({ ...NO_INTENT, moveX, moveZ });

/** Steps both players, then keeps them apart and out of the goals, as the world does each tick. */
function tick(a: Player, b: Player, ia: PlayerIntent, ib: PlayerIntent): void {
  stepPlayer(a, ia, STEP, BACKYARD, false);
  stepPlayer(b, ib, STEP, BACKYARD, false);
  resolveBodies(a, b, BACKYARD);
}

/** An intent that heads for (x, z) at full speed. */
function toward(p: Player, x: number, z: number): PlayerIntent {
  const [dx, dz] = [x - p.x, z - p.z];
  const d = Math.hypot(dx, dz) || 1;
  return move(dx / d, dz / d);
}

describe('separatePlayers', () => {
  it('pushes overlapping players apart along their centre line', () => {
    const a = home(300, 32);
    const b = away(306, 32);
    separatePlayers(a, b);
    expect(gap(a, b)).toBeCloseTo(2 * PLAYER_R);
    expect(a.z).toBe(32);
    expect(a.x).toBeLessThan(300);
    expect(b.x).toBeGreaterThan(306);
  });

  it('leaves players alone when they are apart', () => {
    const a = home(300, 32);
    const b = away(311, 32);
    separatePlayers(a, b);
    expect([a.x, b.x]).toEqual([300, 311]);
  });

  it('lets a jumper clear a grounded player', () => {
    const a = home(300, 32);
    const b = away(304, 32);
    a.y = 21;
    separatePlayers(a, b);
    expect([a.x, b.x]).toEqual([300, 304]);
  });

  it('separates players standing on the same spot', () => {
    const a = home(300, 32);
    const b = away(300, 32);
    separatePlayers(a, b);
    expect(gap(a, b)).toBeCloseTo(2 * PLAYER_R);
  });

  it('stops the runner\u2019s speed into the other player, keeping his speed along him', () => {
    const a = home(300, 32);
    const b = away(306, 32);
    [a.vx, a.vz] = [95, 20];
    separatePlayers(a, b);
    expect([a.vx, a.vz]).toEqual([0, 20]);
    expect([b.vx, b.vz]).toEqual([0, 0]);
  });

  it('a runner cannot push straight through a still player', () => {
    const a = home(300, 32);
    const b = away(320, 32);
    for (let i = 0; i < ticks(1); i++) tick(a, b, move(1, 0), NO_INTENT);
    expect(a.x).toBeLessThan(b.x - 2 * PLAYER_R + 0.5);
    expect(Math.abs(b.x - 320)).toBeLessThan(3);
  });

  it('a runner slightly off-line slides round', () => {
    const a = home(300, 32);
    const b = away(320, 35);
    for (let i = 0; i < ticks(1); i++) tick(a, b, move(1, 0), NO_INTENT);
    expect(a.x).toBeGreaterThan(b.x);
  });

  it('two runners meeting at an angle slide off each other', () => {
    const a = home(300, 30);
    const b = away(340, 34);
    for (let i = 0; i < ticks(1); i++) tick(a, b, move(1, 0), move(-1, 0));
    expect(a.x).toBeGreaterThan(b.x);
  });
});

describe('keepOutOfGoals', () => {
  it('players are pushed out of the goal box', () => {
    for (const g of BACKYARD.goals) {
      for (const [x, z] of [
        [(g.lineX + g.backX) / 2, 32],
        [g.lineX, g.z0],
        [g.backX, g.z1],
        [g.lineX + (g.side === 'right' ? 1 : -1) * 15, 20],
      ] as const) {
        const p = home(x, z);
        keepOutOfGoals(p, BACKYARD);
        expect(inGoalBox(g, p.x, p.z, PLAYER_R - 0.01), `${g.side} from (${x}, ${z})`).toBe(false);
      }
    }
  });

  it('pushes out the shortest way that fits', () => {
    const p = home(608, 32);
    keepOutOfGoals(p, BACKYARD);
    expect([p.x, p.z]).toEqual([612 - PLAYER_R, 32]);
    const q = home(625, 15);
    keepOutOfGoals(q, BACKYARD);
    expect([q.x, q.z]).toEqual([625, 18 - PLAYER_R]);
  });

  it('never squeezes a player into the gap behind the net', () => {
    const p = home(630, 32);
    keepOutOfGoals(p, BACKYARD);
    expect(inGoalBox(BACKYARD.goals[1], p.x, p.z, PLAYER_R - 0.01)).toBe(false);
    expect(p.x).toBeLessThanOrEqual(BACKYARD.fenceR - PLAYER_R);
  });

  it('a player walking into the goal stays outside it', () => {
    const p = home(560, 32);
    for (let i = 0; i < ticks(2); i++) {
      stepPlayer(p, move(1, 0), STEP, BACKYARD, false);
      keepOutOfGoals(p, BACKYARD);
    }
    expect(p.x).toBeCloseTo(612 - PLAYER_R);
  });

  it('a player can walk round the goal behind the line', () => {
    const p = home(600, 8);
    for (let i = 0; i < ticks(1); i++) {
      stepPlayer(p, move(1, 0), STEP, BACKYARD, false);
      keepOutOfGoals(p, BACKYARD);
    }
    expect(p.x).toBeGreaterThan(625);
  });
});

describe('resolveBodies', () => {
  it('players never end a tick overlapping, whatever they do', () => {
    const rng = seeded(11);
    const intent = (): PlayerIntent => ({ ...move(Math.round(rng() * 2 - 1), Math.round(rng() * 2 - 1)), sprint: rng() < 0.3 });
    for (let trial = 0; trial < 20; trial++) {
      const x = 10 + rng() * 620;
      const z = 5 + rng() * 54;
      const a = home(x, z);
      const b = trial % 4 === 0 ? away(x, z) : away(10 + rng() * 620, 5 + rng() * 54);
      let [ia, ib] = [intent(), intent()];
      for (let i = 0; i < 100; i++) {
        if (i % 10 === 0) [ia, ib] = [intent(), intent()];
        tick(a, b, ia, ib);
        expect(gap(a, b), `trial ${trial} tick ${i}`).toBeGreaterThanOrEqual(2 * PLAYER_R - 0.01);
        for (const g of BACKYARD.goals) {
          expect(inGoalBox(g, a.x, a.z, PLAYER_R - 0.01)).toBe(false);
          expect(inGoalBox(g, b.x, b.z, PLAYER_R - 0.01)).toBe(false);
        }
      }
    }
  });

  it('nobody wedges against a fence, the boards or a goal', () => {
    const rng = seeded(5);
    const targets = [
      [BACKYARD.fenceL, 0],
      [BACKYARD.fenceR, 0],
      [BACKYARD.fenceL, BACKYARD.depth],
      [BACKYARD.fenceR, BACKYARD.depth],
      ...BACKYARD.goals.flatMap(g => [
        [(g.lineX + g.backX) / 2, (g.z0 + g.z1) / 2],
        [g.lineX, g.z0 - 4],
        [g.lineX, g.z1 + 4],
      ]),
    ] as const;
    for (const [tx, tz] of targets) {
      for (let trial = 0; trial < 4; trial++) {
        const start = () => [Math.min(Math.max(tx + (rng() * 2 - 1) * 60, 20), 620), 8 + rng() * 48] as const;
        const a = home(...start());
        const b = away(...start());
        for (let i = 0; i < ticks(3); i++) tick(a, b, { ...toward(a, tx, tz), sprint: true }, { ...toward(b, tx, tz), sprint: true });
        const [ax, az, bx, bz] = [a.x, a.z, b.x, b.z];
        for (let i = 0; i < ticks(1); i++) tick(a, b, toward(a, 320, 32), toward(b, 320, 32));
        expect(Math.hypot(a.x - ax, a.z - az), `home from (${tx}, ${tz})`).toBeGreaterThanOrEqual(20);
        expect(Math.hypot(b.x - bx, b.z - bz), `away from (${tx}, ${tz})`).toBeGreaterThanOrEqual(20);
      }
    }
  });

  it('two players pinned in the pocket beside a goal still end up apart', () => {
    const a = home(BACKYARD.fenceR - PLAYER_R, PLAYER_R);
    const b = away(BACKYARD.fenceR - PLAYER_R, 18 - PLAYER_R);
    resolveBodies(a, b, BACKYARD);
    expect(gap(a, b)).toBeGreaterThanOrEqual(2 * PLAYER_R - 0.01);
    expect(inGoalBox(BACKYARD.goals[1], b.x, b.z, PLAYER_R - 0.01)).toBe(false);
    expect(a.z).toBeGreaterThanOrEqual(PLAYER_R);
  });
});

describe('kickoff', () => {
  it('kickoff placement never overlaps', () => {
    const w = createWorld(BASE_STATS, BASE_STATS, 1, { home: 0, away: 0 });
    for (const team of ['home', 'away'] as const) {
      w.match.kickoffTeam = team;
      placeForKickoff(w);
      expect(gap(w.home, w.away)).toBeGreaterThanOrEqual(2 * PLAYER_R);
    }
  });
});
