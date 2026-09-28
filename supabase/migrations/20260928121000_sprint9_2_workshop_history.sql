-- El requisito curricular ya existe en curriculum_requirements. Estas tablas
-- guardan la actividad efectivamente cursada, sin asignarla a lugares I-IV.
create table if not exists public.plastic_workshop_options (
  id text primary key,
  orientation_id text not null references public.academic_orientations(id),
  academic_name text not null,
  siu_name text,
  official_code text,
  verification_status text not null default 'manual_review'
    check (verification_status in ('verified','manual_review')),
  source_document text,
  unique (orientation_id, academic_name)
);
alter table public.plastic_workshop_options enable row level security;
create policy plastic_workshop_options_read on public.plastic_workshop_options
  for select to anon,authenticated using (true);
grant select on public.plastic_workshop_options to anon,authenticated;

create table if not exists public.user_workshop_history (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.user_enrollments(id) on delete cascade,
  raw_name text not null check (length(trim(raw_name)) between 2 and 250),
  workshop_option_id text references public.plastic_workshop_options(id),
  activity_kind text not null check (activity_kind in ('basic','complementary','credit')),
  status text not null check (status in ('pending','regular','passed')),
  grade numeric(3,1) check (grade between 1 and 10),
  passed_at date,
  source text not null default 'manual' check (source in ('manual','analytic')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (enrollment_id,raw_name,activity_kind)
);
create index if not exists user_workshop_history_enrollment on public.user_workshop_history(enrollment_id);
alter table public.user_workshop_history enable row level security;
create policy user_workshop_history_owner on public.user_workshop_history for all to authenticated
  using (exists (select 1 from public.user_enrollments e where e.id = enrollment_id and e.user_id = auth.uid()))
  with check (exists (select 1 from public.user_enrollments e where e.id = enrollment_id and e.user_id = auth.uid()));
grant select,insert,update,delete on public.user_workshop_history to authenticated;

-- Evita que una opción de otra carrera/plan se use para un historial Plástica.
create or replace function public.validate_user_workshop_history()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (
    select 1 from public.user_enrollments e
    join public.curricula c on c.id = e.curriculum_id
    where e.id = new.enrollment_id and c.family = 'Artes Plásticas'
  ) then raise exception 'La actividad no corresponde a una trayectoria de Artes Plásticas'; end if;
  if new.workshop_option_id is not null and not exists (
    select 1 from public.plastic_workshop_options o
    where o.id = new.workshop_option_id and o.verification_status = 'verified'
  ) then raise exception 'La opción de taller todavía no está verificada'; end if;
  return new;
end $$;
create trigger validate_user_workshop_history before insert or update on public.user_workshop_history
  for each row execute function public.validate_user_workshop_history();

-- No se crean opciones verificadas por similitud con un analítico individual.
