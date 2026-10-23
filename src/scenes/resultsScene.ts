import { MASTER } from '../art/colors';
import type { Expression } from '../art/harrison/portrait';
import { BASE_W } from '../engine/viewport';
import { addXp, canUpgrade, xpToNext } from '../meta/economy';
import type { MatchReward } from '../meta/progress';
import { drawBackdrop } from './backdrop';
import type { GameContext } from './context';
import { createHubScene } from './hubScene';
import { createMatchScene, newSeed } from './matchScene';
import { drawMenu, menuCue, stepMenu, type MenuState } from './menu';
import { drawBar, drawButtonHint, drawPanel } from './panel';
import type { Scene } from './scene';
import { createShopScene } from './shopScene';

export interface ResultsScene extends Scene {
  readonly tallyDone: boolean;
  /** NEXT MATCH (or TRY AGAIN), SHOP, HUB: null until the tally is done. */
  readonly menu: MenuState | null;
  /** He can afford an upgrade now: after a trip to the Shop, too. */
  readonly upgradeReady: boolean;
}

/** The tally's beats, in seconds: one reward line every LINE_S, then the XP bar fills over XP_FILL_S. */
export const LINE_S = 0.3,
  XP_FILL_S = 0.8;

/** What the tally shows `t` seconds in. */
export interface Tally {
  /** How many reward lines are showing. */
  lines: number;
  /** The coin total has landed. */
  total: boolean;
  /** 0..1: how far the XP bar has filled toward the match's XP. */
  xpFill: number;
  xpDone: boolean;
  levelUp: boolean;
  done: boolean;
}

/**
 * Lines appear one every LINE_S, the total lands one LINE_S after the last,
 * then the XP bar fills over XP_FILL_S. Then the level-up shows, if any, and
 * the tally is done one LINE_S later.
 */
export function tallyAt(reward: MatchReward, t: number): Tally {
  const n = reward.lines.length;
  const totalAt = (n + 1) * LINE_S;
  const xpAt = totalAt + XP_FILL_S;
  const xpDone = t >= xpAt;
  return {
    lines: Math.min(n, Math.floor(t / LINE_S + 1e-9)),
    total: t >= totalAt,
    xpFill: Math.min(Math.max((t - totalAt) / XP_FILL_S, 0), 1),
    xpDone,
    levelUp: xpDone && reward.levelBonus > 0,
    done: t >= xpAt + LINE_S,
  };
}

/** The ladder's news: a beaten match, the championship, a rematch won, or a try-again. */
export function ladderLine(reward: MatchReward): string {
  const { beaten, champion, match } = reward.ladder;
  if (beaten && champion) return 'BACKYARD CHAMPION!';
  if (beaten) return `MATCH ${match} BEATEN!`;
  if (reward.summary.result === 'win') return 'REMATCH WON!';
  return reward.summary.result === 'draw' ? 'ALL SQUARE. GO AGAIN!' : 'MAX TAKES THIS ONE. GO AGAIN!';
}

export function resultsItems(reward: MatchReward): string[] {
  return [reward.summary.result === 'win' ? 'NEXT MATCH' : 'TRY AGAIN', 'SHOP', 'HUB'];
}

const RESULT_TEXT = { win: 'YOU WIN!', lose: 'YOU LOSE', draw: 'DRAW' } as const;
const FACE: Record<MatchReward['summary']['result'], Expression> = { win: 'celebrate', draw: 'determined', lose: 'disappointed' };
const PANEL = { x: 8, y: 30, w: 304, h: 100 };
const PORTRAIT_AT = { x: PANEL.x + 8, y: PANEL.y + 6 };
const LINES = { x: PANEL.x + 80, right: PANEL.x + 192, y: PANEL.y + 6, h: 9 };
const SUMMARY_X = PANEL.x + 204;
const XP_BAR = { w: 90, h: 4 };
const LADDER_Y = PANEL.y + 80;
const MENU_TOP = PANEL.y + PANEL.h + 6;
const SKIP_Y = MENU_TOP + 14;

/**
 * The match's reward, tallied a line at a time with coin ticks, then the XP
 * bar and any level-up, then a menu. A fresh A, X, Enter or Start skips the
 * tally (and does nothing else). B or Esc goes to the Hub at any time: the
 * reward is already saved. With `skipTally` it opens finished, as when
 * coming back from the Shop.
 */
export function createResultsScene(ctx: GameContext, reward: MatchReward, skipTally = false, index = 0): ResultsScene {
  const { art } = ctx;
  const end = tallyAt(reward, Infinity);
  let t = 0;
  let tally = tallyAt(reward, 0);
  let menu: MenuState | null = null;
  /** Jumps to the end of the tally. A skip still sounds a level-up the tally hadn't reached. */
  const finish = (fanfare: boolean) => {
    if (fanfare && end.levelUp && !tally.levelUp) ctx.audio.play('levelUp');
    tally = end;
    menu = { items: resultsItems(reward), index };
  };
  // Reopened from the Shop: it was all heard the first time.
  if (skipTally) finish(false);
  else ctx.audio.playMusic(reward.summary.result);

  const choose = (item: string): Scene | null => {
    if (item === 'SHOP') return createShopScene(ctx, () => createResultsScene(ctx, reward, true, 1));
    if (item === 'HUB') return createHubScene(ctx);
    return createMatchScene(ctx, newSeed());
  };

  const scene: ResultsScene = {
    kind: 'results',
    get tallyDone() {
      return tally.done;
    },
    get menu() {
      return menu;
    },
    get upgradeReady() {
      return canUpgrade(ctx.profile);
    },
    update(input, dt) {
      if (!menu) {
        if (input.pressed.has('back')) {
          ctx.audio.play('menuBack');
          return createHubScene(ctx);
        }
        if (input.pressed.has('confirm') || input.pressed.has('shoot') || input.pressed.has('pause')) {
          finish(true);
          return null;
        }
        t += dt;
        const next = tallyAt(reward, t);
        if (next.lines > tally.lines || (next.total && !tally.total)) ctx.audio.play('coin');
        if (next.levelUp && !tally.levelUp) ctx.audio.play('levelUp');
        tally = next;
        if (tally.done) finish(true);
        return null;
      }
      // Start confirms here, as on the Hub; Esc (pause plus back) backs out.
      const r = stepMenu(menu, input);
      const chosen = r.back ? null : (r.chosen ?? (input.pressed.has('pause') ? r.m.items[r.m.index]! : null));
      const cue = menuCue(menu, { ...r, chosen });
      if (cue) ctx.audio.play(cue);
      menu = r.m;
      if (r.back) return createHubScene(ctx);
      return chosen ? choose(chosen) : null;
    },
    draw(g, nowS) {
      const { summary } = reward;
      drawBackdrop(g, art, nowS);
      const centre = (img: HTMLCanvasElement, y: number) => g.drawImage(img, Math.round(BASE_W / 2 - img.width / 2), y);
      centre(art.text(RESULT_TEXT[summary.result], 2, 'energyGold', 'outline'), 4);
      centre(art.text(`${summary.goalsFor} - ${summary.goalsAgainst}`, 1, 'white', 'outline'), 20);
      drawPanel(g, PANEL.x, PANEL.y, PANEL.w, PANEL.h);
      g.drawImage(art.portraits[FACE[summary.result]], PORTRAIT_AT.x, PORTRAIT_AT.y);

      reward.lines.slice(0, tally.lines).forEach((line, i) => {
        const y = LINES.y + i * LINES.h;
        g.drawImage(art.text(line.label, 1, 'white', 'outline'), LINES.x, y);
        const amount = art.text(`+${line.coins}`, 1, 'energyGold', 'outline');
        g.drawImage(amount, LINES.right - amount.width, y);
      });

      // The total rolls up as the lines land, and takes the level bonus with the level-up.
      const coins = reward.lines.slice(0, tally.lines).reduce((sum, l) => sum + l.coins, 0) + (tally.levelUp ? reward.levelBonus : 0);
      let y = LINES.y;
      g.drawImage(art.text('COINS', 1, 'silver', 'outline'), SUMMARY_X, y);
      g.drawImage(art.text(`+${coins}`, 2, tally.total ? 'energyGold' : 'white', 'outline'), SUMMARY_X, y + 9);
      y += 27;
      if (tally.total) {
        const shown = addXp(reward.before.level, reward.before.xp, Math.round(reward.xp * tally.xpFill));
        g.drawImage(art.text(`XP +${reward.xp}`, 1, 'silver', 'outline'), SUMMARY_X, y);
        drawBar(g, SUMMARY_X, y + 10, XP_BAR.w, XP_BAR.h, shown.xp / xpToNext(shown.level), MASTER.electric);
      }
      y += 19;
      if (tally.levelUp) {
        g.drawImage(art.text(`LEVEL UP! LEVEL ${reward.after.level}`, 1, 'energyGold', 'outline'), SUMMARY_X, y);
        g.drawImage(art.text(`LEVEL BONUS +${reward.levelBonus}`, 1, 'white', 'outline'), SUMMARY_X, y + 9);
      }

      if (tally.done) {
        centre(art.text(ladderLine(reward), 1, reward.ladder.beaten ? 'energyGold' : 'white', 'outline'), LADDER_Y);
        if (scene.upgradeReady) centre(art.text('UPGRADE READY IN THE SHOP!', 1, 'volt', 'outline'), LADDER_Y + 9);
      }
      if (menu) drawMenu(g, art, menu, BASE_W / 2, MENU_TOP);
      else drawButtonHint(g, art, art.buttons.A, 'SKIP', BASE_W / 2, SKIP_Y);
    },
  };
  return scene;
}
