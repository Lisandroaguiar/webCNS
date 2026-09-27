import { describe, expect, it } from "vitest";
import { matchAnalyticSubjects } from "@/lib/academic/match-analytic-subjects";

describe("matching conservador del analítico", () => {
  it("no elige entre dos materias con el mismo puntaje", () => {
    const result = matchAnalyticSubjects(
      [{ rawName: "Tecnología Multimedial I" }, { rawName: "Tecnologia Multimedial" }],
      [{ id: 1, nombre: "Tecnología Multimedial I" }, { id: 2, nombre: "Tecnología Multimedial II" }]
    );
    expect(result[0].kind).toBe("EXACT");
    expect(result[1].kind).toBe("AMBIGUOUS");
    expect(result[1].subjectId).toBeUndefined();
  });
});
