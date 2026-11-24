# Changelog — kopyme

Historia del proyecto por sesión, la más reciente arriba. Cada entrada: qué se hizo, qué salió bien, qué salió mal y lo que quedó pendiente **en ese momento**.

Lo que sigue abierto hoy vive en `CLAUDE.md` → **Pendiente**. Al cerrar una sesión: agregar la entrada acá arriba y actualizar esa lista.

---

### Sesión 2026-11-23

**Commits**: `0b002cb` → (este cierre) · directo en `main`

#### Qué se hizo

| # | Qué | Archivos clave |
|---|-----|----------------|
| 1 | Worktrees viejos borrados (sus 0 commits ya estaban en main); cambios sin commitear guardados en `.claude/archive/` | `.gitignore` |
| 2 | Lint en 0: errores preexistentes en Calendario, Vínculos, Checklists, Hábitos y Egg | `app/(app)/*`, `components/avatar/Egg.tsx` |
| 3 | Combustible · **Tablero**: patrimonio con descifrado ASCII, KPIs, desvío con alerta, proyecciones 3m/1a/5a (plan vs ritmo real), gráfico histórico + proyección, distribución por billetera, desvío mes a mes | `combustible/Tablero.tsx`, `charts.tsx` |
| 4 | Combustible · **Simulador**: 6 controles, patrimonio final vs "valores de hoy sin invertir", rendimiento, pista, área apilada, resumen ASCII | `combustible/Simulador.tsx`, `.k-range` en `globals.css` |
| 5 | Tabs reales en Combustible; abre en Tablero si hay datos, si no en Bitácora | `CombustibleClient.tsx` |

#### Lo que salió bien ✅
- Verificar con una página temporal de datos de ejemplo: los números coinciden con el mockup (27.185 / +304 / 145.082) sin escribir en la base real.
- Gráficos como componentes SVG con tokens: funcionan en claro y oscuro sin cambios.

#### Lo que salió mal ❌
- La terminal integrada a veces deniega una navegación del navegador del panel; reintentar alcanza.

| 6 | Vercel: variables públicas de Supabase habilitadas también para Preview (la service role queda solo en Production) | Vercel MCP |
| 10 | **Vínculos por grupos**: pasa de localStorage a Supabase (migración 010). Vos al centro, cada grupo es una tabla (nombre, tipo, personas con afinidad) que se arrastra libremente y guarda su posición. 7 grupos creados (Podcast, Familia, Pekele, Facultad, Atom, Amigos sueltos, Los terapeutas) + Familia con Adri M, Kopy P, Lara H, Susi y Dito. Botón para importar lo viejo de cada navegador | `app/(app)/connections/`, `lib/connections/`, `supabase/migrations/010_connection_groups.sql` |
| 9 | **Árbol** (ilustración como excepción enmarcada + lista de zonas accesible + Esc) y **Avatar** (huevo en estilo línea con tokens): la app queda 100% en v2 | `app/(app)/tree/`, `components/avatar/Egg.tsx` |
| 8 | **Diario, Hábitos, Calendario, Vínculos e Inicio migrados a v2** (rama `v2/modulos`). Backup previo del Diario (58 entradas) en `.claude/archive/`. Diario y rail hechos en la sesión; los otros 4 con subagentes en paralelo y revisados en navegador. Rail pasa a barra superior en < 768px. Esc cierra los modales. Fix de hydration en Vínculos (redondeo de coordenadas) | `app/(app)/*`, `components/layout/` |
| 7 | **Checklists migrado a v2** en rama `v2/checklists`: cards brutalistas, marcadores ASCII, color de lista solo como marcador, modal v2 con Esc, fix de hydration de dnd-kit, borrados 3 componentes muertos | `app/(app)/todos/` |

#### Notas
- Proyecto duplicado **kopyme-daily-life** borrado de Vercel: queda solo **kopyme**.
- Diciembre 2026 en Combustible fue creado a propósito por Pedro para proyectar.
- Leaked password protection de Supabase requiere plan Pro: descartado (org en Free).

---

### Sesión 2026-11-22

**Commits**: `78d28b4` → `7cce481` · mergeado a `main` (fast-forward) y en producción

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
