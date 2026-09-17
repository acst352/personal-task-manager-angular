# Product Requirements Document — Angular CRUD (Task Manager)

**Estado**: v0.2.0 — funcionalidades core operativas, refinamiento pendiente
**Última actualización**: 2026-09-17
**Owner**: Icy-alex
**Próxima revisión**: al cerrar v1.0.0

---

## 1. Problema

Como desarrollador junior, necesito un proyecto CRUD real para practicar el stack Angular moderno de punta a punta (signals, zoneless, httpResource, formularios, auth, interceptor, tests) sin la complejidad de UI avanzado ni features de negocio que distraigan del aprendizaje técnico. El proyecto debe ser deployable, tener auth real, persistencia en la nube, y servir como referencia futura.

## 2. Usuarios objetivo

| Tipo | Descripción | Necesidad principal |
|---|---|---|
| **Primario** | Yo mismo (dev junior aprendiendo Angular) | Tener un proyecto donde aplicar y consolidar lo aprendido |
| **Secundario** | Otros devs juniors que necesiten un proyecto Angular de referencia | Ver patrones idiomáticos (signals, httpResource, zoneless) en código real |

## 3. Features in scope (v1.0.0)

- **Gestión de tareas**: crear, listar, editar, marcar done, eliminar con confirmación
- **Persistencia en la nube**: backend Postgres vía InsForge + PostgREST
- **Auth email/password**: signup con verificación, login, sesión persistente, logout
- **Aislamiento por usuario**: cada usuario solo ve/edita sus tareas (RLS server-side)
- **Estados de carga y error**: signals `isLoading` y `error` mostrados en UI
- **Validación inline** en formularios (email formato, password min 6)
- **Tests de integración** con vitest (servicios + componentes en aislamiento)
- **Tests E2E** con Playwright (flujos completos en navegador real)

## 4. Out of scope (v1.0.0)

OAuth social · 2FA · colaboración multi-usuario en tiempo real · mobile nativo · PWA offline · i18n · temas (claro/oscuro) · notificaciones push · adjuntos a tareas · búsqueda full-text · categorías/tags · recordatorios · export/import.

## 5. Criterios de éxito (v1.0.0 done)

- [ ] Un usuario nuevo puede registrarse, recibir código, verificar email, hacer login
- [ ] Un usuario autenticado puede CRUD completo de sus tareas
- [ ] Dos usuarios distintos NO ven las tareas del otro (RLS validado con E2E)
- [ ] Sesión persiste entre reloads del navegador
- [ ] Eliminar con confirmación; no se elimina silenciosamente si falla
- [ ] Errores HTTP se mapean a mensajes específicos (no "error desconocido")
- [ ] ≥ 80% de los flujos críticos cubiertos por tests (integración + E2E)
- [ ] `ng build` sin warnings · `pnpm test` verde · `pnpm e2e` verde
- [ ] Tiempo a interactivo < 2s en localhost

## 6. Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | Angular 21 (zoneless, signals, standalone components, `@if`/`@for`) |
| Lenguaje | TypeScript estricto |
| HTTP | `HttpClient` + `httpResource()` |
| Forms | `FormsModule` con `[(ngModel)]` ligado a signals |
| Backend | InsForge (Postgres + PostgREST + Auth JWT) |
| Gestor | pnpm |
| Tests integración | vitest + jsdom + `provideHttpClientTesting` |
| Tests E2E | Playwright (Chromium) |
| Linter / formato | Prettier (configurado), ESLint (a evaluar) |
| Control de versiones | Git + semver estricto + tags por versión |
| Project mgmt | Linear (este board) + GitHub |

## 7. Constraints

- **Tiempo de desarrollo**: sprints cortos (1 día cada feature mayor). Aprendizaje > velocidad.
- **Sin budget**: backend gratis (InsForge free tier), sin CDN pago, sin monitoring pago.
- **Email verification**: puede desactivarse en dev si el delivery falla; re-activar antes de v1.0.0.
- **TypeScript strict**: activado por defecto en Angular CLI. No relajar.
- **Sin SSR**: SPA pura (CSR). Decisión consciente para simplicidad.
- **Sin Tailwind v4**: usar CSS plano para evitar lock-in de versión (Pin a Tailwind 3.4 si se introduce).

## 8. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| RLS policies de InsForge no documentadas | Alta | Bloqueante | Fase A investiga primero, documenta en `INVESTIGATION.md` |
| Email verification delivery falla | Media | Bloqueante | Toggle en dashboard de InsForge para desactivar; documentado |
| MCP tools de InsForge/Linear no disponibles | Media | Molesto | Fallback a REST API + `curl` + scripts Node |
| Bundle > 2MB por incluir SDK completo | Baja | Performance | Tree-shaking + importar solo lo necesario |
| v1.0.0 se infla sin disciplina de scope | Alta | Cronograma | Este PRD + revisión periódica de out-of-scope |

## 9. Roadmap de versiones

| Versión | Hito | Estado |
|---|---|---|
| v0.1.0 | Scaffold Angular + pnpm + InsForge backend conectado | ✅ taggeado |
| v0.2.0 | CRUD + Auth básico funcionando (Phase 0–4 cerrado) | ✅ taggeado |
| v0.3.0 | RLS documentada + bugs DELETE/INSERT corregidos | Backlog |
| v0.4.0 | Specs (auth, tasks, login-quality) escritas | Backlog |
| v0.5.0 | Test infra lista (vitest + Playwright + helpers) | Backlog |
| v0.6.0 | Tests rojos escritos + fixes implementados | Backlog |
| v1.0.0 | Refactor + docs completas = production-ready | Target |

## 10. Próximos pasos

Issues creados en este board (PHASE-A a PHASE-F + sub-issues). Arrancar por PHASE-A (investigación RLS) hoy. Mañana retomar B → F.
