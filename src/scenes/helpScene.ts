import type { ButtonName } from '../art/glyphs';
import { MASTER } from '../art/colors';
import { BASE_H, BASE_W } from '../engine/viewport';
import { drawBackdrop } from './backdrop';
import type { GameContext } from './context';
import type { Scene } from './scene';

export interface HelpScene extends Scene {
  readonly page: number;
}

/** Three pages in the pixel font. A line starting "A:", "X:" and so on is drawn with that button's picture. */
export const HELP_PAGES: readonly { title: string; lines: readonly string[] }[] = [
  {
    title: 'CONTROLS',
    lines: [
      'STICK OR D-PAD: RUN ANYWHERE. KEYS: ARROWS',
      'A: JUMP. THE BALL ON YOUR HEAD IS A HEADER. KEY Z',
      'X: SHOOT. TAP IT, OR HOLD TO CHARGE. KEY X',
      'B: CHIP WITH THE BALL, SLIDE TACKLE WITHOUT. KEY C',
      'RT: SPRINT. KEY SHIFT',
      'START: PAUSE. KEY ENTER OR ESC',
      'MENUS: UP/DOWN TO CHOOSE, A TO PICK, B TO GO BACK',
    ],
  },
  {
    title: 'THE MATCH',
    lines: [
      "BEAT MAX IN HARRISON'S BACKYARD!",
      'A MATCH IS 90 SECONDS: ONE GAME MINUTE A SECOND.',
      'SCORE BY GETTING THE WHOLE BALL OVER THE LINE,',
      'BETWEEN THE POSTS AND UNDER THE BAR.',
      'AFTER A GOAL, THE SIDE THAT LET IT IN KICKS OFF.',
      'LEVEL AT 90? GOLDEN GOAL: THE NEXT GOAL WINS.',
      "NOBODY SCORES IN 45 MORE SECONDS? IT'S A DRAW.",
      'PLAYERS ARE SOLID: GO ROUND MAX, NOT THROUGH HIM.',
    ],
  },
  {
    title: 'MOVES',
    lines: [
      'HOLD X TO CHARGE A SHOT. LET GO IN THE GOLD',
      'PART OF THE BAR FOR A PERFECT SHOT: FAST AND TRUE.',
      'HOLD ON TOO LONG AND IT FLIES WILD AND HIGH.',
      'WHILE CHARGING OR IN THE AIR, UP AIMS AT THE',
      'FAR POST AND DOWN AT THE NEAR POST.',
      'B WITH THE BALL CHIPS IT UP AND OVER.',
      'B WITHOUT IT IS A SLIDE TACKLE TO WIN IT BACK.',
      'JUMP INTO A HIGH BALL FOR A HEADER. IN THE AIR,',
      'X HITS A VOLLEY.',
      'RT SPRINTS, BUT IT USES STAMINA: THE BAR AT THE',
      'TOP LEFT. RUN IT DRY AND YOU SLOW DOWN FOR A BIT.',
    ],
  },
];

const PANEL = { x: 6, y: 4, w: BASE_W - 12, h: BASE_H - 8 };
const TEXT_X = 14;
const TITLE_Y = 10;
const FIRST_LINE_Y = 32;
const LINE_H = 10;
/** Lines with a button picture need more room: the button is taller than the text. */
const BUTTON_LINE_H = 13;
const BUTTON_GAP = 4;
/** The picture sits this far above the text's top, so their middles line up. */
const BUTTON_RAISE = 2;
const FOOTER_Y = BASE_H - 18;
const BUTTON_LINE = /^(A|B|X|RT|START): (.*)$/;

/** CONTROLS, THE MATCH, MOVES: left/right flip the pages (wrapping); B, Backspace or C goes back. */
export function createHelpScene(ctx: GameContext, back: () => Scene): HelpScene {
  let page = 0;
  const { art } = ctx;
  return {
    kind: 'help',
    get page() {
      return page;
    },
    update(input) {
      if (input.pressed.has('back')) return back();
      const n = HELP_PAGES.length;
      if (input.pressed.has('right')) page = (page + 1) % n;
      if (input.pressed.has('left')) page = (page - 1 + n) % n;
      return null;
    },
    draw(g, nowS) {
      drawBackdrop(g, art, nowS);
      g.fillStyle = MASTER.outline;
      g.fillRect(PANEL.x - 1, PANEL.y - 1, PANEL.w + 2, PANEL.h + 2);
      g.fillStyle = MASTER.ink;
      g.fillRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h);

      const { title, lines } = HELP_PAGES[page]!;
      const heading = art.text(title, 2, 'energyGold', 'outline');
      g.drawImage(heading, Math.round(BASE_W / 2 - heading.width / 2), TITLE_Y);
      let y = FIRST_LINE_Y;
      for (const line of lines) {
        const button = BUTTON_LINE.exec(line);
        if (button) {
          const pic = art.buttons[button[1] as ButtonName];
          g.drawImage(pic, TEXT_X, y - BUTTON_RAISE);
          g.drawImage(art.text(button[2]!, 1, 'white', 'outline'), TEXT_X + pic.width + BUTTON_GAP, y);
          y += BUTTON_LINE_H;
        } else {
          g.drawImage(art.text(line, 1, 'white', 'outline'), TEXT_X, y);
          y += LINE_H;
        }
      }

      g.drawImage(art.text('LEFT/RIGHT: MORE', 1, 'silver', 'outline'), TEXT_X, FOOTER_Y);
      const b = art.buttons.B;
      const backX = BASE_W / 2 + 10;
      g.drawImage(b, backX, FOOTER_Y - BUTTON_RAISE);
      g.drawImage(art.text('BACK', 1, 'silver', 'outline'), backX + b.width + BUTTON_GAP, FOOTER_Y);
      const count = art.text(`${page + 1}/${HELP_PAGES.length}`, 1, 'white', 'outline');
      g.drawImage(count, PANEL.x + PANEL.w - count.width - 6, FOOTER_Y);
    },
  };
}
