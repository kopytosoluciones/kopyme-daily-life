-- ============================================================
-- VÍNCULOS — grupos
-- Pasa Vínculos de localStorage a Supabase. Un grupo es una tabla arrastrable en el mapa
-- (pos_x/pos_y relativos al centro "vos" = 0,0). Las personas usan la tabla connections existente.
-- ============================================================

create table connection_groups (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users on delete cascade not null default auth.uid(),
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  kind        text not null default 'amistad'
              check (kind in ('amistad','familia','trabajo','comunidad','otro')),
  pos_x       int not null default 0,
  pos_y       int not null default 0,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, user_id)
);

comment on table connection_groups is 'Grupos de vínculos (Podcast, Familia, Atom…). Cada uno es una tabla en el mapa.';
comment on column connection_groups.kind is 'Tipo de grupo: amistad | familia | trabajo | comunidad | otro.';
comment on column connection_groups.pos_x is 'Posición en el mapa, relativa al centro (vos).';

alter table connection_groups enable row level security;
create policy "Users manage own connection groups" on connection_groups
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index idx_connection_groups_user on connection_groups (user_id, sort_order);

create trigger connection_groups_updated_at before update on connection_groups
  for each row execute function update_updated_at();

-- Personas: grupo, afinidad y último contacto.
alter table connections
  add column if not exists group_id     uuid,
  add column if not exists affinity     int not null default 5 check (affinity between 1 and 10),
  add column if not exists last_contact date;

alter table connections alter column relationship set default 'other';

-- FK compuesta: una persona solo puede estar en un grupo del mismo usuario.
-- Al borrar el grupo, la persona queda sin grupo (solo se anula group_id).
alter table connections add constraint connections_group_fkey
  foreign key (group_id, user_id) references connection_groups (id, user_id)
  on delete set null (group_id);

create index if not exists idx_connections_group on connections (group_id);
