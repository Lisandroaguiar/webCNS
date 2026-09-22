# Mesita · Artes UNLP

Aplicación web para organizar el recorrido académico de estudiantes de la Facultad de Artes de la UNLP.

## Puesta en marcha

1. Instalar Node.js 18.17 o superior.
2. Ejecutar `npm install`.
3. Crear `.env.local` copiando `.env.example` y completar las credenciales del proyecto Supabase.
4. En el SQL Editor de Supabase ejecutar [`supabase/mvp-schema.sql`](./supabase/mvp-schema.sql) para habilitar el seguimiento actual de materias. El archivo [`supabase/schema.sql`](./supabase/schema.sql) pertenece al esquema académico anterior.
5. Ejecutar `npm run dev` y abrir `http://localhost:3000`.

La carga del analítico tiene preparada la interfaz y el flujo de recepción; la extracción OCR es un punto de extensión para conectar una API segura en servidor sin exponer claves en el cliente.

## MVP Cronopios

- [`components/ScrapbookCard.tsx`](./components/ScrapbookCard.tsx): tarjeta de cartelera con cinta, rotación y sombra sólida.
- [`components/SubjectItem.tsx`](./components/SubjectItem.tsx): materia con checkbox dibujado y trazo animado con Framer Motion.
- [`supabase/mvp-schema.sql`](./supabase/mvp-schema.sql): DDL para `profiles`, `subjects`, `correlatives`, `user_subjects` y `community_posts`, incluyendo RLS.
- [`lib/supabase/mvp-queries.ts`](./lib/supabase/mvp-queries.ts): helpers tipados para consultar materias, guardar el historial y leer la cartelera.
- `/recorrido`: recorrido académico del estudiante.
- `/comunidad`: cartelera comunitaria.

El esquema `mvp-schema.sql` es independiente del esquema académico anterior (`schema.sql`) para permitir una migración gradual.

## Profesorado en Diseño Multimedial — plan 2006

Después de los catálogos base, ejecutar `supabase/seed-profesorado-2006.sql`.
También se puede aplicar con `node scripts/seed-profesorado-2006.cjs` usando
la clave de servicio del servidor en `.env.local` (nunca en el navegador).
El importador conserva los IDs existentes y no modifica `user_subjects`.

Fuente: https://www2.fba.unlp.edu.ar/multimedia/wp-content/uploads/sites/3/2023/03/PLAN-DISENO-MULTIMEDIAL_actualizado.pdf

`lib/academic/degree-catalog.ts` distingue las materias exclusivas de cada título
(22 para Profesorado, 25 para Licenciatura) y las correlativas para cursar que
exigen cursada o aprobación. Los nombres compartidos se conservan bajo el mismo
ID. El dashboard y el importador filtran por carrera y plan. Las aprobaciones
ajenas a la carrera permanecen guardadas pero no integran su porcentaje.
La fuente publicada marca Teoría de la Práctica Artística como exclusiva de
Licenciatura: un certificado que la incluya en Profesorado requiere revisión
de su aplicabilidad; no se crea una equivalencia automática.
Esta incorporación corresponde al plan 2006, no al Profesorado 2024.

La carrera seleccionada se guarda en `auth.users.user_metadata.degree`; el plan
se guarda en `profiles.curriculum`. No se requiere `profiles.degree`. La carrera
es un dato académico editable y nunca se utiliza para otorgar permisos.
