# Product Requirements Document — Angular CRUD (Task Manager)

**Estado**: v1.8.0 — funcional + quality + security + deploy, mantenimiento continuo
**Última actualización**: 2026-09-18
**Owner**: Icy-alex
**Próxima revisión**: post-staging setup

---

## 1. Problema

Como desarrollador junior, necesito un proyecto CRUD real para practicar el stack Angular moderno de punta a punta (signals, zoneless, httpResource, formularios, auth, interceptor, tests) sin la complejidad de UI avanzado ni features de negocio que distraigan del aprendizaje técnico. El proyecto debe ser deployable, tener auth real, persistencia en la nube, y servir como referencia futura.

## 2. Usuarios objetivo

| Tipo | Descripción | Necesidad principal |
|---|---|---|
| **Primario** | Yo mismo (dev junior aprendiendo Angular) | Tener un proyecto donde aplicar y consolidar lo aprendido |
| **Secundario** | Otros devs juniors que necesiten un proyecto Angular de referencia | Ver patrones idiomáticos (signals, httpResource, zoneless) en código real |

## 3. Features in scope (v1.0.0) — ✅ completado

- **Gestión de tareas**: crear, listar, editar, marcar done, eliminar con confirmación
- **Persistencia en la nube**: backend Postgres vía InsForge + PostgREST
- **Auth email/password**: signup con verificación, login, sesión persistente, logout
- **Aislamiento por usuario**: cada usuario solo ve/edita sus tareas (RLS server-side)
- **Estados de carga y error**: signals `isLoading` y `error` mostrados en UI
- **Validación inline** en formularios (email formato, password min 6)
- **Tests de integración** con vitest (servicios + componentes en aislamiento)
- **Tests E2E** con Playwright (flujos completos en navegador real)

## 4. Out of scope (histórico v1.0.0)

OAuth social · 2FA · colaboración multi-usuario en tiempo real · mobile nativo · PWA offline · i18n · temas (claro/oscuro) · notificaciones push · adjuntos a tareas · búsqueda full-text · categorías/tags · recordatorios · export/import.

## 5. Criterios de éxito — ✅ todos cumplidos al cierre de v1.0.0

- [x] Un usuario nuevo puede registrarse, recibir código, verificar email, hacer login
- [x] Un usuario autenticado puede CRUD completo de sus tareas
- [x] Dos usuarios distintos NO ven las tareas del otro (RLS validado con E2E)
- [x] Sesión persiste entre reloads del navegador
- [x] Eliminar con confirmación; no se elimina silenciosamente si falla
- [x] Errores HTTP se mapean a mensajes específicos (no "error desconocido")
- [x] ≥ 80% de los flujos críticos cubiertos por tests (integración + E2E)
- [x] `ng build` sin warnings · `pnpm test` verde · `pnpm e2e` verde
- [x] Tiempo a interactivo < 2s en localhost

### Métricas post-v1.0.0 (al cierre de v1.8.0)

- **Tests**: 60 total (39 unit + 21 e2e: 16 functional + 5 visual), 0 flaky
- **Coverage**: 90.98% statements, 88.63% branches
- **Bundle**: 299.37 KB raw / 78.57 KB transferred (budget 500 KB error / 350 KB warn)
- **Tags**: 19 versiones publicadas (v0.1.0 → v1.8.0)
- **0 vulnerabilidades activas** en código propio (CodeQL limpio)
- **Repo público** desde v1.0.0: github.com/acst352/personal-task-manager-angular

## 6. Stack técnico (al día v1.8.0)

| Capa | Tecnología |
|---|---|
| Frontend | Angular 21 (zoneless, signals, standalone components, `@if`/`@for`) |
| Lenguaje | TypeScript estricto |
| HTTP | `HttpClient` + `httpResource()` |
| Forms | `FormsModule` con `[(ngModel)]` ligado a signals |
| Backend | InsForge (Postgres + PostgREST + Auth JWT) |
| Gestor | pnpm |
| Tests integración | vitest + jsdom + `provideHttpClientTesting`, Angular `@angular/build:unit-test` |
| Tests E2E | Playwright (Chromium) |
| Visual regression | Playwright `toHaveScreenshot()` con `maxDiffPixelRatio: 0.02` |
| Linter / formato | Prettier + ESLint v10 + Angular ESLint v22 (flat config) |
| CI/CD | GitHub Actions: `verify.yml` + `codeql.yml` + `dependabot-auto-merge.yml` |
| Deploy | Vercel (GitHub Integration, preview por PR, prod on main) |
| Security scanning | GitHub CodeQL (security-and-quality query pack) |
| Dependency tracking | Dependabot (npm + github-actions) |
| Conventional commits | commitlint v21 + `@commitlint/config-conventional` |
| Pre-push guard | bash script en `.husky/pre-push` (bloquea >50 paths) |
| Bundle analyzer | `source-map-explorer` v2.5.3 |
| Control de versiones | Git + semver estricto + tags por versión |
| Project mgmt | Linear (2 proyectos: granular "Angular CRUD" + ejecutivo "Administrador de tareas personales") + GitHub |

## 7. Constraints

- **Tiempo de desarrollo**: sprints cortos (1 día cada feature mayor). Aprendizaje > velocidad.
- **Sin budget**: backend gratis (InsForge free tier), sin CDN pago, sin monitoring pago.
- **Email verification**: puede desactivarse en dev si el delivery falla; re-activar antes de v1.0.0.
- **TypeScript strict**: activado por defecto en Angular CLI. No relajar.
- **Sin SSR**: SPA pura (CSR). Decisión consciente para simplicidad.
- **Sin Tailwind v4**: usar CSS plano para evitar lock-in de versión (Pin a Tailwind 3.4 si se introduce).
- **Sin secrets en repo**: el anonKey de InsForge es publishable por diseño (mismo modelo que Supabase `anon key`). RLS es la barrera de seguridad real, no ocultar la key.
- **Pre-push hook obligatorio**: no se commitea nunca con `--no-verify` en sesiones reales (excepto entornos headless donde el hook cuelga).

## 8. Riesgos (al día v1.8.0)

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| RLS policies de InsForge no documentadas | Mitigado | — | Documentado en `docs/INVESTIGATION.md` |
| Email verification delivery falla | Baja | Bloqueante | Toggle en dashboard de InsForge para desactivar; documentado |
| MCP tools de InsForge/Linear no disponibles | Baja | Molesto | Fallback a REST API + `curl` + scripts Node |
| Bundle > 2MB por incluir SDK completo | Mitigado | — | Tree-shaking + importar solo lo necesario (actual: 299 KB) |
| v1.0.0 se infla sin disciplina de scope | Mitigado | — | PRD + revisión periódica de out-of-scope |
| E2E tests contaminan producción | Media | Datos basura | Pendiente staging env (próxima prioridad) |
| Schema drift entre dev y prod | N/A | — | Solo 1 backend hasta staging |
| Vercel deploy expone keys | Baja | Bajo | anonKey es publishable, RLS protege datos reales |

## 9. Roadmap — 19 versiones publicadas

### Producto (v0.1.0 → v1.0.0)

| Versión | Hito | Estado |
|---|---|---|
| v0.1.0 | Scaffold Angular 21 + pnpm + InsForge backend conectado | ✅ taggeado |
| v0.2.0 | CRUD + Auth básico (Phase 0–4 cerrado) | ✅ taggeado |
| v0.3.0 | RLS documentada + bugs DELETE/INSERT corregidos | ✅ taggeado |
| v0.3.1 | Bug fixes (silent DELETE, stale state user-switch) | ✅ taggeado |
| v0.4.0 | Specs (auth, tasks, login-quality) escritas | ✅ taggeado |
| v0.5.0 | Test infra (vitest + Playwright) | ✅ taggeado |
| v0.6.0 | Tests rojos + fixes | ✅ taggeado |
| v0.7.0 | Login UI quality + 401 auto-logout | ✅ taggeado |
| v1.0.0 | Refactor + docs = production-ready | ✅ taggeado |
| v1.0.1 | Console error regression fix (interceptor anonKey fallback) | ✅ taggeado |

### Calidad + Deploy (v1.1.0 → v1.8.0)

| Versión | Hito | Estado |
|---|---|---|
| v1.1.0 | ESLint v10 + Angular ESLint v22 + vitest coverage thresholds 80% + Husky | ✅ taggeado |
| v1.1.1 | Security hardening pre-public-push (anonKey docs, INVESTIGATION redaction, .gitignore restore) | ✅ taggeado |
| v1.1.2 | Pre-push guard (`.husky/pre-push` + `scripts/prepush-check.sh`) | ✅ taggeado |
| v1.2.0 | GitHub Actions `verify.yml` (lint + unit + coverage + build + e2e) | ✅ taggeado |
| v1.3.0 | Commitlint (Conventional Commits enforcement, type-enum + subject-case off) | ✅ taggeado |
| v1.4.0 | Bundle analyzer + size budget (350 KB warn / 500 KB error) | ✅ taggeado |
| v1.5.0 | Dependabot (npm + github-actions) + auto-merge patch+minor | ✅ taggeado |
| v1.5.1 | CI concurrency fix (dependabot auto-merge cancelaba developer runs) | ✅ taggeado |
| v1.6.0 | E2E test isolation (uniqueEmail UUIDs, workers=1, cleanupTasks beforeEach) | ✅ taggeado |
| v1.7.0 | Visual regression tests (5 PNG snapshots, cross-platform) | ✅ taggeado |
| v1.8.0 | GitHub CodeQL (TypeScript security scanning semanal) | ✅ taggeado |

## 10. Próximos pasos (post-v1.8.0)

| Prioridad | Acción | Estado |
|---|---|---|
| 1 | **Staging environment** — separar tests/dev de producción. Crear 2do proyecto InsForge, Angular `fileReplacements`, sync schema script | Pendiente (en plan) |
| 2 | **Branch protection en GitHub** — requerir CI pass antes de merge a main (gating automático de Vercel) | Pendiente |
| 3 | **Custom domain en Vercel** (opcional) — migrar de `.vercel.app` a dominio propio si aplica | Pendiente |
| 4 | **Monitoreo de errores** (opcional) — Sentry o similar si la app crece más allá de uso personal | Pendiente |
| 5 | **OAuth social** (out-of-scope histórico) — reconsiderar si se quiere usar la app a diario | Considerar |

## 11. Decisiones de arquitectura (histórico de las 11 versiones)

### Por qué Angular zoneless + signals (no React)

- Stack personal, mayor familiaridad
- Signals dan reactividad explícita sin librerías
- Zoneless reduce overhead de Zone.js

### Por qué InsForge (no Supabase u otro BaaS)

- Familiar con el MCP tooling del proyecto
- Free tier suficiente para uso personal
- API REST estilo PostgREST (similar a Supabase pero más simple)

### Por qué tests en el bundle (no SSR)

- SPA pura = menos superficie de fallo
- Tests E2E deterministas sin servidor
- Deploy estático a Vercel = 0 config de backend

### Por qué pre-push guard con `git add --dry-run .`

- Atrapa el bug donde `.gitignore` se truncó y hubiera pusheado `node_modules/`
- Threshold 50 paths blocks, 5-50 warns, ≤5 silent
- Documentado en `docs/TESTING.md`

### Por qué fileReplacements y no env vars para staging/prod (futuro)

- Angular CLI nativo soporta `fileReplacements` en `angular.json`
- Funciona sin runtime config fetches
- Compatible con build estático en Vercel
- anonKey es publishable, no necesita runtime hiding

### Por qué Conventional Commits en vez de free-form

- `commitlint` permite auto-generate CHANGELOG si se quiere
- `lint-staged` + pre-commit hook enforce formato
- Permite tools externos (release-please, semantic-release) hookearse después

### Por qué CodeQL sobre Semgrep u otros SAST

- Nativo de GitHub (no requiere external account)
- Gratis para repos públicos
- No envía código a 3rd party
- Complementa Dependabot (deps vs código propio)
