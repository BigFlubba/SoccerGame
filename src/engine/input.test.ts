import { describe, expect, it } from 'vitest';
import { InputTracker, keyActions, mergeActions, padActions, type PadSnapshot } from './input';

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

  it('a missing pad holds nothing', () => {
    expect(padActions(null)).toEqual({ held: new Set(), moveX: 0, moveY: 0 });
  });
});

describe('keyActions', () => {
  it('maps keyboard codes', () => {
    expect([...keyActions(new Set(['KeyX', 'ArrowLeft'])).held].sort()).toEqual(['left', 'shoot']);
    expect(keyActions(new Set(['ArrowLeft'])).moveX).toBe(-1);
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
