import { M } from '../colors';
import { IndexedImage } from '../indexedImage';
import { ditherRect, fillCircle, fillRect, fillRoof } from '../scenery';

export interface VenueLayers {
  far: IndexedImage;
  mid: IndexedImage;
  near: IndexedImage;
  ground: IndexedImage;
}

/** How fast each layer scrolls relative to the camera. */
export const PARALLAX = { far: 0.2, mid: 0.5, near: 0.8, ground: 1 } as const;

const H = 180;
/** Screen row of the ground line (world height 0). */
const GROUND_Y = 164;
const STRIPE_W = 32;
const FIELD_W = 640;
/** Side fences fill x 0–3 and 636–639; the ball bounces off their inner faces at 4 and 636. */
const SIDE_FENCE_W = 4;
const SIDE_FENCE_TOP = 112;

/** Evening sky: pale blue overhead fading to gold, then flame at the horizon, with a low sun. Tiles seamlessly. */
function far(): IndexedImage {
  const img = new IndexedImage(320, H);
  const w = img.width;
  fillRect(img, 0, 0, w, 36, M.skyLight);
  ditherRect(img, 0, 36, w, 10, M.skyLight, M.energyGoldLight);
  fillRect(img, 0, 46, w, 44, M.energyGoldLight);
  ditherRect(img, 0, 90, w, 10, M.energyGoldLight, M.flame);
  fillRect(img, 0, 100, w, H - 100, M.flame);
  // Low sun, sinking behind the houses, well clear of the tiling seam.
  fillCircle(img, 214, 86, 11, M.energyGold);
  fillCircle(img, 214, 86, 7, M.auraWhite);
  // Thin cloud streaks lit from below.
  for (const [x, y, len] of [
    [40, 30, 34],
    [52, 33, 20],
    [150, 58, 40],
    [250, 74, 28],
    [262, 77, 16],
  ] as const) {
    fillRect(img, x, y, len, 1, M.auraWhite);
  }
  return img;
}

/** Rooftops and trees in silhouette, with a few warm lit windows. */
function mid(): IndexedImage {
  const img = new IndexedImage(480, H);
  const house = (x: number, w: number, wallTop: number, roofTop: number, windows: readonly number[]) => {
    fillRoof(img, x - 4, x + w + 3, x + Math.floor(w / 2), roofTop, wallTop - 1, M.ink);
    fillRect(img, x, wallTop, w, GROUND_Y - wallTop, M.charcoal);
    fillRect(img, x + w - 16, roofTop + 4, 6, wallTop - roofTop - 6, M.ink); // chimney
    for (const wx of windows) {
      fillRect(img, x + wx, wallTop + 4, 6, 7, M.gold);
      fillRect(img, x + wx, wallTop + 7, 6, 1, M.goldDark);
    }
  };
  const tree = (cx: number, top: number, r: number) => {
    fillRect(img, cx - 2, top + r, 4, GROUND_Y - top - r, M.black);
    fillCircle(img, cx, top + r, r, M.black);
    fillCircle(img, cx - r + 4, top + r + 6, r - 4, M.black);
    fillCircle(img, cx + r - 4, top + r + 5, r - 4, M.black);
  };
  tree(6, 92, 14);
  house(28, 78, 106, 84, [12, 52]);
  tree(132, 86, 18);
  house(162, 96, 110, 88, [14, 40, 72]);
  tree(286, 96, 12);
  house(306, 70, 104, 82, [10, 46]);
  tree(410, 88, 16);
  house(432, 46, 112, 94, [18]);
  return img;
}

/** The back fence: wooden planks with a washing line of pegged clothes above it. */
function near(): IndexedImage {
  const img = new IndexedImage(576, H);
  const w = img.width;
  const top = 128;
  fillRect(img, 0, top, w, GROUND_Y - top, M.wood);
  for (let x = 0; x < w; x += 8) {
    fillRect(img, x, top, 1, GROUND_Y - top, M.hairShadow);
    fillRect(img, x + 1, top, 1, GROUND_Y - top, M.hair);
    img.set(x + 4, top - 1, M.wood); // rounded plank tops
    fillRect(img, x + 3, top - 1, 3, 1, M.wood);
  }
  for (const y of [top + 6, GROUND_Y - 8]) fillRect(img, 0, y, w, 2, M.hairShadow);

  // Washing line between two posts, sagging slightly in the middle.
  const [p0, p1, lineY] = [150, 382, 100];
  for (const px of [p0, p1]) {
    fillRect(img, px - 1, lineY - 4, 3, GROUND_Y - lineY + 4, M.hairShadow);
    fillRect(img, px - 4, lineY - 4, 9, 2, M.hairShadow);
  }
  const sag = (x: number) => lineY + Math.round(6 * Math.sin((Math.PI * (x - p0)) / (p1 - p0)));
  for (let x = p0 + 2; x < p1 - 1; x++) img.set(x, sag(x), M.silver);

  const garment = (x: number, w: number, h: number, body: number, shade: number, shirt = false) => {
    const y = sag(x + Math.floor(w / 2)) + 1;
    fillRect(img, x, y, w, h, body);
    fillRect(img, x, y + h - 1, w, 1, shade);
    if (shirt) {
      fillRect(img, x - 3, y, 3, 5, body);
      fillRect(img, x + w, y, 3, 5, body);
      fillRect(img, x + Math.floor(w / 2) - 1, y, 3, 2, shade); // collar
    }
    img.set(x + 1, y - 1, M.white);
    img.set(x + w - 2, y - 1, M.white); // pegs
  };
  garment(170, 14, 16, M.red, M.redDark, true);
  garment(200, 18, 24, M.white, M.silver);
  garment(232, 12, 14, M.blue, M.navy, true);
  garment(262, 6, 9, M.volt, M.voltShadow);
  garment(272, 6, 9, M.volt, M.voltShadow);
  garment(296, 22, 18, M.skyLight, M.sky);
  garment(334, 14, 16, M.slate, M.charcoal, true);
  return img;
}

/** The pitch: grass with mowing stripes from the ground line down, and short side fences at both ends. */
function ground(): IndexedImage {
  const img = new IndexedImage(FIELD_W, H);
  for (let x = 0; x < FIELD_W; x += STRIPE_W) {
    fillRect(img, x, GROUND_Y, STRIPE_W, H - GROUND_Y, (x / STRIPE_W) % 2 === 0 ? M.grass : M.grassLight);
  }
  fillRect(img, 0, GROUND_Y, FIELD_W, 1, M.grassDark);
  // Sparse darker tufts so the stripes read as grass, not paint.
  for (let x = 3; x < FIELD_W; x += 7) img.set(x, GROUND_Y + 2 + ((x * 5) % 11), M.grassDark);
  for (const x0 of [0, FIELD_W - SIDE_FENCE_W]) {
    fillRect(img, x0, SIDE_FENCE_TOP, SIDE_FENCE_W, H - SIDE_FENCE_TOP, M.wood);
    fillRect(img, x0 === 0 ? SIDE_FENCE_W - 1 : x0, SIDE_FENCE_TOP, 1, H - SIDE_FENCE_TOP, M.hairShadow);
  }
  return img;
}

export function backyardLayers(): VenueLayers {
  return { far: far(), mid: mid(), near: near(), ground: ground() };
}

/** Goal frame geometry, world units: net back at x 12, goal line at 28, bar 28–30 high. */
const GOAL_W = 28 - 12 + 1;
const GOAL_H = 30;
const BAR_THICK = 2;
const NET_CELL = 4;

/**
 * The left goal, as two sprites with their bottom-left at world (12, 0):
 * `back` (net, back post, crossbar) is drawn behind the players and `front`
 * (the front post on the goal line) over them. flipX both for the right goal.
 */
export function goalSprites(): { back: IndexedImage; front: IndexedImage } {
  const back = new IndexedImage(GOAL_W, GOAL_H);
  for (let y = BAR_THICK; y < GOAL_H; y++) {
    for (let x = 1; x < GOAL_W - 1; x++) {
      if ((x + y) % NET_CELL === 0 || (x - y + GOAL_H * NET_CELL) % NET_CELL === 0) back.set(x, y, M.silver);
    }
  }
  fillRect(back, 0, 0, GOAL_W, BAR_THICK, M.white);
  fillRect(back, 0, 0, 1, GOAL_H, M.white);
  const front = new IndexedImage(GOAL_W, GOAL_H);
  fillRect(front, GOAL_W - 1, 0, 1, GOAL_H, M.white);
  return { back, front };
}
