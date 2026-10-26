import { LADDER_MATCHES, trainingLine } from './ladder';
import type { BonusId } from './objectives';
import type { Profile } from './profile';

export type VenueId = 'backyard' | 'park' | 'school' | 'stadium' | 'worldCup';

export interface CareerMatch {
  id: string;
  venue: VenueId;
  kind: 'rung' | 'boss';
  /** 1–10 for a rung, 0 for a boss. */
  rung: number;
  /** On the venue screen and VS card. */
  name: string;
  /** On the HUD and Results. */
  hudName: string;
  bonus: BonusId;
}

export interface Venue {
  id: VenueId;
  name: string;
  matches: readonly CareerMatch[];
}

/** What the progress queries read. Task 5's profile carries the career; until then the field is optional. */
type Progress = Pick<Profile, 'ladderWins'> & { career?: { stars: Record<string, number> } };

export type MatchState = 'beaten' | 'next' | 'locked';

export const rungId = (n: number): string => `backyard-${n}`;
export const BOSS_ID = 'backyard-boss';

/** A match's stars at most. */
const STARS_PER_MATCH = 3;
/** The Backyard's rungs and boss can earn this many. */
export const VENUE_STARS = (LADDER_MATCHES + 1) * STARS_PER_MATCH;
/** Later venues: four matches and a boss. */
const LATER_VENUE_MATCHES = 5;
const LATER_VENUES = 4;
export const TOTAL_STARS = VENUE_STARS + LATER_VENUES * LATER_VENUE_MATCHES * STARS_PER_MATCH;

const RUNG_BONUSES: readonly BonusId[] = ['score3', 'cleanSheet', 'header', 'chip', 'volley', 'perfect', 'early', 'winBy3', 'twoStyle', 'win3Nil'];

const BOSS_NAME = 'BISCUIT THE DOG';
const BOSS_HUD_NAME = 'BISCUIT';

const rungMatch = (n: number): CareerMatch => ({ id: rungId(n), venue: 'backyard', kind: 'rung', rung: n, name: 'MAX', hudName: 'MAX', bonus: RUNG_BONUSES[n - 1]! });
const BOSS: CareerMatch = { id: BOSS_ID, venue: 'backyard', kind: 'boss', rung: 0, name: BOSS_NAME, hudName: BOSS_HUD_NAME, bonus: 'noBossGoals' };

export const BACKYARD: Venue = {
  id: 'backyard',
  name: 'BACKYARD',
  matches: [...Array(LADDER_MATCHES)].map((_, i) => rungMatch(i + 1)).concat(BOSS),
};

/** The venues in career order; only the Backyard has matches in 7a. */
export const VENUES: readonly Venue[] = [
  BACKYARD,
  { id: 'park', name: 'THE PARK', matches: [] },
  { id: 'school', name: 'SCHOOL', matches: [] },
  { id: 'stadium', name: 'STADIUM', matches: [] },
  { id: 'worldCup', name: 'WORLD CUP', matches: [] },
];

const ALL_MATCHES: readonly CareerMatch[] = VENUES.flatMap(v => v.matches);
const BY_ID = new Map(ALL_MATCHES.map(m => [m.id, m]));

/** Every match id, in venue order. */
export const MATCH_IDS: readonly string[] = ALL_MATCHES.map(m => m.id);

export function matchById(id: string): CareerMatch | undefined {
  return BY_ID.get(id);
}

const venueById = (id: VenueId): Venue => VENUES.find(v => v.id === id)!;

/** His best stars at a match; 0 when he has none there. */
export function starsAt(p: Progress, id: string): number {
  return p.career?.stars[id] ?? 0;
}

/** A rung is beaten by the ladder wins; a boss by its star. */
export function isBeaten(p: Progress, m: CareerMatch): boolean {
  return m.kind === 'rung' ? p.ladderWins >= m.rung : starsAt(p, m.id) >= 1;
}

/** The first unbeaten Backyard match in order; the boss once every match is beaten, as a replay. */
export function nextCareerMatch(p: Progress): CareerMatch {
  return BACKYARD.matches.find(m => !isBeaten(p, m)) ?? BOSS;
}

export function matchState(p: Progress, m: CareerMatch): MatchState {
  if (isBeaten(p, m)) return 'beaten';
  if (m.kind === 'boss' && p.ladderWins < LADDER_MATCHES) return 'locked';
  return nextCareerMatch(p).id === m.id ? 'next' : 'locked';
}

export function venueStars(p: Progress, venue: VenueId): number {
  return venueById(venue).matches.reduce((sum, m) => sum + starsAt(p, m.id), 0);
}

export function careerStars(p: Progress): number {
  return VENUES.reduce((sum, v) => sum + venueStars(p, v.id), 0);
}

/** A venue is done when its boss is beaten. */
export function venueDone(p: Progress, venue: VenueId): boolean {
  const boss = venueById(venue).matches.find(m => m.kind === 'boss');
  return boss !== undefined && isBeaten(p, boss);
}

/** Every match in every open venue is beaten. */
export function allBeaten(p: Progress): boolean {
  return ALL_MATCHES.every(m => isBeaten(p, m));
}

/** The line under a stop on the road map. */
export function stopLabel(p: Progress, venue: VenueId): string {
  if (venue === 'backyard') return `${venueStars(p, venue)}/${VENUE_STARS}`;
  if (venue === 'park' && venueDone(p, 'backyard')) return 'COMING SOON';
  return 'LOCKED';
}

/** The Hub card's two career lines; the second is null when there is nothing to add. */
export function careerCardLines(p: Progress): { first: string; second: string | null } {
  if (venueDone(p, 'backyard')) return { first: `BACKYARD DONE! STARS ${venueStars(p, 'backyard')}/${VENUE_STARS}`, second: 'THE PARK: COMING SOON' };
  const next = nextCareerMatch(p);
  if (next.kind === 'boss') return { first: `NEXT: ${next.name}`, second: 'BACKYARD BOSS!' };
  return { first: `NEXT: ${next.name} - MATCH ${next.rung}/${LADDER_MATCHES}`, second: trainingLine(next.rung) };
}
