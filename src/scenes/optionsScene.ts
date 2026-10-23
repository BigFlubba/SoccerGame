import { MASTER } from '../art/colors';
import { BASE_W } from '../engine/viewport';
import type { Difficulty } from '../game/ai';
import { VOLUME_MAX, type Settings } from '../meta/settings';
import { drawBackdrop } from './backdrop';
import type { GameContext } from './context';
import { backsOut } from './menu';
import type { Scene } from './scene';

export const OPTION_ROWS = ['DIFFICULTY', 'MUSIC', 'SFX', 'RUMBLE'] as const;
export type OptionRow = (typeof OPTION_ROWS)[number];

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];
const PANEL = { w: 200, h: 100 };
const PANEL_TOP = 40;
const TITLE_Y = PANEL_TOP + 8;
const ROWS_Y = PANEL_TOP + 30;
const ROW_H = 11;
const CURSOR_GAP = 8;
const FOOTER_Y = PANEL_TOP + PANEL.h - 14;
const BUTTON_GAP = 4;
const BUTTON_RAISE = 2;

/** A row as shown: left and right change it. */
export function optionRow(row: OptionRow, s: Settings): string {
  const value = { DIFFICULTY: s.difficulty.toUpperCase(), MUSIC: `${s.musicVolume}`, SFX: `${s.sfxVolume}`, RUMBLE: s.rumble ? 'ON' : 'OFF' }[row];
  return `${row}  < ${value} >`;
}

/** One step left or right on a row: difficulty wraps, volumes stop at 0 and VOLUME_MAX, rumble toggles. */
export function changeOption(s: Settings, row: OptionRow, step: 1 | -1): Settings {
  const volume = (v: number) => Math.min(Math.max(v + step, 0), VOLUME_MAX);
  switch (row) {
    case 'DIFFICULTY': {
      const n = DIFFICULTIES.length;
      return { ...s, difficulty: DIFFICULTIES[(DIFFICULTIES.indexOf(s.difficulty) + step + n) % n]! };
    }
    case 'MUSIC':
      return { ...s, musicVolume: volume(s.musicVolume) };
    case 'SFX':
      return { ...s, sfxVolume: volume(s.sfxVolume) };
    case 'RUMBLE':
      return { ...s, rumble: !s.rumble };
  }
}

/** DIFFICULTY, MUSIC, SFX and RUMBLE: up/down pick a row (wrapping), left/right change it and save at once. B goes back. */
export function createOptionsScene(ctx: GameContext, back: () => Scene): Scene {
  const { art } = ctx;
  let row = 0;
  return {
    kind: 'options',
    update(input) {
      if (backsOut(input)) {
        ctx.audio.play('menuBack');
        return back();
      }
      const n = OPTION_ROWS.length;
      const before = row;
      if (input.pressed.has('up')) row = (row - 1 + n) % n;
      if (input.pressed.has('down')) row = (row + 1) % n;
      const step = input.pressed.has('right') ? 1 : input.pressed.has('left') ? -1 : 0;
      // Saved first, so an SFX change blips at its new level.
      if (step !== 0) {
        ctx.save(changeOption(ctx.settings, OPTION_ROWS[row]!, step));
        // A little pulse says it's back on.
        if (OPTION_ROWS[row] === 'RUMBLE' && ctx.settings.rumble) ctx.rumble.pulse('tap');
      }
      if (step !== 0 || row !== before) ctx.audio.play('menuMove');
      return null;
    },
    draw(g, nowS) {
      drawBackdrop(g, art, nowS);
      const x = Math.round(BASE_W / 2 - PANEL.w / 2);
      g.fillStyle = MASTER.outline;
      g.fillRect(x - 1, PANEL_TOP - 1, PANEL.w + 2, PANEL.h + 2);
      g.fillStyle = MASTER.ink;
      g.fillRect(x, PANEL_TOP, PANEL.w, PANEL.h);
      const centre = (img: HTMLCanvasElement, y: number) => g.drawImage(img, Math.round(BASE_W / 2 - img.width / 2), y);
      centre(art.text('OPTIONS', 2, 'energyGold', 'outline'), TITLE_Y);
      OPTION_ROWS.forEach((name, i) => {
        const selected = i === row;
        const t = art.text(optionRow(name, ctx.settings), 1, selected ? 'energyGold' : 'white', 'outline');
        const y = ROWS_Y + i * ROW_H;
        const left = Math.round(BASE_W / 2 - t.width / 2);
        g.drawImage(t, left, y);
        if (selected) g.drawImage(art.text('+', 1, 'energyGold', 'outline'), left - CURSOR_GAP, y);
      });
      const b = art.buttons.B;
      const label = art.text('BACK', 1, 'silver', 'outline');
      const left = Math.round(BASE_W / 2 - (b.width + BUTTON_GAP + label.width) / 2);
      g.drawImage(b, left, FOOTER_Y - BUTTON_RAISE);
      g.drawImage(label, left + b.width + BUTTON_GAP, FOOTER_Y);
    },
  };
}
