-- Catálogo del plan nuevo de Licenciatura en Diseño Multimedial.
-- Fuente oficial: https://www2.fba.unlp.edu.ar/multimedia/cambio-de-plan/
-- Ejecutar después de mvp-schema.sql y seed-subjects.sql.

alter table public.subjects add column if not exists curriculum text not null default 'old';

insert into public.subjects (name, code, year, semester, curriculum) values
  ('Introducción a la programación para medios interactivos', 'DM24-1-PROG-INTRO', 1, 1, 'new'),
  ('Programación para medios interactivos orientada a las tecnologías web', 'DM24-1-PROG-WEB', 1, 1, 'new'),
  ('Taller de diseño digital', 'DM24-1-TALLER-DIGITAL', 1, 1, 'new'),
  ('Taller de diseño de experiencias interactivas', 'DM24-1-TALLER-INTERACTIVAS', 1, 1, 'new'),
  ('Introducción a la imagen digital', 'DM24-1-IMAGEN', 1, 1, 'new'),
  ('Introducción a narrativas transmedia', 'DM24-1-NARRATIVAS', 1, 1, 'new'),
  ('Introducción a los medios digitales', 'DM24-1-MEDIOS', 1, 2, 'new'),
  ('Lenguaje visual 1', 'DM24-1-LENGUAJE-VISUAL', 1, 2, 'new'),
  ('Computación gráfica aplicada y sistemas generativos', 'DM24-2-COMPUTACION', 2, 1, 'new'),
  ('Entornos virtuales e introducción a la simulación y los videojuegos', 'DM24-2-ENTORNOS', 2, 1, 'new'),
  ('Taller de diseño para la web', 'DM24-2-TALLER-WEB', 2, 1, 'new'),
  ('Taller de diseño de información', 'DM24-2-TALLER-INFORMACION', 2, 1, 'new'),
  ('Lenguaje de las narrativas interactivas', 'DM24-2-LENGUAJE-NARRATIVAS', 2, 2, 'new'),
  ('Seminario optativo 1', 'DM24-2-SEMINARIO-1', 2, 2, 'new'),
  ('Seminario optativo 2', 'DM24-2-SEMINARIO-2', 2, 2, 'new'),
  ('Historia, política y cultura contemporáneas', 'DM24-2-HISTORIA', 2, 2, 'new'),
  ('Técnicas y lenguaje sonoro', 'DM24-3-SONORO', 3, 1, 'new'),
  ('Técnicas de realización sonora', 'DM24-3-REALIZACION-SONORA', 3, 1, 'new'),
  ('Taller de diseño de narrativas multisensoriales', 'DM24-3-NARRATIVAS-MULTISENSORIALES', 3, 1, 'new'),
  ('Taller de diseño de experiencias transmedia', 'DM24-3-EXPERIENCIAS-TRANSMEDIA', 3, 1, 'new'),
  ('Lenguaje de los nuevos medios', 'DM24-3-NUEVOS-MEDIOS', 3, 2, 'new'),
  ('Animación multimedial 2D', 'DM24-3-ANIMACION-2D', 3, 2, 'new'),
  ('Formulación y evaluación de proyectos', 'DM24-3-PROYECTOS', 3, 2, 'new'),
  ('Gestión de proyectos', 'DM24-3-GESTION', 3, 2, 'new'),
  ('Producción de textos', 'DM24-3-TEXTOS', 3, 2, 'new'),
  ('Técnicas y lenguaje audiovisual', 'DM24-4-AUDIOVISUAL', 4, 1, 'new'),
  ('Técnicas de realización audiovisual', 'DM24-4-REALIZACION-AUDIOVISUAL', 4, 1, 'new'),
  ('Taller de diseño multimedial', 'DM24-4-TALLER-MULTIMEDIAL', 4, 1, 'new'),
  ('Poéticas tecnológicas y diseño interactivo', 'DM24-4-POETICAS', 4, 1, 'new'),
  ('Animación multimedial 3D', 'DM24-4-ANIMACION-3D', 4, 2, 'new'),
  ('Seminario optativo 3', 'DM24-4-SEMINARIO-3', 4, 2, 'new'),
  ('Teoría del arte', 'DM24-4-TEORIA-ARTE', 4, 2, 'new'),
  ('Metodología de la investigación', 'DM24-4-METODOLOGIA', 4, 2, 'new'),
  ('Fundamentos y aplicaciones de tecnología electrónica', 'DM24-5-ELECTRONICA', 5, 1, 'new'),
  ('Taller de producción final', 'DM24-5-PRODUCCION-FINAL', 5, 1, 'new'),
  ('Seminario optativo 4', 'DM24-5-SEMINARIO-4', 5, 2, 'new'),
  ('Seminario optativo 5', 'DM24-5-SEMINARIO-5', 5, 2, 'new'),
  ('Historia de los medios y sistemas de comunicación contemporáneos', 'DM24-5-HISTORIA-MEDIOS', 5, 2, 'new')
on conflict (code) do update set
  name = excluded.name,
  year = excluded.year,
  semester = excluded.semester,
  curriculum = excluded.curriculum;

-- Correlativas directas del recorrido nuevo. Las alternativas curriculares
-- del documento oficial se dejan como opciones independientes.
insert into public.correlatives (subject_id, required_subject_id)
select target.id, requirement.id
from (values
  ('DM24-1-PROG-WEB', 'DM24-1-PROG-INTRO'),
  ('DM24-1-TALLER-INTERACTIVAS', 'DM24-1-TALLER-DIGITAL'),
  ('DM24-1-NARRATIVAS', 'DM24-1-IMAGEN'),
  ('DM24-2-COMPUTACION', 'DM24-1-PROG-WEB'),
  ('DM24-2-COMPUTACION', 'DM24-1-TALLER-INTERACTIVAS'),
  ('DM24-2-ENTORNOS', 'DM24-1-PROG-WEB'),
  ('DM24-2-TALLER-WEB', 'DM24-1-TALLER-DIGITAL'),
  ('DM24-2-TALLER-INFORMACION', 'DM24-1-LENGUAJE-VISUAL'),
  ('DM24-2-LENGUAJE-NARRATIVAS', 'DM24-1-NARRATIVAS'),
  ('DM24-3-SONORO', 'DM24-2-TALLER-INFORMACION'),
  ('DM24-3-NARRATIVAS-MULTISENSORIALES', 'DM24-2-ENTORNOS'),
  ('DM24-3-EXPERIENCIAS-TRANSMEDIA', 'DM24-2-LENGUAJE-NARRATIVAS'),
  ('DM24-3-NUEVOS-MEDIOS', 'DM24-2-ENTORNOS'),
  ('DM24-3-ANIMACION-2D', 'DM24-2-COMPUTACION'),
  ('DM24-4-AUDIOVISUAL', 'DM24-3-NUEVOS-MEDIOS'),
  ('DM24-4-TALLER-MULTIMEDIAL', 'DM24-3-EXPERIENCIAS-TRANSMEDIA'),
  ('DM24-4-POETICAS', 'DM24-3-ANIMACION-2D'),
  ('DM24-4-ANIMACION-3D', 'DM24-2-ENTORNOS'),
  ('DM24-5-ELECTRONICA', 'DM24-4-AUDIOVISUAL'),
  ('DM24-5-PRODUCCION-FINAL', 'DM24-4-POETICAS'),
  ('DM24-5-PRODUCCION-FINAL', 'DM24-4-METODOLOGIA'),
  ('DM24-5-HISTORIA-MEDIOS', 'DM24-2-HISTORIA')
) as pairs(target_code, requirement_code)
join public.subjects target on target.code = pairs.target_code
join public.subjects requirement on requirement.code = pairs.requirement_code
on conflict do nothing;

notify pgrst, 'reload schema';
