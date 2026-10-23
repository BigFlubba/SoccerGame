import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

/** The repo is public: photos of Harrison must never be committable, whatever their case or format. */
const isIgnored = (path: string) => spawnSync('git', ['check-ignore', '-q', '--no-index', path]).status === 0;

describe('.gitignore', () => {
  it.each(['harrison.jpg', 'IMG_0001.JPG', 'photo.JPEG', 'photo.heic', 'IMG_0002.HEIC', 'shot.webp', 'nested/dir/pic.Jpg', 'reference/notes.txt', 'screenshot.png'])(
    'ignores %s',
    path => {
      expect(isIgnored(path)).toBe(true);
    },
  );

  it('still tracks source files', () => {
    expect(isIgnored('src/main.ts')).toBe(false);
  });
});
