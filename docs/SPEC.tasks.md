# SPEC — Tasks CRUD

**Fecha**: 2026-09-17
**Status**: Draft (contract para Phase D tests + Phase E fixes)
**Issues**: ICY-54 (este archivo), ICY-50 (Phase D tests derivados)

---

## Convenciones

- **GIVEN** usuario autenticado con tareas en BD, app cargada
- **WHEN** acción CRUD
- **THEN** resultado esperado (UI + network + BD via RLS)

Estado por caso:
- ✅ Implementado y verificado manualmente
- ⚠️ Con bug conocido (referencia INVESTIGATION.md)
- ❌ Pendiente (Phase E)

---

## TASK-1: Ver lista de tareas propias

**Given** usuario autenticado, tiene N tareas propias en BD
**When** carga la app
**Then**:
- GET `/api/database/records/tasks?select=*&order=created_at.desc` con su JWT
- RLS policy filtra por `user_id = auth.uid()`
- UI muestra solo las N tareas del usuario (no las de otros)
- Contador "X tareas pendientes" refleja solo las no-done propias
- Si N = 0: muestra "No hay tareas todavía"

**Status**: ✅ implementado (tras fix bug #3)

---

## TASK-2: Crear tarea nueva

**Given** usuario autenticado en la pantalla principal
**When** click "+ Nueva tarea" → completa título + prioridad → click "Guardar"
**Then**:
- POST `/api/database/records/tasks` con body `{ title, done: false, priority, user_id: <currentUser.id> }`
- Header `Prefer: return=representation`
- Backend responde 201 con la fila creada (incluyendo `id`, `created_at`, `updated_at`)
- `tasks.reload()` refetcha
- La nueva tarea aparece en la lista con su uuid
- El form se cierra, vuelve a la lista

**Validación cliente**:
- title.trim() no vacío
- priority ∈ { low, medium, high }

**Status**: ✅ implementado (tras fix bug #2 con RLS policy)

---

## TASK-3: Editar tarea propia

**Given** usuario autenticado, tiene tareas en lista
**When** click "Editar" en una tarea → modifica título o prioridad → click "Guardar"
**Then**:
- PATCH `/api/database/records/tasks?id=eq.<id>` con body parcial `{ title?, priority? }`
- Header `Prefer: return=representation`
- Backend responde 200 con la fila actualizada
- `tasks.reload()` refetcha
- UI muestra el cambio

**Status**: ✅ implementado

---

## TASK-4: Marcar tarea como done / no-done

**Given** tarea en la lista
**When** click "✓" en una tarea
**Then**:
- `tasksService.toggleDone(task)` ejecuta
- Internamente: PATCH `done: !task.done`
- UI refleja el cambio (regla CSS `li.done` aplica/quita tachado)

**Status**: ✅ implementado

---

## TASK-5: Borrar tarea propia con confirmación

**Given** tarea en la lista
**When** click "✕"
**Then**:
- Aparece `confirm()` del navegador: "¿Borrar esta tarea?"
- Si cancela: no pasa nada
- Si acepta:
  - DELETE `/api/database/records/tasks?id=eq.<id>` con `Prefer: return=representation`
  - Backend responde 200 con array `[<deleted-row>]`
  - `tasks.reload()` refetcha
  - La tarea desaparece de la lista

**Status**: ✅ implementado (tras fix bug #1)

---

## TASK-6: Aislamiento entre usuarios (server-side RLS)

**Given** usuario A tiene tarea T1 (user_id=A.id). Usuario B tiene tarea T2 (user_id=B.id).
**When** usuario A carga la app
**Then**:
- GET retorna solo T1 (no T2)
- Si A intenta `remove(T2.id)` (sin tener acceso):
  - DELETE retorna 200 con body `[]` (RLS filtra la fila)
  - `tasks.service.ts:remove()` valida array vacío → throw
  - UI muestra error vía `actionError` signal
  - La tarea NO se elimina (porque A no la tenía visible)

**Status**: ✅ implementado (RLS policy + client-side validation)

---

## TASK-7: Error de red al cargar lista → mensaje visible

**Given** usuario autenticado, conexión a internet caída
**When** carga la app (o el primer fetch falla)
**Then**:
- `tasks.httpResource()` expone `error()` con el HttpErrorResponse
- UI muestra mensaje del error
- Lista vacía con texto informativo
- NO se rompe la app

**Status**: ❌ pendiente (UI muestra error pero sin test E2E que simule red caída)

---

## TASK-8: Error al crear tarea → mensaje, no agrega a UI

**Given** usuario autenticado, intenta crear tarea cuando backend rechaza
**When** submit del form
**Then**:
- POST falla (ej: 403 si RLS cambiara, 500 del server, 0 red)
- `tasks.service.ts:create()` throw con mensaje legible
- `App.onSave()` captura, setea `actionError` signal
- UI muestra error inline debajo del form
- El form NO se cierra (usuario puede corregir y reintentar)

**Status**: ✅ implementado

---

## TASK-9: TASK-N1: Intentar borrar tarea ajena → error, no daño

**Given** usuario A autenticado. B tiene tarea T-ajena (id=XYZ, user_id=B.id)
**When** programa llama `tasks.service.remove('XYZ')` con token de A
**Then**:
- DELETE retorna 200 con body `[]` (RLS deny)
- `remove()` throws con mensaje "No se pudo borrar la tarea (no existe o no tienes permiso)"
- `tasks.reload()` se llama → retorna las tareas de A (sin T-ajena, porque RLS)
- UI: el error aparece via `actionError`, la lista de A se mantiene

**Status**: ✅ implementado

---

## TASK-10: TASK-N2: Intentar editar tarea ajena → error

**Given** usuario A autenticado. B tiene tarea T-ajena
**When** A intenta `tasks.service.update(T-ajena.id, { title: 'hack' })`
**Then**:
- PATCH retorna 200 con body `[]` (RLS deny)
- `update()` throws con mensaje
- `tasks.reload()` no se ejecuta (o ejecuta pero no encuentra la fila)
- T-ajena en BD NO se modifica

**Status**: ✅ implementado

---

## TASK-11: Crear tarea sin usuario autenticado

**Given** usuario NO autenticado (token expirado, por ejemplo)
**When** llama `tasks.service.create(...)` con `userId = undefined`
**Then**:
- Compilador TS rechaza: parámetro `userId` ahora es `string` no-nullable (cambio en v0.3.1)
- Si se llama en runtime sin userId: `App.onSave()` throws "Debes iniciar sesión"
- POST no se ejecuta

**Status**: ✅ implementado

---

## Out of scope (v1.0.0)

- Búsqueda/filtrado
- Categorías o tags
- Drag-to-reorder
- Adjuntar archivos
- Compartir tarea con otro usuario
- Historial de cambios
- Export/import
- Paginación (asumimos < 1000 tareas por usuario)
