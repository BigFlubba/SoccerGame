import { MASTER } from '../art/colors';
import { STAT_NAMES, type StatName, type Stats } from '../game/stats';
import { xpToNext } from '../meta/economy';
import { isChampion, nextMatch, nextMatchLine, trainingLine } from '../meta/ladder';
import { drawBackdrop } from './backdrop';
import type { GameContext } from './context';
import { createHelpScene } from './helpScene';
import { createMatchScene, newSeed } from './matchScene';
import { drawMenu, menuCue, stepMenu, type MenuState } from './menu';
import { createOptionsScene } from './optionsScene';
import { drawBar, drawCoins, drawPanel } from './panel';
import type { Scene } from './scene';
import { createShopScene } from './shopScene';
import { createPressStartScene } from './titleScene';

/** No QUIT: a web page can't close its own tab. */
export const HUB_ITEMS = ['PLAY MATCH', 'SHOP', 'OPTIONS', 'HELP'] as const;

const SHORT: Record<StatName, string> = { speed: 'SPD', power: 'PWR', jump: 'JMP', control: 'CTL' };
const CARD = { x: 16, y: 8, w: 288, h: 80 };
const PORTRAIT_AT = { x: CARD.x + 6, y: CARD.y + 8 };
const TEXT_X = CARD.x + 80;
const XP_BAR = { gap: 6, w: 70, h: 4 };
const MENU_TOP = 98;
/** Right of centre, so the backdrop's juggling Harrison (who drifts across the left and middle) is never hidden behind it. */
const MENU_CX = 248;

/** His four stats in short, e.g. SPD 3  PWR 2  JMP 1  CTL 4. */
export function statsLine(s: Stats): string {
  return STAT_NAMES.map(k => `${SHORT[k]} ${s[k]}`).join('  ');
}

/**
 * Harrison's card (portrait, level and XP, coins, stats, and the next
 * ladder match) over the drifting Backyard, with PLAY MATCH, SHOP, OPTIONS
 * and HELP. Up/down choose, A or Start confirms, B or Esc goes back to
 * Press Start.
 */
export function createHubScene(ctx: GameContext, index = 0): Scene {
  const { art } = ctx;
  let menu: MenuState = { items: HUB_ITEMS, index };
  ctx.audio.setCrowd('off');
  ctx.audio.playMusic('title');
  const backHere = () => createHubScene(ctx, menu.index);
  return {
    kind: 'hub',
    update(input) {
      // Start confirms here, as on Press Start; Esc (pause plus back) backs out.
      const r = stepMenu(menu, input);
      const chosen = r.back ? null : (r.chosen ?? (input.pressed.has('pause') ? r.m.items[r.m.index]! : null));
      const cue = menuCue(menu, { ...r, chosen });
      if (cue) ctx.audio.play(cue);
      menu = r.m;
      if (r.back) return createPressStartScene(ctx);
      if (chosen === 'PLAY MATCH') return createMatchScene(ctx, newSeed());
      if (chosen === 'SHOP') return createShopScene(ctx, backHere);
      if (chosen === 'HELP') return createHelpScene(ctx, backHere);
      if (chosen === 'OPTIONS') return createOptionsScene(ctx, backHere);
      return null;
    },
    draw(g, nowS) {
      const p = ctx.profile;
      drawBackdrop(g, art, nowS);
      drawPanel(g, CARD.x, CARD.y, CARD.w, CARD.h);
      g.drawImage(art.portraits.neutral, PORTRAIT_AT.x, PORTRAIT_AT.y);
      g.drawImage(art.text('HARRISON', 2, 'energyGold', 'outline'), TEXT_X, CARD.y + 6);
      drawCoins(g, art, `${p.coins}`, CARD.x + CARD.w - 8, CARD.y + 9);
      const level = art.text(`LEVEL ${p.level}`, 1, 'white', 'outline');
      g.drawImage(level, TEXT_X, CARD.y + 26);
      drawBar(g, TEXT_X + level.width + XP_BAR.gap, CARD.y + 28, XP_BAR.w, XP_BAR.h, p.xp / xpToNext(p.level), MASTER.electric);
      g.drawImage(art.text(statsLine(p.stats), 1, 'white', 'outline'), TEXT_X, CARD.y + 38);
      g.drawImage(art.text(nextMatchLine(p.ladderWins), 1, 'energyGold', 'outline'), TEXT_X, CARD.y + 54);
      const second = isChampion(p.ladderWins) ? 'BACKYARD CHAMPION!' : trainingLine(nextMatch(p.ladderWins));
      if (second) g.drawImage(art.text(second, 1, 'silver', 'outline'), TEXT_X, CARD.y + 65);
      drawMenu(g, art, menu, MENU_CX, MENU_TOP);
    },
  };
}
