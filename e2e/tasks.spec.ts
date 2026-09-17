import { test, expect } from '@playwright/test';
import { signIn, createTestUser, deleteUser, cleanupTasks, createTaskViaUI } from './fixtures';

test.describe('tasks — CRUD with RLS isolation', () => {
  const userAEmail = `tasks-a-${Date.now()}@example.com`;
  const userBEmail = `tasks-b-${Date.now()}@example.com`;
  const password = 'TestPassword123';
  let userAId: string;
  let userBId: string;

  test.beforeAll(async ({ request }) => {
    await cleanupTasks(request);
    const a = await createTestUser(request, userAEmail, password, 'User A');
    userAId = a.id;
    const b = await createTestUser(request, userBEmail, password, 'User B');
    userBId = b.id;
  });

  test.afterAll(async ({ request }) => {
    await deleteUser(request, userAId);
    await deleteUser(request, userBId);
    await cleanupTasks(request);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('TASK-E2E-1: create task appears with user data', async ({ page }) => {
    await signIn(page, userAEmail, password);
    await createTaskViaUI(page, 'A1 task');
    await expect(page.getByText('A1 task')).toBeVisible();
  });

  test('TASK-E2E-2: edit task updates title', async ({ page }) => {
    await signIn(page, userAEmail, password);
    await createTaskViaUI(page, 'before edit');
    await page.getByRole('button', { name: 'Editar' }).first().click();
    await page.getByLabel('Título').fill('after edit');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('after edit')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('before edit')).toHaveCount(0);
  });

  test('TASK-E2E-3: mark done strikes through', async ({ page }) => {
    await signIn(page, userAEmail, password);
    await createTaskViaUI(page, 'strike me');
    await page.getByRole('button', { name: '✓' }).first().click();
    await expect(page.locator('li.done').first()).toBeVisible({ timeout: 5_000 });
  });

  test('TASK-E2E-4: delete with confirm removes task', async ({ page }) => {
    await signIn(page, userAEmail, password);
    await createTaskViaUI(page, 'to delete');
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '✕' }).first().click();
    await expect(page.getByText('to delete')).toHaveCount(0, { timeout: 5_000 });
  });

  test('TASK-E2E-5: two users have isolated task lists (RLS)', async ({ page, context }) => {
    // User A creates a task
    await signIn(page, userAEmail, password);
    await createTaskViaUI(page, 'A private task');
    await page.getByRole('button', { name: 'Salir' }).click();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();

    // Open a second browser context as User B (clean session)
    const pageB = await context.newPage();
    await pageB.goto('/');
    await signIn(pageB, userBEmail, password);

    // User B should NOT see A's task
    await expect(pageB.getByText('A private task')).toHaveCount(0);

    // User B creates their own task
    await createTaskViaUI(pageB, 'B private task');
    await expect(pageB.getByText('B private task')).toBeVisible();
    await pageB.close();
  });

  test('TASK-E2E-6: cancelling the delete confirm keeps the task', async ({ page }) => {
    await signIn(page, userAEmail, password);
    await createTaskViaUI(page, 'keep me');
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('button', { name: '✕' }).first().click();
    await expect(page.getByText('keep me')).toBeVisible();
  });
});
