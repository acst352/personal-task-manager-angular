import { describe, it, expect } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { extractErrorMessage, mapHttpError } from './errors';

describe('errors helpers', () => {
  describe('extractErrorMessage', () => {
    it('returns body.message from HttpErrorResponse', () => {
      const err = new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized',
        error: { message: 'Invalid credentials' },
      });
      expect(extractErrorMessage(err)).toBe('Invalid credentials');
    });

    it('falls back to body.error if no message', () => {
      const err = new HttpErrorResponse({
        status: 401,
        error: { error: 'AUTH_UNAUTHORIZED' },
      });
      expect(extractErrorMessage(err)).toBe('AUTH_UNAUTHORIZED');
    });

    it('falls back to friendly message for 401', () => {
      const err = new HttpErrorResponse({ status: 401, error: null });
      expect(extractErrorMessage(err)).toMatch(/contrase/i);
    });

    it('returns Error.message for plain Error', () => {
      expect(extractErrorMessage(new Error('boom'))).toBe('boom');
    });

    it('returns generic fallback for unknown types', () => {
      expect(extractErrorMessage(null)).toBe('Error desconocido');
      expect(extractErrorMessage(undefined)).toBe('Error desconocido');
      expect(extractErrorMessage(42)).toBe('Error desconocido');
    });
  });

  describe('mapHttpError', () => {
    it('prefers body.message when present', () => {
      expect(mapHttpError(400, { message: 'Campo requerido' })).toBe('Campo requerido');
    });

    it('maps 401 to friendly auth message', () => {
      expect(mapHttpError(401, null)).toMatch(/contrase/i);
    });

    it('maps 403 to permission message', () => {
      expect(mapHttpError(403, null)).toMatch(/permiso/i);
    });

    it('maps 404 to not-found message', () => {
      expect(mapHttpError(404, null)).toMatch(/encontr/i);
    });

    it('maps 429 to rate-limit message', () => {
      expect(mapHttpError(429, null)).toMatch(/intentos/i);
    });

    it('maps 5xx to server-error message', () => {
      expect(mapHttpError(500, null)).toMatch(/servidor/i);
      expect(mapHttpError(503, null)).toMatch(/servidor/i);
    });
  });
});
