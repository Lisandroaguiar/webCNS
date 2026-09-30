-- Las orientaciones de ambos planes oficiales son las opciones de los cuatro
-- talleres complementarios a elección, salvo la orientación básica propia.
-- No asigna talleres a slots ni inventa nombres SIU individuales.
insert into public.plastic_workshop_options
  (id, orientation_id, academic_name, siu_name, official_code, verification_status, source_document)
select
  'plastica-' || o.id || '-complementaria',
  o.id,
  o.name,
  null,
  null,
  'verified',
  'PLAN DE ESTUDIOS_Prof y Lic AV 2023.pdf; PROGRAMA LIC Y PROF PLASTICA 2006_modif 2025.pdf'
from public.academic_orientations o
where o.family = 'Artes Plásticas'
  and o.id in (
    'dibujo', 'grabado_arte_impreso', 'pintura', 'ceramica',
    'escenografia', 'escultura', 'muralismo_arte_publico_monumental'
  )
on conflict (orientation_id, academic_name) do update
  set verification_status = 'verified',
      source_document = excluded.source_document;
