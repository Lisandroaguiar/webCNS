import { describe, expect, it } from "vitest";
import { getCourseEligibility, type EligibilitySubject } from "./course-eligibility";

const subject = (id: number, code: string, name: string, curriculum = "old"): EligibilitySubject => ({ id, code, name, curriculum, year: 1 });
const subjects = [
  subject(1, "DM-1-TALLER", "Taller I"),
  subject(2, "DM-1-LENGUAJE", "Lenguaje I"),
  subject(3, "DM-1-TECNOLOGIA", "Tecnología I"),
  subject(4, "DM-2-TALLER", "Taller II"),
  subject(5, "DM-2-LENGUAJE", "Lenguaje II"),
  subject(6, "DM-1-HISTORIA", "Historia"),
  subject(7, "DM-1-TEXTOS", "Textos"),
  subject(8, "DM-2-IDENTIDAD", "Identidad"),
  subject(9, "DM24-1-PROG-INTRO", "Programación", "new"),
];
const evaluate = (history: Array<{ subject_id: number; status: string }> = [], catalog = subjects, curriculum: "old" | "new" = "old") => getCourseEligibility({ subjects: catalog, userSubjects: history, curriculum, degree: "licenciatura" });

describe("qué puedo cursar", () => {
  it("deja disponible una materia sin correlativas y no mezcla planes", () => {
    const result = evaluate();
    expect(result.find(item => item.subject.id === 1)?.status).toBe("available");
    expect(result.some(item => item.subject.id === 9)).toBe(false);
  });
  it("distingue aprobada y regularizada", () => {
    const result = evaluate([{ subject_id: 1, status: "passed" }, { subject_id: 2, status: "regular" }]);
    expect(result.find(item => item.subject.id === 1)?.status).toBe("completed");
    expect(result.find(item => item.subject.id === 2)?.status).toBe("in_progress");
  });
  it("exige todas las aprobadas para Taller II", () => {
    const one = evaluate([{ subject_id: 1, status: "passed" }]).find(item => item.subject.id === 4)!;
    expect(one.status).toBe("blocked");
    expect(one.missingRequirements).toHaveLength(2);
    const all = evaluate([1, 2, 3].map(subject_id => ({ subject_id, status: "passed" }))).find(item => item.subject.id === 4)!;
    expect(all.status).toBe("available");
    expect(all.requiredBy).toEqual([]);
  });
  it("una regularizada satisface sólo un requisito de cursada", () => {
    expect(evaluate([{ subject_id: 6, status: "regular" }, { subject_id: 7, status: "regular" }]).find(item => item.subject.id === 8)?.status).toBe("available");
    expect(evaluate([{ subject_id: 1, status: "regular" }, { subject_id: 2, status: "passed" }, { subject_id: 3, status: "passed" }]).find(item => item.subject.id === 4)?.status).toBe("blocked");
  });
  it("marca desconocido si falta una correlativa", () => {
    expect(evaluate([], subjects.filter(item => item.id !== 3)).find(item => item.subject.id === 4)?.status).toBe("unknown");
  });
  it("con recorrido vacío hay materias disponibles y con todo aprobado no", () => {
    expect(evaluate().filter(item => item.status === "available")).toHaveLength(5);
    expect(evaluate(subjects.map(item => ({ subject_id: Number(item.id), status: "passed" }))).every(item => item.status === "completed")).toBe(true);
  });
  it("no afirma disponibilidad del Plan 2024 con reglas alternativas no modeladas", () => {
    expect(evaluate([], subjects, "new")[0]?.status).toBe("unknown");
  });
});
