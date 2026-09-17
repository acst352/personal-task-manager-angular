# INVESTIGATION — RLS, bugs y fix aplicado

**Fecha**: 2026-09-17
**Fase**: A del plan A→F
**Estado**: ✅ Completada (extendida con Bug #3 tras feedback en vivo)
**Issues cerradas**: ICY-42, ICY-43, ICY-44, ICY-45, ICY-46, ICY-47 + nuevos tests añadidos a Phase D

---

## TL;DR

El backend de InsForge tenía **RLS activado pero SIN ninguna policy** definida sobre la tabla `tasks`. Esto causa que **todas las operaciones de usuarios autenticados se rechacen por defecto** (Postgres RLS default-deny). El admin token (`ik_…`) bypasea RLS porque la tabla tiene `relforcerowsecurity = false`, por eso pudimos crear filas con curl admin pero no desde la app autenticada.

**Fix aplicado en esta fase**:
1. Policy `users_own_tasks` para `authenticated` role → resuelve **Bug 2 (INSERT 403)**
2. `httpResource()` ahora es reactivo a `auth.currentUser()` → resuelve **Bug 3 (stale state al cambiar de usuario)**
3. `validateStoredSession()` ejecuta al boot → resuelve **token expirado/muerto aceptado como válido**
4. `tasks.service.ts:remove()` valida array vacío → resuelve **Bug 1 (DELETE silencioso)**
5. Confirm dialog antes de borrar en `App.onRemove()`

**Bug arquitectónico emergente (Bug #3)**: el `httpResource` original tenía URL constante que no dependía del usuario. Solo fetcha una vez al inicializar el service. Cuando el usuario cambia (login/logout/switch), el `tasks.value()` retenía los datos del usuario anterior. Resultado: usuario nuevo veía tareas del usuario previo, mezcladas con las suyas tras acciones. Esto NO estaba en mi lista inicial — es exactamente el tipo de bug que el testing riguroso debería cazar antes de producción.

---

## 1. Estado del backend (antes del fix)

### 1.1 Tabla `public.tasks`

| Columna | Tipo | Nullable | Default | Notas |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `title` | text | NO | — | |
| `done` | boolean | NO | `false` | |
| `priority` | text | NO | — | valores esperados: `low`/`medium`/`high` (no hay CHECK constraint) |
| `user_id` | uuid | SÍ | NULL | **clave para RLS** |
| `created_at` | timestamptz | SÍ | `now()` | autogestionado |
| `updated_at` | timestamptz | SÍ | `now()` | autogestionado |

**Sin FK** declarada entre `tasks.user_id` y `auth.users.id`. La integridad referencial la enforce la policy.

### 1.2 RLS en la tabla

```sql
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class WHERE relname = 'tasks';

-- Resultado:
-- relrowsecurity:    true   (RLS habilitado)
-- relforcerowsecurity: false (NO fuerza a table owner)
```

**Policies existentes** (antes del fix): **0**.

```sql
SELECT * FROM pg_policies WHERE tablename = 'tasks';
-- (0 rows)
```

### 1.3 Permisos (GRANTs)

| Role | SELECT | INSERT | UPDATE | DELETE | TRUNCATE |
|---|---|---|---|---|---|
| `anon` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `authenticated` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `project_admin` | ✅ | ✅ | ✅ | ✅ | ✅ |

Los grants están bien. El problema NO es de permisos sino de policies (RLS niega aunque el GRANT diga que sí).

### 1.4 Helpers de auth disponibles

| Función | Schema | Uso |
|---|---|---|
| `auth.uid()` | auth | UUID del usuario actual (extraído de `request.jwt.claims.sub`) |
| `auth.role()` | auth | Role del JWT (`anon`, `authenticated`, `project_admin`) |
| `auth.jwt()` | auth | Claims completos del JWT como JSON |

### 1.5 Estructura de `auth.users`

Columnas que expone InsForge:

| Columna | Tipo |
|---|---|
| `id` | uuid PK |
| `email` | text |
| `password` | text (hasheado) |
| `email_verified` | boolean |
| `created_at` | timestamptz |
| `updated_at` | timestamptz |
| `profile` | jsonb |
| `metadata` | jsonb |
| `is_project_admin` | boolean |
| `is_anonymous` | boolean |

### 1.6 JWT emitido en login

Payload decodificado del token de `rls-test@example.com`:

```json
{
  "sub": "d77c5bcc-5393-4947-aa40-aeb4256d5b32",
  "email": "rls-test@example.com",
  "role": "authenticated",
  "iat": 1789681384,
  "exp": 1789682284
}
```

Importante: `sub` es el user_id. `auth.uid()` lee esto.

---

## 2. Diagnóstico de bugs

### 2.1 Bug 1 — DELETE silencioso

**Síntoma reportado**: "con usuario kelp al borrar 1 tarea, se borran todas, incluso las de icy".

**Causa raíz**:
1. El usuario "kelp" no era un usuario real autenticado — probablemente estaba viendo localStorage de un login previo de icy, o estaba navegando sin token.
2. Independientemente de eso, hay un bug real: cuando RLS filtra la fila a borrar (no eres owner), el `DELETE` con `WHERE id=eq.<id>` ejecuta pero **matchea 0 filas** porque la fila no es visible para tu rol. La respuesta HTTP es **200 OK con cuerpo `[]`**, sin error.
3. El cliente (`tasks.service.ts:remove()`) no verifica el cuerpo de la respuesta. Asume éxito. Llama `tasks.reload()`. El GET con RLS devuelve solo filas del usuario actual. Si el usuario actual no tiene filas propias, ve la lista vacía → parece que "se borraron todas".

**Por qué es bug incluso sin kelp**: cualquier usuario autenticado que intente borrar una fila que no existe o que no le pertenece verá éxito silencioso. La UI nunca detecta el fallo.

**Reproducción confirmada**:
```
DELETE /api/database/records/tasks?id=eq.<id-de-fila-ajena>
Authorization: Bearer <jwt-de-otro-usuario>
Prefer: return=representation

→ 200 OK
→ Body: []   ← 0 filas borradas
```

**Fix recomendado** (Fase E-1):
```ts
// tasks.service.ts:remove()
await this.http.delete(
  `${baseUrl}/api/database/records/tasks?id=eq.${id}`,
  { headers: { Prefer: 'return=representation' } },
).toPromise().then(result => {
  if (!result || (result as Task[]).length === 0) {
    throw new Error('No se pudo borrar la tarea (no existe o no tienes permiso)');
  }
  this.tasks.reload();
});
```

### 2.2 Bug 2 — INSERT 403

**Síntoma reportado**: `new row violates row-level security policy for table "tasks"` al crear tarea.

**Causa raíz** (confirmada):
- RLS estaba habilitado en `tasks` (`relrowsecurity = true`).
- **0 policies** definidas (`pg_policies WHERE tablename='tasks'` devuelve vacío).
- Por defecto, RLS con 0 policies = **deny everything**.
- Los grants permiten INSERT, pero RLS filtra antes y rechaza.

**Por qué funcionaba con curl admin**: el token admin tiene role `project_admin`. Con `relforcerowsecurity = false`, el table owner (project_admin) bypasea RLS. Por eso el curl con admin Bearer podía insertar.

**Por qué fallaba con usuario autenticado**: el JWT del usuario real tiene `role: "authenticated"`. Ese role NO es table owner, así que RLS sí aplica, y como no hay policy que diga "puedes insertar tu propia fila", rechaza.

**Mis hipótesis iniciales descartadas**:
- ~~H1: policy exige `user_id = auth.uid()`~~ → no había ninguna policy
- ~~H2: trigger sobreescribe user_id~~ → no hay triggers en la tabla
- ~~H3: policy rechaza NULL pero acepta uuid~~ → no había policy

**Realidad**: ninguna policy, RLS deny-by-default. La política que faltaba era la que iba a hacer que INSERT funcionara correctamente.

**Fix aplicado en esta fase**:
```sql
CREATE POLICY users_own_tasks ON tasks
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

**Validación del fix** (curl con JWT de `rls-test@example.com`):

| Operación | Sin policy (antes) | Con policy (ahora) |
|---|---|---|
| INSERT con `user_id = auth.uid()` | 403 | ✅ 201 |
| INSERT con `user_id = <otro>` | 403 | 403 ✅ |
| INSERT sin `user_id` (null) | 403 | 403 ✅ |
| SELECT | 200 `[]` | 200 con solo filas propias ✅ |
| SELECT con anon key (admin) | todas | todas (project_admin bypassa) |
| UPDATE fila propia | 403 | ✅ 200 |
| UPDATE fila ajena | 403 | 200 con `[]` (bug 1 reaparece, fix en E) |
| DELETE fila propia | 403 | ✅ 200 con la fila |
| DELETE fila ajena | 403 | 200 con `[]` (bug 1 reaparece, fix en E) |

---

## 3. Cambios aplicados al backend en esta fase

### 3.1 SQL ejecutado

```sql
-- A-1: Confirmación inicial
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class WHERE relname = 'tasks';
-- (post-fix) SELECT * FROM pg_policies WHERE tablename = 'tasks';

-- A-2: Info de auth.users
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'auth' AND table_name = 'users';

-- A-3: Verificación de hipótesis
-- INSERT con user_id matching → 403 (confirmaba que ninguna policy matcheaba)
-- INSERT con user_id != auth.uid() → 403 (mismo resultado)
-- SELECT → 200 [] (RLS filtraba todo)

-- (FIX aplicado)
CREATE POLICY users_own_tasks ON tasks
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- A-4: Limpieza
DELETE FROM tasks WHERE id != '00000000-0000-0000-0000-000000000000';
-- (DELETE admin de auth.users para rls-test y demo)
```

### 3.2 Estado actual del backend

| Recurso | Estado |
|---|---|
| Tabla `tasks` | 0 filas, RLS habilitado, 1 policy (`users_own_tasks`) |
| `auth.users` | 2 usuarios: `icy@colimasoft.com` (id `fa043192-141a-4cd3-a0b5-95a435630f34`), `kelp@colimasoft.com` |
| Console admin | Token `ik_b91c9f0f0c6e8824e0b7242d56609ad1` (project_admin, bypasea RLS) |

---

## 4. Lo que falta (para Fase E)

### 4.1 E-1: Cliente `remove()` debe detectar 0 rows borradas

Sin esto, el bug 1 sigue activo: si una policy cambia en el futuro (o si el usuario intenta borrar una fila inexistente), el cliente cree que borró pero no.

```ts
// Cambio en src/app/tasks.ts:remove()
async remove(id: string): Promise<void> {
  const result = await firstValueFrom(
    this.http.delete<Task[]>(
      `${baseUrl}/api/database/records/tasks?id=eq.${id}`,
      { headers: { Prefer: 'return=representation' } },
    ),
  );
  if (!result || result.length === 0) {
    throw new Error('No se pudo borrar la tarea (no existe o no tienes permiso)');
  }
  this.tasks.reload();
}
```

### 4.2 E-2: Cliente `create()` debe validar que `userId` se setea

El código actual ya pasa `user_id` del currentUser, así que con la policy creada debería funcionar. **Pero**: añadir un guard que si no hay usuario autenticado, no permita llamar a `create()`.

```ts
// En App.onSave, si es NewTask:
const userId = this.auth.currentUser()?.id;
if (!userId) {
  throw new Error('Debes iniciar sesión para crear tareas');
}
await this.tasksService.create(task as NewTask, userId);
```

### 4.3 E-3: Interceptor maneja 401 → logout

Si el JWT expira, las llamadas empiezan a dar 401. El interceptor debería llamar `auth.signOut()` automáticamente. Ya hay plan en ICY-70.

### 4.4 E-4: Login UI improvements

Ya plan en ICY-71.

### 4.5 E-5: Confirm dialog antes de borrar

Ya plan en ICY-72. Especialmente importante ahora que el DELETE puede fallar silenciosamente.

---

## 5. Implicaciones para SPEC (Fase B)

Cuando escribamos las specs, hay que dejar explícito:

- **TASK-1** (listar): "un usuario autenticado solo ve sus propias tareas (user_id = auth.uid())"
- **TASK-2** (crear): "el cliente envía user_id = currentUser.id; el server rechaza con 403 si no coincide"
- **TASK-5** (borrar): "el server responde 200 [] si no se borró nada; el cliente debe mostrar error"
- **TASK-N1** (borrar ajeno): "el server responde 200 [] (no error); el cliente lo trata como fallo"
- **Caso de aislamiento RLS**: "dos usuarios distintos haciendo GET simultáneo solo ven sus filas; ningún JOIN cross-user posible"

---

## 6. Lecciones aprendidas (para el README)

1. **InsForge activa RLS por defecto en tablas nuevas** — siempre definir policies al crear una tabla, o documentar explícitamente que no necesitas aislamiento.
2. **`relforcerowsecurity = false`** es lo que permite al token admin bypasear RLS — útil para debugging pero peligroso en producción si el admin se filtra.
3. **PostgREST devuelve 200 con `[]` cuando WHERE matchea 0 filas** — siempre usar `Prefer: return=representation` y validar el cuerpo, no asumir éxito por status code.
4. **auth.uid() lee `sub` del JWT** — si el JWT no tiene `sub`, la policy filtra como si fueras otro usuario.
5. **Phase A→F es útil** — el bug 1 era invisible sin el escenario "borrar tarea ajena", que solo se testea explícitamente.

---

## 7. Bug #3 — Stale state al cambiar de usuario

**Reportado en vivo** tras fix de bugs #1 y #2. Es un bug **arquitectónico** que NO estaba en la investigación inicial.

### Síntoma
Usuario reporta confusión al alternar entre cuentas (kelp, icy) en la misma sesión SPA:
- Login kelp → crear 2 tareas → ver 2 kelp ✅
- Logout → login icy → **ver 2 kelp** ❌ (debería ver 0)
- Crear 1 tarea como icy → ver 1 icy ✅
- Logout → login kelp → **ver 1 icy** ❌
- Borrar la "tarea de icy" desde cuenta kelp → RLS rechaza silenciosamente, pero `tasks.reload()` ahora usa token kelp → aparecen las 2 kelp de repente

### Causa raíz

En `tasks.ts` original:

```ts
readonly tasks = httpResource<Task[]>(() => ({
  url: `${baseUrl}/api/database/records/tasks?select=*&order=created_at.desc`,
}));
```

`httpResource` solo refetcha cuando cambian las señales accedidas dentro de la función de request. Como la URL es constante y no lee `auth.currentUser()`, el resource:
1. Fetcha una vez al inicializar el service
2. Nunca refetcha cuando cambia el usuario
3. Solo refetcha con `reload()` explícito (en `create`, `update`, `remove`)

Resultado: el `tasks.value()` queda cacheado en memoria con datos del primer usuario que hizo GET, ignorando cambios de identidad hasta la siguiente acción.

### Fix aplicado

```ts
// tasks.ts (nuevo)
export class TasksService {
  private auth = inject(AuthService);

  readonly tasks = httpResource<Task[]>(() => ({
    url: `${baseUrl}/api/database/records/tasks?select=*&order=created_at.desc`,
    headers: { 'X-Track-User': this.auth.currentUser()?.id ?? 'anon' },
  }));
  // ...
}
```

Acceder a `this.auth.currentUser()` dentro de la función de request crea una **dependencia reactiva**: cuando el signal cambia (login, logout, switch), `httpResource` re-evalúa la función y refetcha. El header `X-Track-User` es solo para hacer explícita la dependencia; el header real de auth lo añade el interceptor.

### Validación

Después del fix, al recargar `localhost:4200`:
1. Login kelp → ver 2 kelp
2. Logout kelp → ver 0 (porque refetch con token anon → RLS filtra todo)
3. Login icy → ver 0 (refetch con token icy)
4. Crear tarea icy → ver 1 icy
5. Logout icy → ver 0
6. Login kelp → ver 2 kelp ✅

### Bonus: validación de token al boot

Adicional al fix del resource, `app.config.ts` añade `provideAppInitializer` que llama `AuthService.validateStoredSession()` antes del primer render. Si el token en localStorage está expirado o el server lo rechaza, se hace `signOut()` y el usuario ve Login aunque tenga token cacheado.

```ts
// auth.service.ts (nuevo método)
async validateStoredSession(): Promise<void> {
  const token = this.getAccessToken();
  if (!token) return;
  try {
    const user = await firstValueFrom(
      this.http.get(`${baseUrl}/api/auth/sessions/current`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    this._user.set({ id: user.id, email: user.email, name: user.name });
  } catch (e) {
    if (e instanceof HttpErrorResponse && (e.status === 401 || e.status === 403)) {
      this.signOut();
    }
  }
}
```

### Tests añadidos a Phase D

- `e2e/auth-switch.spec.ts`: login → logout → login con otro user → verificar lista es la del nuevo
- `e2e/auth-boot-validation.spec.ts`: localStorage con token muerto → reload → app debe mostrar Login
