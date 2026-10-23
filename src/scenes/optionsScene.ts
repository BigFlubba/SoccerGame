import { MASTER } from '../art/colors';
import { BASE_W } from '../engine/viewport';
import type { Difficulty } from '../game/ai';
import { drawBackdrop } from './backdrop';
import type { GameContext } from './context';
import type { Scene } from './scene';

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];
const PANEL = { w: 200, h: 70 };
const PANEL_TOP = 50;
const TITLE_Y = PANEL_TOP + 8;
const ROW_Y = PANEL_TOP + 32;
const FOOTER_Y = PANEL_TOP + PANEL.h - 14;
const BUTTON_GAP = 4;
const BUTTON_RAISE = 2;

/** The difficulty row as shown: left and right change it. */
export const difficultyRow = (d: Difficulty): string => `DIFFICULTY  < ${d.toUpperCase()} >`;

/** One row for now: DIFFICULTY, changed with left/right (wrapping) and saved at once. B goes back. */
export function createOptionsScene(ctx: GameContext, back: () => Scene): Scene {
  const { art } = ctx;
  return {
    kind: 'options',
    update(input) {
      if (input.pressed.has('back')) return back();
      const step = (input.pressed.has('right') ? 1 : 0) - (input.pressed.has('left') ? 1 : 0);
      if (step !== 0) {
        const n = DIFFICULTIES.length;
        const difficulty = DIFFICULTIES[(DIFFICULTIES.indexOf(ctx.settings.difficulty) + step + n) % n]!;
        ctx.save({ ...ctx.settings, difficulty });
      }
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
      centre(art.text(difficultyRow(ctx.settings.difficulty), 1, 'white', 'outline'), ROW_Y);
      const b = art.buttons.B;
      const label = art.text('BACK', 1, 'silver', 'outline');
      const left = Math.round(BASE_W / 2 - (b.width + BUTTON_GAP + label.width) / 2);
      g.drawImage(b, left, FOOTER_Y - BUTTON_RAISE);
      g.drawImage(label, left + b.width + BUTTON_GAP, FOOTER_Y);
    },
  };
}
