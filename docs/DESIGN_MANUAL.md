# Design Manual — kopyme v2

> Referencia viva: [`docs/mockups/combustible.html`](mockups/combustible.html). Si este documento y el mockup no coinciden, se discute y se corrige uno de los dos.

## Concepto

**Brutalismo en la forma, minimalismo en todo lo demás, ASCII como condimento.**

La estructura se ve y se respeta: bordes duros, cero radios, grilla visible, sombras sólidas. El color, la tipografía y la cantidad de elementos son mínimos: casi blanco y negro, dos familias tipográficas, nada que no tenga función. El ASCII aparece donde el sistema "habla": cargas, progreso, separadores, estados vacíos.

Se tiene que sentir como una **herramienta seria con alma de juego**: un cuaderno técnico personal, no un dashboard corporativo ni un juego infantil.

### Principios

1. **La estructura es el adorno.** Si algo necesita destacarse, se le da borde, peso o posición antes que color.
2. **Un acento, una función.** El azul es interacción y proyección. Verde y rojo son estado (bien / mal), nunca decoración.
3. **Los números mandan.** Todo dato numérico va en mono con cifras tabulares, alineado a la derecha.
4. **El ASCII marca estados, nunca contenido.** Si un efecto ASCII no comunica nada, se borra.
5. **Si dudás, sacalo.**

---

## Color

### Tokens

| Token | Light | Dark | Uso |
|---|---|---|---|
| `--paper` | `#F3F3EF` | `#0E0E10` | fondo de la app |
| `--card` | `#FFFFFF` | `#17171A` | superficies (cajas, tablas, inputs) |
| `--ink` | `#121212` | `#E6E6E0` | texto principal, bordes, barras de encabezado |
| `--muted` | `#6E6E68` | `#8A8A86` | labels, texto secundario, ejes |
| `--soft` | `#E7E7E1` | `#2B2B32` | celdas calculadas, hover, grilla de gráficos, seleccionado |
| `--accent` | `#2B44FF` | `#8A98FF` | interacción, foco, proyección, mes actual |
| `--accent-ink` | `#FFFFFF` | `#0B0B0D` | texto sobre acento |
| `--pos` | `#0E7F4A` | `#45D38F` | positivo, crecimiento, ahorro |
| `--neg` | `#CC3227` | `#FF7466` | deudas, desvíos, errores |
| `--shadow-c` | `= --ink` | `#4A57C9` | sombra sólida de elementos interactivos |
| `--shadow-p` | `= --ink` | `#C9CCFF` | sombra del botón primario |

### Reglas

- **90% `--paper` / `--card` / `--ink`.** El resto es excepción.
- **Máximo un acento visible "fuerte" por bloque** (un botón primario, una línea de proyección, el mes actual).
- **`--pos` y `--neg` solo comunican estado.** Nunca para decorar un módulo ni como color de marca.
- Fondos de estado: se tiñen con `color-mix(in srgb, var(--neg) 9%, var(--card))`, nunca con el color puro.
- Prohibido: gradientes, colores por módulo, pasteles, neón.

### Dark mode

El dark **no es la inversión del light**:

- El fondo no es negro puro y las cards van un tono arriba, para separar capas.
- Los bordes van un tono abajo del texto, para no encandilar.
- **Las sombras son azul profundo, no blancas.** Una sombra clara sobre negro parece un bloque pegado.
- El acento, el verde y el rojo son más claros para mantener contraste AA.
- Las barras de encabezado (thead de tablas, tab activo) quedan en `--ink` también en dark: barra clara sobre fondo oscuro. Es intencional, es el gesto más brutalista de la pantalla.

### Temas

Tres opciones: **Sistema · Claro · Oscuro**. Default: Sistema.

- Se implementa con `data-theme="light" | "dark"` en `<html>`. "Sistema" = sin atributo, manda `prefers-color-scheme`.
- Se persiste en `profiles.theme` (Supabase), así se mantiene entre dispositivos. Para evitar el flash de tema incorrecto, se lee también de una cookie en el layout del servidor.
- Los componentes **solo** usan tokens. Nunca un color literal ni un color definido únicamente dentro de un bloque de tema.

---

## Tipografía

| Rol | Familia | Uso |
|---|---|---|
| UI | **Space Grotesk** (400 / 500 / 700) | títulos, texto, botones de contenido |
| Datos | **JetBrains Mono** (400 / 500 / 700) | números, labels, tabs, chips, tablas, ASCII |

Se eliminan Inter, Playfair Display e IBM Plex Mono.

### Escala

| Token | Tamaño | Familia | Uso |
|---|---|---|---|
| `display` | `clamp(40px, 6vw, 68px)` / 700 / -0.03em | Mono | la cifra principal de una pantalla (una sola) |
| `h1` | 40px / 700 / -0.02em | Grotesk | título del módulo |
| `h2` | 22–26px / 700 | Mono | valores de KPIs y proyecciones |
| `body` | 14px / 400 / lh 1.45 | Grotesk | texto general |
| `data` | 12.5px | Mono | celdas de tabla, listas de datos |
| `label` | 11px / uppercase / +0.08em | Mono, `--muted` | encabezados de bloque, nombres de campo |
| `micro` | 10–11px | Mono, `--muted` | notas, hints, ejes de gráficos |

### Reglas

- **Todo número**: `font-family: mono` + `font-variant-numeric: tabular-nums`. Sin excepción.
- Formato numérico `es-AR`: `12.345`, decimales con coma. Negativos con `−` (signo menos real), no guion.
- Moneda como prefijo pequeño y apagado: `US$ 27.185`.
- Los labels de bloque llevan prefijo `── `: `── PATRIMONIO NETO · USD`.
- El título del módulo termina con un cursor `_` en acento que titila. Solo en el h1.

---

## Forma

| Propiedad | Valor |
|---|---|
| Border radius | **0** en todo. Sin excepción (incluye inputs, selects, sliders, modales). |
| Borde estructural | `2px solid var(--ink)` — cajas, tablas, tabs, botones |
| Borde interno | `1px solid var(--soft)` — celdas, divisiones dentro de una caja |
| Borde punteado | `1.5px dashed var(--muted)` — elementos opcionales, formularios inline, "datos de ejemplo" |
| Sombra | `4px 4px 0 var(--shadow-c)` — **solo elementos clickeables** |
| Sombras difusas | prohibidas |

**Cajas pegadas, no flotantes.** Los bloques relacionados comparten borde (grillas internas divididas con `border-right` / `border-bottom`), no se separan con gaps y sombras. Entre bloques no relacionados: `gap: 24px`.

---

## Espaciado y layout

Base de 8pt: `4 · 8 · 12 · 16 · 24 · 32 · 48`.

- Padding de caja: 16px. Padding de KPI: 16–18px. Hero: 24px.
- Separación entre bloques: 24px. Dentro de toolbars: 10px.
- Contenedor máximo: **1180px**, centrado.
- **Rail lateral** de 200px con los módulos en mono uppercase. Activo: fondo `--soft` + `▸` en acento. En < 768px (`md`) pasa a barra horizontal arriba: marca, módulos con scroll horizontal y fila de Avisos/Ajustes/Salir.
- Breakpoints: `620px` (todo a una columna), `960px` (rail arriba, heros apilados), `1180px` (paneles de controles pasan arriba).
- Para pantallas que tienen que entrar sin scroll, seguir el orden de compactación de `CLAUDE.md` (padding → márgenes → cards → filas). No tocar tamaños de fuente hasta agotar el espaciado.

---

## Componentes

### Botón
- **Default**: borde 2px, fondo `--card`, texto mono 12px uppercase, sombra sólida.
- **Primario**: fondo `--accent`, texto `--accent-ink`, sombra `--shadow-p`. Uno por vista.
- **Hover**: sube 1px y la sombra crece a 5px.
- **Active**: se hunde (`translate(4px, 4px)`, sombra 0). Es el feedback táctil del sistema.
- **Destructivo**: borde y texto `--neg`. Nunca relleno rojo.
- Prefijo `+` para crear: `+ Nuevo mes`, `+ Billetera`.

### Tabs
Fila de botones dentro de un borde 2px, separados por bordes. Activo: fondo `--ink`, texto `--paper`. Texto mono uppercase. Sirve para vistas de un módulo y para selectores segmentados (tema, horizonte).

### Caja (box)
Borde 2px, fondo `--card`. Encabezado opcional: `label` a la izquierda, nota o leyenda a la derecha, `border-bottom: 2px`.

### KPI
Label → valor (mono 22px bold) → nota (mono 11px muted). Se agrupan en grillas que comparten bordes. Estado de alerta: fondo teñido con `--neg` + chip `REVISAR`.

### Chip
Mono 10px uppercase, borde 1.5px `currentColor`, sin relleno. Para estados: `REVISAR`, `DEUDA`, `NUEVO`.

### Tabla editable (patrón Bitácora)
El patrón para cualquier dato que se carga periódicamente.

- Encabezado sticky en `--ink`. Columna actual en `--accent`.
- Columna de nombres sticky a la izquierda, separada con borde 2px.
- Grupos de filas: fila separadora en `--paper` con label uppercase y bordes 2px.
- **Tres estados de celda, siempre distinguibles:**
  - **Manual**: fondo `--card`, input inline.
  - **Calculada**: fondo `--soft`, solo lectura.
  - **Calculada pisada a mano**: fondo teñido con acento + `*` en la esquina. Se vuelve al cálculo con `Esc`.
- Teclado: `↑ ↓` y `Enter` para moverse, `Enter` sobre una celda calculada para pisarla, `Tab` natural.
- Filas totales: bold + borde superior 2px. Valores fuera de rango en `--neg`.
- Leyenda de los tres estados siempre visible debajo de la tabla.

### Input / Select
Borde 2px, radio 0, mono 12px. Foco: `outline 2px var(--accent)` con fondo teñido 7% de acento.

### Slider
Track de 2px `--ink`, thumb rectangular en `--accent` con borde 2px. Valor actual a la derecha del label, en mono bold. Debajo, el valor de referencia ("hoy: US$ 4.400").

### Formulario inline
Dentro de un borde punteado, se abre y cierra en el lugar (no modal) cuando son 1–3 campos.

### Modal
Caja con borde 2px + sombra sólida 8px, sin radio, overlay `--paper` al 80%. Solo para flujos de más de 3 campos o confirmaciones destructivas.

### Avisos
Entrada `AVISOS` en la parte baja del rail, con contador en `--primary` cuando hay pendientes (`!` como marcador). Abre un panel a la derecha del rail: caja con borde 2px + `shadow-hard-lg`, cada aviso con su área en `label`, el texto y `→`. Vacío: `[ ✓ ] Todo al día.` Los avisos se derivan de los datos (`lib/notifications.ts`) y desaparecen solos cuando se resuelven: nunca se "marcan como leídos".

### Ajustes
Las preferencias viven en `/settings`, agrupadas en cajas por tema (`── APARIENCIA`). El selector de tema está ahí, no en el rail.

### Marca de ejemplo
Cuando una vista muestra datos de ejemplo: `◇ DATOS DE EJEMPLO` en mono, borde punteado. Nunca presentar datos inventados como reales.

---

## Datos y gráficos

- SVG propio o Recharts estilizado con tokens. Texto de ejes en mono 11px `--muted`.
- Grilla horizontal en `--soft` 1px. Eje base en `--ink` 2px.
- Puntos como **cuadrados** (no círculos). El punto final destacado y rotulado.
- **Histórico**: línea sólida `--ink`. **Proyección**: línea `--accent`. **Escenario alternativo**: punteada `--muted`.
- La zona futura se marca con fondo `--soft` y una línea vertical punteada rotulada `HOY`.
- Barras de positivo/negativo en `--pos` / `--neg` contra un eje 0 en `--ink`.
- Áreas apiladas: lo propio en `--ink`, lo generado en `--accent`.
- Cada label del eje corresponde a un valor que el gráfico realmente toca.

---

## ASCII

### Catálogo

| Efecto | Ejemplo | Dónde |
|---|---|---|
| Barra de progreso | `[██████░░░░] 60%` | metas, tasa de ahorro, hábitos |
| Barra de distribución | `████████░░░░░░` | reparto entre billeteras, categorías |
| Sparkline | `▁▂▃▅▆█` | tendencia corta junto a una cifra |
| Separador | `── LABEL` · `────────` | labels de bloque, resúmenes |
| Descifrado | `$▓▒.6&#` → `27.185` | la cifra principal al cargar (una por pantalla) |
| Cursor | `Combustible_` | título del módulo |
| Marcadores | `▸ ● ◇ ▲ ▼` | activo, seleccionado, ejemplo, subida, bajada |
| Resumen en texto | bloque `pre` con barras alineadas | cierre del simulador, reportes |
| Estado vacío | dibujo ASCII pequeño + una línea de texto | listas y módulos sin datos |
| Loader | `⠋ ⠙ ⠹ ⠸` o `[▓▓▓░░░]` | cargas de más de 300ms |

### Reglas

- Máximo **dos efectos ASCII animados por pantalla** (típicamente el descifrado y el cursor).
- El ASCII decorativo lleva `aria-hidden="true"` y el dato real va en texto accesible (`aria-label`).
- Siempre en mono y con `user-select: none` cuando es decoración.
- Nunca reemplaza un gráfico cuando el dato necesita escala precisa. La sparkline acompaña, no informa.

---

## Movimiento

- **Feedback de UI ≤ 150ms** (hover, check, press). Más lento se siente como lag.
- Cambios de vista: instantáneos o ≤ 120ms. Sin slides ni fades largos.
- El movimiento es **mecánico, no orgánico**: `steps()`, desplazamientos de pocos px, nada de bounce ni easing elástico.
- Efectos permitidos: descifrado de cifras (~500ms total), cursor que titila, botón que se hunde, check que se tacha.
- `prefers-reduced-motion`: se apagan descifrado, cursor y transiciones; todo queda en su estado final.

---

## Implementación

Stack: **Tailwind v4** (sin `tailwind.config`, todo en `app/globals.css` con `@theme inline`) + shadcn/ui + `next/font`.

### Mapa de tokens

Los tokens del manual viven en CSS con los nombres de shadcn, así los componentes de shadcn los heredan sin tocarlos. En Tailwind hay alias con los nombres del manual.

| Manual | Variable CSS | Clase Tailwind |
|---|---|---|
| `paper` | `--background` | `bg-paper` / `bg-background` |
| `card` | `--card` | `bg-card` |
| `ink` | `--foreground` | `text-ink` / `border-foreground` |
| `muted` (texto) | `--muted-foreground` | `text-dim` / `text-muted-foreground` |
| `soft` | `--muted` | `bg-soft` / `bg-muted` |
| `accent` | `--primary` | `bg-primary`, `text-primary` |
| `accent-ink` | `--primary-foreground` | `text-primary-foreground` |
| `pos` | `--success` | `text-pos` |
| `neg` | `--destructive` | `text-neg` / `text-destructive` |
| sombra | `--shadow-c` / `--shadow-p` | `shadow-hard`, `shadow-hard-lg`, `shadow-hard-primary` |

⚠️ `--accent` de shadcn **no** es el acento del manual: es el fondo de hover (= `soft`). El acento azul es siempre `primary`.

### Estructura de temas

```css
:root { /* todos los tokens, valores light */ }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { /* valores dark */ color-scheme: dark; } }
:root[data-theme="dark"] { /* mismos valores dark */ color-scheme: dark; }
```

- El layout raíz lee la cookie `kopyme-theme` y pone `data-theme` en `<html>` desde el servidor: no hay parpadeo.
- `ThemeToggle` cambia el atributo al instante, y la action `setTheme` guarda la cookie y `profiles.theme`.
- La variante `dark:` de Tailwind solo responde a `data-theme="dark"` explícito. **No usar `dark:`**: los tokens ya cambian solos en los tres estados.

### Resto
- `--radius: 0` y todos los `--radius-*` en `0px`.
- Fuentes: `Space_Grotesk` → `--font-grotesk` (`font-sans`), `JetBrains_Mono` → `--font-mono` (`font-mono`). Las variables viejas (`--font-playfair`, `--font-lora`, `--font-inter`) apuntan a Grotesk para que los módulos sin migrar no se rompan.
- Números: `font-mono tabular` (la clase `.tabular` activa cifras tabulares).
- Cursor del título: `<span className="k-cursor">_</span>`.
- Botón: `components/ui/button.tsx` ya implementa las variantes del manual (`default` = primario, `outline` = default del manual, `destructive`, `ghost`, `link`).

---

## Migración

Orden propuesto, un módulo por vez:

1. ✅ Tokens + fuentes + shadcn overrides + selector de tema.
2. ✅ Rail lateral y layout general (+ Avisos, Ajustes).
3. ✅ **Combustible** (nació con el sistema).
4. ✅ Checklists → Diario → Hábitos → Calendario → Vínculos → Dashboard.
   - Escala de ánimo (Diario): divergente con tokens — 1–3 `--destructive`, 4–6 `--muted-foreground`, 7–10 `--success`, mezclados con `color-mix` sobre `--card`.
   - Cada módulo en su rama `v2/<módulo>`, verificado en preview y mergeado a `main`.
   - El color propio de una entidad (ej. color de lista) se conserva como dato pero se muestra solo como **marcador cuadrado de 10px**, nunca como fondo de header.
5. ✅ **Árbol de la vida**: la ilustración queda como **excepción explícita**, dentro de una caja v2 con `── ILUSTRACIÓN · excepción del sistema`. Hover/selección de zonas en `--primary` con trazo punteado; lista de zonas al costado como alternativa accesible.
6. ✅ **Avatar**: huevo en **estilo línea** — contorno 2px `--foreground`, relleno `--card`, grietas en ángulo recto, pintitas como píxeles cuadrados, sin degradés ni animación orgánica. Badge de etapa y burbuja como cajas v2.

## Checklist por pantalla

- [ ] Sin radios, sin sombras difusas, sin colores fuera de los tokens
- [ ] Todos los números en mono tabular, alineados a la derecha
- [ ] Un solo primario y un solo acento fuerte por bloque
- [ ] Probada en Claro y Oscuro
- [ ] Funciona a 400px de ancho sin scroll horizontal (salvo tablas, en su propio contenedor)
- [ ] ASCII decorativo con `aria-hidden`; máximo dos animaciones
- [ ] Foco visible en todo lo interactivo
- [ ] Contraste AA en ambos temas

*Última actualización: 2026-11-22*
