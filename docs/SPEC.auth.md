# SPEC — Authentication

**Fecha**: 2026-09-17
**Status**: Draft (cierra como contract cuando Phase D empiece a usarlos para tests)
**Issues**: ICY-53 (este archivo), ICY-50 (Phase D tests derivados)

---

## Convenciones

- **GIVEN** estado previo (siempre el mismo: app cargada en `http://localhost:4200`, BD limpia)
- **WHEN** acción del usuario
- **THEN** resultado esperado (UI + network + localStorage)

Cada caso tiene **status**:
- ✅ Implementado y verificado manualmente
- ⚠️ Implementado pero con bug conocido (referencia a INVESTIGATION.md)
- ❌ Pendiente (Phase E)

---

## AUTH-1: Signup con credenciales válidas → pantalla de verificación

**Given** usuario no autenticado en la pantalla de login
**When** click "Crear cuenta" → completa email + password (≥6 chars) + name opcional → click "Registrarme"
**Then**:
- POST a `/api/auth/users` con body `{ email, password, name? }` y header `Authorization: Bearer <anonKey>`
- Backend responde 200 con `{ accessToken: null, requireEmailVerification: true }`
- `AuthService.pendingVerificationEmail` se setea al email usado
- UI cambia al modo "verify": muestra "Te enviamos un código a <email>"
- Aparece input de OTP + botones "Verificar" y "Reenviar código"

**Status**: ✅ implementado, ⚠️ email delivery puede fallar (mitigación: toggle en dashboard)

---

## AUTH-2: Signup con email duplicado → error

**Given** usuario no autenticado, ya existe un usuario con ese email
**When** intenta signup con email duplicado
**Then**:
- POST `/api/auth/users` retorna 400 o 422 (formato exacto del backend por confirmar)
- UI muestra el mensaje del backend o "Este email ya está registrado"
- Modo sigue en "signup" (no avanza a "verify")

**Status**: ⚠️ implementar (no testeado aún — el backend podría devolver 401, 409 o 422 según el caso)

---

## AUTH-3: Verificación de email con OTP correcto → sesión iniciada

**Given** pantalla de verificación activa con email pendiente
**When** completa el código OTP recibido por email → click "Verificar"
**Then**:
- POST a `/api/auth/email/verify` con `{ email, otp }`
- Backend responde 200 con `{ accessToken, user }`
- localStorage `insforge_access_token` y `insforge_user` se setan
- `AuthService._user` se setea
- UI transiciona a pantalla de tareas

**Status**: ✅ implementado, ⚠️ requiere entrega de email funcionando

---

## AUTH-4: Verificación con OTP incorrecto → error

**Given** pantalla de verificación activa
**When** ingresa OTP incorrecto → click "Verificar"
**Then**:
- POST retorna 400 con mensaje "Invalid or expired verification code"
- UI muestra el mensaje debajo del input
- Sigue en modo "verify" (no avanza)

**Status**: ✅ implementado

---

## AUTH-5: Login con credenciales válidas → tareas del usuario

**Given** usuario no autenticado, pantalla de login en modo "signin"
**When** completa email + password → click "Entrar"
**Then**:
- POST `/api/auth/sessions` retorna 200 con `{ accessToken, user }`
- localStorage se setea
- `AuthService._user` se setea
- UI muestra header con email del usuario
- `tasks.httpResource()` fetcha con el nuevo token → muestra solo las tareas del usuario actual
- Botón "Salir" visible

**Status**: ✅ implementado, ✅ bug #3 resuelto (reactividad del resource)

---

## AUTH-6: Login con credenciales inválidas → error específico

**Given** pantalla de login
**When** ingresa email o password incorrectos → click "Entrar"
**Then**:
- POST retorna 401 con `{ error: "AUTH_UNAUTHORIZED", message: "Invalid credentials" }`
- UI muestra "Invalid credentials" (extraído de `body.message`, no "error desconocido")
- NO se setea token ni `_user`
- Sigue en pantalla de login

**Status**: ✅ implementado

---

## AUTH-7: Login con email no verificado → error específico (cuando verification está activa)

**Given** usuario con email no verificado (verification activada)
**When** intenta login
**Then**:
- POST retorna 403 con `{ error: "FORBIDDEN", message: "Email verification required" }`
- UI muestra "Email verification required"
- NO se setea sesión

**Status**: ✅ implementado (código), ⚠️ con verification desactivada en dev, este caso no aplica

---

## AUTH-8: Logout limpia todo

**Given** usuario autenticado, viendo sus tareas
**When** click "Salir"
**Then**:
- `localStorage.removeItem('insforge_access_token')`
- `localStorage.removeItem('insforge_user')`
- `AuthService._user.set(null)`
- `tasks.httpResource()` re-evalúa (porque `currentUser` cambió) → refetch con token anon → RLS filtra a anon user → retorna `[]`
- UI transiciona a pantalla de login
- `editing` e `isCreating` signals se resetean

**Status**: ✅ implementado

---

## AUTH-9: Reload preserva sesión válida

**Given** usuario autenticado, token válido en localStorage
**When** recarga la página (F5)
**Then**:
- `provideAppInitializer` ejecuta `validateStoredSession()` antes del primer render
- GET `/api/auth/sessions/current` retorna 200 con user data
- `AuthService._user` se setea (refrescado desde server por si email cambió)
- localStorage `insforge_user` se actualiza con datos frescos
- UI muestra tareas directamente (no pantalla de login)

**Status**: ✅ implementado

---

## AUTH-10: Reload con token muerto → redirige a login

**Given** token expirado o revocado en localStorage
**When** recarga la página
**Then**:
- `validateStoredSession()` ejecuta
- GET `/api/auth/sessions/current` retorna 401 o 403
- `AuthService.signOut()` ejecuta: limpia localStorage, `_user` = null
- UI muestra pantalla de login (no tareas stale)

**Status**: ✅ implementado

---

## AUTH-11: Switch de usuario mid-session → lista del nuevo

**Given** usuario A autenticado, viendo sus tareas
**When** click "Salir" → login con creds de usuario B (sin recargar)
**Then**:
- `localStorage` se sobreescribe con datos de B
- `tasks.httpResource()` detecta cambio en `currentUser()` → refetch con token de B
- UI muestra las tareas de B (no de A, no mezcladas)
- Header muestra email de B

**Status**: ✅ implementado (fix bug #3)

---

## AUTH-12: Doble submit bloqueado

**Given** usuario en signin o signup
**When** click rápido doble en "Entrar" / "Registrarme"
**Then**:
- Botón queda `disabled` durante el primer submit (signal `submitting = true`)
- Solo se hace 1 POST al backend
- Segunda click es no-op

**Status**: ✅ implementado

---

## AUTH-13: Email con formato inválido bloqueado en cliente

**Given** pantalla de signup/signin
**When** completa email sin formato válido (ej: "foo@", "bar.com", "")
**Then**:
- Botón submit permanece deshabilitado
- Validación HTML5 (`type="email"`) + regex adicional en cliente bloquean el submit

**Status**: ❌ pendiente (Phase E-4)

---

## AUTH-14: Password menor a 6 chars bloqueado en cliente

**Given** pantalla de signup
**When** completa password con < 6 chars
**Then**:
- Botón submit deshabilitado
- Mensaje inline debajo del campo (Phase E-4)

**Status**: ❌ pendiente (Phase E-4)

---

## AUTH-15: Rate limit manejado

**Given** usuario intenta signup/login N veces en poco tiempo
**When** el backend responde 429 con mensaje genérico
**Then**:
- UI muestra "Demasiados intentos, espera unos segundos"
- Botón submit queda deshabilitado (o se puede añadir countdown)

**Status**: ⚠️ manejado parcialmente (mensaje genérico, sin countdown)

---

## Mapeo HTTP → mensaje

| Status | Body típico | Mensaje en UI |
|---|---|---|
| 200 | `{ accessToken, user }` | (éxito, no se muestra) |
| 400 | `{ error: "INVALID_INPUT", message: "<field-specific>" }` | mensaje del body.message |
| 401 | `{ error: "AUTH_UNAUTHORIZED", message: "Invalid credentials" }` | "Invalid credentials" |
| 403 | `{ error: "FORBIDDEN", message: "Email verification required" }` | "Email verification required" |
| 429 | `{ error: "TOO_MANY_REQUESTS", message: "..." }` | "Demasiados intentos" |
| 500+ | `{ error, message }` | mensaje del body.message |

**Implementación**: `extractMessage()` en `login.ts` extrae `body.message` o `body.error`, fallback a statusText.

---

## Out of scope (v1.0.0)

- "Forgot password" flow
- OAuth social (Google, GitHub)
- "Remember me" checkbox
- 2FA
- Cambio de email
- Cambio de password
