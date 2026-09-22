import { describe, expect, it } from "vitest";
import { parseGoogleSheetGrid } from "@/lib/fda/parsers/google-sheet-schedule";

describe("parseGoogleSheetGrid", () => {
  it("reconstruye una materia, comisión, aula y sede desde una grilla", () => {
    const csv = [
      "1° año,,,,,",
      ",Lunes,Martes,Miércoles,Jueves,Viernes",
      "8:00,,\"Tecnología Multimedial I\nComisión 2\nAula 201\nSede Fonseca\",,,",
      "9:00,,,,,"
    ].join("\n");
    const [schedule] = parseGoogleSheetGrid(csv, { sourceUrl: "https://example.test", sourceLabel: "Fuente", curriculum: "new", semester: 2, academicYear: 2026 });
    expect(schedule.rawSubjectName).toBe("Tecnología Multimedial I");
    expect(schedule.weekday).toBe("Martes");
    expect(schedule.startTime).toBe("8:00");
    expect(schedule.commission).toBe("Comisión 2");
    expect(schedule.classroom).toBe("Aula 201");
    expect(schedule.campus).toBe("Fonseca");
    expect(schedule.endTime).toBeUndefined();
  });

  it("mantiene la misma clave ante cambios de mayúsculas y espacios", () => {
    const first = parseGoogleSheetGrid("hora,Lunes,Martes\n8:00,\"Tecnología   Multimedial I\nComisión 2\",\n", { sourceUrl: "https://example.test", sourceLabel: "Fuente" });
    const second = parseGoogleSheetGrid("hora,lunes,martes\n8:00,\"TECNOLOGIA MULTIMEDIAL I\ncomisión 2\",\n", { sourceUrl: "https://example.test", sourceLabel: "Fuente" });
    expect(first[0].externalKey).toBe(second[0].externalKey);
  });
});
