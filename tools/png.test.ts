import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { encodePNG } from './png';

/** Concatenates the data of every IDAT chunk. */
function extractIdat(png: Uint8Array): Uint8Array {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const parts: Uint8Array[] = [];
  for (let at = 8; at < png.length; ) {
    const len = view.getUint32(at);
    const type = String.fromCharCode(...png.slice(at + 4, at + 8));
    if (type === 'IDAT') parts.push(png.slice(at + 8, at + 8 + len));
    at += 12 + len;
  }
  return Buffer.concat(parts);
}

describe('encodePNG', () => {
  it('writes the PNG signature and IHDR size', () => {
    const png = encodePNG(3, 2, new Uint8Array(3 * 2 * 4));
    expect(Array.from(png.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const view = new DataView(png.buffer, png.byteOffset);
    expect([view.getUint32(16), view.getUint32(20)]).toEqual([3, 2]);
  });

  it('IDAT inflates to filter-0 scanlines of the input', () => {
    const rgba = Uint8Array.from({ length: 2 * 2 * 4 }, (_, i) => i);
    const raw = inflateSync(extractIdat(encodePNG(2, 2, rgba)));
    expect(Array.from(raw)).toEqual([0, ...rgba.slice(0, 8), 0, ...rgba.slice(8)]);
  });

  it('writes a correct CRC for IEND', () => {
    const png = encodePNG(1, 1, new Uint8Array(4));
    expect(Array.from(png.slice(-4))).toEqual([0xae, 0x42, 0x60, 0x82]);
  });
});
