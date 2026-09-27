# Autoridad de datos académicos y personales

Mesita conoce el plan; cada estudiante organiza su cursada. Una carrera nueva puede funcionar con carrera, plan, materias y correlatividades, sin cargar horarios ni aulas institucionales.

| Dato | Autoridad | Regla |
| --- | --- | --- |
| Carrera y plan | `profiles` y metadatos de carrera | Acotan materias y matching. |
| Materias y correlatividades | `subjects`, `correlatives` y reglas verificadas del plan | Estructura académica de Mesita. |
| Recorrido | `user_subjects` | Historial del estudiante; el PDF requiere revisión antes del upsert. |
| Cursadas, día, aula, sede, comisión y notas | `user_course_entries` | Datos exclusivamente personales, editables y sin FK a horarios institucionales. |
| Eventos personales | `user_calendar_events` | Datos del estudiante. |
| Fechas FDA | `academic_events` publicados | Fuente institucional para agenda, dashboard y avisos. |

`subject_aliases` contiene nombres equivalentes verificados, acotados por plan. El PDF se procesa en memoria; no se guarda el archivo ni datos personales ajenos al recorrido.

## Retiro de horarios institucionales

La migración `20260925100000_personal_course_entries.sql` crea `user_course_entries` con RLS por usuario. Copia todas las filas de `user_custom_schedule_slots` y las selecciones de `user_schedule_selections` que no tengan ya una copia personalizada del mismo horario. `legacy_custom_slot_id` y `legacy_selection_id` hacen la copia idempotente. Una selección anterior conserva los valores disponibles al momento de migrar; desde entonces el estudiante puede editarlos. Las materias de selecciones sin `subject_id` se conservan con el nombre histórico para que no se pierda la cursada. Un trigger transitorio replica escrituras posteriores de la tabla personal vieja mientras la versión anterior de la app siga activa.

FKs históricas hacia `course_schedules`:

- `user_schedule_selections.course_schedule_id` (`ON DELETE RESTRICT`);
- `user_custom_schedule_slots.source_schedule_id` (`ON DELETE SET NULL`);
- `admin_schedule_overrides.course_schedule_id` (`ON DELETE CASCADE`).

Auditoría remota del 25/09/2026: 106 filas en `course_schedules`, 0 selecciones en `user_schedule_selections`, 3 cursadas en `user_custom_schedule_slots`, 0 con `source_schedule_id` y 0 selecciones sin `subject_id`. Las tres FKs anteriores se confirmaron en `pg_constraint`. El 27/09/2026 se aplicó la migración en producción: `user_course_entries` quedó con 3 filas, se conservaron las 3 filas antiguas, existen 4 políticas RLS y los 2 triggers de transición.

No se eliminan esas tablas ni los datos publicados. `course_schedules` y `user_schedule_selections` quedan marcadas como **deprecated** en PostgreSQL. El código nuevo no lee ninguna de las dos para construir pantallas ni crea selecciones nuevas. `/admin/horarios`, `/api/admin/horarios`, `/api/mi-semana` y `/api/mi-agenda/suggestions` se retiraron. `/admin/imports` solo ofrece calendarios FDA, y su API rechaza claves de horarios.

Los nombres `raw_subject_name` y `source_schedule_id` permanecen únicamente en migraciones y utilidades/tests históricos de parsing o compatibilidad. `source_schedule_id` se usa una sola vez en la migración para evitar duplicar una selección que el estudiante ya había personalizado. Ninguna experiencia activa consulta `course_schedules`.

## Despliegue y verificación

1. Aplicar la migración nueva antes de desplegar la aplicación. Completado el 27/09/2026; el trigger transitorio mantiene sincronizada la tabla personal vieja hasta completar el despliegue.
2. Comparar por usuario los conteos de filas antiguas con `legacy_custom_slot_id` y `legacy_selection_id` en la tabla nueva. Comprobar las selecciones sin materia vinculada y las cursadas anuales.
3. Reejecutar la migración si hubo escrituras antiguas entre la copia y el despliegue; `ON CONFLICT` evita duplicados.
4. Comprobar RLS de `user_course_entries` con cuenta anónima y dos cuentas normales; validar agenda, dashboard, recorrido, Qué podés cursar, Cátedras, Fechas FDA y Cartelera.
5. Tras verificar que no hay clientes antiguos, una migración posterior puede retirar el trigger transitorio, revocar los permisos de escritura históricos y retirar físicamente las tablas obsoletas. No hacerlo en este cambio.

La eliminación física de `course_schedules` requiere otro sprint y una auditoría remota de FKs y clientes antiguos. El modelo de materias del plan 2006 aún tiene reglas codificadas en `degree-catalog.ts`; se deberán migrar antes de sumar otras carreras.
