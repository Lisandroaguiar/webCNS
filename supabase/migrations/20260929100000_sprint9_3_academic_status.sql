-- Recorrido multicarrera: distinguir cursada en progreso de cursada aprobada.
-- Conserva todos los registros y las columnas grade/passed_at ya existentes.
alter table public.user_enrollment_subjects
  drop constraint if exists user_enrollment_subjects_status_check;
alter table public.user_enrollment_subjects
  add constraint user_enrollment_subjects_status_check
  check (status in ('pending', 'in_progress', 'regular', 'passed'));

-- Los talleres conservan la misma semántica al cargarse desde un analítico.
alter table public.user_workshop_history
  drop constraint if exists user_workshop_history_status_check;
alter table public.user_workshop_history
  add constraint user_workshop_history_status_check
  check (status in ('pending', 'in_progress', 'regular', 'passed'));
