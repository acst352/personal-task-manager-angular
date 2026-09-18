import { test, expect } from '@playwright/test';
import {
  signIn,
  createTestUser,
  deleteUser,
  cleanupTasks,
  createTaskViaUI,
  uniqueEmail,
} from './fixtures';

test.describe('auth — login + logout flows', () => {
  const userEmail = uniqueEmail('auth-test');
  const userPassword = 'TestPassword123';
  let userId: string;

  test.beforeAll(async ({ request }) => {
    await cleanupTasks(request);
    const user = await createTestUser(request, userEmail, userPassword);
    userId = user.id;
  });

  test.afterAll(async ({ request }) => {
    await deleteUser(request, userId);
    await cleanupTasks(request);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('AUTH-E2E-1: login with invalid credentials shows error', async ({ page }) => {
    await page.locator('input[name="email"]').fill(userEmail);
    await page.locator('input[name="password"]').fill('wrong-password');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText(/Invalid credentials|incorrect/i)).toBeVisible({
      timeout: 5_000,
    });
    await expect(page).toHaveURL(/\/$/);
  });

  test('AUTH-E2E-2: login with valid credentials shows tasks list', async ({ page }) => {
    await signIn(page, userEmail, userPassword);
    await expect(page.getByText(userEmail)).toBeVisible();
  });

  test('AUTH-E2E-3: logout returns to login form', async ({ page }) => {
    await signIn(page, userEmail, userPassword);
    await page.getByRole('button', { name: 'Salir' }).click();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible({
      timeout: 5_000,
    });
  });

  test('AUTH-E2E-4: reload after login preserves session', async ({ page }) => {
    await signIn(page, userEmail, userPassword);
    const tokenBefore = await page.evaluate(() => localStorage.getItem('insforge_access_token'));
    expect(tokenBefore).toBeTruthy();
    await page.reload();
    // Give the app initializer + httpResource time to settle
    await page.waitForLoadState('networkidle');
    const tokenAfter = await page.evaluate(() => localStorage.getItem('insforge_access_token'));
    expect(tokenAfter).toBe(tokenBefore);
    await expect(page.getByText(userEmail)).toBeVisible({ timeout: 10_000 });
  });

  test('AUTH-E2E-5: create task is visible immediately', async ({ page }) => {
    await signIn(page, userEmail, userPassword);
    await createTaskViaUI(page, 'AUTH-E2E-5 task');
  });
});
