import { normalizeSubjectName } from "./analytic-parser";

type PublishedSchedule = {
  id: number;
  raw_subject_name: string;
  source_label: string;
  curriculum: string | null;
  academic_year: number;
  semester: number | null;
  weekday: string;
  start_time: string | null;
  end_time: string | null;
  commission: string | null;
};

const aliases: Record<string, string> = {
  "programacion para medios interactivos": "programacion para medios interactivos orientada a las tecnologias web",
  "introduccion a narrativas transmedia": "introduccion a las narrativas transmedias",
  "int a los medios digitales": "introduccion a los medios digitales",
  "taller de diseno de experiencias": "taller de diseno de experiencias interactivas",
};

function canonicalName(name: string) {
  const normalized = normalizeSubjectName(name).replace(/\b(i{1,3}|iv|v)\b/g, numeral => ({ i: "1", ii: "2", iii: "3", iv: "4", v: "5" })[numeral] ?? numeral);
  return aliases[normalized] ?? normalized;
}

const preferredSource = "Secretaría de Asuntos Estudiantiles — Multimedia";

/** Reemplaza sólo copias de una misma materia, plan y período; conserva comisiones distintas. */
export function dedupePublishedSchedules<T extends PublishedSchedule>(schedules: T[]): T[] {
  const preferredGroups = new Set(schedules.filter(row => row.source_label === preferredSource).map(row => [row.academic_year, row.curriculum ?? "", row.semester ?? "annual", canonicalName(row.raw_subject_name)].join("|")));
  return schedules.filter(row => row.source_label === preferredSource || !preferredGroups.has([row.academic_year, row.curriculum ?? "", row.semester ?? "annual", canonicalName(row.raw_subject_name)].join("|")));
}

export function formatScheduleTime(value: string | null | undefined) {
  return value?.match(/^\d{1,2}:\d{2}/)?.[0] ?? "";
}

/** Dos filas con la misma materia, franja y aula representan una sola opción visible. */
export function collapseIdenticalMeetings<T extends PublishedSchedule & { classroom: string | null }>(schedules: T[], semester: number): T[] {
  const groups = new Map<string, T[]>();
  for (const row of schedules) {
    const name = normalizeSubjectName(scheduleSubjectLabel(row, row.semester ?? semester).primary);
    const key = [name, row.weekday, formatScheduleTime(row.start_time), formatScheduleTime(row.end_time), normalizeSubjectName(row.classroom ?? "")].join("|");
    const previous = groups.get(key) ?? [];
    const specific = /^comisi[oó]n/i.test(row.commission ?? "");
    if (specific) {
      const differentCommission = previous.filter(item => /^comisi[oó]n/i.test(item.commission ?? "") && normalizeSubjectName(item.commission ?? "") !== normalizeSubjectName(row.commission ?? ""));
      if (!previous.some(item => normalizeSubjectName(item.commission ?? "") === normalizeSubjectName(row.commission ?? ""))) groups.set(key, [...differentCommission, row]);
    } else if (!previous.length) groups.set(key, [row]);
  }
  return Array.from(groups.values()).flat();
}

const oldNameByNew: Record<string, string> = {
  "taller de diseno digital": "Taller de diseño multimedial 1",
  "taller de diseno de experiencias interactivas": "Taller de diseño multimedial 1",
  "taller de diseno para la web": "Taller de diseño multimedial 2",
  "taller de diseno de informacion": "Taller de diseño multimedial 2",
  "taller de diseno de narrativas multisensoriales": "Taller de diseño multimedial 3",
  "taller de diseno de experiencias transmedias": "Taller de diseño multimedial 3",
  "taller de diseno multimedial": "Taller de diseño multimedial 4",
  "introduccion a la imagen digital": "Lenguaje multimedial 1",
  "introduccion a las narrativas transmedias": "Lenguaje multimedial 1",
  "lenguaje de las narrativas interactivas": "Lenguaje multimedial 2",
  "lenguaje de los nuevos medios": "Lenguaje multimedial 3",
  "poeticas tecnologicas y diseno interactivo": "Lenguaje multimedial 4",
  "introduccion a la programacion para medios interactivos": "Tecnología multimedial 1",
  "programacion para medios interactivos orientada a las tecnologias web": "Tecnología multimedial 1",
  "computacion grafica aplicada y sistemas generativos": "Tecnología multimedial 2",
  "entornos virtuales e introduccion a la simulacion y los videojuegos": "Tecnología multimedial 2",
  "tecnicas y lenguaje sonoro": "Tecnología multimedial 3",
  "tecnicas de realizacion sonora": "Tecnología multimedial 3",
  "tecnicas y lenguaje audiovisual": "Tecnología multimedial 4",
  "tecnicas de realizacion audiovisual": "Tecnología multimedial 4",
};

const newNameByOld: Record<string, [string, string]> = {
  "taller de diseno multimedial 1": ["Taller de diseño digital", "Taller de diseño de experiencias interactivas"],
  "taller de diseno multimedial 2": ["Taller de diseño para la web", "Taller de diseño de información"],
  "taller de diseno multimedial 3": ["Taller de diseño de narrativas multisensoriales", "Taller de diseño de experiencias transmedias"],
  "taller de diseno multimedial 4": ["Taller de diseño multimedial", "Taller de diseño multimedial"],
  "lenguaje multimedial 1": ["Introducción a la imagen digital", "Introducción a las narrativas transmedias"],
  "lenguaje multimedial 2": ["Lenguaje de las narrativas interactivas", "Lenguaje de las narrativas interactivas"],
  "lenguaje multimedial 3": ["Lenguaje de los nuevos medios", "Lenguaje de los nuevos medios"],
  "lenguaje multimedial 4": ["Poéticas tecnológicas y diseño interactivo", "Poéticas tecnológicas y diseño interactivo"],
  "tecnologia multimedial 1": ["Introducción a la programación para medios interactivos", "Programación para medios interactivos orientada a las tecnologías web"],
  "tecnologia multimedial 2": ["Computación gráfica aplicada y sistemas generativos", "Entornos virtuales e introducción a la simulación y los videojuegos"],
  "tecnologia multimedial 3": ["Técnicas y lenguaje sonoro", "Técnicas de realización sonora"],
  "tecnologia multimedial 4": ["Técnicas y lenguaje audiovisual", "Técnicas de realización audiovisual"],
};

export function scheduleSubjectLabel(schedule: Pick<PublishedSchedule, "raw_subject_name" | "curriculum">, semester: number) {
  const normalized = canonicalName(schedule.raw_subject_name);
  if (schedule.curriculum === "old") {
    const primary = newNameByOld[normalized]?.[semester === 1 ? 0 : 1];
    return { primary: primary ?? schedule.raw_subject_name, oldName: primary ? schedule.raw_subject_name : null };
  }
  const currentName = Object.values(newNameByOld).flat().find(name => canonicalName(name) === normalized);
  return { primary: currentName ?? schedule.raw_subject_name, oldName: oldNameByNew[normalized] ?? null };
}
