import { test, expect } from '@playwright/test';
import {
  signIn,
  createTestUser,
  deleteUser,
  cleanupTasks,
  createTaskViaUI,
  uniqueEmail,
} from './fixtures';

test.describe('auth-switch — bug #3 regression (stale httpResource on user change)', () => {
  const userAEmail = uniqueEmail('switch-a');
  const userBEmail = uniqueEmail('switch-b');
  const password = 'TestPassword123';
  let userAId: string;
  let userBId: string;

  test.beforeAll(async ({ request }) => {
    await cleanupTasks(request);
    const a = await createTestUser(request, userAEmail, password, 'A');
    userAId = a.id;
    const b = await createTestUser(request, userBEmail, password, 'B');
    userBId = b.id;
  });

  test.afterAll(async ({ request }) => {
    await deleteUser(request, userAId);
    await deleteUser(request, userBId);
    await cleanupTasks(request);
  });

  test('switching users mid-session shows the new user\'s tasks, not the previous', async ({ page }) => {
    await page.goto('/');

    // Login as A, create a task
    await signIn(page, userAEmail, password);
    await createTaskViaUI(page, 'A task only');

    // Logout, login as B without page reload
    await page.getByRole('button', { name: 'Salir' }).click();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
    await signIn(page, userBEmail, password);

    // B should see their own empty list (no "A task only")
    await expect(page.getByText('A task only')).toHaveCount(0);
    await expect(page.getByText(/No hay tareas/i)).toBeVisible();

    // B creates their own
    await createTaskViaUI(page, 'B task only');
    await expect(page.getByText('B task only')).toBeVisible();
    await expect(page.getByText('A task only')).toHaveCount(0);

    // Switch back to A: must see only A's task
    await page.getByRole('button', { name: 'Salir' }).click();
    await signIn(page, userAEmail, password);
    await expect(page.getByText('A task only')).toBeVisible();
    await expect(page.getByText('B task only')).toHaveCount(0);
  });
});
