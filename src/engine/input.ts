export type Action = 'left' | 'right' | 'up' | 'down' | 'jump' | 'shoot' | 'chip' | 'power' | 'steal' | 'stepover' | 'flick' | 'sprint' | 'pause' | 'confirm' | 'back';

export interface InputFrame {
  /** -1..1: deadzoned stick, D-pad or arrows. Up is -1. */
  moveX: number;
  moveY: number;
  held: ReadonlySet<Action>;
  pressed: ReadonlySet<Action>;
  released: ReadonlySet<Action>;
  /** Text typed this frame in text mode, with Backspace as '\b'; always '' outside it. */
  typed: string;
}

export interface PadSnapshot {
  buttons: readonly { pressed: boolean; value: number }[];
  axes: readonly number[];
}

interface Actions {
  held: Set<Action>;
  moveX: number;
  moveY: number;
}

export const STICK_DEADZONE = 0.25;
export const TRIGGER_THRESHOLD = 0.3;
/** How far the stick must lean to count as a direction (menus). */
const STICK_DIRECTION_THRESHOLD = 0.5;
/** The right stick pushed this far, up or down its stronger way, does a trick: up a rainbow flick, down a stepover... */
export const RIGHT_STICK_TRICK = 0.75;
/** ...once a push: it fires again only after coming back inside this. */
export const RIGHT_STICK_REARM = 0.3;
/** Standard mapping: the right stick's axes. */
const RIGHT_X = 2;
const RIGHT_Y = 3;

/** The right stick's trick, held from its push until the stick comes back to the middle, so a push fires once. */
export interface StickLatch {
  action: Action | null;
}

function rightStickAction(x: number, y: number, latch: StickLatch): Action | null {
  if (latch.action) {
    if (Math.hypot(x, y) <= RIGHT_STICK_REARM) latch.action = null;
    return latch.action;
  }
  if (Math.abs(y) < Math.abs(x) || Math.abs(y) < RIGHT_STICK_TRICK) return null;
  latch.action = y < 0 ? 'flick' : 'stepover';
  return latch.action;
}

/** Xbox standard mapping: button index → actions. */
const PAD_BUTTONS: Readonly<Record<number, readonly Action[]>> = {
  0: ['jump', 'confirm'], // A
  1: ['chip', 'back'], // B
  2: ['shoot'], // X
  3: ['power'], // Y
  4: ['steal'], // LB
  9: ['pause'], // Start
  12: ['up'],
  13: ['down'],
  14: ['left'],
  15: ['right'],
};
const PAD_RT = 7;

const KEYS: Readonly<Record<string, readonly Action[]>> = {
  ArrowLeft: ['left'],
  ArrowRight: ['right'],
  ArrowUp: ['up'],
  ArrowDown: ['down'],
  KeyZ: ['jump', 'confirm'],
  KeyX: ['shoot'],
  KeyC: ['chip', 'back'],
  KeyV: ['power'],
  KeyA: ['steal'],
  KeyD: ['stepover'],
  KeyF: ['flick'],
  ShiftLeft: ['sprint'],
  ShiftRight: ['sprint'],
  Enter: ['pause', 'confirm'],
  Escape: ['pause', 'back'],
  Backspace: ['back'],
};

const deadzone = (v: number): number => (Math.abs(v) < STICK_DEADZONE ? 0 : v);

/** -1, 0 or 1 from a pair of opposing direction actions. */
const axisFrom = (held: ReadonlySet<Action>, neg: Action, pos: Action): number => (held.has(pos) ? 1 : 0) - (held.has(neg) ? 1 : 0);

/** The value with the larger magnitude; ties keep the first. */
const stronger = (a: number, b: number): number => (Math.abs(b) > Math.abs(a) ? b : a);

/** The pad's actions; `latch` carries the right stick's trick from one poll to the next. */
export function padActions(pad: PadSnapshot | null, latch: StickLatch = { action: null }): Actions {
  const held = new Set<Action>();
  if (!pad) return { held, moveX: 0, moveY: 0 };
  pad.buttons.forEach((b, i) => {
    if (b.pressed) for (const a of PAD_BUTTONS[i] ?? []) held.add(a);
  });
  if ((pad.buttons[PAD_RT]?.value ?? 0) > TRIGGER_THRESHOLD) held.add('sprint');

  const stickX = deadzone(pad.axes[0] ?? 0);
  const stickY = deadzone(pad.axes[1] ?? 0);
  const moveX = stronger(axisFrom(held, 'left', 'right'), stickX);
  const moveY = stronger(axisFrom(held, 'up', 'down'), stickY);
  if (stickX <= -STICK_DIRECTION_THRESHOLD) held.add('left');
  if (stickX >= STICK_DIRECTION_THRESHOLD) held.add('right');
  if (stickY <= -STICK_DIRECTION_THRESHOLD) held.add('up');
  if (stickY >= STICK_DIRECTION_THRESHOLD) held.add('down');
  const trick = rightStickAction(pad.axes[RIGHT_X] ?? 0, pad.axes[RIGHT_Y] ?? 0, latch);
  if (trick) held.add(trick);
  return { held, moveX, moveY };
}

export function keyActions(keysDown: ReadonlySet<string>): Actions {
  const held = new Set<Action>();
  for (const code of keysDown) for (const a of KEYS[code] ?? []) held.add(a);
  return { held, moveX: axisFrom(held, 'left', 'right'), moveY: axisFrom(held, 'up', 'down') };
}

/** Gamepad and keyboard together: union of held, stronger movement per axis. */
export function mergeActions(a: Actions, b: Actions): Actions {
  return { held: new Set([...a.held, ...b.held]), moveX: stronger(a.moveX, b.moveX), moveY: stronger(a.moveY, b.moveY) };
}

/** Turns successive held sets into pressed/released edges. */
export class InputTracker {
  private prev: ReadonlySet<Action> = new Set();

  next(held: ReadonlySet<Action>, moveX: number, moveY: number, typed = ''): InputFrame {
    const pressed = new Set([...held].filter(a => !this.prev.has(a)));
    const released = new Set([...this.prev].filter(a => !held.has(a)));
    this.prev = new Set(held);
    return { moveX, moveY, held: this.prev, pressed, released, typed };
  }
}

/** The keys that still act while typing: Enter submits, Esc leaves, the arrows move. */
const TEXT_MODE_KEYS: ReadonlySet<string> = new Set(['Enter', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

/**
 * Polls the first connected gamepad and the keyboard once per frame. Keys
 * are released on window blur so alt-tabbing never leaves one stuck down.
 * takePadLost() reports, once, that a gamepad was disconnected.
 *
 * In text mode (for typing a save code or a name) the keyboard types
 * instead of acting: every key but Enter, Esc and the arrows becomes
 * text, and pastes arrive as text too. Ctrl and Cmd shortcuts are left
 * to the browser, so pasting works.
 */
export function createInput(target: Window): {
  poll(): InputFrame;
  releaseAll(): void;
  takePadLost(): boolean;
  setTextMode(on: boolean): void;
} {
  const keysDown = new Set<string>();
  const tracker = new InputTracker();
  const rightStick: StickLatch = { action: null };
  let padLost = false;
  let textMode = false;
  let typed = '';
  target.addEventListener('gamepaddisconnected', () => (padLost = true));

  // A repeat never holds a key: one held across a text-mode switch (which lets go of every key) would be pressed again.
  target.addEventListener('keydown', e => {
    if (textMode) {
      if (e.ctrlKey || e.metaKey) return;
      if (TEXT_MODE_KEYS.has(e.code)) {
        if (!e.repeat) keysDown.add(e.code);
      } else if (e.key === 'Backspace') typed += '\b';
      else if (e.key.length === 1) typed += e.key;
      else return;
      e.preventDefault();
      return;
    }
    if (!KEYS[e.code]) return;
    e.preventDefault();
    if (!e.repeat) keysDown.add(e.code);
  });
  target.addEventListener('keyup', e => keysDown.delete(e.code));
  target.addEventListener('paste', e => {
    if (!textMode) return;
    typed += e.clipboardData?.getData('text') ?? '';
    e.preventDefault();
  });
  const releaseAll = () => keysDown.clear();
  target.addEventListener('blur', releaseAll);

  return {
    poll() {
      const pad = target.navigator.getGamepads?.().find(p => p?.connected) ?? null;
      const merged = mergeActions(padActions(pad, rightStick), keyActions(keysDown));
      const text = typed;
      typed = '';
      return tracker.next(merged.held, merged.moveX, merged.moveY, text);
    },
    releaseAll,
    setTextMode(on) {
      if (on === textMode) return;
      textMode = on;
      typed = '';
      keysDown.clear();
    },
    takePadLost() {
      const lost = padLost;
      padLost = false;
      return lost;
    },
  };
}
