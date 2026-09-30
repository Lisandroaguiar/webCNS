-- Preserve SIU workshop names while linking verified options for choice-group counts.
insert into public.plastic_workshop_options
  (id,orientation_id,academic_name,siu_name,verification_status,source_document)
values
  ('plastica-escenografia-complementaria','escenografia','Escenografía','Escenografía Complementaria','verified','Analítico SIU anonimizado, evidencia 2026-09-29')
on conflict (orientation_id,academic_name) do update
  set siu_name = excluded.siu_name, verification_status = 'verified', source_document = excluded.source_document;

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
    insert into public.user_workshop_history (enrollment_id,raw_name,workshop_option_id,activity_kind,status,grade,passed_at,source,updated_at)
    values (p_enrollment_id,row_data->>'raw_name',nullif(row_data->>'workshop_option_id',''),'complementary',
      coalesce(row_data->>'status','passed'),(row_data->>'grade')::numeric,(row_data->>'passed_at')::date,'analytic',now())
    on conflict (enrollment_id,raw_name,activity_kind) do update
      set workshop_option_id = coalesce(excluded.workshop_option_id,public.user_workshop_history.workshop_option_id),
          status = excluded.status, grade = excluded.grade, passed_at = excluded.passed_at, updated_at = now();
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
