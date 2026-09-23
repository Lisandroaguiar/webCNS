-- Sprint 7.1: ampliar cursadas personales sin tocar selecciones previas de Sprint 7.
alter table public.user_custom_schedule_slots
  add column if not exists location text,
  add column if not exists commission text,
  add column if not exists source_schedule_id bigint references public.course_schedules(id) on delete set null;

-- El usuario puede cursar más de una comisión/encuentro semanal de la misma materia.
alter table public.user_custom_schedule_slots
  drop constraint if exists user_custom_schedule_slots_user_id_subject_id_academic_year_semester_key;

create table if not exists public.user_calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 160),
  event_date date not null,
  start_time time,
  end_time time,
  location text,
  notes text,
  category text not null default 'personal' check (category in ('personal','facu','trabajo','otro')),
  recurrence_type text not null default 'none' check (recurrence_type in ('none','weekly')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time is null or (start_time is not null and end_time > start_time))
);

create index if not exists user_calendar_events_user_date_idx on public.user_calendar_events(user_id,event_date);
alter table public.user_calendar_events enable row level security;
create policy "Users read own calendar events" on public.user_calendar_events for select to authenticated using (user_id = auth.uid());
create policy "Users add own calendar events" on public.user_calendar_events for insert to authenticated with check (user_id = auth.uid());
create policy "Users edit own calendar events" on public.user_calendar_events for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users remove own calendar events" on public.user_calendar_events for delete to authenticated using (user_id = auth.uid());
grant select,insert,update,delete on public.user_calendar_events to authenticated;
revoke all on public.user_calendar_events from anon;
