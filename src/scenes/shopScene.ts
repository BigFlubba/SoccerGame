import { MASTER } from '../art/colors';
import { BASE_W } from '../engine/viewport';
import { STAT_NAMES, MAX_STAT_LEVEL, type StatName } from '../game/stats';
import { POWER_MOVES, buyMove, moveStatus } from '../meta/catalog';
import { STAT_INFO, buyStat, statPrice } from '../meta/economy';
import type { Profile } from '../meta/profile';
import { drawBackdrop } from './backdrop';
import type { GameContext } from './context';
import { backsOut } from './menu';
import { drawButtonHint, drawCoins, drawPanel } from './panel';
import type { Scene } from './scene';

export interface ShopScene extends Scene {
  /** The selected row: a stat, an index into STAT_NAMES, then the Energy Wave. */
  readonly row: number;
  /** Why the last buy didn't happen, until he moves or buys. */
  readonly message: string | null;
}

const PANEL = { w: 220, h: 160, top: 12 };
const PAD = 8;
const ROWS_Y = PANEL.top + 30;
const ROW_H = 13;
const CURSOR_GAP = 8;
const PIP = { w: 3, h: 5, gap: 1 };
/** The POWER MOVES divider under the stats, and the Energy Wave's row under it. */
const DIVIDER_Y = ROWS_Y + STAT_NAMES.length * ROW_H + 1;
const MOVE_ROW_Y = DIVIDER_Y + ROW_H;
const MOVE_ROW = STAT_NAMES.length;
const ROWS = STAT_NAMES.length + 1;
const DIVIDER_GAP = 4;
const BLURB_Y = MOVE_ROW_Y + ROW_H + 3;
const MESSAGE_Y = BLURB_Y + 12;
const FOOTER_Y = PANEL.top + PANEL.h - 12;

/** A stat as the shop lists it: its name, level and the price of the next level, or MAX. */
export function shopRow(stat: StatName, p: Profile): string {
  const level = p.stats[stat];
  return `${STAT_INFO[stat].label}  LV ${level}  ${statPrice(level) ?? 'MAX'}`;
}

/** The Energy Wave as the shop lists it: its price, the level that unlocks it, or OWNED. */
export function moveRow(p: Profile): string {
  const { label, unlockLevel, price } = POWER_MOVES.energyWave;
  const status = moveStatus(p, 'energyWave');
  return `${label}  ${status === 'owned' ? 'OWNED' : status === 'locked' ? `LV ${unlockLevel} TO UNLOCK` : price}`;
}

/** What the Shop teaches once he owns the Energy Wave. */
const WAVE_HOW_TO = 'HOLD Y WITH A FULL POWER METER';

/**
 * The four stats, then the Energy Wave under POWER MOVES. Up/down choose
 * one, A buys it at once and saves, B goes back.
 */
export function createShopScene(ctx: GameContext, back: () => Scene): ShopScene {
  const { art } = ctx;
  let row = 0;
  let message: string | null = null;
  ctx.audio.playMusic('title');
  // From Results the match crowd would follow him in.
  ctx.audio.setCrowd('off');

  const buyWave = () => {
    const status = moveStatus(ctx.profile, 'energyWave');
    const bought = buyMove(ctx.profile, 'energyWave');
    if (bought) {
      ctx.saveProfile(bought);
      message = WAVE_HOW_TO;
      ctx.audio.play('buy');
      return;
    }
    const { unlockLevel, price } = POWER_MOVES.energyWave;
    message = status === 'owned' ? WAVE_HOW_TO : status === 'locked' ? `REACH LEVEL ${unlockLevel}` : `NEED ${price - ctx.profile.coins} MORE`;
    ctx.audio.play('nope');
  };

  const buy = () => {
    if (row === MOVE_ROW) return buyWave();
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
      const n = ROWS;
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
      const divider = art.text('POWER MOVES', 1, 'energyGold', 'outline');
      centre(divider, DIVIDER_Y);
      g.fillStyle = MASTER.slate;
      const mid = DIVIDER_Y + Math.floor(divider.height / 2);
      const [textL, textR] = [Math.round(BASE_W / 2 - divider.width / 2), Math.round(BASE_W / 2 + divider.width / 2)];
      g.fillRect(x + PAD, mid, textL - DIVIDER_GAP - (x + PAD), 1);
      g.fillRect(textR + DIVIDER_GAP, mid, right - textR - DIVIDER_GAP, 1);
      const onWave = row === MOVE_ROW;
      if (onWave) g.drawImage(art.text('+', 1, 'energyGold', 'outline'), x + PAD, MOVE_ROW_Y);
      const locked = moveStatus(ctx.profile, 'energyWave') === 'locked';
      g.drawImage(art.text(moveRow(ctx.profile), 1, locked ? 'gray' : onWave ? 'energyGold' : 'white', 'outline'), x + PAD + CURSOR_GAP, MOVE_ROW_Y);
      const blurb = onWave ? POWER_MOVES.energyWave.blurb : STAT_INFO[STAT_NAMES[row]!].blurb;
      centre(art.text(blurb, 1, 'silver', 'outline'), BLURB_Y);
      if (message) centre(art.text(message, 1, 'redLight', 'outline'), MESSAGE_Y);
      drawButtonHint(g, art, art.buttons.B, 'BACK', BASE_W / 2, FOOTER_Y);
    },
  };
}
