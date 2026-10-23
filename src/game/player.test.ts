import { describe, expect, it } from 'vitest';
import { BACKYARD } from './field';
import { TAP_CHARGE } from './kick';
import { FALL_TIME, NO_INTENT, createPlayer, knockDown, separatePlayers, stepPlayer, type Player, type PlayerIntent } from './player';
import { BASE_STATS, SPRINT_MULTIPLIER, chargeTime } from './stats';

const STEP = 1 / 60;
const ticks = (s: number) => Math.round(s / STEP);
const intent = (p: Partial<PlayerIntent>): PlayerIntent => ({ ...NO_INTENT, ...p });
const harrison = (x = 320) => createPlayer('home', BASE_STATS, x, 1);

function tick(p: Player, i: Partial<PlayerIntent>, n = 1, ballAtFeet = false): void {
  for (let k = 0; k < n; k++) stepPlayer(p, intent(i), STEP, BACKYARD, ballAtFeet);
}

describe('stepPlayer: moving', () => {
  it('accelerates to run speed and sprints faster', () => {
    const run = harrison();
    tick(run, { moveX: 1 }, ticks(1));
    expect(run.vx).toBeCloseTo(95);
    const sprint = harrison();
    tick(sprint, { moveX: 1, sprint: true }, ticks(1));
    expect(sprint.vx).toBeCloseTo(95 * SPRINT_MULTIPLIER);
  });

  it('stops when the stick is released', () => {
    const p = harrison();
    tick(p, { moveX: 1 }, ticks(1));
    tick(p, {}, ticks(0.5));
    expect(p.vx).toBe(0);
  });

  it('stays between the fences', () => {
    const p = harrison(20);
    tick(p, { moveX: -1 }, ticks(1));
    expect(p.x).toBeGreaterThanOrEqual(BACKYARD.fenceL + 4);
  });

  it('turns to face where he runs', () => {
    const p = harrison();
    tick(p, { moveX: -1 });
    expect(p.facing).toBe(-1);
  });

  it('picks idle, run and sprint animations', () => {
    const p = harrison();
    tick(p, {});
    expect(p.anim.name).toBe('idle');
    tick(p, { moveX: 1 }, 10);
    expect(p.anim.name).toBe('run');
    tick(p, { moveX: 1, sprint: true }, 10);
    expect(p.anim.name).toBe('sprint');
  });
});

describe('stepPlayer: jumping', () => {
  it('jumps to the stat apex and lands', () => {
    const p = harrison();
    tick(p, { jump: true });
    let peak = 0;
    for (let k = 0; k < ticks(1.5); k++) {
      tick(p, {});
      peak = Math.max(peak, p.y);
    }
    expect(peak).toBeGreaterThan(31);
    expect(peak).toBeLessThan(33);
    expect(p.state).toBe('ground');
    expect(p.y).toBe(0);
  });

  it('shows the jump clip in the air', () => {
    const p = harrison();
    tick(p, { jump: true });
    expect(p.state).toBe('air');
    expect(p.anim.name).toBe('jump');
  });

  it('pressing shoot in the air volleys, active briefly', () => {
    const p = harrison();
    tick(p, { jump: true });
    tick(p, {}, 5);
    tick(p, { shootHeld: true });
    expect(p.kick).toMatchObject({ kind: 'volley', active: true });
    expect(p.anim.name).toBe('volley');
    tick(p, { shootHeld: true }, ticks(0.2));
    expect(p.kick?.active).toBe(false);
  });

  it('holding shoot through a landing does not start a charge', () => {
    const p = harrison();
    tick(p, { jump: true });
    tick(p, { shootHeld: true }, ticks(1));
    expect(p.state).toBe('ground');
    expect(p.charge).toBe(0);
  });
});

describe('stepPlayer: shooting', () => {
  it('charges while held and fires a shot on release', () => {
    const p = harrison();
    tick(p, { shootHeld: true }, ticks(0.5));
    expect(p.state).toBe('charging');
    expect(p.charge).toBeCloseTo(0.5 / chargeTime(BASE_STATS), 1);
    tick(p, { aim: 'up' });
    expect(p.state).toBe('kicking');
    expect(p.kick).toMatchObject({ kind: 'shot', aim: 'up' });
  });

  it('a quick tap uses the tap charge', () => {
    const p = harrison();
    tick(p, { shootHeld: true });
    tick(p, {});
    expect(p.kick?.charge).toBe(TAP_CHARGE);
  });

  it('keeps charging past full as overcharge', () => {
    const p = harrison();
    tick(p, { shootHeld: true }, ticks(chargeTime(BASE_STATS) + 0.5));
    expect(p.charge).toBe(1);
    expect(p.overchargeS).toBeCloseTo(0.5, 1);
  });

  it('moves at half speed while charging', () => {
    const p = harrison();
    tick(p, { moveX: 1, shootHeld: true }, ticks(1));
    expect(p.vx).toBeCloseTo(95 / 2);
  });

  it('the kick is active around the strike, then he recovers', () => {
    const p = harrison();
    tick(p, { shootHeld: true }, 10);
    tick(p, {});
    expect(p.kick?.active).toBe(true);
    tick(p, {}, ticks(0.15));
    expect(p.kick?.active).toBe(false);
    tick(p, {}, ticks(0.2));
    expect(p.state).toBe('ground');
    expect(p.kick).toBeNull();
  });

  it('falling cancels a charge (no stuck shot)', () => {
    const p = harrison();
    tick(p, { shootHeld: true }, 20);
    knockDown(p);
    expect([p.state, p.charge, p.kick]).toEqual(['fallen', 0, null]);
    tick(p, { shootHeld: true }, ticks(FALL_TIME + 0.1));
    tick(p, {}, 5);
    expect(p.kick).toBeNull();
    expect(p.state).toBe('ground');
  });

  it('releasing shoot while paused-equivalent (intent cleared) fires once, never twice', () => {
    const p = harrison();
    tick(p, { shootHeld: true }, 20);
    let kicks = 0;
    for (let k = 0; k < ticks(1); k++) {
      const before = p.state;
      tick(p, {});
      if (before !== 'kicking' && p.state === 'kicking') kicks++;
    }
    expect(kicks).toBe(1);
  });

  it('facing is locked while charging', () => {
    const p = harrison();
    tick(p, { shootHeld: true }, 5);
    tick(p, { shootHeld: true, moveX: -1 }, 10);
    expect(p.facing).toBe(1);
  });

  it('holds the charge frame while charging', () => {
    const p = harrison();
    tick(p, { shootHeld: true }, 20);
    expect(p.anim).toEqual({ name: 'shoot', frame: 1 });
  });
});

describe('stepPlayer: B button', () => {
  it('B with the ball at his feet starts a chip; without it starts a slide', () => {
    const chipper = harrison();
    tick(chipper, { chipHeld: true }, 1, true);
    expect(chipper.state).toBe('chipping');
    tick(chipper, {}, 1, true);
    expect(chipper.kick?.kind).toBe('chip');

    const slider = harrison();
    tick(slider, { chipHeld: true });
    expect(slider.state).toBe('sliding');
    expect(slider.vx).toBeGreaterThan(150);
    expect(slider.kick).toMatchObject({ kind: 'slide', active: true });
  });

  it('a slide fades out, then waits out its cooldown', () => {
    const p = harrison();
    tick(p, { chipHeld: true });
    tick(p, {}, ticks(0.5));
    expect(p.state).toBe('ground');
    tick(p, { chipHeld: true });
    expect(p.state).toBe('ground');
    tick(p, {}, ticks(0.4));
    tick(p, { chipHeld: true });
    expect(p.state).toBe('sliding');
  });

  it('holds the slide frame mid-slide', () => {
    const p = harrison();
    tick(p, { chipHeld: true }, ticks(0.25));
    expect(p.anim).toEqual({ name: 'slide', frame: 2 });
  });
});

describe('stepPlayer: stamina and falls', () => {
  it('stamina drains while sprinting and exhaustion blocks sprint until 0.25', () => {
    const p = harrison(100);
    tick(p, { moveX: 1, sprint: true }, ticks(2.1));
    expect(p.exhausted).toBe(true);
    expect(p.stamina).toBeLessThan(0.05);
    tick(p, { moveX: 1, sprint: true }, ticks(0.5));
    expect(p.vx).toBeCloseTo(95);
    tick(p, { moveX: 1 }, ticks(0.9));
    expect(p.exhausted).toBe(false);
    expect(p.stamina).toBeGreaterThanOrEqual(0.25);
  });

  it('regenerates stamina when not sprinting', () => {
    const p = harrison();
    p.stamina = 0.5;
    tick(p, {}, ticks(1));
    expect(p.stamina).toBeCloseTo(0.8);
  });

  it('a knocked-down player has no control, then gets up', () => {
    const p = harrison();
    knockDown(p);
    tick(p, { moveX: 1 }, ticks(0.5));
    expect(p.state).toBe('fallen');
    expect(p.anim.name).toBe('fall');
    expect(p.vx).toBe(0);
    tick(p, { moveX: 1 }, ticks(FALL_TIME));
    expect(p.state).toBe('ground');
  });
});

describe('separatePlayers', () => {
  it('separatePlayers removes overlap between grounded players', () => {
    const a = harrison(100);
    const b = createPlayer('away', BASE_STATS, 104, -1);
    separatePlayers(a, b);
    expect(b.x - a.x).toBeCloseTo(8);
    expect((a.x + b.x) / 2).toBeCloseTo(102);
  });

  it('leaves an airborne player alone', () => {
    const a = harrison(100);
    const b = createPlayer('away', BASE_STATS, 104, -1);
    b.y = 20;
    separatePlayers(a, b);
    expect([a.x, b.x]).toEqual([100, 104]);
  });
});
