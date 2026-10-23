import type { AnimName } from '../art/body/animations';
import { bakeAll, frameIndexAt, type BakedClip } from '../art/body/bake';
import { ANCHOR } from '../art/body/pose';
import { HARRISON_BODY } from '../art/body/proportions';
import { MASTER, resolvePalette } from '../art/colors';
import { HARRISON_HEADS, HARRISON_POWER_HEADS } from '../art/harrison/head';
import { harrisonLook, type PowerForm } from '../art/harrison/look';
import { harrisonPortrait, type Expression } from '../art/harrison/portrait';
import { flipX } from '../art/indexedImage';
import type { KitId } from '../art/kits';
import { toCanvas } from '../engine/bitmaps';
import { createScreen } from '../engine/screen';
import { BASE_H, BASE_W } from '../engine/viewport';

const CLIP_ORDER: readonly AnimName[] = ['idle', 'run', 'jump', 'shoot', 'powerUp'];
const KIT_ORDER: readonly KitId[] = ['home', 'away'];
const FORM_ORDER: readonly PowerForm[] = ['base', 'golden', 'storm', 'ultra'];
const EXPRESSION_ORDER: readonly Expression[] = ['neutral', 'celebrate', 'determined', 'disappointed'];

const GROUND_Y = 150;
const PORTRAIT_POS = { x: 6, y: 6 };
/** Pause before a one-shot clip (jump, shoot) replays. */
const REPLAY_PAUSE_MS = 600;
const GAMEPAD = { A: 0, B: 1, X: 2, Y: 3, LEFT: 14, RIGHT: 15 } as const;

interface Frames {
  right: HTMLCanvasElement[];
  left: HTMLCanvasElement[];
}

const next = <T>(list: readonly T[], current: T): T => list[(list.indexOf(current) + 1) % list.length]!;

/** Dev page for reviewing Harrison's sprites and portrait. */
export function startSpriteViewer(canvas: HTMLCanvasElement, status: HTMLElement): void {
  const screen = createScreen(canvas);
  const g = screen.game;

  const baked = { base: bakeAll(HARRISON_BODY, HARRISON_HEADS), power: bakeAll(HARRISON_BODY, HARRISON_POWER_HEADS) };
  const state = { clip: 'idle' as AnimName, kit: 'home' as KitId, form: 'base' as PowerForm, facing: 'right' as 'right' | 'left', expression: 'neutral' as Expression, clipStart: performance.now() };
  const cache = new Map<string, HTMLCanvasElement[] | Frames>();

  const clipFrames = (): { clip: BakedClip; frames: Frames } => {
    const clip = (state.form === 'base' ? baked.base : baked.power)[state.clip];
    const key = `${state.kit}/${state.form}/${state.clip}`;
    let frames = cache.get(key) as Frames | undefined;
    if (!frames) {
      const palette = resolvePalette(harrisonLook(state.kit, state.form));
      frames = { right: clip.frames.map(f => toCanvas(f, palette)), left: clip.frames.map(f => toCanvas(flipX(f), palette)) };
      cache.set(key, frames);
    }
    return { clip, frames };
  };

  const portrait = (): HTMLCanvasElement => {
    const key = `portrait/${state.kit}/${state.form}/${state.expression}`;
    let p = cache.get(key) as HTMLCanvasElement[] | undefined;
    if (!p) {
      p = [toCanvas(harrisonPortrait(state.expression), resolvePalette(harrisonLook(state.kit, state.form)))];
      cache.set(key, p);
    }
    return p[0]!;
  };

  const restart = () => (state.clipStart = performance.now());
  const actions = {
    clip: (name: AnimName) => ((state.clip = name), restart()),
    nextClip: () => actions.clip(next(CLIP_ORDER, state.clip)),
    kit: () => (state.kit = next(KIT_ORDER, state.kit)),
    form: () => (state.form = next(FORM_ORDER, state.form)),
    face: (facing: 'left' | 'right') => (state.facing = facing),
    expression: () => (state.expression = next(EXPRESSION_ORDER, state.expression)),
  };

  window.addEventListener('keydown', e => {
    const n = Number(e.key);
    if (n >= 1 && n <= CLIP_ORDER.length) actions.clip(CLIP_ORDER[n - 1]!);
    else if (e.key === 'k' || e.key === 'K') actions.kit();
    else if (e.key === 'g' || e.key === 'G') actions.form();
    else if (e.key === 'f' || e.key === 'F') actions.face(state.facing === 'right' ? 'left' : 'right');
    else if (e.key === 'e' || e.key === 'E') actions.expression();
  });

  const held = new Set<number>();
  const pollGamepad = () => {
    const pad = navigator.getGamepads?.().find(p => p);
    if (!pad) return;
    const pressed = (b: number) => pad.buttons[b]?.pressed ?? false;
    const edge = (b: number, act: () => void) => {
      if (pressed(b) && !held.has(b)) act();
      if (pressed(b)) held.add(b);
      else held.delete(b);
    };
    edge(GAMEPAD.A, actions.nextClip);
    edge(GAMEPAD.X, actions.kit);
    edge(GAMEPAD.B, actions.form);
    edge(GAMEPAD.Y, actions.expression);
    edge(GAMEPAD.LEFT, () => actions.face('left'));
    edge(GAMEPAD.RIGHT, () => actions.face('right'));
  };

  const drawBackdrop = () => {
    g.fillStyle = MASTER.sky;
    g.fillRect(0, 0, BASE_W, GROUND_Y - 20);
    g.fillStyle = MASTER.skyLight;
    g.fillRect(0, GROUND_Y - 34, BASE_W, 14);
    for (let x = 0; x < BASE_W; x += 32) {
      g.fillStyle = (x / 32) % 2 ? MASTER.grass : MASTER.grassLight;
      g.fillRect(x, GROUND_Y - 20, 32, BASE_H - GROUND_Y + 20);
    }
    g.fillStyle = MASTER.grassDark;
    g.fillRect(0, GROUND_Y + 1, BASE_W, 1);
  };

  const frame = (now: number) => {
    pollGamepad();
    const { clip, frames } = clipFrames();
    let t = now - state.clipStart;
    if (!clip.loop) t %= (clip.frames.length * 1000) / clip.fps + REPLAY_PAUSE_MS;
    const i = frameIndexAt(clip, t);
    const sprite = (state.facing === 'right' ? frames.right : frames.left)[i]!;

    drawBackdrop();
    g.drawImage(sprite, Math.round(BASE_W / 2) - ANCHOR.x, GROUND_Y - ANCHOR.y);
    g.drawImage(portrait(), PORTRAIT_POS.x, PORTRAIT_POS.y);

    screen.present();

    status.textContent = `${state.clip} · ${state.kit} kit · ${state.form} form · facing ${state.facing} · ${state.expression}`;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
