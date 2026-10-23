export const FULL_TIME_MIN = 90,
  GOLDEN_GOAL_MAX_S = 45,
  GOAL_PAUSE_S = 2,
  KICKOFF_S = 1;

/** Float slack so a timer summed from 1/60 steps ends on its exact tick. */
const TIME_EPS = 1e-9;

export type Phase = 'kickoff' | 'playing' | 'goal' | 'fullTime';
export type Team = 'home' | 'away';

export interface MatchState {
  phase: Phase;
  phaseT: number;
  /** Playing seconds; one game minute each. */
  clockS: number;
  goldenGoal: boolean;
  goldenS: number;
  score: { home: number; away: number };
  lastScorer: Team | null;
  kickoffTeam: Team;
  /** From Harrison's (home) side. */
  result: null | 'win' | 'lose' | 'draw';
}

export function createMatch(): MatchState {
  return {
    phase: 'kickoff',
    phaseT: 0,
    clockS: 0,
    goldenGoal: false,
    goldenS: 0,
    score: { home: 0, away: 0 },
    lastScorer: null,
    kickoffTeam: 'home',
    result: null,
  };
}

function enter(m: MatchState, phase: Phase): void {
  m.phase = phase;
  m.phaseT = 0;
}

/** Decides the result from the score. */
function settle(m: MatchState): void {
  const { home, away } = m.score;
  m.result = home > away ? 'win' : home < away ? 'lose' : 'draw';
}

function finish(m: MatchState): void {
  settle(m);
  enter(m, 'fullTime');
}

/** One playing tick: the clock runs, a goal counts first, then full time is checked with the new score. */
function play(m: MatchState, dt: number, goal: 'left' | 'right' | null): void {
  if (m.goldenGoal) m.goldenS += dt;
  else m.clockS = Math.min(FULL_TIME_MIN, m.clockS + dt);

  if (goal) {
    // A ball in the right goal is always a home goal, whoever touched it last.
    const scorer: Team = goal === 'right' ? 'home' : 'away';
    m.score[scorer]++;
    m.lastScorer = scorer;
    m.kickoffTeam = scorer === 'home' ? 'away' : 'home';
    enter(m, 'goal');
    // A golden goal decides the match now, but still gets its GOAL! moment before full time.
    if (m.goldenGoal) return settle(m);
  }

  if (m.goldenGoal) {
    if (m.goldenS >= GOLDEN_GOAL_MAX_S - TIME_EPS) finish(m);
  } else if (m.clockS >= FULL_TIME_MIN - TIME_EPS) {
    if (m.score.home !== m.score.away) finish(m);
    else m.goldenGoal = true;
  }
}

/** Advances the match by dt. `goal` is the goal the ball is in this tick, if any. */
export function stepMatch(m: MatchState, dt: number, goal: 'left' | 'right' | null): { resetForKickoff: boolean } {
  m.phaseT += dt;
  switch (m.phase) {
    case 'playing':
      play(m, dt, goal);
      break;
    case 'goal':
      if (m.phaseT < GOAL_PAUSE_S - TIME_EPS) break;
      if (m.result) {
        enter(m, 'fullTime');
        break;
      }
      enter(m, 'kickoff');
      return { resetForKickoff: true };
    case 'kickoff':
      if (m.phaseT >= KICKOFF_S - TIME_EPS) enter(m, 'playing');
      break;
    case 'fullTime':
      break;
  }
  return { resetForKickoff: false };
}

/** Ends a goal pause early (the goal moment ran its own): the next step kicks off, or goes to full time after a golden goal. */
export function endGoalPause(m: MatchState): void {
  if (m.phase === 'goal') m.phaseT = Math.max(m.phaseT, GOAL_PAUSE_S);
}

/** The minute on the clock: 0..90, staying at 90 through golden goal. */
export function clockMinute(m: MatchState): number {
  return Math.min(FULL_TIME_MIN, Math.floor(m.clockS + TIME_EPS));
}
