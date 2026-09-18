# Changelog

Todos los cambios notables de este proyecto se documentan aquí. El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.1.0/), y este proyecto adhiere a [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.5.0] - 2026-09-18

### Added
- **GitHub Dependabot** (`.github/dependabot.yml`):
  - Tracks `npm` (5 PR limit) and `github-actions` (3 PR limit)
  - Weekly schedule: lunes 04:00 UTC
  - Groups patch+minor updates; major updates quedan individuales
  - Ignores major updates de `@angular/*` (requieren migración manual)
  - Commit message prefix `chore(deps)` / `chore(dev-deps)` / `ci` (commitlint-friendly)
- **Auto-merge workflow** (`.github/workflows/dependabot-auto-merge.yml`):
  - Auto-mergea patch + minor updates si CI pasa
  - Major updates quedan para revisión manual
  - Usa `peter-evans/enable-pull-request-automerge@v3`
- Vulnerabilidad esbuild low será auto-fixeada cuando upstream publique parche

### Notes
- Ya había 1 alerta de Dependabot desde el push inicial (esbuild path traversal en Windows). Esta config la formaliza y la arreglará automáticamente cuando esté disponible.

Documented in `docs/TESTING.md` under "Dependabot (auto-update dependencies + security patches)"

## [1.4.0] - 2026-09-18

### Added
- **Bundle analyzer** (`source-map-explorer` v2.5.3):
  - `pnpm build:analyze` genera `dist/bundle-report.html` con treemap interactivo
  - Output incluye tamaño raw + gzip size por módulo
  - `--no-border-checks --gzip` flags para analysis headless-friendly
- **Size budget enforcement** (en `angular.json`):
  - `initial`: warn 350 KB / error 500 KB
  - `anyComponentStyle`: warn 4 KB / error 8 KB
  - CI ya enforce via `pnpm build` step en `.github/workflows/verify.yml`
- **Source maps en producción** (`sourceMap: true` en `production` config):
  - Necesario para source-map-explorer
  - Costo: ~0.5 KB adicionales en bundle (acceptable para OSS)
- **packageManager fix**: `angular.json` ahora dice `"pnpm"` en lugar de `"npm"`

### Changed
- Bundle budgets tightened: initial 500/1000 → 350/500 (más alineado con el bundle actual de 299 KB)

### Current bundle state
- Initial: 299.37 KB raw / 78.57 KB transferred
- Styles: 48 bytes
- Buffer al warning: 51 KB (17%)
- Buffer al error: 201 KB

Documented in `docs/TESTING.md` under "Bundle analyzer y size budget"

## [1.3.0] - 2026-09-18

### Added
- **Commitlint** (Conventional Commits enforcement):
  - `commitlint.config.js` extends `@commitlint/config-conventional` v21
  - `.husky/commit-msg` runs `commitlint --edit` on every commit
  - Rules: type-enum (standard set), header-max-length 120, body-max-line-length 200
  - `subject-case` disabled — names like ESLint, GitHub, InsForge break lower/sentence-case
  - New scripts: `pnpm commitlint`, `pnpm lint:commit`, `pnpm lint:commits:all`
  - 10/10 historical commits validated retroactively
- Documented in `docs/TESTING.md` under "Convenciones de commits (commitlint)"
- Dependencies: `@commitlint/cli@21.2.2`, `@commitlint/config-conventional@21.2.2`

## [1.2.0] - 2026-09-18

### Added
- **GitHub Actions CI workflow** (`.github/workflows/verify.yml`):
  - Runs on push to main and PRs
  - Steps: install → lint → unit+coverage → build → e2e
  - Caches: pnpm store (via setup-node) + Playwright browsers
  - Concurrency: cancels in-progress runs on new push to same branch
  - Artifacts: coverage report (14d), playwright report on failure (7d)
  - No secrets required (anonKey is public, RLS is security boundary)
  - Timeout: 20 min
- Documented in `docs/TESTING.md` under "CI (GitHub Actions)"

## [1.1.1] - 2026-09-18

### Added
- **Pre-push guard** (`.husky/pre-push` + `scripts/prepush-check.sh`):
  Runs `git add --dry-run .` before every `git push`. Blocks if >50 paths would stage, warns if 5-50, silent if ≤5. Catches the regression where `.gitignore` was truncated and would have pushed `node_modules/` to a public repo.
- Documented in `docs/TESTING.md` under "Pre-push guard"
- New script: `pnpm prepush` (manual run)
- Override: `PREPUSH_THRESHOLD=N git push`

## [1.1.0] - 2026-09-18

### Added
- **ESLint v10 + Angular ESLint v22** (flat config in `eslint.config.js`):
  - TypeScript strict rules (no-explicit-any, no-unused-vars, prefer-const)
  - Angular rules (directive-class-suffix, prefer-on-push)
  - Strict console/debugger rules
  - Component-class-suffix disabled (we use Login/TaskForm/TaskItem naming)
- **Coverage thresholds** in `vitest.config.ts`:
  - 80% statements, 75% branches, 80% functions, 80% lines
  - HTML + lcov + text reporters
  - Current coverage: 90.98% / 88.63% / 80% / 92.52% — all thresholds met
- **Husky + lint-staged** for pre-commit hooks:
  - `.husky/pre-commit` runs `npx lint-staged`
  - lint-staged config: ESLint fix + Prettier write for staged files
  - Configured via `git config core.hooksPath .husky`
- **Signup regression test** (`e2e/signup-flow.spec.ts`):
  - 3 tests: clean signup, invalid email blocks submit, short password blocks submit
  - Main test would have caught the v1.0.1 regression (no console errors during signup)
- New scripts in `package.json`: `lint`, `lint:fix`, `format`, `format:check`, `test:coverage`, `verify` (full CI gate)

### Deferred (require GitHub remote or external account)
- GitHub Actions CI
- Codecov upload
- Lighthouse CI
- Snyk + SonarQube Cloud

## [1.0.1] - 2026-09-17

### Fixed
- **Console error regression**: `auth.interceptor.ts` was sending no Authorization header when no user token was present. This caused `POST /api/auth/users` (signup) to fail with 401 because InsForge requires Bearer auth even for anonymous application calls (uses the anon key as application identification). Restored the `anonKey` fallback so the interceptor always sends a Bearer header.

### Verified
- 0 console errors on app load
- 0 failed network requests on signup
- 39/39 unit tests still green

## [1.0.0] - 2026-09-17

### Changed
- **F-1**: Error handling consolidated in `src/app/core/errors.ts`:
  - `extractErrorMessage(e)` — single entry point for any error
  - `mapHttpError(status, body, statusText)` — pure function with friendly messages per HTTP status (401, 403, 404, 409, 429, 5xx)
- Removed duplicate `extractMessage` from `login.ts` and `toHttpError` from `app.ts`.

### Added
- **F-3**: `docs/TESTING.md` covering test stack, structure, commands, how to add new tests, selector strategies, mock approach, common gotchas, and bugs caught by the suite.
- 11 unit tests in `src/app/core/errors.spec.ts` covering the new error helpers.

### Verified
- 39/39 unit tests green (was 28/28 before refactor + new tests)
- 12/13 e2e tests green (auth-switch flaky in full suite, passes in isolation)
- `ng build` clean
- App manually verified in browser

### Milestone
**v1.0.0 = production-ready** (per PRD). The personal task manager meets all success criteria:
- ✅ User can sign up, log in, persist session
- ✅ CRUD with RLS isolation (per-user)
- ✅ Stale state bug fixed (bug #3 reactivity)
- ✅ Silent DELETE bug fixed (bug #1 return-representation)
- ✅ RLS insert bug fixed (bug #2 policy)
- ✅ Specific error messages (no "error desconocido")
- ✅ Login UI professional (validation, accessibility, password toggle)
- ✅ 39 unit tests + 12 e2e tests covering regressions
- ✅ Docs: PRD, SPECs (3), INVESTIGATION, TESTING, VERSIONING, CHANGELOG

## [0.7.0] - 2026-09-17

### Added
- **E-3**: Interceptor now catches 401 on authenticated requests and calls `authService.signOut()`. Public auth endpoints (sessions, users, email/*) are excluded so login failures don't trigger logout. Implemented via `inject(AuthService)` inside the functional interceptor.
- **E-4**: Login UI quality improvements:
  - `emailValid` / `passwordValid` / `otpValid` computed signals for real-time client validation
  - `formValid` computed: button disabled when form invalid or submitting
  - `showPassword` signal + `passwordInputType` computed → toggle visibility with 👁 / 🙈 icons
  - Inline hint messages (`hint-error` class) under each field when invalid
  - `aria-invalid` on inputs, `aria-describedby` linking to hint messages
  - `role="alert"` `aria-live="assertive"` on errors, `role="status"` on info messages
  - 44px minimum button height for touch accessibility
  - Better focus outlines and disabled contrast

### Changed
- Test fixtures updated to use `input[name=...]` selectors instead of `getByLabel` to avoid strict mode violations when password toggle's `aria-label` overlaps with the field's accessible name.

## [0.6.0] - 2026-09-17

### Added
- **Unit tests (vitest)**: 28 passing across `auth.service.spec.ts` (16) and `tasks.spec.ts` (10) + 2 smoke tests.
- **E2E tests (playwright)**: 11/13 passing across `auth.spec.ts` (5), `tasks.spec.ts` (4/6), `auth-switch.spec.ts` (1, bug #3 regression), `auth-boot-validation.spec.ts` (1).
- `e2e/fixtures.ts`: shared helpers (signIn, createTaskViaUI, cleanupTasks, createTestUser, etc.).
- `src/test-helpers/insforge-admin.ts`: admin API helpers for test setup/teardown.
- `src/test-setup.ts`: jsdom + localStorage mock + Angular TestBed + beforeEach reset.

### Bug #3 reactivity fix
- `TasksService.tasks` now uses an explicit `effect()` that watches `auth.currentUser()` and reloads on change. Replaces the earlier (unreliable) header-dependency approach.

### Tests added (from Phase D scope)
- ICY-62 `auth.service.spec.ts` (12 cases, expanded to 16)
- ICY-63 `tasks.service.spec.ts` (10 cases) — includes bug #1 and #2 regressions
- ICY-64 `login.spec.ts` (deferred to Phase F or E)
- ICY-65 `e2e/auth.spec.ts` (5 flows)
- ICY-66 `e2e/tasks.spec.ts` (6 flows, including RLS isolation)
- ICY-67 `e2e/login-quality.spec.ts` (deferred — fewer features implemented)
- ICY-76 `e2e/auth-switch.spec.ts` (1 flow, bug #3 regression)
- ICY-77 `e2e/auth-boot-validation.spec.ts` (1 flow, stale token rejected)

### Known flakiness
- `TASK-E2E-4` and `auth-switch.spec.ts` pass in isolation but are flaky in full suite due to test pollution between tests sharing the same user/BD. Mitigation: move `cleanupTasks` to `beforeEach`.

## [0.5.0] - 2026-09-17

### Added
- `vitest.config.ts`: configuration with `@analogjs/vitest-angular` plugin, jsdom environment, setup file
- `src/test-setup.ts`: Angular TestBed init, localStorage mock, `beforeEach` reset hook
- `src/test-setup.spec.ts`: smoke tests (2 passing) verifying the infra
- `src/test-helpers/insforge-admin.ts`: `cleanupTasks()`, `createTestUser()`, `signIn()`, `deleteUser()`, `getTaskCount()`, `rawSql()` — all using admin bearer token for test setup/teardown
- `playwright.config.ts`: chromium project, baseURL `http://127.0.0.1:4200`, webServer auto-start
- `@playwright/test@1.63.0` and chromium binary installed
- npm scripts: `test:watch`, `e2e`, `e2e:headed`, `e2e:ui`, `e2e:install`

### Removed
- `src/app/app.spec.ts` — stale, referenced the removed "Hello, task-manager" template

### Verification
- `pnpm exec ng test --watch=false`: ✅ 2/2 smoke tests pass
- `pnpm exec playwright --version`: ✅ 1.63.0
- `playwright test --list`: ✅ reports 0 tests (Phase D will populate)

## [0.4.0] - 2026-09-17

### Added
- `docs/SPEC.auth.md`: 15 cases Given/When/Then for auth flows (signup, verify, login, logout, reload, switch user, errors, edge cases).
- `docs/SPEC.tasks.md`: 11 cases for CRUD including TASK-N1/N2 (negative tests that catch RLS bypass bugs).
- `docs/SPEC.login-quality.md`: 11 criteria for professional-grade login (validation, accessibility, error mapping, robustness).

Each case marked with status ✅/⚠️/❌ against current implementation. These docs become the contract that Phase D tests assert against.

## [0.3.1] - 2026-09-17

### Fixed
- **Bug #1 (DELETE silent)**: `tasks.service.ts:remove()` now uses `Prefer: return=representation` and throws when the response array is empty (RLS denied the delete, server returns 200 with `[]`). `App.onRemove()` shows a `confirm()` dialog and surfaces the error via `actionError` signal.
- **Bug #3 (architectural — stale state on user switch)**: `TasksService.tasks` now reads `auth.currentUser()` inside the `httpResource()` request function, making it reactive. When the user logs in/out, the resource refetches automatically with the new token. Previously the URL was constant and stale data from a previous user lingered in `tasks.value()` until the next create/update/delete triggered a reload.

### Added
- `AuthService.validateStoredSession()`: bootstrap check that calls `/api/auth/sessions/current` with the stored token. If 401/403, clears the session. Wired via `provideAppInitializer()` in `app.config.ts` so it runs before the first render — dead tokens no longer let the UI show a logged-in state.
- `task.ts`: `NewTask` and `TaskUpdate` type aliases (already existed, formalized).
- `App.actionError` signal: separate from the resource-level `error` so CRUD failures show inline without losing the resource error.

### Changed
- `tasks.service.ts:create()` now requires a non-null `userId` parameter (caller must be authenticated). Throws with a clear message if RLS denies.
- `tasks.service.ts:update()` now throws if the patched row is not returned (RLS denied or row doesn't exist).

### Tests added to Phase D
- ICY-76 `e2e/auth-switch.spec.ts`: user-switch mid-session shows new user's tasks
- ICY-77 `e2e/auth-boot-validation.spec.ts`: stale token rejected at boot

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
