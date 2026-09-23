insert into public.data_sources (key, name, source_type, index_url, current_resource_url, parser_key)
values ('admin-manual-schedules', 'Horarios cargados por administración', 'course_schedule', 'https://web-cns.vercel.app/admin/horarios', 'https://web-cns.vercel.app/admin/horarios', 'manual')
on conflict (key) do nothing;

create table if not exists public.admin_schedule_overrides (
  course_schedule_id bigint primary key references public.course_schedules(id) on delete cascade,
  changes jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.admin_schedule_overrides enable row level security;
revoke all on public.admin_schedule_overrides from anon, authenticated;
