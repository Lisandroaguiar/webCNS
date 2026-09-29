-- Filas de analítico aún no vinculadas a una materia verificada.
create table if not exists public.user_pending_academic_records (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.user_enrollments(id) on delete cascade,
  raw_name text not null check (length(trim(raw_name)) between 2 and 250),
  status text not null check (status in ('pending','in_progress','regular','passed')),
  grade numeric(3,1) check (grade between 1 and 10),
  passed_at date,
  match_kind text not null check (match_kind in ('EXACT','ALIAS','PROBABLE','AMBIGUOUS','UNMATCHED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (enrollment_id,raw_name)
);

create index if not exists user_pending_academic_records_enrollment_idx
  on public.user_pending_academic_records(enrollment_id);
alter table public.user_pending_academic_records enable row level security;
create policy user_pending_academic_records_owner on public.user_pending_academic_records
  for all to authenticated
  using (exists (select 1 from public.user_enrollments e where e.id = enrollment_id and e.user_id = auth.uid()))
  with check (exists (select 1 from public.user_enrollments e where e.id = enrollment_id and e.user_id = auth.uid()));
grant select,insert,update,delete on public.user_pending_academic_records to authenticated;

create table if not exists public.curriculum_subject_aliases (
  curriculum_subject_id text not null references public.curriculum_subjects(id) on delete cascade,
  alias text not null check (length(trim(alias)) between 2 and 250),
  verified boolean not null default false,
  primary key (curriculum_subject_id,alias)
);
alter table public.curriculum_subject_aliases enable row level security;
create policy curriculum_subject_aliases_verified_read on public.curriculum_subject_aliases
  for select to authenticated using (verified);
grant select on public.curriculum_subject_aliases to authenticated;

-- Cada importación confirmada se guarda en una única transacción. Las filas
-- ambiguas permanecen fuera del historial aprobado hasta que el alumno las resuelva.
create or replace function public.save_enrollment_analytic_review(
  p_enrollment_id uuid, p_subjects jsonb, p_workshops jsonb, p_pending jsonb
) returns void language plpgsql security invoker set search_path = public as $$
declare row_data jsonb;
begin
  if not exists (select 1 from public.user_enrollments where id = p_enrollment_id and user_id = auth.uid()) then
    raise exception 'La trayectoria no pertenece al usuario';
  end if;
  for row_data in select value from jsonb_array_elements(p_subjects) loop
    insert into public.user_enrollment_subjects (enrollment_id,curriculum_subject_id,status,grade,passed_at,updated_at)
    values (p_enrollment_id,row_data->>'subject_id',coalesce(row_data->>'status','passed'),(row_data->>'grade')::numeric,(row_data->>'passed_at')::date,now())
    on conflict (enrollment_id,curriculum_subject_id) do update
      set status = excluded.status, grade = coalesce(excluded.grade, public.user_enrollment_subjects.grade),
          passed_at = coalesce(excluded.passed_at, public.user_enrollment_subjects.passed_at), updated_at = now();
  end loop;
  for row_data in select value from jsonb_array_elements(p_workshops) loop
    insert into public.user_workshop_history (enrollment_id,raw_name,activity_kind,status,grade,passed_at,source,updated_at)
    values (p_enrollment_id,row_data->>'raw_name','complementary',coalesce(row_data->>'status','passed'),(row_data->>'grade')::numeric,(row_data->>'passed_at')::date,'analytic',now())
    on conflict (enrollment_id,raw_name,activity_kind) do update
      set status = excluded.status, grade = excluded.grade, passed_at = excluded.passed_at, updated_at = now();
  end loop;
  for row_data in select value from jsonb_array_elements(p_pending) loop
    insert into public.user_pending_academic_records (enrollment_id,raw_name,status,grade,passed_at,match_kind)
    values (p_enrollment_id,row_data->>'raw_name',coalesce(row_data->>'status','passed'),(row_data->>'grade')::numeric,(row_data->>'passed_at')::date,row_data->>'match_kind')
    on conflict (enrollment_id,raw_name) do update
      set status = excluded.status, grade = excluded.grade, passed_at = excluded.passed_at,
          match_kind = excluded.match_kind, updated_at = now();
  end loop;
end $$;
revoke all on function public.save_enrollment_analytic_review(uuid,jsonb,jsonb,jsonb) from public;
grant execute on function public.save_enrollment_analytic_review(uuid,jsonb,jsonb,jsonb) to authenticated;

create or replace function public.confirm_pending_academic_record(p_record_id uuid, p_subject_id text)
returns void language plpgsql security invoker set search_path = public as $$
declare pending_row public.user_pending_academic_records%rowtype;
begin
  select p.* into pending_row from public.user_pending_academic_records p
  join public.user_enrollments e on e.id = p.enrollment_id
  where p.id = p_record_id and e.user_id = auth.uid() for update of p;
  if not found then raise exception 'Pendiente no encontrado'; end if;
  insert into public.user_enrollment_subjects (enrollment_id,curriculum_subject_id,status,grade,passed_at,updated_at)
  values (pending_row.enrollment_id,p_subject_id,pending_row.status,pending_row.grade,pending_row.passed_at,now())
  on conflict (enrollment_id,curriculum_subject_id) do update
    set status = excluded.status, grade = excluded.grade, passed_at = excluded.passed_at, updated_at = now();
  delete from public.user_pending_academic_records where id = p_record_id;
end $$;
revoke all on function public.confirm_pending_academic_record(uuid,text) from public;
grant execute on function public.confirm_pending_academic_record(uuid,text) to authenticated;
