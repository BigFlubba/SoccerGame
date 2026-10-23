import { createInput, type InputFrame } from '../engine/input';
import { createStepper, startLoop } from '../engine/loop';
import { createScreen } from '../engine/screen';
import { DIFFICULTY, type Difficulty } from '../game/ai';
import { loadGameArt } from './art';
import type { Scene } from './scene';
import { createTitleScene } from './titleScene';

const NONE: ReadonlySet<never> = new Set();

/** Folds a new frame into one not yet consumed, so a quick tap between fixed steps isn't lost. */
function carry(pending: InputFrame | null, next: InputFrame): InputFrame {
  if (!pending) return next;
  return { ...next, pressed: new Set([...pending.pressed, ...next.pressed]), released: new Set([...pending.released, ...next.released]) };
}

/** `?difficulty=easy|hard` overrides the default for playtesting. */
export function difficultyFrom(search: string): Difficulty {
  const d = new URLSearchParams(search).get('difficulty');
  return d && d in DIFFICULTY ? (d as Difficulty) : 'normal';
}

/** Boots the game: title screen first, a fixed 60 Hz simulation, drawn every animation frame. */
export function startGame(canvas: HTMLCanvasElement): void {
  const screen = createScreen(canvas);
  const input = createInput(window);
  const art = loadGameArt();
  let scene: Scene = createTitleScene(art, difficultyFrom(location.search));
  let latest = input.poll();
  let pending: InputFrame | null = null;
  let nowS = 0;

  // Each press reaches exactly one fixed step: the first one after it happened.
  const stepper = createStepper(dt => {
    const frame = pending ?? { ...latest, pressed: NONE, released: NONE };
    pending = null;
    scene = scene.update(frame, dt) ?? scene;
  });

  // Dev server only (stripped from builds): lets a playtester inspect and stage the current scene.
  if (import.meta.env.DEV) Object.assign(window, { __soccer: { scene: () => scene } });

  // Losing the window or the controller pauses the match (and drops a held charge) before play can go on without him.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    input.releaseAll();
    scene.onHidden?.();
  });
  window.addEventListener('blur', () => scene.onHidden?.());

  startLoop(
    dt => {
      nowS += dt;
      if (input.takePadLost()) scene.onHidden?.();
      latest = input.poll();
      pending = carry(pending, latest);
      stepper.advance(dt);
      scene.draw(screen.game, nowS);
      screen.present();
    },
    e => console.error(e),
  );
}
