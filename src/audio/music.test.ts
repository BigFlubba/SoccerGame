import { describe, expect, it } from 'vitest';
import { SONGS, parseNotes } from './music';

const beats = (notes: string) => parseNotes(notes).reduce((sum, n) => sum + n.beats, 0);

describe('music', () => {
  it('parses notes, rests and lengths', () => {
    const n = parseNotes('A4 -:2 C#5:0.5');
    expect(n).toHaveLength(3);
    expect(n[0]!.freq).toBeCloseTo(440, 2);
    expect(n[0]!.beats).toBe(1);
    expect(n[1]).toEqual({ freq: null, beats: 2 });
    expect(n[2]!.freq).toBeCloseTo(554.37, 2);
    expect(n[2]!.beats).toBe(0.5);
    expect(parseNotes('Bb3:0.5')[0]!.freq).toBeCloseTo(233.08, 2);
  });

  it("every song's parts have equal total beats", () => {
    for (const [name, song] of Object.entries(SONGS)) {
      const totals = song.parts.map(p => beats(p.notes));
      for (const t of totals) expect(t, name).toBeCloseTo(totals[0]!);
    }
  });

  it('the title theme loops and the jingles do not', () => {
    expect(SONGS.title.loop).toBe(true);
    for (const j of ['win', 'lose', 'draw'] as const) expect(SONGS[j].loop, j).toBe(false);
  });

  it('every jingle lasts at most 3 s', () => {
    for (const j of ['win', 'lose', 'draw'] as const) {
      const song = SONGS[j];
      expect((beats(song.parts[0]!.notes) * 60) / song.bpm, j).toBeLessThanOrEqual(3);
    }
  });

  it('every part is a gentle square or triangle', () => {
    for (const song of Object.values(SONGS)) {
      for (const p of song.parts) {
        expect(['square', 'triangle']).toContain(p.wave);
        expect(p.gain).toBeGreaterThan(0);
        expect(p.gain).toBeLessThanOrEqual(0.5);
      }
    }
  });
});
