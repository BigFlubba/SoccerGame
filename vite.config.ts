import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/SoccerGame/',
  test: {
    include: ['src/**/*.test.ts', 'tools/**/*.test.ts'],
  },
});
