import { describe, expect, it } from "vitest";
import { academicHistoryDetail, academicStatusLabel, enrollmentHistoryItems, legacyHistoryItems, validateAcademicEdit } from "./history-item";

describe("historial académico común", () => {
  const subjects = [{ id: "plastica-h0003", officialName: "Lenguaje Visual I", yearLevel: 1, requirementKind: "required" as const }];

  it("muestra nota y fecha de una materia aprobada de Plástica", () => {
    const [item] = enrollmentHistoryItems(subjects, [{ curriculum_subject_id: subjects[0].id, status: "passed", grade: 8, passed_at: "2025-11-21" }]);
    expect(item.source).toBe("enrollment_subject");
    expect(academicHistoryDetail(item)).toBe("Nota 8 · 21/11/2025");
    expect(academicStatusLabel(item.status)).toBe("Aprobada");
  });

  it("admite aprobación sin nota ni fecha y edición manual", () => {
    expect(enrollmentHistoryItems(subjects, [{ curriculum_subject_id: subjects[0].id, status: "passed", grade: null, passed_at: null }])[0].grade).toBeNull();
    expect(validateAcademicEdit({ status: "passed", grade: "", date: "" })).toEqual({ status: "passed", grade: null, passed_at: null });
    expect(validateAcademicEdit({ status: "regular", grade: "8", date: "2025-11-21" })).toEqual({ status: "regular", grade: 8, passed_at: "2025-11-21" });
    expect(validateAcademicEdit({ status: "passed", grade: "8", date: "2025-11-21" })).toMatchObject({ status: "passed", grade: 8 });
  });

  it("mantiene notas y fechas Multimedia con la misma forma de presentación", () => {
    const [legacy] = legacyHistoryItems([{ id: 12, name: "Tecnología I", year: 1 }], [{ subject_id: 12, status: "passed", grade: 9, passed_at: "2024-08-12" }]);
    const [multi] = enrollmentHistoryItems(subjects, [{ curriculum_subject_id: subjects[0].id, status: "passed", grade: 8, passed_at: "2025-11-21" }]);
    expect(legacy.source).toBe("legacy_multimedia");
    expect(legacy).toHaveProperty("displayName");
    expect(multi).toHaveProperty("displayName");
    expect(academicHistoryDetail(legacy)).toBe("Nota 9 · 12/08/2024");
  });

  it("aísla el historial por trayectoria y no cuenta pendientes", () => {
    expect(enrollmentHistoryItems(subjects, [])[0].status).toBe("pending");
    expect(enrollmentHistoryItems(subjects, [{ curriculum_subject_id: "otra-materia", status: "passed", grade: 10, passed_at: null }])[0].status).toBe("pending");
  });
});
