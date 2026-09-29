-- Preserve the real workshop separately from the curriculum requirement it fulfills.
alter table public.user_workshop_history
  add column if not exists curriculum_subject_id text references public.curriculum_subjects(id);

create unique index if not exists user_workshop_history_one_per_requirement
  on public.user_workshop_history(enrollment_id, curriculum_subject_id)
  where curriculum_subject_id is not null;

create or replace function public.validate_user_workshop_history()
returns trigger language plpgsql set search_path = public as $$
declare enrolled_orientation text;
begin
  select e.orientation_id into enrolled_orientation
  from public.user_enrollments e join public.curricula c on c.id = e.curriculum_id
  where e.id = new.enrollment_id and c.family = 'Artes Plásticas';
  if not found then raise exception 'La actividad no corresponde a una trayectoria de Artes Plásticas'; end if;

  if new.workshop_option_id is not null and not exists (
    select 1 from public.plastic_workshop_options o
    where o.id = new.workshop_option_id and o.verification_status = 'verified'
  ) then raise exception 'La opción de taller todavía no está verificada'; end if;

  if new.curriculum_subject_id is not null and not exists (
    select 1 from public.curriculum_subjects s
    join public.user_enrollments e on e.curriculum_id = s.curriculum_id
    join public.plastic_workshop_options o on o.id = new.workshop_option_id
    where e.id = new.enrollment_id and s.id = new.curriculum_subject_id
      and s.requirement_kind = 'choice' and s.official_name ~* '^Taller Complementario'
      and o.verification_status = 'verified' and o.orientation_id <> enrolled_orientation
      and new.activity_kind = 'complementary'
  ) then raise exception 'El taller no satisface ese requisito del plan'; end if;

  if new.curriculum_subject_id is not null and exists (
    select 1 from public.user_workshop_history h
    join public.plastic_workshop_options previous_option on previous_option.id = h.workshop_option_id
    join public.plastic_workshop_options selected_option on selected_option.id = new.workshop_option_id
    where h.enrollment_id = new.enrollment_id and h.id <> new.id
      and h.curriculum_subject_id is not null
      and previous_option.orientation_id = selected_option.orientation_id
  ) then raise exception 'Esta orientación ya satisface otro Taller Complementario'; end if;

  return new;
end $$;
