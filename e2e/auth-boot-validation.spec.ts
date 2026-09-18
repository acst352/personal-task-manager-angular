import { test, expect } from '@playwright/test';
import { signIn, createTestUser, deleteUser, cleanupTasks, uniqueEmail } from './fixtures';

test.describe('auth-boot-validation — stale token rejected at boot', () => {
  const email = uniqueEmail('boot');
  const password = 'TestPassword123';
  let userId: string;

  test.beforeAll(async ({ request }) => {
    await cleanupTasks(request);
    const user = await createTestUser(request, email, password);
    userId = user.id;
  });

  test.afterAll(async ({ request }) => {
    await deleteUser(request, userId);
    await cleanupTasks(request);
  });

  test('reload with a corrupted token redirects to login', async ({ page }) => {
    // 1) Sign in legitimately
    await page.goto('/');
    await signIn(page, email, password);
    await expect(page.getByText(email)).toBeVisible();

    // 2) Corrupt the token in localStorage
    await page.evaluate(() => {
      localStorage.setItem('insforge_access_token', 'this-is-not-a-valid-jwt');
    });

    // 3) Reload — provideAppInitializer calls validateStoredSession which gets 401
    await page.reload();

    // 4) Should land on login, not the tasks view
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(email)).toHaveCount(0);
  });
});
