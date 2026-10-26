import { MASTER } from '../art/colors';
import type { Cue } from '../audio/cues';
import type { InputFrame } from '../engine/input';
import type { GameArt } from './art';
import type { GameContext } from './context';

/** A menu screen's sound, whatever came before it: the crowd off and the title theme on. */
export function menuAudio(ctx: GameContext): void {
  ctx.audio.setCrowd('off');
  ctx.audio.playMusic('title');
}

export interface MenuState {
  items: readonly string[];
  index: number;
}

/** Up/down move (wrapping), confirm picks, back backs out. */
export function stepMenu(m: MenuState, input: InputFrame): { m: MenuState; chosen: string | null; back: boolean } {
  const n = m.items.length;
  let index = m.index;
  if (input.pressed.has('up')) index = (index - 1 + n) % n;
  if (input.pressed.has('down')) index = (index + 1) % n;
  const chosen = input.pressed.has('confirm') ? m.items[index]! : null;
  return { m: { items: m.items, index }, chosen, back: input.pressed.has('back') };
}

/** The blip a menu step makes, if any. */
export function menuCue(before: MenuState, r: { m: MenuState; chosen: string | null; back: boolean }): Cue | null {
  if (r.back) return 'menuBack';
  if (r.chosen) return 'menuConfirm';
  return r.m.index !== before.index ? 'menuMove' : null;
}

/** B, Backspace, Esc or Start backs out of a screen; Enter (pause plus confirm) does not. */
export const backsOut = (input: InputFrame): boolean =>
  input.pressed.has('back') || (input.pressed.has('pause') && !input.pressed.has('confirm'));

const LINE_H = 10;
const PANEL_PAD = 6;
const CURSOR_GAP = 8;

/** A centred menu panel with the selected item in gold behind a cursor. */
export function drawMenu(g: CanvasRenderingContext2D, art: GameArt, m: MenuState, cx: number, top: number): void {
  const widest = Math.max(...m.items.map(s => art.text(s, 1, 'white', 'outline').width));
  const w = widest + 2 * (PANEL_PAD + CURSOR_GAP);
  const h = m.items.length * LINE_H + 2 * PANEL_PAD - 2;
  g.fillStyle = MASTER.outline;
  g.fillRect(Math.round(cx - w / 2) - 1, top - 1, w + 2, h + 2);
  g.fillStyle = MASTER.ink;
  g.fillRect(Math.round(cx - w / 2), top, w, h);
  m.items.forEach((item, i) => {
    const selected = i === m.index;
    const t = art.text(item, 1, selected ? 'energyGold' : 'white', 'outline');
    const y = top + PANEL_PAD - 1 + i * LINE_H;
    const x = Math.round(cx - t.width / 2);
    g.drawImage(t, x, y);
    if (selected) g.drawImage(art.text('+', 1, 'energyGold', 'outline'), x - CURSOR_GAP, y);
  });
}
