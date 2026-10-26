import { describe, expect, it } from 'vitest';
import { newProfile, type Profile } from './profile';
import { decodeFields, decodeSaveCode, encodeFields, encodeSaveCode, groupCode, normaliseCode } from './saveCode';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** A save with something in every field, both unlocks owned. */
const RICH: Profile = {
  version: 3,
  coins: 840,
  level: 6,
  xp: 125,
  stats: { speed: 4, power: 3, jump: 2, control: 5 },
  ladderWins: 4,
  dailyWinDate: '2026-10-25',
  totals: { matches: 23, wins: 14, draws: 3, losses: 6, goalsFor: 51, goalsAgainst: 27, styleGoals: 9, xpEarned: 2140 },
  powerMoves: { owned: ['energyWave'], equipped: 'energyWave' },
  powerForms: { owned: ['golden'], equipped: 'golden' },
  career: { stars: { 'backyard-1': 1, 'backyard-2': 1, 'backyard-3': 3, 'backyard-4': 2 }, milestonesPaid: 1, lossStreaks: { 'backyard-boss': 2 } },
};

/** What a code with no career fields loads: the retro star per ladder win and nothing else. */
const RETRO_ONLY = { stars: { 'backyard-1': 1, 'backyard-2': 1, 'backyard-3': 1, 'backyard-4': 1 }, milestonesPaid: 0, lossStreaks: {} };

describe('save code', () => {
  it('a profile survives a round trip', () => {
    expect(decodeSaveCode(encodeSaveCode(RICH))).toEqual(RICH);
  });

  it('a new profile survives a round trip', () => {
    expect(decodeSaveCode(encodeSaveCode(newProfile()))).toEqual(newProfile());
  });

  it('only the alphabet and dashes appear, in groups of 5', () => {
    for (const p of [RICH, newProfile()]) {
      const code = encodeSaveCode(p);
      expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{1,5}(-[0-9A-HJKMNP-TV-Z]{1,5})*$/);
      expect(code.split('-').slice(0, -1).every(g => g.length === 5)).toBe(true);
    }
  });

  it('lowercase, spaces, missing dashes and O for 0 still decode', () => {
    const code = encodeSaveCode(RICH);
    const typed = code.toLowerCase().replaceAll('-', ' ').replaceAll('0', 'o').replaceAll('1', 'l');
    expect(decodeSaveCode(typed)).toEqual(RICH);
    expect(decodeSaveCode(code.replaceAll('-', ''))).toEqual(RICH);
  });

  it('one wrong character fails the checksum', () => {
    const chars = normaliseCode(encodeSaveCode(RICH));
    for (let i = 0; i < chars.length; i++) {
      const swapped = ALPHABET[(ALPHABET.indexOf(chars[i]) + 1) % ALPHABET.length];
      expect(decodeSaveCode(chars.slice(0, i) + swapped + chars.slice(i + 1)), `position ${i}`).toBeNull();
    }
  });

  it('empty and junk input decode to null', () => {
    for (const junk of ['', '----', 'HELLO']) expect(decodeSaveCode(junk), junk).toBeNull();
  });

  it('a code from a newer build with an extra field still loads', () => {
    const fields = decodeFields(encodeSaveCode(RICH));
    expect(fields).not.toBeNull();
    const newer = [4, ...(fields ?? []).slice(1), 77];
    expect(decodeSaveCode(encodeFields(newer))).toEqual(RICH);
  });

  it('a code from an older build missing the last fields loads them as defaults', () => {
    const fields = decodeFields(encodeSaveCode(RICH)) ?? [];
    const older = decodeSaveCode(encodeFields(fields.slice(0, 18)));
    expect(older).toEqual({ ...RICH, powerMoves: { owned: [], equipped: null }, powerForms: { owned: ['golden'], equipped: 'golden' }, career: RETRO_ONLY });
  });

  it('a v2 code loads with the retro stars and nothing else', () => {
    const fields = decodeFields(encodeSaveCode(RICH)) ?? [];
    const v2 = decodeSaveCode(encodeFields([2, ...fields.slice(1, 22)]));
    expect(v2?.career).toEqual(RETRO_ONLY);
  });

  it('rung loss streaks do not travel, the boss streak does', () => {
    const p = { ...RICH, career: { ...RICH.career, lossStreaks: { 'backyard-3': 4, 'backyard-boss': 2 } } };
    expect(decodeSaveCode(encodeSaveCode(p))?.career.lossStreaks).toEqual({ 'backyard-boss': 2 });
  });

  it('a tampered code that passes the checksum loads clamped', () => {
    const fields = decodeFields(encodeSaveCode(RICH)) ?? [];
    const tampered = [...fields];
    tampered[3] = 2 ** 40;
    for (let i = 4; i < 8; i++) tampered[i] = 99;
    const p = decodeSaveCode(encodeFields(tampered));
    expect(p?.xp).toBe(1_000_000);
    expect(p?.stats).toEqual({ speed: 10, power: 10, jump: 10, control: 10 });
  });

  it('normalises and groups typed text', () => {
    expect(normaliseCode('ab-cd oi l u!')).toBe('ABCD011');
    expect(groupCode('ABCDEFGHJKM')).toBe('ABCDE-FGHJK-M');
    expect(groupCode('')).toBe('');
  });
});
