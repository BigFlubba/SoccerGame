import { ANCHOR } from '../art/body/pose';
import { MASTER, type MasterColor } from '../art/colors';
import { PARALLAX } from '../art/venues/backyard';
import { BALL_REST_Y } from '../game/ball';
import { VIEW_W, offscreenArrow, project, type Camera } from '../game/camera';
import { BACKYARD } from '../game/field';
import { SWEET_SPOT } from '../game/kick';
import { clockMinute, type Team } from '../game/match';
import type { Player } from '../game/player';
import type { World } from '../game/world';
import type { GameArt } from './art';

/** Overlay state the match scene keeps between frames. */
export interface MatchHud {
  /** Who just hit a PERFECT shot, and until when (seconds) to show it. */
  perfect: null | { team: Team; untilS: number };
}

export const HOME_NAME = 'HARRISON';
export const AWAY_NAME = 'MAX';

const BALL_SPRITE_R = 3;
const CHARGE_BAR = { w: 12, h: 2, above: 46 };
const STAMINA_BAR = { x: 4, y: 172, w: 30, h: 3 };
const BANNER_Y = 58;
const GOLDEN_GOAL_BANNER_S = 1.5;
/** Blinks per second for the overcharge flash. */
const BLINK_HZ = 8;
const ARROW_Y = 16;
/** How far up Max is drawn (further back) while the players cross. */
export const CROSSING_DEPTH_PX = 3;
/** Within this gap the sprites overlap and the crossing step-back eases in. */
const CROSSING_RANGE = 20;

const ink = (g: CanvasRenderingContext2D, c: MasterColor) => (g.fillStyle = MASTER[c]);

/** Until the match is drawn in depth, everything stands on the pitch's centre line. */
const MID_Z = BACKYARD.depth / 2;

/** Screen position of a world point on the centre line. */
function screen(cam: Camera, x: number, y: number): { x: number; y: number } {
  const p = project(x, y, MID_Z, cam.x);
  return { x: Math.round(p.sx), y: Math.round(p.sy) };
}

export function drawLayers(g: CanvasRenderingContext2D, cam: Camera, art: GameArt): void {
  // The far sky is narrower than its scroll range, so it tiles.
  const far = art.layers.far;
  const farX = -(Math.round(cam.x * PARALLAX.far) % far.width);
  g.drawImage(far, farX, 0);
  g.drawImage(far, farX + far.width, 0);
  for (const name of ['mid', 'near', 'ground'] as const) g.drawImage(art.layers[name], -Math.round(cam.x * PARALLAX[name]), 0);
}

function drawGoals(g: CanvasRenderingContext2D, w: World, cam: Camera, art: GameArt, part: 'back' | 'posts'): void {
  for (const goal of w.field.goals) {
    const sprites = art.goal[goal.side];
    const at = project(goal.lineX, 0, 0, cam.x);
    const [x, y] = [Math.round(at.sx + sprites.origin.x), Math.round(at.sy + sprites.origin.y)];
    if (part === 'back') g.drawImage(sprites.back, x, y);
    else for (const post of [sprites.farPost, sprites.nearPost]) g.drawImage(post, x, y);
  }
}

/**
 * Players run through each other, so while they cross Max steps a few
 * pixels "back" (drawn higher, behind Harrison), like a belt-scroller lane.
 */
export function crossingDepth(home: Player, away: Player): number {
  const closeness = 1 - Math.abs(home.x - away.x) / CROSSING_RANGE;
  return Math.round(CROSSING_DEPTH_PX * Math.min(Math.max(closeness, 0), 1));
}

function drawPlayer(g: CanvasRenderingContext2D, cam: Camera, p: Player, art: GameArt, lift = 0): void {
  const set = p.team === 'home' ? art.home : art.away;
  const frames = (p.facing === 1 ? set.right : set.left)[p.anim.name];
  const s = screen(cam, p.x, p.y);
  g.drawImage(frames[Math.min(p.anim.frame, frames.length - 1)]!, s.x - ANCHOR.x, s.y - ANCHOR.y - lift);
}

function drawBall(g: CanvasRenderingContext2D, w: World, cam: Camera, art: GameArt): void {
  const b = w.ball;
  const s = screen(cam, b.x, b.y);
  if (b.y > BALL_REST_Y + 1) {
    ink(g, 'grassDark');
    g.fillRect(s.x - 2, screen(cam, b.x, 0).y + 1, 5, 1);
  }
  const quarter = Math.PI / 2;
  const n = art.ball.length;
  const frame = ((Math.floor(b.spinAngle / quarter) % n) + n) % n;
  g.drawImage(art.ball[frame]!, s.x - BALL_SPRITE_R, s.y - BALL_SPRITE_R);
}

/** A 12×2 bar over a charging player, with the sweet spot marked in gold and a red flash when overcharged. */
function drawChargeBar(g: CanvasRenderingContext2D, cam: Camera, p: Player, nowS: number): void {
  const charging = p.state === 'charging' || (p.state === 'chipping' && !p.kick);
  if (!charging) return;
  const s = screen(cam, p.x, p.y);
  const x = s.x - CHARGE_BAR.w / 2;
  const y = s.y - CHARGE_BAR.above;
  ink(g, 'outline');
  g.fillRect(x - 1, y - 1, CHARGE_BAR.w + 2, CHARGE_BAR.h + 2);
  ink(g, 'gold');
  g.fillRect(x + Math.round(SWEET_SPOT[0] * CHARGE_BAR.w), y, Math.max(1, Math.round((SWEET_SPOT[1] - SWEET_SPOT[0]) * CHARGE_BAR.w)), CHARGE_BAR.h);
  const flash = p.overchargeS > 0 && Math.floor(nowS * BLINK_HZ) % 2 === 0;
  ink(g, flash ? 'red' : 'white');
  g.fillRect(x, y, Math.round(p.charge * CHARGE_BAR.w), 1);
}

function drawText(g: CanvasRenderingContext2D, art: GameArt, s: string, cx: number, y: number, scale = 1, colour: MasterColor = 'white'): void {
  const t = art.text(s, scale, colour, 'outline');
  g.drawImage(t, Math.round(cx - t.width / 2), y);
}

function drawHud(g: CanvasRenderingContext2D, w: World, art: GameArt): void {
  const { match, home } = w;
  drawText(g, art, `${HOME_NAME} ${match.score.home}-${match.score.away} ${AWAY_NAME}`, VIEW_W / 2, 0);
  const clock = match.goldenGoal ? `90+${Math.floor(match.goldenS)}` : `${clockMinute(match)}'`;
  drawText(g, art, clock, VIEW_W / 2, 7);

  ink(g, 'outline');
  g.fillRect(STAMINA_BAR.x - 1, STAMINA_BAR.y - 1, STAMINA_BAR.w + 2, STAMINA_BAR.h + 2);
  ink(g, home.exhausted ? 'red' : 'volt');
  g.fillRect(STAMINA_BAR.x, STAMINA_BAR.y, Math.round(home.stamina * STAMINA_BAR.w), STAMINA_BAR.h);
}

function banner(w: World): string | null {
  const m = w.match;
  if (m.phase === 'goal') return 'GOAL!';
  if (m.phase === 'fullTime') return 'FULL TIME';
  if (m.phase === 'kickoff') return m.goldenGoal ? 'GOLDEN GOAL' : 'KICK OFF';
  if (m.goldenGoal && m.goldenS < GOLDEN_GOAL_BANNER_S) return 'GOLDEN GOAL';
  return null;
}

function drawArrow(g: CanvasRenderingContext2D, w: World, cam: Camera): void {
  const arrow = offscreenArrow({ ...w.ball, z: MID_Z }, cam);
  if (!arrow) return;
  const x = Math.round(Math.min(Math.max(arrow.x, 3), VIEW_W - 4));
  ink(g, 'outline');
  g.fillRect(x - 3, ARROW_Y - 1, 7, 4);
  ink(g, 'white');
  g.fillRect(x - 2, ARROW_Y, 5, 1);
  g.fillRect(x - 1, ARROW_Y + 1, 3, 1);
  g.fillRect(x, ARROW_Y + 2, 1, 1);
}

/** Draws one frame of the match: scenery, goals, players, ball, bars, HUD and banners. */
export function drawMatch(g: CanvasRenderingContext2D, w: World, cam: Camera, art: GameArt, nowS: number, hud: MatchHud): void {
  drawLayers(g, cam, art);
  drawGoals(g, w, cam, art, 'back');
  drawPlayer(g, cam, w.away, art, crossingDepth(w.home, w.away));
  drawPlayer(g, cam, w.home, art);
  drawBall(g, w, cam, art);
  drawGoals(g, w, cam, art, 'posts');
  drawChargeBar(g, cam, w.away, nowS);
  drawChargeBar(g, cam, w.home, nowS);
  drawHud(g, w, art);
  if (hud.perfect && nowS < hud.perfect.untilS) {
    const kicker = hud.perfect.team === 'home' ? w.home : w.away;
    drawText(g, art, 'PERFECT', screen(cam, kicker.x, kicker.y).x, screen(cam, kicker.x, kicker.y).y - 56, 1, 'energyGold');
  }
  const b = banner(w);
  if (b) drawText(g, art, b, VIEW_W / 2, BANNER_Y, 2);
  drawArrow(g, w, cam);
}
