import { describe, expect, it } from 'vitest';
import { matchById } from '../meta/career';
import type { MatchScene } from './matchScene';
import { startMatch } from './startMatch';
import { testContext } from './testContext';

describe('startMatch', () => {
  it('starts the chosen career match', () => {
    const s = startMatch(testContext(), matchById('backyard-2')!) as MatchScene;
    expect(s.kind).toBe('match');
    expect(s.match.id).toBe('backyard-2');
  });
});
