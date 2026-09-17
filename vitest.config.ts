import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vitest-angular';
import path from 'node:path';

export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.{spec,test}.ts'],
    exclude: ['node_modules', 'dist', 'e2e'],
    reporters: ['default'],
  },
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, 'src/app'),
      '@env': path.resolve(__dirname, 'src/environments'),
    },
  },
});
