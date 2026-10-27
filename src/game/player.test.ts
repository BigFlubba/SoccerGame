import { describe, expect, it } from 'vitest';
import { BACKYARD } from './field';
import { TAP_CHARGE } from './kick';
import {
  ACCEL,
  BLOWN_DOWN_S,
  BRACE_S,
  FALL_TIME,
  NO_INTENT,
  PLAYER_R,
  blowAway,
  brace,
  cancelCharge,
  createPlayer,
  isStriking,
  knockDown,
  stepPlayer,
  type Player,
  type PlayerIntent,
} from './player';
import { BASE_STATS, SPRINT_MULTIPLIER, chargeTime, runSpeed } from './stats';

const STEP = 1 / 60;
const ticks = (s: number) => Math.round(s / STEP);
const intent = (p: Partial<PlayerIntent>): PlayerIntent => ({ ...NO_INTENT, ...p });
const harrison = (x = 320) => createPlayer('home', BASE_STATS, x, 1);

function tick(p: Player, i: Partial<PlayerIntent>, n = 1, ballAtFeet = false): void {
  for (let k = 0; k < n; k++) stepPlayer(p, intent(i), STEP, BACKYARD, ballAtFeet);
}

describe('stepPlayer: moving', () => {
  it("an intent's pace scales his run and sprint", () => {
    const run = harrison();
    tick(run, { moveX: 1, pace: 1.1 }, ticks(1));
    expect(run.vx).toBeCloseTo(95 * 1.1);
    const sprint = harrison();
    tick(sprint, { moveX: 1, sprint: true, pace: 1.1 }, ticks(1));
    expect(sprint.vx).toBeCloseTo(95 * SPRINT_MULTIPLIER * 1.1);
  });

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

  it('a player pushed into the fence moves away on the first tick he turns', () => {
    const p = harrison(BACKYARD.fenceL + PLAYER_R);
    tick(p, { moveX: -1 }, ticks(0.5));
    const x = p.x;
    tick(p, { moveX: 1 });
    expect(p.x).toBeGreaterThan(x);
  });

  it('a player pushed into the back fence moves away on the first tick he turns', () => {
    const p = createPlayer('home', BASE_STATS, 320, 1, BACKYARD.depth - PLAYER_R);
    tick(p, { moveZ: 1 }, ticks(0.5));
    const z = p.z;
    tick(p, { moveZ: -1 });
    expect(p.z).toBeLessThan(z);
  });

  it('faceX keeps him facing one way while he backs off the other', () => {
    const p = harrison();
    tick(p, { moveX: 0.7, faceX: -1 }, ticks(0.5));
    expect(p.facing).toBe(-1);
    expect(p.x).toBeGreaterThan(320);
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

describe('stepPlayer: depth', () => {
  it('starts on the centre line of the pitch in depth', () => {
    expect(harrison().z).toBe(BACKYARD.depth / 2);
  });

  it('runs in depth and diagonally at the same speed', () => {
    // A quarter second reaches full speed well before the back fence.
    const deep = harrison();
    tick(deep, { moveZ: 1 }, ticks(0.25));
    expect(Math.abs(deep.vz)).toBeCloseTo(95);
    expect(deep.z).toBeGreaterThan(BACKYARD.depth / 2);
    const diagonal = harrison();
    tick(diagonal, { moveX: 1, moveZ: 1 }, ticks(0.25));
    expect(Math.hypot(diagonal.vx, diagonal.vz)).toBeCloseTo(95);
  });

  it('down runs toward the camera', () => {
    const p = harrison();
    tick(p, { moveZ: -1 }, 10);
    expect(p.vz).toBeLessThan(0);
  });

  it('sprints in depth too', () => {
    const p = harrison();
    tick(p, { moveZ: 1, sprint: true }, ticks(0.25));
    expect(p.vz).toBeCloseTo(95 * SPRINT_MULTIPLIER);
  });

  it('runs and stands still by the speed of his whole run', () => {
    const p = harrison();
    tick(p, { moveZ: 1 }, 10);
    expect(p.anim.name).toBe('run');
  });

  it('up/down aims instead of moving while charging', () => {
    const p = harrison();
    tick(p, { shootHeld: true });
    const z = p.z;
    tick(p, { shootHeld: true, moveZ: 1, aim: 'far' }, ticks(0.5));
    expect(isStriking(p)).toBe(true);
    expect([p.z, p.vz]).toEqual([z, 0]);
    tick(p, { moveZ: 1, aim: 'far' });
    expect(p.kick?.aim).toBe('far');
  });

  it('a charge stops his depth run', () => {
    const p = harrison();
    tick(p, { moveZ: 1 }, ticks(1));
    tick(p, { shootHeld: true, moveZ: 1 }, ticks(0.5));
    expect(p.vz).toBe(0);
  });

  it('up/down aims instead of moving while charging a chip', () => {
    const p = harrison();
    tick(p, { chipHeld: true }, 1, true);
    expect(p.state).toBe('chipping');
    const z = p.z;
    tick(p, { chipHeld: true, moveZ: -1 }, ticks(0.3), true);
    expect(p.z).toBe(z);
  });

  it('keeps his jump’s depth direction in the air', () => {
    const p = createPlayer('home', BASE_STATS, 320, 1, PLAYER_R);
    tick(p, { moveZ: 1 }, ticks(0.25));
    tick(p, { moveZ: 1, jump: true });
    const vz = p.vz;
    expect(vz).toBeGreaterThan(0);
    tick(p, { moveZ: -1 }, 10);
    expect(p.state).toBe('air');
    expect(p.vz).toBe(vz);
  });

  it('starts moving smoothly when a charge ends with up held', () => {
    const p = createPlayer('home', BASE_STATS, 320, 1, PLAYER_R);
    tick(p, { shootHeld: true }, ticks(0.3));
    let last = p.vz;
    for (let i = 0; i < ticks(0.4); i++) {
      tick(p, { moveZ: 1 });
      expect(Math.abs(p.vz - last)).toBeLessThanOrEqual(ACCEL * STEP + 1e-9);
      last = p.vz;
    }
    expect(p.vz).toBeGreaterThan(0);
  });

  it('stays inside the pitch in depth', () => {
    const p = harrison();
    tick(p, { moveZ: 1 }, ticks(2));
    expect(p.z).toBe(BACKYARD.depth - PLAYER_R);
    tick(p, { moveZ: -1 }, ticks(2));
    expect(p.z).toBe(PLAYER_R);
  });

  it('stays between the fences by his body radius', () => {
    const p = harrison(600);
    tick(p, { moveX: 1 }, ticks(2));
    expect(p.x).toBe(BACKYARD.fenceR - PLAYER_R);
  });
});

describe('stepPlayer: jumping', () => {
  it('a diagonal jump is no faster than a run', () => {
    const p = harrison();
    tick(p, { moveX: 1, moveZ: 1 }, ticks(1));
    tick(p, { moveX: 1, moveZ: 1, jump: true });
    expect(p.state).toBe('air');
    for (let n = 0; p.state === 'air' && n < ticks(3); n++) {
      expect(Math.hypot(p.vx, p.vz)).toBeLessThanOrEqual(runSpeed(p.stats) + 1e-6);
      tick(p, { moveX: 1, moveZ: 1 });
    }
  });

  it('a diagonal take-off steered sideways is no faster than a run', () => {
    // Near the near touchline, so the jump never reaches the far one (a wall drops vz and hides the speed).
    const p = createPlayer('home', BASE_STATS, 320, 1, PLAYER_R + 1);
    tick(p, { moveX: 1, moveZ: 1 }, ticks(0.2));
    tick(p, { moveX: 1, moveZ: 1, jump: true });
    expect(p.state).toBe('air');
    for (let n = 0; p.state === 'air' && n < ticks(3); n++) {
      tick(p, { moveX: 1, moveZ: 0 });
      if (p.state === 'air') expect(Math.hypot(p.vx, p.vz)).toBeLessThanOrEqual(runSpeed(p.stats) + 1e-6);
    }
  });

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
    tick(p, { aim: 'far' });
    expect(p.state).toBe('kicking');
    expect(p.kick).toMatchObject({ kind: 'shot', aim: 'far' });
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

  it('cancelCharge drops a shot or chip charge without kicking', () => {
    const p = harrison();
    tick(p, { shootHeld: true }, 20);
    cancelCharge(p);
    expect([p.state, p.charge, p.kick]).toEqual(['ground', 0, null]);
    tick(p, {}, 5);
    expect(p.kick).toBeNull();
  });

  it('cancelCharge leaves a kick already in flight alone', () => {
    const p = harrison();
    tick(p, { shootHeld: true }, 5);
    tick(p, {});
    cancelCharge(p);
    expect(p.state).toBe('kicking');
  });

  it('he can turn while charging a shot, and keeps the charge', () => {
    const p = harrison();
    tick(p, { shootHeld: true }, 5);
    const charge = p.charge;
    tick(p, { shootHeld: true, moveX: -1 }, 10);
    expect(p.facing).toBe(-1);
    expect(p.state).toBe('charging');
    expect(p.charge).toBeGreaterThan(charge);
  });

  it('he can turn while charging a chip', () => {
    const p = harrison();
    tick(p, { chipHeld: true }, 1, true);
    expect([p.state, p.kick]).toEqual(['chipping', null]);
    tick(p, { chipHeld: true, moveX: -1 }, 10, true);
    expect(p.facing).toBe(-1);
  });

  it('the swing, once released, keeps his facing', () => {
    const p = harrison();
    tick(p, { shootHeld: true }, 5);
    tick(p, { moveX: -1 });
    expect(p.state).toBe('kicking');
    tick(p, { moveX: -1 }, 3);
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

describe('stepPlayer: the Energy Wave strike', () => {
  /** Ticks with the ball at his feet, and a wave direction when X should fire the wave. */
  function wave(p: Player, i: Partial<PlayerIntent>, n = 1, waveDir: 1 | -1 | 'wait' | null = 1): void {
    for (let k = 0; k < n; k++) stepPlayer(p, intent(i), STEP, BACKYARD, true, waveDir);
  }

  it('X with a wave direction strikes the Energy Wave at once, turned to face it and aimed by the stick', () => {
    const p = createPlayer('home', BASE_STATS, 320, -1);
    wave(p, { shootHeld: true, aim: 'far' });
    expect(p.state).toBe('unleashing');
    expect(p.facing).toBe(1);
    expect(p.kick).toEqual({ kind: 'wave', aim: 'far', active: true, charge: 1, overchargeS: 0 });
    wave(p, {}, ticks(1));
    expect(p.state).toBe('ground');
    expect(p.kick).toBeNull();
  });

  it('while the wave readies, X does nothing', () => {
    const p = harrison();
    wave(p, { shootHeld: true }, 1, 'wait');
    expect(p.state).toBe('ground');
    expect(p.kick).toBeNull();
  });

  it('without a wave direction, X is a normal shot', () => {
    const p = harrison();
    wave(p, { shootHeld: true }, 1, null);
    expect(p.state).toBe('charging');
  });

  it('a power press arms while Y is held, and letting go disarms it', () => {
    const p = harrison();
    wave(p, { powerHeld: true }, 3, null);
    expect(p.powerArmed).toBe(true);
    wave(p, {}, 1, null);
    expect(p.powerArmed).toBe(false);
    wave(p, { powerHeld: true }, 1, null);
    expect(p.powerArmed).toBe(true);
  });

  it('Y still held gives no fresh press: once disarmed, it stays disarmed', () => {
    const p = harrison();
    wave(p, { powerHeld: true }, 1, null);
    p.powerArmed = false;
    wave(p, { powerHeld: true }, 10, null);
    expect(p.powerArmed).toBe(false);
  });

  it('pausing (cancelCharge) drops a waiting press', () => {
    const p = harrison();
    wave(p, { powerHeld: true }, 3, null);
    cancelCharge(p);
    wave(p, { powerHeld: true }, 3, null);
    expect(p.powerArmed).toBe(false);
  });
});

describe('bracing and blown away', () => {
  it('bracing skids him about 25 px back over half a second', () => {
    const p = createPlayer('away', BASE_STATS, 400, 1);
    brace(p, 1);
    expect(p.state).toBe('bracing');
    expect(p.facing).toBe(-1);
    tick(p, {}, ticks(BRACE_S) - 1);
    expect(p.state).toBe('bracing');
    expect(p.anim.name).toBe('brace');
    tick(p, {}, 2);
    expect(p.x - 400).toBeGreaterThanOrEqual(20);
    expect(p.x - 400).toBeLessThanOrEqual(30);
    expect(p.state).toBe('ground');
  });

  it('blown away he flies, lands and is up at 1.5 s', () => {
    const p = createPlayer('away', BASE_STATS, 300, -1);
    blowAway(p, 1, 0);
    expect(p.state).toBe('blown');
    tick(p, {}, ticks(0.1));
    expect(p.y).toBeGreaterThan(0);
    expect(p.anim).toEqual({ name: 'fall', frame: 1 });
    tick(p, {}, ticks(0.8));
    expect(p.y).toBe(0);
    expect(p.vx).toBe(0);
    expect(p.state).toBe('blown');
    const landedX = p.x;
    expect(landedX).toBeGreaterThan(340);
    tick(p, { moveX: -1 }, ticks(BLOWN_DOWN_S - 0.9) - 1);
    expect(p.state).toBe('blown');
    expect(p.x).toBe(landedX);
    tick(p, {}, 2);
    expect(p.state).toBe('ground');
  });
});
