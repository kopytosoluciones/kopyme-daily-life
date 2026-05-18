# UI Language & Design System

## The vibe

**Modern-retro cartoon.** Think: Animal Crossing meets a vintage illustrated journal meets a smooth 2024 web app. Warm, tactile, alive — but not childish. It should feel like something you *want* to open every day.

The egg is the visual identity anchor. Before you know yourself, there's an egg. The cracks are the story. The avatar that emerges is *you* — shaped by what you've lived and documented.

Reference points:
- Animal Crossing / Stardew Valley — warm colors, soft UI, characters with personality
- Moleskine / Field Notes — analog texture, journaling intimacy
- Duolingo — gamified progress, character reactions (but less aggressive about it)
- Linear / Notion — clean structure underneath the warmth

**The tension to maintain:** It looks like a game but works like a serious personal tool. Never sacrifice usability for cuteness.

---

## Layout

```
┌─────────────────────────────────────────────────┐
│  [sidebar]  │  [main content]                   │
│             │                                   │
│  kopyme     │  [avatar + greeting]               │
│  logo       │                                   │
│  ─────────  │  [module content]                 │
│  habits     │                                   │
│  mood       │                                   │
│  diary      │                                   │
│  goals      │                                   │
│  vínculos   │                                   │
│  recuerdos  │                                   │
│  cartas     │                                   │
│  chat       │                                   │
│  ─────────  │                                   │
│  [profile]  │                                   │
│  [settings] │                                   │
└─────────────────────────────────────────────────┘
```

The avatar lives on the **dashboard** (default landing page), centered in the main area, always reacting to today's data.

---

## Colors

**Base palette — warm and analog:**
```
background:    #F5F0E8   (warm off-white, like aged paper)
surface:       #FDFAF4   (slightly lighter card background)
border:        #E2D9C8   (soft warm gray)
text-primary:  #2C2416   (dark warm brown, not pure black)
text-secondary:#7A6E5F   (muted warm gray)

accent-1:      #E07B4A   (terracotta — primary action color)
accent-2:      #4A8FA8   (muted teal — secondary)
accent-3:      #7CB87A   (sage green — success/habits)
accent-4:      #C17A9E   (dusty rose — emotions/mood)
accent-5:      #E8C84A   (warm yellow — goals/celebrations)
```

**Dark mode** (optional Phase 1+):
```
background:    #1C1A14
surface:       #252318
text-primary:  #F0EAD8
```

---

## Typography

- **Headings:** A serif with personality — something like `Lora` or `Playfair Display`
- **Body:** Clean sans-serif — `Inter` or `DM Sans`
- **Avatar speech / diary prompts:** Slightly rounded, friendly — `Nunito` or `Quicksand`
- **Numbers / data:** Monospace for streaks and dates — `JetBrains Mono` or `Fira Code`

Type scale:
```
xs:   12px
sm:   14px
base: 16px
lg:   18px
xl:   24px
2xl:  32px
3xl:  48px
```

---

## Animation principles

- **Everything moves, but gently.** No snappy hard cuts. Ease-in-out on all transitions.
- **Avatar is always slightly alive** — idle breathing loop, occasional blink, small reaction animations
- **Page transitions:** fade + slight upward slide (not dramatic, just alive)
- **Loading states:** skeleton screens that feel like paper being filled in
- **Micro-interactions:** habit checkbox bounces lightly when checked, streak number pops when it increases
- **Duration guide:**
  - Micro (hover, checkbox): 100-150ms
  - Navigation / modal: 200-250ms
  - Avatar reactions: 400-600ms
  - Celebrations (goal complete): 800ms-1s

---

## Components (key patterns)

### Cards
Rounded corners (12-16px), warm shadow (not dark — warm brown opacity), slight paper texture possible via CSS.

### Sidebar
Fixed left, collapsible on mobile. Module icons + labels. Active state: soft warm highlight, not a hard box.

### Buttons
- **Primary:** terracotta fill, slightly rounded, small shadow
- **Secondary:** outlined in warm gray
- **Ghost:** text only, terracotta on hover
- **Destructive:** muted red, never bright

### Mood scale
Not numbers — illustrated faces or a smooth gradient slider with color (red → yellow → green).

### Habit checkbox
Bigger than standard, satisfying to tap. Animated check. Shows streak count inline.

---

## Voice & tone

**In Spanish (default):**
- Casual and warm — tuteo always ("¿cómo estás?" not "¿cómo está usted?")
- Never clinical or productivity-bro
- The avatar speaks like a friend who knows you well — direct, a bit cheeky, never preachy

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

---

## Iconography

- Custom illustrated icons preferred over generic icon libraries
- Fallback: Lucide icons (already in shadcn/ui) — clean enough
- Module icons should have a hand-drawn quality, not pure geometric

---

## Mobile considerations

- Sidebar collapses to bottom tab bar on mobile
- Avatar moves to top of screen on mobile, smaller
- All tap targets minimum 44px
- Touch-friendly mood slider and habit checkboxes
