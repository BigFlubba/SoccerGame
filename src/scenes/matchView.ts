import { CLIPS, type AnimName } from '../art/body/animations';
import { ANCHOR } from '../art/body/pose';
import { MASTER, type MasterColor } from '../art/colors';
import { PARALLAX } from '../art/venues/backyard';
import { BASE_H } from '../engine/viewport';
import { VIEW_W, offscreenArrow, project, type Camera } from '../game/camera';
import { SWEET_SPOT } from '../game/kick';
import { clockMinute, type Team } from '../game/match';
import type { Player } from '../game/player';
import type { World } from '../game/world';
import type { GameArt } from './art';
import { depthSorted, type Drawable } from './depthSort';
import { BANNER_FROM_S, CELEBRATE_FROM_S, bannerShown, celebrating, flashing, shakeOffset, type GoalMoment } from './goalMoment';

/** Overlay state the match scene keeps between frames. */
export interface MatchHud {
  /** Who just hit a PERFECT shot, and until when (seconds) to show it. */
  perfect: null | { team: Team; untilS: number };
  /** Harrison's goal moment, while it runs. */
  moment: GoalMoment | null;
}

export const HOME_NAME = 'HARRISON';
export const AWAY_NAME = 'MAX';

const BALL_SPRITE_R = 3;
const CHARGE_BAR = { w: 12, h: 2, above: 46 };
const STAMINA_BAR = { x: 4, y: 2, w: 30, h: 3 };
const BANNER_Y = 58;
const GOLDEN_GOAL_BANNER_S = 1.5;
/** GOAL!!! lands big, then bounces to rest. */
const GOAL_SLAM = { scale: 4, forS: 0.1, settleS: 0.2, bouncePx: 6 };
const FLASH_ALPHA = 0.6;
/** The celebration's up-tall frame is drawn this far higher: a little hop. */
const CELEBRATE_HOP_PX = 2;
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

/** A 5×1 patch of dark grass on the ground under (x, z): shows how far back something is. */
function drawShadow(g: CanvasRenderingContext2D, cam: Camera, x: number, z: number): void {
  const s = screen(cam, x, 0, z);
  ink(g, 'grassDark');
  g.fillRect(s.x - Math.floor(SHADOW_W / 2), s.y + 1, SHADOW_W, 1);
}

type Clip = { name: AnimName; frame: number };

function drawPlayer(g: CanvasRenderingContext2D, cam: Camera, p: Player, art: GameArt, clip: Clip = p.anim): void {
  const set = p.team === 'home' ? art.home : art.away;
  const frames = (p.facing === 1 ? set.right : set.left)[clip.name];
  const s = screen(cam, p.x, p.y, p.z);
  const hop = clip.name === 'celebrate' && clip.frame === 1 ? CELEBRATE_HOP_PX : 0;
  g.drawImage(frames[Math.min(clip.frame, frames.length - 1)]!, s.x - ANCHOR.x, s.y - ANCHOR.y - hop);
}

/**
 * Harrison's clip this frame: arms up while he celebrates (the match is
 * frozen then, so it runs on the moment's clock), unless the back-view card
 * is showing instead.
 */
export function homeClip(w: World, moment: GoalMoment | null, withCard = false): Clip {
  if (!moment || !celebrating(moment) || withCard) return w.home.anim;
  const { fps, frameCount } = CLIPS.celebrate;
  return { name: 'celebrate', frame: Math.floor((moment.t - CELEBRATE_FROM_S) * fps) % frameCount };
}

function drawBall(g: CanvasRenderingContext2D, w: World, cam: Camera, art: GameArt): void {
  const b = w.ball;
  const s = screen(cam, b.x, b.y, b.z);
  const quarter = Math.PI / 2;
  const n = art.ball.length;
  const frame = ((Math.floor(b.spinAngle / quarter) % n) + n) % n;
  g.drawImage(art.ball[frame]!, s.x - BALL_SPRITE_R, s.y - BALL_SPRITE_R);
}

/**
 * Everything standing on the pitch, ready for the depth sort: both players,
 * the ball, and each goal's nets and posts. The nets come first, so at the
 * same depth a post is drawn over its net.
 */
export function pitchDrawables(w: World, cam: Camera, art: GameArt, home: Clip = w.home.anim): Drawable[] {
  const goals = w.field.goals.flatMap(goal => {
    const part = (z: number, which: 'farNet' | 'nearNet' | 'nearPost' | 'farPost'): Drawable => ({
      z,
      draw: g => {
        const sprites = art.goal[goal.side];
        const at = goalAt(cam, goal.lineX, sprites.origin);
        g.drawImage(sprites[which], at.x, at.y);
      },
    });
    return [part(goal.z1, 'farNet'), part(goal.z0, 'nearNet'), part(goal.z0, 'nearPost'), part(goal.z1, 'farPost')];
  });
  return [
    ...goals,
    { z: w.home.z, draw: g => drawPlayer(g, cam, w.home, art, home) },
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

/** The banner over the pitch, if any: GOAL!!! for Harrison's goal moment, a smaller MAX SCORES for Max's. */
export function banner(w: World, moment: GoalMoment | null): { text: string; scale: number } | null {
  const m = w.match;
  const text = (t: string) => ({ text: t, scale: 2 });
  if (moment) return bannerShown(moment) ? { text: 'GOAL!!!', scale: 3 } : null;
  if (m.phase === 'goal') return m.lastScorer === 'away' ? text('MAX SCORES') : null;
  if (m.phase === 'fullTime') return text('FULL TIME');
  if (m.phase === 'kickoff') return text(m.goldenGoal ? 'GOLDEN GOAL' : 'KICK OFF');
  if (m.goldenGoal && m.goldenS < GOLDEN_GOAL_BANNER_S) return text('GOLDEN GOAL');
  return null;
}

/** GOAL!!! slams in at a bigger scale, then drops in and bounces to rest. */
function drawGoalBanner(g: CanvasRenderingContext2D, art: GameArt, moment: GoalMoment, scale: number): void {
  const s = moment.t - BANNER_FROM_S;
  if (s < GOAL_SLAM.forS) return drawText(g, art, 'GOAL!!!', VIEW_W / 2, BANNER_Y - 4, GOAL_SLAM.scale, 'energyGold');
  const settle = Math.min(1, (s - GOAL_SLAM.forS) / GOAL_SLAM.settleS);
  const bounce = Math.round(GOAL_SLAM.bouncePx * Math.sin(settle * Math.PI) * (1 - settle));
  drawText(g, art, 'GOAL!!!', VIEW_W / 2, BANNER_Y + bounce, scale, 'energyGold');
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

/**
 * Draws one frame of the match: scenery, shadows, then everything on the
 * pitch far to near, bars, HUD and banners. During Harrison's goal moment
 * the pitch shakes (the HUD doesn't), and the first frame flashes white.
 */
export function drawMatch(g: CanvasRenderingContext2D, w: World, cam: Camera, art: GameArt, nowS: number, hud: MatchHud): void {
  const { moment } = hud;
  const shake = moment ? shakeOffset(moment) : { dx: 0, dy: 0 };
  g.save();
  g.translate(shake.dx, shake.dy);
  drawLayers(g, cam, art);
  drawShadow(g, cam, w.ball.x, w.ball.z);
  for (const p of [w.away, w.home]) drawShadow(g, cam, p.x, p.z);
  for (const d of depthSorted(pitchDrawables(w, cam, art, homeClip(w, moment)))) d.draw(g);
  drawChargeBar(g, cam, w.away, nowS);
  drawChargeBar(g, cam, w.home, nowS);
  g.restore();
  if (moment && flashing(moment)) {
    g.save();
    g.globalAlpha = FLASH_ALPHA;
    ink(g, 'white');
    g.fillRect(0, 0, VIEW_W, BASE_H);
    g.restore();
  }
  drawHud(g, w, art);
  if (hud.perfect && nowS < hud.perfect.untilS) {
    const kicker = hud.perfect.team === 'home' ? w.home : w.away;
    const at = screen(cam, kicker.x, kicker.y, kicker.z);
    drawText(g, art, 'PERFECT', at.x, at.y - 56, 1, 'energyGold');
  }
  const b = banner(w, moment);
  if (b && moment) drawGoalBanner(g, art, moment, b.scale);
  else if (b) drawText(g, art, b.text, VIEW_W / 2, BANNER_Y, b.scale);
  drawArrow(g, w, cam);
}
