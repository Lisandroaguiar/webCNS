-- Transcripción de los dos cuadros oficiales proporcionados. Los nombres/códigos
-- ambiguos del póster quedan en manual_review hasta cotejar tabla textual/SIU.
create temporary table sprint9_plan_rows (
  plan text, slot text, canonical text, code text, name text, year_level smallint,
  period text, degree_scope text, orientation_condition text, requirement_kind text,
  review_status text
) on commit drop;

insert into sprint9_plan_rows values
('2006','procedimientos','procedimientos','P0001','Procedimientos de las Artes Plásticas',1,'annual','both','all','required','verified'),
('2006','lenguaje-1','lenguaje-1','H0003','Lenguaje Visual I',1,'annual','both','all','required','verified'),
('2006','dibujo-comp-1','dibujo-comp-1','P0003','Dibujo Complementario I',1,'annual','both','all','required','verified'),
('2006','historia-social','historia-social','H0015','Historia Social General',1,'annual','both','all','required','verified'),
('2006','arte-contemporaneo','arte-contemporaneo','H0006','Arte Contemporáneo',1,'semester','both','all','required','verified'),
('2006','produccion-textos','produccion-textos','H0005','Producción de Textos',1,'annual','both','all','required','manual_review'),
('2006','taller-basico-1','taller-basico-1','P0033','Taller Básico I',2,'annual','both','all','orientation','manual_review'),
('2006','taller-comp-1','taller-comp-1','P0083','Taller Complementario I',2,'semester','both','all','choice','manual_review'),
('2006','taller-comp-2','taller-comp-2','P0083','Taller Complementario II',2,'semester','both','all','choice','manual_review'),
('2006','lenguaje-2','lenguaje-2','H0037','Lenguaje Visual II',2,'annual','both','all','required','manual_review'),
('2006','dibujo-comp-2','dibujo-comp-2','P0003','Dibujo Complementario II',2,'annual','both','not_dibujo','required','manual_review'),
('2006','historia-visual-1','historia-visual-1','H0001','Historia de las Artes Visuales I',2,'semester','both','all','required','manual_review'),
('2006','historia-visual-2','historia-visual-2','H0002','Historia de las Artes Visuales II',2,'semester','both','all','required','manual_review'),
('2006','identidad-estado-sociedad','identidad-estado-sociedad','H0023','Identidad, Estado y Sociedad en Argentina y Latinoamérica',2,'annual','both','all','required','manual_review'),
('2006','taller-basico-2','taller-basico-2','P0034','Taller Básico II',3,'annual','both','all','orientation','manual_review'),
('2006','taller-comp-3','taller-comp-3','P0083','Taller Complementario III',3,'semester','both','all','choice','manual_review'),
('2006','taller-comp-4','taller-comp-4','P0057','Taller Complementario IV',3,'semester','both','all','choice','manual_review'),
('2006','lenguaje-3','lenguaje-3','H0040','Lenguaje Visual III',3,'annual','both','all','required','manual_review'),
('2006','dibujo-comp-3','dibujo-comp-3','P0004','Dibujo Complementario III',3,'annual','both','not_dibujo','required','manual_review'),
('2006','historia-visual-3','historia-visual-3','H0007','Historia de las Artes Visuales III',3,'semester','both','all','required','manual_review'),
('2006','historia-visual-4','historia-visual-4','H0008','Historia de las Artes Visuales IV',3,'semester','both','all','required','manual_review'),
('2006','estetica','estetica','H0051','Estética',3,'annual','both','all','required','manual_review'),
('2006','taller-basico-3','taller-basico-3','P0035','Taller Básico III',4,'annual','both','all','orientation','manual_review'),
('2006','taller-comp-5','taller-comp-5','P0057','Taller Complementario V (Artes Combinadas)',4,'semester','both','all','choice','manual_review'),
('2006','taller-comp-6','taller-comp-6','P0058','Taller Complementario VI (Fotografía e Imagen Digital)',4,'semester','both','all','choice','manual_review'),
('2006','dibujo-comp-4','dibujo-comp-4','P0005','Dibujo Complementario IV',4,'annual','both','not_dibujo','required','manual_review'),
('2006','teoria-practica','teoria-practica','H0050','Teoría de la Práctica Artística',4,'annual','both','all','required','manual_review'),
('2006','epistemologia','epistemologia','H0016','Epistemología de las Artes',4,'semester','both','all','required','manual_review'),
('2006','metodologia','metodologia','H0030','Metodología de la Investigación',4,'semester','both','all','required','manual_review'),
('2006','fundamentos-educacion','fundamentos-educacion','H0031','Fundamentos Psicopedagógicos de la Educación',4,'annual','profesorado','all','required','manual_review'),
('2006','graduacion','graduacion','P0049','Taller de Trabajo de Graduación',5,'annual','licenciatura','all','required','manual_review'),
('2006','didactica','didactica','H0032','Didáctica Especial y Práctica de la Enseñanza',5,'annual','profesorado','all','required','manual_review'),
('2006','legislacion','legislacion','H0070','Legislación y Práctica Cultural',5,'semester','both','all','required','manual_review'),
('2006','seminario-1','seminario-1','O0010','Asignatura o Seminario a Elección',5,'semester','licenciatura','all','choice','manual_review'),
('2023','procedimientos','procedimientos','P0001','Procedimientos de las Artes Plásticas',1,'annual','both','all','required','verified'),
('2023','lenguaje-1','lenguaje-1','H0003','Lenguaje Visual 1',1,'annual','both','all','required','verified'),
('2023','dibujo-1','dibujo-1','P0002','Dibujo 1',1,'annual','both','all','required','verified'),
('2023','arte-contemporaneo','arte-contemporaneo','H0006','Arte Contemporáneo',1,'semester','both','all','required','verified'),
('2023','taller-basico-1','taller-basico-1','P0033','Taller Básico 1',2,'annual','both','all','orientation','manual_review'),
('2023','taller-comp-1','taller-comp-1','P0083','Taller Complementario 1',2,'semester','both','all','choice','manual_review'),
('2023','taller-comp-2','taller-comp-2','P0083','Taller Complementario 2',2,'semester','both','all','choice','manual_review'),
('2023','lenguaje-2','lenguaje-2','H0037','Lenguaje Visual 2',2,'annual','both','all','required','manual_review'),
('2023','dibujo-2','dibujo-2','P0003','Dibujo 2',2,'annual','both','not_dibujo','required','manual_review'),
('2023','historia-visual-1','historia-visual-1','H0001','Historia de las Artes Visuales 1',2,'semester','both','all','required','manual_review'),
('2023','historia-politica','historia-politica','H0105','Historia, Política y Cultura Contemporáneas',2,'annual','both','all','required','manual_review'),
('2023','taller-basico-2','taller-basico-2','P0034','Taller Básico 2',3,'annual','both','all','orientation','manual_review'),
('2023','taller-comp-3','taller-comp-3','P0083','Taller Complementario 3',3,'semester','both','all','choice','manual_review'),
('2023','taller-comp-4','taller-comp-4','P0083','Taller Complementario 4',3,'semester','both','all','choice','manual_review'),
('2023','lenguaje-3','lenguaje-3','H0040','Lenguaje Visual 3',3,'annual','both','all','required','manual_review'),
('2023','dibujo-3','dibujo-3','P0004','Dibujo 3',3,'annual','both','not_dibujo','required','manual_review'),
('2023','historia-visual-2','historia-visual-2','H0002','Historia de las Artes Visuales 2',3,'semester','both','all','required','manual_review'),
('2023','produccion-textos-a','produccion-textos-a','H0005','Producción de Textos A',3,'annual','both','all','required','manual_review'),
('2023','epistemologia','epistemologia','H0016','Epistemología de las Artes',3,'semester','both','all','required','manual_review'),
('2023','taller-basico-3','taller-basico-3','P0035','Taller Básico 3',4,'annual','both','all','orientation','manual_review'),
('2023','taller-comp-artes','taller-comp-artes','P0057','Taller Complementario (Artes Combinadas)',4,'semester','both','all','choice','manual_review'),
('2023','taller-comp-foto','taller-comp-foto','P0058','Taller Complementario (Fotografía e Imagen Digital)',4,'semester','both','all','choice','manual_review'),
('2023','dibujo-4','dibujo-4','P0005','Dibujo 4',4,'annual','both','not_dibujo','required','manual_review'),
('2023','teoria-arte','teoria-arte','H0113','Teoría del Arte',4,'annual','both','all','required','manual_review'),
('2023','historia-visual-3','historia-visual-3','H0007','Historia de las Artes Visuales 3',4,'semester','both','all','required','manual_review'),
('2023','metodologia','metodologia','H0030','Metodología de la Investigación',4,'semester','both','all','required','manual_review'),
('2023','fundamentos-educacion','fundamentos-educacion','H0031','Fundamentos de la Educación',4,'annual','profesorado','all','required','manual_review'),
('2023','legislacion','legislacion','H0070','Legislación y Política Cultural',5,'semester','both','all','required','manual_review'),
('2023','historia-visual-4','historia-visual-4','H0008','Historia de las Artes Visuales 4',5,'semester','both','all','required','manual_review'),
('2023','didactica','didactica','H0032','Didáctica Especial y Prácticas de la Enseñanza',5,'annual','profesorado','all','required','manual_review'),
('2023','seminario-1','seminario-1','O0010','Seminario a Elección 1',5,'semester','both','all','choice','manual_review'),
('2023','seminario-2','seminario-2','O0011','Seminario a Elección 2',5,'semester','licenciatura','all','choice','manual_review'),
('2023','graduacion','graduacion','P0049','Taller de Trabajo de Graduación',5,'annual','licenciatura','all','required','manual_review');

insert into public.academic_subjects (id,family,canonical_name)
select distinct on (canonical) 'plastica-' || canonical,'Artes Plásticas',name
from sprint9_plan_rows order by canonical,plan desc
on conflict (id) do nothing;

insert into public.curriculum_subjects
  (id,curriculum_id,subject_id,official_code,official_name,year_level,period,degree_scope,orientation_condition,requirement_kind,source_document,review_status)
select 'plastica-' || plan || '-' || slot,'plastica-' || plan,'plastica-' || canonical,code,name,year_level,period,degree_scope,orientation_condition,requirement_kind,
  case when plan = '2006' then 'PROGRAMA LIC Y PROF PLASTICA 2006_modif 2025.pdf' else 'PLAN DE ESTUDIOS_Prof y Lic AV 2023.pdf' end,review_status
from sprint9_plan_rows
on conflict (id) do nothing;

insert into public.curriculum_requirements (id,curriculum_id,requirement_type,required_count,pool,exclude_enrollment_orientation,source_document) values
  ('plastica-2006-four-complementary','plastica-2006','choice',4,'complementary_workshops',true,'PROGRAMA LIC Y PROF PLASTICA 2006_modif 2025.pdf'),
  ('plastica-2023-four-complementary','plastica-2023','choice',4,'complementary_workshops',true,'PLAN DE ESTUDIOS_Prof y Lic AV 2023.pdf')
on conflict (id) do nothing;

-- No se cargan equivalencias sin tabla oficial verificable.

-- Correlatividades 2023 legibles sin ambigüedad en las columnas del cuadro.
-- En las filas con código repetido P0083 o grupos de elección, la evaluación
-- automática permanece pendiente de cotejo específico.
insert into public.curriculum_prerequisites
  (target_curriculum_subject_id,required_curriculum_subject_id,purpose,required_status,source_document)
select 'plastica-2023-' || target,'plastica-2023-' || required,purpose,required_status,
  'PLAN DE ESTUDIOS_Prof y Lic AV 2023.pdf'
from (values
  ('lenguaje-2','procedimientos','enroll','passed'),('lenguaje-2','lenguaje-1','enroll','passed'),
  ('lenguaje-2','procedimientos','pass','passed'),('lenguaje-2','lenguaje-1','pass','passed'),
  ('dibujo-2','dibujo-1','enroll','passed'),('dibujo-2','dibujo-1','pass','passed'),
  ('historia-visual-1','arte-contemporaneo','enroll','regular'),('historia-visual-1','arte-contemporaneo','pass','passed'),
  ('historia-politica','arte-contemporaneo','enroll','regular'),('historia-politica','arte-contemporaneo','pass','passed'),
  ('lenguaje-3','taller-basico-1','enroll','passed'),('lenguaje-3','lenguaje-2','enroll','passed'),
  ('lenguaje-3','taller-basico-1','pass','passed'),('lenguaje-3','lenguaje-2','pass','passed'),
  ('dibujo-3','dibujo-2','enroll','passed'),('dibujo-3','dibujo-2','pass','passed'),
  ('historia-visual-2','historia-visual-1','enroll','regular'),('historia-visual-2','arte-contemporaneo','enroll','passed'),
  ('historia-visual-2','historia-visual-1','pass','passed'),
  ('produccion-textos-a','historia-politica','enroll','regular'),('produccion-textos-a','historia-politica','pass','passed'),
  ('epistemologia','arte-contemporaneo','enroll','regular'),('epistemologia','historia-politica','enroll','regular'),
  ('epistemologia','arte-contemporaneo','pass','passed'),('epistemologia','historia-politica','pass','passed')
) as rules(target,required,purpose,required_status)
on conflict do nothing;

update public.curriculum_subjects set review_status = 'verified'
where id in ('plastica-2023-lenguaje-2','plastica-2023-dibujo-2','plastica-2023-historia-visual-1',
  'plastica-2023-historia-politica','plastica-2023-lenguaje-3','plastica-2023-dibujo-3',
  'plastica-2023-historia-visual-2','plastica-2023-produccion-textos-a','plastica-2023-epistemologia');

insert into public.curriculum_prerequisites
  (target_curriculum_subject_id,required_curriculum_subject_id,purpose,required_status,source_document)
select 'plastica-2006-' || target,'plastica-2006-' || required,purpose,required_status,
  'PROGRAMA LIC Y PROF PLASTICA 2006_modif 2025.pdf'
from (values
  ('lenguaje-2','procedimientos','enroll','passed'),('lenguaje-2','lenguaje-1','enroll','passed'),
  ('dibujo-comp-2','dibujo-comp-1','enroll','passed'),
  ('historia-visual-2','historia-visual-1','enroll','regular'),('historia-visual-2','historia-visual-1','pass','passed'),
  ('identidad-estado-sociedad','historia-social','enroll','regular'),('identidad-estado-sociedad','historia-social','pass','passed'),
  ('lenguaje-3','taller-basico-1','enroll','passed'),('lenguaje-3','lenguaje-2','enroll','passed'),
  ('historia-visual-3','historia-visual-2','enroll','regular'),('historia-visual-3','historia-visual-2','pass','passed'),
  ('historia-visual-4','historia-visual-3','enroll','regular'),('historia-visual-4','historia-visual-3','pass','passed')
) as rules(target,required,purpose,required_status)
on conflict do nothing;
update public.curriculum_subjects set review_status = 'verified'
where id in ('plastica-2006-lenguaje-2','plastica-2006-dibujo-comp-2','plastica-2006-historia-visual-2',
  'plastica-2006-identidad-estado-sociedad','plastica-2006-lenguaje-3',
  'plastica-2006-historia-visual-3','plastica-2006-historia-visual-4');
