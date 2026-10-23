export interface SheetItem {
  width: number;
  height: number;
  rgba: Uint8Array | Uint8ClampedArray;
}

export interface SheetOptions {
  scale: number;
  gap: number;
  background: readonly [number, number, number];
}

/**
 * Lays out rows of images top to bottom, items left to right, with `gap`
 * pixels between and around them, then nearest-neighbour scales by `scale`.
 * Transparent pixels show the background.
 */
export function composeSheet(
  rows: readonly SheetItem[][],
  opts: SheetOptions,
): { width: number; height: number; rgba: Uint8ClampedArray } {
  const { scale, gap, background } = opts;
  const rowWidth = (row: readonly SheetItem[]) => row.reduce((w, it) => w + it.width + gap, gap);
  const rowHeight = (row: readonly SheetItem[]) => Math.max(0, ...row.map(it => it.height));
  const baseW = Math.max(gap, ...rows.map(rowWidth));
  const baseH = rows.reduce((h, row) => h + rowHeight(row) + gap, gap);
  const width = baseW * scale;
  const height = baseH * scale;

  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) rgba.set([...background, 255], i * 4);

  let top = gap;
  for (const row of rows) {
    let left = gap;
    for (const item of row) {
      for (let y = 0; y < item.height; y++) {
        for (let x = 0; x < item.width; x++) {
          const src = (y * item.width + x) * 4;
          if (item.rgba[src + 3] === 0) continue;
          const px = item.rgba.subarray(src, src + 4);
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              rgba.set(px, (((top + y) * scale + sy) * width + (left + x) * scale + sx) * 4);
            }
          }
        }
      }
      left += item.width + gap;
    }
    top += rowHeight(row) + gap;
  }
  return { width, height, rgba };
}
