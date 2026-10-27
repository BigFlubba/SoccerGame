import { ballFrames } from '../art/ball';
import type { AnimName } from '../art/body/animations';
import { bakeAll, type BakedClip } from '../art/body/bake';
import type { HeadSprite } from '../art/body/head';
import type { HeadFacing } from '../art/body/pose';
import { HARRISON_BODY, type BodyProportions } from '../art/body/proportions';
import { C, masterPalette, resolvePalette, type LookColors, type MasterColor, type ResolvedPalette } from '../art/colors';
import { renderText, textPalette } from '../art/font';
import { buttonGlyph, type ButtonName } from '../art/glyphs';
import { HARRISON_HEADS, HARRISON_POWER_HEADS } from '../art/harrison/head';
import { harrisonLook } from '../art/harrison/look';
import { harrisonPortrait, type Expression } from '../art/harrison/portrait';
import { IndexedImage, blit, flipX } from '../art/indexedImage';
import { BISCUIT_FACE, BISCUIT_FRAMES, type DogAnim } from '../art/opponents/biscuit';
import { CREW_BODY, CREW_HEADS, crewLook } from '../art/opponents/crew';
import { MAX_HEADS, maxLook } from '../art/opponents/max';
import { SAM_HEADS, samLook } from '../art/opponents/sam';
import { addOutline } from '../art/raster';
import { backyardLayers, goalSprites, type GoalArt, type VenueLayers } from '../art/venues/backyard';
import { JOGGERS, joggerFrames, parkLayers } from '../art/venues/park';
import type { OpponentId, VenueId } from '../meta/career';
import { toCanvas } from '../engine/bitmaps';
import type { CrewId } from '../game/crew';
import { SpriteCache, type FacingFrames } from '../engine/sprites';

export interface SpriteSet {
  right: Record<AnimName, HTMLCanvasElement[]>;
  left: Record<AnimName, HTMLCanvasElement[]>;
}

/** Biscuit's clips, facing right and left. */
export type DogSprites = Record<DogAnim, FacingFrames>;

/** A goal's sprites, placed at project(lineX, 0, 0, cam) + origin. */
export interface GoalCanvases {
  farNet: HTMLCanvasElement;
  nearNet: HTMLCanvasElement;
  nearPost: HTMLCanvasElement;
  farPost: HTMLCanvasElement;
  origin: { x: number; y: number };
}

/** A venue's four layers, and its joggers' two run frames each, already facing the way each runs (none in the Backyard). */
export interface VenueCanvases {
  layers: Record<keyof VenueLayers, HTMLCanvasElement>;
  joggers: readonly (readonly [HTMLCanvasElement, HTMLCanvasElement])[];
}

export interface OpponentArt {
  sprites: SpriteSet;
  face: HTMLCanvasElement;
}

export interface GameArt {
  /** Every venue with its own art; drawLayers falls back to the Backyard for the rest. */
  venues: Partial<Record<VenueId, VenueCanvases>>;
  goal: Record<'left' | 'right', GoalCanvases>;
  ball: HTMLCanvasElement[];
  /** Controller button pictures, for Help. */
  buttons: Record<ButtonName, HTMLCanvasElement>;
  home: SpriteSet;
  /** Harrison with his hair lifted by the power-up, in his own colours... */
  homePower: SpriteSet;
  /** ...and in Golden Form's gold. */
  homeGolden: SpriteSet;
  /** Every human opponent: their sprites, and their face, front on and outlined, for the venue panel and the boss node. */
  opponents: Record<HumanOpponent, OpponentArt>;
  /** Harrison's portrait in each expression, in the home kit. */
  portraits: Record<Expression, HTMLCanvasElement>;
  /** Biscuit the Dog, the Backyard's boss. */
  biscuit: DogSprites;
  /** His face, front on and outlined, for the boss node and the VS card. */
  biscuitFace: HTMLCanvasElement;
  /** Outlined text, cached per string, scale and colours. */
  text(s: string, scale: number, ink: MasterColor, outline: MasterColor): HTMLCanvasElement;
}

type HumanOpponent = Exclude<OpponentId, 'biscuit'>;
interface OpponentLook {
  heads: Readonly<Record<HeadFacing, HeadSprite>>;
  look: LookColors;
  body: BodyProportions;
}

const crewKid = (id: CrewId): OpponentLook => ({ heads: CREW_HEADS[id], look: crewLook(id), body: CREW_BODY[id] });

/** What each human opponent's sprites and face are drawn from. */
export const OPPONENT_LOOKS: Readonly<Record<HumanOpponent, OpponentLook>> = {
  max: { heads: MAX_HEADS, look: maxLook(), body: HARRISON_BODY },
  brick: crewKid('brick'),
  leo: crewKid('leo'),
  tia: crewKid('tia'),
  pete: crewKid('pete'),
  sam: { heads: SAM_HEADS, look: samLook(), body: HARRISON_BODY },
};

function spriteSet(cache: SpriteCache, who: string, heads: Readonly<Record<HeadFacing, HeadSprite>>, look: LookColors, body: BodyProportions = HARRISON_BODY): SpriteSet {
  const baked = bakeAll(body, heads);
  const palette = resolvePalette(look);
  const set: SpriteSet = { right: {} as SpriteSet['right'], left: {} as SpriteSet['left'] };
  for (const [name, clip] of Object.entries(baked) as [AnimName, BakedClip][]) {
    const f = cache.frames(`${who}/${name}`, () => ({ frames: clip.frames, palette }));
    set.right[name] = f.right;
    set.left[name] = f.left;
  }
  return set;
}

/** A head on its own, with a one-pixel outline ring, in `look`'s colours. */
function faceCanvas(head: HeadSprite, look: LookColors): HTMLCanvasElement {
  const img = new IndexedImage(head.image.width + 2, head.image.height + 2);
  blit(img, head.image, 1, 1);
  addOutline(img, C.Outline);
  return toCanvas(img, resolvePalette(look));
}

function goalCanvases(g: GoalArt, palette: ResolvedPalette): GoalCanvases {
  return { farNet: toCanvas(g.farNet, palette), nearNet: toCanvas(g.nearNet, palette), nearPost: toCanvas(g.nearPost, palette), farPost: toCanvas(g.farPost, palette), origin: g.origin };
}

function venueCanvases(L: VenueLayers, joggers: readonly (readonly [IndexedImage, IndexedImage])[], palette: ResolvedPalette): VenueCanvases {
  return {
    layers: { far: toCanvas(L.far, palette), mid: toCanvas(L.mid, palette), near: toCanvas(L.near, palette), ground: toCanvas(L.ground, palette) },
    joggers: joggers.map(([a, b]) => [toCanvas(a, palette), toCanvas(b, palette)] as const),
  };
}

const BUTTONS: readonly ButtonName[] = ['A', 'B', 'X', 'Y', 'LB', 'RT', 'START'];
const EXPRESSIONS: readonly Expression[] = ['neutral', 'celebrate', 'determined', 'disappointed'];

/** Bakes and resolves every image the match needs, once, at boot. */
export function loadGameArt(): GameArt {
  const master = masterPalette();
  const cache = new SpriteCache();
  const parkJoggers = JOGGERS.map(j => {
    const [a, b] = joggerFrames(j.shirt, j.hair);
    return j.dir === 1 ? ([a, b] as const) : ([flipX(a), flipX(b)] as const);
  });
  const opponentArt = (id: HumanOpponent): OpponentArt => {
    const { heads, look, body } = OPPONENT_LOOKS[id];
    return { sprites: spriteSet(cache, id, heads, look, body), face: faceCanvas(heads.front, look) };
  };
  const texts = new Map<string, HTMLCanvasElement>();
  return {
    venues: { backyard: venueCanvases(backyardLayers(), [], master), park: venueCanvases(parkLayers(), parkJoggers, master) },
    goal: { left: goalCanvases(goalSprites('left'), master), right: goalCanvases(goalSprites('right'), master) },
    ball: ballFrames().map(f => toCanvas(f, master)),
    buttons: Object.fromEntries(BUTTONS.map(b => [b, toCanvas(buttonGlyph(b), master)])) as Record<ButtonName, HTMLCanvasElement>,
    home: spriteSet(cache, 'harrison', HARRISON_HEADS, harrisonLook('home')),
    homePower: spriteSet(cache, 'harrison-power', HARRISON_POWER_HEADS, harrisonLook('home')),
    homeGolden: spriteSet(cache, 'harrison-golden', HARRISON_POWER_HEADS, harrisonLook('home', 'golden')),
    opponents: Object.fromEntries((Object.keys(OPPONENT_LOOKS) as HumanOpponent[]).map(id => [id, opponentArt(id)])) as Record<HumanOpponent, OpponentArt>,
    portraits: Object.fromEntries(EXPRESSIONS.map(e => [e, toCanvas(harrisonPortrait(e), resolvePalette(harrisonLook('home')))])) as Record<Expression, HTMLCanvasElement>,
    biscuit: Object.fromEntries(
      Object.entries(BISCUIT_FRAMES).map(([name, frames]) => [name, cache.frames(`biscuit/${name}`, () => ({ frames: [...frames], palette: master }))]),
    ) as DogSprites,
    biscuitFace: toCanvas(BISCUIT_FACE, master),
    text(s, scale, ink, outline) {
      const key = `${s}|${scale}|${ink}|${outline}`;
      let c = texts.get(key);
      if (!c) {
        c = toCanvas(renderText(s, scale), textPalette(ink, outline));
        texts.set(key, c);
      }
      return c;
    },
  };
}
