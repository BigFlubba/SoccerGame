import { BASE_W } from '../engine/viewport';
import type { Profile } from '../meta/profile';
import { encodeSaveCode } from '../meta/saveCode';
import { drawBackdrop } from './backdrop';
import type { GameContext } from './context';
import { backsOut, drawMenu, menuCue, stepMenu, type MenuState } from './menu';
import { drawPanel } from './panel';
import { codeLines } from './saveCodeScene';
import type { Scene } from './scene';

export interface DeleteSaveScene extends Scene {
  /** The save's code, shown first so a delete can be undone. */
  readonly code: string;
  readonly menu: MenuState;
}

const PANEL = { x: 8, y: 6, w: 304, h: 168 };
const TITLE_Y = PANEL.y + 6;
const SAVE_Y = PANEL.y + 24;
const NOTE_Y = PANEL.y + 36;
const CODE_Y = PANEL.y + 46;
const ASK_Y = PANEL.y + 100;
const MENU_TOP = PANEL.y + 120;

/**
 * DELETE SAVE, from a save's info box. It shows the save and its code
 * first, then asks ARE YOU SURE? with NO picked. YES empties the slot,
 * unless it holds a newer build's save, which stays. NO, B, Esc or Start
 * goes back.
 */
export function createDeleteSaveScene(ctx: GameContext, slot: number, save: Profile, back: () => Scene, deleted: () => Scene): DeleteSaveScene {
  const { art } = ctx;
  const code = encodeSaveCode(save);
  let menu: MenuState = { items: ['NO', 'YES'], index: 0 };
  return {
    kind: 'deleteSave',
    code,
    get menu() {
      return menu;
    },
    update(input) {
      const r = stepMenu(menu, input);
      const out = backsOut(input);
      const yes = !out && r.chosen === 'YES';
      const gone = yes && ctx.saves.remove(slot);
      const cue = yes && !gone ? 'nope' : menuCue(menu, { ...r, back: out });
      if (cue) ctx.audio.play(cue);
      menu = r.m;
      if (gone) return deleted();
      if (out || r.chosen === 'NO') return back();
      return null;
    },
    draw(g, nowS) {
      drawBackdrop(g, art, nowS);
      drawPanel(g, PANEL.x, PANEL.y, PANEL.w, PANEL.h);
      const centre = (img: HTMLCanvasElement, y: number) => g.drawImage(img, Math.round(BASE_W / 2 - img.width / 2), y);
      centre(art.text(`DELETE SAVE ${slot}`, 2, 'energyGold', 'outline'), TITLE_Y);
      centre(art.text(`${save.name}  -  ${save.difficulty.toUpperCase()}  -  LEVEL ${save.level}`, 1, 'white', 'outline'), SAVE_Y);
      centre(art.text('ITS SAVE CODE, IN CASE', 1, 'silver', 'outline'), NOTE_Y);
      const shown = codeLines(code);
      shown.lines.forEach((line, i) => centre(art.text(line, shown.scale, 'white', 'outline'), CODE_Y + i * shown.lineH));
      centre(art.text('ARE YOU SURE?', 2, 'redLight', 'outline'), ASK_Y);
      drawMenu(g, art, menu, BASE_W / 2, MENU_TOP);
    },
  };
}
