import { describe, expect, it } from "vitest";
import { parseAcademicCalendarText } from "@/lib/fda/parsers/academic-calendar-pdf";

describe("parseAcademicCalendarText", () => {
  it("interpreta rangos del mismo mes y entre meses", () => {
    const result = parseAcademicCalendarText([
      "CALENDARIO ACADÉMICO 2026",
      "Mesa noviembre: inscripción del 2 al 8 de noviembre",
      "Mesa diciembre: llamado del 30 de noviembre al 5 de diciembre"
    ].join("\n"), { sourceUrl: "https://example.test", sourceLabel: "Secretaría Académica" });
    expect(result.events).toHaveLength(2);
    expect(result.events[0].registrationStart).toBe("2026-11-02");
    expect(result.events[0].registrationEnd).toBe("2026-11-08");
    expect(result.events[1].startsAt).toBe("2026-11-30");
    expect(result.events[1].endsAt).toBe("2026-12-05");
  });

  it("advierte cuando no detecta el año", () => {
    const result = parseAcademicCalendarText("Mesa: del 2 al 8 de noviembre", { sourceUrl: "https://example.test", sourceLabel: "Secretaría Académica" });
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
