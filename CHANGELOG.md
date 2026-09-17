# Changelog

Todos los cambios notables de este proyecto se documentan aquí. El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.1.0/), y este proyecto adhiere a [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.3.0] - 2026-09-17

### Fixed
- **Bug 2 (INSERT 403)**: created RLS policy `users_own_tasks` on `public.tasks` for the `authenticated` role. Previously the table had RLS enabled but defined no policies, which under Postgres defaults to deny-everything. The admin bearer token bypasses RLS (table owner role), which is why curl with the admin key worked but the app with a user JWT didn't.

### Documentation
- `docs/INVESTIGATION.md`: full RLS investigation, schema, policies, JWT structure, bug diagnosis, and Phase E roadmap
- `docs/PRD.md`: one-pager project requirements
- `docs/VERSIONING.md`: semver rules + roadmap

### Maintenance
- Deleted 5 leftover task rows (all with user_id=null from pre-RLS testing)
- Deleted test users `rls-test@example.com` and `demo@example.com`

### Known Issues (still open)
- ⚠️ **Bug 1 (DELETE silent)**: when RLS denies a DELETE (because the row isn't visible to the requesting user), PostgREST returns 200 OK with body `[]`. The current `tasks.service.ts:remove()` only checks status code, so the UI believes the deletion succeeded. Fix in E-1.

## [0.2.0] - 2026-09-17

### Added
- CRUD completo contra InsForge: create, read, update, delete, toggle done
- Auth básico con email/password (signup, login, sesión persistente)
- httpResource() para GET reactivo de tareas
- HttpClient + interceptor funcional que añade `Authorization: Bearer <token>`
- Persistencia de sesión en localStorage (`insforge_access_token`, `insforge_user`)
- Zoneless change detection + provideHttpClient
- TaskForm reutilizable para crear y editar (con `[(ngModel)]` ligado a signals)
- Login UI con 3 modos (signin / signup / verify) y password toggle
- States de carga y error expuestos como `computed` desde el service

### Known Issues (se arreglan en v0.3.0)
- ⚠️ DELETE silencioso cuando RLS bloquea (la UI cree que borró pero el recurso sigue visible)
- ⚠️ INSERT 403 cuando RLS exige `user_id = auth.uid()` y el cliente lo envía en body
- ⚠️ Email verification puede fallar (toggleable en dashboard de InsForge)

## [0.1.0] - 2026-09-15

### Added
- Scaffold inicial con Angular CLI 21 (`@angular/cli@21.2.24`)
- Migración de npm a pnpm (removido `packageManager` field)
- Cliente InsForge configurado en `src/app/core/insforge.client.ts`
- Environment en `src/environments/environment.ts` con baseUrl y anonKey
- MCP server de InsForge configurado en `opencode.json`
- Tabla `tasks` en backend InsForge: `id uuid PK`, `title text NOT NULL`, `done bool NOT NULL`, `priority text NOT NULL`, `user_id uuid NULL`, `created_at`, `updated_at` (auto)
- TaskItem component con `input.required<Task>()` y outputs `toggle`/`remove`/`edit`
- App component con signals (`tasks`, `pendingCount`), template con `@if/@for/@switch`
