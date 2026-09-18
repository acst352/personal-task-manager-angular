import { test, expect } from '@playwright/test';
import { cleanupTasks, uniqueEmail } from './fixtures';

test.describe('signup — regression tests', () => {
  test('signup from a fresh browser session logs in without 401 errors', async ({ page }) => {
    test.setTimeout(30_000);

    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', e => errors.push(`PAGE: ${e.message}`));

    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Should be on login form
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();

    // Switch to signup
    await page.locator('button:has-text("Crear cuenta")').click();
    const email = uniqueEmail('signup');
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill('TestPassword123');

    // Submit. Use Promise.race to detect signup success quickly.
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // Either we get the tasks view (logged in directly) or the verify
    // screen (if email verification is required). Both mean signup worked.
    const h1 = page.locator('h1').first();
    const h2 = page.locator('h2').first();
    await expect(h1.or(h2)).toBeVisible({ timeout: 15_000 });

    // The critical assertion for v1.0.1 regression: no console errors
    // during the signup flow.
    expect(errors).toEqual([]);
  });

  test('signup with invalid email format blocks submit', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.locator('button:has-text("Crear cuenta")').click();
    await page.locator('input[name="email"]').fill('not-an-email');
    await page.locator('input[name="password"]').fill('TestPassword123');

    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });

  test('signup with short password blocks submit', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.locator('button:has-text("Crear cuenta")').click();
    await page.locator('input[name="email"]').fill('valid@example.com');
    await page.locator('input[name="password"]').fill('123');

    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });
});
