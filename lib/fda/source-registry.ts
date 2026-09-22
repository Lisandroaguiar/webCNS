import type { SourceType } from "@/lib/fda/types";

export type SourceDefinition = {
  key: string;
  name: string;
  sourceType: SourceType;
  indexUrl: string;
  resourceUrl: string;
  parserKey: "google-sheet-grid" | "academic-calendar-pdf" | "sae-schedules";
  sourceLabel: string;
  curriculum?: "old" | "new";
  semester?: 1 | 2;
};

export const sourceRegistry: Record<string, SourceDefinition> = {
  "multimedia-schedules-new-second": {
    key: "multimedia-schedules-new-second",
    name: "Departamento de Multimedia — materias plan nuevo, segundo cuatrimestre",
    sourceType: "course_schedule",
    indexUrl: "https://www2.fba.unlp.edu.ar/multimedia/estudiantes/horarios/",
    resourceUrl: "https://docs.google.com/spreadsheets/d/1BtPLVDtHHm_l48K5ScrwAGbVCdOlXKUm/export?format=csv",
    parserKey: "google-sheet-grid",
    sourceLabel: "Departamento de Multimedia",
    curriculum: "new",
    semester: 2
  },
  "multimedia-schedules-new-first": {
    key: "multimedia-schedules-new-first",
    name: "Departamento de Multimedia — materias plan nuevo, primer cuatrimestre",
    sourceType: "course_schedule",
    indexUrl: "https://www2.fba.unlp.edu.ar/multimedia/estudiantes/horarios/",
    resourceUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSP4x4_y4dhi0yoS4KTEAeze-52o4L7p5tNaaQ9IOSL2KOAL6FiN-Lc4A714nH79A/pub?output=csv",
    parserKey: "google-sheet-grid",
    sourceLabel: "Departamento de Multimedia",
    curriculum: "new",
    semester: 1
  },
  "multimedia-schedules-old": {
    key: "multimedia-schedules-old",
    name: "Departamento de Multimedia — materias plan viejo",
    sourceType: "course_schedule",
    indexUrl: "https://www2.fba.unlp.edu.ar/multimedia/estudiantes/horarios/",
    resourceUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR5cgkziEGhGoaTOr0TPstNPaanxrqwBp1hWPmy2gSaSL9Fhu1H_B5RTwjlkVsahA/pub?output=csv",
    parserKey: "google-sheet-grid",
    sourceLabel: "Departamento de Multimedia",
    curriculum: "old"
  },
  "academic-calendar-2026-second": {
    key: "academic-calendar-2026-second",
    name: "Secretaría Académica FDA — calendario académico 2026, segundo cuatrimestre",
    sourceType: "academic_calendar",
    indexUrl: "https://www2.fba.unlp.edu.ar/academica/calendario-academico-2024-3/",
    resourceUrl: "https://drive.google.com/uc?export=download&id=105utASN95iq9MHRGf7k6rTRt4WppiC5P",
    parserKey: "academic-calendar-pdf",
    sourceLabel: "Secretaría Académica FDA",
    semester: 2
  },
  "academic-calendar-2026-first": {
    key: "academic-calendar-2026-first",
    name: "Secretaría Académica FDA — calendario académico 2026, primer cuatrimestre",
    sourceType: "academic_calendar",
    indexUrl: "https://www2.fba.unlp.edu.ar/academica/calendario-academico-2024-3/",
    resourceUrl: "https://drive.google.com/uc?export=download&id=19GB-uxVmWScSEpZwvE8cDTWGgyG6wAbG",
    parserKey: "academic-calendar-pdf",
    sourceLabel: "Secretaría Académica FDA",
    semester: 1
  },
  "sae-schedules": {
    key: "sae-schedules",
    name: "Secretaría de Asuntos Estudiantiles — horarios y aulas",
    sourceType: "schedule_fallback",
    indexUrl: "https://www2.fba.unlp.edu.ar/sae/horarios-y-aulas/",
    resourceUrl: "https://www2.fba.unlp.edu.ar/sae/horarios-y-aulas/",
    parserKey: "sae-schedules",
    sourceLabel: "Secretaría de Asuntos Estudiantiles"
  }
};
