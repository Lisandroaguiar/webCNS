export type CatedraContact = {
  area: string;
  materia: string;
  nombresAlternativos?: string;
  contacto?: string;
  redes?: Array<{ label: string; href: string }>;
  docentes?: string;
};

export const CATEDRAS_SOURCE_URL = "https://www2.fba.unlp.edu.ar/multimedia/catedras/";
export const ESTUDIOS_HYS_SOURCE_URL = "https://www2.fba.unlp.edu.ar/estudioshys/programasycontactos/";

export const catedras: CatedraContact[] = [
  { area: "Núcleo Proyectual", materia: "Taller de Diseño Multimedial I", nombresAlternativos: "Taller de diseño digital · Taller de diseño de experiencias interactivas", redes: [{ label: "@tdmmdos", href: "https://www.instagram.com/tdmmdos/" }] },
  { area: "Núcleo Proyectual", materia: "Taller de Diseño Multimedial II", nombresAlternativos: "Taller de diseño para la web · Taller de diseño de información", contacto: "correo.tdmmdos@gmail.com", redes: [{ label: "@tdmmdos", href: "https://www.instagram.com/tdmmdos/" }] },
  { area: "Núcleo Proyectual", materia: "Taller de Diseño Multimedial III", nombresAlternativos: "Taller de diseño de narrativas multisensoriales · Taller de diseño de experiencias transmedia", contacto: "tallermultimedial3@gmail.com", redes: [{ label: "@tdnm.fda", href: "https://www.instagram.com/tdnm.fda/" }] },
  { area: "Núcleo Proyectual", materia: "Taller de Diseño Multimedial IV", nombresAlternativos: "Taller de diseño multimedial", contacto: "tdmm0010@gmail.com" },
  { area: "Núcleo Proyectual", materia: "Taller de Diseño Multimedial V", nombresAlternativos: "Taller de Producción final", contacto: "tdmm0010@gmail.com", docentes: "Cátedra A: Prof. Federico Joselevich · Cátedra B: Prof. Jorge Lucotti" },
  { area: "Núcleo de los lenguajes", materia: "Lenguaje Multimedial I", nombresAlternativos: "Introducción a la imagen digital · Introducción a las narrativas transmedia", contacto: "idynt.unlp@gmail.com", redes: [{ label: "@iid_fda", href: "https://www.instagram.com/iid_fda/" }] },
  { area: "Núcleo de los lenguajes", materia: "Lenguaje Multimedial II", nombresAlternativos: "Lenguaje de las narrativas interactivas", contacto: "lni.fda.unlp@gmail.com · lmmdosunlp@gmail.com", redes: [{ label: "@lni_fda", href: "https://www.instagram.com/lni.fda/" }] },
  { area: "Núcleo de los lenguajes", materia: "Lenguaje Multimedial III", nombresAlternativos: "Lenguaje de los nuevos medios", contacto: "lenguajemultimedial3@gmail.com" },
  { area: "Núcleo de los lenguajes", materia: "Lenguaje Multimedial IV", nombresAlternativos: "Poéticas tecnológicas y diseño interactivo", contacto: "lenguajemultimedial4@gmail.com" },
  { area: "Núcleo de las tecnologías", materia: "Tecnología Multimedial I", nombresAlternativos: "Introducción a la programación para medios interactivos · Programación para medios interactivos orientada a las tecnologías web" },
  { area: "Núcleo de las tecnologías", materia: "Tecnología Multimedial II", nombresAlternativos: "Computación gráfica aplicada y sistemas generativos · Entornos virtuales e introducción a la simulación y los videojuegos" },
  { area: "Núcleo de las tecnologías", materia: "Tecnología Multimedial III", nombresAlternativos: "Técnicas y lenguaje sonoro · Técnicas de realización sonora", contacto: "tec3fbaunlp@gmail.com", redes: [{ label: "Sitio web", href: "https://e3.ar/sonido/" }] },
  { area: "Núcleo de las tecnologías", materia: "Tecnología Multimedial IV", nombresAlternativos: "Técnicas y lenguaje audiovisual · Técnicas de realización audiovisual", contacto: "tecnologia.multimedia.4.fda@gmail.com", redes: [{ label: "@tmm4_fda", href: "https://www.instagram.com/tmm4_fda/" }, { label: "YouTube", href: "https://www.youtube.com/channel/UCinjZ6wjQJ15d-gTalweUKA" }] },
  { area: "Núcleo de las tecnologías", materia: "Fundamentos y aplicaciones de tecnología electrónica", contacto: "multimedia@fba.unlp.edu.ar" },
  { area: "Formación específica", materia: "Introducción a los medios digitales", contacto: "introduccionmediosdigitales@gmail.com" },
  { area: "Formación específica", materia: "Gestión de proyectos", nombresAlternativos: "Formulación y evaluación de proyectos", contacto: "gestiondeproyectos@fba.unlp.edu.ar" },
  { area: "Formación específica", materia: "Animación 2D / 3D" },
  { area: "Estudios Históricos y Sociales", materia: "Arte Contemporáneo A", nombresAlternativos: "Seminario optativo para DM", contacto: "artecontemporaneofda@gmail.com", docentes: "Titular: Federico L. Santarsiero · Adjunta: Clarisa López Galarza", redes: [{ label: "Sitio web", href: "https://artecontemporaneoafdaunlp.blogspot.com/" }, { label: "@artecontemporaneofda", href: "https://www.instagram.com/artecontemporaneofda/" }] },
  { area: "Estudios Históricos y Sociales", materia: "Arte Contemporáneo B", nombresAlternativos: "Seminario optativo para DM", contacto: "artecontemporaneobfda@gmail.com", docentes: "Titular: María Albero · Adjunta: Guillermina Mongan", redes: [{ label: "@artecontemporaneobfda", href: "https://www.instagram.com/artecontemporaneobfda/" }, { label: "Aulas Web Grado", href: "https://aulaswebgrado.ead.unlp.edu.ar/" }] },
  { area: "Estudios Históricos y Sociales", materia: "Epistemología de las Artes", nombresAlternativos: "Pensamiento Contemporáneo", contacto: "epistemologiadelasartes@gmail.com", docentes: "Titular: Daniel Sánchez · Adjuntas: Paola Sabrina Belén y Sofía Delle Donne", redes: [{ label: "Sitio web", href: "https://epistemologiadelasartes.wordpress.com/" }, { label: "Aulas Web Grado", href: "https://aulaswebgrado.ead.unlp.edu.ar/" }] },
  { area: "Estudios Históricos y Sociales", materia: "Estética", nombresAlternativos: "Fundamentos Estéticos", contacto: "estetica.fba@gmail.com", docentes: "Titular: Silvia García · Adjuntas: Paola Sabrina Belén y Silvina Valesini", redes: [{ label: "Sitio web", href: "http://bellasartesestetica.wordpress.com/" }, { label: "Facebook", href: "https://www.facebook.com/EsteticaFundamentosEsteticos" }] },
  { area: "Estudios Históricos y Sociales", materia: "Fundamentos Psicopedagógicos de la Educación", nombresAlternativos: "Fundamentos de la Educación B", contacto: "fundamentosbfda@gmail.com", docentes: "Titular: Graciana Pérez Lus · Adjuntas: Susana Pilaría y Mercedes del Olmo", redes: [{ label: "Sitio web", href: "http://blogs.unlp.edu.ar/fundpsicoedub/" }] },
  { area: "Estudios Históricos y Sociales", materia: "Historia Social General", nombresAlternativos: "Cátedra B · AA, DM, MP", contacto: "historiasocialgeneralb@gmail.com · agustinaq@yahoo.com · crogovsky@gmail.com · manenep@hotmail.com", docentes: "Titular: Mario N. Oporto", redes: [{ label: "Blog de la cátedra", href: "https://bloghpcc.wordpress.com/" }] },
  { area: "Estudios Históricos y Sociales", materia: "Identidad, Estado y Sociedad", nombresAlternativos: "Historia del Pensamiento Argentino A · DM", contacto: "identidadcatedraaunlp@gmail.com", docentes: "Titular: Marisel Lloberas · Adjunta: Soledad Olbeyra", redes: [{ label: "Sitio web", href: "https://identidadalloberas.wordpress.com/" }] },
  { area: "Estudios Históricos y Sociales", materia: "Didáctica y Prácticas de la Enseñanza", nombresAlternativos: "Cátedra B · DCV, DI, DM", contacto: "didacticafda@gmail.com", docentes: "Titular: Leopoldo Dameno · Adjunta: Lorena Vergani", redes: [{ label: "Sitio web", href: "https://didacticafda.com.ar/" }] },
  { area: "Seminarios optativos", materia: "Seminario de Comunicación Visual" },
  { area: "Seminarios optativos", materia: "Diseño narrativo y guion de videojuegos" },
  { area: "Otros departamentos", materia: "Seminarios optativos de otros departamentos", contacto: "Artes audiovisuales: daa@fba.unlp.edu.ar · Artes Visuales: plastica@fba.unlp.edu.ar · Música: musica@fba.unlp.edu.ar · DCV: ddcv@fba.unlp.edu.ar · Diseño Industrial: disindustrial@fba.unlp.edu.ar · Sonido: sonido@fba.unlp.edu.ar" }
];
