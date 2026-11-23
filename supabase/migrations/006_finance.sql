-- ============================================================
-- COMBUSTIBLE — finanzas personales
-- Modelo: billeteras (con moneda y tipo) × meses. Cada mes guarda un saldo por billetera.
-- Totales, patrimonio, diferencia y desvío se calculan en la app (lib/finance/calc.ts);
-- solo se persisten los valores pisados a mano en finance_months.overrides.
-- Todo se expresa en USD; fx_rates convierte las demás monedas.
-- ============================================================

-- ------------------------------------------------------------
-- WALLETS
-- ------------------------------------------------------------
create table finance_wallets (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users on delete cascade not null default auth.uid(),
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  currency    text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  kind        text not null default 'asset' check (kind in ('asset','debt')),
  sort_order  int not null default 0,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (id, user_id)
);

comment on table finance_wallets is 'Billeteras: cuentas, efectivo y deudas. Una deuda guarda su saldo en positivo y resta del patrimonio.';
comment on column finance_wallets.currency is 'Código ISO 4217 (USD, ARS, EUR…).';
comment on column finance_wallets.kind is 'asset suma al patrimonio · debt resta.';
comment on column finance_wallets.archived_at is 'Archivada: deja de aparecer en meses nuevos pero conserva su historial.';

alter table finance_wallets enable row level security;
create policy "Users manage own finance wallets" on finance_wallets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index idx_finance_wallets_user_order on finance_wallets (user_id, sort_order);

-- ------------------------------------------------------------
-- MONTHS
-- ------------------------------------------------------------
create table finance_months (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users on delete cascade not null default auth.uid(),
  month       date not null check (extract(day from month) = 1),
  fx_rates    jsonb not null default '{}'::jsonb check (jsonb_typeof(fx_rates) = 'object'),
  income      numeric(14,2) not null default 0,
  expense     numeric(14,2) not null default 0,
  invoiced    numeric(14,2),
  comment     text,
  overrides   jsonb not null default '{}'::jsonb check (jsonb_typeof(overrides) = 'object'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, month),
  unique (id, user_id)
);

comment on table finance_months is 'Un registro por usuario y mes (Bitácora). Ingreso y gasto en USD.';
comment on column finance_months.month is 'Primer día del mes.';
comment on column finance_months.fx_rates is 'Unidades de cada moneda por 1 USD. Ej: {"ARS": 1465}.';
comment on column finance_months.invoiced is 'Facturado del mes. Dato fiscal: no entra en ningún cálculo.';
comment on column finance_months.overrides is 'Valores calculados pisados a mano. Claves: totals.<CUR>, converted.<CUR>, patrimony, diff.';

alter table finance_months enable row level security;
create policy "Users manage own finance months" on finance_months
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger finance_months_updated_at before update on finance_months
  for each row execute function update_updated_at();

-- ------------------------------------------------------------
-- BALANCES
-- ------------------------------------------------------------
create table finance_balances (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null default auth.uid(),
  month_id    uuid not null,
  wallet_id   uuid not null,
  amount      numeric(16,2) not null default 0,
  updated_at  timestamptz not null default now(),
  unique (month_id, wallet_id),
  -- Composite FKs: un saldo solo puede unir un mes y una billetera del mismo usuario.
  foreign key (month_id, user_id)  references finance_months (id, user_id)  on delete cascade,
  foreign key (wallet_id, user_id) references finance_wallets (id, user_id) on delete cascade
);

comment on table finance_balances is 'Saldo de una billetera en un mes, en la moneda de la billetera.';

alter table finance_balances enable row level security;
create policy "Users manage own finance balances" on finance_balances
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index idx_finance_balances_wallet on finance_balances (wallet_id);
create index idx_finance_balances_user   on finance_balances (user_id);

create trigger finance_balances_updated_at before update on finance_balances
  for each row execute function update_updated_at();
