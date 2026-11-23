alter table finance_months add column if not exists reviewed_at timestamptz;

comment on column finance_months.reviewed_at is 'Cuándo el usuario marcó el mes como actualizado. null = por revisar (genera un aviso).';
