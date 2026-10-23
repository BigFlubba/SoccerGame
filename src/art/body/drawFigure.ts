import { C } from '../colors';
import type { HeadSprite } from '../harrison/head';
import { IndexedImage, blit } from '../indexedImage';
import { addOutline, drawSegment, fillPolygon, type Point } from '../raster';
import { FRAME_H, FRAME_W, solvePose, type HeadFacing, type Pose } from './pose';
import type { BodyProportions } from './proportions';

/** Fraction of the thigh covered by shorts, and of the upper arm by the sleeve. */
const SHORTS_LENGTH = 0.8;
const SLEEVE_LENGTH = 0.5;
/** Pixels of bare knee above the sock. */
const KNEE_SKIN = 1;
const WAISTBAND = 3;
const HAND = 2;

/** Colours for one side of the body: near limbs use base tones, far limbs shadow tones. */
interface SideColors {
  skin: number;
  sleeve: number;
  shorts: number;
  socks: number;
  boot: number;
}

// The near sleeve is a lighter red so the arm reads against the jersey behind it.
const NEAR: SideColors = { skin: C.Skin, sleeve: C.JerseyLight, shorts: C.Shorts, socks: C.Socks, boot: C.Boot };
const FAR: SideColors = {
  skin: C.SkinShadow,
  sleeve: C.JerseyShadow,
  shorts: C.ShortsShadow,
  socks: C.SocksShadow,
  boot: C.BootShadow,
};

const round = (p: Point): Point => ({ x: Math.round(p.x), y: Math.round(p.y) });
const lerpPt = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

/** Kit stripes (sleeve and shorts) are only drawn on the near side. */
function drawArm(img: IndexedImage, shoulder: Point, elbow: Point, hand: Point, body: BodyProportions, c: SideColors, stripe: boolean): void {
  drawSegment(img, shoulder, elbow, body.upperArmWidth, t => (t < SLEEVE_LENGTH ? c.sleeve : c.skin));
  if (stripe) drawSegment(img, shoulder, round(lerpPt(shoulder, elbow, SLEEVE_LENGTH)), 1, () => C.Trim);
  drawSegment(img, elbow, hand, body.forearmWidth, () => c.skin);
  drawSegment(img, hand, hand, HAND, () => c.skin);
}

function drawLeg(img: IndexedImage, hip: Point, knee: Point, ankle: Point, toe: Point, body: BodyProportions, c: SideColors, stripe: boolean): void {
  drawSegment(img, hip, knee, body.thighWidth, t => (t < SHORTS_LENGTH ? c.shorts : c.skin));
  if (stripe) drawSegment(img, hip, round(lerpPt(hip, knee, SHORTS_LENGTH)), 1, () => C.Trim);
  const shinLen = Math.max(1, dist(knee, ankle));
  drawSegment(img, knee, ankle, body.shinWidth, t => (t * shinLen < KNEE_SKIN ? c.skin : c.socks));
  // Foot from one pixel behind the ankle (the heel) to the toe; the lower row is the sole.
  const footLen = Math.max(1, dist(ankle, toe));
  const heel = round({ x: ankle.x - (toe.x - ankle.x) / footLen, y: ankle.y - (toe.y - ankle.y) / footLen });
  drawSegment(img, heel, toe, 1, () => c.boot);
  drawSegment(img, { x: heel.x, y: heel.y + 1 }, { x: toe.x, y: toe.y + 1 }, 1, () => C.BootShadow);
}

function drawTorso(img: IndexedImage, hip: Point, shoulder: Point, body: BodyProportions): void {
  const len = Math.max(1, dist(hip, shoulder));
  const up = { x: (shoulder.x - hip.x) / len, y: (shoulder.y - hip.y) / len };
  const fwd = { x: -up.y, y: up.x };
  const half = body.torsoWidth / 2;
  const at = (base: Point, f: number, u = 0) => ({ x: base.x + fwd.x * f + up.x * u, y: base.y + fwd.y * f + up.y * u });

  fillPolygon(img, [at(hip, -half), at(hip, half - 1), at(shoulder, half, 1), at(shoulder, -half, 1)], C.Jersey);
  drawSegment(img, round(at(hip, -half + 0.5)), round(at(shoulder, -half + 0.5)), 1, () => C.JerseyShadow);
  fillPolygon(img, [at(hip, -half), at(hip, half - 1), at(hip, half - 1, WAISTBAND), at(hip, -half, WAISTBAND)], C.Shorts);
  drawSegment(img, round(at(shoulder, -half + 0.5)), round(at(shoulder, half - 1)), 1, () => C.Trim);
}

/** Draws a posed, outlined figure into a FRAME_W×FRAME_H image of logical colours. */
export function drawFigure(pose: Pose, body: BodyProportions, heads: Record<HeadFacing, HeadSprite>): IndexedImage {
  const img = new IndexedImage(FRAME_W, FRAME_H);
  const j = solvePose(pose, body);
  const hip = round(j.hip);
  const shoulder = round(j.shoulder);
  const neck = round(j.neck);

  drawArm(img, shoulder, round(j.farArm.elbow), round(j.farArm.hand), body, FAR, false);
  drawLeg(img, hip, round(j.farLeg.knee), round(j.farLeg.ankle), round(j.farLeg.toe), body, FAR, false);
  drawTorso(img, hip, shoulder, body);
  drawLeg(img, hip, round(j.nearLeg.knee), round(j.nearLeg.ankle), round(j.nearLeg.toe), body, NEAR, true);
  const head = heads[pose.head.facing];
  blit(img, head.image, neck.x - head.neck.x + Math.round(pose.head.dx), neck.y - head.neck.y + Math.round(pose.head.dy));
  drawArm(img, shoulder, round(j.nearArm.elbow), round(j.nearArm.hand), body, NEAR, true);

  addOutline(img, C.Outline);
  return img;
}
