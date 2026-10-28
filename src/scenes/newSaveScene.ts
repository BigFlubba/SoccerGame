import { MASTER } from '../art/colors';
import { BASE_W } from '../engine/viewport';
import type { Difficulty } from '../game/ai';
import { NAME_MAX, cleanName, nameChars, newProfile } from '../meta/profile';
import { drawBackdrop } from './backdrop';
import { openSave, type GameContext } from './context';
import { createHubScene } from './hubScene';
import { drawMenu } from './menu';
import { nextDifficulty } from './optionsScene';
import { drawButtonHint, drawPanel } from './panel';
import type { Scene } from './scene';

export type NewSaveRow = 'name' | 'difficulty' | 'start';

export interface NewSaveScene extends Scene {
  readonly row: NewSaveRow;
  /** What he's typed so far, as a name can hold it. */
  readonly name: string;
  readonly difficulty: Difficulty;
}

const ROWS: readonly NewSaveRow[] = ['name', 'difficulty', 'start'];
const START_ITEMS = ['START'] as const;

const P = { x: 40, y: 20, w: 240, h: 140 };
const TITLE_Y = P.y + 6;
const LABEL_X = P.x + 14;
const CURSOR_X = P.x + 6;
const NAME_Y = P.y + 34;
const NAME_BOX = { x: P.x + 50, y: P.y + 29, w: 170, h: 18 };
const NAME_INSET = { x: 4, y: 3 };
const CURSOR = { gap: 2, w: 8, h: 13 };
const CURSOR_BLINK_HZ = 2;
const HINT_Y = P.y + 54;
const DIFFICULTY_Y = P.y + 72;
const DIFFICULTY_X = P.x + 120;
const START_Y = P.y + 88;
const FOOTER_Y = P.y + 112;
const BACK_Y = P.y + P.h - 12;

/**
 * NEW SAVE, from an empty slot: a name typed on the keyboard (the game's
 * keys type while it's open), a difficulty, and START. Up and down move
 * between the rows, left and right change the difficulty, and Enter or A
 * starts the save from any row. B or Esc goes back with nothing made.
 */
export function createNewSaveScene(ctx: GameContext, slot: number, back: () => Scene): NewSaveScene {
  const { art } = ctx;
  let row = 0;
  let name = '';
  let difficulty: Difficulty = 'normal';

  /** Typed text this frame: Backspace deletes, anything a name can't hold is dropped, and past NAME_MAX is ignored. */
  const type = (typed: string) => {
    for (const ch of typed) name = ch === '\b' ? name.slice(0, -1) : (name + nameChars(ch)).slice(0, NAME_MAX);
  };

  return {
    kind: 'newSave',
    wantsText: true,
    get row() {
      return ROWS[row]!;
    },
    get name() {
      return name;
    },
    get difficulty() {
      return difficulty;
    },
    update(input) {
      if (ROWS[row] === 'name') type(input.typed);
      if (input.pressed.has('back')) {
        ctx.audio.play('menuBack');
        return back();
      }
      if (input.pressed.has('confirm')) {
        ctx.audio.play('menuConfirm');
        openSave(ctx, slot, { ...newProfile(), name: cleanName(name) || `SAVE ${slot}`, difficulty });
        return createHubScene(ctx);
      }
      const n = ROWS.length;
      const before = row;
      if (input.pressed.has('up')) row = (row - 1 + n) % n;
      if (input.pressed.has('down')) row = (row + 1) % n;
      const step = input.pressed.has('right') ? 1 : input.pressed.has('left') ? -1 : 0;
      const changes = row === before && ROWS[row] === 'difficulty' && step !== 0;
      if (changes) difficulty = nextDifficulty(difficulty, step);
      if (changes || row !== before) ctx.audio.play('menuMove');
      return null;
    },
    draw(g, nowS) {
      drawBackdrop(g, art, nowS);
      drawPanel(g, P.x, P.y, P.w, P.h);
      const centre = (img: HTMLCanvasElement, y: number) => g.drawImage(img, Math.round(BASE_W / 2 - img.width / 2), y);
      const active = ROWS[row]!;
      centre(art.text('NEW SAVE', 2, 'energyGold', 'outline'), TITLE_Y);

      const label = (text: string, y: number, on: boolean) => {
        g.drawImage(art.text(text, 1, 'white', 'outline'), LABEL_X, y);
        if (on) g.drawImage(art.text('+', 1, 'energyGold', 'outline'), CURSOR_X, y);
      };
      const typing = active === 'name';
      label('NAME', NAME_Y, typing);
      g.fillStyle = typing ? MASTER.energyGold : MASTER.slate;
      g.fillRect(NAME_BOX.x - 1, NAME_BOX.y - 1, NAME_BOX.w + 2, NAME_BOX.h + 2);
      g.fillStyle = MASTER.charcoal;
      g.fillRect(NAME_BOX.x, NAME_BOX.y, NAME_BOX.w, NAME_BOX.h);
      const shown = art.text(name, 2, 'white', 'outline');
      if (name) g.drawImage(shown, NAME_BOX.x + NAME_INSET.x, NAME_BOX.y + NAME_INSET.y);
      if (typing && Math.floor(nowS * CURSOR_BLINK_HZ * 2) % 2 === 0) {
        g.fillStyle = MASTER.energyGold;
        g.fillRect(NAME_BOX.x + NAME_INSET.x + (name ? shown.width + CURSOR.gap : 0), NAME_BOX.y + NAME_INSET.y, CURSOR.w, CURSOR.h);
      }
      centre(art.text('TYPE A NAME ON THE KEYBOARD', 1, 'silver', 'outline'), HINT_Y);

      const picking = active === 'difficulty';
      label('DIFFICULTY', DIFFICULTY_Y, picking);
      g.drawImage(art.text(`<  ${difficulty.toUpperCase()}  >`, 1, picking ? 'energyGold' : 'white', 'outline'), DIFFICULTY_X, DIFFICULTY_Y);

      drawMenu(g, art, { items: START_ITEMS, index: active === 'start' ? 0 : -1 }, BASE_W / 2, START_Y);
      centre(art.text('ENTER STARTS IT', 1, 'gray', 'outline'), FOOTER_Y);
      drawButtonHint(g, art, art.buttons.B, 'BACK', BASE_W / 2, BACK_Y);
    },
  };
}
