import { DIFFICULTY, type AiProfile, type Difficulty, type Style } from './ai';
import type { Stats } from './stats';

/** The Park crew, the local kids who play pickup there. */
export type CrewId = 'brick' | 'leo' | 'tia' | 'pete';

/** Each kid a little stronger overall than the one before, with one standout stat apiece. */
export const CREW_STATS: Readonly<Record<CrewId, Readonly<Stats>>> = {
  brick: { speed: 3, power: 4, jump: 2, control: 4 },
  leo: { speed: 4, power: 6, jump: 2, control: 3 },
  tia: { speed: 5, power: 3, jump: 2, control: 6 },
  pete: { speed: 6, power: 4, jump: 3, control: 4 },
};

const STYLES: Record<CrewId, Style> = { brick: 'blocker', leo: 'shooter', tia: 'dribbler', pete: 'presser' };

const crewProfiles = (id: CrewId): Record<Difficulty, AiProfile> => ({
  easy: { ...DIFFICULTY.easy, style: STYLES[id] },
  normal: { ...DIFFICULTY.normal, style: STYLES[id] },
  hard: { ...DIFFICULTY.hard, style: STYLES[id] },
});

/** Each kid's three difficulty profiles. Mutable like DIFFICULTY, so headless sweeps can tune them at runtime. */
export const CREW_PROFILES: Record<CrewId, Record<Difficulty, AiProfile>> = {
  brick: crewProfiles('brick'),
  leo: crewProfiles('leo'),
  tia: crewProfiles('tia'),
  pete: crewProfiles('pete'),
};
