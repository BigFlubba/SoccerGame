import { MASTER } from '../art/colors';
import type { GameArt } from './art';

const BUTTON_GAP = 4;
const BUTTON_RAISE = 2;
export const COIN_W = 7;
/** A star is 5×5; its outline ring adds a pixel each side. */
export const STAR_W = 5;
/** Three stars sit this far apart, left edge to left edge. */
export const STAR_GAP = 7;
const STAR_ROWS = ['..#..', '#####', '.###.', '.###.', '#...#'] as const;

/** A dark panel with a one-pixel outline, as behind Options and the menus. */
export function drawPanel(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  g.fillStyle = MASTER.outline;
  g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = MASTER.ink;
  g.fillRect(x, y, w, h);
}

/** A 7×7 gold coin with its top-left corner at (x, y). */
export function drawCoin(g: CanvasRenderingContext2D, x: number, y: number): void {
  g.fillStyle = MASTER.outline;
  g.fillRect(x + 1, y, 5, 7);
  g.fillRect(x, y + 1, 7, 5);
  g.fillStyle = MASTER.gold;
  g.fillRect(x + 2, y + 1, 3, 5);
  g.fillRect(x + 1, y + 2, 5, 3);
  g.fillStyle = MASTER.goldDark;
  g.fillRect(x + 4, y + 3, 1, 2);
  g.fillStyle = MASTER.energyGoldLight;
  g.fillRect(x + 2, y + 2, 1, 2);
}

/** A 5×5 star with its top-left corner at (x, y): gold when lit, slate when not, with a one-pixel outline ring. */
export function drawStar(g: CanvasRenderingContext2D, x: number, y: number, lit: boolean): void {
  const px = (fill: string, dx: number, dy: number) => {
    g.fillStyle = fill;
    g.fillRect(x + dx, y + dy, 1, 1);
  };
  // The ring: every neighbour of a star pixel that isn't one itself.
  STAR_ROWS.forEach((row, ry) => {
    [...row].forEach((c, rx) => {
      if (c !== '#') return;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (STAR_ROWS[ry + dy]?.[rx + dx] !== '#') px(MASTER.outline, rx + dx, ry + dy);
        }
      }
    });
  });
  STAR_ROWS.forEach((row, ry) => {
    [...row].forEach((c, rx) => {
      if (c === '#') px(lit ? MASTER.energyGold : MASTER.slate, rx, ry);
    });
  });
}

/** Three stars, STAR_GAP apart, the first `lit` of them gold. */
export function drawStars(g: CanvasRenderingContext2D, x: number, y: number, lit: number): void {
  for (let i = 0; i < 3; i++) drawStar(g, x + i * STAR_GAP, y, i < lit);
}

/** A coin and an amount, e.g. the 210 he has, right-aligned to `right`. */
export function drawCoins(g: CanvasRenderingContext2D, art: GameArt, label: string, right: number, y: number): void {
  const t = art.text(label, 1, 'energyGold', 'outline');
  const x = right - t.width;
  g.drawImage(t, x, y);
  drawCoin(g, x - COIN_W - 2, y);
}

/** A bar `w` wide, filled to `fraction` (0..1) in `fill`, on a dark track with an outline. */
export function drawBar(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fraction: number, fill: string): void {
  g.fillStyle = MASTER.outline;
  g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = MASTER.charcoal;
  g.fillRect(x, y, w, h);
  g.fillStyle = fill;
  g.fillRect(x, y, Math.round(w * Math.min(Math.max(fraction, 0), 1)), h);
}

/** A controller button picture and its label, e.g. B BACK, centred on `cx`. */
export function drawButtonHint(g: CanvasRenderingContext2D, art: GameArt, button: HTMLCanvasElement, label: string, cx: number, y: number): void {
  const t = art.text(label, 1, 'silver', 'outline');
  const left = Math.round(cx - (button.width + BUTTON_GAP + t.width) / 2);
  g.drawImage(button, left, y - BUTTON_RAISE);
  g.drawImage(t, left + button.width + BUTTON_GAP, y);
}
