import { MASTER } from '../art/colors';
import { BASE_W } from '../engine/viewport';
import { STAT_NAMES, MAX_STAT_LEVEL, type StatName } from '../game/stats';
import { STAT_INFO, buyStat, statPrice } from '../meta/economy';
import type { Profile } from '../meta/profile';
import { drawBackdrop } from './backdrop';
import type { GameContext } from './context';
import { backsOut } from './menu';
import { drawButtonHint, drawCoins, drawPanel } from './panel';
import type { Scene } from './scene';

export interface ShopScene extends Scene {
  /** The selected stat, an index into STAT_NAMES. */
  readonly row: number;
  /** Why the last buy didn't happen, until he moves or buys. */
  readonly message: string | null;
}

const PANEL = { w: 220, h: 128, top: 24 };
const PAD = 8;
const ROWS_Y = PANEL.top + 30;
const ROW_H = 13;
const CURSOR_GAP = 8;
const PIP = { w: 3, h: 5, gap: 1 };
const BLURB_Y = ROWS_Y + STAT_NAMES.length * ROW_H + 3;
const MESSAGE_Y = BLURB_Y + 12;
const FOOTER_Y = PANEL.top + PANEL.h - 12;

/** A stat as the shop lists it: its name, level and the price of the next level, or MAX. */
export function shopRow(stat: StatName, p: Profile): string {
  const level = p.stats[stat];
  return `${STAT_INFO[stat].label}  LV ${level}  ${statPrice(level) ?? 'MAX'}`;
}

/** The four stats. Up/down choose one, A buys its next level at once and saves, B goes back. */
export function createShopScene(ctx: GameContext, back: () => Scene): ShopScene {
  const { art } = ctx;
  let row = 0;
  let message: string | null = null;
  ctx.audio.playMusic('title');

  const buy = () => {
    const stat = STAT_NAMES[row]!;
    const bought = buyStat(ctx.profile, stat);
    if (bought) {
      ctx.saveProfile(bought);
      message = null;
      ctx.audio.play('buy');
      return;
    }
    const price = statPrice(ctx.profile.stats[stat]);
    message = price === null ? 'MAX LEVEL' : `NEED ${price - ctx.profile.coins} MORE`;
    ctx.audio.play('nope');
  };

  return {
    kind: 'shop',
    get row() {
      return row;
    },
    get message() {
      return message;
    },
    update(input) {
      if (backsOut(input)) {
        ctx.audio.play('menuBack');
        return back();
      }
      const n = STAT_NAMES.length;
      const before = row;
      if (input.pressed.has('up')) row = (row - 1 + n) % n;
      if (input.pressed.has('down')) row = (row + 1) % n;
      if (row !== before) {
        message = null;
        ctx.audio.play('menuMove');
      }
      if (input.pressed.has('confirm')) buy();
      return null;
    },
    draw(g, nowS) {
      drawBackdrop(g, art, nowS);
      const x = Math.round(BASE_W / 2 - PANEL.w / 2);
      const right = x + PANEL.w - PAD;
      drawPanel(g, x, PANEL.top, PANEL.w, PANEL.h);
      g.drawImage(art.text('SHOP', 2, 'energyGold', 'outline'), x + PAD, PANEL.top + 6);
      drawCoins(g, art, `${ctx.profile.coins}`, right, PANEL.top + 9);
      const pipsLeft = right - MAX_STAT_LEVEL * (PIP.w + PIP.gap) + PIP.gap;
      STAT_NAMES.forEach((stat, i) => {
        const selected = i === row;
        const y = ROWS_Y + i * ROW_H;
        const ink = selected ? 'energyGold' : 'white';
        if (selected) g.drawImage(art.text('+', 1, 'energyGold', 'outline'), x + PAD, y);
        g.drawImage(art.text(shopRow(stat, ctx.profile), 1, ink, 'outline'), x + PAD + CURSOR_GAP, y);
        g.fillStyle = MASTER.outline;
        g.fillRect(pipsLeft - 1, y, MAX_STAT_LEVEL * (PIP.w + PIP.gap) + 1, PIP.h + 2);
        for (let l = 1; l <= MAX_STAT_LEVEL; l++) {
          g.fillStyle = l <= ctx.profile.stats[stat] ? MASTER.gold : MASTER.charcoal;
          g.fillRect(pipsLeft + (l - 1) * (PIP.w + PIP.gap), y + 1, PIP.w, PIP.h);
        }
      });
      const centre = (img: HTMLCanvasElement, y: number) => g.drawImage(img, Math.round(BASE_W / 2 - img.width / 2), y);
      centre(art.text(STAT_INFO[STAT_NAMES[row]!].blurb, 1, 'silver', 'outline'), BLURB_Y);
      if (message) centre(art.text(message, 1, 'redLight', 'outline'), MESSAGE_Y);
      drawButtonHint(g, art, art.buttons.B, 'BACK', BASE_W / 2, FOOTER_Y);
    },
  };
}
