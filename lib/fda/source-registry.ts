export type SourceDefinition = {
  key: string;
  name: string;
  sourceType: "academic_calendar";
  indexUrl: string;
  resourceUrl: string;
  parserKey: "academic-calendar-pdf";
  sourceLabel: string;
  semester: 1 | 2;
};

// Los parsers de horarios quedan en el repositorio para auditoría histórica,
// pero no se registran como fuentes ejecutables.
export const sourceRegistry: Record<string, SourceDefinition> = {
  "academic-calendar-2026-second": {
    key: "academic-calendar-2026-second",
    name: "Secretaría Académica FDA — calendario académico 2026, segundo cuatrimestre",
    sourceType: "academic_calendar",
    indexUrl: "https://www2.fba.unlp.edu.ar/academica/calendario-academico-2024-3/",
    resourceUrl: "https://drive.google.com/uc?export=download&id=105utASN95iq9MHRGf7k6rTRt4WppiC5P",
    parserKey: "academic-calendar-pdf",
    sourceLabel: "Secretaría Académica FDA",
    semester: 2,
  },
  "academic-calendar-2026-first": {
    key: "academic-calendar-2026-first",
    name: "Secretaría Académica FDA — calendario académico 2026, primer cuatrimestre",
    sourceType: "academic_calendar",
    indexUrl: "https://www2.fba.unlp.edu.ar/academica/calendario-academico-2024-3/",
    resourceUrl: "https://drive.google.com/uc?export=download&id=19GB-uxVmWScSEpZwvE8cDTWGgyG6wAbG",
    parserKey: "academic-calendar-pdf",
    sourceLabel: "Secretaría Académica FDA",
    semester: 1,
  },
};
