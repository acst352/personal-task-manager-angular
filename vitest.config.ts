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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/app/**/*.ts'],
      exclude: [
        'src/app/**/*.spec.ts',
        'src/app/core/errors.spec.ts',
        'src/test-setup.ts',
        'src/test-helpers/**',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
      reportsDirectory: './coverage',
    },
  },
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, 'src/app'),
      '@env': path.resolve(__dirname, 'src/environments'),
    },
  },
});
