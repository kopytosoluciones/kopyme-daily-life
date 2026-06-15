# kopyme — Project Guide for Claude

## What is this project

A personal life-documentation app styled as a game. Users get a personalized avatar that reflects their emotional/behavioral state. The app tracks habits, mood, diary entries, goals, relationships, memories, letters/gifts, and chat with other users.

Built to start as a single-user app and scale to multi-user with selective privacy.

## Working rules

- **Always ask Pedro "¿estás ok?" before doing anything concrete** — writing files, running commands, installing packages. Wait for confirmation.
- **Give critical feedback, not validation** — if an idea has a flaw, say so. Suggest alternatives. Don't agree by default.
- **Think in Pedro's style**: big picture → details, iterative, aesthetic-first, long-term.

## Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Styles**: Tailwind CSS + shadcn/ui
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
npm run dev       # local dev
npm run build     # production build
npm run typecheck # tsc --noEmit
```

## Modules — current state

| Módulo | Archivo principal | Backend | Estado |
|---|---|---|---|
| Dashboard | `app/(app)/dashboard/` | Supabase profiles | ✅ |
| Hábitos | `app/(app)/habits/` | Supabase | ✅ |
| Checklists | `app/(app)/todos/TodosClient.tsx` | Supabase (todo_lists + todos) | ✅ redesigned |
| Calendario | `app/(app)/calendar/CalendarClient.tsx` | localStorage `kopyme-cal-v1` | ✅ |
| Diario Emocional | `app/(app)/diary/DiaryClient.tsx` | Supabase diary_entries | ✅ redesigned |
| Vínculos | `app/(app)/connections/ConnectionsClient.tsx` | localStorage `kopyme-connections-v1` | ✅ redesigned |
| Metas | `app/(app)/goals/` | — | stub |
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

## Known bugs avoided (don't repeat)

1. **Optimistic revert on check/uncheck** — sync logic that compares `id:completed` reverts local state instantly because server prop is stale. Use ID-only comparison.
2. **startTransition void constraint** — `startTransition(() => action())` fails TS if action returns non-void. Wrap: `startTransition(() => { action(); })`.
3. **redirect() in client-called actions** — causes full page navigation. Replace with `revalidatePath()`.
4. **DraggableAttributes cast** — `as Record<string, unknown>` fails. Use `as unknown as Record<string, unknown>`.
5. **State in wrong component** — if UI placement is uncertain, default to keeping state higher (parent). Moving state up later requires refactoring call sites.

---

## Session log

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
