import { describe, expect, it } from 'vitest';
import { STAT_NAMES } from '../game/stats';
import { newProfile } from '../meta/profile';
import type { Scene } from './scene';
import { createShopScene, shopRow } from './shopScene';
import { testContext } from './testContext';
import { frame } from './testInput';

const STEP = 1 / 60;
const BEHIND: Scene = { kind: 'hub', update: () => null, draw: () => {} };
const withCoins = (coins: number, stats = newProfile().stats) => testContext({ profile: { ...newProfile(), coins, stats } });

describe('shop', () => {
  it('lists the four stats in order', () => {
    expect(STAT_NAMES.map(k => shopRow(k, newProfile()))).toEqual(['SPEED  LV 1  150', 'POWER  LV 1  150', 'JUMP  LV 1  150', 'CONTROL  LV 1  150']);
    const p = { ...newProfile(), stats: { speed: 10, power: 2, jump: 1, control: 1 } };
    expect(shopRow('speed', p)).toBe('SPEED  LV 10  MAX');
    expect(shopRow('power', p)).toBe('POWER  LV 2  205');
  });

  it('A buys the selected stat, saves at once and plays buy', () => {
    const ctx = withCoins(200);
    const s = createShopScene(ctx, () => BEHIND);
    expect(s.update(frame(['confirm']), STEP)).toBeNull();
    expect(ctx.profile.stats.speed).toBe(2);
    expect(ctx.profile.coins).toBe(50);
    expect(ctx.savedProfiles).toHaveLength(1);
    expect(ctx.audio.played).toContain('buy');
    expect(s.message).toBeNull();
  });

  it('coins exactly equal to the price leave 0', () => {
    const ctx = withCoins(150);
    createShopScene(ctx, () => BEHIND).update(frame(['confirm']), STEP);
    expect(ctx.profile.coins).toBe(0);
    expect(ctx.profile.stats.speed).toBe(2);
  });

  it('short of coins: nope, a message, nothing saved', () => {
    const ctx = withCoins(100);
    const s = createShopScene(ctx, () => BEHIND);
    s.update(frame(['confirm']), STEP);
    expect(s.message).toBe('NEED 50 MORE');
    expect(ctx.audio.played).toContain('nope');
    expect(ctx.audio.played).not.toContain('buy');
    expect(ctx.savedProfiles).toHaveLength(0);
    expect(ctx.profile.stats.speed).toBe(1);
  });

  it('at level 10: nope, nothing saved', () => {
    const ctx = withCoins(99999, { speed: 10, power: 1, jump: 1, control: 1 });
    const s = createShopScene(ctx, () => BEHIND);
    s.update(frame(['confirm']), STEP);
    expect(s.message).toBe('MAX LEVEL');
    expect(ctx.audio.played).toContain('nope');
    expect(ctx.savedProfiles).toHaveLength(0);
  });

  it('up and down pick a stat, wrapping, and buy that one', () => {
    const ctx = withCoins(1000);
    const s = createShopScene(ctx, () => BEHIND);
    s.update(frame(['up']), STEP);
    expect(s.row).toBe(3);
    s.update(frame(['down']), STEP);
    s.update(frame(['down']), STEP);
    expect(s.row).toBe(1);
    expect(ctx.audio.played.filter(c => c === 'menuMove')).toHaveLength(3);
    s.update(frame(['confirm']), STEP);
    expect(ctx.profile.stats).toEqual({ speed: 1, power: 2, jump: 1, control: 1 });
  });

  it('moving to another stat clears the message', () => {
    const s = createShopScene(withCoins(0), () => BEHIND);
    s.update(frame(['confirm']), STEP);
    expect(s.message).not.toBeNull();
    s.update(frame(['down']), STEP);
    expect(s.message).toBeNull();
  });

  it('B or Esc goes back with the back blip', () => {
    for (const pressed of [['back'], ['pause', 'back']] as const) {
      const ctx = withCoins(500);
      expect(createShopScene(ctx, () => BEHIND).update(frame(pressed), STEP)).toBe(BEHIND);
      expect(ctx.audio.played).toEqual(['menuBack']);
      expect(ctx.savedProfiles).toHaveLength(0);
    }
  });

  it('Enter buys rather than backing out', () => {
    const ctx = withCoins(500);
    expect(createShopScene(ctx, () => BEHIND).update(frame(['pause', 'confirm']), STEP)).toBeNull();
    expect(ctx.profile.stats.speed).toBe(2);
  });

  it('plays the title theme', () => {
    const ctx = testContext();
    createShopScene(ctx, () => BEHIND);
    expect(ctx.audio.music).toBe('title');
  });
});
