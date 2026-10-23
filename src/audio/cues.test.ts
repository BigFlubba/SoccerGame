import { describe, expect, it } from 'vitest';
import { CUES, type Cue } from './cues';

const loudest = (cue: Cue) => Math.max(...CUES[cue].voices.map(v => v.gain));

describe('cue recipes', () => {
  it('every cue has at least one voice', () => {
    for (const [cue, r] of Object.entries(CUES)) expect(r.voices.length, cue).toBeGreaterThan(0);
  });

  it('every voice ends within 2.5 s, and holds no longer than it lasts', () => {
    for (const [cue, r] of Object.entries(CUES)) {
      for (const v of r.voices) {
        expect((v.at ?? 0) + v.dur, cue).toBeLessThanOrEqual(2.5);
        expect((v.attack ?? 0) + (v.hold ?? 0), cue).toBeLessThan(v.dur);
      }
    }
  });

  it('whistle blasts hold at full volume for most of each blast', () => {
    for (const cue of ['whistleShort', 'whistleFull'] as const) {
      for (const v of CUES[cue].voices) expect((v.attack ?? 0) + (v.hold ?? 0), cue).toBeGreaterThanOrEqual(0.7 * v.dur);
    }
  });

  it('every voice has a gain in (0, 1]', () => {
    for (const [cue, r] of Object.entries(CUES)) {
      for (const v of r.voices) {
        expect(v.gain, cue).toBeGreaterThan(0);
        expect(v.gain, cue).toBeLessThanOrEqual(1);
      }
    }
  });

  it('dribble taps and bounces are rate-limited', () => {
    expect(CUES.tap.minGapS).toBeGreaterThanOrEqual(0.06);
    expect(CUES.bounce.minGapS).toBeGreaterThanOrEqual(0.06);
  });

  it('a dribble tap is at most a quarter as loud as a hard kick', () => {
    expect(loudest('tap')).toBeLessThanOrEqual(loudest('kickHard') / 4);
  });

  it('coin ticks are quiet and rate-limited', () => {
    for (const v of CUES.coin.voices) expect(v.gain).toBeLessThanOrEqual(0.1);
    expect(CUES.coin.minGapS).toBeGreaterThanOrEqual(0.04);
  });

  it('the level-up fanfare ends within 1.5 s', () => {
    for (const v of CUES.levelUp.voices) expect((v.at ?? 0) + v.dur).toBeLessThanOrEqual(1.5);
  });

  it('the shop has a ka-ching and a nope', () => {
    expect(CUES.buy.voices.length).toBeGreaterThanOrEqual(2);
    expect(Math.max(...CUES.nope.voices.map(v => v.freq))).toBeLessThan(CUES.menuBack.voices[0]!.freq);
  });
});

