-- Sprint 9.3.1: conservar las decisiones del estudiante y permitir deshacerlas.
alter table public.user_enrollments add column if not exists deleted_at timestamptz;

alter table public.curriculum_subject_aliases
  add column if not exists curriculum_id text,
  add column if not exists source text,
  add column if not exists active boolean not null default true;
update public.curriculum_subject_aliases a set curriculum_id = s.curriculum_id
  from public.curriculum_subjects s where s.id = a.curriculum_subject_id and a.curriculum_id is null;
alter table public.curriculum_subject_aliases alter column curriculum_id set not null;
create unique index if not exists curriculum_alias_unique_active_context
  on public.curriculum_subject_aliases(curriculum_id,lower(btrim(alias))) where verified and active;
create or replace function public.validate_curriculum_subject_alias()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from public.curriculum_subjects s
    where s.id = new.curriculum_subject_id and s.curriculum_id = new.curriculum_id) then
    raise exception 'Alias fuera de contexto';
  end if;
  return new;
end $$;
drop trigger if exists validate_curriculum_subject_alias on public.curriculum_subject_aliases;
create trigger validate_curriculum_subject_alias before insert or update on public.curriculum_subject_aliases
  for each row execute function public.validate_curriculum_subject_alias();
drop policy if exists curriculum_subject_aliases_verified_read on public.curriculum_subject_aliases;
create policy curriculum_subject_aliases_verified_read on public.curriculum_subject_aliases
  for select to authenticated using (verified and active);

alter table public.user_pending_academic_records
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists record_type text not null default 'subject',
  add column if not exists suggested_subject_id text references public.curriculum_subjects(id),
  add column if not exists source_reference text,
  add column if not exists resolution_status text not null default 'pending',
  add column if not exists resolved_subject_id text references public.curriculum_subjects(id),
  add column if not exists resolved_at timestamptz;
update public.user_pending_academic_records p set user_id = e.user_id
  from public.user_enrollments e where e.id = p.enrollment_id and p.user_id is null;
alter table public.user_pending_academic_records alter column user_id set not null;
alter table public.user_pending_academic_records add constraint pending_record_type_check
  check (record_type in ('subject','workshop'));
alter table public.user_pending_academic_records add constraint pending_resolution_check
  check (resolution_status in ('pending','ignored','confirmed'));
create index if not exists pending_records_owner_status_idx
  on public.user_pending_academic_records(user_id,enrollment_id,resolution_status);

-- Conserva el nombre del documento sin almacenar el PDF ni datos personales.
create table if not exists public.user_academic_import_matches (
  enrollment_id uuid not null references public.user_enrollments(id) on delete cascade,
  curriculum_subject_id text not null references public.curriculum_subjects(id),
  raw_name text not null check (length(trim(raw_name)) between 2 and 250),
  match_kind text not null check (match_kind in ('EXACT','ALIAS','MANUAL')),
  source_reference text,
  created_at timestamptz not null default now(),
  primary key (enrollment_id,curriculum_subject_id,raw_name)
);
alter table public.user_academic_import_matches enable row level security;
create policy user_academic_import_matches_owner on public.user_academic_import_matches
  for all to authenticated
  using (exists (select 1 from public.user_enrollments e where e.id = enrollment_id and e.user_id = auth.uid()))
  with check (exists (select 1 from public.user_enrollments e where e.id = enrollment_id and e.user_id = auth.uid()));
grant select,insert on public.user_academic_import_matches to authenticated;

create or replace function public.save_enrollment_analytic_review(
  p_enrollment_id uuid, p_subjects jsonb, p_workshops jsonb, p_pending jsonb
) returns void language plpgsql security invoker set search_path = public as $$
declare row_data jsonb;
begin
  if not exists (select 1 from public.user_enrollments where id = p_enrollment_id and user_id = auth.uid() and deleted_at is null) then
    raise exception 'Trayectoria no disponible';
  end if;
  for row_data in select value from jsonb_array_elements(p_subjects) loop
    insert into public.user_enrollment_subjects (enrollment_id,curriculum_subject_id,status,grade,passed_at,updated_at)
    values (p_enrollment_id,row_data->>'subject_id',coalesce(row_data->>'status','passed'),(row_data->>'grade')::numeric,(row_data->>'passed_at')::date,now())
    on conflict (enrollment_id,curriculum_subject_id) do update
      set status = excluded.status, grade = coalesce(excluded.grade,public.user_enrollment_subjects.grade),
          passed_at = coalesce(excluded.passed_at,public.user_enrollment_subjects.passed_at), updated_at = now();
    insert into public.user_academic_import_matches (enrollment_id,curriculum_subject_id,raw_name,match_kind,source_reference)
      values (p_enrollment_id,row_data->>'subject_id',
        coalesce(nullif(row_data->>'raw_name',''),(select official_name from public.curriculum_subjects where id = row_data->>'subject_id')),
        case when row_data->>'match_kind' in ('EXACT','ALIAS') then row_data->>'match_kind' else 'MANUAL' end,
        nullif(row_data->>'source_reference',''))
      on conflict do nothing;
  end loop;
  for row_data in select value from jsonb_array_elements(p_workshops) loop
    insert into public.user_workshop_history (enrollment_id,raw_name,activity_kind,status,grade,passed_at,source,updated_at)
    values (p_enrollment_id,row_data->>'raw_name','complementary',coalesce(row_data->>'status','passed'),(row_data->>'grade')::numeric,(row_data->>'passed_at')::date,'analytic',now())
    on conflict (enrollment_id,raw_name,activity_kind) do update
      set status = excluded.status, grade = excluded.grade, passed_at = excluded.passed_at, updated_at = now();
  end loop;
  for row_data in select value from jsonb_array_elements(p_pending) loop
    insert into public.user_pending_academic_records
      (user_id,enrollment_id,raw_name,status,grade,passed_at,match_kind,record_type,suggested_subject_id,source_reference,resolution_status)
    values (auth.uid(),p_enrollment_id,row_data->>'raw_name',coalesce(row_data->>'status','passed'),
      (row_data->>'grade')::numeric,(row_data->>'passed_at')::date,row_data->>'match_kind',
      coalesce(row_data->>'record_type','subject'),nullif(row_data->>'suggested_subject_id',''),
      nullif(row_data->>'source_reference',''),
      case when row_data->>'resolution_status' = 'ignored' then 'ignored' else 'pending' end)
    on conflict (enrollment_id,raw_name) do update
      set status = excluded.status, grade = excluded.grade, passed_at = excluded.passed_at,
          match_kind = excluded.match_kind, suggested_subject_id = excluded.suggested_subject_id,
          source_reference = excluded.source_reference, resolution_status = excluded.resolution_status, updated_at = now()
      where public.user_pending_academic_records.resolution_status = 'pending';
  end loop;
end $$;

create or replace function public.confirm_pending_academic_record(p_record_id uuid, p_subject_id text)
returns void language plpgsql security invoker set search_path = public as $$
declare pending_row public.user_pending_academic_records%rowtype;
begin
  select p.* into pending_row from public.user_pending_academic_records p
    join public.user_enrollments e on e.id = p.enrollment_id
    where p.id = p_record_id and p.user_id = auth.uid() and e.user_id = auth.uid()
      and e.deleted_at is null and p.resolution_status = 'pending' for update of p;
  if not found then raise exception 'Pendiente no disponible'; end if;
  if pending_row.record_type <> 'subject' then raise exception 'Este taller necesita revisión de orientación'; end if;
  insert into public.user_enrollment_subjects (enrollment_id,curriculum_subject_id,status,grade,passed_at,updated_at)
    values (pending_row.enrollment_id,p_subject_id,pending_row.status,pending_row.grade,pending_row.passed_at,now())
    on conflict (enrollment_id,curriculum_subject_id) do nothing;
  update public.user_pending_academic_records set resolution_status = 'confirmed', resolved_subject_id = p_subject_id,
    resolved_at = now(), updated_at = now() where id = p_record_id;
end $$;

create or replace function public.set_pending_academic_resolution(p_record_id uuid, p_status text)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if p_status not in ('pending','ignored') then raise exception 'Estado inválido'; end if;
  update public.user_pending_academic_records p
    set resolution_status = p_status, resolved_at = case when p_status = 'ignored' then now() else null end, updated_at = now()
    from public.user_enrollments e
    where p.id = p_record_id and p.enrollment_id = e.id and p.user_id = auth.uid()
      and e.user_id = auth.uid() and e.deleted_at is null
      and p.resolution_status in ('pending','ignored');
  if not found then raise exception 'Pendiente no disponible'; end if;
end $$;
revoke all on function public.set_pending_academic_resolution(uuid,text) from public,anon;
grant execute on function public.set_pending_academic_resolution(uuid,text) to authenticated;

create or replace function public.soft_delete_user_enrollment(p_enrollment_id uuid, p_replacement_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_active boolean;
begin
  if v_user is null then raise exception 'Sin sesión'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
  select is_active into v_active from public.user_enrollments
    where id = p_enrollment_id and user_id = v_user and deleted_at is null for update;
  if not found then raise exception 'Trayectoria no disponible'; end if;
  if v_active and p_replacement_id is not null and not exists
    (select 1 from public.user_enrollments where id = p_replacement_id and user_id = v_user and deleted_at is null and id <> p_enrollment_id)
    then raise exception 'Reemplazo no disponible'; end if;
  if v_active then
    update public.user_enrollments set is_active = false, updated_at = now() where id = p_enrollment_id;
    if p_replacement_id is not null then
      update public.user_enrollments set is_active = true, updated_at = now() where id = p_replacement_id;
      insert into public.enrollment_activation_log (user_id,from_enrollment_id,to_enrollment_id,source)
        values (v_user,p_enrollment_id,p_replacement_id,'explicit_switch');
    end if;
  end if;
  update public.user_enrollments set deleted_at = now(), updated_at = now() where id = p_enrollment_id;
end $$;
revoke all on function public.soft_delete_user_enrollment(uuid,uuid) from public,anon;
grant execute on function public.soft_delete_user_enrollment(uuid,uuid) to authenticated;

create or replace function public.restore_user_enrollment(p_enrollment_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.user_enrollments set deleted_at = null, is_active = false, updated_at = now()
    where id = p_enrollment_id and user_id = auth.uid() and deleted_at is not null;
  if not found then raise exception 'Trayectoria eliminada no disponible'; end if;
end $$;
revoke all on function public.restore_user_enrollment(uuid) from public,anon;
grant execute on function public.restore_user_enrollment(uuid) to authenticated;

create or replace function public.activate_user_enrollment(selected_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_from uuid;
begin
  if v_user is null then raise exception 'Trayectoria no disponible'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
  if not exists (select 1 from public.user_enrollments where id = selected_id and user_id = v_user and deleted_at is null)
    then raise exception 'Trayectoria no disponible'; end if;
  select id into v_from from public.user_enrollments where user_id = v_user and is_active and deleted_at is null for update;
  if v_from = selected_id then return; end if;
  update public.user_enrollments set is_active = false, updated_at = now() where user_id = v_user and is_active;
  update public.user_enrollments set is_active = true, updated_at = now() where id = selected_id and user_id = v_user;
  insert into public.enrollment_activation_log (user_id,from_enrollment_id,to_enrollment_id,source)
    values (v_user,v_from,selected_id,'explicit_switch');
end $$;
