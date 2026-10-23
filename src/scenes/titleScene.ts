import { BASE_H, BASE_W } from '../engine/viewport';
import { drawBackdrop, drawTitle } from './backdrop';
import type { GameContext } from './context';
import type { Scene } from './scene';
import { createTitleMenuScene } from './titleMenuScene';

const BLINK_HZ = 2;
const PRESS_START_FROM_BOTTOM = 22;
const SOUND_HINT_FROM_BOTTOM = 8;
export const SOUND_HINT = 'CLICK OR PRESS A KEY FOR SOUND';

export interface PressStartScene extends Scene {
  /** Sound exists but the browser hasn't allowed it yet (a gamepad press doesn't count in Chrome). */
  readonly soundHint: boolean;
}

/** The first screen: the Backyard, Harrison juggling, the title and a blinking PRESS START. Start, A or Enter goes on. */
export function createPressStartScene(ctx: GameContext): PressStartScene {
  ctx.audio.setCrowd('off');
  ctx.audio.playMusic('title');
  return {
    kind: 'pressStart',
    get soundHint() {
      return ctx.audio.available && !ctx.audio.unlocked;
    },
    update(input) {
      if (!input.pressed.has('confirm') && !input.pressed.has('pause')) return null;
      ctx.audio.play('menuConfirm');
      return createTitleMenuScene(ctx);
    },
    draw(g, nowS) {
      drawBackdrop(g, ctx.art, nowS);
      drawTitle(g, ctx.art);
      if (Math.floor(nowS * BLINK_HZ) % 2 === 0) {
        const start = ctx.art.text('PRESS START', 2, 'white', 'outline');
        g.drawImage(start, Math.round(BASE_W / 2 - start.width / 2), BASE_H - PRESS_START_FROM_BOTTOM);
      }
      if (this.soundHint) {
        const hint = ctx.art.text(SOUND_HINT, 1, 'silver', 'outline');
        g.drawImage(hint, Math.round(BASE_W / 2 - hint.width / 2), BASE_H - SOUND_HINT_FROM_BOTTOM);
      }
    },
  };
}
