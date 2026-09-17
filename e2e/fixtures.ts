import { test as base, expect, type Page, type APIRequestContext } from '@playwright/test';
import { environment } from '../src/environments/environment';

const ADMIN_HEADERS = {
  Authorization: `Bearer ${environment.insforge.anonKey}`,
  apikey: environment.insforge.anonKey,
};

type Fixtures = {
  cleanDb: void;
  page: Page;
};

export const test = base.extend<Fixtures>({
  page: async ({ page }, use) => {
    await use(page);
  },

  cleanDb: async ({ request: _request }, use) => {
    await cleanupTasks(_request);
    await use(undefined);
  },
});

export async function cleanupTasks(api: APIRequestContext): Promise<void> {
  const url = `${environment.insforge.baseUrl}/api/database/records/tasks?id=neq.00000000-0000-0000-0000-000000000000`;
  const res = await api.delete(url, { headers: ADMIN_HEADERS });
  if (!res.ok() && res.status() !== 404) {
    throw new Error(`cleanupTasks failed: ${res.status()} ${await res.text()}`);
  }
}

export async function createTestUser(
  api: APIRequestContext,
  email: string,
  password = 'TestPassword123',
  name = 'Test User',
): Promise<{ id: string; email: string; accessToken: string }> {
  const url = `${environment.insforge.baseUrl}/api/auth/users`;
  const res = await api.post(url, {
    headers: ADMIN_HEADERS,
    data: { email, password, name },
  });
  const body = (await res.json()) as {
    user?: { id: string; email: string };
    accessToken?: string;
    requireEmailVerification?: boolean;
  };
  if (body.requireEmailVerification || !body.accessToken) {
    const sessionRes = await api.post(
      `${environment.insforge.baseUrl}/api/auth/sessions`,
      { data: { email, password } },
    );
    const session = (await sessionRes.json()) as {
      user: { id: string; email: string };
      accessToken: string;
    };
    return session;
  }
  if (!body.user || !body.accessToken) {
    throw new Error(`createTestUser failed: ${JSON.stringify(body)}`);
  }
  return {
    id: body.user.id,
    email: body.user.email,
    accessToken: body.accessToken,
  };
}

export async function deleteUser(api: APIRequestContext, id: string): Promise<void> {
  const res = await api.delete(
    `${environment.insforge.baseUrl}/api/auth/users`,
    {
      headers: { ...ADMIN_HEADERS, 'Content-Type': 'application/json' },
      data: { userIds: [id] },
    },
  );
  if (!res.ok()) {
    throw new Error(`deleteUser failed: ${res.status()} ${await res.text()}`);
  }
}

export async function signIn(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/');
  // Clean session from any prior test sharing this context
  await page.evaluate(() => {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
  });
  await page.reload();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: /tareas pendientes/i })).toBeVisible({
    timeout: 10_000,
  });
}

export async function createTaskViaUI(page: Page, title: string, priority: 'Baja' | 'Media' | 'Alta' = 'Media'): Promise<void> {
  await page.getByRole('button', { name: '+ Nueva tarea' }).click();
  await page.getByLabel('Título').fill(title);
  await page.getByLabel('Prioridad').selectOption(priority);
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText(title)).toBeVisible({ timeout: 5_000 });
}
