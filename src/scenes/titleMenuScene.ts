import { BASE_W } from '../engine/viewport';
import { drawBackdrop, drawTitle } from './backdrop';
import type { GameContext } from './context';
import { createHelpScene } from './helpScene';
import { createMatchScene } from './matchScene';
import { drawMenu, stepMenu, type MenuState } from './menu';
import type { Scene } from './scene';
import { createPressStartScene } from './titleScene';

/** No QUIT: a web page can't close its own tab. */
export const TITLE_MENU_ITEMS = ['START GAME', 'OPTIONS', 'HELP'] as const;
const MENU_TOP = 80;

/** A fresh seed per match so every game plays differently. */
const newSeed = () => Math.floor(Math.random() * 2 ** 32);

/** START GAME, OPTIONS, HELP. Up/down choose, A confirms, B goes back to Press Start. */
export function createTitleMenuScene(ctx: GameContext, index = 0): Scene {
  let menu: MenuState = { items: TITLE_MENU_ITEMS, index };
  return {
    kind: 'titleMenu',
    update(input) {
      const r = stepMenu(menu, input);
      menu = r.m;
      if (r.back) return createPressStartScene(ctx);
      if (r.chosen === 'START GAME') return createMatchScene(ctx, newSeed());
      if (r.chosen === 'HELP') return createHelpScene(ctx, () => createTitleMenuScene(ctx, menu.index));
      return null;
    },
    draw(g, nowS) {
      drawBackdrop(g, ctx.art, nowS);
      drawTitle(g, ctx.art);
      drawMenu(g, ctx.art, menu, BASE_W / 2, MENU_TOP);
    },
  };
}
