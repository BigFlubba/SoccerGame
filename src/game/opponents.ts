import { maxStats } from '../meta/ladder';
import { DIFFICULTY, type AiProfile, type Difficulty } from './ai';
import { CREW_PROFILES, CREW_STATS, type CrewId } from './crew';
import { NORMAL_HANDLING, type Handling } from './player';
import { SAM_HANDLING, SAM_PROFILES, SAM_STATS } from './sam';
import type { Stats } from './stats';

/** Every opponent who plays on a human body. Biscuit has his own. */
export type HumanOpponentId = 'max' | CrewId | 'sam';

/** Their stats for the match: Max's come from the ladder rung, everyone else plays at their own. */
export function opponentStats(id: HumanOpponentId, rung: number): Stats {
  if (id === 'max') return maxStats(rung);
  return { ...(id === 'sam' ? SAM_STATS : CREW_STATS[id]) };
}

export function opponentProfile(id: HumanOpponentId, d: Difficulty): AiProfile {
  if (id === 'max') return DIFFICULTY[d];
  return id === 'sam' ? SAM_PROFILES[d] : CREW_PROFILES[id][d];
}

/** How they brake, touch and shoot: Sam his own way, everyone else normally. */
export function opponentHandling(id: HumanOpponentId): Handling {
  return id === 'sam' ? SAM_HANDLING : NORMAL_HANDLING;
}
