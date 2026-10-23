import type { Cue } from './cues';
import type { Track } from './music';
import type { CrowdLevel, GameAudio } from './synth';

/** Test audio: always unlocked, and records every cue played, the crowd level and the music asked for. */
export function recordingAudio(): GameAudio & { played: Cue[]; crowd: CrowdLevel; music: Track | null } {
  const rec = {
    available: true,
    unlocked: true,
    played: [] as Cue[],
    crowd: 'off' as CrowdLevel,
    music: null as Track | null,
    unlock() {},
    setVolumes() {},
    play(cue: Cue) {
      rec.played.push(cue);
    },
    setCrowd(level: CrowdLevel) {
      rec.crowd = level;
    },
    playMusic(track: Track | null) {
      rec.music = track;
    },
    suspend() {},
    resume() {},
  };
  return rec;
}
