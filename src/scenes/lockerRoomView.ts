import { CLIPS, type AnimName } from '../art/body/animations';
import { ANCHOR } from '../art/body/pose';
import { MASTER, type MasterColor } from '../art/colors';
import { measureText } from '../art/font';
import { BASE_H, BASE_W } from '../engine/viewport';
import { itemPrice, itemStatus, itemsIn, starsFor, unseenGifts, type LockerItemId, type LockerTab, type Outfit } from '../meta/locker';
import type { Profile } from '../meta/profile';
import type { GameArt } from './art';
import { drawMenu } from './menu';
import type { OutfitFx, WorldPoint } from './outfitView';
import { COIN_W, STAR_W, drawButtonHint, drawCoins, drawPanel, drawStar } from './panel';

/** What the panel and Harrison show. */
export interface LockerView {
  tab: LockerTab;
  row: number;
  /** What he's shown in: the try-on, or what he wears. */
  shown: Outfit;
  trying: boolean;
  /** A trail boot is picked: he sprints on the spot. */
  sprinting: boolean;
  /** Seconds left of the cheer, 0 for none. */
  cheerS: number;
  confirm: { label: string; price: number; yes: boolean } | null;
  message: string | null;
}

export const LOCKER_TABS: readonly LockerTab[] = ['kits', 'boots', 'extras'];
const TAB_LABELS: Readonly<Record<LockerTab, string>> = { kits: 'KITS', boots: 'BOOTS', extras: 'EXTRAS' };

/** The cheer: his celebrate clip for this long, hopping |sin| at this rate, this high. */
export const CHEER_S = 1.2;
const CHEER_HOP = { hz: 2.5, px: 6 };

/** The room: a wall of lockers 28 wide from x −1, his (the third) red with his 12; a bench; a tiled floor. */
const WALL = { h: 126, top: 10 };
const LOCKER = { w: 28, x0: -1, mine: 2, top: 16, h: 98, vents: [22, 98], handleY: 60, numberY: 36 };
const BENCH = { y: 114, seatY: 118, legY: 123, legEvery: 60 };
const TILE = 9;

/** Harrison at twice size, his feet here, in front of his locker. */
const SCALE = 2;
export const FEET = { x: 68, y: 166 };
const PLATE_Y = 66;

const P = { x: 140, y: 6, w: 174, h: 168 };
const RIGHT = P.x + P.w - 8;
const TAB_Y = P.y + 24;
const ROWS_Y = P.y + 44;
const ROW_H = 11;
const VISIBLE = 8;
const BLURB_Y = P.y + 140;
const HINT_Y = P.y + P.h - 12;
const HINT_GAP = 14;
/** The buy box, over the list; the panel dims behind it. */
const BOX = { x: 152, y: 52, w: 150, h: 68, pad: 8 };
const DIM = 0.5;

function rect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: MasterColor): void {
  g.fillStyle = MASTER[c];
  g.fillRect(x, y, w, h);
}

const centred = (g: CanvasRenderingContext2D, t: HTMLCanvasElement, cx: number, y: number) => g.drawImage(t, Math.round(cx - t.width / 2), y);
const rightAligned = (g: CanvasRenderingContext2D, t: HTMLCanvasElement, r: number, y: number) => g.drawImage(t, r - t.width, y);

/** One row's right-hand status text, e.g. 'WEARING', 'OWNED', '200', '50'. */
export function statusText(p: Profile, id: LockerItemId): string {
  const s = itemStatus(p, id);
  if (s === 'wearing') return 'WEARING';
  if (s === 'owned') return 'OWNED';
  return `${itemPrice(id) ?? starsFor(id)}`;
}

/** The A hint for a row: 'BUY', 'WEAR', 'TAKE OFF' or null. */
export function aHint(p: Profile, id: LockerItemId): 'BUY' | 'WEAR' | 'TAKE OFF' | null {
  const s = itemStatus(p, id);
  if (s === 'buy') return 'BUY';
  if (s === 'owned') return 'WEAR';
  return s === 'wearing' && id.startsWith('extra:') ? 'TAKE OFF' : null;
}

export function drawRoom(g: CanvasRenderingContext2D, art: GameArt): void {
  rect(g, 0, 0, BASE_W, WALL.h, 'charcoal');
  rect(g, 0, 0, BASE_W, WALL.top, 'slate');
  rect(g, 0, WALL.top, BASE_W, 1, 'outline');
  for (let i = 0; i * LOCKER.w + LOCKER.x0 < BASE_W; i++) {
    const x = i * LOCKER.w + LOCKER.x0;
    const mine = i === LOCKER.mine;
    const [edge, body, hi, vent]: MasterColor[] = mine ? ['redDark', 'red', 'redLight', 'redDark'] : ['outline', 'slate', 'gray', 'charcoal'];
    rect(g, x, LOCKER.top, LOCKER.w - 2, LOCKER.h, edge!);
    rect(g, x + 1, LOCKER.top + 1, LOCKER.w - 4, LOCKER.h - 2, body!);
    rect(g, x + 1, LOCKER.top + 1, 1, LOCKER.h - 2, hi!);
    for (const top of LOCKER.vents) for (let r = 0; r < 3; r++) rect(g, x + 6, top + r * 3, LOCKER.w - 14, 1, vent!);
    rect(g, x + LOCKER.w - 7, LOCKER.handleY, 2, 7, mine ? 'white' : 'silver');
    if (mine) centred(g, art.text('12', 2, 'white', 'outline'), x + (LOCKER.w - 2) / 2, LOCKER.numberY);
  }
  rect(g, 0, BENCH.y, BASE_W, BASE_H - BENCH.y, 'black');
  for (let y = WALL.h; y < BASE_H; y += TILE) for (let x = Math.floor(y / TILE) % 2 ? 0 : TILE; x < BASE_W; x += TILE * 2) rect(g, x, y, TILE, TILE, 'charcoal');
  rect(g, 0, BENCH.seatY, BASE_W, 4, 'wood');
  rect(g, 0, BENCH.seatY + 4, BASE_W, 1, 'outline');
  for (let x = 10; x < BASE_W; x += BENCH.legEvery) rect(g, x, BENCH.legY, 3, 8, 'outline');
}

const frameAt = (clip: AnimName, t: number) => Math.floor(Math.max(0, t) * CLIPS[clip].fps) % CLIPS[clip].frameCount;

/** His clip now: the cheer's celebrate with a hop, sprinting on the spot for a trail boot, or idle. */
function pose(v: LockerView, nowS: number): { clip: AnimName; frame: number; hop: number } {
  if (v.cheerS > 0) {
    const t = CHEER_S - v.cheerS;
    return { clip: 'celebrate', frame: frameAt('celebrate', t), hop: Math.round(Math.abs(Math.sin(t * Math.PI * CHEER_HOP.hz)) * CHEER_HOP.px) };
  }
  const clip = v.sprinting ? 'sprint' : 'idle';
  return { clip, frame: frameAt(clip, nowS), hop: 0 };
}

function drawHarrison(g: CanvasRenderingContext2D, art: GameArt, v: LockerView, fx: OutfitFx, nowS: number): void {
  const { clip, frame, hop } = pose(v, nowS);
  rect(g, FEET.x - 14, FEET.y - 1, 28, 3, 'outline');
  const sprite = art.preview(v.shown, clip, frame, nowS);
  g.drawImage(sprite, FEET.x - ANCHOR.x * SCALE, FEET.y - ANCHOR.y * SCALE - hop, sprite.width * SCALE, sprite.height * SCALE);
  // In front of him, as in the room study: his embers, trail and the cheer's sparkles.
  const toScreen = (q: WorldPoint) => ({ x: FEET.x + q.x * SCALE, y: FEET.y - (q.y + q.z) * SCALE });
  fx.draw(g, nowS, art.previewImage(v.shown, clip, frame), { x: 0, y: hop / SCALE, z: 0 }, 1, v.sprinting, toScreen, SCALE);
  if (v.trying) {
    const t = art.text('TRYING ON', 1, 'white', 'outline');
    drawPanel(g, Math.round(FEET.x - t.width / 2 - 4), PLATE_Y, t.width + 8, 12);
    centred(g, t, FEET.x, PLATE_Y + 3);
  }
}

/** WEARING, OWNED (NEW before it on an unseen gift), the price with a coin, or a grey star and the stars a gift needs. */
function drawStatus(g: CanvasRenderingContext2D, art: GameArt, p: Profile, id: LockerItemId, y: number, isNew: boolean): void {
  const s = itemStatus(p, id);
  const label = statusText(p, id);
  if (s === 'wearing') return rightAligned(g, art.text(label, 1, 'volt', 'outline'), RIGHT, y);
  if (s === 'owned') {
    const t = art.text(label, 1, 'silver', 'outline');
    rightAligned(g, t, RIGHT, y);
    if (isNew) rightAligned(g, art.text('NEW', 1, 'flameLight', 'outline'), RIGHT - t.width - 5, y);
    return;
  }
  if (s === 'buy') return drawCoins(g, art, label, RIGHT, y, p.coins >= (itemPrice(id) ?? 0) ? 'energyGold' : 'gray');
  const t = art.text(label, 1, 'gray', 'outline');
  rightAligned(g, t, RIGHT, y);
  drawStar(g, RIGHT - t.width - STAR_W - 3, y + 1, false);
}

function drawTabs(g: CanvasRenderingContext2D, art: GameArt, open: LockerTab): void {
  let x = P.x + 8;
  const put = (s: string, ink: MasterColor, gap: number) => {
    const t = art.text(s, 1, ink, 'outline');
    g.drawImage(t, x, TAB_Y);
    x += t.width + gap;
  };
  put('<', 'gray', 4);
  for (const tab of LOCKER_TABS) put(TAB_LABELS[tab], tab === open ? 'energyGold' : 'gray', 5);
  x -= 1;
  put('>', 'gray', 0);
}

function drawRows(g: CanvasRenderingContext2D, art: GameArt, p: Profile, v: LockerView): void {
  const items = itemsIn(v.tab);
  const top = Math.max(0, Math.min(v.row - VISIBLE + 2, items.length - VISIBLE));
  const unseen = unseenGifts(p);
  items.slice(top, top + VISIBLE).forEach((it, k) => {
    const y = ROWS_Y + k * ROW_H;
    const on = top + k === v.row;
    if (on) {
      rect(g, P.x + 4, y - 2, P.w - 8, ROW_H, 'charcoal');
      g.drawImage(art.text('+', 1, 'energyGold', 'outline'), P.x + 8, y);
    }
    const ink = on ? 'energyGold' : itemStatus(p, it.id) === 'locked' ? 'gray' : 'white';
    g.drawImage(art.text(it.label, 1, ink, 'outline'), P.x + 16, y);
    drawStatus(g, art, p, it.id, y, unseen.includes(it.id));
  });
  // Marks above and below say the list scrolls.
  const mark = (y: number, dir: 1 | -1) => {
    for (let k = 0; k < 3; k++) rect(g, P.x + P.w / 2 - k, y + dir * k, 1 + 2 * k, 1, 'gray');
  };
  if (top > 0) mark(ROWS_Y - 5, 1);
  if (top + VISIBLE < items.length) mark(ROWS_Y + VISIBLE * ROW_H - 1, -1);
}

/** Button hints side by side, centred on cx. */
function drawHints(g: CanvasRenderingContext2D, art: GameArt, hints: readonly (readonly [HTMLCanvasElement, string])[], cx: number, y: number): void {
  const widths = hints.map(([b, l]) => b.width + 4 + art.text(l, 1, 'silver', 'outline').width);
  let x = cx - (widths.reduce((a, w) => a + w, 0) + HINT_GAP * (hints.length - 1)) / 2;
  hints.forEach(([b, l], i) => {
    drawButtonHint(g, art, b, l, x + widths[i]! / 2, y);
    x += widths[i]! + HINT_GAP;
  });
}

function drawConfirm(g: CanvasRenderingContext2D, art: GameArt, c: NonNullable<LockerView['confirm']>): void {
  g.save();
  g.globalAlpha = DIM;
  rect(g, P.x - 1, P.y - 1, P.w + 2, P.h + 2, 'ink');
  g.restore();
  drawPanel(g, BOX.x, BOX.y, BOX.w, BOX.h);
  const cx = BOX.x + BOX.w / 2;
  const ask = `BUY ${c.label}?`;
  // A long name asks in small letters, a little lower, so the box holds it.
  if (measureText(ask, 2) <= BOX.w - 2 * BOX.pad) centred(g, art.text(ask, 2, 'energyGold', 'outline'), cx, BOX.y + 8);
  else centred(g, art.text(ask, 1, 'energyGold', 'outline'), cx, BOX.y + 11);
  const price = `${c.price}`;
  const w = art.text(price, 1, 'energyGold', 'outline').width + COIN_W + 2;
  drawCoins(g, art, price, Math.round(cx + w / 2), BOX.y + 26);
  drawMenu(g, art, { items: ['YES', 'NO'], index: c.yes ? 0 : 1 }, cx, BOX.y + 38);
}

export function drawLockerRoom(g: CanvasRenderingContext2D, art: GameArt, p: Profile, v: LockerView, fx: OutfitFx, nowS: number): void {
  drawRoom(g, art);
  drawHarrison(g, art, v, fx, nowS);
  drawPanel(g, P.x, P.y, P.w, P.h);
  g.drawImage(art.text('LOCKER ROOM', 2, 'energyGold', 'outline'), P.x + 8, P.y + 6);
  drawCoins(g, art, `${p.coins}`, RIGHT, TAB_Y);
  drawTabs(g, art, v.tab);
  rect(g, P.x + 6, P.y + 36, P.w - 12, 1, 'slate');
  drawRows(g, art, p, v);
  const item = itemsIn(v.tab)[v.row];
  if (!item) return;
  const line = v.message ? art.text(v.message, 1, 'redLight', 'outline') : art.text(item.blurb, 1, 'silver', 'outline');
  centred(g, line, P.x + P.w / 2, BLURB_Y);
  const a = aHint(p, item.id);
  drawHints(g, art, [...(a ? [[art.buttons.A, a] as const] : []), [art.buttons.B, 'BACK'] as const], P.x + P.w / 2, HINT_Y);
  if (v.confirm) drawConfirm(g, art, v.confirm);
}
