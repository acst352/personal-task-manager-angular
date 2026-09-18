import { test, expect } from '@playwright/test';
import {
  signIn,
  createTestUser,
  deleteUser,
  cleanupTasks,
  createTaskViaUI,
  uniqueEmail,
} from './fixtures';

test.describe('visual regression — critical UI states', () => {
  const userEmail = uniqueEmail('visual');
  const password = 'TestPassword123';
  let userId: string;

  test.beforeAll(async ({ request }) => {
    // Limpia tasks antes para que el screenshot de "tasks list" sea determinista.
    await cleanupTasks(request);
    const user = await createTestUser(request, userEmail, password);
    userId = user.id;
  });

  test.afterAll(async ({ request }) => {
    await deleteUser(request, userId);
    await cleanupTasks(request);
  });

  test('login form (initial state)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
    // maxDiffPixelRatio tolera micro-diffs de font rendering cross-platform
    // (Linux CI vs Windows local). Sin tolerancia, un pixel diff causa fail.
    await expect(page).toHaveScreenshot('login-form.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

  test('login form with error message', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[name="email"]').fill(userEmail);
    await page.locator('input[name="password"]').fill('wrong-password');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText(/Invalid credentials|incorrect/i)).toBeVisible();
    await expect(page).toHaveScreenshot('login-error.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

  test('empty tasks list', async ({ page }) => {
    await signIn(page, userEmail, password);
    await expect(page.getByText(/No hay tareas/i)).toBeVisible();
    await expect(page).toHaveScreenshot('tasks-empty.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

  test('tasks list with items', async ({ page }) => {
    await signIn(page, userEmail, password);
    // Crear 3 tasks con prioridades distintas para capturar el rango visual
    await createTaskViaUI(page, 'Comprar leche', 'Alta');
    await createTaskViaUI(page, 'Llamar al médico', 'Media');
    await createTaskViaUI(page, 'Leer el libro', 'Baja');
    await expect(page.getByText('Comprar leche')).toBeVisible();
    await expect(page.getByText('Llamar al médico')).toBeVisible();
    await expect(page.getByText('Leer el libro')).toBeVisible();
    await expect(page).toHaveScreenshot('tasks-with-items.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

  test('tasks list with one item completed', async ({ page }) => {
    await signIn(page, userEmail, password);
    await createTaskViaUI(page, 'Task done', 'Alta');
    await createTaskViaUI(page, 'Task pending', 'Media');
    // Marcar la primera como done
    await page
      .locator('li:has-text("Task done")')
      .getByRole('button', { name: '✓' })
      .click();
    await expect(page.locator('li.done')).toContainText('Task done');
    await expect(page).toHaveScreenshot('tasks-with-done.png', {
      maxDiffPixelRatio: 0.02,
    });
  });
});
