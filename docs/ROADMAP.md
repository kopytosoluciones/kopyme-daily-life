# Roadmap

Built incrementally. Each phase is shippable and usable on its own.

---

## Phase 0 — Foundation ✅ COMPLETA
**Goal:** Project exists, connects to Supabase, deploys to Vercel.

- [x] Create Supabase project + get API keys
- [x] Scaffold Next.js 14 app (TypeScript, App Router, Tailwind, shadcn/ui)
- [x] Connect Supabase client (browser + server + admin)
- [x] Set up next-intl (ES/EN)
- [x] Create DB migrations — all tables + indexes + RLS + comments
- [x] Design system: colores, tipografía, animaciones del huevo

**Nota:** trigger `handle_new_user` eliminado — perfil se crea en register action con admin client.

---

## Phase 1 — Identity & The Egg 🟡 EN PROGRESO
**Goal:** You can create an account, meet your egg, and see the dashboard.

- [x] Auth: register, login (Supabase Auth)
- [x] Profile creation automática en register action
- [x] Dashboard layout: egg/avatar center, sidebar left con 7 módulos
- [x] Egg SVG animado con breathing, glow y float
- [x] Barra de progreso hacia siguiente etapa
- [x] Quick actions en dashboard
- [ ] Logout
- [ ] Sistema de puntos (avatar_points) que dispara evolución del huevo
- [ ] Primera grieta al completar primera acción real

**Pendiente al retomar:** borrar usuario a medias en Supabase Auth, registrarse y verificar dashboard.

---

## Phase 2 — Daily Life (Core Loop)
**Goal:** The core daily ritual: log mood, check habits, write diary.

- [ ] Habit tracker: create, archive, log, streaks, heatmap
- [ ] Mood tracker: daily score, emotion tags, energy level
- [ ] Diary: rich text entries, tags, calendar view, search
- [ ] Link mood → diary entry
- [ ] Avatar reacts to mood + habit data (still static logic, no AI)

**Done when:** You can use kopyme every day as a personal tracker.

---

## Phase 3 — Goals & People
**Goal:** Track what you want to achieve and who matters to you.

- [ ] Goals: create, milestones, status, categories
- [ ] Goal completed → avatar celebrates
- [ ] Connections: create person, log interactions, contact goal
- [ ] Relationship map (React Flow): visual graph of connections
- [ ] Avatar notices when you haven't contacted someone in a while

**Done when:** You have a living map of your relationships and goals.

---

## Phase 4 — Memory & History
**Goal:** Document your past. Photos, places, people, stories.

- [ ] Memories: create, attach media, tag people, location
- [ ] Memory timeline + map view
- [ ] "On this day" surface on dashboard
- [ ] Letters: log sent/received, link to person
- [ ] Gifts: log given/received, link to person

**Done when:** kopyme starts to feel like a life archive.

---

## Phase 5 — Sharing & Social
**Goal:** Connect with other kopyme users and share selective content.

- [ ] User search / connect (friend request system)
- [ ] Share a memory, diary entry, or mood with a specific friend
- [ ] "Shared with me" inbox
- [ ] Short reactions/replies to shared content
- [ ] (Future) Full real-time chat if there's genuine demand

**Done when:** kopyme has a meaningful social layer, not just another messaging app.

---

## Phase 6 — AI Avatar
**Goal:** The avatar becomes truly alive — contextual, reflective, insightful.

- [ ] Integrate Claude API
- [ ] Avatar generates daily message based on user context
- [ ] "Deep dive" guided reflection mode
- [ ] Weekly emotional summary
- [ ] Pattern detection hints ("you feel better when...")

**Done when:** The avatar feels like it knows you.

---

## Phase 7 — Multi-user & Privacy
**Goal:** Each user controls what they share and with whom.

- [ ] Visibility controls on all content (private / friends / public)
- [ ] Public profile page
- [ ] Friends' content feed (optional)
- [ ] Per-item sharing (share this memory with this person)

**Done when:** kopyme works as a small community, not just a solo app.

---

## Principles

- **Never sacrifice depth for width** — one module done well beats three done halfway
- **Each phase must feel good to use** — don't rush to the next phase if the current one feels unfinished
- **The data model is frozen after Phase 0** — schema changes are expensive; think hard before starting
