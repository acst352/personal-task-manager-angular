# Changelog

Todos los cambios notables de este proyecto se documentan aquí. El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.1.0/), y este proyecto adhiere a [Semantic Versioning](https://semver.org/).

## [Unreleased]

### En curso
- PM setup: PRD, versionado, Linear board
- Fase A: investigación RLS + fix bugs DELETE/INSERT

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
