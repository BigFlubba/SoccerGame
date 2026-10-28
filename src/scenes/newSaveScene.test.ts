import { describe, expect, it } from 'vitest';
import type { InputFrame } from '../engine/input';
import { newProfile, type Profile } from '../meta/profile';
import { createNewSaveScene } from './newSaveScene';
import type { Scene } from './scene';
import { fakeArt, recordingContext } from './testDraw';
import { TEST_TODAY, testContext } from './testContext';
import { frame } from './testInput';

const STEP = 1 / 60;
const BEHIND: Scene = { kind: 'pressStart', update: () => null, draw: () => {} };
const ENTER = frame(['pause', 'confirm']);
const ESC = frame(['pause', 'back']);

/** A frame with this text typed. */
const typing = (text: string): InputFrame => ({ ...frame(), typed: text });

function opening(slot = 2, profile = newProfile()) {
  const ctx = testContext({ profile });
  const s = createNewSaveScene(ctx, slot, () => BEHIND);
  return { ctx, s };
}

/** Level 6 with coins, the wave and Golden Form, stars, today's daily win and bought stats. */
const RICH: Profile = {
  ...newProfile(),
  name: 'RICH',
  difficulty: 'easy',
  coins: 840,
  level: 6,
  xp: 30,
  stats: { speed: 7, power: 5, jump: 4, control: 5, stamina: 3 },
  ladderWins: 4,
  dailyWinDate: TEST_TODAY,
  powerMoves: { owned: ['energyWave'], equipped: 'energyWave' },
  powerForms: { owned: ['golden'], equipped: 'golden' },
  career: { stars: { 'backyard-1': 3, 'backyard-2': 2 }, milestonesPaid: 1, lossStreaks: {} },
};

describe('new save', () => {
  it('types a name on the NAME row, keeping only what a name can hold', () => {
    const { s } = opening();
    s.update(typing('Bob-2 x!'), STEP);
    expect(s.name).toBe('BOB2 X');
  });

  it("the game's keys type letters and don't act", () => {
    const { s } = opening();
    s.update(typing('zcxvadf'), STEP);
    expect(s.name).toBe('ZCXVADF');
    expect(s.row).toBe('name');
  });

  it('stops at NAME_MAX, and Backspace deletes', () => {
    const { s } = opening();
    s.update(typing('abcdefghijklmnop'), STEP);
    expect(s.name).toBe('ABCDEFGHIJKL');
    s.update(typing('\b'), STEP);
    expect(s.name).toBe('ABCDEFGHIJK');
  });

  it('typing on DIFFICULTY or START changes nothing', () => {
    const { s } = opening();
    s.update(typing('AB'), STEP);
    s.update(frame(['down']), STEP);
    s.update(typing('CD\b'), STEP);
    s.update(frame(['down']), STEP);
    s.update(typing('EF\b'), STEP);
    expect(s.name).toBe('AB');
  });

  it('up and down move between the rows, wrapping', () => {
    const { s } = opening();
    expect(s.row).toBe('name');
    const rows = [1, 2, 3].map(() => (s.update(frame(['down']), STEP), s.row));
    expect(rows).toEqual(['difficulty', 'start', 'name']);
    s.update(frame(['up']), STEP);
    expect(s.row).toBe('start');
  });

  it('left and right change the difficulty only on its row, from NORMAL', () => {
    const { s } = opening();
    expect(s.difficulty).toBe('normal');
    s.update(frame(['left']), STEP);
    expect(s.difficulty).toBe('normal');
    s.update(frame(['down']), STEP);
    const picked = [1, 2].map(() => (s.update(frame(['right']), STEP), s.difficulty));
    expect(picked).toEqual(['hard', 'easy']);
  });

  it('blips on a move and a difficulty change, and not on typing', () => {
    const { ctx, s } = opening();
    s.update(typing('A'), STEP);
    s.update(frame(['down']), STEP);
    s.update(frame(['right']), STEP);
    expect(ctx.audio.played).toEqual(['menuMove', 'menuMove']);
  });

  it('Enter starts it from any row', () => {
    for (const downs of [0, 1, 2]) {
      const { s } = opening(3);
      for (let i = 0; i < downs; i++) s.update(frame(['down']), STEP);
      expect(s.update(ENTER, STEP)?.kind).toBe('hub');
    }
  });

  it('starting plays the new save in its slot, named, at its difficulty', () => {
    const { ctx, s } = opening(3);
    s.update(typing('normal run'), STEP);
    s.update(frame(['down']), STEP);
    s.update(frame(['right']), STEP);
    const next = s.update(frame(['jump', 'confirm']), STEP);
    const made = { ...newProfile(), name: 'NORMAL RUN', difficulty: 'hard' };
    expect(next?.kind).toBe('hub');
    expect(ctx.slot).toBe(3);
    expect(ctx.profile).toEqual(made);
    expect(ctx.saves.read(3)).toEqual(made);
    expect(ctx.saves.lastPlayed()).toBe(3);
    expect(ctx.audio.played.at(-1)).toBe('menuConfirm');
  });

  it('a blank name becomes SAVE n, and spaces round a name go', () => {
    const blank = opening(4);
    blank.s.update(typing('   '), STEP);
    blank.s.update(ENTER, STEP);
    expect(blank.ctx.profile.name).toBe('SAVE 4');
    const spaced = opening(4);
    spaced.s.update(typing('  bob '), STEP);
    spaced.s.update(ENTER, STEP);
    expect(spaced.ctx.profile.name).toBe('BOB');
  });

  it('a save made right after playing a rich one carries nothing over', () => {
    const { ctx, s } = opening(2, RICH);
    s.update(typing('FRESH'), STEP);
    s.update(ENTER, STEP);
    expect(ctx.profile).toEqual({ ...newProfile(), name: 'FRESH', difficulty: 'normal' });
  });

  it('B or Esc goes back with nothing created', () => {
    for (const out of [frame(['chip', 'back']), ESC]) {
      const { ctx, s } = opening(2);
      s.update(typing('BOB'), STEP);
      expect(s.update(out, STEP)).toBe(BEHIND);
      expect(ctx.saves.read(2)).toBeNull();
      expect(ctx.savedProfiles).toEqual([]);
      expect(ctx.audio.played).toEqual(['menuBack']);
    }
  });

  it('Start alone does nothing', () => {
    const { ctx, s } = opening();
    expect(s.update(frame(['pause']), STEP)).toBeNull();
    expect(ctx.savedProfiles).toEqual([]);
    expect(s.row).toBe('name');
  });

  it('the keyboard types on every row', () => {
    const { s } = opening();
    const typingOn = [0, 1, 2].map(() => {
      const on = s.wantsText;
      s.update(frame(['down']), STEP);
      return on;
    });
    expect(typingOn).toEqual([true, true, true]);
  });

  it('draws the title, the name typed, and the hint', () => {
    const ctx = testContext({ art: fakeArt() });
    const s = createNewSaveScene(ctx, 2, () => BEHIND);
    s.update(typing('BOB'), STEP);
    const { g, drawn } = recordingContext();
    s.draw(g, 0);
    expect(drawn).toEqual(expect.arrayContaining(['art.text(NEW SAVE,2,energyGold,outline)', 'art.text(BOB,2,white,outline)', 'art.text(TYPE A NAME ON THE KEYBOARD,1,silver,outline)']));
  });
});
