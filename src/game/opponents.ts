import { maxStats } from '../meta/ladder';
import { DIFFICULTY, type AiProfile, type Difficulty } from './ai';
import { CREW_PROFILES, CREW_STATS, type CrewId } from './crew';
import type { Stats } from './stats';

/** Every opponent who plays on a human body. Biscuit has his own. */
export type HumanOpponentId = 'max' | CrewId | 'sam';

// Stand-in until Sam lands (part 2).
const SAM_STAND_IN: CrewId = 'pete';

/** Their stats for the match: Max's come from the ladder rung, everyone else plays at their own. */
export function opponentStats(id: HumanOpponentId, rung: number): Stats {
  if (id === 'max') return maxStats(rung);
  return { ...CREW_STATS[id === 'sam' ? SAM_STAND_IN : id] };
}

export function opponentProfile(id: HumanOpponentId, d: Difficulty): AiProfile {
  if (id === 'max') return DIFFICULTY[d];
  return CREW_PROFILES[id === 'sam' ? SAM_STAND_IN : id][d];
}
