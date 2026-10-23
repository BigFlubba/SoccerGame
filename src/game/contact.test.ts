import { describe, expect, it } from 'vitest';
import { seeded } from '../engine/random';
import { stepBall, type Ball } from './ball';
import { resolveContacts } from './contact';
import { BACKYARD } from './field';
import { header, shot } from './kick';
import { NO_INTENT, createPlayer, stepPlayer, type Kick, type Player } from './player';
import { BASE_STATS, touchPush } from './stats';

const STEP = 1 / 60;
const ball = (p: Partial<Ball>): Ball => ({ x: 320, y: 0, vx: 0, vy: 0, spin: 0, spinAngle: 0, ...p });
const kick = (k: Partial<Kick>): Kick => ({ kind: 'shot', charge: 0.6, overchargeS: 0, aim: 'level', active: true, ...k });

function setup(x = 300): { p: Player; opp: Player } {
  return { p: createPlayer('home', BASE_STATS, x, 1), opp: createPlayer('away', BASE_STATS, 500, -1) };
}

const contact = (p: Player, opp: Player, b: Ball) => resolveContacts(p, opp, b, 4, seeded(5), BACKYARD);

describe('resolveContacts: kicks', () => {
  it('an active shot in reach kicks the ball with shot maths', () => {
    const { p, opp } = setup();
    p.state = 'kicking';
    p.kick = kick({});
    const b = ball({ x: 308 });
    const ev = contact(p, opp, b);
    const expected = shot(BASE_STATS, 0.6, 0, 'level', 1, 4, seeded(5));
    expect(b.vx).toBe(expected.vx);
    expect(b.vy).toBe(expected.vy);
    expect(ev.kicked).toBe('shot');
    expect(ev.perfect).toBe(false);
  });

  it('reports a perfect shot', () => {
    const { p, opp } = setup();
    p.state = 'kicking';
    p.kick = kick({ charge: 0.88 });
    expect(contact(p, opp, ball({ x: 308 })).perfect).toBe(true);
  });

  it('a whiffed kick (ball out of reach) does nothing', () => {
    const { p, opp } = setup();
    p.state = 'kicking';
    p.kick = kick({});
    const b = ball({ x: 330 });
    const ev = contact(p, opp, b);
    expect([b.vx, b.vy]).toEqual([0, 0]);
    expect(ev.kicked).toBeNull();
  });

  it('a chip lofts the ball', () => {
    const { p, opp } = setup();
    p.state = 'chipping';
    p.kick = kick({ kind: 'chip', charge: 1 });
    const b = ball({ x: 308 });
    expect(contact(p, opp, b).kicked).toBe('chip');
    expect(b.vy).toBeGreaterThan(b.vx);
  });

  it('a volley strikes a ball at foot height in the air', () => {
    const { p, opp } = setup();
    p.state = 'air';
    p.y = 15;
    p.kick = kick({ kind: 'volley' });
    const b = ball({ x: 308, y: 20, vy: -100 });
    expect(contact(p, opp, b).kicked).toBe('volley');
    expect(b.vx).toBeGreaterThan(200);
  });

  it('each kick connects once per swing', () => {
    const { p, opp } = setup();
    p.state = 'kicking';
    p.kick = kick({});
    const b = ball({ x: 308 });
    const first = contact(p, opp, b);
    b.x = 308;
    const second = contact(p, opp, b);
    expect([first.kicked, second.kicked]).toEqual(['shot', null]);
  });
});

describe('resolveContacts: dribbling and blocking', () => {
  it('running into the ball dribbles it ahead with the control stat push', () => {
    const { p, opp } = setup();
    p.vx = 95;
    const b = ball({ x: 307 });
    const ev = contact(p, opp, b);
    expect(b.vx).toBe(95 + touchPush(BASE_STATS));
    expect(ev.touched).toBe(true);
  });

  it('waits out the touch cooldown between dribble touches', () => {
    const { p, opp } = setup();
    p.vx = 95;
    contact(p, opp, ball({ x: 307 }));
    const b = ball({ x: 307 });
    expect(contact(p, opp, b).touched).toBe(false);
    for (let i = 0; i < 8; i++) stepPlayer(p, { ...NO_INTENT, moveX: 1 }, STEP, BACKYARD, false);
    p.x = 300;
    expect(contact(p, opp, ball({ x: 307 })).touched).toBe(true);
  });

  it('a still player blocks a rolling ball instead of letting it pass through', () => {
    const { p, opp } = setup();
    const b = ball({ x: 250, vx: 200 });
    for (let t = 0; t < 60; t++) {
      stepBall(b, STEP, BACKYARD);
      contact(p, opp, b);
    }
    expect(b.x).toBeLessThan(300);
  });

  it('a ball blocked from behind stays behind him', () => {
    const { p, opp } = setup();
    const b = ball({ x: 360, vx: -250 });
    for (let t = 0; t < 60; t++) {
      stepBall(b, STEP, BACKYARD);
      contact(p, opp, b);
    }
    expect(b.x).toBeGreaterThan(300);
  });
});

describe('resolveContacts: headers and tackles', () => {
  it('an airborne player heads a dropping ball, aimed by the stick', () => {
    const { p, opp } = setup();
    p.state = 'air';
    p.y = 10;
    p.aim = 'up';
    const b = ball({ x: 303, y: 47, vx: -50, vy: -100 });
    const ev = contact(p, opp, b);
    expect(ev.kicked).toBe('header');
    expect(b.vy).toBeGreaterThan(0);
    expect(b.vx).toBeCloseTo(header(BASE_STATS, 'up', 1, Math.hypot(50, 100)).vx);
    expect(p.kick?.kind).toBe('header');
  });

  it('does not head a fast ball flying away from him', () => {
    const { p, opp } = setup();
    p.state = 'air';
    p.y = 10;
    const b = ball({ x: 303, y: 47, vx: 400 });
    expect(contact(p, opp, b).kicked).toBeNull();
  });

  it('a slide tackle knocks the ball away', () => {
    const { p, opp } = setup();
    p.state = 'sliding';
    p.kick = kick({ kind: 'slide' });
    const b = ball({ x: 310 });
    const ev = contact(p, opp, b);
    expect([b.vx, b.vy]).toEqual([220, 80]);
    expect(ev.tackledBall).toBe(true);
  });

  it('a slide tackle that misses the ball trips the opponent', () => {
    const { p, opp } = setup();
    p.state = 'sliding';
    p.kick = kick({ kind: 'slide' });
    opp.x = 312;
    const ev = contact(p, opp, ball({ x: 400 }));
    expect(opp.state).toBe('fallen');
    expect(ev.trippedOpponent).toBe(true);
  });

  it('cannot trip an opponent who is in the air', () => {
    const { p, opp } = setup();
    p.state = 'sliding';
    p.kick = kick({ kind: 'slide' });
    opp.x = 312;
    opp.y = 20;
    opp.state = 'air';
    contact(p, opp, ball({ x: 400 }));
    expect(opp.state).toBe('air');
  });
});

describe('resolveContacts: pinned ball', () => {
  it('a ball pinned between a player and the fence pops free', () => {
    const { p, opp } = setup(628);
    const b = ball({ x: 633, y: 33 }); // resting on the net roof against the fence
    contact(p, opp, b);
    expect(b.vy).toBe(160);
  });

  it('a ball pinned against the back of the net pops free', () => {
    const { p, opp } = setup(619);
    const b = ball({ x: 625, y: 0 });
    contact(p, opp, b);
    expect(b.vy).toBe(160);
  });
});
