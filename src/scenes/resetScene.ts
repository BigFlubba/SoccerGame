import { BASE_W } from '../engine/viewport';
import { newProfile } from '../meta/profile';
import { encodeSaveCode } from '../meta/saveCode';
import { drawBackdrop } from './backdrop';
import type { GameContext } from './context';
import { backsOut, drawMenu, menuCue, stepMenu, type MenuState } from './menu';
import { drawPanel } from './panel';
import { codeLines } from './saveCodeScene';
import type { Scene } from './scene';

export interface ResetScene extends Scene {
  /** The save's code, shown first so a reset can be undone. */
  readonly code: string;
  readonly menu: MenuState;
}

const PANEL = { x: 8, y: 6, w: 304, h: 168 };
const TITLE_Y = PANEL.y + 6;
const NOTE_Y = PANEL.y + 26;
const CODE_Y = PANEL.y + 38;
const ASK_Y = PANEL.y + 96;
const MENU_TOP = PANEL.y + 116;

/**
 * RESET SAVE, from Options on the Hub. It shows the current save code
 * first, then asks ARE YOU SURE? with NO picked. YES starts a fresh
 * level-1 profile and saves it at once; the settings stay as they are.
 */
export function createResetScene(ctx: GameContext, back: () => Scene): ResetScene {
  const { art } = ctx;
  const code = encodeSaveCode(ctx.profile);
  let menu: MenuState = { items: ['NO', 'YES'], index: 0 };
  return {
    kind: 'reset',
    code,
    get menu() {
      return menu;
    },
    update(input) {
      const r = stepMenu(menu, input);
      const out = backsOut(input);
      const cue = menuCue(menu, { ...r, back: out });
      if (cue) ctx.audio.play(cue);
      menu = r.m;
      if (out || r.chosen === 'NO') return back();
      if (r.chosen === 'YES') {
        ctx.saveProfile(newProfile());
        return back();
      }
      return null;
    },
    draw(g, nowS) {
      drawBackdrop(g, art, nowS);
      drawPanel(g, PANEL.x, PANEL.y, PANEL.w, PANEL.h);
      const centre = (img: HTMLCanvasElement, y: number) => g.drawImage(img, Math.round(BASE_W / 2 - img.width / 2), y);
      centre(art.text('RESET SAVE', 2, 'energyGold', 'outline'), TITLE_Y);
      centre(art.text('YOUR SAVE CODE, IN CASE', 1, 'silver', 'outline'), NOTE_Y);
      const shown = codeLines(code);
      shown.lines.forEach((line, i) => centre(art.text(line, shown.scale, 'white', 'outline'), CODE_Y + i * shown.lineH));
      centre(art.text('ARE YOU SURE?', 2, 'redLight', 'outline'), ASK_Y);
      drawMenu(g, art, menu, BASE_W / 2, MENU_TOP);
    },
  };
}
