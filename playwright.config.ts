import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env['E2E_PORT'] ?? 4200);
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  // Tests en serie (workers=1) para evitar race conditions en el backend
  // compartido de InsForge. fullyParallel=false garantiza serial incluso
  // dentro del mismo archivo.
  // Costo: ~3 min serial vs ~1 min paralelo. Aceptable para una suite de 16 tests.
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: 1,
  reporter: process.env['CI'] ? [['html'], ['list']] : 'list',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  // Snapshots cross-platform: el default incluye el platform name (e.g.
  // login-form-chromium-win32.png), lo que rompe CI en Linux. Override
  // para usar el nombre limpio: e2e/__snapshots__/{arg}.png
  snapshotPathTemplate: '{testDir}/__snapshots__/{arg}{ext}',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm exec ng serve --port 4200 --host 127.0.0.1',
    url: BASE_URL,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
