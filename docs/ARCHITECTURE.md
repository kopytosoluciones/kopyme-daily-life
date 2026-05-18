# Architecture

## Core decisions

### Multi-tenant from day one
Every table has `user_id uuid references auth.users` and Row Level Security (RLS) enabled. Building single-user first but the schema is already multi-user. Adding new users = zero migration work.

### Privacy model (future)
Each content type will have a `visibility` field:
- `private` — only the owner
- `friends` — users with accepted connection
- `public` — anyone

This is not implemented in Phase 1 but the field exists in the schema from the start.

### Supabase as the backend
We use Supabase for: PostgreSQL DB, Auth, Storage (photos/videos), and Realtime (chat). One service handles everything — no glue code between auth and DB.

---

## Stack

| Layer | Tool | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | Full-stack, TypeScript, easy Vercel deploy |
| Database | Supabase (PostgreSQL) | Auth + DB + Storage + Realtime in one |
| ORM | Supabase JS client + raw SQL migrations | Simple, no abstraction overhead |
| Styles | Tailwind CSS + shadcn/ui | Fast, consistent, customizable |
| AI | Claude API (claude-sonnet-4-6) | Avatar personality, diary prompts, "psychologist" mode |
| Visualizations | Recharts | Mood/habit charts |
| Relationship map | React Flow | Interactive graph for connections |
| i18n | next-intl | ES/EN, extensible |
| Media | Supabase Storage | Photos and videos for memories |
| Hosting | Vercel | Zero-config Next.js deploy |

---

## Avatar system

The avatar is central to the UX — it's not decoration.

**How it works:**
1. User customizes an avatar (style, colors, name)
2. The avatar has a `state` derived from recent data: mood score, habit streak, last diary entry
3. Claude API receives that state as context and generates a short message/reaction
4. The avatar "speaks" or animates based on mood: happy, tired, nostalgic, energized, etc.

**Avatar states (initial):**
- `energized` — good mood + habits on track
- `neutral` — nothing logged recently
- `sad` — low mood logged
- `nostalgic` — triggered by memories or anniversaries
- `celebratory` — goal completed, streak milestone

---

## Key architectural constraints

1. **No business logic in components** — all DB access via `lib/supabase/`
2. **RLS on every table** — never trust client-side user_id
3. **Optimistic UI** — updates feel instant, sync in background
4. **Media always goes through Supabase Storage** — never embed base64 in DB
5. **i18n from day one** — no hardcoded strings in components, always use `t()`

---

## What could change

| If we add... | What changes |
|---|---|
| Mobile app | Add React Native app using same Supabase backend — no backend changes |
| More AI features | Expand Claude API usage — no architecture change |
| Complex graph viz | Replace React Flow with D3.js — isolated component change |
| Offline support | Add service worker + local SQLite sync — additive |
