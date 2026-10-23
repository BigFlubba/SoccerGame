import { VOLUME_MAX } from '../meta/settings';
import { CUES, type Cue, type Voice } from './cues';

export type CrowdLevel = 'off' | 'low' | 'match';

/** The game's sound: Web Audio behind a surface that never throws and does nothing until unlocked. */
export interface GameAudio {
  /** A context can be made at all. */
  readonly available: boolean;
  /** The context is running. */
  readonly unlocked: boolean;
  /** Creates or resumes the context; safe to call any number of times; never throws. */
  unlock(): void;
  /** 0–VOLUME_MAX each. */
  setVolumes(music: number, sfx: number): void;
  /** Ignored while locked, and if the same cue played less than its minGapS ago. */
  play(cue: Cue): void;
  /** Remembered while locked and applied on unlock. */
  setCrowd(level: CrowdLevel): void;
  suspend(): void;
  resume(): void;
}

/** Even 10/10 stays well short of harsh. */
const MASTER_GAIN = 0.7;
/** The crowd sits well under everything else; scaled by the SFX bus. */
export const CROWD_GAIN: Readonly<Record<CrowdLevel, number>> = { off: 0, low: 0.04, match: 0.12 };
const CROWD_FILTER_HZ = 500;
/** How quickly the crowd level glides to a new value, seconds. */
const CROWD_GLIDE_S = 0.25;
const NOISE_S = 1;
const DEFAULT_ATTACK_S = 0.005;
/** Exponential ramps can't reach zero; this is silent. */
const SILENT = 0.0001;
/** Sources stop this long after their envelope ends. */
const TAIL_S = 0.05;
const DEFAULT_VOLUME = 5;

/** A volume level as a gain: squared, so the low end of the slider is usable. */
export function volumeGain(level: number): number {
  return (Math.min(Math.max(level, 0), VOLUME_MAX) / VOLUME_MAX) ** 2;
}

interface Graph {
  ctx: AudioContext;
  master: GainNode;
  music: GainNode;
  sfx: GainNode;
  noise: AudioBuffer;
  crowd: GainNode;
}

function buildGraph(ctx: AudioContext): Graph {
  const master = ctx.createGain();
  master.gain.value = MASTER_GAIN;
  master.connect(ctx.destination);
  const music = ctx.createGain();
  music.connect(master);
  const sfx = ctx.createGain();
  sfx.connect(master);

  const noise = ctx.createBuffer(1, Math.round(ctx.sampleRate * NOISE_S), ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  // One looping crowd, made once: its level is all that ever changes.
  const crowd = ctx.createGain();
  crowd.gain.value = 0;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = CROWD_FILTER_HZ;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  src.connect(band).connect(crowd).connect(sfx);
  src.start();
  return { ctx, master, music, sfx, noise, crowd };
}

/** Schedules one voice on the SFX bus. */
function playVoice(g: Graph, v: Voice, now: number): void {
  const { ctx } = g;
  const t0 = now + (v.at ?? 0);
  const t1 = t0 + v.dur;
  const env = ctx.createGain();
  env.gain.setValueAtTime(SILENT, t0);
  env.gain.linearRampToValueAtTime(v.gain, t0 + Math.min(v.attack ?? DEFAULT_ATTACK_S, v.dur));
  env.gain.exponentialRampToValueAtTime(SILENT, t1);
  env.connect(g.sfx);

  let src: AudioScheduledSourceNode;
  let pitch: AudioParam;
  if (v.wave === 'noise') {
    const s = ctx.createBufferSource();
    s.buffer = g.noise;
    s.loop = true;
    src = s;
    const f = ctx.createBiquadFilter();
    f.type = v.filter?.type ?? 'bandpass';
    if (v.filter?.q !== undefined) f.Q.value = v.filter.q;
    pitch = f.frequency;
    s.connect(f).connect(env);
  } else {
    const o = ctx.createOscillator();
    o.type = v.wave;
    src = o;
    pitch = o.frequency;
    if (v.filter) {
      const f = ctx.createBiquadFilter();
      f.type = v.filter.type;
      f.frequency.value = v.freq * 2;
      if (v.filter.q !== undefined) f.Q.value = v.filter.q;
      o.connect(f).connect(env);
    } else {
      o.connect(env);
    }
    if (v.vibrato) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = v.vibrato.hz;
      const depth = ctx.createGain();
      depth.gain.value = v.vibrato.depth;
      lfo.connect(depth).connect(o.frequency);
      lfo.start(t0);
      lfo.stop(t1 + TAIL_S);
    }
  }
  pitch.setValueAtTime(v.freq, t0);
  if (v.toFreq !== undefined) pitch.exponentialRampToValueAtTime(v.toFreq, t1);
  src.start(t0);
  src.stop(t1 + TAIL_S);
}

/** The game's audio. `makeContext` is null where Web Audio doesn't exist (and in tests). */
export function createAudio(makeContext: (() => AudioContext) | null): GameAudio {
  let make = makeContext;
  let graph: Graph | null = null;
  let crowdLevel: CrowdLevel = 'off';
  let volumes = { music: DEFAULT_VOLUME, sfx: DEFAULT_VOLUME };
  let resumeOnShow = false;
  const lastPlayed = new Map<Cue, number>();

  const running = () => graph?.ctx.state === 'running';

  const applyVolumes = () => {
    if (!graph) return;
    graph.music.gain.value = volumeGain(volumes.music);
    graph.sfx.gain.value = volumeGain(volumes.sfx);
  };
  const applyCrowd = () => {
    if (!graph || !running()) return;
    graph.crowd.gain.setTargetAtTime(CROWD_GAIN[crowdLevel], graph.ctx.currentTime, CROWD_GLIDE_S);
  };
  const safely = (f: () => void) => {
    try {
      f();
    } catch {
      // Audio is a nicety: a browser that refuses it must never stop the game.
    }
  };

  return {
    get available() {
      return make !== null;
    },
    get unlocked() {
      return running();
    },
    unlock() {
      safely(() => {
        if (!graph) {
          if (!make) return;
          try {
            graph = buildGraph(make());
          } catch {
            make = null;
            return;
          }
          applyVolumes();
        }
        // A context made inside a key press can already be running.
        if (running()) return applyCrowd();
        graph.ctx.resume().then(applyCrowd, () => {});
      });
    },
    setVolumes(music, sfx) {
      volumes = { music, sfx };
      safely(applyVolumes);
    },
    play(cue) {
      if (!graph || !running()) return;
      const g = graph;
      safely(() => {
        const now = g.ctx.currentTime;
        const last = lastPlayed.get(cue);
        if (last !== undefined && now - last < CUES[cue].minGapS) return;
        lastPlayed.set(cue, now);
        for (const v of CUES[cue].voices) playVoice(g, v, now);
      });
    },
    setCrowd(level) {
      crowdLevel = level;
      safely(applyCrowd);
    },
    suspend() {
      if (!graph) return;
      resumeOnShow = running();
      const ctx = graph.ctx;
      safely(() => void ctx.suspend().catch(() => {}));
    },
    resume() {
      if (!graph || !resumeOnShow) return;
      resumeOnShow = false;
      const ctx = graph.ctx;
      safely(() => void ctx.resume().then(applyCrowd, () => {}));
    },
  };
}
