import { describe, expect, it } from 'vitest';
import { matchById } from '../meta/career';
import type { MatchScene } from './matchScene';
import { startMatch } from './startMatch';
import { testContext } from './testContext';
import { frame } from './testInput';
import type { VsScene } from './vsScene';

const STEP = 1 / 60;

describe('startMatch', () => {
  it('shows the VS card for the chosen match, and A on it kicks off that match', () => {
    const s = startMatch(testContext(), matchById('backyard-2')!) as VsScene;
    expect(s.kind).toBe('vs');
    expect(s.match.id).toBe('backyard-2');
    const match = s.update(frame(['confirm']), STEP) as MatchScene;
    expect(match.kind).toBe('match');
    expect(match.match.id).toBe('backyard-2');
  });

  it('B on the card goes back out', () => {
    const s = startMatch(testContext(), matchById('backyard-2')!);
    expect(s.update(frame(['back']), STEP)?.kind).toBe('hub');
  });
});
