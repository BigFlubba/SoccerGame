/** Controller rumbles: each a short or long pulse. */
export type RumbleKind = 'hardShot' | 'post' | 'tackle' | 'goal' | 'maxGoal' | 'tap';

export const RUMBLE: Readonly<Record<RumbleKind, { ms: number; strong: number; weak: number }>> = {
  hardShot: { ms: 120, strong: 0.5, weak: 0.3 },
  post: { ms: 150, strong: 0.6, weak: 0.4 },
  tackle: { ms: 100, strong: 0.4, weak: 0.6 },
  goal: { ms: 700, strong: 1, weak: 0.8 },
  maxGoal: { ms: 150, strong: 0.2, weak: 0.3 },
  tap: { ms: 80, strong: 0.2, weak: 0.2 },
};

export interface Rumble {
  /** RUMBLE OFF: every pulse is ignored. */
  enabled: boolean;
  pulse(kind: RumbleKind): void;
}

/**
 * Rumbles the first connected pad that can (Chrome and Edge; Firefox can't).
 * Without one, or if the pad refuses, it does nothing, silently.
 */
export function createRumble(getPads: () => readonly (Gamepad | null)[]): Rumble {
  const r: Rumble = {
    enabled: true,
    pulse(kind) {
      if (!r.enabled) return;
      try {
        const actuator = getPads().find(p => p?.connected && p.vibrationActuator)?.vibrationActuator;
        const { ms, strong, weak } = RUMBLE[kind];
        actuator?.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => {});
      } catch {
        // A pad that can't rumble just doesn't.
      }
    },
  };
  return r;
}
