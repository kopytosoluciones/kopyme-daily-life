# 📱 Design Manual - Life Tamagochi App

## Visión General
App minimalista, 2D, estética psicodélica moderna. Blanco/negro dominante con acentos de rosa, violeta y verde (pastel/neón). Tipografía experimental, animaciones sutiles. Tono: intrigante, divertido, con toque de suspenso.

---

## 🎨 Paleta de Colores

### Base
- **Blanco**: `#FFFFFF` (fondos, espacios negativos)
- **Negro**: `#0A0A0A` (texto, bordes, jerarquía)
- **Gris neutro**: `#F5F5F5` (fondos secundarios, divisores)

### Acentos Pastel
- **Rosa Pastel**: `#F4A9D6`
- **Violeta Pastel**: `#D9B3E8`
- **Verde Pastel**: `#B8E8C1`

### Acentos Neón
- **Rosa Neón**: `#FF1493` (alertas, CTA, énfasis)
- **Violeta Neón**: `#9D4EDD` (secundario, destacados)
- **Verde Neón**: `#39FF14` (success, positivo, interactivo)

### Reglas de uso
- Base: 90% blanco/negro
- Pastel: interacciones suaves, fondos, transiciones
- Neón: botones, estados activos, micro-interacciones
- Máx 2 acentos por pantalla

---

## 🔤 Tipografía

### Primaria: **Inter** (sans-serif moderna, experimental)
- Weights: 400, 600, 700
- Uso: body, UI, navegación
- Característica: limpia, legible, contemporánea

### Secundaria: **IBM Plex Mono** (monospace, intriga)
- Weight: 500
- Uso: estadísticas, datos, elementos "glitch"
- Característica: futurista, técnica, atrae atención

### Terciaria: **Playfair Display** (serif experimental)
- Weight: 700
- Uso: títulos principales, momentos clave
- Característica: drama, sofisticación, suspense

### Escala tipográfica
- H1: Playfair Display, 32px, 700
- H2: Inter, 24px, 600
- H3: Inter, 18px, 600
- Body: Inter, 14px, 400
- Caption: IBM Plex Mono, 12px, 500
- CTA: Inter, 14px, 700

---

## 🎭 Componentes Visuales

### Botones
- **Estado default**: Borde negro 2px, fondo blanco, texto negro
- **State hover**: Fondo pastel del color correspondiente, borde neón sutil
- **State active**: Fondo neón, texto blanco, sombra suave
- Border-radius: 8px
- Padding: 12px 24px
- Transición: 200ms ease-out

### Tarjetas
- Fondo: Blanco puro
- Borde: Negro 1px o pastel 1px (según contexto)
- Border-radius: 12px
- Sombra: 0 2px 8px rgba(0,0,0,0.05)
- Padding: 16px
- Hover: sombra aumenta a 0 4px 12px rgba(0,0,0,0.1)

### Iconografía
- Estilo: Geométrico, líneas limpias
- Peso: 2px (strokes)
- Colores: Negro primario, acentos neón para estados
- Tamaño base: 24px, escalable a 16px, 32px, 48px

### Inputs
- Fondo: Gris neutro
- Borde: Negro 1px (focus: neón del color correspondiente)
- Radius: 8px
- Padding: 10px 12px
- Focus state: borde neón 2px, sombra pastel suave

### Divisores
- Color: Gris neutro
- Grosor: 1px
- Opacidad: 100%
- Uso: separar secciones, nunca más de 3 por vista

---

## ✨ Animaciones

### Regla General
- **Frecuencia**: Máximo 2-3 animaciones por pantalla
- **Duración**: 300-500ms
- **Easing**: ease-out (sensación moderna, no linear)
- **Intensidad**: Muy sutiles, apenas perceptibles

### Tipos permitidos

**1. Fade In**
- Elementos que aparecen
- Duración: 300ms
- Opacidad: 0 → 1
- Easing: ease-out

**2. Slide Up**
- Modales, notificaciones, contenido nuevo
- Duración: 400ms
- Transform: translateY(20px) → 0
- Easing: ease-out

**3. Scale Pulse**
- Botones activos, elementos interactivos
- Duración: 200ms
- Transform: scale(1) → scale(1.05) → scale(1)
- Trigger: hover, click

**4. Color Transition**
- Estados (pastel → neón)
- Duración: 300ms
- Easing: ease-out
- Nunca cambios abruptos

**5. Glow Subtle**
- Elementos destacados, momentos clave
- Duración: 2s (loop)
- Box-shadow: 0 0 0px → 0 0 8px (neón)
- Opacidad: 0 → 0.3 → 0

### NO permitido
- Rotaciones excesivas
- Bounces
- Flashes rápidos
- Múltiples animaciones simultáneas en mismo elemento

---

## 📐 Espaciado

### Sistema modular (8px base)
- xs: 4px (micro-espacios)
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- xxl: 48px

### Aplicación
- Padding componentes: md (16px)
- Margin entre elementos: lg (24px)
- Padding pantalla: lg (24px)
- Espacio entre filas/items: md (16px)

---

## 🔲 Grid & Layout

- **Mobile-first**: 100% width
- **Breakpoints**: 
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px
- **Máximo ancho contenedor**: 1200px, centrado
- **Columnas**: 12 col system
- **Gutters**: md (16px) en mobile, lg (24px) en desktop

---

## 🎪 Efectos Visuales Especiales

### Glitch Effect (elemento 2D psicodélico)
- Desplazamiento mínimo de píxeles (2-3px)
- RGB shift sutil
- Duración: 200ms
- Uso: momentos especiales, logros, cambios importantes

### Vignette Sutil
- Bordes oscuros suaves (40% opacidad)
- Usa en fondos principales
- Nunca completo, apenas perceptible

### Line Patterns
- Líneas geométricas de fondo (5% opacidad)
- Orientación: diagonales sutiles
- Color: pastel o gris muy claro
- Uso: fondos de secciones, divisores visuales

---

## 📏 Sombras

- **Suave**: 0 2px 8px rgba(0,0,0,0.05)
- **Media**: 0 4px 12px rgba(0,0,0,0.1)
- **Profunda**: 0 8px 24px rgba(0,0,0,0.15)
- Nunca usar negro puro, siempre con alpha bajo

---

## 🎬 Implementación en Código

### Variables CSS
```css
--color-primary-black: #0A0A0A;
--color-primary-white: #FFFFFF;
--color-neutral-gray: #F5F5F5;

--color-accent-pink-pastel: #F4A9D6;
--color-accent-pink-neon: #FF1493;
--color-accent-violet-pastel: #D9B3E8;
--color-accent-violet-neon: #9D4EDD;
--color-accent-green-pastel: #B8E8C1;
--color-accent-green-neon: #39FF14;

--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;
--spacing-xxl: 48px;

--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;

--transition-fast: 200ms ease-out;
--transition-standard: 300ms ease-out;
--transition-slow: 400ms ease-out;
```

---

## ⚡ Checklist de Implementación

- [ ] Importar fuentes (Inter, IBM Plex Mono, Playfair Display)
- [ ] Establecer variables CSS globales
- [ ] Crear componentes base (botón, tarjeta, input, icon)
- [ ] Configurar animaciones (max 2 por pantalla)
- [ ] Validar contraste (WCAG AA mínimo)
- [ ] Testear en mobile first
- [ ] Review de paleta en distintas iluminaciones
- [ ] Documentar componentes custom

---

## 🎨 Notas Finales

- **Minimalismo**: Si dudas, elimina. La intriga viene de lo subtil.
- **Coherencia**: Mantén la paleta consistente en toda la app.
- **Respiración**: Usa espacios negativos (blanco) como elemento de diseño.
- **Accesibilidad**: Siempre suficiente contraste (texto negro sobre pastel OK, blanco sobre pastel requiere revisión).
- **Performance**: Animaciones sutiles < pesadas; SVG para iconos.

*Last updated: 2026*
