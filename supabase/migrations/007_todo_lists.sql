-- ============================================================
-- CHECKLISTS — retroactive migration
-- todo_lists and the extra todos columns were created from the Supabase dashboard
-- (session 2026-06-15). Mirrors the production schema read on 2026-11-22. Idempotent.
-- ============================================================

create table if not exists todo_lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade not null,
  name        text not null,
  color       text not null default '#E07B4A',
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table todo_lists enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'todo_lists' and policyname = 'users manage own lists') then
    create policy "users manage own lists" on todo_lists for all using (auth.uid() = user_id);
  end if;
end $$;

create index if not exists todo_lists_user_id_idx on todo_lists (user_id);

alter table todos add column if not exists completed_at timestamptz;
alter table todos add column if not exists list_id uuid references todo_lists (id) on delete cascade;
alter table todos add column if not exists position int;

create index if not exists todos_list_id_idx on todos (list_id);
