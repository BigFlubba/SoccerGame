import { describe, expect, it } from 'vitest';
import type { InputFrame } from '../engine/input';
import { newProfile, type Profile } from '../meta/profile';
import { encodeSaveCode } from '../meta/saveCode';
import { codeLines, createSaveCodeScene } from './saveCodeScene';
import type { Scene } from './scene';
import { testContext } from './testContext';
import { frame } from './testInput';

const STEP = 1 / 60;
const BEHIND: Scene = { kind: 'options', update: () => null, draw: () => {} };
const BAD = "THAT CODE DOESN'T WORK";

/** Four ladder wins, with the star each of them carries, so loading the code adds nothing. */
const OTHER: Profile = {
  ...newProfile(),
  coins: 840,
  level: 6,
  ladderWins: 4,
  powerForms: { owned: ['golden'], equipped: 'golden' },
  career: { stars: { 'backyard-1': 1, 'backyard-2': 1, 'backyard-3': 1, 'backyard-4': 1 }, milestonesPaid: 0, lossStreaks: {} },
};

/** A frame with this text typed. */
const typing = (text: string): InputFrame => ({ ...frame(), typed: text });

/** Opens the screen and goes to the entry stage. */
function entering() {
  const ctx = testContext();
  const s = createSaveCodeScene(ctx, () => BEHIND);
  s.update(frame(['confirm']), STEP);
  return { ctx, s };
}

describe('save code screen', () => {
  it('opening copies the code', async () => {
    const ctx = testContext({ profile: OTHER });
    const s = createSaveCodeScene(ctx, () => BEHIND);
    expect(s.code).toBe(encodeSaveCode(OTHER));
    expect(ctx.copied).toEqual([encodeSaveCode(OTHER)]);
    expect(s.status).toBe('WRITE IT DOWN OR TAKE A PHOTO');
    await Promise.resolve();
    expect(s.status).toBe('COPIED TO THE CLIPBOARD');
  });

  it('a failed copy still shows the code and says to write it down', async () => {
    const ctx = testContext();
    ctx.copyText = async () => false;
    const s = createSaveCodeScene(ctx, () => BEHIND);
    await Promise.resolve();
    expect(s.status).toBe('WRITE IT DOWN OR TAKE A PHOTO');
    expect(s.code).toBe(encodeSaveCode(newProfile()));
  });

  it('the entry stage wants text, and the others do not', () => {
    const { s } = entering();
    expect([s.stage, s.wantsText]).toEqual(['enter', true]);
    s.update(frame(['back']), STEP);
    expect([s.stage, s.wantsText]).toEqual(['show', false]);
    s.update(frame(['confirm']), STEP);
    s.update(typing(encodeSaveCode(OTHER)), STEP);
    s.update(frame(['confirm']), STEP);
    expect([s.stage, s.wantsText]).toEqual(['confirm', false]);
  });

  it('typing a good code, Enter, then YES replaces the save', () => {
    const { ctx, s } = entering();
    s.update(typing(encodeSaveCode(OTHER).toLowerCase()), STEP);
    s.update(frame(['confirm']), STEP);
    expect(s.summary).toBe('LEVEL 6 - 840 COINS - LADDER 4/10');
    s.update(frame(['down']), STEP);
    s.update(frame(['confirm']), STEP);
    expect(ctx.savedProfiles).toEqual([OTHER]);
    expect(s.stage).toBe('show');
    expect(s.code).toBe(encodeSaveCode(OTHER));
    expect(s.status).toBe('SAVE LOADED!');
  });

  it('NO is pre-selected, and confirming it changes nothing', () => {
    const { ctx, s } = entering();
    s.update(typing(encodeSaveCode(OTHER)), STEP);
    s.update(frame(['confirm']), STEP);
    expect(s.menu?.items).toEqual(['NO', 'YES']);
    expect(s.menu?.index).toBe(0);
    s.update(frame(['confirm']), STEP);
    expect(ctx.savedProfiles).toEqual([]);
    expect(s.stage).toBe('enter');
  });

  it("a bad code says THAT CODE DOESN'T WORK and changes nothing", () => {
    const { ctx, s } = entering();
    const code = encodeSaveCode(OTHER);
    s.update(typing(code.slice(0, -1) + (code.endsWith('Z') ? 'Y' : 'Z')), STEP);
    s.update(frame(['confirm']), STEP);
    expect(s.stage).toBe('enter');
    expect(s.status).toBe(BAD);
    expect(ctx.savedProfiles).toEqual([]);
  });

  it("Enter on an empty entry says THAT CODE DOESN'T WORK", () => {
    const { s } = entering();
    s.update(frame(['confirm']), STEP);
    expect(s.status).toBe(BAD);
  });

  it('backspace deletes, and typing on clears the error', () => {
    const { s } = entering();
    s.update(typing('ab-c'), STEP);
    expect(s.entry).toBe('ABC');
    s.update(typing('\b'), STEP);
    expect(s.entry).toBe('AB');
    s.update(frame(['confirm']), STEP);
    expect(s.status).toBe(BAD);
    s.update(typing('o'), STEP);
    expect([s.entry, s.status]).toEqual(['AB0', null]);
  });

  it('B on the show stage goes back', () => {
    const ctx = testContext();
    const s = createSaveCodeScene(ctx, () => BEHIND);
    expect(s.update(frame(['back']), STEP)).toBe(BEHIND);
  });
});

describe('codeLines', () => {
  it('shows a code big, four groups a line, and a very long one small in at most three lines', () => {
    const groups = (n: number) => Array.from({ length: n }, () => 'ABCDE').join('-');
    expect(codeLines(groups(11))).toMatchObject({ scale: 2, lines: [groups(4), groups(4), groups(3)] });
    const long = codeLines(groups(22));
    expect(long.scale).toBe(1);
    expect(long.lines.length).toBeLessThanOrEqual(3);
  });

  it('the longest code the loader can hold still fits', () => {
    const max: Profile = {
      ...OTHER,
      coins: 999_999_999,
      xp: 1_000_000,
      level: 999,
      totals: { matches: 999_999_999, wins: 999_999_999, draws: 999_999_999, losses: 999_999_999, goalsFor: 999_999_999, goalsAgainst: 999_999_999, styleGoals: 999_999_999, xpEarned: 999_999_999 },
    };
    expect(codeLines(encodeSaveCode(max)).lines.length).toBeLessThanOrEqual(3);
    expect(normaliseLength(encodeSaveCode(max))).toBeLessThanOrEqual(120);
  });
});

const normaliseLength = (code: string) => code.replaceAll('-', '').length;
