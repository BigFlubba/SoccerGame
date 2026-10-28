import { describe, expect, it } from 'vitest';
import { DOG_DIFFICULTY } from '../game/dog';
import type { Player } from '../game/player';
import { BASE_STATS } from '../game/stats';
import { createWorld, type World } from '../game/world';
import { fakeArt, recordingContext } from './testDraw';
import { drawTrickMarks } from './trickView';

const MARK = 'art.text(?,1,white,outline)';
const CAM = { x: 200 };

function marksIn(w: World): string[] {
  const { g, drawn } = recordingContext();
  drawTrickMarks(g, CAM, w, fakeArt(), 0);
  return drawn;
}

const fooled = (kind: 'confused' | 'stumble'): Player['fooled'] => ({ kind, leftS: 0.5, totalS: 0.7, swayZ: 32 });
const human = () => createWorld(BASE_STATS, BASE_STATS, 1, { home: 0, away: 0 });
const dog = () => createWorld(BASE_STATS, BASE_STATS, 1, { home: 0, away: 0 }, null, DOG_DIFFICULTY.normal);

describe('drawTrickMarks', () => {
  it('draws the ? over a confused player', () => {
    const w = human();
    w.away.fooled = fooled('confused');
    expect(marksIn(w)).toEqual([MARK]);
  });

  it('draws the ? over a tilting dog', () => {
    const w = dog();
    w.away.fooled = fooled('confused');
    expect(marksIn(w)).toEqual([MARK]);
  });

  it('draws nothing over a stumbling player, a tumbling dog, or nobody fooled', () => {
    const stumbling = human();
    stumbling.away.fooled = fooled('stumble');
    const tumbling = dog();
    tumbling.away.fooled = fooled('stumble');
    for (const w of [stumbling, tumbling, human(), dog()]) expect(marksIn(w)).toEqual([]);
  });
});
