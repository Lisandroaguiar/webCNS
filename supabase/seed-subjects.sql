-- Carga inicial del plan de Diseño Multimedial de la Facultad de Artes.
-- Ejecutar después de crear public.subjects y public.correlatives.
-- Es seguro volver a ejecutarlo: los códigos son únicos.
alter table public.subjects add column if not exists curriculum text not null default 'old';
update public.subjects set curriculum = 'old' where curriculum is null or curriculum = '';

insert into public.subjects (name, code, year, semester) values
  ('Taller de diseño multimedial I', 'DM-1-TALLER', 1, 1),
  ('Lenguaje multimedial I', 'DM-1-LENGUAJE', 1, 1),
  ('Tecnología multimedial I', 'DM-1-TECNOLOGIA', 1, 2),
  ('Historia social general', 'DM-1-HISTORIA', 1, 2),
  ('Producción de textos B', 'DM-1-TEXTOS', 1, 2),
  ('Arte contemporáneo', 'DM-1-ARTE', 1, 2),
  ('Taller de diseño multimedial II', 'DM-2-TALLER', 2, 1),
  ('Lenguaje multimedial II', 'DM-2-LENGUAJE', 2, 1),
  ('Tecnología multimedial II', 'DM-2-TECNOLOGIA', 2, 2),
  ('Identidad, estado y sociedad en Argentina y Latinoamérica', 'DM-2-IDENTIDAD', 2, 2),
  ('Taller de diseño multimedial III', 'DM-3-TALLER', 3, 1),
  ('Lenguaje multimedial III', 'DM-3-LENGUAJE', 3, 1),
  ('Tecnología multimedial III', 'DM-3-TECNOLOGIA', 3, 2),
  ('Estética', 'DM-3-ESTETICA', 3, 2),
  ('Taller de diseño multimedial IV', 'DM-4-TALLER', 4, 1),
  ('Lenguaje multimedial IV', 'DM-4-LENGUAJE', 4, 1),
  ('Tecnología multimedial IV', 'DM-4-TECNOLOGIA', 4, 1),
  ('Gestión de proyectos', 'DM-4-GESTION', 4, 1),
  ('Teoría de la práctica artística', 'DM-4-TEORIA', 4, 2),
  ('Epistemología de las artes', 'DM-4-EPISTEMOLOGIA', 4, 2),
  ('Metodología de la investigación', 'DM-4-METODOLOGIA', 4, 2),
  ('Seminario de formación general a elección', 'DM-4-SEMINARIO-GENERAL', 4, 2),
  ('Taller de diseño multimedial V', 'DM-5-TALLER', 5, 1),
  ('Seminario de formación especifica a elección I', 'DM-5-SEMINARIO-1', 5, 2),
  ('Seminario de formación especifica a elección II', 'DM-5-SEMINARIO-2', 5, 2)
on conflict (code) do update set
  name = excluded.name,
  year = excluded.year,
  semester = excluded.semester;

-- Correlatividades completas del plan.
-- Cada relación se expresa por código para que el seed sea independiente de
-- los IDs identity asignados por la base.
insert into public.correlatives (subject_id, required_subject_id)
select required_subject.id, prerequisite_subject.id
from (values
  ('DM-2-TALLER', 'DM-1-TALLER'),
  ('DM-2-LENGUAJE', 'DM-1-LENGUAJE'),
  ('DM-2-TECNOLOGIA', 'DM-1-TECNOLOGIA'),
  ('DM-2-IDENTIDAD', 'DM-1-HISTORIA'),
  ('DM-2-IDENTIDAD', 'DM-1-ARTE'),
  ('DM-3-TALLER', 'DM-2-TALLER'),
  ('DM-3-LENGUAJE', 'DM-2-LENGUAJE'),
  ('DM-3-TECNOLOGIA', 'DM-2-TECNOLOGIA'),
  ('DM-3-ESTETICA', 'DM-2-IDENTIDAD'),
  ('DM-3-ESTETICA', 'DM-1-ARTE'),
  ('DM-4-TALLER', 'DM-3-TALLER'),
  ('DM-4-LENGUAJE', 'DM-3-LENGUAJE'),
  ('DM-4-TECNOLOGIA', 'DM-3-TECNOLOGIA'),
  ('DM-4-GESTION', 'DM-4-TALLER'),
  ('DM-4-GESTION', 'DM-4-TECNOLOGIA'),
  ('DM-4-TEORIA', 'DM-3-ESTETICA'),
  ('DM-4-EPISTEMOLOGIA', 'DM-3-ESTETICA'),
  ('DM-4-METODOLOGIA', 'DM-1-HISTORIA'),
  ('DM-4-METODOLOGIA', 'DM-1-TEXTOS'),
  ('DM-4-SEMINARIO-GENERAL', 'DM-3-ESTETICA'),
  ('DM-5-TALLER', 'DM-4-TALLER'),
  ('DM-5-TALLER', 'DM-4-GESTION'),
  ('DM-5-SEMINARIO-1', 'DM-4-EPISTEMOLOGIA'),
  ('DM-5-SEMINARIO-1', 'DM-4-METODOLOGIA'),
  ('DM-5-SEMINARIO-2', 'DM-5-SEMINARIO-1')
) as prerequisites(subject_code, prerequisite_code)
join public.subjects required_subject on required_subject.code = prerequisites.subject_code
join public.subjects prerequisite_subject on prerequisite_subject.code = prerequisites.prerequisite_code
on conflict do nothing;

notify pgrst, 'reload schema';
