import { describe, expect, it } from 'vitest';
import { menuCue, stepMenu } from './menu';
import { frame } from './testInput';

const menu = { items: ['RESUME', 'RESTART', 'QUIT'], index: 0 } as const;

describe('stepMenu', () => {
  it('menu moves with up/down, wraps, and confirms', () => {
    const up = stepMenu(menu, frame(['up']));
    expect(up.m.index).toBe(2);
    const down = stepMenu(up.m, frame(['down']));
    expect(down.m.index).toBe(0);
    expect(stepMenu({ ...menu, index: 1 }, frame(['confirm'])).chosen).toBe('RESTART');
  });

  it('holding a direction does not repeat', () => {
    expect(stepMenu(menu, frame([], ['down'])).m.index).toBe(0);
  });

  it('reports back', () => {
    const r = stepMenu(menu, frame(['back']));
    expect([r.back, r.chosen]).toEqual([true, null]);
  });

  it('menuCue: a move blips, a choice confirms, back backs, and nothing else sounds', () => {
    const at = (index: number) => ({ items: menu.items, index });
    expect(menuCue(menu, { m: at(1), chosen: null, back: false })).toBe('menuMove');
    expect(menuCue(menu, { m: at(0), chosen: 'RESUME', back: false })).toBe('menuConfirm');
    expect(menuCue(menu, { m: at(0), chosen: null, back: true })).toBe('menuBack');
    expect(menuCue(menu, { m: at(0), chosen: null, back: false })).toBeNull();
  });
});
