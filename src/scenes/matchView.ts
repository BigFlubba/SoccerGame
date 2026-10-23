import { ANCHOR } from '../art/body/pose';
import { MASTER, type MasterColor } from '../art/colors';
import { PARALLAX } from '../art/venues/backyard';
import { VIEW_W, offscreenArrow, project, type Camera } from '../game/camera';
import { SWEET_SPOT } from '../game/kick';
import { clockMinute, type Team } from '../game/match';
import type { Player } from '../game/player';
import type { World } from '../game/world';
import type { GameArt } from './art';
import { depthSorted, type Drawable } from './depthSort';

/** Overlay state the match scene keeps between frames. */
export interface MatchHud {
  /** Who just hit a PERFECT shot, and until when (seconds) to show it. */
  perfect: null | { team: Team; untilS: number };
}

export const HOME_NAME = 'HARRISON';
export const AWAY_NAME = 'MAX';

const BALL_SPRITE_R = 3;
const CHARGE_BAR = { w: 12, h: 2, above: 46 };
const STAMINA_BAR = { x: 4, y: 2, w: 30, h: 3 };
const BANNER_Y = 58;
const GOLDEN_GOAL_BANNER_S = 1.5;
/** Blinks per second for the overcharge flash. */
const BLINK_HZ = 8;
const ARROW_Y = 16;
const SHADOW_W = 5;

const ink = (g: CanvasRenderingContext2D, c: MasterColor) => (g.fillStyle = MASTER[c]);

/** Screen position of a world point. */
function screen(cam: Camera, x: number, y: number, z: number): { x: number; y: number } {
  const p = project(x, y, z, cam.x);
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

/** Where a goal's sprites go: they all share one origin from its goal line. */
function goalAt(cam: Camera, lineX: number, origin: { x: number; y: number }): { x: number; y: number } {
  const at = project(lineX, 0, 0, cam.x);
  return { x: Math.round(at.sx + origin.x), y: Math.round(at.sy + origin.y) };
}

/** The nets, roofs and crossbars: behind everything on the pitch. */
function drawGoalBacks(g: CanvasRenderingContext2D, w: World, cam: Camera, art: GameArt): void {
  for (const goal of w.field.goals) {
    const sprites = art.goal[goal.side];
    const at = goalAt(cam, goal.lineX, sprites.origin);
    g.drawImage(sprites.back, at.x, at.y);
  }
}

/** A 5×1 patch of dark grass on the ground under (x, z): shows how far back something is. */
function drawShadow(g: CanvasRenderingContext2D, cam: Camera, x: number, z: number): void {
  const s = screen(cam, x, 0, z);
  ink(g, 'grassDark');
  g.fillRect(s.x - Math.floor(SHADOW_W / 2), s.y + 1, SHADOW_W, 1);
}

function drawPlayer(g: CanvasRenderingContext2D, cam: Camera, p: Player, art: GameArt): void {
  const set = p.team === 'home' ? art.home : art.away;
  const frames = (p.facing === 1 ? set.right : set.left)[p.anim.name];
  const s = screen(cam, p.x, p.y, p.z);
  g.drawImage(frames[Math.min(p.anim.frame, frames.length - 1)]!, s.x - ANCHOR.x, s.y - ANCHOR.y);
}

function drawBall(g: CanvasRenderingContext2D, w: World, cam: Camera, art: GameArt): void {
  const b = w.ball;
  const s = screen(cam, b.x, b.y, b.z);
  const quarter = Math.PI / 2;
  const n = art.ball.length;
  const frame = ((Math.floor(b.spinAngle / quarter) % n) + n) % n;
  g.drawImage(art.ball[frame]!, s.x - BALL_SPRITE_R, s.y - BALL_SPRITE_R);
}

/** Everything standing on the pitch, ready for the depth sort: both players, the ball and all four posts. */
export function pitchDrawables(w: World, cam: Camera, art: GameArt): Drawable[] {
  const posts = w.field.goals.flatMap(goal => {
    const post = (z: number, which: 'nearPost' | 'farPost'): Drawable => ({
      z,
      draw: g => {
        const sprites = art.goal[goal.side];
        const at = goalAt(cam, goal.lineX, sprites.origin);
        g.drawImage(sprites[which], at.x, at.y);
      },
    });
    return [post(goal.z0, 'nearPost'), post(goal.z1, 'farPost')];
  });
  return [
    ...posts,
    { z: w.home.z, draw: g => drawPlayer(g, cam, w.home, art) },
    { z: w.away.z, draw: g => drawPlayer(g, cam, w.away, art) },
    // Last among equals: at his feet, the ball is drawn over his boots.
    { z: w.ball.z, draw: g => drawBall(g, w, cam, art) },
  ];
}

/** A 12×2 bar over a charging player, with the sweet spot marked in gold and a red flash when overcharged. */
function drawChargeBar(g: CanvasRenderingContext2D, cam: Camera, p: Player, nowS: number): void {
  const charging = p.state === 'charging' || (p.state === 'chipping' && !p.kick);
  if (!charging) return;
  const s = screen(cam, p.x, p.y, p.z);
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
  const arrow = offscreenArrow(w.ball, cam);
  if (!arrow) return;
  const x = Math.round(Math.min(Math.max(arrow.x, 3), VIEW_W - 4));
  ink(g, 'outline');
  g.fillRect(x - 3, ARROW_Y - 1, 7, 4);
  ink(g, 'white');
  g.fillRect(x - 2, ARROW_Y, 5, 1);
  g.fillRect(x - 1, ARROW_Y + 1, 3, 1);
  g.fillRect(x, ARROW_Y + 2, 1, 1);
}

/** Draws one frame of the match: scenery, goal backs, shadows, then everything on the pitch far to near, bars, HUD and banners. */
export function drawMatch(g: CanvasRenderingContext2D, w: World, cam: Camera, art: GameArt, nowS: number, hud: MatchHud): void {
  drawLayers(g, cam, art);
  drawGoalBacks(g, w, cam, art);
  drawShadow(g, cam, w.ball.x, w.ball.z);
  for (const p of [w.away, w.home]) drawShadow(g, cam, p.x, p.z);
  for (const d of depthSorted(pitchDrawables(w, cam, art))) d.draw(g);
  drawChargeBar(g, cam, w.away, nowS);
  drawChargeBar(g, cam, w.home, nowS);
  drawHud(g, w, art);
  if (hud.perfect && nowS < hud.perfect.untilS) {
    const kicker = hud.perfect.team === 'home' ? w.home : w.away;
    const at = screen(cam, kicker.x, kicker.y, kicker.z);
    drawText(g, art, 'PERFECT', at.x, at.y - 56, 1, 'energyGold');
  }
  const b = banner(w);
  if (b) drawText(g, art, b, VIEW_W / 2, BANNER_Y, 2);
  drawArrow(g, w, cam);
}
