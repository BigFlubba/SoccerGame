import { vi } from 'vitest';
import type { GameArt } from './art';

/** Every canvas of `fakeArt` is named by the path it was reached by, e.g. `art.opponents.brick.sprites.left.idle.0`, or `art.text(GOAL!,2,white,outline)`. */
export interface Named {
  readonly name: string;
}

const SIZE = 10;

/**
 * Stand-in art for draw tests: every property is more art, every call
 * (art.text) returns more, named with its arguments, every image is SIZE
 * px square at 0, 0, and every list has one entry.
 */
export function fakeArt(path = 'art'): GameArt {
  const target = () => undefined;
  return new Proxy(target, {
    get(_, prop) {
      if (prop === 'name') return path;
      if (prop === 'width' || prop === 'height') return SIZE;
      // An origin's coordinates (a goal's), so a whole match can be drawn.
      if (prop === 'x' || prop === 'y') return 0;
      if (prop === 'length') return 1;
      // Passed back into art (an image to a draw call), it names itself.
      if (prop === Symbol.toPrimitive) return () => path;
      if (typeof prop === 'symbol') return undefined;
      return fakeArt(`${path}.${prop}`);
    },
    apply(_, __, args: unknown[]) {
      return fakeArt(`${path}(${args.join(',')})`);
    },
  }) as unknown as GameArt;
}

/** Real art made under Node: every canvas `document` makes draws nowhere, and ImageData just holds its pixels. Undo with vi.unstubAllGlobals. */
export function stubCanvases(): void {
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => recordingContext().g }) });
  vi.stubGlobal('ImageData', class {
    constructor(readonly data: Uint8ClampedArray, readonly width: number, readonly height: number) {}
  });
}

/** A 2D context that does nothing but record the images drawn, by name, in order. */
export function recordingContext(): { g: CanvasRenderingContext2D; drawn: string[] } {
  const drawn: string[] = [];
  const g = new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === 'canvas') return { width: 320, height: 180 };
        if (prop === 'drawImage') return (img: Named) => void drawn.push(img.name);
        return () => undefined;
      },
      set: () => true,
    },
  ) as CanvasRenderingContext2D;
  return { g, drawn };
}
