# Tooling Inventory

> **Purpose**: Single canonical source listing every tool used for security, quality, and CI in this project. Updated per release.
>
> **Last updated**: 2026-09-18 (post-v1.8.0, after Vercel deploy)
>
> **Total tools**: 24 (5 testing, 5 lint/format, 3 git hooks, 2 security, 3 CI, 2 docs, 1 bundle, 1 deploy, 2 lifecycle)

---

## How to use this doc

This document is **maintained per release**. Whenever a release adds, removes, or upgrades a tool:

1. Edit the relevant row in the inventory section (add version + since-version column entries).
2. Add a bullet to the **Tooling changelog** section at the bottom (cross-ref `CHANGELOG.md` if needed).
3. If the change is breaking for contributors, add a note in **Migration notes** at the bottom.

Keep this doc scannable — tables, not prose. Each row should be understandable without reading the file pointed to.

---

## 1. Static analysis & linting

| Tool | Version | Purpose | Configured in | Since |
|---|---|---|---|---|
| ESLint | v10.10.0 | JS/TS linter base | `eslint.config.js` (flat config) | v1.1.0 |
| @typescript-eslint/eslint-plugin | v8.70.0 | Strict TS rules (`no-explicit-any` error, `no-unused-vars` con prefix `_`) | id. | v1.1.0 |
| @angular-eslint/eslint-plugin | v22.5.0 | Reglas Angular (`prefer-on-push-component-change-detection`) | id. | v1.1.0 |
| @angular-eslint/eslint-plugin-template | v22.5.0 | Plantillas HTML en componentes | id. | v1.1.0 |
| @angular-eslint/builder | v22.5.0 | Builder Angular CLI integration | `angular.json` | v1.1.0 |
| Prettier | v3.8.1 | Auto-formateo | via lint-staged | v1.1.0 |
| lint-staged | v17.5.1 | Aplica ESLint+Prettier solo a archivos staged | `package.json` `lint-staged` block | v1.1.0 |

## 2. Unit tests

| Tool | Version | Purpose | Configured in | Since |
|---|---|---|---|---|
| Vitest | v4.0.8 | Test runner rápido (Vite-based internally) | `vitest.config.ts` | v0.5.0 |
| @analogjs/vitest-angular | v2.7.2 | Adaptador Angular + Vitest | id. | v0.5.0 |
| jsdom | v28.0.0 | DOM environment para tests | id. | v0.5.0 |
| @vitest/coverage-v8 | v4.1.11 | Coverage con motor v8 (más rápido que istanbul) | id. | v1.1.0 |
| Coverage thresholds | — | 80% statements / 75% branches / 80% functions / 80% lines | id. | v1.1.0 |

## 3. E2E tests

| Tool | Version | Purpose | Configured in | Since |
|---|---|---|---|---|
| Playwright | v1.63.0 | E2E runner para Chromium | `playwright.config.ts` | v0.5.0 |
| Workers=1 (always) | — | Aislamiento serial contra backend compartido | id. | v1.6.0 |
| Retries=2 (CI only) | — | Tolerancia a flakes en CI | id. | v1.2.0 |
| `uniqueEmail(prefix)` helper | — | Genera `{prefix}-{uuid}@example.com` con `crypto.randomUUID()` para evitar colisiones cross-test | `e2e/fixtures.ts` | v1.6.0 |
| `cleanupTasks` beforeEach | — | Borra tasks antes de cada test, empezando clean | id. | v1.6.0 |

## 4. Visual regression

| Tool | Purpose | Configured in | Since |
|---|---|---|---|
| Playwright `toHaveScreenshot()` | Snapshots pixel-perfect sin 3rd party deps | `e2e/visual.spec.ts` | v1.7.0 |
| `maxDiffPixelRatio: 0.02` | 2% tolerancia para cross-platform font rendering | `playwright.config.ts` | v1.7.0 |
| `snapshotPathTemplate` custom | Override default `-chromium-win32` suffix para cross-platform CI | id. | v1.7.0 |
| 5 PNG baselines | `login-form`, `login-error`, `tasks-empty`, `tasks-with-items`, `tasks-with-done` (~77 KB total) | `e2e/__snapshots__/` | v1.7.0 |

## 5. Security scanning

| Tool | Purpose | Configured in | Since |
|---|---|---|---|
| GitHub CodeQL | Native static security analysis (TS, security-and-quality query pack), semanal + on push | `.github/workflows/codeql.yml` | v1.8.0 |
| Pre-push guard (custom bash) | `git add --dry-run .` threshold: >50 paths blocks, 5-50 warns, ≤5 silent | `scripts/prepush-check.sh` + `.husky/pre-push` | v1.1.2 |
| Dependabot | Detecta deps con advisories y abre PRs semanales | `.github/dependabot.yml` | v1.5.0 |
| Dependabot auto-merge | Patch+minor se mergean solos si CI pasa | `.github/workflows/dependabot-auto-merge.yml` | v1.5.0 |
| `.gitignore` patterns | Bloquea `.env*`, `opencode.json`, `dist/bundle-report.html`, `.angular/cache`, `node_modules`, `coverage`, `dist` | `.gitignore` | v1.1.1 |
| `@typescript-eslint/no-explicit-any` (error) | Evita `any` que puede enmascarar type confusion | `eslint.config.js` | v1.1.0 |
| `no-console`/`no-debugger` | Solo `console.warn`/`error` permitidos en prod | id. | v1.1.0 |
| RLS policies (backend) | Aislamiento por usuario enforced at Postgres level | Backend InsForge | v0.3.0 |

## 6. Git hooks (Husky)

| Hook | Command | File |
|---|---|---|
| `pre-commit` | `npx lint-staged` (ESLint+Prettier sobre staged) | `.husky/pre-commit` | v1.1.0 |
| `pre-push` | `bash scripts/prepush-check.sh` (anti-leak guard) | `.husky/pre-push` | v1.1.2 |
| `commit-msg` | `commitlint --edit` (enforce Conventional Commits) | `.husky/commit-msg` | v1.3.0 |

## 7. Commit standards

| Tool | Version | Purpose | Configured in | Since |
|---|---|---|---|---|
| commitlint | v21.2.2 | Lint de mensajes de commit | `commitlint.config.js` | v1.3.0 |
| @commitlint/config-conventional | v21.2.2 | Reglas del Conventional Commits (type-enum, header-max-length 120, body-max-line-length 200) | id. | v1.3.0 |
| `subject-case: [0]` disabled | — | Permite nombres propios (ESLint, GitHub, InsForge) que rompen lower/sentence-case | id. | v1.3.0 |

## 8. Build & bundle

| Tool | Purpose | Configured in | Since |
|---|---|---|---|
| `@angular/build:application` | Builder oficial Angular (esbuild-based, **no Vite**) | `angular.json` | base |
| `source-map-explorer` v2.5.3 | Genera treemap interactivo de bundle | `package.json` script `build:analyze` | v1.4.0 |
| Bundle budgets (production) | initial 350 KB warn / 500 KB error, anyComponentStyle 4 KB / 8 KB | `angular.json` | v1.4.0 |
| Source maps en prod | `sourceMap: true` para source-map-explorer | id. | v1.4.0 |
| `packageManager: pnpm` | Fija el package manager en Angular CLI | id. | v1.4.0 |

## 9. CI/CD

| Workflow | Purpose | File | Since |
|---|---|---|---|
| `verify.yml` | lint → unit+coverage → build → e2e (Ubuntu, Node 22, pnpm 10, pnpm store + Playwright browsers cache) | `.github/workflows/verify.yml` | v1.2.0 |
| `codeql.yml` | TypeScript security-and-quality semanal + on push | `.github/workflows/codeql.yml` | v1.8.0 |
| `dependabot-auto-merge.yml` | Patch+minor auto-merge si CI pasa | `.github/workflows/dependabot-auto-merge.yml` | v1.5.0 |
| Concurrency group | `${{ github.workflow }}-${{ github.ref }}-${{ github.actor }}` evita cancelación cruzada Dependabot/dev | `verify.yml` | v1.5.1 |
| Coverage artifact | 14 días retención | id. | v1.2.0 |
| Playwright report on failure | 7 días retención | id. | v1.2.0 |
| pnpm 10 + Node 22 | Versiones pin en CI para reproducibilidad | id. | v1.2.0 |

## 10. Deploy

| Tool | Purpose | File | Since |
|---|---|---|---|
| Vercel GitHub Integration | Auto-deploy on push main, preview URLs por PR | (configurado en Vercel dashboard) | post-v1.8.0 |
| `vercel.json` | `outputDirectory: dist/task-manager/browser`, `pnpm build`, `pnpm install --frozen-lockfile`, SPA rewrites, cache headers | `vercel.json` | post-v1.8.0 |
| Branch protection | Recomendado, requiere CI pass antes de merge a main | (GitHub settings — pendiente activar) | — |

## 11. Documentation conventions

| Standard | Purpose | File | Since |
|---|---|---|---|
| Keep-a-Changelog | Formato manual de CHANGELOG (no auto-gen) | `CHANGELOG.md` | base |
| Conventional Commits | Mensajes de commit parseables por tools externos | via commitlint | v1.3.0 |

## 12. Custom scripts

| Script | Purpose | Source | Since |
|---|---|---|---|
| `pnpm prepush` | Manual run del pre-push guard sin hacer push | `package.json` | v1.1.2 |
| `pnpm lint:commit` | Valida el último commit (alias de `commitlint --edit`) | id. | v1.3.0 |
| `pnpm lint:commits:all` | Valida últimos 50 commits retroactively | id. | v1.3.0 |
| `pnpm build:analyze` | Build prod + treemap interactivo | id. | v1.4.0 |
| `pnpm e2e:visual` | Solo visual regression tests | id. | v1.7.0 |
| `pnpm e2e:visual:update` | Regenerar baselines (cambios intencionales) | id. | v1.7.0 |

---

## Tooling changelog

Cambios solo a tooling. Para cambios de producto, ver `CHANGELOG.md`.

### v1.1.0 (2026-09-18) — Quality foundation
- **Added**: ESLint v10 + Angular ESLint v22 + TypeScript ESLint v8 (flat config)
- **Added**: vitest coverage thresholds 80% + @vitest/coverage-v8
- **Added**: Husky + pre-commit hook + lint-staged
- **Added**: Prettier + lint-staged integration
- **Deferred (require GitHub remote)**: Codecov, Lighthouse CI, Snyk, SonarQube

### v1.1.1 (2026-09-18) — Security hardening
- **Added**: `.gitignore` patterns (`.env*`, `opencode.json`)
- **Added**: `.env.example` placeholder documentation

### v1.1.2 (2026-09-18) — Pre-push guard
- **Added**: `scripts/prepush-check.sh` + `.husky/pre-push` hook (anti-leak)

### v1.2.0 (2026-09-18) — CI
- **Added**: GitHub Actions `verify.yml`
- **Added**: Coverage artifact (14d) + Playwright report on failure (7d)
- **Added**: Concurrency group, pnpm+Node cache

### v1.3.0 (2026-09-18) — Commit standards
- **Added**: commitlint v21.2.2 + @commitlint/config-conventional
- **Added**: `.husky/commit-msg` hook
- **Added**: `pnpm commitlint`, `pnpm lint:commit`, `pnpm lint:commits:all` scripts

### v1.4.0 (2026-09-18) — Bundle analysis
- **Added**: source-map-explorer v2.5.3 + `pnpm build:analyze`
- **Tightened**: Bundle budgets 500/1000 → 350/500 KB
- **Added**: `packageManager: pnpm` en `angular.json`

### v1.5.0 (2026-09-18) — Dependency automation
- **Added**: Dependabot config (npm + github-actions)
- **Added**: `dependabot-auto-merge.yml` workflow

### v1.5.1 (2026-09-18) — CI concurrency fix
- **Changed**: Concurrency group incluye `${{ github.actor }}` (evita cancelaciones Dependabot↔dev)

### v1.6.0 (2026-09-18) — Test isolation
- **Changed**: `workers: 1` always + `fullyParallel: false`
- **Changed**: `cleanupTasks` en `beforeEach` para tasks.spec
- **Added**: `uniqueEmail()` helper con `crypto.randomUUID()`

### v1.7.0 (2026-09-18) — Visual regression
- **Added**: Playwright `toHaveScreenshot()` con 5 baselines
- **Added**: `maxDiffPixelRatio: 0.02`
- **Added**: Custom `snapshotPathTemplate` para cross-platform
- **Added**: `pnpm e2e:visual` + `pnpm e2e:visual:update`

### v1.8.0 (2026-09-18) — Security scanning
- **Added**: GitHub CodeQL (TypeScript, security-and-quality semanal + on push)

### Post-v1.8.0 — Vercel deploy
- **Added**: `vercel.json` + Vercel GitHub Integration

---

## Deprecation policy

When a tool needs to be removed:

1. Mark the row as `**Deprecated:**` in red, noting the version when deprecated.
2. Add an entry to the tooling changelog under a new release.
3. Document the migration path in **Migration notes** below.
4. Keep the row for at least one release cycle (so newcomers see "don't add this").
5. After 2 releases, move rows to a `## Removed tools` appendix at the bottom.

## Migration notes

(none yet)

## Removed tools

(none yet)

---

## Quick reference: commands

```bash
# Lint + format
pnpm lint                    # ESLint check
pnpm lint:fix                # ESLint auto-fix
pnpm format                  # Prettier write
pnpm format:check            # Prettier check

# Tests
pnpm test                    # vitest unit tests
pnpm test:coverage           # unit + coverage
pnpm test:watch              # vitest watch mode
pnpm e2e                     # Playwright e2e
pnpm e2e:visual              # solo visual regression
pnpm e2e:visual:update       # regenerar baselines

# Commits
pnpm commitlint              # valida HEAD commit
pnpm lint:commit             # alias commitlint
pnpm lint:commits:all        # valida últimos 50

# Build + bundle
pnpm build                   # production build
pnpm build:analyze           # build + bundle treemap

# Verify (CI gate local)
pnpm verify                  # lint + test:coverage + e2e + build

# Pre-push (anti-leak)
pnpm prepush                 # manual run
# (auto-runs on `git push` via .husky/pre-push)

# Install
pnpm e2e:install             # playwright chromium
```

## Quick reference: file locations

| Concern | Files |
|---|---|
| Linting | `eslint.config.js` |
| Unit tests | `vitest.config.ts`, `src/test-setup.ts` |
| E2E | `playwright.config.ts`, `e2e/fixtures.ts`, `e2e/*.spec.ts` |
| Git hooks | `.husky/{pre-commit,pre-push,commit-msg}` |
| Commit standards | `commitlint.config.js` |
| Bundle | `angular.json` (budgets), `package.json` (script) |
| CI | `.github/workflows/{verify,codeql,dependabot-auto-merge}.yml`, `.github/dependabot.yml` |
| Security | `.github/workflows/codeql.yml`, `scripts/prepush-check.sh`, `.gitignore` |
| Deploy | `vercel.json` |
| Custom tooling | `scripts/*.sh` |

## Quick reference: version pinning

All tool versions are pinned in `package.json` (via `pnpm-lock.yaml` integrity). When upgrading:

1. Read CHANGELOG of the new version
2. Update package.json + `pnpm install` to refresh lockfile
3. Run `pnpm verify` locally before opening PR
4. CI catches breakage if local verify missed something
5. Update this doc's row with new version + add a tooling changelog entry

For major upgrades (ESLint v10, Angular 21, etc.), check the `Since` column to find which version introduced the tool — that's the "blast radius" baseline.
