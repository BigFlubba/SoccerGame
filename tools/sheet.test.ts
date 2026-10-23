import { describe, expect, it } from 'vitest';
import { composeSheet } from './sheet';

describe('composeSheet', () => {
  it('sizes the canvas from rows, gap and scale', () => {
    const item = { width: 2, height: 3, rgba: new Uint8Array(24) };
    const sheet = composeSheet([[item, item], [item]], { scale: 2, gap: 1, background: [9, 9, 9] });
    expect([sheet.width, sheet.height]).toEqual([(1 + 2 + 1 + 2 + 1) * 2, (1 + 3 + 1 + 3 + 1) * 2]);
    expect(Array.from(sheet.rgba.slice(0, 4))).toEqual([9, 9, 9, 255]);
  });

  it('scales opaque item pixels into place', () => {
    const red = { width: 1, height: 1, rgba: new Uint8Array([255, 0, 0, 255]) };
    const sheet = composeSheet([[red]], { scale: 2, gap: 1, background: [0, 0, 0] });
    const px = (x: number, y: number) => Array.from(sheet.rgba.slice((y * sheet.width + x) * 4, (y * sheet.width + x) * 4 + 4));
    expect(px(2, 2)).toEqual([255, 0, 0, 255]);
    expect(px(3, 3)).toEqual([255, 0, 0, 255]);
    expect(px(4, 4)).toEqual([0, 0, 0, 255]);
  });
});
