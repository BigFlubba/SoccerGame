import { MASTER } from '../art/colors';
import { BASE_W } from '../engine/viewport';
import type { Difficulty } from '../game/ai';
import { VOLUME_MAX, type Settings } from '../meta/settings';
import { drawBackdrop } from './backdrop';
import type { GameContext } from './context';
import { backsOut } from './menu';
import { createResetScene } from './resetScene';
import { createSaveCodeScene } from './saveCodeScene';
import type { Scene } from './scene';

export const OPTION_ROWS = ['DIFFICULTY', 'MUSIC', 'SFX', 'RUMBLE'] as const;
export type OptionRow = (typeof OPTION_ROWS)[number];
/** Only from the Hub: never in the middle of a match. */
const SAVE_ROWS = ['SAVE CODE', 'RESET SAVE'] as const;

export interface OptionsScene extends Scene {
  readonly rows: readonly string[];
  readonly row: number;
}

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];
const PANEL = { w: 200, h: 100 };
const PANEL_TOP = 40;
const TITLE_Y = PANEL_TOP + 8;
const ROWS_Y = PANEL_TOP + 30;
const ROW_H = 11;
const CURSOR_GAP = 8;
/** The footer sits this far above the panel's bottom, which grows a row's height for each row past the settings. */
const FOOTER_UP = 14;
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

/**
 * DIFFICULTY, MUSIC, SFX and RUMBLE: up/down pick a row (wrapping),
 * left/right change it and save at once. From the Hub, SAVE CODE and RESET
 * SAVE follow, and A opens them. B goes back.
 */
export function createOptionsScene(ctx: GameContext, back: () => Scene, fromHub = false, startRow = 0): OptionsScene {
  const { art } = ctx;
  const rows: readonly string[] = fromHub ? [...OPTION_ROWS, ...SAVE_ROWS] : OPTION_ROWS;
  let row = startRow;
  const panelH = PANEL.h + (rows.length - OPTION_ROWS.length) * ROW_H;
  return {
    kind: 'options',
    rows,
    get row() {
      return row;
    },
    update(input) {
      if (backsOut(input)) {
        ctx.audio.play('menuBack');
        return back();
      }
      const n = rows.length;
      const before = row;
      if (input.pressed.has('up')) row = (row - 1 + n) % n;
      if (input.pressed.has('down')) row = (row + 1) % n;
      const name = rows[row]!;
      if (row === before && input.pressed.has('confirm') && (name === 'SAVE CODE' || name === 'RESET SAVE')) {
        ctx.audio.play('menuConfirm');
        const here = row;
        const backHere = () => createOptionsScene(ctx, back, true, here);
        return name === 'SAVE CODE' ? createSaveCodeScene(ctx, backHere) : createResetScene(ctx, backHere);
      }
      const setting = OPTION_ROWS.find(r => r === name);
      const step = setting && input.pressed.has('right') ? 1 : setting && input.pressed.has('left') ? -1 : 0;
      // Saved first, so an SFX change blips at its new level.
      if (setting && step !== 0) {
        ctx.save(changeOption(ctx.settings, setting, step));
        // A little pulse says it's back on.
        if (setting === 'RUMBLE' && ctx.settings.rumble) ctx.rumble.pulse('tap');
      }
      if (step !== 0 || row !== before) ctx.audio.play('menuMove');
      return null;
    },
    draw(g, nowS) {
      drawBackdrop(g, art, nowS);
      const x = Math.round(BASE_W / 2 - PANEL.w / 2);
      g.fillStyle = MASTER.outline;
      g.fillRect(x - 1, PANEL_TOP - 1, PANEL.w + 2, panelH + 2);
      g.fillStyle = MASTER.ink;
      g.fillRect(x, PANEL_TOP, PANEL.w, panelH);
      const centre = (img: HTMLCanvasElement, y: number) => g.drawImage(img, Math.round(BASE_W / 2 - img.width / 2), y);
      centre(art.text('OPTIONS', 2, 'energyGold', 'outline'), TITLE_Y);
      rows.forEach((name, i) => {
        const selected = i === row;
        const setting = OPTION_ROWS.find(r => r === name);
        const t = art.text(setting ? optionRow(setting, ctx.settings) : name, 1, selected ? 'energyGold' : 'white', 'outline');
        const y = ROWS_Y + i * ROW_H;
        const left = Math.round(BASE_W / 2 - t.width / 2);
        g.drawImage(t, left, y);
        if (selected) g.drawImage(art.text('+', 1, 'energyGold', 'outline'), left - CURSOR_GAP, y);
      });
      const b = art.buttons.B;
      const label = art.text('BACK', 1, 'silver', 'outline');
      const left = Math.round(BASE_W / 2 - (b.width + BUTTON_GAP + label.width) / 2);
      const footerY = PANEL_TOP + panelH - FOOTER_UP;
      g.drawImage(b, left, footerY - BUTTON_RAISE);
      g.drawImage(label, left + b.width + BUTTON_GAP, footerY);
    },
  };
}
