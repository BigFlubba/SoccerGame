import { BASE_H, BASE_W } from '../engine/viewport';
import { drawBackdrop, drawTitle } from './backdrop';
import type { GameContext } from './context';
import type { Scene } from './scene';
import { createTitleMenuScene } from './titleMenuScene';

const BLINK_HZ = 2;
const PRESS_START_FROM_BOTTOM = 22;

/** The first screen: the Backyard, Harrison juggling, the title and a blinking PRESS START. Start, A or Enter goes on. */
export function createPressStartScene(ctx: GameContext): Scene {
  return {
    kind: 'pressStart',
    update(input) {
      if (input.pressed.has('confirm') || input.pressed.has('pause')) return createTitleMenuScene(ctx);
      return null;
    },
    draw(g, nowS) {
      drawBackdrop(g, ctx.art, nowS);
      drawTitle(g, ctx.art);
      if (Math.floor(nowS * BLINK_HZ) % 2 === 0) {
        const start = ctx.art.text('PRESS START', 2, 'white', 'outline');
        g.drawImage(start, Math.round(BASE_W / 2 - start.width / 2), BASE_H - PRESS_START_FROM_BOTTOM);
      }
    },
  };
}
