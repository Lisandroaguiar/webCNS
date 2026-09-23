import { describe, expect, it } from "vitest";
import { collapseIdenticalMeetings, dedupePublishedSchedules, formatScheduleTime, scheduleSubjectLabel } from "./schedule-display";

const base = {
  academic_year: 2026, curriculum: "new", semester: 2, weekday: "Martes", start_time: "08:00:00", end_time: null,
};

describe("horarios de Cátedras", () => {
  it("oculta la fuente anterior cuando SAE publicó la misma materia del mismo período y conserva las comisiones", () => {
    const rows = [
      { ...base, id: 1, raw_subject_name: "Programación para medios interactivos", commission: "Comisión 1", source_label: "Departamento de Multimedia" },
      { ...base, id: 2, raw_subject_name: "PROGRAMACION PARA MEDIOS INTERACTIVOS ORIENTADA A LAS TECNOLOGIAS WEB", commission: "Comisión 1", source_label: "Secretaría de Asuntos Estudiantiles — Multimedia" },
      { ...base, id: 3, raw_subject_name: "PROGRAMACION PARA MEDIOS INTERACTIVOS ORIENTADA A LAS TECNOLOGIAS WEB", commission: "Comisión 2", source_label: "Secretaría de Asuntos Estudiantiles — Multimedia" },
      { ...base, id: 4, semester: 1, raw_subject_name: "Programación para medios interactivos", commission: "Comisión 1", source_label: "Departamento de Multimedia" },
    ];
    expect(dedupePublishedSchedules(rows).map(row => row.id)).toEqual([2, 3, 4]);
  });

  it("muestra horas sin segundos y el nombre actual con la equivalencia anterior", () => {
    expect(formatScheduleTime("08:00:00")).toBe("08:00");
    expect(formatScheduleTime("18:30:00")).toBe("18:30");
    expect(scheduleSubjectLabel({ raw_subject_name: "Tecnología Multimedial I", curriculum: "old" }, 2)).toEqual({ primary: "Programación para medios interactivos orientada a las tecnologías web", oldName: "Tecnología Multimedial I" });
    expect(scheduleSubjectLabel({ raw_subject_name: "Técnicas de realización sonora", curriculum: "new" }, 2).oldName).toBe("Tecnología multimedial 3");
  });

  it("une una clase idéntica marcada como teórico y comisión, pero mantiene aulas de otras comisiones", () => {
    const rows = [
      { ...base, id: 1, raw_subject_name: "Introducción a los medios digitales", classroom: "Aula 1 Fonseca", commission: "Teórico", source_label: "SAE" },
      { ...base, id: 2, raw_subject_name: "INTRODUCCION A LOS MEDIOS DIGITALES", classroom: "Aula 1 Fonseca", commission: "Comisión 1", source_label: "SAE" },
      { ...base, id: 3, raw_subject_name: "Introducción a los medios digitales", classroom: "Aula 2 Fonseca", commission: "Comisión 2", source_label: "SAE" },
      { ...base, id: 4, raw_subject_name: "Introducción a los medios digitales", classroom: "Aula 1 Fonseca", commission: "Comisión 3", source_label: "SAE" },
    ];
    expect(collapseIdenticalMeetings(rows, 2).map(row => row.id)).toEqual([2, 4, 3]);
  });
});
