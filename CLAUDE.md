# kopyme — Project Guide for Claude

## What is this project

A personal life-documentation app styled as a game. Users get a personalized avatar that reflects their emotional/behavioral state. The app tracks habits, mood, diary entries, goals, relationships, memories, letters/gifts, and chat with other users.

Built to start as a single-user app and scale to multi-user with selective privacy.

## Working rules

- **Always ask Pedro "¿estás ok?" before doing anything concrete** — writing files, running commands, installing packages. Wait for confirmation.
- **Give critical feedback, not validation** — if an idea has a flaw, say so. Suggest alternatives. Don't agree by default.
- **Think in Pedro's style**: big picture → details, iterative, aesthetic-first, long-term.

## Stack

- **Framework**: Next.js 16 (App Router, TypeScript) — ver `AGENTS.md`: APIs distintas a versiones previas
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Styles**: Tailwind CSS v4 (config en `app/globals.css` con `@theme`, sin `tailwind.config`) + shadcn/ui
- **Design system**: v2 brutalista/minimal + ASCII — **`docs/DESIGN_MANUAL.md` es la fuente de verdad visual**. Referencia viva: `docs/mockups/combustible.html`
- **AI / Avatar**: Claude API (Anthropic)
- **Media storage**: Supabase Storage
- **Visualizations**: Recharts + React Flow (relationship map)
- **i18n**: next-intl (ES/EN)
- **Hosting**: Vercel

## Project structure

```
kopyme/
├── app/                  # Next.js App Router
│   ├── (auth)/           # Login, register
│   ├── (app)/            # Protected routes
│   │   ├── dashboard/    # Avatar + overview
│   │   ├── habits/
│   │   ├── mood/
│   │   ├── diary/
│   │   ├── goals/
│   │   ├── connections/
│   │   ├── memories/
│   │   ├── letters/
│   │   └── chat/
├── components/
├── lib/
│   ├── supabase/
│   └── ai/
├── messages/             # i18n: es.json, en.json
├── supabase/
│   └── migrations/
└── docs/
```

## Commands

```bash
npm run dev       # local dev (si falla con "next/font queries have exactly one entry": rm -rf .next)
npm run build     # production build
npx tsc --noEmit  # typecheck (no hay script "typecheck")
```

## Modules — current state

| Módulo | Archivo principal | Backend | Estado |
|---|---|---|---|
| Dashboard | `app/(app)/dashboard/` | Supabase profiles | ✅ |
| Árbol de la vida | `app/(app)/tree/TreeClient.tsx` | Supabase life_tree_entries | ✅ |
| Hábitos | `app/(app)/habits/` | Supabase | ✅ |
| Checklists | `app/(app)/todos/TodosClient.tsx` | Supabase (todo_lists + todos) | ✅ redesigned |
| Calendario | `app/(app)/calendar/CalendarClient.tsx` | localStorage `kopyme-cal-v1` | ✅ |
| Diario Emocional | `app/(app)/diary/DiaryClient.tsx` | Supabase diary_entries | ✅ redesigned |
| Vínculos | `app/(app)/connections/ConnectionsClient.tsx` | localStorage `kopyme-connections-v1` | ✅ redesigned |
| Combustible | `app/(app)/combustible/` (Bitacora, Onboarding) + `lib/finance/` | Supabase finance_* | 🟡 Bitácora ✅ · Tablero y Simulador pendientes |
| Ajustes | `app/(app)/settings/page.tsx` | cookie + profiles.theme | ✅ tema |
| Avisos | `components/layout/NoticesPanel.tsx` + `lib/notifications.ts` | derivado | ✅ |
| Metas | `app/(app)/goals/` | — | stub |

> Rediseño v2: Combustible, Ajustes, Avisos y el rail ya están en v2. Los demás módulos siguen con colores fijos en el código (se ven "islas blancas" en modo oscuro) hasta migrarlos uno por uno.
| Recuerdos | `app/(app)/memories/` | — | stub |
| Cartas & Regalos | `app/(app)/letters/` | — | stub |

## Key conventions

- All DB queries go through `lib/supabase/` — never raw fetch in components
- Every table has `user_id uuid references auth.users` for multi-tenant isolation
- Row Level Security (RLS) enabled on all tables
- Components in Spanish naming is fine; code in English
- No comments unless the WHY is non-obvious

## Patterns that work

### Server actions
- NEVER `throw` — always return `{ error: string | null }`
- NEVER `redirect()` from actions called by Client Components — use `revalidatePath()` only
- `startTransition(() => { action(); })` — void wrapper required when action returns a value (TypeScript: `startTransition` expects void callback)
- Optimistic updates: call `setLocalState(...)` BEFORE `startTransition(...)`, never inside it

### Client state sync (optimistic UI)
- Sync from server props using **ID comparison only**, not full object comparison
- Example: `if (server.map(t=>t.id).join() !== local.map(t=>t.id).join()) setLocal(server)`
- Comparing `id:completed` pairs causes every optimistic check/uncheck to be reverted immediately (the server prop is stale the whole session)
- Completion state / toggle state is always authoritative locally — only sync IDs (adds/deletes from server)

### DnD (@dnd-kit)
- Nested contexts: outer `DndContext` for grid (rectSortingStrategy), inner per-card `DndContext` for task lists (verticalListSortingStrategy)
- Grid cards: `useSortable` wrapper component, drag handle attr via `dragHandleListeners`/`dragHandleAttributes` props passed down
- TypeScript cast for attributes: `attributes as unknown as Record<string, unknown>` (not a direct cast — `DraggableAttributes` has no index signature)

### State location
- Place state where it **renders**, not where the logic lives
- If a button moves from a child to the header, the state goes up to the parent — plan this upfront
- Analysis modal state in `DiaryClient` (not in `Last14Days`) because the trigger button is in the header

### Compact layout (fit on one screen)
- Reduce in this order: wrapper padding → section margins → card padding → textarea rows → individual component margins
- `BAR_H` (histogram height) and gap control bar proportions independently: bigger gap = narrower bars, bigger BAR_H = taller bars
- Don't touch font sizes until spacing is exhausted

### Diario Emocional — DB schema
- Table: `diary_entries`
- Columns: `id, user_id, entry_date, body (NOT NULL), mood (int 1-10), emoji (text), deleted_at (timestamptz), created_at`
- ⚠️ Field is `body`, NOT `content`
- Soft delete: `deleted_at` column — queries filter `.is("deleted_at", null)`

### Combustible
- Los cálculos viven en `lib/finance/calc.ts` como funciones puras (sin imports de valor) → se pueden probar con `node archivo.ts` copiando el archivo.
- Estado local autoritativo: las actions de celdas **no** revalidan y no hay sync con props; `useState(initial)` alcanza. Solo `createNextMonth` y `markMonthReviewed` hacen `revalidatePath("/", "layout")` para refrescar Avisos.
- `ensureCurrentMonths(userId)` usa `cache()` de React con **clave userId** (no el client de Supabase: cada `createClient()` es un objeto nuevo y rompería el cache). Lo llaman el layout (avisos) y la página.
- Meses: se calculan en zona `America/Argentina/Buenos_Aires` (`APP_TIME_ZONE`), Vercel corre en UTC.
- Números: `parseAmount` acepta "1.234,56", "1234.56" y "1.465" (= 1465). Formato `es-AR` con `−` real.

### Tema
- Cookie `kopyme-theme` leída en el root layout → `data-theme` en `<html>` desde el server (sin flash). `setTheme` action guarda cookie + `profiles.theme`.
- No usar `dark:` de Tailwind: los tokens cambian solos.

### Supabase / Vercel MCP
- Supabase MCP con **escritura** (scope local del proyecto). Regla: leer libremente; cualquier migración o escritura se muestra primero y se aplica solo con OK explícito de Pedro. Contar filas antes/después en tablas con datos reales.
- Vercel MCP (`https://mcp.vercel.com`) para deployments, logs y proyectos.
- Git push: `.git/config` local fuerza el llavero (`credential.https://github.com.helper = osxkeychain`) porque el `~/.gitconfig` global usa `gh`, que está logueado con otra cuenta (pedrokopyto-sys).
- Validar migraciones localmente con PGlite antes de pasarlas (stub de `auth.users`, `auth.uid()` y `uuid_generate_v4()`).

## Known bugs avoided (don't repeat)

1. **Optimistic revert on check/uncheck** — sync logic that compares `id:completed` reverts local state instantly because server prop is stale. Use ID-only comparison.
2. **startTransition void constraint** — `startTransition(() => action())` fails TS if action returns non-void. Wrap: `startTransition(() => { action(); })`.
3. **redirect() in client-called actions** — causes full page navigation. Replace with `revalidatePath()`.
4. **DraggableAttributes cast** — `as Record<string, unknown>` fails. Use `as unknown as Record<string, unknown>`.
5. **State in wrong component** — if UI placement is uncertain, default to keeping state higher (parent). Moving state up later requires refactoring call sites.
6. **Foco en `requestAnimationFrame`** — mover el foco de celda en un frame posterior hace que lo tipeado rápido después de Enter caiga en la celda anterior. Mover el foco síncrono.
7. **setState dentro de useEffect** — el lint de React 19 lo marca como error. Pasar el valor inicial desde el server (ej. tema) o usar borrador solo mientras hay foco.
8. **Migraciones creadas desde el dashboard** — `life_tree_entries` y `todo_lists` no tenían archivo. Toda tabla nueva va con migración en `supabase/migrations/`.

### Árbol de la vida — DB schema
- Table: `life_tree_entries`
- Columns: `id, user_id, section (text), body (NOT NULL), entry_date (date), created_at`
- Sections: `raices, tronco, ramas, flores_frutos, sol, regadera, animales, viento, hojas_caidas`
- RLS enabled — usuarios solo ven sus propias entradas
- Index: `(user_id, section, entry_date DESC)`

### Árbol de la vida — SVG overlay
- Imagen: `public/tree.jpg` — 1342×2000px (ratio 1342/2000)
- Container: `height: min(85vh, 740px)`, `aspectRatio: "1342/2000"`
- Image: Next.js `<Image fill className="object-fill">` — ocupa el container exactamente
- SVG: `viewBox="0 0 1342 2000"` absolutamente posicionado sobre la imagen
- 9 zonas en orden background→foreground (último en SVG = recibe clicks primero)
- Hover label: div HTML absolutamente posicionado por `labelXpct/labelYpct` (no SVG text)
- ⚠️ Las coordenadas de las zonas son aproximadas — ajustar visualmente si alguna zona está desplazada

---

## Session log

### Sesión 2026-11-22

**Commits**: `78d28b4` → `4551278` · mergeado a `main` (fast-forward) y en producción

#### Qué se hizo

| # | Qué | Archivos clave |
|---|-----|----------------|
| 1 | Concepto de diseño v2 (brutalismo en formas + minimalismo + ASCII) — mockup HTML de Combustible con claro/oscuro | `docs/mockups/combustible.html` |
| 2 | `DESIGN_MANUAL.md` reescrito; `UI_LANGUAGE.md` alineado (solo voz y tono) | `docs/` |
| 3 | Fase 0: tokens v2 en Tailwind v4, Space Grotesk + JetBrains Mono, botón brutalista, rail nuevo, tema Sistema/Claro/Oscuro con cookie | `app/globals.css`, `app/layout.tsx`, `components/layout/` |
| 4 | Migraciones: 004 theme, 005 life_tree (retro), 006 finance, 007 todo_lists (retro), 008 search_path, 009 reviewed_at | `supabase/migrations/` |
| 5 | Combustible: cálculos puros, onboarding con billeteras de la planilla, Bitácora editable con overrides | `lib/finance/`, `app/(app)/combustible/` |
| 6 | Ajustes (`/settings`) con el tema; Avisos en el rail; meses automáticos al cambiar de mes + botón ✓ listo | `app/(app)/settings/`, `lib/notifications.ts`, `components/layout/NoticesPanel.tsx` |

#### Lo que salió bien ✅
- **Mockup antes del manual**: diseñar el HTML primero y escribir el manual a partir de él evitó discutir en abstracto.
- **Tokens con nombres de shadcn**: los componentes heredan el sistema sin reescribirlos; alias `paper/ink/soft/dim/pos/neg` en Tailwind.
- **Validar SQL con PGlite** antes de pasarlo a Pedro: las 9 migraciones corren en orden y las constraints rechazan lo que deben.
- **FKs compuestas** `(id, user_id)` en finanzas: imposible cruzar datos entre usuarios aunque falle la app.
- **Cálculos probados contra el mockup**: patrimonio 27.185, desvío +304.

#### Lo que salió mal ❌
- **Bug de foco en la Bitácora** (rAF): encontrado probando con datos reales. Fix: foco síncrono.
- **Caché `.next` rompió el dev server** al cambiar fuentes. Fix: `rm -rf .next`.
- **`004_profile_theme.sql` apareció vacío en disco** sin causa clara; se restauró desde git.
- **Push**: no había credenciales de `kopytosoluciones` en el llavero; Pedro pusheó con un PAT desde Terminal.app (la terminal integrada no deja pegar en prompts de contraseña).

#### Pendiente / próxima sesión
- Vercel: **kopyme** (team `dropes-games`) es el proyecto real — tiene `kopyme.vercel.app` y las env vars. **kopyme-daily-life** es un duplicado (solo `kopyme-daily-life.vercel.app`, sin env vars propias): borrarlo desde Settings → General → Delete Project.
- Vercel: las env vars de Supabase están solo en *Production* → las previews no conectan a Supabase. Si se quieren previews, tildar *Preview* en cada variable.
- Activar "Leaked password protection" en Supabase Auth.
- Worktrees viejos en `.claude/worktrees/` (uno con cambios sin commitear en `layout.tsx` y `JungleScene.tsx`): decidir si se borran.
- Combustible: Tablero y Simulador.
- Migrar módulos viejos a v2 (orden en el manual). Backup del Diario antes de tocarlo.
- Pendiente de sesiones anteriores: Redirect URL `https://kopyme.vercel.app/auth/callback` en Supabase; ajustar zonas del Árbol.

---

### Sesión 2026-09-21

**Commits**: `432e0cb` → `cc70ccf`

#### Qué se hizo

| # | Qué | Archivos clave | Commit |
|---|-----|----------------|--------|
| 1 | Limpieza de memoria — borrado archivos atom_brain y reporter_ia_atom del contexto de kopyme | `memory/` | — |
| 2 | App caída por Supabase pausado — restauración manual + keepalive cron diario | `app/api/keepalive/route.ts`, `vercel.json` | `432e0cb` |
| 3 | Git config — repo configurado para usar siempre cuenta `kopytosoluciones` | `.git/config` local | — |
| 4 | Árbol de la vida — nueva sección completa con SVG interactivo + panel lateral + DB | `app/(app)/tree/`, `public/tree.jpg`, `Sidebar.tsx` | `cc70ccf` |

#### Lo que salió bien ✅

- **Keepalive cron**: patrón simple — `/api/keepalive` hace `SELECT id FROM profiles LIMIT 1`, configurado en `vercel.json` como cron diario 12:00 UTC. Cero mantenimiento.
- **SVG overlay sobre imagen real**: usar imagen fija + SVG absolutamente posicionado con `viewBox` matching dimensiones de imagen (1342×2000) es el approach correcto. Más fiel al diseño, más mantenible que SVG dibujado a mano.
- **Label en HTML, no en SVG text**: posicionar el tooltip como div HTML con `left/top` en porcentajes (`labelXpct/labelYpct`) es mucho más limpio que SVG `<text>` — mejor rendering, más fácil de estilizar.
- **TypeScript sin errores** desde el primer intento.

#### Pendiente / próxima sesión

- Verificar visualmente las zonas SVG en producción y ajustar coordenadas si alguna está desplazada
- Las zonas son aproximadas — el árbol tiene zonas que se solapan (RAMAS vs FLORES_FRUTOS) que puede necesitar refinamiento
- Agregar `https://kopyme.vercel.app/auth/callback` a Redirect URLs en Supabase (pendiente de sesión anterior)

---

### Sesión 2026-06-15

**Commits**: `6352647` → `418fdcd`

#### Qué se hizo

| # | Qué | Archivos clave | Commit |
|---|-----|----------------|--------|
| 1 | Vínculos — rediseño completo con CRUD, localStorage, dos vistas (tree/constellation), curvas Bézier, afinidad por nodo | `connections/ConnectionsClient.tsx` | `6352647` |
| 2 | Diario Emocional — rediseño UI (espaciado 8pt, labels mono uppercase, cards con shadow, heatmap compacto, barras con border-radius) | `diary/DiaryClient.tsx` | `df7f07d` |
| 3 | Checklists — rediseño completo desde To-dos: grilla 3×2, DnD anidado, Done colapsable, animación de check, modals | `todos/TodosClient.tsx`, `actions.ts`, `page.tsx` | `fdc927e` |
| 4 | Diario — layout compacto para entrar en una pantalla sin scroll | `diary/DiaryClient.tsx` | `6fdc846` |
| 5 | Checklists — fix bug crítico de revert optimista + animación más rápida + rename a "Checklists" | `todos/TodosClient.tsx`, `Sidebar.tsx` | `70ee9d4` |
| 6 | Diario — fila inferior del formulario unificada: `Puntaje` + barras + emoji + guardar en una línea | `diary/DiaryClient.tsx` | `4d7a057` |
| 7 | Diario — barras del histograma más altas (BAR_H 46→66) y más delgadas (gap 4→8px) | `diary/DiaryClient.tsx` | `326a450` |
| 8 | Diario — botón Análisis Emocional movido al header, estado subido a `DiaryClient` | `diary/DiaryClient.tsx` | `82a38de` |
| 9 | Docs — CLAUDE.md actualizado con módulos, patrones y bugs | `CLAUDE.md` | `44c9bff` |
| 10 | Auth — flow completo de reset de contraseña: `/auth/callback`, `/auth/confirm`, `/forgot-password`, `/reset-password` | 6 archivos nuevos | `418fdcd` |

#### Lo que salió bien ✅

- **DnD anidado en Checklists**: grilla con `rectSortingStrategy` + listas internas con `verticalListSortingStrategy` en contextos separados — sin conflictos
- **Bézier curves en Vínculos**: `bezierPath()` con quadratic curve `Q` da un look orgánico limpio, mucho mejor que líneas rectas
- **Compact layout sin tocar font sizes**: reducir en el orden correcto (wrapper padding → section margins → card padding → textarea rows) logró entrar todo sin scroll
- **Estado de análisis levantado a `DiaryClient`**: una vez movido al padre el botón quedó exactamente donde se necesitaba sin refactors adicionales
- **Auth flow con `@supabase/ssr`**: el route handler en `/auth/callback` usando `verifyOtp({ type, token_hash })` maneja correctamente recovery, magic links y confirmaciones

#### Lo que salió mal / bugs encontrados ❌

- **Bug crítico Checklists — revert optimista**: la sync `id:completed` revertía cada check/uncheck al instante porque el server prop es stale. Pasó porque se copió el patrón de otra parte sin considerar que `completed` cambia localmente. **Fix permanente**: sync solo por IDs.
- **Animación de check demasiado lenta (300ms)**: se sentía como lag. 140ms es el límite perceptible como "respuesta inmediata". Para animaciones de feedback de UI usar ≤150ms.
- **Estado del botón de análisis en el componente hijo**: se puso en `Last14Days` sin pensar dónde iba a vivir el botón en el futuro. Requirió refactor para subirlo. Lección: antes de colocar estado, preguntar "¿este trigger puede moverse al header/layout?".
- **Password reset sin route handler**: el mail llegaba pero la página daba error porque no existía `/auth/callback`. Lección: cualquier feature de Supabase Auth que mande mails necesita su route handler correspondiente.

#### Pendiente de esta sesión

- Agregar `https://kopyme.vercel.app/auth/callback` a **Redirect URLs** en Supabase dashboard (Authentication → URL Configuration) para que el reset de contraseña funcione en producción
