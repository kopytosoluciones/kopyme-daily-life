alter table habits add column if not exists goal_type text not null default 'boolean'
  check (goal_type in ('boolean', 'numeric', 'dropdown'));
alter table habits add column if not exists goal_options text[] not null default '{}';
alter table habits add column if not exists goal_unit text;
alter table habits add column if not exists goal_target text;

alter table habit_logs add column if not exists value text;

comment on column habits.goal_type is 'boolean=sí/no, numeric=valor numérico, dropdown=opciones personalizadas';
comment on column habits.goal_options is 'Opciones para type=dropdown. Ej: {mal,normal,bien}';
comment on column habits.goal_unit is 'Unidad para type=numeric. Ej: hs, vasos, km';
comment on column habits.goal_target is 'Valor objetivo. Ej: 8 para horas dormidas';
comment on column habit_logs.value is 'Valor loggeado. Para boolean: true/false. Para numeric: el número. Para dropdown: la opción elegida';
