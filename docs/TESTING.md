# TESTING

Cómo correr, escribir y debuggear tests en este proyecto.

---

## TL;DR

```bash
pnpm test              # vitest unit tests (39 tests, ~5s)
pnpm test:watch        # vitest en watch mode
pnpm e2e               # playwright e2e tests (12/13 passing, ~17s)
pnpm e2e:headed        # playwright con browser visible
pnpm e2e:ui            # playwright UI mode (debug interactivo)
```

---

## Stack

| Capa | Herramienta | Para qué |
|---|---|---|
| Unit | **vitest 4** + `@analogjs/vitest-angular` + jsdom | Servicios y componentes en aislamiento |
| HTTP mock | `provideHttpClientTesting` + `HttpTestingController` | Mockear HttpClient para tests unit |
| E2E | **Playwright 1.63** + chromium | Flujos completos en navegador real contra backend InsForge |

Por qué dos niveles: unit tests son rápidos (ms) y específicos, e2e tests son lentos (s) pero prueban la integración real (Angular + HttpClient + signals + InsForge + RLS).

---

## Estructura

```
src/
  test-setup.ts                # bootstrap vitest: jsdom, localStorage mock, beforeEach
  test-helpers/
    insforge-admin.ts          # cleanupTasks, createTestUser, signIn para setUp/tearDown
  app/
    auth/auth.service.spec.ts  # 16 unit tests
    auth/login/login.spec.ts   # (futuro)
    tasks.spec.ts              # 10 unit tests (incluye regresiones bugs #1, #2)
    core/errors.spec.ts        # 11 unit tests
e2e/
  fixtures.ts                  # helpers compartidos (signIn, createTaskViaUI, etc.)
  auth.spec.ts                 # 5 flujos
  tasks.spec.ts                # 6 flujos (RLS isolation, delete confirm)
  auth-switch.spec.ts          # 1 flujo (bug #3 regression)
  auth-boot-validation.spec.ts # 1 flujo (token muerto)
```

---

## Cómo correr los tests

### Unit (vitest)

```bash
# Una sola vez
pnpm test

# Watch mode (re-corre al guardar)
pnpm test:watch

# Filtrar por nombre
pnpm exec ng test --watch=false -- -t "signIn"
```

### E2E (playwright)

```bash
# Una sola vez (corre todos los tests en headless)
pnpm e2e

# Con navegador visible (debugging)
pnpm e2e:headed

# UI mode (step-through interactivo)
pnpm e2e:ui

# Solo un archivo
pnpm exec playwright test e2e/auth.spec.ts

# Solo un test por nombre
pnpm exec playwright test --grep "AUTH-E2E-4"
```

El primer `pnpm e2e` puede tardar más porque Playwright arranca el dev server si no está corriendo (configurado vía `webServer`).

---

## Cómo añadir un nuevo test

### Unit test (vitest)

1. Crear archivo `<nombre>.spec.ts` junto al código que prueba
2. Importar el módulo bajo test
3. `TestBed.configureTestingModule({ providers: [...] })`
4. Para tests que usan HttpClient: añadir `provideHttpClientTesting()`
5. Escribir tests con `describe`/`it`/`expect`

Ejemplo:

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MyService } from './my.service';

describe('MyService', () => {
  let service: MyService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), MyService],
    });
    service = TestBed.inject(MyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('does the thing', () => {
    service.doThing();
    const req = httpMock.expectOne('/api/endpoint');
    expect(req.request.method).toBe('POST');
    req.flush({ ok: true });
  });
});
```

### Gotcha: servicios `providedIn: 'root'`

Servicios como `AuthService` son singletons. `TestBed` puede cachear la instancia entre tests. Para resetear:

```ts
beforeEach(() => {
  TestBed.resetTestingModule();
  // ... configure again
  service = TestBed.inject(MyService);
  service.signOut(); // reset internal state
});
```

### E2E test (playwright)

1. Crear archivo en `e2e/`
2. Importar `test, expect` de `@playwright/test` y helpers de `./fixtures`
3. `test.describe(...)` agrupa tests relacionados
4. `test.beforeAll` para crear test users / limpiar BD una vez
5. `test.afterAll` para cleanup (borrar users, limpiar tasks)
6. `test.beforeEach` para `await page.goto('/')`

Ejemplo:

```ts
import { test, expect } from '@playwright/test';
import { signIn, createTestUser, deleteUser, cleanupTasks, createTaskViaUI } from './fixtures';

test.describe('my feature', () => {
  const email = `feature-${Date.now()}@example.com`;
  const password = 'TestPassword123';
  let userId: string;

  test.beforeAll(async ({ request }) => {
    await cleanupTasks(request);
    const user = await createTestUser(request, email, password);
    userId = user.id;
  });

  test.afterAll(async ({ request }) => {
    await deleteUser(request, userId);
    await cleanupTasks(request);
  });

  test('my flow', async ({ page }) => {
    await signIn(page, email, password);
    await createTaskViaUI(page, 'Test task');
    await expect(page.getByText('Test task')).toBeVisible();
  });
});
```

---

## Selectores de UI (cómo encontrar elementos)

| Test usa | Elemento HTML tiene | Notas |
|---|---|---|
| `page.locator('input[name="email"]')` | `<input name="email">` | Más estable que labels |
| `page.getByRole('button', { name: 'Entrar' })` | `<button>Entrar</button>` | Best practice accesibilidad |
| `page.getByRole('heading', { name: /tareas pendientes/ })` | `<h1>` o `<h2>` con texto | Regex útil para textos dinámicos |
| `page.getByText('exact match')` | cualquier elemento con texto exacto | Último recurso |
| ❌ `page.getByLabel('Contraseña')` | multiple matches con toggle | Ver "Gotchas" |

### Gotcha: `getByLabel` con password toggle

Si el input de contraseña tiene un botón toggle al lado con `aria-label="Mostrar contraseña"`, **`getByLabel('Contraseña')` matchea ambos** (strict mode violation). Usar `page.locator('input[name="password"]')` en su lugar.

---

## Estrategia de mocks

### Unit: `HttpTestingController`

- `provideHttpClientTesting()` reemplaza el HttpHandler con uno fake
- `httpMock.expectOne(url)` retorna el request que matchea
- `req.flush(body)` simula la respuesta del servidor
- Verificar headers, body, method en el request ANTES de flushear
- `afterEach(() => httpMock.verify())` asegura que todos los requests esperados fueron flusheados

### E2E: backend real con cleanup

Los tests E2E pegan contra el backend real de InsForge. Estrategia:

- Cada `describe` crea sus propios usuarios con email único (timestamp)
- `beforeAll` limpia tasks + crea users
- `afterAll` borra users + limpia tasks
- ⚠️ **No hay cleanup cross-file**: si dos archivos crean usuarios con el mismo email, pueden colisionar. Usar siempre emails únicos.

### Gotcha: `httpResource` es lazy

`httpResource()` no hace fetch hasta que alguien lee `tasks.value()`. Para testear con HttpTestingController, hay que **forzar la lectura primero**:

```ts
// Mal — el httpResource no ha fetcheado aún
expect(service.isLoading()).toBe(true);

// Bien — fuerza el fetch
const value = service.value();
// ahora httpMock.expectOne() funciona
```

En la práctica, si los tests pasan aislados pero fallan en suite, suele ser httpResource lazy vs eager.

---

## Gotchas comunes

### Test pollution entre archivos

Los tests E2E comparten el mismo backend. Si un test crea tasks para un usuario y otro test reusa ese email, hay conflicto. **Mitigación actual**: cleanupTasks solo en beforeAll/afterAll del propio describe. **Pendiente**: cleanup cross-file global.

### Test pollution dentro del mismo archivo

Tests en el mismo describe comparten usuario (definido en beforeAll). Las tasks se acumulan. **Mitigación**: para tests sensibles al orden, usar `cleanupTasks` en `beforeEach`.

### Test isolation strategy (v1.6.0)

Tres mecanismos combinados para hacer la suite deterministic:

#### 1. UUIDs para emails únicos (`uniqueEmail()` helper en `fixtures.ts`)

```ts
import { uniqueEmail } from './fixtures';
const userEmail = uniqueEmail('switch-a'); // → switch-a-{uuid}@example.com
```

Reemplaza el antiguo `Date.now()`. UUIDs son criptográficamente únicos — sin colisión cross-file, cross-run, o con paralelismo.

#### 2. Workers seriales (`playwright.config.ts`)

```ts
fullyParallel: false,
workers: 1,
```

Sin paralelismo, no hay race conditions en el backend compartido de InsForge. Costo: ~3 min serial vs ~1 min paralelo. Aceptable para 16 tests.

#### 3. Cleanup entre tests (`beforeEach: cleanupTasks` en `tasks.spec.ts`)

Sin esto, TASK-E2E-4 fallaba porque `.first()` borraba el primer task de la lista, no el específico "to delete". Ahora cada test arranca con DB limpia para el usuario.

#### 4. Locators específicos en vez de `.first()`

Tests que interactúan con un task específico usan `page.locator('li:has-text("...")')` en vez de `.first()`. Robusto contra cualquier número de tasks en la lista.

### Resultado

| | Antes (v1.4.0) | Después (v1.6.0) |
|---|---|---|
| Tests pasando en suite | 14/16 | 16/16 |
| Tests flaky | 2 (auth-switch, TASK-E2E-4) | 0 |
| Tiempo total | ~30s | ~35s (serial + cleanup per-test) |
| Determinístico en reruns | ❌ | ✅ |

Ambos runs idénticos (16/16 en 34s), confirmado deterministic.

### HttpTestingController + httpResource

`httpResource` usa HttpClient internamente. HttpTestingController intercepta. Pero el ciclo de vida es perezoso — primer `value()` access dispara el fetch.

### Tiempo de los tests

- Unit: ms por test, suite completa < 10s
- E2E: ~1-2s por test, suite completa ~20s con dev server compartido
- `httpResource.reload()` es asíncrono — usa `await` antes de asserts

### Strict mode en Playwright

Por defecto, los queries de Playwright son strict (1 elemento). Si un selector matchea varios, falla con "strict mode violation". Soluciones:

- Usar selector más específico (e.g. `input[name=email]` en lugar de `getByLabel('Email')`)
- Usar `.first()`, `.nth(0)`, `.last()`
- Filtrar con regex más específico

---

## Bugs cazados por los tests actuales

| Bug | Test que lo caza |
|---|---|
| #1 DELETE silencioso | `tasks.spec.ts` "remove throws when 0 rows returned" |
| #2 INSERT 403 RLS | `tasks.spec.ts` "create throws on 403 RLS" |
| #3 Stale state al cambiar user | `e2e/auth-switch.spec.ts` (pasa aislado) |

Si encuentras un bug en producción, escribe primero el test que lo caza, luego el fix.

---

## Pre-push guard (catches `.gitignore` regressions)

`.husky/pre-push` runs `scripts/prepush-check.sh` antes de cada `git push`. El script verifica:

```bash
git add --dry-run . | wc -l
```

| Resultado | Acción |
|---|---|
| `> 50` | **Push bloqueado**. Imprime los primeros 20 paths que se stagearían. Probable `.gitignore` roto |
| `5-50` | Warning con lista. Tú decides si continuar |
| `≤ 5` | Silent OK (estado normal con cambios tracked pequeños) |

**Por qué importa**: VS Code muestra "10K cambios" cuando `node_modules/` tiene 77K archivos. `git status` solo muestra ~5 directorios. **Ninguno de los dos te dice si `.gitignore` funciona**. La única verificación fiable es `git add --dry-run .`.

Este hook existe porque un bug previo sobrescribió `.gitignore` a 13 líneas (perdió las reglas default de Angular CLI), lo que habría stageado 11,047 paths incluyendo `node_modules`. Sin este hook, ese bug habría llegado al `git push origin main` del repo público.

### Override para pushes grandes intencionales

```bash
PREPUSH_THRESHOLD=200 git push   # permite hasta 200 paths
pnpm prepush                    # correr manualmente sin hacer push
```

### Por qué el umbral es 50

| Estado | Paths esperados |
|---|---|
| `.gitignore` funcionando bien | 0-5 (solo cambios tracked) |
| `.gitignore` roto | Miles |
| Batch commit legítimo (feature nuevo con muchos archivos) | 10-40 |
| `.gitignore` + batch legítimo | 10-40 |

50 deja espacio para batch commits legítimos sin generar falsos positivos.

---

## CI (GitHub Actions)

`.github/workflows/verify.yml` corre en push a main y en PRs.

### Qué corre

| Step | Comando | Tiempo aprox | Cacheable |
|---|---|---|---|
| Install deps | `pnpm install --frozen-lockfile` | 30-60s | Sí (npm store) |
| Install Playwright | `playwright install --with-deps chromium` | 60-90s primera vez, 0s cache hit | Sí (browser cache) |
| Lint | `pnpm lint` | 20s | No |
| Unit + coverage | `pnpm test:coverage` | 30-60s | No |
| Build | `pnpm build` | 30s | No |
| E2E | `pnpm e2e` | 2-4 min | No |

Total: ~5-7 min primera vez, ~3-4 min con caches.

### CI-aware config

`playwright.config.ts` ya adapta comportamiento a `CI=true`:

```ts
retries: process.env['CI'] ? 2 : 0,
workers: process.env['CI'] ? 1 : undefined,
reporter: process.env['CI'] ? [['html'], ['list']] : 'list',
webServer: { reuseExistingServer: !process.env['CI'] }
```

Esto significa que en CI: 1 worker secuencial, 2 retries por test, HTML report, y siempre arranca webServer fresco.

### Secrets

**No se requieren secrets en CI.** El `anonKey` de InsForge es público (mismo modelo que Supabase — `publishable`, no `secret`), está en `src/environments/environment.ts` y se pushea al repo. La seguridad real está en las RLS policies del backend.

Si en el futuro quieres aislar e2e del proyecto de dev:
1. Crear proyecto InsForge separado para CI
2. Apuntar `environment.ts` a una URL distinta en builds CI (override con file replacement)
3. Agregar secret `INFORGE_BASE_URL` en GitHub repo settings

Por ahora, CI usa el mismo proyecto InsForge que dev. Riesgo aceptable porque:
- anonKey es público
- RLS policies limitan acceso por usuario
- Tests crean/limpian sus propios datos

### Artifacts subidos

| Artifact | Cuando | Retention |
|---|---|---|
| `coverage-report` (HTML) | Siempre | 14 días |
| `playwright-report` | Solo en failure | 7 días |

Se descargan desde el summary del run en la tab "Actions".

### Concurrency

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}-${{ github.actor }}
  cancel-in-progress: true
```

Si haces push nuevo a la misma branch mientras un CI está corriendo, el viejo se cancela. Ahorra GitHub Actions minutes.

**Importante**: el grupo incluye `${{ github.actor }}`. Esto evita que pushes de **diferentes actores** se cancelen entre sí.

| Escenario | Comportamiento | Por qué |
|---|---|---|
| Dev push rápido (3 commits en 10s) | El segundo cancela al primero | Mismo actor + mismo ref → mismo grupo |
| Dev push, luego Dependabot auto-mergea 3 PRs | **Ambos corren en paralelo, ninguno cancela al otro** | Distinto actor → distinto grupo |
| Dependabot mergea 3 PRs en rápida sucesión | El segundo cancela al primero | Mismo actor (`dependabot[bot]`) → mismo grupo |

**Por qué importa**: sin el `${{ github.actor }}`, el grupo era solo `verify-main`. Cuando Dependabot mergeaba PRs a main, cada merge disparaba verify-main, cancelando cualquier verify-main del developer en progreso. Esto causaba checks "cancelled" en commits del developer (visible como "1/2 checks passed") aunque el estado final estuviera validado.

Con `${{ github.actor }}`, los grupos son:
- `verify-main-acst352` (developer)
- `verify-main-dependabot[bot]`

Son grupos distintos, runs independientes. Solo se cancelan runs del mismo actor.

### Estado

✅ Implementado y pusheado.

---

## Convenciones de commits (commitlint)

`.husky/commit-msg` corre commitlint sobre cada commit antes de aceptarlo.

### Reglas activas

Config en `commitlint.config.js`, extiende `@commitlint/config-conventional`. Reglas custom:

| Rule | Valor | Por qué |
|---|---|---|
| `subject-case` | `[0]` (off) | Nombres propios rompen lower/sentence case (ESLint, GitHub, InsForge) |
| `header-max-length` | 120 | Commits con scope + descripción detallada (no entran en 100) |
| `body-max-line-length` | 200 | Permite listas largas en el body |

Reglas activas del config-conventional default:
- `type-enum`: feat, fix, docs, style, refactor, test, chore, build, ci, perf, revert
- `type-empty`, `subject-empty`: catches missing parts
- `header-trim`: no whitespace at start/end
- `scope-case`: scope must be lower-case

### Formato

```
<type>(<scope>): <subject>

<body>

<footer>
```

| Type | Cuándo |
|---|---|
| `feat` | Nueva feature para el usuario |
| `fix` | Bug fix |
| `docs` | Solo documentación |
| `style` | Formatting, no code change |
| `refactor` | Code change que no es feat ni fix |
| `test` | Solo tests |
| `chore` | Tooling, deps, configuración |
| `build` | Build system |
| `ci` | CI configuration |
| `perf` | Performance improvement |
| `revert` | Revert de commit previo |

**Breaking change**: añadir `!` después de type/scope (`feat!:`) o footer `BREAKING CHANGE: description`.

### Ejemplos buenos

```
feat(tasks): add due date filter to task list
fix(auth): prevent stale httpResource on user switch
docs(testing): document pre-push guard
chore: bump @angular/core to 21.2
ci(workflow): add coverage artifact upload
```

### Ejemplos malos (serán rechazados)

```
added stuff             # sin type
wip: foo               # type inválido
feat:                  # subject vacío
feat: this is a really long subject that exceeds one hundred and twenty characters...
```

### Bypass (emergencias)

```bash
git commit --no-verify -m "..."
```

Solo usar en emergencias (e.g. el hook está roto). NO usar para saltarse las reglas.

### Validar commits existentes

```bash
pnpm lint:commits:all          # últimos 50 commits
pnpm exec commitlint --from=v1.0.0 --to=HEAD   # rango custom

---

## Bundle analyzer y size budget

### Size budget (enforcement automático en CI)

`angular.json` tiene budgets que `pnpm build` (corriendo en CI) verifica:

```json
"budgets": [
  {
    "type": "initial",
    "maximumWarning": "350kB",
    "maximumError": "500kB"
  },
  {
    "type": "anyComponentStyle",
    "maximumWarning": "4kB",
    "maximumError": "8kB"
  }
]
```

| Tipo | Warn | Error |
|---|---|---|
| Initial bundle | 350 KB | 500 KB |
| Cualquier component style | 4 KB | 8 KB |

Si el bundle excede el warning, el build muestra warning. Si excede el error, **falla**. Como CI corre `pnpm build`, las regresiones de tamaño se cazan automáticamente.

**Estado actual (v1.4.0)**: 299 KB initial / 48 bytes styles. 51 KB de buffer al warning.

### Bundle analyzer (visual, local)

`source-map-explorer` (v2.5.3) genera un treemap interactivo del bundle.

```bash
pnpm build:analyze
# → genera dist/bundle-report.html
# → abrir en browser para ver breakdown por paquete
```

Output incluye:
- Treemap con tamaño proporcional de cada módulo
- Tabla con `% size` y `gzip size` por archivo
- `--no-border-checks` desactiva validación estricta de source maps
- `--gzip` muestra tamaño transferido (compressed)

### Producción con source maps

`source-map-explorer` necesita source maps en producción. El config de Angular los activa:

```json
"production": {
  "sourceMap": true,
  ...
}
```

Esto añade ~0.5 KB al bundle final. Tradeoff aceptable para OSS project (en producción cerrada, source maps exponen código fuente — desactivarlos).

### Cuando preocuparse

| Bundle size | Acción |
|---|---|
| `< 350 KB` | Normal |
| `350-500 KB` | Investigar qué agregó peso, refactor posible |
| `> 500 KB` | CI falla — fix obligatorio antes de merge |
| Incremento `> 10%` entre releases | Investigar dependency bloat |

### Identificar qué infla el bundle

```bash
pnpm build:analyze
# abrir dist/bundle-report.html en browser
# buscar módulos grandes (ng/* packages, dependencies de terceros)
```

---

## Dependabot (auto-update dependencies + security patches)

`.github/dependabot.yml` configura GitHub Dependabot para mantener las dependencias actualizadas.

### Qué trackea

| Ecosystem | Schedule | PRs simultáneos |
|---|---|---|
| `npm` (package.json) | Semanal, lunes 04:00 UTC | 5 |
| `github-actions` (workflows) | Semanal, lunes 04:00 UTC | 3 |

### Auto-merge

`.github/workflows/dependabot-auto-merge.yml` auto-mergea:

| Update type | Acción | Por qué |
|---|---|---|
| `semver-patch` (x.y.Z) | Auto-merge si CI pasa | Bug fixes, no breaking |
| `semver-minor` (x.Y.z) | Auto-merge si CI pasa | New features backwards-compat |
| `semver-major` (X.y.z) | **Manual review** | Puede romper API |

Usa `peter-evans/enable-pull-request-automerge@v3` para activar auto-merge vía GitHub API.

### Commit message convention

Dependabot PRs usan `chore(deps)` / `chore(dev-deps)` / `ci` prefixes:

```
chore(deps): bump @angular/core from 21.2.0 to 21.2.1
chore(dev-deps): bump @angular/build from 21.2.0 to 21.2.1
ci: bump actions/checkout from 4 to 5
```

Compatible con commitlint (type-enum, scope-case lower).

### Ignora major updates de Angular

```yaml
ignore:
  - dependency-name: "@angular/*"
    update-types: ["version-update:semver-major"]
```

Angular majors requieren migración manual (refactor de imports, breaking changes en tests, etc.). El equipo los maneja con planning, no auto.

### Agrupación

Patch y minor updates se agrupan en un solo PR. Major updates quedan individuales. Esto reduce el "PR noise" sin sacrificar visibilidad de cambios grandes.

### Cómo aplicar manualmente

```bash
# Actualizar una dep específica
pnpm update @angular/core

# Actualizar todo dentro del rango semver
pnpm update

# Forzar major update (revisa breaking changes primero)
pnpm update @angular/core@22
```

### Cómo desactivar

Si Dependabot se vuelve molesto (e.g. demasiados PRs en ecosystem pequeño):

```yaml
# .github/dependabot.yml
updates:
  - package-ecosystem: "npm"
    open-pull-requests-limit: 0  # efectivamente desactiva
```

O eliminar `.github/dependabot.yml` completo.

### Vulnerabilidades (security advisories)

Dependabot crea PRs automáticamente cuando detecta vulnerabilidades (severity low/medium/high/critical). Estos se mergean con prioridad.

Estado actual: 1 vulnerabilidad low conocida (`esbuild` path traversal en Windows, transitive dep — se arreglará automáticamente cuando el upstream publique fix en lockfile).
```

---

## Referencias

- [vitest docs](https://vitest.dev/)
- [Playwright docs](https://playwright.dev/)
- [Angular testing guide](https://angular.dev/guide/testing)
- [`docs/SPEC.auth.md`](./SPEC.auth.md), [`docs/SPEC.tasks.md`](./SPEC.tasks.md), [`docs/SPEC.login-quality.md`](./SPEC.login-quality.md) — los contratos que los tests verifican
