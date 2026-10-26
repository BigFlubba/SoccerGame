import { describe, expect, it } from 'vitest';
import { InputTracker, createInput, keyActions, mergeActions, padActions, type PadSnapshot } from './input';

/** A 17-button standard-mapping pad: `buttons` pressed, `values` analog (triggers). */
function fakePad(buttons: Record<number, boolean>, axes: number[] = [0, 0], values: Record<number, number> = {}): PadSnapshot {
  return {
    buttons: Array.from({ length: 17 }, (_, i) => {
      const value = values[i] ?? (buttons[i] ? 1 : 0);
      return { pressed: buttons[i] ?? value > 0.5, value };
    }),
    axes,
  };
}

describe('padActions', () => {
  it('maps the Xbox layout', () => {
    const pad = fakePad({ 0: true, 2: true }, [0, 0], { 7: 0.8 });
    expect([...padActions(pad).held].sort()).toEqual(['confirm', 'jump', 'shoot', 'sprint']);
  });

  it('maps B to chip and back, Start to pause', () => {
    expect([...padActions(fakePad({ 1: true, 9: true })).held].sort()).toEqual(['back', 'chip', 'pause']);
  });

  it('ignores a lightly brushed trigger', () => {
    expect(padActions(fakePad({}, [0, 0], { 7: 0.2 })).held.has('sprint')).toBe(false);
  });

  it('applies the stick deadzone', () => {
    expect(padActions(fakePad({}, [0.2, -0.1])).moveX).toBe(0);
    expect(padActions(fakePad({}, [0.9, 0])).moveX).toBeCloseTo(0.9);
  });

  it('turns the D-pad into full-strength movement', () => {
    const p = padActions(fakePad({ 12: true, 14: true }));
    expect([p.moveX, p.moveY]).toEqual([-1, -1]);
    expect([...p.held].sort()).toEqual(['left', 'up']);
  });

  it('a firmly pushed stick also counts as a direction for menus', () => {
    expect([...padActions(fakePad({}, [0, -0.8])).held]).toEqual(['up']);
  });

  it('Y on the pad and V on the keyboard hold power', () => {
    expect([...padActions(fakePad({ 3: true })).held]).toEqual(['power']);
    expect([...keyActions(new Set(['KeyV'])).held]).toEqual(['power']);
  });

  it('a missing pad holds nothing', () => {
    expect(padActions(null)).toEqual({ held: new Set(), moveX: 0, moveY: 0 });
  });
});

describe('keyActions', () => {
  it('maps keyboard codes', () => {
    expect([...keyActions(new Set(['KeyX', 'ArrowLeft'])).held].sort()).toEqual(['left', 'shoot']);
    expect(keyActions(new Set(['ArrowLeft'])).moveX).toBe(-1);
  });

  it('maps Escape to pause and back', () => {
    expect([...keyActions(new Set(['Escape'])).held].sort()).toEqual(['back', 'pause']);
  });

  it('maps Enter to pause and confirm, Backspace to back', () => {
    expect([...keyActions(new Set(['Enter', 'Backspace'])).held].sort()).toEqual(['back', 'confirm', 'pause']);
  });

  it('opposite arrows cancel out', () => {
    expect(keyActions(new Set(['ArrowLeft', 'ArrowRight'])).moveX).toBe(0);
  });
});

describe('mergeActions', () => {
  it('unions held actions and keeps the stronger movement on each axis', () => {
    const m = mergeActions(padActions(fakePad({ 2: true }, [0.4, 0])), keyActions(new Set(['ArrowLeft', 'KeyZ'])));
    expect([...m.held].sort()).toEqual(['confirm', 'jump', 'left', 'shoot']);
    expect(m.moveX).toBe(-1);
  });
});

describe('InputTracker', () => {
  it('the tracker passes typed text through, and frames default to none', () => {
    const t = new InputTracker();
    expect(t.next(new Set(), 0, 0).typed).toBe('');
    expect(t.next(new Set(), 0, 0, 'ab').typed).toBe('ab');
  });

  it('reports pressed and released edges once', () => {
    const t = new InputTracker();
    expect(t.next(new Set(['shoot']), 0, 0).pressed.has('shoot')).toBe(true);
    expect(t.next(new Set(['shoot']), 0, 0).pressed.has('shoot')).toBe(false);
    expect(t.next(new Set(), 0, 0).released.has('shoot')).toBe(true);
  });

  it('a disconnected pad releases everything it held', () => {
    const t = new InputTracker();
    t.next(padActions(fakePad({ 2: true })).held, 0, 0);
    expect(t.next(padActions(null).held, 0, 0).released.has('shoot')).toBe(true);
  });
});

describe('createInput', () => {
  /** Enough of a Window for createInput: events plus a pad-less navigator. */
  const fakeWindow = () => Object.assign(new EventTarget(), { navigator: { getGamepads: () => [] } }) as unknown as Window;

  /** A keydown with the fields createInput reads. */
  const keydown = (code: string, key: string, mods: { ctrlKey?: boolean } = {}) =>
    Object.assign(new Event('keydown', { cancelable: true }), { code, key, ctrlKey: false, metaKey: false, ...mods });

  it('in text mode Z, X, C and V type letters and act as nothing; Enter and Esc still act', () => {
    const target = fakeWindow();
    const input = createInput(target);
    input.setTextMode(true);
    for (const [code, key] of [['KeyZ', 'z'], ['KeyX', 'x'], ['KeyC', 'c'], ['KeyV', 'v']]) target.dispatchEvent(keydown(code, key));
    const typing = input.poll();
    expect(typing.typed).toBe('zxcv');
    expect([...typing.held]).toEqual([]);
    target.dispatchEvent(keydown('Enter', 'Enter'));
    expect(input.poll().held.has('confirm')).toBe(true);
    target.dispatchEvent(keydown('Escape', 'Escape'));
    expect(input.poll().held.has('back')).toBe(true);
  });

  it('in text mode Backspace types a delete, and typed text is read once', () => {
    const target = fakeWindow();
    const input = createInput(target);
    input.setTextMode(true);
    target.dispatchEvent(keydown('KeyA', 'a'));
    target.dispatchEvent(keydown('Backspace', 'Backspace'));
    const f = input.poll();
    expect(f.typed).toBe('a\b');
    expect(f.held.has('back')).toBe(false);
    expect(input.poll().typed).toBe('');
  });

  it('a paste in text mode arrives as typed text, and Ctrl+V is left to the browser', () => {
    const target = fakeWindow();
    const input = createInput(target);
    input.setTextMode(true);
    const ctrlV = keydown('KeyV', 'v', { ctrlKey: true });
    target.dispatchEvent(ctrlV);
    expect(ctrlV.defaultPrevented).toBe(false);
    target.dispatchEvent(Object.assign(new Event('paste', { cancelable: true }), { clipboardData: { getData: () => 'ab12-CD34' } }));
    expect(input.poll().typed).toBe('ab12-CD34');
  });

  it('outside text mode keys act and nothing is typed; leaving text mode drops what was held and typed', () => {
    const target = fakeWindow();
    const input = createInput(target);
    target.dispatchEvent(keydown('KeyV', 'v'));
    const f = input.poll();
    expect(f.typed).toBe('');
    expect(f.held.has('power')).toBe(true);
    input.setTextMode(true);
    target.dispatchEvent(keydown('Enter', 'Enter'));
    target.dispatchEvent(keydown('KeyQ', 'q'));
    input.setTextMode(false);
    const after = input.poll();
    expect(after.typed).toBe('');
    expect(after.held.size).toBe(0);
  });

  it('reports a disconnected gamepad once, so the game can pause', () => {
    const target = fakeWindow();
    const input = createInput(target);
    expect(input.takePadLost()).toBe(false);
    target.dispatchEvent(new Event('gamepaddisconnected'));
    expect(input.takePadLost()).toBe(true);
    expect(input.takePadLost()).toBe(false);
  });
});
