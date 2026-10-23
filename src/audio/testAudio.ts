import type { Cue } from './cues';
import type { CrowdLevel, GameAudio } from './synth';

/** Test audio: always unlocked, and records every cue played and the crowd level asked for. */
export function recordingAudio(): GameAudio & { played: Cue[]; crowd: CrowdLevel } {
  const rec = {
    available: true,
    unlocked: true,
    played: [] as Cue[],
    crowd: 'off' as CrowdLevel,
    unlock() {},
    setVolumes() {},
    play(cue: Cue) {
      rec.played.push(cue);
    },
    setCrowd(level: CrowdLevel) {
      rec.crowd = level;
    },
    suspend() {},
    resume() {},
  };
  return rec;
}
