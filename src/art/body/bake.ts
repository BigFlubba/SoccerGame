import type { HeadSprite } from '../harrison/head';
import type { IndexedImage } from '../indexedImage';
import { CLIPS, type AnimationClip, type AnimName } from './animations';
import { drawFigure } from './drawFigure';
import { lerpPose, mirrorPose, type HeadFacing, type Pose } from './pose';
import type { BodyProportions } from './proportions';

export interface BakedClip {
  name: AnimName;
  frames: IndexedImage[];
  fps: number;
  loop: boolean;
}

/** Evenly samples a clip's keys into one pose per frame (see the plan's sampling rules). */
export function samplePoses(clip: AnimationClip): Pose[] {
  const { keys, loop } = clip;
  const n = clip.mirrorHalf ? clip.frameCount / 2 : clip.frameCount;
  const k = keys.length;
  const half = Array.from({ length: n }, (_, i) => {
    const u = clip.mirrorHalf || loop ? (i * k) / n : n === 1 ? 0 : (i * (k - 1)) / (n - 1);
    const lo = Math.floor(u);
    return lerpPose(keys[lo % k]!, keys[Math.ceil(u) % k]!, u - lo);
  });
  return clip.mirrorHalf ? [...half, ...half.map(mirrorPose)] : half;
}

export function bakeClip(clip: AnimationClip, body: BodyProportions, heads: Record<HeadFacing, HeadSprite>): BakedClip {
  return {
    name: clip.name,
    frames: samplePoses(clip).map(p => drawFigure(p, body, heads)),
    fps: clip.fps,
    loop: clip.loop,
  };
}

export function bakeAll(body: BodyProportions, heads: Record<HeadFacing, HeadSprite>): Record<AnimName, BakedClip> {
  const entries = (Object.keys(CLIPS) as AnimName[]).map(name => [name, bakeClip(CLIPS[name], body, heads)] as const);
  return Object.fromEntries(entries) as Record<AnimName, BakedClip>;
}

export function frameIndexAt(clip: Pick<BakedClip, 'frames' | 'fps' | 'loop'>, timeMs: number): number {
  const i = Math.floor((timeMs * clip.fps) / 1000);
  return clip.loop ? i % clip.frames.length : Math.min(i, clip.frames.length - 1);
}
