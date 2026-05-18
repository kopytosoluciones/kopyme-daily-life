# Data Model

All tables include `user_id uuid references auth.users not null` and RLS policies. Timestamps are `created_at` and `updated_at` unless noted.

---

## users (managed by Supabase Auth)
Extended via `profiles` table.

## profiles
```sql
id            uuid references auth.users primary key
username      text unique
display_name  text
bio           text
avatar_style  jsonb    -- color, character type, accessories
avatar_state  text     -- energized | neutral | sad | nostalgic | celebratory
language      text default 'es'  -- 'es' | 'en'
created_at    timestamptz
updated_at    timestamptz
```

---

## Habit Tracker

### habits
```sql
id          uuid primary key
user_id     uuid references auth.users
name        text
icon        text          -- emoji or icon key
color       text
frequency   text          -- daily | weekly | custom
target_days int[]         -- [1,2,3,4,5] = Mon-Fri
visibility  text default 'private'
archived    boolean default false
created_at  timestamptz
```

### habit_logs
```sql
id          uuid primary key
user_id     uuid references auth.users
habit_id    uuid references habits
logged_date date
note        text
created_at  timestamptz
```

---

## Mood Tracker

### mood_entries
```sql
id          uuid primary key
user_id     uuid references auth.users
entry_date  date
score       int           -- 1-10
emotions    text[]        -- ['happy', 'anxious', 'grateful']
note        text
energy      int           -- 1-5
created_at  timestamptz
```

---

## Diary

### diary_entries
```sql
id          uuid primary key
user_id     uuid references auth.users
entry_date  date
title       text
body        text          -- rich text (markdown)
mood_id     uuid references mood_entries  -- optional link
tags        text[]
visibility  text default 'private'
created_at  timestamptz
updated_at  timestamptz
```

---

## Goals

### goals
```sql
id            uuid primary key
user_id       uuid references auth.users
title         text
description   text
category      text    -- personal | health | career | travel | relationships | creative | other
status        text    -- active | completed | paused | abandoned
target_date   date
completed_at  timestamptz
visibility    text default 'private'
created_at    timestamptz
updated_at    timestamptz
```

### goal_milestones
```sql
id          uuid primary key
user_id     uuid references auth.users
goal_id     uuid references goals
title       text
completed   boolean default false
created_at  timestamptz
```

---

## Connections (Vínculos)

### connections
```sql
id              uuid primary key
user_id         uuid references auth.users
name            text
relationship    text    -- family | friend | romantic | colleague | other
subtype         text    -- e.g. 'mother', 'best friend', 'partner'
photo_url       text
birthday        date
notes           text
contact_goal    text    -- monthly | weekly | etc (how often you want to stay in touch)
visibility      text default 'private'
created_at      timestamptz
updated_at      timestamptz
```

### connection_interactions
```sql
id              uuid primary key
user_id         uuid references auth.users
connection_id   uuid references connections
interaction_date date
type            text    -- call | in-person | message | letter | gift
note            text
created_at      timestamptz
```

---

## Memories (Recuerdos)

### memories
```sql
id              uuid primary key
user_id         uuid references auth.users
title           text
type            text        -- travel | event | anecdote | other
description     text
location        text
location_coords jsonb       -- {lat, lng}
start_date      date
end_date        date        -- null for single-day
mood_score      int         -- 1-10
tags            text[]
visibility      text default 'private'
created_at      timestamptz
updated_at      timestamptz
```

### memory_media
```sql
id              uuid primary key
user_id         uuid references auth.users
memory_id       uuid references memories
storage_path    text        -- Supabase Storage path
type            text        -- photo | video | audio
caption         text
taken_at        timestamptz
created_at      timestamptz
```

### memory_connections (many-to-many: memories ↔ people)
```sql
id              uuid primary key
memory_id       uuid references memories
connection_id   uuid references connections
```

---

## Letters & Gifts (Cartas y Regalos)

### letters
```sql
id              uuid primary key
user_id         uuid references auth.users
connection_id   uuid references connections
direction       text    -- sent | received
date            date
subject         text
body            text
storage_path    text    -- scanned letter if physical
created_at      timestamptz
```

### gifts
```sql
id              uuid primary key
user_id         uuid references auth.users
connection_id   uuid references connections
direction       text    -- given | received
date            date
description     text
occasion        text
photo_url       text
created_at      timestamptz
```

---

## Chat

### chat_rooms
```sql
id          uuid primary key
type        text    -- direct | group
name        text    -- for group chats
created_by  uuid references auth.users
created_at  timestamptz
```

### chat_participants
```sql
room_id     uuid references chat_rooms
user_id     uuid references auth.users
joined_at   timestamptz
primary key (room_id, user_id)
```

### chat_messages
```sql
id          uuid primary key
room_id     uuid references chat_rooms
user_id     uuid references auth.users
body        text
created_at  timestamptz
```

---

## Avatar / AI

### avatar_messages
```sql
id          uuid primary key
user_id     uuid references auth.users
message     text        -- what the avatar said
context     jsonb       -- what triggered it (mood, streak, memory, etc)
created_at  timestamptz
```

---

## Notes on design decisions

- `visibility` on content tables defaults to `private` — users must actively choose to share
- `connection_id` in memories, letters, gifts creates a rich "this happened with this person" graph
- Mood entries are separate from diary entries but can be linked — you can log mood without writing anything
- `goal_milestones` is a lightweight checklist inside a goal, not a separate feature
- Chat uses Supabase Realtime — no extra service needed
