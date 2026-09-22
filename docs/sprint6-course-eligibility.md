# Qué puedo cursar: alcance de la beta

La fuente de verdad para el Plan 2006 son las condiciones **para cursar** de `requirements2006` en `lib/academic/degree-catalog.ts`, transcritas del [plan de Licenciatura y Profesorado](https://www2.fba.unlp.edu.ar/multimedia/wp-content/uploads/sites/3/2023/03/PLAN-DISENO-MULTIMEDIAL_actualizado.pdf). La tabla `correlatives` sólo conserva pares de materias y no distingue cursada regular de materia aprobada; por eso no alcanza por sí sola para este cálculo.

`user_subjects.status = passed` significa aprobada; `regular` significa cursada regularizada; `pending` o la ausencia de registro no satisface un requisito. Para un requisito `regular` se admite `regular` o `passed`; para uno `passed` sólo `passed`. Una materia sin requisitos está disponible. Sólo se evalúan materias del plan activo y de la Licenciatura o Profesorado seleccionado.

El Plan 2024 tiene reglas alternativas que el esquema de pares no representa. Las materias aún no aprobadas o regularizadas se muestran como **revisión manual**, nunca como disponibles automáticamente. Tampoco se convierten reglas ausentes en recomendaciones. Para soportar ese plan hará falta modelar grupos de requisitos, alternativas y tipo de cumplimiento, validar los datos oficiales y migrarlos antes de activar el cálculo.

La pantalla es orientativa: depende del recorrido cargado por el estudiante y de las reglas registradas; no sustituye la verificación de las condiciones vigentes del plan.
