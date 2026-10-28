import { ART_LEGEND } from '../colors';
import { blit, parseGrid, type IndexedImage } from '../indexedImage';
import { PORTRAIT_GLASSES, PORTRAIT_HEADBAND, overlay } from './extras';

export type Expression = 'neutral' | 'celebrate' | 'determined' | 'disappointed';

export const PORTRAIT_SIZE = 64;
/** The only region expression patches may change. */
export const PORTRAIT_FACE_BOX = { x: 12, y: 14, w: 40, h: 38 };

interface Patch {
  x: number;
  y: number;
  rows: readonly string[];
}

/**
 * Harrison, head and shoulders, in his home kit. Traced from a reference
 * photo for proportions, then cleaned by hand. Neutral expression.
 */
const BASE = [
  '................................................................',
  '................................................................',
  '..........................ooooooooooooo.........................',
  '........................oohLhhhhhhHHHhLoo.......................',
  '......................oohhHLhhhhhHHHHHLLhooo....................',
  '.....................ohhhhLLLLhhhHHHHHHHHhhho...................',
  '....................ohhhhLLLLLhhhHHHHHHHHHHHhoo.................',
  '...................ohhhHhLLhHhhhhhHHHHHHHHHHHhho................',
  '..................ohhhhhhhHHHhhhhhhHHHHHHHHHHHHho...............',
  '.................ohhhhhhHHHHhhhhhhhhHHHHHHHHHHHHo...............',
  '.................ohhhhhHHHhhhhhhhhhHHHHHHHHHHHHHho..............',
  '................ohhhhhhhHhhhhhhhhhHHHHHHHHHHHHHHho..............',
  '................ohhhhhhhhhhhhhhhhhhhhhHHHHhhhHHHho..............',
  '...............ohhhhhhhhhhHHhhhhhhhhhhhhhhLLhhHHhho.............',
  '...............ohhhhhhhhhhHhhhhhhhhhhhhhhhLLLLHHLLo.............',
  '...............ohhhhhhhhhhhhhhhhhhhhhhhhhLLLLLHHhLo.............',
  '..............ohhhhhhhhhhhhhhhhhhhLLLLhLLLLLLLHHhLo.............',
  '..............ohHHHhhhhhhhhhhhLLLLLLLLLLLLLttLLhhLho............',
  '..............oHHHHHHhhhhhhhhhLLLLLLLLLLLLLttLLLLHHo............',
  '..............oHHHHHHHHhhhhhhhLLLLLLLLLLLLttttLLLfLo............',
  '..............oHfHHHHHHHhhhhhhhLLLLLLLLLLLttttLLffLo............',
  '..............offHHHHHHHHhhhHHhtttLLLLLLLLtttttLffLo............',
  '..............offHHHHHHHHHHHHLtkkktttttttLttttttffLo............',
  '..............offHhLLLhHHHLHLtkkkksssssskttttkkkttLo............',
  '..............oLLLtttLLLhLtttkkkkkssssskkktkkkkkklso............',
  '.............okssssssttsssssskkkkkksssssskkkkkkksksso...........',
  '............okksssssssooooookkkkkkkkooooookkkkkksskkso..........',
  '...........oklssskkkkkwiipiwkkkkkkkkwipiiwkkkkkkssslko..........',
  '...........oklskskkkkkksssskkkkklkkkksssslkkkkkkskslso..........',
  '...........oklskskkkkkkkkkkkkkkklkkkkkkklllkkkkkskslsso.........',
  '...........oklssskkkkkkkkkkkkkkklkkkkkkklllkkkkkssslsso.........',
  '...........okkskskkkbbkkkkkkkkkklkkkkkkllllkbbkkskskkso.........',
  '...........okkksskkkbbbkkkkkkkllkkkllllllllbbbkksskkso..........',
  '...........osskkskkkkbkkkkkkkkklkkkllllllllbkkkkskksko..........',
  '............ooeksskkkkkkkkkkskskksklllllllkkkkkkskseo...........',
  '..............ossssskkkkkkkkkssssskllllllkkkkkksssko............',
  '...............ooosskkkkkkkkkkkkkkkllllllkkkkkkkooo.............',
  '..................oskkkkkkkkkkkkkkkllllllkkksssso...............',
  '..................okskkkkkkkkkkkkkkllllllkksssso................',
  '...................oskkkkkkssmmmmmmssllllkksssso................',
  '...................osskkkkkssmbbbbmkkkllkkkssso.................',
  '....................oskkkkkkkksssskkkkkkkkkssso.................',
  '....................osskkkkkkkkkkkkkkkkkkkksso..................',
  '.....................osskkkkkkkkkkkkkkkkkkkso...................',
  '.....................osskkkkkkkkkkkkkkkkkkkso...................',
  '.....................ossskkkkkkkkkkkkkkklkkso...................',
  '.....................osssskkkkkkkkkkkkkllksso...................',
  '.....................ossssskkkkkkkkkkklllssso...................',
  '.....................ossskkkkkkkkkkklllllssso...................',
  '.....................oskkkkkkkkkkkkllllllkkko...................',
  '....................osskkkkkkkkkkklllllllkkkso..................',
  '....................osskkkkkkkkkkklllllllkkkko..................',
  '....................ossskkkkkkkkklllllllkkkkko..................',
  '................ooooJssskkkkkkkkkkllkklkkkkkkJoooo..............',
  '............oooojjjjjJJJkkkkkkkkkkkkkkkkkkJJJqjjjjoooo..........',
  '........oooojjjjqqqjjjjjJkkkkkkkkkkkkkkkJJjjjrqqqqjjjjooo.......',
  '....oooojjjjqqqqrrrjjjjjjJJooooooooooooJjjjjjRrrrrqqqqjjjoooo...',
  '...ojjjjqqqqrrrrRRRjjjjjjjjjooooooooojjjjjjjjjRRRRrrrrqqqjjjjo..',
  '.oojqqqqrrrrRRRRjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjRRRRrrrqqqqJoo',
  'oJJqrrrrRRRRjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjRRRrrrrJJJ',
  'JJJrRRRRjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjRRRRJJJ',
  'JJJRjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjJJJ',
  'JJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ',
  'JJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ',
];

// Eyes sit at x 22–27 and 36–41 (rows 25–28); the mouth spans x 27–36 (rows 38–44).
const PATCHES: Record<Exclude<Expression, 'neutral'>, readonly Patch[]> = {
  // Shouting: eyes wide open, mouth open showing teeth.
  celebrate: [
    { x: 22, y: 25, rows: ['oooooo', 'wiipiw', 'wiipiw', 'kssssk'] },
    { x: 36, y: 25, rows: ['oooooo', 'wipiiw', 'wipiiw', 'kssssk'] },
    {
      x: 27,
      y: 38,
      rows: ['kmmmmmmmmk', 'mwwwwwwwwm', 'moooooooom', 'moooooooom', 'kmobbbbomk', 'kkmmmmmmkk', 'kkksssskkk'],
    },
  ],
  // Brows pulled down toward the nose, eyes narrowed, lips pressed.
  determined: [
    { x: 22, y: 24, rows: ['HH....', 'sHHHoo', 'oooooo', 'siipis'] },
    { x: 36, y: 24, rows: ['....HH', 'ooHHHs', 'oooooo', 'sipiis'] },
    { x: 27, y: 39, rows: ['kssmmmmssk', 'kkksssskkk', 'kkkkkkkkkk'] },
  ],
  // Heavy lids, eyes cast down, mouth turned down at the corners.
  disappointed: [
    { x: 22, y: 26, rows: ['ssssss', 'oooooo', 'wiipiw', 'kssssk'] },
    { x: 36, y: 26, rows: ['ssssss', 'oooooo', 'wipiiw', 'kssssk'] },
    { x: 27, y: 39, rows: ['kkkmmmmkkk', 'kkmssssmkk', 'kmkkkkkkmk', 'skkkkkkkks'] },
  ],
};

/** The extras his portrait shows: the glasses go on after any expression, the headband before them. */
export interface PortraitExtras {
  glasses: boolean;
  headband: boolean;
}

export function harrisonPortrait(expression: Expression, extras: PortraitExtras = { glasses: false, headband: false }): IndexedImage {
  let img = parseGrid(BASE, ART_LEGEND);
  if (expression !== 'neutral') for (const p of PATCHES[expression]) blit(img, parseGrid(p.rows, ART_LEGEND), p.x, p.y);
  if (extras.headband) img = overlay(img, PORTRAIT_HEADBAND.rows, PORTRAIT_HEADBAND.x, PORTRAIT_HEADBAND.y);
  if (extras.glasses) img = overlay(img, PORTRAIT_GLASSES.rows, PORTRAIT_GLASSES.x, PORTRAIT_GLASSES.y);
  return img;
}
