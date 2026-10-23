import { MASTER } from '../art/colors';
import { BASE_H, BASE_W } from '../engine/viewport';
import type { Difficulty } from '../game/ai';
import type { GameArt } from './art';
import { createMatchScene } from './matchScene';
import type { Scene } from './scene';

const TITLE = "HARRISON'S ROAD TO THE CUP";
const BLINK_HZ = 2;
const PORTRAIT_TOP = 30;

/** A fresh seed per match so every game plays differently. */
const newSeed = () => Math.floor(Math.random() * 2 ** 32);

/** Harrison's portrait, the title and a blinking PRESS START. Start, A, Enter or Z kicks off. */
export function createTitleScene(art: GameArt, difficulty: Difficulty = 'normal'): Scene {
  return {
    update(input) {
      if (input.pressed.has('confirm') || input.pressed.has('pause')) return createMatchScene(art, difficulty, newSeed());
      return null;
    },
    draw(g, nowS) {
      g.drawImage(art.layers.far, 0, 0);
      g.drawImage(art.layers.mid, -40, 0);
      g.drawImage(art.layers.near, -80, 0);
      g.drawImage(art.layers.ground, -160, 0);
      g.fillStyle = MASTER.outline;
      g.fillRect(BASE_W / 2 - art.portrait.width / 2 - 2, PORTRAIT_TOP - 2, art.portrait.width + 4, art.portrait.height + 4);
      g.drawImage(art.portrait, BASE_W / 2 - art.portrait.width / 2, PORTRAIT_TOP);
      const title = art.text(TITLE, 1, 'energyGold', 'outline');
      g.drawImage(title, Math.round(BASE_W / 2 - title.width / 2), 10);
      if (Math.floor(nowS * BLINK_HZ) % 2 === 0) {
        const start = art.text('PRESS START', 2, 'white', 'outline');
        g.drawImage(start, Math.round(BASE_W / 2 - start.width / 2), BASE_H - 44);
      }
    },
  };
}
