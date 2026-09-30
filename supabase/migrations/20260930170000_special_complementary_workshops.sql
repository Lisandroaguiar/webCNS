-- Los talleres de cuarto año son complementarios especiales, posteriores a cuatro orientaciones distintas.
alter table public.plastic_workshop_options alter column orientation_id drop not null;
alter table public.plastic_workshop_options add column if not exists option_kind text not null default 'orientation';
alter table public.plastic_workshop_options drop constraint if exists plastic_workshop_options_kind_check;
alter table public.plastic_workshop_options add constraint plastic_workshop_options_kind_check check (
  (option_kind = 'orientation' and orientation_id is not null) or
  (option_kind = 'special' and orientation_id is null)
);

insert into public.plastic_workshop_options
  (id, orientation_id, option_kind, academic_name, siu_name, official_code, verification_status, source_document)
values
  ('plastica-artes-combinadas', null, 'special', 'Artes Combinadas', null, 'P0057', 'verified', 'Plan de Artes Plásticas 2006/2023'),
  ('plastica-fotografia-imagen-digital', null, 'special', 'Fotografía e Imagen Digital', null, 'P0058', 'verified', 'Plan de Artes Plásticas 2006/2023')
on conflict (id) do update set option_kind = excluded.option_kind,
  orientation_id = excluded.orientation_id, academic_name = excluded.academic_name,
  official_code = excluded.official_code, verification_status = excluded.verification_status,
  source_document = excluded.source_document;

create or replace function public.validate_user_workshop_history()
returns trigger language plpgsql set search_path = public as $$
declare enrolled_orientation text;
declare selected_option public.plastic_workshop_options%rowtype;
declare selected_slot public.curriculum_subjects%rowtype;
declare completed_count integer;
begin
  select e.orientation_id into enrolled_orientation
  from public.user_enrollments e join public.curricula c on c.id = e.curriculum_id
  where e.id = new.enrollment_id and c.family = 'Artes Plásticas';
  if not found then raise exception 'La actividad no corresponde a una trayectoria de Artes Plásticas'; end if;

  if new.workshop_option_id is not null then
    select * into selected_option from public.plastic_workshop_options
    where id = new.workshop_option_id and verification_status = 'verified';
    if not found then raise exception 'La opción de taller todavía no está verificada'; end if;
  end if;

  if new.curriculum_subject_id is not null then
    select s.* into selected_slot from public.curriculum_subjects s
    join public.user_enrollments e on e.curriculum_id = s.curriculum_id
    where e.id = new.enrollment_id and s.id = new.curriculum_subject_id
      and s.requirement_kind = 'choice' and s.official_name ~* '^Taller Complementario';
    if not found or new.activity_kind <> 'complementary' or new.workshop_option_id is null then
      raise exception 'El taller no satisface ese requisito del plan';
    end if;
    if selected_option.option_kind = 'special' then
      if selected_slot.official_code is distinct from selected_option.official_code
        or selected_slot.official_name not ilike '%' || selected_option.academic_name || '%' then
        raise exception 'El taller especial no corresponde a ese requisito';
      end if;
    elsif selected_slot.official_name like '%(%'
      or selected_option.orientation_id = enrolled_orientation then
      raise exception 'El taller no satisface ese requisito del plan';
    end if;
  end if;

  if new.workshop_option_id is not null and selected_option.option_kind = 'special' then
    select count(distinct o.orientation_id) into completed_count
    from public.user_workshop_history h
    join public.plastic_workshop_options o on o.id = h.workshop_option_id
    where h.enrollment_id = new.enrollment_id and h.status = 'passed'
      and o.option_kind = 'orientation' and o.verification_status = 'verified'
      and o.orientation_id <> enrolled_orientation;
    if completed_count < 4 then
      raise exception 'El taller especial requiere cuatro complementarios aprobados de distintas orientaciones';
    end if;
  end if;

  if new.curriculum_subject_id is not null and selected_option.option_kind = 'orientation' and exists (
    select 1 from public.user_workshop_history h
    join public.plastic_workshop_options previous_option on previous_option.id = h.workshop_option_id
    where h.enrollment_id = new.enrollment_id and h.id <> new.id
      and h.curriculum_subject_id is not null
      and previous_option.orientation_id = selected_option.orientation_id
  ) then raise exception 'Esta orientación ya satisface otro Taller Complementario'; end if;
  return new;
end $$;
