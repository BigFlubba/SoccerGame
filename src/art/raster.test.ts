import { describe, expect, it } from 'vitest';
import { IndexedImage } from './indexedImage';
import { addOutline, drawSegment, fillPolygon, opaqueBounds } from './raster';

describe('drawSegment', () => {
  it('colours both endpoints and passes t from 0 to 1', () => {
    const img = new IndexedImage(10, 10);
    drawSegment(img, { x: 1, y: 1 }, { x: 1, y: 8 }, 1, t => (t < 0.5 ? 3 : 7));
    expect([img.get(1, 1), img.get(1, 8)]).toEqual([3, 7]);
  });

  it('covers three columns on a vertical line at width 3', () => {
    const img = new IndexedImage(10, 10);
    drawSegment(img, { x: 5, y: 2 }, { x: 5, y: 6 }, 3, () => 1);
    expect([img.get(3, 4), img.get(4, 4), img.get(5, 4), img.get(6, 4), img.get(7, 4)]).toEqual([0, 1, 1, 1, 0]);
  });

  it('draws a single point when both ends round to the same pixel', () => {
    const img = new IndexedImage(4, 4);
    drawSegment(img, { x: 1.2, y: 1.4 }, { x: 0.8, y: 1.1 }, 1, t => (t === 0 ? 5 : 9));
    expect(img.get(1, 1)).toBe(5);
  });
});

describe('fillPolygon', () => {
  it('fills a 4×4 square exactly', () => {
    const img = new IndexedImage(8, 8);
    fillPolygon(img, [{ x: 2, y: 2 }, { x: 6, y: 2 }, { x: 6, y: 6 }, { x: 2, y: 6 }], 5);
    expect(img.data.filter(v => v === 5).length).toBe(16);
  });
});

describe('addOutline', () => {
  it('rings a single pixel with 4 outline pixels', () => {
    const img = new IndexedImage(5, 5);
    img.set(2, 2, 3);
    addOutline(img, 1);
    expect([img.get(2, 1), img.get(1, 2), img.get(3, 2), img.get(2, 3), img.get(1, 1)]).toEqual([1, 1, 1, 1, 0]);
  });
});

describe('opaqueBounds', () => {
  it('returns null for an empty image and the tight box otherwise', () => {
    const img = new IndexedImage(6, 6);
    expect(opaqueBounds(img)).toBeNull();
    img.set(1, 2, 3);
    img.set(4, 3, 3);
    expect(opaqueBounds(img)).toEqual({ x: 1, y: 2, w: 4, h: 2 });
  });
});
