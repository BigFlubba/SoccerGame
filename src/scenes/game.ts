import { createAudio } from '../audio/synth';
import { createInput, type InputFrame } from '../engine/input';
import { createStepper, startLoop } from '../engine/loop';
import { createScreen } from '../engine/screen';
import { loadSettings, saveSettings, type KeyValueStore } from '../meta/settings';
import { loadGameArt } from './art';
import type { GameContext } from './context';
import type { Scene } from './scene';
import { createPressStartScene } from './titleScene';

const NONE: ReadonlySet<never> = new Set();

/** Folds a new frame into one not yet consumed, so a quick tap between fixed steps isn't lost. */
function carry(pending: InputFrame | null, next: InputFrame): InputFrame {
  if (!pending) return next;
  return { ...next, pressed: new Set([...pending.pressed, ...next.pressed]), released: new Set([...pending.released, ...next.released]) };
}

/** localStorage, or nothing if the browser refuses access to it (some private modes throw). */
function browserStore(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Boots the game: Press Start first, a fixed 60 Hz simulation, drawn every animation frame. */
export function startGame(canvas: HTMLCanvasElement): void {
  const screen = createScreen(canvas);
  const input = createInput(window);
  const store = browserStore();
  const audio = createAudio(typeof AudioContext === 'undefined' ? null : () => new AudioContext());
  const ctx: GameContext = {
    art: loadGameArt(),
    settings: loadSettings(store),
    save(s) {
      ctx.settings = s;
      saveSettings(store, s);
      audio.setVolumes(s.musicVolume, s.sfxVolume);
    },
    audio,
  };
  audio.setVolumes(ctx.settings.musicVolume, ctx.settings.sfxVolume);
  // Browsers only allow sound after a key press or click. Chrome doesn't count a gamepad press, but trying is harmless.
  const unlock = () => audio.unlock();
  window.addEventListener('keydown', unlock);
  window.addEventListener('pointerdown', unlock);
  let scene: Scene = createPressStartScene(ctx);
  let latest = input.poll();
  let pending: InputFrame | null = null;
  let nowS = 0;

  // Each press reaches exactly one fixed step: the first one after it happened.
  const stepper = createStepper(dt => {
    const frame = pending ?? { ...latest, pressed: NONE, released: NONE };
    pending = null;
    if (frame.pressed.size > 0) audio.unlock();
    scene = scene.update(frame, dt) ?? scene;
  });

  // Dev server only (stripped from builds): lets a playtester inspect and stage the current scene.
  if (import.meta.env.DEV) Object.assign(window, { __soccer: { scene: () => scene } });

  // Losing the window or the controller pauses the match (and drops a held charge) before play can go on without him.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      audio.resume();
      return;
    }
    audio.suspend();
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
