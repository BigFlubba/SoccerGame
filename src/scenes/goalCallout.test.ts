import { describe, expect, it } from 'vitest';
import type { ContactEvents } from '../game/contact';
import { BASE_STATS } from '../game/stats';
import { createWorld, type World } from '../game/world';
import { HAT_TRICK_GOALS, SCREAMER_PX, TRICK_GOAL_S, goalCallout, noteKick, noteTrick, type LastKick, type TrickChance } from './goalCallout';
import { quietTricks, type TrickEvents } from '../game/tricks';

const quiet = (): ContactEvents => ({ touched: false, blocked: false, kicked: null, perfect: false, tackledBall: false, trippedOpponent: false });

/** A world whose last tick had these contact events, with the ball at x. */
function world(home: Partial<ContactEvents>, away: Partial<ContactEvents> = {}, ballX = 500): World {
  const w = createWorld(BASE_STATS, BASE_STATS, 1, { home: 4, away: 6 });
  w.ball.x = ballX;
  w.events.kicks = [
    { ...quiet(), ...home },
    { ...quiet(), ...away },
  ];
  return w;
}

const kick = (k: Partial<LastKick>): LastKick => ({ kind: 'shot', perfect: false, distance: 50, ...k });

describe('noteKick', () => {
  it("remembers Harrison's kick: what it was and how far out", () => {
    const w = world({ touched: true, kicked: 'header' }, {}, 560);
    expect(noteKick(null, w)).toEqual({ kind: 'header', perfect: false, distance: 612 - 560 });
  });

  it('keeps it while nobody else touches the ball', () => {
    const k = kick({ kind: 'volley' });
    expect(noteKick(k, world({}))).toBe(k);
  });

  it('forgets it when Max touches the ball, or Harrison dribbles it in', () => {
    const k = kick({});
    expect(noteKick(k, world({}, { touched: true }))).toBeNull();
    expect(noteKick(k, world({}, { tackledBall: true }))).toBeNull();
    expect(noteKick(k, world({ touched: true }))).toBeNull();
  });
});

describe('goalCallout', () => {
  it('names the kind of goal', () => {
    expect(goalCallout(kick({ kind: 'header' }), 1)).toBe('HEADER!');
    expect(goalCallout(kick({ kind: 'volley' }), 1)).toBe('VOLLEY!');
    expect(goalCallout(kick({ kind: 'chip' }), 1)).toBe('CHIP!');
    expect(goalCallout(kick({ perfect: true }), 1)).toBe('PERFECT STRIKE!');
    expect(goalCallout(kick({ distance: SCREAMER_PX }), 1)).toBe('SCREAMER!');
  });

  it('says nothing for an ordinary close-range shot, or a goal he did not kick in', () => {
    expect(goalCallout(kick({ distance: SCREAMER_PX - 1 }), 1)).toBeNull();
    expect(goalCallout(null, 1)).toBeNull();
  });

  it('a hat-trick beats everything, and only on the third goal', () => {
    expect(goalCallout(kick({ kind: 'header' }), HAT_TRICK_GOALS)).toBe('HAT-TRICK!');
    expect(goalCallout(null, HAT_TRICK_GOALS)).toBe('HAT-TRICK!');
    expect(goalCallout(kick({ kind: 'header' }), HAT_TRICK_GOALS + 1)).toBe('HEADER!');
  });

  it('a PERFECT strike outranks distance', () => {
    expect(goalCallout(kick({ perfect: true, distance: 400 }), 1)).toBe('PERFECT STRIKE!');
  });
});

describe('the Energy Wave callout', () => {
  const fired = (w: World) => {
    w.events.power = { ...w.events.power, fired: true };
    return w;
  };

  it('firing the wave makes it his last kick', () => {
    expect(noteKick(null, fired(world({}, {}, 300)))).toEqual({ kind: 'wave', perfect: false, distance: 612 - 300 });
  });

  it('a wave goal is ENERGY WAVE!, even as the third goal', () => {
    expect(goalCallout(kick({ kind: 'wave' }), 1)).toBe('ENERGY WAVE!');
    expect(goalCallout(kick({ kind: 'wave', distance: 400 }), HAT_TRICK_GOALS)).toBe('ENERGY WAVE!');
  });

  it('Max touching the ball after a wave clears it', () => {
    expect(noteKick(kick({ kind: 'wave' }), world({}, { touched: true }))).toBeNull();
  });
});

describe('noteTrick', () => {
  const STEP = 1 / 60;
  const tricked = (trick: Partial<TrickEvents>, home: Partial<ContactEvents> = {}, away: Partial<ContactEvents> = {}): World => {
    const w = world(home, away);
    w.events.trick = { ...quietTricks(), ...trick };
    return w;
  };
  const open = (kind: 'stepover' | 'flick' = 'stepover'): TrickChance => ({ kind, sinceS: 0, flicked: false });

  it('a trick that fools someone opens a chance', () => {
    expect(noteTrick(null, tricked({ fooled: 'stepover' }), STEP)).toEqual({ kind: 'stepover', sinceS: 0, flicked: false });
  });

  it('a flick that fools nobody opens one too, as it leaves his heel', () => {
    expect(noteTrick(null, tricked({ released: true }), STEP)).toEqual({ kind: 'flick', sinceS: 0, flicked: true });
  });

  it("the opponent's touch, kick or tackle ends it", () => {
    for (const away of [{ touched: true }, { kicked: 'shot' as const }, { tackledBall: true }]) expect(noteTrick(open(), tricked({}, {}, away), STEP)).toBeNull();
  });

  it('4 s going by ends it', () => {
    expect(noteTrick({ ...open(), sinceS: TRICK_GOAL_S - STEP / 2 }, tricked({}), STEP)).toBeNull();
    expect(noteTrick({ ...open(), sinceS: TRICK_GOAL_S - 2 * STEP }, tricked({}), STEP)).not.toBeNull();
  });

  it("Harrison's own dribble touches and his shot keep it", () => {
    expect(noteTrick(open(), tricked({}, { touched: true }), STEP)?.kind).toBe('stepover');
    expect(noteTrick(open(), tricked({}, { kicked: 'shot' }), STEP)?.kind).toBe('stepover');
  });

  it("an unfooled flick's chance lasts until anyone plays the ball, Harrison too", () => {
    const flicked: TrickChance = { kind: 'flick', sinceS: 5, flicked: true };
    expect(noteTrick(flicked, tricked({}), STEP)).not.toBeNull();
    expect(noteTrick(flicked, tricked({}, { touched: true }), STEP)).toBeNull();
  });
});

describe('goalCallout with a trick', () => {
  it('names the trick for a trick goal, ahead of PERFECT STRIKE!', () => {
    expect(goalCallout(kick({ perfect: true }), 1, 'stepover')).toBe('STEPOVER!');
    expect(goalCallout(null, 1, 'flick')).toBe('RAINBOW FLICK!');
  });

  it('ENERGY WAVE! and HAT-TRICK! still come first', () => {
    expect(goalCallout(kick({ kind: 'wave' }), 1, 'stepover')).toBe('ENERGY WAVE!');
    expect(goalCallout(kick({}), HAT_TRICK_GOALS, 'stepover')).toBe('HAT-TRICK!');
  });

  it('a header after a trick stays HEADER!: one style per goal', () => {
    expect(goalCallout(kick({ kind: 'header' }), 1, 'stepover')).toBe('HEADER!');
  });
});
