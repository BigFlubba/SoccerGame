/**
 * Renders the character sheet to preview/character-sheet.png for review.
 * Run with `npm run sheet`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { bakeAll } from '../src/art/body/bake';
import { drawFigure } from '../src/art/body/drawFigure';
import { standingPose } from '../src/art/body/pose';
import { HARRISON_BODY } from '../src/art/body/proportions';
import { C, M, MASTER, masterPalette, resolvePalette, toRGBA, type LookColors, type ResolvedPalette } from '../src/art/colors';
import { HARRISON_HEADS, HARRISON_POWER_HEADS } from '../src/art/harrison/head';
import { harrisonLook, type PowerForm } from '../src/art/harrison/look';
import { BALL_R, ballFrames } from '../src/art/ball';
import { ANCHOR } from '../src/art/body/pose';
import { renderText, textPalette } from '../src/art/font';
import { PARALLAX, backyardLayers, goalSprites } from '../src/art/venues/backyard';
import { harrisonPortrait } from '../src/art/harrison/portrait';
import { IndexedImage, blit, flipX } from '../src/art/indexedImage';
import { MAX_HEADS, maxLook } from '../src/art/opponents/max';
import { BISCUIT_ANCHOR, BISCUIT_FACE, BISCUIT_FRAMES, type DogAnim } from '../src/art/opponents/biscuit';
import type { AnimName } from '../src/art/body/animations';
import { DEPTH_SHEAR, project } from '../src/game/camera';
import { BACKYARD } from '../src/game/field';
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
/** The Backyard composites on their own, for reviewing the venue layout. */
const VENUE_FILE = `${OUT_DIR}/backyard.png`;
const VENUE_SCALE = 3;
/** Biscuit galloping the ball at the left goal, one Backyard view per frame in a strip, for slicing into a GIF. */
const CARRY_FILE = `${OUT_DIR}/biscuit-carry.png`;
const CARRY_FRAMES = 8;
/** How far he gallops between strip frames, px. */
const CARRY_STEP = 14;
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

/** Something standing on the pitch in a composite view, at world (x, y, z). */
interface Actor {
  x: number;
  y: number;
  z: number;
  img: IndexedImage;
  palette: ResolvedPalette;
  /** The sprite pixel that sits on (x, y, z). */
  anchor: { x: number; y: number };
  shadow?: boolean;
}

/** The Backyard as the camera at `cam` sees it: layers, goals, then everything on the pitch, far to near. */
function backyardView(cam: number, actors: readonly Actor[]): SheetItem {
  const view = new Uint8ClampedArray(VIEW_W * VIEW_H * 4);
  const pal = masterPalette();
  const L = backyardLayers();
  const farX = -Math.round(cam * PARALLAX.far);
  paint(view, L.far, pal, farX, 0);
  paint(view, L.far, pal, farX + L.far.width, 0);
  for (const name of ['mid', 'near', 'ground'] as const) paint(view, L[name], pal, -Math.round(cam * PARALLAX[name]), 0);
  const posts: Actor[] = [];
  for (const goal of BACKYARD.goals) {
    const art = goalSprites(goal.side);
    const at = project(goal.lineX, 0, 0, cam);
    const anchor = { x: -art.origin.x, y: -art.origin.y };
    // Nets before posts, as in the match, so a post is drawn over its net.
    for (const [z, img] of [
      [goal.z1, art.farNet],
      [goal.z0, art.nearNet],
    ] as const) {
      posts.push({ x: goal.lineX, y: 0, z, img, palette: pal, anchor: { x: anchor.x + z * DEPTH_SHEAR, y: anchor.y - z } });
    }
    posts.push({ x: goal.lineX, y: 0, z: goal.z0, img: art.nearPost, palette: pal, anchor: { x: anchor.x + goal.z0 * DEPTH_SHEAR, y: anchor.y - goal.z0 } });
    posts.push({ x: goal.lineX, y: 0, z: goal.z1, img: art.farPost, palette: pal, anchor: { x: anchor.x + goal.z1 * DEPTH_SHEAR, y: anchor.y - goal.z1 } });
  }
  const shadow = new IndexedImage(5, 1);
  for (let x = 0; x < 5; x++) shadow.set(x, 0, M.grassDark);
  for (const a of actors) {
    if (!a.shadow) continue;
    const p = project(a.x, 0, a.z, cam);
    paint(view, shadow, pal, Math.round(p.sx) - 2, Math.round(p.sy) + 1);
  }
  for (const a of [...actors, ...posts].sort((m, n) => n.z - m.z)) {
    const p = project(a.x, a.y, a.z, cam);
    paint(view, a.img, a.palette, Math.round(p.sx - a.anchor.x), Math.round(p.sy - a.anchor.y));
  }
  return { width: VIEW_W, height: VIEW_H, rgba: view };
}

const harrisonAt = (x: number, z: number, clip: AnimName, frame: number, facing: 1 | -1 = 1): Actor => {
  const img = baked[clip].frames[frame]!;
  return { x, y: 0, z, img: facing === 1 ? img : flipX(img), palette: resolvePalette(harrisonLook()), anchor: facing === 1 ? ANCHOR : { x: img.width - 1 - ANCHOR.x, y: ANCHOR.y } };
};
const maxAt = (x: number, z: number, clip: AnimName, frame: number, facing: 1 | -1 = -1): Actor => {
  const img = max[clip].frames[frame]!;
  return { x, y: 0, z, img: facing === 1 ? img : flipX(img), palette: resolvePalette(maxLook()), anchor: facing === 1 ? ANCHOR : { x: img.width - 1 - ANCHOR.x, y: ANCHOR.y } };
};
const biscuitAt = (x: number, z: number, clip: DogAnim, frame: number, facing: 1 | -1 = -1): Actor => {
  const img = BISCUIT_FRAMES[clip][frame]!;
  return { x, y: 0, z, img: facing === 1 ? img : flipX(img), palette: masterPalette(), anchor: facing === 1 ? BISCUIT_ANCHOR : { x: img.width - 1 - BISCUIT_ANCHOR.x, y: BISCUIT_ANCHOR.y }, shadow: true };
};
const ballAt = (x: number, y: number, z: number, frame = 0): Actor => ({
  x,
  y,
  z,
  img: ballFrames()[frame]!,
  palette: masterPalette(),
  anchor: { x: BALL_R, y: BALL_R },
  shadow: true,
});
const withShadow = (a: Actor): Actor => ({ ...a, shadow: true });

/** Camera at the left end: Harrison near the camera dribbling, Max on the far side, a shot heading for the far post. */
const leftEndView = () =>
  backyardView(0, [
    withShadow(harrisonAt(150, 12, 'run', 2, -1)),
    ballAt(141, BALL_R, 12),
    withShadow(maxAt(96, 50, 'idle', 0, 1)),
    ballAt(60, 16, 40, 1),
  ]);

/** Camera at the right end: Max dribbling at the near post, Harrison going round him deep, the ball in the net behind. */
const rightEndView = () => {
  const cam = BACKYARD.width + BACKYARD.depth * DEPTH_SHEAR - VIEW_W;
  return backyardView(cam, [withShadow(maxAt(560, 24, 'run', 1)), withShadow(harrisonAt(540, 46, 'run', 3)), ballAt(620, BALL_R, 32, 2)]);
};

/** Camera at the left end: Biscuit galloping the ball at the left goal, Harrison squared up in his way. */
const bossView = (x = 150, frame = 0) => backyardView(0, [biscuitAt(x, 30, 'carry', frame % 4), withShadow(harrisonAt(96, 32, 'idle', 0, 1))]);

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
  [leftEndView(), rightEndView()],
  Object.values(BISCUIT_FRAMES).flat().slice(0, 10).map(f => ({ width: f.width, height: f.height, rgba: toRGBA(f, masterPalette()) })),
  [...Object.values(BISCUIT_FRAMES).flat().slice(10), BISCUIT_FACE].map(f => ({ width: f.width, height: f.height, rgba: toRGBA(f, masterPalette()) })),
  [bossView()],
  ballRow,
  [text("HARRISON 0-0 MAX 45'", 1), text('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 1), text("0123456789 -':!?.,/+", 1)],
  [text("HARRISON 0-0 MAX 45'", 2), text('GOAL! PERFECT', 2)],
];

const sheet = composeSheet(rows, { scale: SCALE, gap: GAP, background: BACKGROUND });
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, encodePNG(sheet.width, sheet.height, sheet.rgba));
console.log(`wrote ${OUT_FILE} (${sheet.width}×${sheet.height})`);

const venue = composeSheet([[leftEndView()], [rightEndView()]], { scale: VENUE_SCALE, gap: GAP, background: BACKGROUND });
writeFileSync(VENUE_FILE, encodePNG(venue.width, venue.height, venue.rgba));
console.log(`wrote ${VENUE_FILE} (${venue.width}×${venue.height})`);

const carry = composeSheet([Array.from({ length: CARRY_FRAMES }, (_, i) => bossView(236 - i * CARRY_STEP, i))], { scale: 1, gap: 0, background: BACKGROUND });
writeFileSync(CARRY_FILE, encodePNG(carry.width, carry.height, carry.rgba));
console.log(`wrote ${CARRY_FILE} (${carry.width}×${carry.height})`);
