-- Toda activación interactiva pasa por una transacción serializada por usuario.
create table if not exists public.enrollment_activation_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Guardar los UUID aun si luego se elimina la trayectoria: el rastro permanece.
  from_enrollment_id uuid,
  to_enrollment_id uuid not null,
  created_at timestamptz not null default now(),
  source text not null check (source in ('profile_ui','onboarding','explicit_switch','migration','admin'))
);
create index if not exists enrollment_activation_log_user_created on public.enrollment_activation_log(user_id, created_at desc);
alter table public.enrollment_activation_log enable row level security;
create policy enrollment_activation_log_owner_read on public.enrollment_activation_log
  for select to authenticated using (user_id = auth.uid());
grant select on public.enrollment_activation_log to authenticated;

create or replace function public.activate_user_enrollment(selected_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_from uuid;
begin
  if v_user is null then raise exception 'Trayectoria no disponible'; end if;
  -- Serializa activaciones concurrentes incluso cuando todavía no hay una activa.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  if not exists (select 1 from public.user_enrollments where id = selected_id and user_id = v_user) then
    raise exception 'Trayectoria no disponible';
  end if;
  select id into v_from from public.user_enrollments where user_id = v_user and is_active for update;
  if v_from = selected_id then return; end if;
  update public.user_enrollments set is_active = false, updated_at = now() where user_id = v_user and is_active;
  update public.user_enrollments set is_active = true, updated_at = now() where id = selected_id and user_id = v_user;
  insert into public.enrollment_activation_log (user_id,from_enrollment_id,to_enrollment_id,source)
  values (v_user,v_from,selected_id,'explicit_switch');
end $$;
revoke all on function public.activate_user_enrollment(uuid) from public, anon;
grant execute on function public.activate_user_enrollment(uuid) to authenticated;
