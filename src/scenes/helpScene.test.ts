import { describe, expect, it } from 'vitest';
import { recordingAudio } from '../audio/testAudio';
import { DEFAULT_SETTINGS } from '../meta/settings';
import { glyph, measureText } from '../art/font';
import type { GameArt } from './art';
import type { GameContext } from './context';
import { HELP_PAGES, createHelpScene, type HelpScene } from './helpScene';
import type { Scene } from './scene';
import { frame } from './testInput';

const STEP = 1 / 60;
const CTX: GameContext = { art: {} as GameArt, settings: { ...DEFAULT_SETTINGS }, save: () => {}, audio: recordingAudio() };
const BEHIND: Scene = { kind: 'titleMenu', update: () => null, draw: () => {} };
const allText = () => HELP_PAGES.flatMap(p => [p.title, ...p.lines]).join('\n');

describe('help', () => {
  it('help covers the controls, the match and the moves', () => {
    expect(HELP_PAGES.map(p => p.title)).toEqual(['CONTROLS', 'THE MATCH', 'MOVES']);
    for (const phrase of ['PERFECT', 'FAR POST', 'NEAR POST', 'GOLDEN GOAL']) expect(allText()).toContain(phrase);
  });

  it('covers every control on the gamepad and the keyboard', () => {
    const controls = HELP_PAGES[0]!.lines.join('\n');
    for (const word of ['A:', 'B:', 'X:', 'RT:', 'START:', 'STICK', 'ARROWS', 'KEY Z', 'KEY X', 'KEY C', 'SHIFT', 'ENTER']) expect(controls).toContain(word);
  });

  it('explains the match format and the moves', () => {
    for (const phrase of ['90 SECONDS', 'KICKS OFF', 'CHARGE', 'GOLD', 'CHIP', 'SLIDE', 'HEADER', 'VOLLEY', 'SPRINT', 'STAMINA']) {
      expect(allText()).toContain(phrase);
    }
  });

  it('every help line fits the screen and uses only font characters', () => {
    const fallback = glyph('?');
    for (const page of HELP_PAGES) {
      for (const line of [page.title, ...page.lines]) {
        expect(measureText(line), line).toBeLessThanOrEqual(300);
        for (const ch of line) if (ch !== '?') expect(glyph(ch), `'${ch}' in "${line}"`).not.toBe(fallback);
      }
    }
  });

  it('flips pages and returns with B', () => {
    const s = createHelpScene(CTX, () => BEHIND) as HelpScene;
    expect(s.kind).toBe('help');
    expect(s.page).toBe(0);
    s.update(frame(['right']), STEP);
    expect(s.page).toBe(1);
    s.update(frame(['left']), STEP);
    s.update(frame(['left']), STEP);
    expect(s.page).toBe(HELP_PAGES.length - 1);
    s.update(frame(['right']), STEP);
    expect(s.page).toBe(0);
    expect(s.update(frame([]), STEP)).toBeNull();
    expect(s.update(frame(['back']), STEP)).toBe(BEHIND);
  });

  it('Start or Esc goes back too, but Enter does not', () => {
    expect(createHelpScene(CTX, () => BEHIND).update(frame(['pause']), STEP)).toBe(BEHIND);
    expect(createHelpScene(CTX, () => BEHIND).update(frame(['pause', 'back']), STEP)).toBe(BEHIND);
    expect(createHelpScene(CTX, () => BEHIND).update(frame(['pause', 'confirm']), STEP)).toBeNull();
  });
});
