-- Profesorado en Diseño Multimedial, plan 2006. Reejecutable.
-- Fuente: https://www2.fba.unlp.edu.ar/multimedia/wp-content/uploads/sites/3/2023/03/PLAN-DISENO-MULTIMEDIAL_actualizado.pdf
-- Ejecutar después de seed-subjects.sql. Conserva IDs e historial.
begin;
insert into public.subjects (code, name, year, semester, curriculum) values
 ('DM-4-FUNDAMENTOS', 'Fundamentos Psicopedagógicos de la Educación', 4, 2, 'old'),
 ('DM-5-DIDACTICA', 'Didáctica Especial y Práctica de la Enseñanza', 5, 1, 'old')
on conflict (code) do update set name = excluded.name, year = excluded.year, semester = excluded.semester, curriculum = excluded.curriculum;
update public.subjects set name = 'Producción de Textos' where code = 'DM-1-TEXTOS';
update public.subjects set name = 'Epistemología del Arte' where code = 'DM-4-EPISTEMOLOGIA';
update public.subjects set name = 'Identidad, Estado y Sociedad en Latinoamérica y Argentina' where code = 'DM-2-IDENTIDAD';
-- La distinción cursada/aprobada para habilitar inscripción se conserva en
-- lib/academic/degree-catalog.ts; la tabla histórica solo almacena pares.
insert into public.correlatives (subject_id, required_subject_id)
select s.id, r.id from (values
 ('DM-4-FUNDAMENTOS','DM-3-TALLER'), ('DM-4-FUNDAMENTOS','DM-3-LENGUAJE'), ('DM-4-FUNDAMENTOS','DM-3-TECNOLOGIA'),
 ('DM-5-DIDACTICA','DM-4-METODOLOGIA'), ('DM-5-DIDACTICA','DM-4-FUNDAMENTOS'),
 ('DM-5-DIDACTICA','DM-4-TALLER'), ('DM-5-DIDACTICA','DM-4-LENGUAJE'), ('DM-5-DIDACTICA','DM-4-TECNOLOGIA')
) p(subject_code, required_code)
join public.subjects s on s.code=p.subject_code join public.subjects r on r.code=p.required_code
on conflict do nothing;
commit;
