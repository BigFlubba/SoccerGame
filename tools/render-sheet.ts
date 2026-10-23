/**
 * Renders the character sheet to preview/character-sheet.png for review.
 * Run with `npm run sheet`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { bakeAll } from '../src/art/body/bake';
import { drawFigure } from '../src/art/body/drawFigure';
import { standingPose } from '../src/art/body/pose';
import { HARRISON_BODY } from '../src/art/body/proportions';
import { C, MASTER, resolvePalette, toRGBA, type LookColors } from '../src/art/colors';
import { HARRISON_HEADS, HARRISON_POWER_HEADS } from '../src/art/harrison/head';
import { harrisonLook, type PowerForm } from '../src/art/harrison/look';
import { renderText, textPalette } from '../src/art/font';
import { harrisonPortrait } from '../src/art/harrison/portrait';
import { IndexedImage, blit } from '../src/art/indexedImage';
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

const standing = standingPose(HARRISON_BODY);
const baked = bakeAll(HARRISON_BODY, HARRISON_HEADS);
const powered = bakeAll(HARRISON_BODY, HARRISON_POWER_HEADS);
const max = bakeAll(HARRISON_BODY, MAX_HEADS);
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
  [text("HARRISON 0-0 MAX 45'", 1), text('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 1), text("0123456789 -':!?.,/+", 1)],
  [text("HARRISON 0-0 MAX 45'", 2), text('GOAL! PERFECT', 2)],
];

const sheet = composeSheet(rows, { scale: SCALE, gap: GAP, background: BACKGROUND });
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, encodePNG(sheet.width, sheet.height, sheet.rgba));
console.log(`wrote ${OUT_FILE} (${sheet.width}×${sheet.height})`);
