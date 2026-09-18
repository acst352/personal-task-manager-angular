import { test, expect } from '@playwright/test';
import {
  signIn,
  createTestUser,
  deleteUser,
  cleanupTasks,
  createTaskViaUI,
  uniqueEmail,
} from './fixtures';

test.describe('tasks — CRUD with RLS isolation', () => {
  const userAEmail = uniqueEmail('tasks-a');
  const userBEmail = uniqueEmail('tasks-b');
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

  test.beforeEach(async ({ page, request }) => {
    // Limpia tasks del usuario entre tests para que cada test empiece limpio.
    // Sin esto, TASK-E2E-4 (.first()) borraba el primer task de la lista, no
    // el específico "to delete".
    await cleanupTasks(request);
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
    await page
      .locator('li:has-text("before edit")')
      .getByRole('button', { name: 'Editar' })
      .click();
    await page.getByLabel('Título').fill('after edit');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('after edit')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('before edit')).toHaveCount(0);
  });

  test('TASK-E2E-3: mark done strikes through', async ({ page }) => {
    await signIn(page, userAEmail, password);
    await createTaskViaUI(page, 'strike me');
    await page
      .locator('li:has-text("strike me")')
      .getByRole('button', { name: '✓' })
      .click();
    await expect(page.locator('li.done').first()).toBeVisible({ timeout: 5_000 });
  });

  test('TASK-E2E-4: delete with confirm removes task', async ({ page }) => {
    await signIn(page, userAEmail, password);
    await createTaskViaUI(page, 'to delete');
    // Locator específico en vez de .first() — robusto contra otros tasks
    // que pudiera haber en la lista.
    const targetLi = page.locator('li:has-text("to delete")');
    page.once('dialog', dialog => dialog.accept());
    await targetLi.getByRole('button', { name: '✕' }).click();
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
    const targetLi = page.locator('li:has-text("keep me")');
    page.once('dialog', dialog => dialog.dismiss());
    await targetLi.getByRole('button', { name: '✕' }).click();
    await expect(page.getByText('keep me')).toBeVisible();
  });
});
