-- Sprint 9: modelo multicarrera aditivo. No modifica ni elimina el historial legado.
create table if not exists public.academic_programs (
  id text primary key,
  department text not null,
  family text not null,
  degree_type text not null check (degree_type in ('licenciatura', 'profesorado')),
  name text not null
);

create table if not exists public.academic_orientations (
  id text primary key,
  family text not null,
  name text not null
);

create table if not exists public.curricula (
  id text primary key,
  family text not null,
  year smallint not null,
  display_name text not null,
  status text not null default 'active' check (status in ('active', 'legacy', 'phased')),
  catalog_kind text not null default 'curriculum_subjects' check (catalog_kind in ('legacy_subjects', 'curriculum_subjects')),
  requires_orientation boolean not null default false,
  legacy_curriculum text check (legacy_curriculum in ('old', 'new')),
  source_url text,
  source_document text,
  verified_at timestamptz
);

create table if not exists public.curriculum_programs (
  curriculum_id text not null references public.curricula(id),
  program_id text not null references public.academic_programs(id),
  primary key (curriculum_id, program_id)
);

create table if not exists public.curriculum_orientations (
  curriculum_id text not null references public.curricula(id),
  orientation_id text not null references public.academic_orientations(id),
  primary key (curriculum_id, orientation_id)
);

create table if not exists public.academic_subjects (
  id text primary key,
  family text not null,
  canonical_name text not null
);

-- La clave es el lugar de la materia en el plan, no el código impreso: P0083
-- aparece varias veces para distintos Talleres Complementarios.
create table if not exists public.curriculum_subjects (
  id text primary key,
  curriculum_id text not null references public.curricula(id),
  subject_id text not null references public.academic_subjects(id),
  official_code text,
  official_name text not null,
  year_level smallint not null check (year_level between 1 and 5),
  period text not null check (period in ('annual', 'first', 'second', 'semester', 'unknown')),
  degree_scope text not null default 'both' check (degree_scope in ('both', 'licenciatura', 'profesorado')),
  orientation_condition text not null default 'all' check (orientation_condition in ('all', 'not_dibujo')),
  requirement_kind text not null default 'required' check (requirement_kind in ('required', 'choice', 'orientation')),
  source_document text not null,
  review_status text not null default 'verified' check (review_status in ('verified', 'manual_review')),
  unique (curriculum_id, subject_id)
);

create table if not exists public.curriculum_requirements (
  id text primary key,
  curriculum_id text not null references public.curricula(id),
  requirement_type text not null check (requirement_type in ('choice', 'orientation')),
  required_count smallint not null check (required_count > 0),
  pool text not null,
  exclude_enrollment_orientation boolean not null default false,
  source_document text not null
);

create table if not exists public.curriculum_prerequisites (
  target_curriculum_subject_id text not null references public.curriculum_subjects(id),
  required_curriculum_subject_id text not null references public.curriculum_subjects(id),
  purpose text not null check (purpose in ('enroll', 'pass')),
  required_status text not null check (required_status in ('regular', 'passed')),
  source_document text not null,
  primary key (target_curriculum_subject_id, required_curriculum_subject_id, purpose),
  check (target_curriculum_subject_id <> required_curriculum_subject_id)
);

create table if not exists public.curriculum_rollout (
  curriculum_id text not null references public.curricula(id),
  year_level smallint not null check (year_level between 1 and 5),
  available_from smallint not null,
  primary key (curriculum_id, year_level)
);

create table if not exists public.curriculum_equivalences (
  from_curriculum_subject_id text not null references public.curriculum_subjects(id),
  to_curriculum_subject_id text not null references public.curriculum_subjects(id),
  source_document text not null,
  verified_at timestamptz not null,
  primary key (from_curriculum_subject_id, to_curriculum_subject_id)
);

create table if not exists public.user_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id text not null references public.academic_programs(id),
  curriculum_id text not null,
  orientation_id text references public.academic_orientations(id),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (curriculum_id, program_id) references public.curriculum_programs(curriculum_id, program_id),
  foreign key (curriculum_id, orientation_id) references public.curriculum_orientations(curriculum_id, orientation_id),
  unique (user_id, program_id, curriculum_id, orientation_id)
);
create unique index if not exists user_enrollments_one_active on public.user_enrollments(user_id) where is_active;
create unique index if not exists user_enrollments_without_orientation
  on public.user_enrollments(user_id,program_id,curriculum_id) where orientation_id is null;

create or replace function public.validate_user_enrollment()
returns trigger language plpgsql as $$
declare v_requires_orientation boolean;
begin
  select requires_orientation into v_requires_orientation from public.curricula where id = new.curriculum_id;
  if v_requires_orientation and new.orientation_id is null then
    raise exception 'Elegí una orientación para este plan';
  end if;
  if not v_requires_orientation and new.orientation_id is not null then
    raise exception 'Este plan no posee orientaciones';
  end if;
  return new;
end $$;
drop trigger if exists validate_user_enrollment on public.user_enrollments;
create trigger validate_user_enrollment before insert or update on public.user_enrollments
for each row execute function public.validate_user_enrollment();

create table if not exists public.user_enrollment_subjects (
  enrollment_id uuid not null references public.user_enrollments(id) on delete cascade,
  curriculum_subject_id text not null references public.curriculum_subjects(id),
  status text not null check (status in ('pending', 'regular', 'passed')),
  grade numeric(3,1) check (grade between 1 and 10),
  passed_at date,
  updated_at timestamptz not null default now(),
  primary key (enrollment_id, curriculum_subject_id)
);

-- Catálogo público; trayectorias e historiales sólo para su dueño.
alter table public.academic_programs enable row level security;
alter table public.academic_orientations enable row level security;
alter table public.curricula enable row level security;
alter table public.curriculum_programs enable row level security;
alter table public.curriculum_orientations enable row level security;
alter table public.academic_subjects enable row level security;
alter table public.curriculum_subjects enable row level security;
alter table public.curriculum_requirements enable row level security;
alter table public.curriculum_prerequisites enable row level security;
alter table public.curriculum_rollout enable row level security;
alter table public.curriculum_equivalences enable row level security;
alter table public.user_enrollments enable row level security;
alter table public.user_enrollment_subjects enable row level security;

do $$ declare t text; begin
  foreach t in array array['academic_programs','academic_orientations','curricula','curriculum_programs','curriculum_orientations','academic_subjects','curriculum_subjects','curriculum_requirements','curriculum_prerequisites','curriculum_rollout','curriculum_equivalences'] loop
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t || '_read', t);
  end loop;
end $$;
create policy user_enrollments_read on public.user_enrollments for select to authenticated using (user_id = auth.uid());
create policy user_enrollments_add on public.user_enrollments for insert to authenticated with check (user_id = auth.uid() and not is_active);
create policy user_enrollments_remove on public.user_enrollments for delete to authenticated using (user_id = auth.uid() and not is_active);
create policy user_enrollment_subjects_owner on public.user_enrollment_subjects for all to authenticated
  using (exists (select 1 from public.user_enrollments e where e.id = enrollment_id and e.user_id = auth.uid()))
  with check (exists (select 1 from public.user_enrollments e where e.id = enrollment_id and e.user_id = auth.uid()));

create or replace function public.activate_user_enrollment(selected_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not exists (select 1 from public.user_enrollments where id = selected_id and user_id = auth.uid()) then
    raise exception 'Trayectoria no disponible';
  end if;
  update public.user_enrollments set is_active = false, updated_at = now() where user_id = auth.uid() and is_active;
  update public.user_enrollments set is_active = true, updated_at = now() where id = selected_id and user_id = auth.uid();
end $$;
revoke all on function public.activate_user_enrollment(uuid) from public, anon;
grant execute on function public.activate_user_enrollment(uuid) to authenticated;

create or replace function public.validate_enrollment_subject()
returns trigger language plpgsql as $$
begin
  if not exists (
    select 1 from public.user_enrollments e
    join public.curriculum_subjects cs on cs.id = new.curriculum_subject_id
    join public.academic_programs p on p.id = e.program_id
    where e.id = new.enrollment_id and e.curriculum_id = cs.curriculum_id
      and (cs.degree_scope = 'both' or cs.degree_scope = p.degree_type)
      and (cs.orientation_condition = 'all' or e.orientation_id <> 'dibujo')
  ) then raise exception 'La materia no corresponde a esta trayectoria'; end if;
  return new;
end $$;
drop trigger if exists validate_enrollment_subject on public.user_enrollment_subjects;
create trigger validate_enrollment_subject before insert or update on public.user_enrollment_subjects
for each row execute function public.validate_enrollment_subject();

grant select on public.academic_programs,public.academic_orientations,public.curricula,
  public.curriculum_programs,public.curriculum_orientations,public.academic_subjects,
  public.curriculum_subjects,public.curriculum_requirements,public.curriculum_prerequisites,
  public.curriculum_rollout,public.curriculum_equivalences to anon,authenticated;
grant select,insert,delete on public.user_enrollments to authenticated;
grant select,insert,update,delete on public.user_enrollment_subjects to authenticated;

insert into public.academic_programs (id,department,family,degree_type,name) values
  ('multimedia-lic','Diseño Multimedial','Diseño Multimedial','licenciatura','Licenciatura en Diseño Multimedial'),
  ('multimedia-prof','Diseño Multimedial','Diseño Multimedial','profesorado','Profesorado en Diseño Multimedial'),
  ('plastica-lic','Artes Visuales','Artes Plásticas','licenciatura','Licenciatura en Artes Plásticas'),
  ('plastica-prof','Artes Visuales','Artes Plásticas','profesorado','Profesorado en Artes Plásticas')
on conflict (id) do update set name = excluded.name;

insert into public.academic_orientations (id,family,name) values
  ('dibujo','Artes Plásticas','Dibujo'),('grabado_arte_impreso','Artes Plásticas','Grabado y Arte Impreso'),
  ('pintura','Artes Plásticas','Pintura'),('ceramica','Artes Plásticas','Cerámica'),
  ('escenografia','Artes Plásticas','Escenografía'),('escultura','Artes Plásticas','Escultura'),
  ('muralismo_arte_publico_monumental','Artes Plásticas','Muralismo y Arte Público Monumental')
on conflict (id) do nothing;

insert into public.curricula (id,family,year,display_name,status,catalog_kind,requires_orientation,legacy_curriculum,source_url,source_document) values
  ('multimedia-2006','Diseño Multimedial',2006,'Plan 2006','legacy','legacy_subjects',false,'old',null,'Catálogo Multimedia existente'),
  ('multimedia-2024','Diseño Multimedial',2024,'Plan 2024','active','legacy_subjects',false,'new',null,'Catálogo Multimedia existente'),
  ('plastica-2006','Artes Plásticas',2006,'Plan 2006','legacy','curriculum_subjects',true,null,'https://www2.fba.unlp.edu.ar/artesvisuales/informacion-academica/plan-de-estudios/','PROGRAMA LIC Y PROF PLASTICA 2006_modif 2025.pdf'),
  ('plastica-2023','Artes Plásticas',2023,'Plan 2023','phased','curriculum_subjects',true,null,'https://www2.fba.unlp.edu.ar/artesvisuales/informacion-academica/plan-de-estudios/','PLAN DE ESTUDIOS_Prof y Lic AV 2023.pdf')
on conflict (id) do nothing;

insert into public.curriculum_programs values
  ('multimedia-2006','multimedia-lic'),('multimedia-2006','multimedia-prof'),
  ('multimedia-2024','multimedia-lic'),('multimedia-2024','multimedia-prof'),
  ('plastica-2006','plastica-lic'),('plastica-2006','plastica-prof'),
  ('plastica-2023','plastica-lic'),('plastica-2023','plastica-prof')
on conflict do nothing;

-- Puente no destructivo: conserva subjects/user_subjects y copia el estado a la
-- trayectoria nueva. La interfaz Multimedia anterior sigue leyendo sus tablas.
insert into public.academic_subjects (id,family,canonical_name)
select 'multimedia-' || s.id::text,'Diseño Multimedial',s.name from public.subjects s
on conflict (id) do nothing;
insert into public.curriculum_subjects
  (id,curriculum_id,subject_id,official_code,official_name,year_level,period,degree_scope,orientation_condition,requirement_kind,source_document,review_status)
select 'multimedia-' || s.id::text,
  case when s.curriculum = 'new' then 'multimedia-2024' else 'multimedia-2006' end,
  'multimedia-' || s.id::text,s.code,s.name,coalesce(s.year,1),
  case when s.semester = 1 then 'first' when s.semester = 2 then 'second' else 'annual' end,
  'both','all','required','Catálogo Multimedia existente','manual_review'
from public.subjects s
on conflict (id) do nothing;
insert into public.curriculum_orientations
select c.id,o.id from public.curricula c cross join public.academic_orientations o where c.family = 'Artes Plásticas'
on conflict do nothing;
insert into public.curriculum_rollout values
  ('plastica-2023',1,2024),('plastica-2023',2,2025),('plastica-2023',3,2026),('plastica-2023',4,2027),('plastica-2023',5,2028)
on conflict do nothing;

-- Sólo crea trayectorias Multimedia para perfiles existentes. No toca user_subjects.
insert into public.user_enrollments (user_id,program_id,curriculum_id,is_active)
select p.id,
  case when lower(coalesce(u.raw_user_meta_data->>'degree','')) like '%profesorado%' then 'multimedia-prof' else 'multimedia-lic' end,
  case when p.curriculum = 'new' then 'multimedia-2024' else 'multimedia-2006' end,
  true
from public.profiles p join auth.users u on u.id = p.id
where not exists (select 1 from public.user_enrollments e where e.user_id = p.id)
on conflict do nothing;

insert into public.user_enrollments (user_id,program_id,curriculum_id,is_active)
select distinct us.user_id,
  case when lower(coalesce(u.raw_user_meta_data->>'degree','')) like '%profesorado%' then 'multimedia-prof' else 'multimedia-lic' end,
  case when s.curriculum = 'new' then 'multimedia-2024' else 'multimedia-2006' end,
  false
from public.user_subjects us
join public.subjects s on s.id = us.subject_id
join auth.users u on u.id = us.user_id
where not exists (
  select 1 from public.user_enrollments e where e.user_id = us.user_id
    and e.curriculum_id = case when s.curriculum = 'new' then 'multimedia-2024' else 'multimedia-2006' end
)
on conflict do nothing;

insert into public.user_enrollment_subjects (enrollment_id,curriculum_subject_id,status,grade,passed_at)
select e.id,'multimedia-' || us.subject_id::text,coalesce(us.status,'pending'),us.grade,us.passed_at
from public.user_subjects us
join public.user_enrollments e on e.user_id = us.user_id
join public.curriculum_subjects cs on cs.id = 'multimedia-' || us.subject_id::text and cs.curriculum_id = e.curriculum_id
on conflict (enrollment_id,curriculum_subject_id) do nothing;
