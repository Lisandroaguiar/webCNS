import { describe, expect, it } from "vitest";
import { gradeAverage } from "./grade-average";

describe("promedio", () => {
  it("usa sólo materias aprobadas con nota válida", () => {
    expect(gradeAverage([
      { status: "passed", grade: 8 }, { status: "passed", grade: 8.75 },
      { status: "passed", grade: null }, { status: "regular", grade: 10 },
      { status: "pending", grade: 2 }, { status: "passed", grade: Number.NaN },
    ])).toBe("8,38");
  });
  it("no inventa promedio si faltan notas", () => {
    expect(gradeAverage([{ status: "passed", grade: null }])).toBeNull();
  });
});
