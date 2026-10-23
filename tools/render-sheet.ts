/**
 * Renders the character sheet to preview/character-sheet.png for review.
 * Run with `npm run sheet`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { bakeAll } from '../src/art/body/bake';
import { drawFigure } from '../src/art/body/drawFigure';
import { standingPose } from '../src/art/body/pose';
import { HARRISON_BODY } from '../src/art/body/proportions';
import { C, MASTER, masterPalette, resolvePalette, toRGBA, type LookColors, type ResolvedPalette } from '../src/art/colors';
import { HARRISON_HEADS, HARRISON_POWER_HEADS } from '../src/art/harrison/head';
import { harrisonLook, type PowerForm } from '../src/art/harrison/look';
import { ballFrames } from '../src/art/ball';
import { ANCHOR } from '../src/art/body/pose';
import { renderText, textPalette } from '../src/art/font';
import { PARALLAX, backyardLayers, goalSprites } from '../src/art/venues/backyard';
import { harrisonPortrait } from '../src/art/harrison/portrait';
import { IndexedImage, blit, flipX } from '../src/art/indexedImage';
import { MAX_HEADS, maxLook } from '../src/art/opponents/max';
import type { KitId } from '../src/art/kits';
import { addOutline } from '../src/art/raster';
import { encodePNG } from './png';
import { composeSheet, type SheetItem } from './sheet';

const SCALE = 4;
const GAP = 4;
const BACKGROUND = [200, 204, 212] as const;
const SWATCH = 6;
const OUT_DIR = 'preview';
const OUT_FILE = `${OUT_DIR}/character-sheet.png`;
const FACINGS = ['side', 'threeQuarter', 'front'] as const;

function swatch(hex: string): SheetItem {
  const n = parseInt(hex.slice(1), 16);
  const rgba = new Uint8Array(SWATCH * SWATCH * 4);
  for (let i = 0; i < SWATCH * SWATCH; i++) rgba.set([(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff, 255], i * 4);
  return { width: SWATCH, height: SWATCH, rgba };
}

/** Resolves an image with a look, outlining a padded copy first when asked. */
function resolved(img: IndexedImage, look: LookColors, outline = false): SheetItem {
  let src = img;
  if (outline) {
    src = new IndexedImage(img.width + 2, img.height + 2);
    blit(src, img, 1, 1);
    addOutline(src, C.Outline);
  }
  return { width: src.width, height: src.height, rgba: toRGBA(src, resolvePalette(look)) };
}

/** Resolves an image with Harrison's look. */
function item(img: IndexedImage, kit: KitId = 'home', form: PowerForm = 'base', outline = false): SheetItem {
  return resolved(img, harrisonLook(kit, form), outline);
}

/** HUD-style text: white ink, dark outline. */
function text(s: string, scale: number): SheetItem {
  const img = renderText(s, scale);
  return { width: img.width, height: img.height, rgba: toRGBA(img, textPalette('white', 'outline')) };
}

/** Paints a resolved image into a 320×180 RGBA view, skipping transparent pixels. */
function paint(view: Uint8ClampedArray, img: IndexedImage, palette: ResolvedPalette, dx: number, dy: number): void {
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const id = img.get(x, y);
      const vx = x + dx;
      const vy = y + dy;
      if (id === 0 || vx < 0 || vy < 0 || vx >= VIEW_W || vy >= VIEW_H) continue;
      view.set(palette[id]!, (vy * VIEW_W + vx) * 4);
    }
  }
}

const VIEW_W = 320;
const VIEW_H = 180;
const GROUND_Y = 164;

/** The Backyard as the camera at `cam` sees it, with both goals, Harrison, Max and the ball. */
function backyardView(cam: number): SheetItem {
  const view = new Uint8ClampedArray(VIEW_W * VIEW_H * 4);
  const pal = masterPalette();
  const L = backyardLayers();
  const farX = -Math.round(cam * PARALLAX.far);
  paint(view, L.far, pal, farX, 0);
  paint(view, L.far, pal, farX + L.far.width, 0);
  for (const name of ['mid', 'near', 'ground'] as const) paint(view, L[name], pal, -Math.round(cam * PARALLAX[name]), 0);
  const goal = goalSprites();
  const goalY = GROUND_Y - (goal.back.height - 1);
  paint(view, goal.back, pal, 12 - cam, goalY);
  paint(view, flipX(goal.back), pal, 612 - cam, goalY);
  paint(view, flipX(max.idle.frames[0]!), resolvePalette(maxLook()), 360 - cam - ANCHOR.x, GROUND_Y - ANCHOR.y);
  paint(view, baked.run.frames[2]!, resolvePalette(harrisonLook()), 280 - cam - ANCHOR.x, GROUND_Y - ANCHOR.y);
  paint(view, ballFrames()[0]!, pal, 300 - cam - 3, GROUND_Y - 3 - 3);
  paint(view, ballFrames()[1]!, pal, 600 - cam - 3, GROUND_Y - 20 - 3);
  paint(view, goal.front, pal, 12 - cam, goalY);
  paint(view, flipX(goal.front), pal, 612 - cam, goalY);
  return { width: VIEW_W, height: VIEW_H, rgba: view };
}

const standing = standingPose(HARRISON_BODY);
const baked = bakeAll(HARRISON_BODY, HARRISON_HEADS);
const powered = bakeAll(HARRISON_BODY, HARRISON_POWER_HEADS);
const max = bakeAll(HARRISON_BODY, MAX_HEADS);
const ballRow = ballFrames().map(f => resolved(f, harrisonLook())).map((it, i) => ({ ...it, rgba: toRGBA(ballFrames()[i]!, masterPalette()) }));
const clipRows = (kit: KitId) => Object.values(baked).map(clip => clip.frames.map(f => item(f, kit)));

const EXPRESSIONS = ['neutral', 'celebrate', 'determined', 'disappointed'] as const;

const rows: SheetItem[][] = [
  [...EXPRESSIONS.map(e => item(harrisonPortrait(e))), item(harrisonPortrait('celebrate'), 'home', 'golden')],
  ...clipRows('home'),
  powered.powerUp.frames.map(f => item(f, 'home', 'golden')),
  powered.powerUp.frames.map(f => item(f, 'home', 'ultra')),
  ...clipRows('away'),
  [
    item(drawFigure(standing, HARRISON_BODY, HARRISON_HEADS), 'home'),
    item(drawFigure(standing, HARRISON_BODY, HARRISON_HEADS), 'away'),
    item(drawFigure(standing, HARRISON_BODY, HARRISON_POWER_HEADS), 'home', 'golden'),
  ],
  [
    ...FACINGS.map(f => item(HARRISON_HEADS[f].image, 'home', 'base', true)),
    ...FACINGS.map(f => item(HARRISON_POWER_HEADS[f].image, 'home', 'golden', true)),
    ...FACINGS.map(f => item(HARRISON_POWER_HEADS[f].image, 'home', 'ultra', true)),
  ],
  Object.values(MASTER).map(swatch),
  [...max.idle.frames, ...max.run.frames].map(f => resolved(f, maxLook())),
  [...FACINGS.map(f => resolved(MAX_HEADS[f].image, maxLook(), true)), item(baked.idle.frames[0]!), resolved(max.idle.frames[0]!, maxLook())],
  [backyardView(0), backyardView(320)],
  ballRow,
  [text("HARRISON 0-0 MAX 45'", 1), text('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 1), text("0123456789 -':!?.,/+", 1)],
  [text("HARRISON 0-0 MAX 45'", 2), text('GOAL! PERFECT', 2)],
];

const sheet = composeSheet(rows, { scale: SCALE, gap: GAP, background: BACKGROUND });
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, encodePNG(sheet.width, sheet.height, sheet.rgba));
console.log(`wrote ${OUT_FILE} (${sheet.width}×${sheet.height})`);
