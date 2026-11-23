-- ============================================================
-- LIFE TREE — retroactive migration
-- The table was created from the Supabase dashboard (session 2026-09-21).
-- Idempotent: safe to run on the existing database.
-- ============================================================

create table if not exists life_tree_entries (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users on delete cascade not null,
  section     text not null
              check (section in ('raices','tronco','ramas','flores_frutos','sol','regadera','animales','viento','hojas_caidas')),
  body        text not null,
  entry_date  date not null default current_date,
  created_at  timestamptz not null default now()
);

comment on table life_tree_entries is 'Entradas del Árbol de la vida, una por sección y fecha.';

alter table life_tree_entries enable row level security;

drop policy if exists "Users manage own life tree entries" on life_tree_entries;
create policy "Users manage own life tree entries" on life_tree_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_life_tree_user_section_date
  on life_tree_entries (user_id, section, entry_date desc);
