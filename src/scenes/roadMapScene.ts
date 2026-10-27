import { MASTER } from '../art/colors';
import { BASE_W } from '../engine/viewport';
import type { Camera } from '../game/camera';
import { TOTAL_STARS, VENUES, careerStars, stopLabel, venueOpen, type Venue } from '../meta/career';
import type { GameContext } from './context';
import { createHubScene } from './hubScene';
import { drawLayers } from './matchView';
import { menuAudio } from './menu';
import { STAR_W, drawStar } from './panel';
import type { Scene } from './scene';
import { createVenueScene } from './venueScene';

export interface RoadMapScene extends Scene {
  /** Which stop holds the cursor, 0 for the Backyard. */
  readonly index: number;
}

/** Where each stop's card sits: its centre x and its top. The road climbs left to right. */
export const STOPS: readonly { cx: number; y: number }[] = [
  { cx: 44, y: 118 },
  { cx: 104, y: 100 },
  { cx: 164, y: 82 },
  { cx: 224, y: 64 },
  { cx: 284, y: 46 },
];

/** The Backyard behind the map, still and dimmed. */
const CAM: Camera = { x: 40 };
const DIM = 0.35;
const TITLE_Y = 6;
const STARS_LINE_Y = 22;
const STAR_GAP_PX = 4;
const CARD = { w: 56, h: 34 };
/** The postcard shows the venue's own layers, from this offset into them. */
const POSTCARD_FROM = { x: 118, y: 64 };
const POSTCARD_CAM: Camera = { x: 0 };
const FRAME = { thin: 1, thick: 2 };
/** The dotted road between stop centres: 2×2 dots, this many per leg. */
const ROAD = { dot: 2, perLeg: 14, below: 17 };
const NAME_BELOW = 37;
const LABEL_BELOW = 46;
const HINT_Y = 168;


/**
 * The road to the Cup: five stops climbing left to right across the dimmed
 * Backyard. Left/right move the cursor, without wrapping; A or Start enters
 * an open venue and only blips on a locked one. B or Esc goes to the Hub.
 */
export function createRoadMapScene(ctx: GameContext, index = 0): RoadMapScene {
  const { art } = ctx;
  let at = Math.min(Math.max(index, 0), VENUES.length - 1);
  // Reached from Results too, where the match crowd is still murmuring.
  menuAudio(ctx);

  return {
    kind: 'roadMap',
    get index() {
      return at;
    },
    update(input) {
      if (input.pressed.has('back')) {
        ctx.audio.play('menuBack');
        return createHubScene(ctx);
      }
      const before = at;
      if (input.pressed.has('left')) at = Math.max(0, at - 1);
      if (input.pressed.has('right')) at = Math.min(VENUES.length - 1, at + 1);
      if (at !== before) ctx.audio.play('menuMove');
      if (input.pressed.has('confirm') || input.pressed.has('pause')) {
        const venue = VENUES[at]!;
        if (!venueOpen(ctx.profile, venue.id)) {
          ctx.audio.play('nope');
          return null;
        }
        ctx.audio.play('menuConfirm');
        return createVenueScene(ctx, venue.id);
      }
      return null;
    },
    draw(g) {
      const p = ctx.profile;
      drawLayers(g, CAM, art);
      g.save();
      g.globalAlpha = DIM;
      g.fillStyle = MASTER.ink;
      g.fillRect(0, 0, BASE_W, g.canvas.height);
      g.restore();
      const centre = (img: HTMLCanvasElement, y: number) => g.drawImage(img, Math.round(BASE_W / 2 - img.width / 2), y);
      centre(art.text('THE ROAD TO THE CUP', 2, 'energyGold', 'outline'), TITLE_Y);
      const total = art.text(`STARS ${careerStars(p)}/${TOTAL_STARS}`, 1, 'white', 'outline');
      const totalX = Math.round(BASE_W / 2 - (STAR_W + STAR_GAP_PX + total.width) / 2);
      drawStar(g, totalX, STARS_LINE_Y + 1, true);
      g.drawImage(total, totalX + STAR_W + STAR_GAP_PX, STARS_LINE_Y);

      // The road first, so the cards sit on it.
      g.fillStyle = MASTER.silver;
      for (let leg = 0; leg + 1 < STOPS.length; leg++) {
        const a = STOPS[leg]!;
        const b = STOPS[leg + 1]!;
        for (let i = 1; i < ROAD.perLeg; i++) {
          const u = i / ROAD.perLeg;
          g.fillRect(Math.round(a.cx + (b.cx - a.cx) * u), Math.round(a.y + ROAD.below + (b.y - a.y) * u), ROAD.dot, ROAD.dot);
        }
      }

      VENUES.forEach((venue, i) => {
        const stop = STOPS[i]!;
        const x = stop.cx - CARD.w / 2;
        const open = venueOpen(p, venue.id);
        const frame = i === at ? FRAME.thick : FRAME.thin;
        g.fillStyle = open ? MASTER.energyGold : MASTER.outline;
        g.fillRect(x - frame, stop.y - frame, CARD.w + 2 * frame, CARD.h + 2 * frame);
        if (open) {
          g.save();
          g.beginPath();
          g.rect(x, stop.y, CARD.w, CARD.h);
          g.clip();
          g.translate(x - POSTCARD_FROM.x, stop.y - POSTCARD_FROM.y);
          drawLayers(g, POSTCARD_CAM, art);
          g.restore();
        } else {
          g.fillStyle = MASTER.charcoal;
          g.fillRect(x, stop.y, CARD.w, CARD.h);
          const mark = art.text('?', 2, 'gray', 'outline');
          g.drawImage(mark, Math.round(stop.cx - mark.width / 2), Math.round(stop.y + CARD.h / 2 - mark.height / 2));
        }
        const name = art.text(venue.name, 1, open ? 'energyGold' : 'gray', 'outline');
        g.drawImage(name, Math.round(stop.cx - name.width / 2), stop.y + NAME_BELOW);
        const label = art.text(stopLabel(p, venue.id), 1, open ? 'white' : 'gray', 'outline');
        const starW = open ? STAR_W + STAR_GAP_PX : 0;
        const labelX = Math.round(stop.cx - (starW + label.width) / 2);
        if (open) drawStar(g, labelX, stop.y + LABEL_BELOW + 1, true);
        g.drawImage(label, labelX + starW, stop.y + LABEL_BELOW);
      });
      centre(art.text('A ENTER   B BACK', 1, 'silver', 'outline'), HINT_Y);
    },
  };
}
