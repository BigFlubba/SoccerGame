import { ANCHOR } from '../art/body/pose';
import { MASTER } from '../art/colors';
import { BASE_W } from '../engine/viewport';
import type { Camera } from '../game/camera';
import { VENUES, type CareerMatch } from '../meta/career';
import { BONUSES } from '../meta/objectives';
import type { Profile } from '../meta/profile';
import type { GameContext } from './context';
import { createMatchScene, newSeed } from './matchScene';
import { drawLayers } from './matchView';
import { drawButtonHint } from './panel';
import type { Scene } from './scene';

export interface VsScene extends Scene {
  readonly match: CareerMatch;
  /** The card's text, top to bottom. */
  readonly lines: readonly string[];
}

/** The card kicks off by itself after this long. */
export const VS_AUTO_S = 2;

/** The venue behind the card, still, as the road map shows it. */
const CAM: Camera = { x: 40 };
/** The band behind the three lines is dimmed, as the venue screen's header is: the sky's cloud streak and the washing line are behind them. */
const HEADER = { h: 86, dim: 0.45 };
const LINE_YS = [30, 52, 74] as const;
const LINE_SCALES = [2, 2, 1] as const;
/** The two of them stand facing each other on the pitch line. */
const PITCH_Y = 150;
const HOME_X = 110;
const AWAY_X = 210;
const HINT_Y = 160;

/** The card's lines: the match, who plays, and the bonus. Part 2 adds the boss's tip line after a loss. */
export function vsLines(match: CareerMatch, _p: Profile): string[] {
  const venue = VENUES.find(v => v.id === match.venue)!;
  const title = match.kind === 'boss' ? `${venue.name} BOSS` : `MATCH ${match.rung}`;
  return [title, `HARRISON VS ${match.name}`, `BONUS: ${BONUSES[match.bonus].label}`];
}

/**
 * A short card before kickoff naming the opponent and the bonus. A, X or
 * Start kicks off at once; otherwise it kicks off itself after VS_AUTO_S.
 * B or Esc goes back where it came from.
 */
export function createVsScene(ctx: GameContext, match: CareerMatch, back: () => Scene): VsScene {
  const { art } = ctx;
  const lines = vsLines(match, ctx.profile);
  let t = 0;
  const kickOff = () => createMatchScene(ctx, newSeed(), match);
  return {
    kind: 'vs',
    match,
    lines,
    update(input, dt) {
      // B or Esc (pause plus back) goes back; a lone Start kicks off, unlike the menus.
      if (input.pressed.has('back')) {
        ctx.audio.play('menuBack');
        return back();
      }
      if (input.pressed.has('confirm') || input.pressed.has('shoot') || input.pressed.has('pause')) {
        ctx.audio.play('menuConfirm');
        return kickOff();
      }
      t += dt;
      return t >= VS_AUTO_S - 1e-9 ? kickOff() : null;
    },
    draw(g) {
      drawLayers(g, CAM, art);
      g.save();
      g.globalAlpha = HEADER.dim;
      g.fillStyle = MASTER.ink;
      g.fillRect(0, 0, BASE_W, HEADER.h);
      g.restore();
      lines.forEach((line, i) => {
        const text = art.text(line, LINE_SCALES[i] ?? 1, i === 0 ? 'energyGold' : 'white', 'outline');
        g.drawImage(text, Math.round(BASE_W / 2 - text.width / 2), LINE_YS[i] ?? HINT_Y);
      });
      // The stand-in draws Max until Biscuit lands (plan part 2).
      g.drawImage(art.home.right.idle[0]!, HOME_X - ANCHOR.x, PITCH_Y - ANCHOR.y);
      g.drawImage(art.away.left.idle[0]!, AWAY_X - ANCHOR.x, PITCH_Y - ANCHOR.y);
      drawButtonHint(g, art, art.buttons.A, 'KICK OFF', BASE_W / 2, HINT_Y);
    },
  };
}
