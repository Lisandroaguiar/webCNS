# Sprint 9 — Artes Plásticas y modelo multicarrera

## Auditoría previa

`profiles.curriculum` admitía sólo `old/new`; el título vivía en metadatos de Auth. `subjects` mezclaba identidad de la materia y pertenencia al plan, con `code` único aunque el plan oficial reutiliza P0083 en varios talleres. `user_subjects` estaba ligado al usuario y a esa tabla, sin trayectoria. `correlatives` no distingue «para cursar» y «para aprobar», ni condición cursada/aprobada. La elegibilidad de Multimedia usa reglas 2006 en código y devuelve revisión manual para 2024. Inicio, Recorrido y Mi agenda tomaban únicamente la selección legada de Multimedia.

## Modelo aditivo

La migración `20260927120000_sprint9_multicarrera.sql` agrega programas, orientaciones, planes, pertenencias de materias a planes, requisitos de elección, correlativas tipadas, rollout, equivalencias vacías y trayectorias personales. Permite varias trayectorias y sólo una activa. Las tablas nuevas tienen RLS: catálogo de lectura pública e historial privado. No modifica ni elimina `subjects`, `user_subjects` o `profiles`. Copia a trayectorias Multimedia el plan activo y los otros planes con historial existente. La app anterior de Multimedia sigue usando sus tablas para compatibilidad.

La migración `20260927121000_sprint9_plastica_plans.sql` transcribe los cuadros de 2006 y 2023 provistos. Una materia canónica se comparte entre planes si el concepto es el mismo; cada lugar del plan conserva nombre y código oficiales, incluso cuando un código se repite. Se cargan los cuatro programas/títulos, las siete orientaciones, condiciones de título, el requisito de cuatro talleres complementarios de orientación distinta, la condición de Dibujo Complementario 2–4 y la implementación gradual 2023 indicada en el pedido. No hay equivalencias 2006↔2023 inventadas.

Las correlativas 2023 que se pueden identificar de modo inequívoco están registradas con propósito y estado requerido. Las demás filas están en `manual_review`; «Qué podés cursar» no las declara disponibles. El progreso de Plástica sólo cuenta requisitos obligatorios conocidos y avisa que talleres y seminarios electivos quedan fuera del porcentaje. Los talleres básicos permanecen como una materia por nivel con orientación en la trayectoria; no se inventaron siete códigos de SIU.

## Interfaz y analítico

Onboarding enlaza con Mis trayectorias, donde se elige título, orientación y plan, se cambia la trayectoria activa y se carga el avance. Recorrido, Inicio, Qué podés cursar, Perfil y Mi agenda respetan la trayectoria Plástica activa. Los horarios, aulas, sedes y comisiones de agenda siguen siendo datos personales. Cátedras de Plástica no muestra horarios ni fichas no verificadas. El analítico detecta familia, plan, título y orientación si está declarada explícitamente; el matching se restringe a la trayectoria elegida. Sólo EXACT se preselecciona; el resto requiere elección o descarte manual y confirmación de contexto.

## Límites y validación

- La cartilla 2006 anota que ingresantes 2024 cursan Producción de Textos en 3.º; esa excepción por cohorte no se modela todavía. La fila queda en revisión manual.
- El historial legado de Multimedia no registraba el título al momento de cada nota; la copia lo atribuye al título actual del perfil y conserva el registro original para cualquier corrección posterior.
- Falta cotejar con SIU/estudiantes reales los talleres complementarios concretos por orientación, códigos repetidos y todas las correlativas restantes; no hay datos suficientes para dar elegibilidad automática completa.
- Los PDFs son cuadros de una página; los alcances Lic/Prof se verificaron por sombreado. Las filas dudosas mantienen `manual_review`.
- Ambas migraciones se ejecutaron en Supabase de producción con autorización del usuario. La primera dejó cuatro planes, ocho trayectorias preexistentes de Multimedia y 65 materias vinculadas al plan Multimedia. La segunda dejó 34 lugares de plan 2006 (12 verificados) y 33 de 2023 (13 verificados); cada plan contiene dos lugares exclusivos de Licenciatura y dos de Profesorado.
- E2E real desde la versión local conectada a Supabase remoto: Licenciatura/Pintura/2006, Profesorado/Dibujo/2006, Licenciatura/Grabado y Arte Impreso/2023, y Profesorado/Escultura/2023. Se comprobaron los requisitos exclusivos de título y la agenda manual, incluida la eliminación de la cursada ficticia. La trayectoria activa original de Multimedia fue restaurada. La limpieza de las cinco trayectorias ficticias quedó sujeta a la confirmación de borrado solicitada al usuario.
- Pendiente antes de declarar elegibilidad completa: probar RLS con una cuenta normal, verificar el historial Multimedia de un usuario concreto, revisar un analítico real de Plástica con consentimiento del estudiante y cotejar las filas `manual_review` con fuentes académicas. La versión de Vercel no se desplegó en esta tarea.

## Verificación local

`npm.cmd test`: 91 pruebas aprobadas. `npm.cmd run build`: completado. `git diff --check`: sin errores de espacios. Las migraciones se verificaron en Supabase remoto mediante el editor SQL.

Fuentes: PDFs del usuario `PLAN DE ESTUDIOS_Prof y Lic AV 2023.pdf` y `PROGRAMA LIC Y PROF PLASTICA 2006_modif 2025.pdf`; [Departamento de Artes Visuales FDA-UNLP](https://www2.fba.unlp.edu.ar/artesvisuales/informacion-academica/plan-de-estudios/).
