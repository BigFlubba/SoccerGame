import type { Rumble, RumbleKind } from './rumble';

/** Test rumble: records every pulse asked for, enabled or not, since the Rumble (not the caller) gates them. */
export function recordingRumble(): Rumble & { pulses: RumbleKind[] } {
  const rec = {
    enabled: true,
    pulses: [] as RumbleKind[],
    pulse(kind: RumbleKind) {
      rec.pulses.push(kind);
    },
  };
  return rec;
}
