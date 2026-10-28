import { MASTER } from '../art/colors';
import type { InputFrame } from '../engine/input';
import { BASE_W } from '../engine/viewport';
import { careerCardLines, careerStars } from '../meta/career';
import { xpToNext } from '../meta/economy';
import { outfitOf } from '../meta/locker';
import type { Profile } from '../meta/profile';
import { SLOT_COUNT } from '../meta/saveSlots';
import { drawBackdrop } from './backdrop';
import { openSave, type GameContext } from './context';
import { createDeleteSaveScene } from './deleteSaveScene';
import { createHubScene, statsLine } from './hubScene';
import { drawMenu, menuAudio, menuCue, stepMenu, type MenuState } from './menu';
import { createNewSaveScene } from './newSaveScene';
import { STAR_W, drawBar, drawButtonHint, drawCoins, drawPanel, drawStar } from './panel';
import type { Scene } from './scene';
import { createPressStartScene } from './titleScene';

export interface SavesScene extends Scene {
  /** Read fresh when the scene opens; index 0 is slot 1. */
  readonly slots: readonly (Profile | null)[];
  /** The picked slot, 1–SLOT_COUNT. */
  readonly cursor: number;
  /** The info box's PLAY / DELETE / BACK; null while it's closed. */
  readonly box: MenuState | null;
}

const BOX_ITEMS = ['PLAY', 'DELETE', 'BACK'] as const;
const SLOT_ITEMS = [...Array(SLOT_COUNT)].map((_, i) => `${i + 1}`);

const LIST = { x: 16, y: 6, w: 288, h: 168 };
const TITLE_Y = LIST.y + 6;
const ROWS_Y = LIST.y + 28;
const ROW_H = 24;
const BAND = { inset: 4, up: 3, gap: 2 };
const NUMBER_X = LIST.x + 10;
const NAME_X = LIST.x + 30;
const ROW_RIGHT = LIST.x + LIST.w - 10;
const LINE_2 = 10;
const EMPTY_DROP = 4;
const STAR_LEFT = 8;
const HINT_SPREAD = 30;
const FOOTER_Y = LIST.y + LIST.h - 11;
/** The list behind the info box, dimmed as the road map dims the Backyard. */
const DIM = 0.35;
/** The info box: wider than the mockup's 252, so the maxed stats line fits its text column. */
const BOX = { x: 16, y: 14, w: 288, h: 152 };
const BOX_PORTRAIT = { x: BOX.x + 6, y: BOX.y + 8 };
const BOX_TEXT_X = BOX.x + 76;
const BOX_RIGHT = BOX.x + BOX.w - 8;
const BOX_XP = { gap: 6, drop: 2, w: 50, h: 4 };
const BOX_STAR_GAP = 4;
const BOX_CAREER_X = BOX.x + 8;
const BOX_ROWS = { name: BOX.y + 6, slot: BOX.y + 22, level: BOX.y + 34, stats: BOX.y + 46, stars: BOX.y + 58, career: BOX.y + 80, career2: BOX.y + 90, menu: BOX.y + 102 };

/** A row's second line, e.g. EASY  -  LEVEL 6. */
const rowDetail = (p: Profile): string => `${p.difficulty.toUpperCase()}  -  LEVEL ${p.level}`;

/**
 * SAVES, from PRESS START and the Hub: the five slots, each a save or
 * empty. Up/down pick a slot; A, Enter or Start opens a save's info box,
 * or NEW SAVE on an empty slot. The box plays the save, deletes it after
 * a confirm, or closes. B or Esc closes the box, or goes back to PRESS
 * START.
 */
export function createSavesScene(ctx: GameContext, cursor: number, boxOpen = false): SavesScene {
  const { art } = ctx;
  const slots = ctx.saves.list();
  let list: MenuState = { items: SLOT_ITEMS, index: cursor - 1 };
  // Back from DELETE SAVE, the box opens on DELETE, as the Hub comes back on the item left.
  let box: MenuState | null = boxOpen && slots[cursor - 1] ? { items: BOX_ITEMS, index: BOX_ITEMS.indexOf('DELETE') } : null;
  menuAudio(ctx);

  /** A step of `m`, where Start picks as A does, as on the Hub; Esc (pause plus back) backs out. */
  const step = (m: MenuState, input: InputFrame) => {
    const r = stepMenu(m, input);
    const chosen = r.back ? null : (r.chosen ?? (input.pressed.has('pause') ? r.m.items[r.m.index]! : null));
    const cue = menuCue(m, { ...r, chosen });
    if (cue) ctx.audio.play(cue);
    return { m: r.m, chosen, back: r.back };
  };

  return {
    kind: 'saves',
    slots,
    get cursor() {
      return list.index + 1;
    },
    get box() {
      return box;
    },
    update(input) {
      const slot = list.index + 1;
      const save = slots[list.index];
      if (box && save) {
        const r = step(box, input);
        box = r.m;
        if (r.back || r.chosen === 'BACK') box = null;
        if (r.chosen === 'PLAY') {
          // Read again: another tab may have played this save since the list was read.
          openSave(ctx, slot, ctx.saves.read(slot) ?? save);
          return createHubScene(ctx);
        }
        if (r.chosen === 'DELETE') {
          return createDeleteSaveScene(ctx, slot, save, () => createSavesScene(ctx, slot, true), () => createSavesScene(ctx, slot));
        }
        return null;
      }
      const r = step(list, input);
      list = r.m;
      if (r.back) return createPressStartScene(ctx);
      if (!r.chosen) return null;
      const picked = list.index + 1;
      if (!slots[list.index]) return createNewSaveScene(ctx, picked, () => createSavesScene(ctx, picked));
      box = { items: BOX_ITEMS, index: 0 };
      return null;
    },
    draw(g, nowS) {
      drawBackdrop(g, art, nowS);
      drawPanel(g, LIST.x, LIST.y, LIST.w, LIST.h);
      const centre = (img: HTMLCanvasElement, y: number) => g.drawImage(img, Math.round(BASE_W / 2 - img.width / 2), y);
      centre(art.text('SAVES', 2, 'energyGold', 'outline'), TITLE_Y);
      const right = (img: HTMLCanvasElement, y: number) => g.drawImage(img, ROW_RIGHT - img.width, y);
      slots.forEach((p, i) => {
        const y = ROWS_Y + i * ROW_H;
        const picked = i === list.index;
        if (picked) {
          g.fillStyle = MASTER.charcoal;
          g.fillRect(LIST.x + BAND.inset, y - BAND.up, LIST.w - 2 * BAND.inset, ROW_H - BAND.gap);
        }
        g.drawImage(art.text(`${i + 1}`, 2, picked ? 'energyGold' : 'silver', 'outline'), NUMBER_X, y);
        if (!p) {
          g.drawImage(art.text('- EMPTY -', 1, 'gray', 'outline'), NAME_X, y + EMPTY_DROP);
          if (picked) right(art.text('START A NEW SAVE', 1, 'silver', 'outline'), y + EMPTY_DROP);
          return;
        }
        g.drawImage(art.text(p.name, 1, picked ? 'energyGold' : 'white', 'outline'), NAME_X, y);
        g.drawImage(art.text(rowDetail(p), 1, 'silver', 'outline'), NAME_X, y + LINE_2);
        const stars = art.text(`${careerStars(p)}`, 1, 'energyGold', 'outline');
        right(stars, y);
        drawStar(g, ROW_RIGHT - stars.width - STAR_LEFT, y + 1, true);
        drawCoins(g, art, `${p.coins}`, ROW_RIGHT, y + LINE_2);
      });
      const save = slots[list.index];
      // With the box open the list goes without its hints, which would peek out under the box's bottom edge.
      if (!box || !save) {
        drawButtonHint(g, art, art.buttons.A, 'PICK', BASE_W / 2 - HINT_SPREAD, FOOTER_Y);
        drawButtonHint(g, art, art.buttons.B, 'BACK', BASE_W / 2 + HINT_SPREAD, FOOTER_Y);
        return;
      }
      g.save();
      g.globalAlpha = DIM;
      g.fillStyle = MASTER.ink;
      g.fillRect(0, 0, BASE_W, g.canvas.height);
      g.restore();
      drawPanel(g, BOX.x, BOX.y, BOX.w, BOX.h);
      g.drawImage(art.portraitsOf(outfitOf(save)).neutral, BOX_PORTRAIT.x, BOX_PORTRAIT.y);
      g.drawImage(art.text(save.name, 2, 'energyGold', 'outline'), BOX_TEXT_X, BOX_ROWS.name);
      g.drawImage(art.text(`SAVE ${list.index + 1}  -  ${save.difficulty.toUpperCase()}`, 1, 'silver', 'outline'), BOX_TEXT_X, BOX_ROWS.slot);
      const level = art.text(`LEVEL ${save.level}`, 1, 'white', 'outline');
      g.drawImage(level, BOX_TEXT_X, BOX_ROWS.level);
      drawBar(g, BOX_TEXT_X + level.width + BOX_XP.gap, BOX_ROWS.level + BOX_XP.drop, BOX_XP.w, BOX_XP.h, save.xp / xpToNext(save.level), MASTER.electric);
      drawCoins(g, art, `${save.coins}`, BOX_RIGHT, BOX_ROWS.level);
      g.drawImage(art.text(statsLine(save.stats), 1, 'white', 'outline'), BOX_TEXT_X, BOX_ROWS.stats);
      drawStar(g, BOX_TEXT_X, BOX_ROWS.stars + 1, true);
      g.drawImage(art.text(`${careerStars(save)} STARS`, 1, 'energyGold', 'outline'), BOX_TEXT_X + STAR_W + BOX_STAR_GAP, BOX_ROWS.stars);
      const career = careerCardLines(save);
      g.drawImage(art.text(career.first, 1, 'energyGold', 'outline'), BOX_CAREER_X, BOX_ROWS.career);
      if (career.second) g.drawImage(art.text(career.second, 1, 'silver', 'outline'), BOX_CAREER_X, BOX_ROWS.career2);
      drawMenu(g, art, box, BASE_W / 2, BOX_ROWS.menu);
    },
  };
}
