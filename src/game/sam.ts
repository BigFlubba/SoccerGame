import { DIFFICULTY, type AiProfile, type Difficulty } from './ai';
import type { Handling } from './player';
import type { Stats } from './stats';

/**
 * Speedy Sam, the Park's boss: all gas, no brakes. He's the fastest player
 * in the game, but brakes softly (he skids on every turn and overshoots a
 * drag-back), knocks the ball well ahead (a gap Harrison can step into),
 * and has a weak shot a sprinting Harrison can run down.
 */
export const SAM_STATS: Readonly<Stats> = { speed: 10, power: 1, jump: 3, control: 3 };

/** Starting values; samTuning.test.ts measures them. */
export const SAM_HANDLING: Readonly<Handling> = { decel: 650, touchScale: 1.5, shotScale: 0.55, ballAhead: 48 };

type Dials = Partial<Omit<AiProfile, 'style'>>;
const samProfile = (d: Difficulty, dials: Dials): AiProfile => ({ ...DIFFICULTY[d], shootRange: 90, ...dials, style: 'speedster' });

/** His three difficulty profiles: Max's, with his own pace, range and range-shot odds. Mutable like DIFFICULTY, for headless sweeps. */
export const SAM_PROFILES: Record<Difficulty, AiProfile> = {
  easy: samProfile('easy', { paceFactor: 1, rangeShot: 0.5, kickoffRush: false }),
  normal: samProfile('normal', { paceFactor: 1.08, rangeShot: 0.35, kickoffRush: false, kickoffSpot: { back: 110, off: 12 }, cleanSteal: 0.55, wrongFootedS: 0.2, aggression: 0.45 }),
  hard: samProfile('hard', { paceFactor: 1.08, rangeShot: 0.2, kickoffRush: false, kickoffSpot: { back: 110, off: 12 } }),
};
