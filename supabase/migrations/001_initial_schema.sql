-- ============================================================
-- kopyme — initial schema
-- v2: indexes, comments, FK indexes
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table profiles (
  id            uuid references auth.users on delete cascade primary key,
  username      text unique not null,
  display_name  text,
  bio           text,
  avatar_style  jsonb not null default '{}'::jsonb,
  avatar_stage  text not null default 'egg'
                check (avatar_stage in ('egg','cracking','hatching','emerging','self')),
  avatar_points int not null default 0,
  language      text not null default 'es' check (language in ('es','en')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table profiles is 'Extended user profile. One row per auth.users entry.';
comment on column profiles.avatar_stage is 'Egg evolution stage derived from avatar_points. egg→cracking→hatching→emerging→self.';
comment on column profiles.avatar_points is 'Accumulated from meaningful actions: diary entries, habits logged, goals completed, memories created, etc.';
comment on column profiles.avatar_style is 'JSON with visual customization: character type, colors, accessories.';
comment on column profiles.language is 'UI language preference. es=Spanish, en=English.';

create index idx_profiles_username on profiles (username);

alter table profiles enable row level security;
create policy "Users can view own profile"   on profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- ============================================================
-- HABITS
-- ============================================================
create table habits (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users on delete cascade not null,
  name          text not null,
  icon          text,
  color         text,
  frequency     text not null default 'daily'
                check (frequency in ('daily','weekly','custom')),
  target_days   int[] not null default '{1,2,3,4,5,6,7}',
  visibility    text not null default 'private'
                check (visibility in ('private','friends','public')),
  archived      boolean not null default false,
  created_at    timestamptz not null default now()
);

comment on table habits is 'Recurring habits defined by the user.';
comment on column habits.target_days is 'Days of week when habit applies. 1=Monday … 7=Sunday (ISO).';
comment on column habits.archived is 'Archived habits are hidden from UI but logs are preserved for history.';

create index idx_habits_user_id           on habits (user_id);
create index idx_habits_user_archived     on habits (user_id, archived);

alter table habits enable row level security;
create policy "Users manage own habits" on habits for all using (auth.uid() = user_id);

-- ----
create table habit_logs (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users on delete cascade not null,
  habit_id      uuid references habits on delete cascade not null,
  logged_date   date not null,
  note          text,
  created_at    timestamptz not null default now(),
  unique (habit_id, logged_date)
);

comment on table habit_logs is 'One row per completed habit per day.';
comment on column habit_logs.logged_date is 'The calendar date the habit was completed. Unique per habit.';

create index idx_habit_logs_user_id         on habit_logs (user_id);
create index idx_habit_logs_habit_id        on habit_logs (habit_id);
create index idx_habit_logs_user_date       on habit_logs (user_id, logged_date desc);

alter table habit_logs enable row level security;
create policy "Users manage own habit_logs" on habit_logs for all using (auth.uid() = user_id);

-- ============================================================
-- MOOD
-- ============================================================
create table mood_entries (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users on delete cascade not null,
  entry_date    date not null,
  score         int not null check (score between 1 and 10),
  emotions      text[] not null default '{}',
  note          text,
  energy        int check (energy between 1 and 5),
  created_at    timestamptz not null default now(),
  unique (user_id, entry_date)
);

comment on table mood_entries is 'Daily mood snapshot. One entry per user per day.';
comment on column mood_entries.score is 'Overall mood from 1 (very bad) to 10 (excellent).';
comment on column mood_entries.emotions is 'Array of emotion tags: happy, anxious, grateful, tired, angry, nostalgic, excited, etc.';
comment on column mood_entries.energy is 'Energy level from 1 (exhausted) to 5 (full energy).';

create index idx_mood_entries_user_id       on mood_entries (user_id);
create index idx_mood_entries_user_date     on mood_entries (user_id, entry_date desc);

alter table mood_entries enable row level security;
create policy "Users manage own mood_entries" on mood_entries for all using (auth.uid() = user_id);

-- ============================================================
-- DIARY
-- ============================================================
create table diary_entries (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users on delete cascade not null,
  entry_date    date not null,
  title         text,
  body          text not null,
  mood_id       uuid references mood_entries on delete set null,
  tags          text[] not null default '{}',
  visibility    text not null default 'private'
                check (visibility in ('private','friends','public')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table diary_entries is 'Free-form personal diary entries. Multiple entries allowed per day.';
comment on column diary_entries.body is 'Markdown-formatted content.';
comment on column diary_entries.mood_id is 'Optional link to the mood entry of the same day.';
comment on column diary_entries.tags is 'User-defined tags for filtering and search.';

create index idx_diary_entries_user_id      on diary_entries (user_id);
create index idx_diary_entries_user_date    on diary_entries (user_id, entry_date desc);
create index idx_diary_entries_mood_id      on diary_entries (mood_id);
create index idx_diary_entries_tags         on diary_entries using gin (tags);

alter table diary_entries enable row level security;
create policy "Users manage own diary_entries" on diary_entries for all using (auth.uid() = user_id);

-- ============================================================
-- GOALS
-- ============================================================
create table goals (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users on delete cascade not null,
  title         text not null,
  description   text,
  category      text not null default 'personal'
                check (category in ('personal','health','career','travel','relationships','creative','other')),
  status        text not null default 'active'
                check (status in ('active','completed','paused','abandoned')),
  target_date   date,
  completed_at  timestamptz,
  visibility    text not null default 'private'
                check (visibility in ('private','friends','public')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table goals is 'Personal goals with category, deadline, and status tracking.';
comment on column goals.status is 'active=in progress, completed=done, paused=on hold, abandoned=consciously dropped.';
comment on column goals.completed_at is 'Timestamp when status was set to completed. Triggers avatar celebration.';

create index idx_goals_user_id             on goals (user_id);
create index idx_goals_user_status         on goals (user_id, status);
create index idx_goals_user_category       on goals (user_id, category);

alter table goals enable row level security;
create policy "Users manage own goals" on goals for all using (auth.uid() = user_id);

-- ----
create table goal_milestones (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users on delete cascade not null,
  goal_id       uuid references goals on delete cascade not null,
  title         text not null,
  completed     boolean not null default false,
  created_at    timestamptz not null default now()
);

comment on table goal_milestones is 'Checklist items inside a goal.';

create index idx_goal_milestones_user_id   on goal_milestones (user_id);
create index idx_goal_milestones_goal_id   on goal_milestones (goal_id);

alter table goal_milestones enable row level security;
create policy "Users manage own goal_milestones" on goal_milestones for all using (auth.uid() = user_id);

-- ============================================================
-- CONNECTIONS (Vínculos)
-- ============================================================
create table connections (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users on delete cascade not null,
  name            text not null,
  relationship    text not null
                  check (relationship in ('family','friend','romantic','colleague','other')),
  subtype         text,
  photo_url       text,
  birthday        date,
  notes           text,
  contact_goal    text,
  visibility      text not null default 'private'
                  check (visibility in ('private','friends','public')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table connections is 'People in the user''s life. The relationship graph nodes.';
comment on column connections.relationship is 'Top-level relationship type for graph clustering.';
comment on column connections.subtype is 'More specific label: mother, best friend, partner, etc.';
comment on column connections.contact_goal is 'How often the user wants to stay in touch: weekly, monthly, etc.';

create index idx_connections_user_id           on connections (user_id);
create index idx_connections_user_relationship on connections (user_id, relationship);

alter table connections enable row level security;
create policy "Users manage own connections" on connections for all using (auth.uid() = user_id);

-- ----
create table connection_interactions (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid references auth.users on delete cascade not null,
  connection_id     uuid references connections on delete cascade not null,
  interaction_date  date not null,
  type              text not null
                    check (type in ('call','in-person','message','letter','gift')),
  note              text,
  created_at        timestamptz not null default now()
);

comment on table connection_interactions is 'Log of interactions with a person. Used to track contact frequency.';

create index idx_conn_interactions_user_id       on connection_interactions (user_id);
create index idx_conn_interactions_connection_id on connection_interactions (connection_id);
create index idx_conn_interactions_date          on connection_interactions (connection_id, interaction_date desc);

alter table connection_interactions enable row level security;
create policy "Users manage own connection_interactions" on connection_interactions for all using (auth.uid() = user_id);

-- ============================================================
-- MEMORIES (Recuerdos)
-- ============================================================
create table memories (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users on delete cascade not null,
  title           text not null,
  type            text not null default 'event'
                  check (type in ('travel','event','anecdote','other')),
  description     text,
  location        text,
  location_coords jsonb,
  start_date      date,
  end_date        date,
  mood_score      int check (mood_score between 1 and 10),
  tags            text[] not null default '{}',
  visibility      text not null default 'private'
                  check (visibility in ('private','friends','public')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table memories is 'Life events, travels, and anecdotes. The richest module.';
comment on column memories.location_coords is 'GeoJSON point: {"lat": -34.6, "lng": -58.4}. Used for map view.';
comment on column memories.end_date is 'Null for single-day events. Multi-day for travels.';
comment on column memories.mood_score is 'How the user felt about this memory, 1-10.';

create index idx_memories_user_id          on memories (user_id);
create index idx_memories_user_type        on memories (user_id, type);
create index idx_memories_user_start_date  on memories (user_id, start_date desc);
create index idx_memories_tags             on memories using gin (tags);

alter table memories enable row level security;
create policy "Users manage own memories" on memories for all using (auth.uid() = user_id);

-- ----
create table memory_media (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users on delete cascade not null,
  memory_id       uuid references memories on delete cascade not null,
  storage_path    text not null,
  type            text not null check (type in ('photo','video','audio')),
  caption         text,
  taken_at        timestamptz,
  created_at      timestamptz not null default now()
);

comment on table memory_media is 'Photos, videos and audio attached to a memory. Stored in Supabase Storage.';
comment on column memory_media.storage_path is 'Path inside the Supabase Storage bucket, not a full URL.';

create index idx_memory_media_user_id      on memory_media (user_id);
create index idx_memory_media_memory_id    on memory_media (memory_id);

alter table memory_media enable row level security;
create policy "Users manage own memory_media" on memory_media for all using (auth.uid() = user_id);

-- ----
create table memory_connections (
  id              uuid primary key default uuid_generate_v4(),
  memory_id       uuid references memories on delete cascade not null,
  connection_id   uuid references connections on delete cascade not null,
  unique (memory_id, connection_id)
);

comment on table memory_connections is 'Many-to-many: which people were part of a memory.';

create index idx_memory_connections_memory_id     on memory_connections (memory_id);
create index idx_memory_connections_connection_id on memory_connections (connection_id);

alter table memory_connections enable row level security;
create policy "Users manage own memory_connections" on memory_connections for all
  using (exists (
    select 1 from memories
    where memories.id = memory_connections.memory_id
      and memories.user_id = auth.uid()
  ));

-- ============================================================
-- LETTERS & GIFTS
-- ============================================================
create table letters (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users on delete cascade not null,
  connection_id   uuid references connections on delete set null,
  direction       text not null check (direction in ('sent','received')),
  date            date not null,
  subject         text,
  body            text,
  storage_path    text,
  created_at      timestamptz not null default now()
);

comment on table letters is 'Physical or digital letters exchanged with people in the user''s life.';
comment on column letters.storage_path is 'Optional scan of a physical letter, stored in Supabase Storage.';
comment on column letters.direction is 'sent=written by user, received=written to user.';

create index idx_letters_user_id        on letters (user_id);
create index idx_letters_connection_id  on letters (connection_id);
create index idx_letters_date           on letters (user_id, date desc);

alter table letters enable row level security;
create policy "Users manage own letters" on letters for all using (auth.uid() = user_id);

-- ----
create table gifts (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users on delete cascade not null,
  connection_id   uuid references connections on delete set null,
  direction       text not null check (direction in ('given','received')),
  date            date not null,
  description     text not null,
  occasion        text,
  photo_url       text,
  created_at      timestamptz not null default now()
);

comment on table gifts is 'Gifts given or received. Linked to a person and optional occasion.';
comment on column gifts.occasion is 'Birthday, anniversary, random, holiday, etc.';

create index idx_gifts_user_id          on gifts (user_id);
create index idx_gifts_connection_id    on gifts (connection_id);
create index idx_gifts_date             on gifts (user_id, date desc);

alter table gifts enable row level security;
create policy "Users manage own gifts" on gifts for all using (auth.uid() = user_id);

-- ============================================================
-- AVATAR MESSAGES
-- ============================================================
create table avatar_messages (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users on delete cascade not null,
  message     text not null,
  context     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

comment on table avatar_messages is 'Log of messages the avatar has spoken to the user. Used to avoid repetition.';
comment on column avatar_messages.context is 'What triggered the message: {type: "streak", habit_id: "...", streak: 7}';

create index idx_avatar_messages_user_id    on avatar_messages (user_id);
create index idx_avatar_messages_user_date  on avatar_messages (user_id, created_at desc);

alter table avatar_messages enable row level security;
create policy "Users manage own avatar_messages" on avatar_messages for all using (auth.uid() = user_id);

-- ============================================================
-- UPDATED_AT trigger
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at       before update on profiles       for each row execute function update_updated_at();
create trigger diary_entries_updated_at  before update on diary_entries  for each row execute function update_updated_at();
create trigger goals_updated_at          before update on goals          for each row execute function update_updated_at();
create trigger connections_updated_at    before update on connections    for each row execute function update_updated_at();
create trigger memories_updated_at       before update on memories       for each row execute function update_updated_at();

-- ============================================================
-- Auto-create profile on signup
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, username, display_name)
  values (
    new.id,
    split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 4),
    split_part(new.email, '@', 1)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
