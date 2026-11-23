# UI Language

> Visual system (colors, type, components, motion, ASCII): **[DESIGN_MANUAL.md](DESIGN_MANUAL.md)** is the single source of truth. This file covers the product feel and the voice.

## The vibe

**A serious personal tool with the soul of a game.** Brutalist structure, minimal surface, a little ASCII where the system speaks. It should feel like a personal technical notebook you *want* to open every day — never a corporate dashboard, never childish.

**The tension to maintain:** it looks like a game but works like a serious tool. Never sacrifice usability for flavor.

The avatar (and the egg it hatches from) is still the identity anchor. Its visual treatment is pending — see "Migración" in the design manual.

---

## Layout

```
┌──────────┬──────────────────────────────────────┐
│ KOPYME/v2│  Título_                [tema] [◇]   │
│          │  [TAB · TAB · TAB]                   │
│ · TABLERO│                                      │
│ · ÁRBOL  │  [contenido del módulo]              │
│ · HÁBITOS│                                      │
│ ▸ ACTIVO │                                      │
│ · ...    │                                      │
└──────────┴──────────────────────────────────────┘
```

The dashboard is the default landing page.

---

## Voice & tone

**In Spanish (default):**
- Casual and warm — tuteo always ("¿cómo estás?" not "¿cómo está usted?")
- Never clinical or productivity-bro
- The avatar speaks like a friend who knows you well — direct, a bit cheeky, never preachy
- UI labels are short and literal (`+ Nuevo mes`, `Volver a hoy`); the personality lives in messages, not in buttons

**In English:**
- Same energy — casual, personal, not corporate
- "Hey, you haven't written in a week. Everything okay?" — not "You have 0 diary entries this week."

**Things to never say:**
- "Optimize your habits"
- "Track your productivity"
- "Unlock your potential"
- "Syncing..."

**Things that feel right:**
- "Hace 5 días que no escribís. ¿Pasó algo?"
- "Llevas 12 días seguidos. Eso no es cualquier cosa."
- "Hoy está tranquilo por acá."
- "3 años atrás hoy, te acordás?"
- "Esperabas +1.750, el patrimonio cambió +2.054."

---

## Iconography

- Prefer ASCII/Unicode markers (`▸ ● ◇ ▲ ▼ +`) and text labels over icons
- Where an icon is unavoidable: Lucide, 2px stroke, `currentColor`, never colored

---

## Mobile considerations

- Rail becomes a horizontal scrolling bar at the top under 960px
- Everything stacks to one column under 620px; wide tables scroll inside their own container
- All tap targets minimum 44px
- Touch-friendly sliders and checkboxes
