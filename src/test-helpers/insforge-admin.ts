import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

const ADMIN_HEADERS = {
  Authorization: `Bearer ${environment.insforge.anonKey}`,
  'Content-Type': 'application/json',
};

export interface AdminUser {
  id: string;
  email: string;
  accessToken: string;
  emailVerified: boolean;
}

@Injectable({ providedIn: 'root' })
export class InsforgeAdmin {
  private http = inject(HttpClient);

  readonly baseUrl = environment.insforge.baseUrl;

  async cleanupTasks(): Promise<number> {
    const url = `${this.baseUrl}/api/database/records/tasks?id=neq.00000000-0000-0000-0000-000000000000`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: ADMIN_HEADERS,
    });
    if (!res.ok) {
      throw new Error(`cleanupTasks failed: ${res.status} ${await res.text()}`);
    }
    return this.getTaskCount();
  }

  async getTaskCount(): Promise<number> {
    const res = await fetch(
      `${this.baseUrl}/api/database/records/tasks?select=id`,
      { headers: ADMIN_HEADERS },
    );
    const data = (await res.json()) as Array<unknown>;
    return data.length;
  }

  async createTestUser(
    email: string,
    password = 'password123',
    name?: string,
  ): Promise<AdminUser> {
    const body = JSON.stringify({ email, password, name });
    const res = await fetch(`${this.baseUrl}/api/auth/users`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body,
    });
    const json = (await res.json()) as {
      user?: { id: string; email: string; emailVerified?: boolean };
      accessToken?: string;
      requireEmailVerification?: boolean;
    };
    if (json.requireEmailVerification && !json.accessToken) {
      const session = await this.signIn(email, password);
      return {
        id: session.id,
        email: session.email,
        accessToken: session.accessToken,
        emailVerified: false,
      };
    }
    if (!json.user || !json.accessToken) {
      throw new Error(`createTestUser failed: ${JSON.stringify(json)}`);
    }
    return {
      id: json.user.id,
      email: json.user.email,
      accessToken: json.accessToken,
      emailVerified: json.user.emailVerified ?? false,
    };
  }

  async signIn(email: string, password: string): Promise<AdminUser> {
    const res = await fetch(`${this.baseUrl}/api/auth/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = (await res.json()) as {
      user?: { id: string; email: string };
      accessToken?: string;
    };
    if (!json.user || !json.accessToken) {
      throw new Error(`signIn failed for ${email}: ${res.status}`);
    }
    return {
      id: json.user.id,
      email: json.user.email,
      accessToken: json.accessToken,
      emailVerified: true,
    };
  }

  async deleteUser(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/auth/users`, {
      method: 'DELETE',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ userIds: [id] }),
    });
    if (!res.ok) {
      throw new Error(`deleteUser failed: ${res.status}`);
    }
  }

  async rawSql<T = unknown>(query: string): Promise<T> {
    const res = await firstValueFrom(
      this.http.post<T>(`${this.baseUrl}/api/database/sql`, { query }),
    );
    return res;
  }
}

export function provideInsforgeAdmin() {
  return [InsforgeAdmin];
}
