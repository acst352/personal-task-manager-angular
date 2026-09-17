import { HttpErrorResponse } from '@angular/common/http';

export function extractErrorMessage(e: unknown): string {
  if (e instanceof HttpErrorResponse) {
    return mapHttpError(e.status, e.error, e.statusText);
  }
  if (e instanceof Error && e.message) {
    return e.message;
  }
  return 'Error desconocido';
}

export function mapHttpError(
  status: number,
  body: unknown,
  statusText?: string,
): string {
  const fromBody = readMessageFromBody(body);
  if (fromBody) {
    return fromBody;
  }
  if (status >= 500) {
    return `Error del servidor (HTTP ${status}). Intenta de nuevo.`;
  }
  if (status === 401) {
    return 'Email o contraseña incorrectos';
  }
  if (status === 403) {
    return 'No tienes permiso para realizar esta acción';
  }
  if (status === 404) {
    return 'No se encontró el recurso solicitado';
  }
  if (status === 409) {
    return 'Conflicto: el recurso ya existe';
  }
  if (status === 429) {
    return 'Demasiados intentos. Espera unos segundos.';
  }
  return `HTTP ${status} ${statusText ?? 'sin detalle'}`;
}

function readMessageFromBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (typeof b['message'] === 'string' && b['message']) return b['message'];
  if (typeof b['error'] === 'string' && b['error']) return b['error'];
  return null;
}
