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
└── docs/               # CHANGELOG (historia), DESIGN_MANUAL, DATA_MODEL, mockups/
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
| Combustible | `app/(app)/combustible/` (Tablero, Bitacora, Simulador, Onboarding, charts) + `lib/finance/` | Supabase finance_* | ✅ |
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

### Combustible
- Los cálculos viven en `lib/finance/calc.ts` como funciones puras (sin imports de valor) → se pueden probar con `node archivo.ts` copiando el archivo.
- Estado local autoritativo: las actions de celdas **no** revalidan y no hay sync con props; `useState(initial)` alcanza. Solo `createNextMonth` y `markMonthReviewed` hacen `revalidatePath("/", "layout")` para refrescar Avisos.
- `ensureCurrentMonths(userId)` usa `cache()` de React con **clave userId** (no el client de Supabase: cada `createClient()` es un objeto nuevo y rompería el cache). Lo llaman el layout (avisos) y la página.
- Meses: se calculan en zona `America/Argentina/Buenos_Aires` (`APP_TIME_ZONE`), Vercel corre en UTC.
- Gráficos: SVG propio en `combustible/charts.tsx` (`LineChart`, `DeviationBars`, `StackedArea`, `ScrambleNumber`), colores siempre por `var(--token)`. Para verificar con datos sin tocar la base: página temporal con mock que se borra antes del commit.
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

## DB schemas (detalle de tablas clave)

Modelo completo en `docs/DATA_MODEL.md`.

### Diario Emocional — DB schema
- Table: `diary_entries`
- Columns: `id, user_id, entry_date, body (NOT NULL), mood (int 1-10), emoji (text), deleted_at (timestamptz), created_at`
- ⚠️ Field is `body`, NOT `content`
- Soft delete: `deleted_at` column — queries filter `.is("deleted_at", null)`

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

## Pendiente

Lista viva de lo que sigue abierto. La historia de cada sesión está en **`docs/CHANGELOG.md`**.

**Acciones de Pedro (fuera del código)**
- Vercel: borrar el proyecto duplicado **kopyme-daily-life** (Settings → General → Delete Project). El real es **kopyme** (team `dropes-games`), con `kopyme.vercel.app` y las env vars.
- Vercel: las env vars de Supabase están solo en *Production* → las previews no conectan. Si se quieren previews, tildar *Preview* en cada variable.
- Supabase Auth: activar "Leaked password protection".
- Supabase Auth: agregar `https://kopyme.vercel.app/auth/callback` a Redirect URLs.
- Combustible: cargar saldos y tipo de cambio de noviembre 2026 y marcar ✓ listo.

**Producto / código**
- Migrar módulos viejos a v2 (orden en `docs/DESIGN_MANUAL.md` → Migración). Backup del Diario antes de tocarlo.
- Árbol de la vida: verificar/ajustar zonas SVG; decidir tratamiento visual en v2.
- Avatar: definir tratamiento visual en v2.

**Limpieza**
- Nada pendiente. (Los cambios sin commitear del worktree viejo quedaron en `.claude/archive/`, fuera de git.)

## Al cerrar una sesión

1. Agregar la entrada arriba de todo en `docs/CHANGELOG.md` (qué se hizo, salió bien, salió mal, commits).
2. Actualizar **Pendiente** acá: sacar lo resuelto, sumar lo nuevo.
3. Si aparecieron patrones o bugs nuevos, sumarlos a **Patterns that work** / **Known bugs avoided**.
