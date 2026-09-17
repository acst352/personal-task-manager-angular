import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

interface SignInRequest {
  email: string;
  password: string;
}

interface SignUpRequest {
  email: string;
  password: string;
  name?: string;
}

interface AuthResponse {
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

const TOKEN_KEY = 'insforge_access_token';
const USER_KEY = 'insforge_user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);

  private readonly _user = signal<AuthUser | null>(this.readUser());

  readonly currentUser = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  async signIn(email: string, password: string): Promise<void> {
    const body: SignInRequest = { email, password };
    const res = await firstValueFrom(
      this.http.post<AuthResponse>(
        `${environment.insforge.baseUrl}/api/auth/sessions`,
        body,
      ),
    );
    if (!res.accessToken || !res.user) {
      throw new Error('Respuesta inválida del servidor');
    }
    this.persist(res.accessToken, res.user);
  }

  async signUp(email: string, password: string, name?: string): Promise<void> {
    const body: SignUpRequest = { email, password, name };
    const res = await firstValueFrom(
      this.http.post<AuthResponse>(
        `${environment.insforge.baseUrl}/api/auth/users`,
        body,
      ),
    );
    if (!res.accessToken || !res.user) {
      throw new Error(
        'Registro OK pero requiere verificación por email. Revisa tu bandeja.',
      );
    }
    this.persist(res.accessToken, res.user);
  }

  signOut(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.set(null);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private persist(token: string, user: NonNullable<AuthResponse['user']>): void {
    const u: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
    };
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    this._user.set(u);
  }

  private readUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }
}
