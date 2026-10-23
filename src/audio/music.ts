export type Track = 'title' | 'win' | 'lose' | 'draw';

export interface Song {
  bpm: number;
  loop: boolean;
  /** Each part's notes: space-separated 'C5', 'F#4:2', 'Bb3:0.5' or '-:1' for a rest; the default length is 1 beat. */
  parts: readonly { wave: 'square' | 'triangle'; gain: number; notes: string }[];
}

const SEMITONES: Readonly<Record<string, number>> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const A4_HZ = 440;
const A4_MIDI = 69;
const NOTE = /^([A-G])([#b]?)(-?\d)$/;

/** Note tokens as frequencies (null for a rest) and lengths in beats. */
export function parseNotes(s: string): { freq: number | null; beats: number }[] {
  return s
    .trim()
    .split(/\s+/)
    .map(token => {
      const [name, len] = token.split(':');
      const beats = len === undefined ? 1 : Number(len);
      if (name === '-') return { freq: null, beats };
      const m = NOTE.exec(name!);
      if (!m) throw new Error(`bad note '${token}'`);
      const midi = 12 * (Number(m[3]) + 1) + SEMITONES[m[1]!]! + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
      return { freq: A4_HZ * 2 ** ((midi - A4_MIDI) / 12), beats };
    });
}

/** A square lead over a triangle bass, both kept soft under the SFX. */
const lead = (notes: string) => ({ wave: 'square' as const, gain: 0.1, notes });
const bass = (notes: string) => ({ wave: 'triangle' as const, gain: 0.28, notes });

export const SONGS: Readonly<Record<Track, Song>> = {
  // Eight bars in C major: C G Am F | C G F G.
  title: {
    bpm: 140,
    loop: true,
    parts: [
      lead(
        [
          'E5:0.5 G5:0.5 C6 B5:0.5 G5:0.5 E5',
          'D5:0.5 G5:0.5 B5 A5:0.5 G5:0.5 D5',
          'C5:0.5 E5:0.5 A5 G5:0.5 E5:0.5 C5',
          'F5 A5 G5 -',
          'E5:0.5 G5:0.5 C6 D6:0.5 C6:0.5 G5',
          'B5:0.5 A5:0.5 G5 D5 G5',
          'A5:0.5 G5:0.5 F5 E5:0.5 F5:0.5 A5',
          'G5:1.5 F5:0.5 D5 -',
        ].join(' '),
      ),
      bass(['C3 G3 C3 G3', 'G2 D3 G2 D3', 'A2 E3 A2 E3', 'F2 C3 F2 C3', 'C3 G3 C3 G3', 'G2 D3 G2 D3', 'F2 C3 F2 C3', 'G2 D3 G2 B2'].join(' ')),
    ],
  },
  // A rising major arpeggio.
  win: { bpm: 160, loop: false, parts: [lead('C5:0.5 E5:0.5 G5:0.5 C6:0.5 E6:0.5 G6:1.5'), bass('C3 G3 C4:2')] },
  // A falling minor phrase.
  lose: { bpm: 120, loop: false, parts: [lead('E5 D5 C5 B4 A4:2'), bass('A2:2 E2:2 A2:2')] },
  // A neutral two-note shrug.
  draw: { bpm: 120, loop: false, parts: [lead('C5 G4:2'), bass('C3 G2:2')] },
};
