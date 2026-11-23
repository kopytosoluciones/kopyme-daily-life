-- Supabase security advisor 0011: function_search_path_mutable.
-- now() lives in pg_catalog, which is always searched, so an empty search_path is safe.
alter function public.update_updated_at() set search_path = '';
