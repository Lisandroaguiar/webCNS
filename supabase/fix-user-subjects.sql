-- Corrección aislada para el historial de materias.
-- Pegá y ejecutá TODO este bloque en una consulta nueva de Supabase.

alter table public.user_subjects
  add column if not exists status text default 'pending';

alter table public.user_subjects
  add column if not exists grade numeric(3,1);

alter table public.user_subjects
  add column if not exists passed_at date;

alter table public.user_subjects
  add column if not exists created_at timestamptz not null default now();

alter table public.user_subjects
  add column if not exists updated_at timestamptz not null default now();

notify pgrst, 'reload schema';

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'user_subjects'
order by ordinal_position;
