# Deployment — Vercel + Angular (sin Vite)

## TL;DR

Vercel **auto-detecta dos env vars falsas** (`VITE_INSFORGE_BASE_URL` y `VITE_INSFORGE_ANON_KEY`) al importar este proyecto, porque ve la dependencia `@insforge/sdk` y asume el patrón Vite del SDK. **Este proyecto NO usa esas variables.** Los valores de runtime están en `src/environments/environment.ts`. Las dos entradas en el dashboard de Vercel se quedan vacías — son ruido, no rompen nada.

## Por qué pasa

Vercel hace pattern-matching sobre el código y dependencias para sugerir env vars. Cuando ve `@insforge/sdk` (o `@supabase/supabase-js`, etc.) sugiere los nombres que la documentación de esos SDKs promueve para entornos Vite/Next:

```
VITE_INSFORGE_BASE_URL
VITE_INSFORGE_ANON_KEY
```

Pero el patrón `import.meta.env.VITE_*` es de **Vite**, no de Angular. Angular no lo lee. La detección es ruido.

## Por qué no rompe nada

El código consume config así:

```ts
// src/app/core/insforge.client.ts:2
import { environment } from '../../environments/environment';
```

Y `environment.ts` tiene los valores hardcodeados. El bundle de producción los incluye al compilar. Las env vars vacías en Vercel nunca se leen.

Verificado con grep: cero referencias a `import.meta.env`, `VITE_` o `process.env.VITE_*` en todo el código. El único `process.env` está en `playwright.config.ts` (config de test E2E, no del bundle).

## Por qué la anonKey en `environment.ts` no es un riesgo

La `anonKey` de InsForge es **publishable por diseño** — el mismo modelo que Supabase `anon` key. Se incluye en el bundle que va al navegador. La protección real viene de las políticas RLS en el backend, no de ocultar la key.

Si quieres higiene estricta (no esconder, solo centralizar), mueve los valores a env vars de Vercel y añade un paso `prebuild` que los inyecte en `environment.ts` en compile-time. No aporta seguridad extra pero sí consistencia con proyectos Vite.

## Estado actual del deploy

| Componente | Estado |
|---|---|
| `vercel.json` | ✅ Output dir + SPA rewrites + cache headers |
| `src/environments/environment.ts` | ✅ Hardcoded values (publishable, no secret) |
| Vercel env vars `VITE_INSFORGE_*` | 🟡 Auto-detected, **vacías** (no se usan) |
| CI `verify.yml` | ✅ Quality gate intacto (corre antes que Vercel) |
| Branch protection | ⏳ Recomendado (Settings → Branches → main) |

## Si más adelante quieres usar env vars de verdad

Reemplaza `src/environments/environment.ts` con un patrón que lea de `process.env` durante el build, y añade un prebuild script en `package.json` que las inyecte antes de `ng build`:

```ts
export const environment = {
  production: true,
  insforge: {
    baseUrl: process.env['VITE_INSFORGE_BASE_URL'] ?? 'https://re3mwsvq.us-east.insforge.app',
    anonKey: process.env['VITE_INSFORGE_ANON_KEY'] ?? 'ik_b91c9f0f0c6e8824e0b7242d56609ad1',
  },
};
```

```json
"scripts": {
  "prebuild": "node scripts/inject-env-vars.js"
}
```

Pero para este proyecto (anon key publishable, single env, sin secretos reales) no aporta nada. Déjalo como está.
