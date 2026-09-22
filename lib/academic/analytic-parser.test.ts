import { describe, expect, it } from "vitest";
import { parseAnalyticDocument } from "./analytic-parser";

describe("parseAnalyticDocument", () => {
  it("lee materias con nota y fecha en la misma fila", () => {
    const result = parseAnalyticDocument([
      "Asignaturas aprobadas",
      "Taller de Diseño Multimedial I | 8 | 14/03/2025",
      "Lenguaje Multimedial I | 7,5 | 20/06/2025",
      "Promedio académico: 7,75"
    ].join("\n"));

    expect(result.subjects).toEqual([
      { rawName: "Taller de Diseño Multimedial I", grade: 8, passedAt: "2025-03-14", status: "passed" },
      { rawName: "Lenguaje Multimedial I", grade: 7.5, passedAt: "2025-06-20", status: "passed" }
    ]);
  });

  it("lee filas del analitico con nota escrita, fecha y acta", () => {
    const result = parseAnalyticDocument([
      "Asignaturas aprobadas",
      "Producción de Textos 7 (Siete) 17/12/2021 30151",
      "Arte Contemporáneo 8 (Ocho) 15/07/2021 29490",
      "Historia Social General 8 (Ocho) 16/12/2021 29948",
      "Taller de Diseño Multimedial I 8 (Ocho) 08/02/2022 30252"
    ].join("\n"));

    expect(result.subjects).toMatchObject([
      { rawName: "Producción de Textos", grade: 7, passedAt: "2021-12-17", status: "passed" },
      { rawName: "Arte Contemporáneo", grade: 8, passedAt: "2021-07-15", status: "passed" },
      { rawName: "Historia Social General", grade: 8, passedAt: "2021-12-16", status: "passed" },
      { rawName: "Taller de Diseño Multimedial I", grade: 8, passedAt: "2022-02-08", status: "passed" }
    ]);
  });
});
