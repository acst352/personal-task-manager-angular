import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const SESSION_URL = `${environment.insforge.baseUrl}/api/auth/sessions`;
  const USERS_URL = `${environment.insforge.baseUrl}/api/auth/users`;
  const CURRENT_SESSION_URL = `${environment.insforge.baseUrl}/api/auth/sessions/current`;
  const VERIFY_URL = `${environment.insforge.baseUrl}/api/auth/email/verify`;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AuthService],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    service.signOut();
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('instance hydration from localStorage', () => {
    it('starts unauthenticated when localStorage is empty', () => {
      expect(service.currentUser()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });

    it('hydrates from localStorage when a user is stored', () => {
      localStorage.setItem(
        'insforge_user',
        JSON.stringify({ id: 'u1', email: 'a@b.com' }),
      );
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting(), AuthService],
      });
      const fresh = TestBed.inject(AuthService);
      expect(fresh.currentUser()).toEqual({ id: 'u1', email: 'a@b.com' });
      expect(fresh.isAuthenticated()).toBe(true);
    });
  });

  describe('signIn', () => {
    it('persists token + user on 200', async () => {
      const promise = service.signIn('a@b.com', 'pw123456');
      const req = httpMock.expectOne(SESSION_URL);
      req.flush({
        accessToken: 'jwt-abc',
        user: { id: 'u-1', email: 'a@b.com' },
      });
      await promise;
      expect(localStorage.getItem('insforge_access_token')).toBe('jwt-abc');
      expect(service.currentUser()?.email).toBe('a@b.com');
    });

    it('throws and does not persist on 401', async () => {
      const promise = service.signIn('a@b.com', 'wrong');
      const req = httpMock.expectOne(SESSION_URL);
      req.flush(
        { error: 'AUTH_UNAUTHORIZED', message: 'Invalid credentials' },
        { status: 401, statusText: 'Unauthorized' },
      );
      await expect(promise).rejects.toBeDefined();
      expect(localStorage.getItem('insforge_access_token')).toBeNull();
      expect(service.currentUser()).toBeNull();
    });

    it('throws on 403 unverified', async () => {
      const promise = service.signIn('a@b.com', 'pw');
      const req = httpMock.expectOne(SESSION_URL);
      req.flush(
        { error: 'FORBIDDEN', message: 'Email verification required' },
        { status: 403, statusText: 'Forbidden' },
      );
      await expect(promise).rejects.toBeDefined();
    });

    it('throws when response lacks accessToken', async () => {
      const promise = service.signIn('a@b.com', 'pw');
      const req = httpMock.expectOne(SESSION_URL);
      req.flush({ user: { id: 'u1', email: 'a@b.com' } });
      await expect(promise).rejects.toThrow(/inválida/i);
    });
  });

  describe('signUp', () => {
    it('sets pendingVerificationEmail when verification required', async () => {
      const promise = service.signUp('new@b.com', 'pw123456');
      const req = httpMock.expectOne(USERS_URL);
      req.flush({
        accessToken: null,
        requireEmailVerification: true,
        user: { id: 'u-2', email: 'new@b.com' },
      });
      await expect(promise).rejects.toThrow(/código/i);
      expect(service.pendingVerificationEmail()).toBe('new@b.com');
      expect(service.currentUser()).toBeNull();
    });

    it('persists session on success', async () => {
      const promise = service.signUp('new@b.com', 'pw123456');
      const req = httpMock.expectOne(USERS_URL);
      req.flush({
        accessToken: 'jwt-new',
        user: { id: 'u-2', email: 'new@b.com' },
      });
      await promise;
      expect(service.currentUser()?.id).toBe('u-2');
      expect(service.pendingVerificationEmail()).toBeNull();
    });
  });

  describe('verifyEmail', () => {
    it('persists session on valid OTP', async () => {
      const promise = service.verifyEmail('a@b.com', '123456');
      const req = httpMock.expectOne(VERIFY_URL);
      req.flush({
        accessToken: 'jwt-v',
        user: { id: 'u-1', email: 'a@b.com' },
      });
      await promise;
      expect(service.currentUser()?.id).toBe('u-1');
    });

    it('throws on invalid OTP', async () => {
      const promise = service.verifyEmail('a@b.com', '000000');
      const req = httpMock.expectOne(VERIFY_URL);
      req.flush(
        { error: 'INVALID_INPUT', message: 'Invalid or expired verification code' },
        { status: 400, statusText: 'Bad Request' },
      );
      await expect(promise).rejects.toBeDefined();
    });
  });

  describe('signOut', () => {
    it('clears localStorage and signal', () => {
      localStorage.setItem('insforge_access_token', 'jwt');
      localStorage.setItem('insforge_user', JSON.stringify({ id: 'u1', email: 'a@b.com' }));
      service.signOut();
      expect(localStorage.getItem('insforge_access_token')).toBeNull();
      expect(localStorage.getItem('insforge_user')).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('validateStoredSession', () => {
    it('does nothing when no token stored', async () => {
      await service.validateStoredSession();
      httpMock.expectNone(CURRENT_SESSION_URL);
    });

    it('refreshes user from server on 200', async () => {
      localStorage.setItem('insforge_access_token', 'jwt-ok');
      const promise = service.validateStoredSession();
      const req = httpMock.expectOne(CURRENT_SESSION_URL);
      req.flush({ user: { id: 'u-1', email: 'fresh@b.com' } });
      await promise;
      expect(service.currentUser()?.email).toBe('fresh@b.com');
      expect(localStorage.getItem('insforge_user')).toContain('fresh@b.com');
    });

    it('calls signOut on 401 — dead token rejected at boot', async () => {
      localStorage.setItem('insforge_access_token', 'jwt-dead');
      const promise = service.validateStoredSession();
      const req = httpMock.expectOne(CURRENT_SESSION_URL);
      req.flush(
        { error: 'AUTH_UNAUTHORIZED', message: 'Token expired' },
        { status: 401, statusText: 'Unauthorized' },
      );
      await promise;
      expect(service.isAuthenticated()).toBe(false);
      expect(localStorage.getItem('insforge_access_token')).toBeNull();
    });
  });

  describe('getAccessToken', () => {
    it('returns null when nothing stored', () => {
      expect(service.getAccessToken()).toBeNull();
    });

    it('returns stored token', () => {
      localStorage.setItem('insforge_access_token', 'xyz');
      expect(service.getAccessToken()).toBe('xyz');
    });
  });
});
