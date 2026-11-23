alter table profiles
  add column if not exists theme text not null default 'system'
  check (theme in ('system', 'light', 'dark'));

comment on column profiles.theme is 'UI theme preference. system follows the OS; mirrored in the kopyme-theme cookie to render without flash.';
