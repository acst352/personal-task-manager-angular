# Linear hygiene: granular vs ejecutivo

## Por qué este doc

Este proyecto demuestra dos formas de organizar el mismo trabajo en Linear: granular (vista de ingeniería) y ejecutivo (vista de stakeholders). La meta es mostrar cuándo cada una aplica y por qué ambas son válidas.

## TL;DR

| | Angular CRUD | Administrador de tareas |
|---|---|---|
| Issues | 36 (granular) | 3 (epic level) |
| Tiempo de scan | 10+ min | 2 min |
| Audiencia | Ingenieros haciendo el trabajo | PM, manager, cliente |
| Cuándo crear issue | "Empiezo tarea X" | "Entregable Y completo" |
| Status updates | (no se usan) | 1 por milestone |

## Vista granular (Angular CRUD)

36 issues agrupados en 6 phases (A-F). Cada issue es un paso de implementación: "Configurar vitest", "Escribir SPEC.auth.md", "Fix bug DELETE return-representation", etc.

**Cuándo sirve**:

- Trabajo en pareja / pair debugging
- Onboarding técnico de nuevos devs al proyecto
- Post-mortem cuando algo falla (trazabilidad exacta de qué commit rompió qué)
- Histórico de auditoría

**Cuándo falla**:

- PM pregunta "¿qué se entregó este sprint?" → respuesta = "36 issues, todos Done"
- Cliente pregunta "¿está listo?" → necesita filtrar/agrupar manualmente
- Status report a dirección → ilegible, demasiado ruido

## Vista ejecutiva (Administrador de tareas)

3 issues a nivel epic + 1 status update. Cada issue es un entregable de valor:

- "App funcional lista para usuarios finales"
- "Suite de calidad automatizada en CI"
- "Seguridad y mantenimiento continuo"

**Cuándo sirve**:

- Weekly status a PM
- Demo a cliente (escanea 2 minutos, entiende qué se entregó)
- Roadmap review
- Onboarding de stakeholders no-técnicos

**Cuándo falla**:

- Debug de regresión específica (necesitas el detalle granular)
- Code review traceability

## Por qué ambos coexisten

Son **vistas diferentes del mismo trabajo**, no versiones competidoras:

- El código (git) es el log de cambios exhaustivo
- Linear granular es la descomposición de tareas
- Linear ejecutivo es la narrativa de valor

La elección depende de la pregunta que necesitas responder:

- "¿Qué hice ayer?" → Linear granular
- "¿Qué valor entregué al usuario este mes?" → Linear ejecutivo

## Principios (de expertos)

- **Kent Beck**: "Issues should be the size that can be completed in 1-3 days." Aplicado: cada issue granular es una tarea de horas; cada issue ejecutivo es un entregable de días.
- **Martin Fowler (Continuous Delivery)**: track at the level de **deployable units**. Cada epic ejecutivo es deployable atómico.
- **Shape Up (Basecamp, 2020)**: appetite (tiempo máximo) en lugar de estimate. Aplicado: 3 epics en 1 ciclo vs 36 micro-tasks.

## Realidad post-AI agéntica

Velocidad tradicional: 20-50 commits/semana. Velocidad con AI: 200+ commits/hora.

Tracking granular atomizado (1 issue por commit) genera:

- Ruido que oculta señal
- Tiempo gastado en bookkeeping
- Imposible sintetizar status útil

Tracking ejecutivo escala mejor: agregas commits en issues de valor, reduces overhead.

## Recomendación para tu equipo

1. **Empieza con vista granular solo si la necesitas**. Si trabajas solo, probablemente no.
2. **Crea vista ejecutiva cuando tengas PM/cliente/stakeholders externos**.
3. **Cada milestone genera un status update** en el ejecutivo.
4. **Cross-link entre vistas** si necesitas drill-down: links en issues ejecutivos → issues granulares relevantes.

## Aplicado en este proyecto

- **Repo**: github.com/acst352/personal-task-manager-angular
- **Linear granular**: "Angular CRUD" (36 issues, todas Done)
- **Linear ejecutivo**: "Administrador de tareas personales" (3 issues + 1 status update)
- **Changelog**: CHANGELOG.md (commit-level, para grep/búsqueda)
- **Tags**: v0.1.0 → v1.8.0 (semver para releases)
