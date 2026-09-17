# Versionado semántico

Este proyecto sigue [Semantic Versioning 2.0.0](https://semver.org/) con una etapa pre-1.0 más relajada.

## Esquema

`MAJOR.MINOR.PATCH` → ej. `v1.4.2`

| Componente | Cuándo bumpear |
|---|---|
| **MAJOR** (X.0.0) | Cambio incompatible de API o arquitectura. Rompe contratos existentes (ej: cambiar de InsForge a Supabase, renombrar interface `Task`, cambiar schema de columnas) |
| **MINOR** (0.X.0) | Nueva funcionalidad visible sin romper compat (ej: añadir búsqueda, exportar CSV, soporte offline) |
| **PATCH** (0.0.X) | Bugfix, refactor, docs, tests, mejoras internas sin nueva feature |

## Reglas pre-1.0 (mientras sigamos en 0.X.Y)

- **MINOR = feature visible**: cualquier cosa que el usuario final notaría (nueva pantalla, nuevo campo, nueva integración).
- **PATCH = todo lo demás**: refactors, fixes, docs, tests, dependencias, configs.
- Se permite romper compat dentro del rango 0.X sin bump a MAJOR (pre-1.0).
- Al llegar a **v1.0.0** se endurece: cualquier breaking change requiere MAJOR.

## Proceso para taggear

1. Todos los cambios del release están commiteados en `main`.
2. Actualizar `CHANGELOG.md` con la sección de la nueva versión arriba del todo.
3. Commit el CHANGELOG con mensaje `docs(changelog): vX.Y.Z`.
4. `git tag -a vX.Y.Z -m "Release vX.Y.Z: <resumen>"` apuntando al commit.
5. `git push origin main --tags` (cuando haya remoto).
6. En Linear: issues correspondientes → Done, crear milestone de la versión.

## Convención de commits

Conventional Commits + scope opcional:

```
<type>(<scope>): <descripción corta en imperativo>

<descripción larga opcional>
```

Types válidos: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `style`, `build`, `ci`.

Scopes usados en este repo: `phase-N`, `pm`, `auth`, `mcp`, `release`.

## Roadmap de versiones objetivo

| Versión | Hito | Estado |
|---|---|---|
| v0.1.0 | Scaffold Angular 21 con pnpm | ✅ |
| v0.2.0 | CRUD + Auth básico funcionando | ✅ |
| v0.3.0 | PM setup + RLS documentada (Phase A) | ⏳ en curso |
| v0.4.0 | Specs (auth, tasks, login-quality) escritas | Backlog |
| v0.5.0 | Test infra lista (vitest + Playwright) | Backlog |
| v0.6.0 | Tests rojos pasan + fixes implementados | Backlog |
| v1.0.0 | Refactor + docs finales = production-ready | Target |

## Versionado del SDK y dependencias

- `package.json` fija versiones exactas de Angular (`"^21.2.0"`).
- `@insforge/sdk`: seguir `@latest` hasta estabilizar; fijar cuando llegue v1.
- Tests (vitest, Playwright): también `@latest` hasta lockfile estable.
- Bun deprecation warnings se ignoran salvo cambio breaking.
