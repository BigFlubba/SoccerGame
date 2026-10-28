import { describe, expect, it } from 'vitest';
import type { InputFrame } from '../engine/input';
import { DEFAULT_OUTFIT, outfitOf, type LockerItemId } from '../meta/locker';
import { newProfile, type Profile } from '../meta/profile';
import { createLockerRoomScene, type LockerRoomScene } from './lockerRoomScene';
import type { Scene } from './scene';
import { fakeArt, recordingContext } from './testDraw';
import { testContext, type TestContext } from './testContext';
import { frame } from './testInput';

const STEP = 1 / 60;
const A = frame(['confirm']);
const B = frame(['back']);
const UP = frame(['up']);
const DOWN = frame(['down']);
const LEFT = frame(['left']);
const RIGHT = frame(['right']);
const START = frame(['pause']);
const ESC = frame(['pause', 'back']);
const ENTER = frame(['pause', 'confirm']);
const HUB: Scene = { kind: 'hub', update: () => null, draw: () => {} };

/** A save with `coins`, `milestonesPaid` paid, and a locker of its own. */
function save(over: { coins?: number; milestonesPaid?: number; locker?: Partial<Profile['locker']> } = {}): Profile {
  const p = newProfile();
  return { ...p, coins: over.coins ?? 0, career: { ...p.career, milestonesPaid: over.milestonesPaid ?? 0 }, locker: { ...p.locker, ...over.locker } };
}

function open(p: Profile = newProfile()): { ctx: TestContext; s: LockerRoomScene } {
  const ctx = testContext({ profile: p });
  return { ctx, s: createLockerRoomScene(ctx, () => HUB) };
}

const step = (s: LockerRoomScene, ...inputs: InputFrame[]): Scene | null => inputs.reduce<Scene | null>((_, i) => s.update(i, STEP), null);
const repeat = (n: number, input: InputFrame): InputFrame[] => Array(n).fill(input);
const wait = (s: LockerRoomScene, seconds: number) => step(s, ...repeat(Math.round(seconds / STEP), frame()));

describe('the locker room: moving', () => {
  it('opens on KITS at the kit he wears', () => {
    const { s } = open(save({ locker: { bought: ['kit:navy'], kit: 'navy' } }));
    expect([s.view.tab, s.view.row]).toEqual(['kits', 5]);
  });

  it('moving tries on, saves nothing', () => {
    const { ctx, s } = open();
    step(s, DOWN);
    expect(s.view.shown.kit).toBe('away');
    expect(s.view.trying).toBe(true);
    expect(ctx.savedProfiles).toEqual([]);
    step(s, UP);
    expect(s.view.trying).toBe(false);
  });

  it('up and down wrap', () => {
    const { s } = open();
    step(s, UP);
    expect(s.view.row).toBe(9);
    step(s, DOWN);
    expect(s.view.row).toBe(0);
  });

  it('left and right switch tabs, wrapping, onto what he wears', () => {
    const { s } = open(save({ locker: { bought: ['boots:blue'], boots: 'blue' } }));
    step(s, DOWN, RIGHT);
    expect([s.view.tab, s.view.row]).toEqual(['boots', 4]);
    step(s, RIGHT);
    expect([s.view.tab, s.view.row]).toEqual(['extras', 0]);
    step(s, RIGHT);
    expect([s.view.tab, s.view.row]).toEqual(['kits', 0]);
    step(s, LEFT);
    expect(s.view.tab).toBe('extras');
  });

  it('a trail boot under the cursor has him sprint on the spot', () => {
    const { s } = open(save({ milestonesPaid: 2 }));
    step(s, RIGHT);
    expect(s.view.sprinting).toBe(false);
    step(s, UP, UP);
    expect(s.view.sprinting).toBe(true);
  });

  it('plays the menu music', () => {
    const { ctx } = open();
    expect(ctx.audio.music).toBe('title');
  });
});

describe('the locker room: A', () => {
  it('A on an owned kit wears it, saves and cheers', () => {
    const { ctx, s } = open();
    step(s, DOWN, A);
    expect(ctx.profile.locker.kit).toBe('away');
    expect(ctx.savedProfiles).toHaveLength(1);
    expect(s.view.cheerS).toBeGreaterThan(0);
    expect(s.view.trying).toBe(false);
    expect(ctx.audio.played).toContain('menuConfirm');
  });

  it('A on what he wears does nothing', () => {
    const { ctx, s } = open();
    step(s, A);
    expect(ctx.savedProfiles).toEqual([]);
    expect(ctx.audio.played).toEqual([]);
    expect(s.view.cheerS).toBe(0);
  });

  it("A on something he can afford opens the box; that A doesn't buy", () => {
    const { ctx, s } = open(save({ coins: 200 }));
    step(s, DOWN, DOWN, A);
    expect(s.view.confirm).toEqual({ label: 'WHITE', price: 200, yes: true });
    expect(ctx.profile.coins).toBe(200);
    expect(ctx.savedProfiles).toEqual([]);
  });

  it('YES buys: coins drop by the price, he wears it, buy plays', () => {
    const { ctx, s } = open(save({ coins: 500 }));
    step(s, DOWN, DOWN, A, A);
    expect(ctx.profile.coins).toBe(300);
    expect(outfitOf(ctx.profile).kit).toBe('white');
    expect(ctx.savedProfiles).toHaveLength(1);
    expect(ctx.audio.played).toContain('buy');
    expect(s.view.confirm).toBeNull();
    expect(s.view.cheerS).toBeGreaterThan(0);
  });

  it('coins equal to the price leave 0', () => {
    const { ctx, s } = open(save({ coins: 200 }));
    step(s, DOWN, DOWN, A, ENTER);
    expect(ctx.profile.coins).toBe(0);
    expect(ctx.profile.locker.bought).toEqual(['kit:white']);
  });

  it('NO, B, Esc and Start close the box without buying', () => {
    for (const close of [[DOWN, A], [B], [ESC], [START]]) {
      const { ctx, s } = open(save({ coins: 500 }));
      expect(step(s, DOWN, DOWN, A, ...close)).toBeNull();
      expect(s.view.confirm).toBeNull();
      expect(ctx.profile.coins).toBe(500);
      expect(ctx.savedProfiles).toEqual([]);
      expect(outfitOf(ctx.profile)).toEqual(DEFAULT_OUTFIT);
    }
  });

  it('up and down pick NO and YES in the box, not rows', () => {
    const { s } = open(save({ coins: 500 }));
    step(s, DOWN, DOWN, A, DOWN);
    expect([s.view.row, s.view.confirm?.yes]).toEqual([2, false]);
    step(s, UP);
    expect(s.view.confirm?.yes).toBe(true);
  });

  it('too dear: NEED 300 MORE and nope, no box', () => {
    const { ctx, s } = open(save({ coins: 1200 }));
    step(s, ...repeat(8, DOWN), A);
    expect(s.view.message).toBe('NEED 300 MORE');
    expect(ctx.audio.played).toContain('nope');
    expect(s.view.confirm).toBeNull();
  });

  it('a locked gift: REACH 50 STARS and nope, no box', () => {
    const { ctx, s } = open(save({ coins: 9999 }));
    step(s, UP, A);
    expect(s.view.message).toBe('REACH 50 STARS');
    expect(ctx.audio.played).toContain('nope');
    expect(s.view.confirm).toBeNull();
  });

  it('a message clears when he moves', () => {
    const { s } = open();
    step(s, UP, A, DOWN);
    expect(s.view.message).toBeNull();
  });

  it('extras: A puts one on (cheer), A again takes it off (no cheer)', () => {
    const { ctx, s } = open();
    step(s, LEFT, A);
    expect(ctx.profile.locker.extras).toEqual(['glasses']);
    expect(s.view.cheerS).toBeGreaterThan(0);
    wait(s, 1.3);
    expect(s.view.cheerS).toBe(0);
    step(s, A);
    expect(ctx.profile.locker.extras).toEqual([]);
    expect(s.view.cheerS).toBe(0);
    expect(ctx.savedProfiles).toHaveLength(2);
  });
});

describe('the locker room: NEW and leaving', () => {
  it('resting on an unlocked gift marks it seen and saves once', () => {
    const { ctx, s } = open(save({ milestonesPaid: 2 }));
    step(s, RIGHT, UP, UP);
    expect(ctx.savedProfiles).toHaveLength(1);
    expect(ctx.profile.locker.seen).toEqual(['boots:lightning' satisfies LockerItemId]);
    step(s, DOWN, UP);
    expect(ctx.savedProfiles).toHaveLength(1);
  });

  it("resting on a locked gift doesn't", () => {
    const { ctx, s } = open();
    step(s, RIGHT, UP, UP, LEFT, UP);
    expect(ctx.savedProfiles).toEqual([]);
  });

  it('opening on an unseen gift he wears sees it', () => {
    const { ctx } = open(save({ milestonesPaid: 3, locker: { kit: 'gold' } }));
    expect(ctx.profile.locker.seen).toEqual(['kit:gold']);
  });

  it('B leaves with the try-on dropped and nothing saved', () => {
    const { ctx, s } = open();
    step(s, DOWN, DOWN, DOWN);
    expect(step(s, B)).toBe(HUB);
    expect(ctx.savedProfiles).toEqual([]);
    expect(outfitOf(ctx.profile)).toEqual(DEFAULT_OUTFIT);
    expect(ctx.audio.played).toContain('menuBack');
  });

  it('Esc and Start leave too', () => {
    for (const out of [ESC, START]) expect(step(open().s, out)).toBe(HUB);
  });
});

describe('the locker room: drawing', () => {
  it('draws the room with him in the try-on', () => {
    const ctx = testContext({ art: fakeArt() });
    const s = createLockerRoomScene(ctx, () => HUB);
    step(s, DOWN);
    const { g, drawn } = recordingContext();
    s.draw(g, 0);
    expect(drawn).toContain('art.text(LOCKER ROOM,2,energyGold,outline)');
    expect(drawn).toContain('art.text(TRYING ON,1,white,outline)');
  });
});
