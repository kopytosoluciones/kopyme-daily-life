create table todos (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users on delete cascade not null,
  title       text not null,
  completed   boolean not null default false,
  due_date    date,
  priority    text not null default 'medium'
              check (priority in ('low','medium','high')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table todos is 'Tareas cortas del día a día. Sin categorías forzadas, captura rápida.';
comment on column todos.priority is 'low | medium | high';
comment on column todos.due_date is 'Fecha límite opcional.';

alter table todos enable row level security;
create policy "Users manage own todos" on todos for all using (auth.uid() = user_id);
create index idx_todos_user_id        on todos (user_id);
create index idx_todos_user_completed on todos (user_id, completed);

create trigger todos_updated_at before update on todos
  for each row execute function update_updated_at();
