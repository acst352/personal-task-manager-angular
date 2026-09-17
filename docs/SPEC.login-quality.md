# SPEC — Login Quality

**Fecha**: 2026-09-17
**Status**: Draft (criterios profesionales para Phase E-4)
**Issues**: ICY-55 (este archivo), ICY-50 (Phase D tests derivados)

---

## Convenciones

Estado por criterio:
- ✅ Ya implementado
- ❌ Pendiente (Phase E-4)

---

## LQ-1: Validación inline de email

**Comportamiento esperado**:
- Input con `type="email"` (validación HTML5 nativa)
- Regex adicional cliente: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Si email inválido, el botón submit queda `disabled`
- Sin mensaje de error invasivo durante escritura (solo cuando intenta submit o después de perder foco)

**Status**: ❌ pendiente (actualmente solo validación HTML5 implícita)

---

## LQ-2: Validación inline de password (signup)

**Comportamiento esperado**:
- Input con `minlength="6"` y `required`
- Mensaje inline debajo del campo si < 6 chars al perder foco: "Mínimo 6 caracteres"
- Botón submit disabled mientras < 6

**Status**: ❌ pendiente

---

## LQ-3: Submit deshabilitado mientras inválido o submitting

**Comportamiento esperado**:
- Botón "Entrar" / "Registrarme" / "Verificar" deshabilitado cuando:
  - Form inválido (campos vacíos, email mal, password corto)
  - `submitting` signal es true (durante el request)
- Atributo HTML `disabled` (no solo CSS) para accesibilidad

**Status**: ⚠️ parcialmente (submitting bloquea doble-click, falta validación deshabilitante)

---

## LQ-4: Toggle de visibilidad de password

**Comportamiento esperado**:
- Botón pequeño (icono 👁) al lado del input password
- Click cambia `type="password"` ↔ `type="text"`
- aria-label cambia ("Mostrar contraseña" / "Ocultar contraseña")
- Foco se mantiene en el input

**Status**: ❌ pendiente

---

## LQ-5: Mapeo de errores HTTP a mensajes específicos

**Comportamiento esperado**:
- 401 AUTH_UNAUTHORIZED → "Email o contraseña incorrectos"
- 403 FORBIDDEN (email no verificado) → "Verifica tu email antes de entrar"
- 422 INVALID_INPUT → mensaje del server
- 429 TOO_MANY_REQUESTS → "Demasiados intentos, espera unos segundos"
- network error → "No se pudo conectar al servidor. Revisa tu conexión."

**Status**: ✅ implementado (parcialmente vía `extractMessage`)

---

## LQ-6: aria-labels en inputs y botones

**Comportamiento esperado**:
- Cada input tiene `aria-label` o `aria-labelledby` apuntando a su label
- Cada botón tiene `aria-label` describiendo la acción (especialmente los iconos: "Borrar tarea", "Marcar como hecha")
- `aria-describedby` para mensajes de error asociados a campos
- `aria-invalid="true"` cuando el campo tiene error

**Status**: ❌ pendiente

---

## LQ-7: Foco automático al cambiar de modo

**Comportamiento esperado**:
- Cuando el componente entra al modo "signin": foco automático al input email
- Cuando cambia a "signup": foco al input name (si está visible) o email
- Cuando entra a modo "verify": foco al input OTP

**Status**: ❌ pendiente (algunos tienen `autofocus` HTML pero no todos)

---

## LQ-8: Navegación por teclado sin trampas

**Comportamiento esperado**:
- Tab navega por: input → siguiente input → botón submit → botón secundario → logout
- Shift+Tab navega hacia atrás
- Enter en input dispara submit
- Escape en form limpio no hace nada (no queremos cerrar modal accidentalmente — no hay modal aún)
- No hay elementos con `tabindex="-1"` que rompan el flujo

**Status**: ❌ pendiente (probable funciona por defecto pero sin tests)

---

## LQ-9: Errores mostrados inline

**Comportamiento esperado**:
- Cada error de validación del cliente aparece debajo del campo asociado
- Errores del backend (HTTP 4xx/5xx) aparecen en bloque `<p class="error">` debajo del form
- `role="alert"` en mensajes de error para lectores de pantalla
- Errores desaparecen cuando el usuario empieza a corregir (en el siguiente cambio del input)

**Status**: ⚠️ parcialmente (errores del backend sí se muestran, falta `role="alert"`)

---

## LQ-10: No atrapar al usuario en un estado roto

**Comportamiento esperado**:
- Si el servidor devuelve un error inesperado (500, malformed JSON), UI muestra mensaje genérico "Algo salió mal, intenta de nuevo" en vez de quedarse en blanco
- Si el token expira DURANTE el submit, no debe petar: error claro + redirect a login (cubierto por interceptor 401 → logout en Phase E-3)

**Status**: ⚠️ parcialmente (try/catch cubre errores; falta interceptor 401 → logout)

---

## LQ-11: Visualmente consistente

**Comportamiento esperado**:
- Botón submit primario: color contrastado, suficientemente grande para touch (≥44x44px)
- Mensajes de error: rojo con contraste suficiente (≥4.5:1 ratio)
- Foco visible (outline) en todos los interactivos
- Estados disabled visualmente distintos de enabled

**Status**: ⚠️ parcialmente (estilos CSS básicos, falta auditoría de accesibilidad)

---

## Out of scope (v1.0.0)

- Cambio de tema (claro/oscuro)
- i18n
- Animaciones de transición
- Sonidos
- "Mostrar contraseña" siempre visible (sin toggle)
- Indicador de fuerza de password (más allá de longitud mínima)
- Captcha después de N intentos
