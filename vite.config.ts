import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/SoccerGame/',
  server: {
    fs: {
      // Vite's defaults, plus Harrison's reference photos: the dev server must never serve them.
      deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/reference/**', '*.{jpg,jpeg,heic,heif,webp,JPG,JPEG,HEIC,HEIF,WEBP}'],
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'tools/**/*.test.ts'],
    // The tuning suites (Max, Biscuit, the Park crew) each play hundreds of whole headless matches, sharing the CPU when files run in parallel.
    testTimeout: 30_000,
  },
});
