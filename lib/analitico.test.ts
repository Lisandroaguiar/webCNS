import { describe, expect, it } from "vitest";
import { parseAnalitico } from "./analitico";

describe("importación de texto conservadora", () => {
  it("solo acepta una fila completa y un nombre exacto normalizado", () => {
    const catalog = [{ id: 1, nombre: "Tecnología Multimedial III" }, { id: 2, nombre: "Tecnología Multimedial II" }];
    const parsed = parseAnalitico("Aprobadas\nTecnología Multimedial 3 | 8 | 15/12/2023\nTecnología Multimedial | 9 | 16/12/2023", catalog);
    expect(Array.from(parsed.grades.entries())).toEqual([["1", { grade: "8", date: "2023-12-15" }]]);
  });
});
