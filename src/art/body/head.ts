import type { IndexedImage } from '../indexedImage';
import type { Point } from '../raster';

/** A head image plus the pixel that sits on the body's neck joint. */
export interface HeadSprite {
  image: IndexedImage;
  neck: Point;
}
