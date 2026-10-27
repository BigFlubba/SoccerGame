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

type Dials = Partial<Omit<AiProfile, 'style'>>;

/** A kid's profiles: Max's for each difficulty, their style, and the dials they tune. */
const crewProfiles = (id: CrewId, dials: Record<Difficulty, Dials>): Record<Difficulty, AiProfile> => ({
  easy: { ...DIFFICULTY.easy, ...dials.easy, style: STYLES[id] },
  normal: { ...DIFFICULTY.normal, ...dials.normal, style: STYLES[id] },
  hard: { ...DIFFICULTY.hard, ...dials.hard, style: STYLES[id] },
});

/**
 * Each kid's three difficulty profiles, measured by crewTuning.test.ts on
 * seeds 100–163 against the scripted Harrison a level up. Mutable like
 * DIFFICULTY, so headless sweeps can tune them at runtime.
 */
export const CREW_PROFILES: Record<CrewId, Record<Difficulty, AiProfile>> = {
  // Big Brick: hardly slides. Measured E 0.828, N 0.594, H 0.031; defends 85 px deeper than Max, a third of his slides.
  brick: crewProfiles('brick', {
    easy: { aggression: 0.1, shootRange: 190 },
    normal: { aggression: 0.2, shootRange: 200, paceFactor: 1.05 },
    hard: { aggression: 0.4, shootRange: 210, paceFactor: 1.2, cleanSteal: 0.4, reactionS: 0.08 },
  }),
  // Boomer Leo: shoots from around halfway, with a full wind-up. Measured E 0.859, N 0.625, H 0.063; his shots start 81 px further out than Max's.
  leo: crewProfiles('leo', {
    easy: { shootRange: 300 },
    normal: { shootRange: 360, cleanSteal: 0.65, reactionS: 0.14, paceFactor: 1.06 },
    hard: { shootRange: 380, cleanSteal: 0.45, paceFactor: 1.15, reactionS: 0.08 },
  }),
  // Tricky Tia: fakes anyone standing in her path, shoots only from close in. Measured E 0.766, N 0.594, H 0.016; 5.6 fakes a match.
  tia: crewProfiles('tia', {
    easy: { shootRange: 100, aggression: 0.25 },
    normal: { shootRange: 110, aggression: 0.5 },
    hard: { shootRange: 120, aggression: 0.75 },
  }),
  pete: crewProfiles('pete', { easy: {}, normal: {}, hard: {} }),
};
