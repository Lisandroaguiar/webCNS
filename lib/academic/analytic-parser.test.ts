import { describe, expect, it } from "vitest";
import { detectAcademicContext, parseAnalyticDocument } from "./analytic-parser";

it("detecta Artes Plásticas sólo con orientación declarada explícitamente", () => {
  expect(detectAcademicContext("Licenciatura en Artes Plásticas\nPlan 2023\nOrientación: Grabado y Arte Impreso")).toMatchObject({
    detectedProgramFamily: "Artes Plásticas", detectedPlanYear: 2023, detectedTitle: "licenciatura", detectedOrientation: "grabado_arte_impreso"
  });
  expect(detectAcademicContext("Profesorado en Artes Plásticas\nPlan 2006\nTaller de Dibujo").detectedOrientation).toBeUndefined();
  expect(detectAcademicContext("PROFESORADO EN ARTES PLÁSTICAS CON ORIENTACIÓN EN DIBUJO\nPlan: 2006")).toMatchObject({
    detectedTitle: "profesorado", detectedPlanYear: 2006, detectedOrientation: "dibujo"
  });
});

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

  it("une una materia larga en varias líneas sin incluir encabezados ni datos personales", () => {
    const fixture = [
      "Apellido y nombre: OMITIDO", "DNI: OMITIDO", "Asignaturas aprobadas",
      "Identidad, Estado y Sociedad en Latinoamérica y", "Argentina | 8 | 17/12/2022",
      "Página 1 de 2", "Asignatura Nota Fecha", "Tecnología\u00a0Multimedial",
      "III | 9 | 15/12/2023", "Total de asignaturas aprobadas: 2",
    ].join("\n");
    const first = parseAnalyticDocument(fixture);
    const second = parseAnalyticDocument(fixture);
    expect(first.subjects).toEqual([
      { rawName: "Identidad, Estado y Sociedad en Latinoamérica y Argentina", grade: 8, passedAt: "2022-12-17", status: "passed" },
      { rawName: "Tecnología Multimedial III", grade: 9, passedAt: "2023-12-15", status: "passed" },
    ]);
    expect(second.subjects).toEqual(first.subjects);
    expect(JSON.stringify(first)).not.toMatch(/OMITIDO/);
  });

  it("no descarta una materia real cuyo nombre empieza con Materia", () => {
    const result = parseAnalyticDocument("Asignaturas aprobadas\nMateria de prueba no existente 9 (Nueve) 17/12/2021 29949\nTotal de asignaturas aprobadas: 1");
    expect(result.subjects).toEqual([{ rawName: "Materia de prueba no existente", grade: 9, passedAt: "2021-12-17", status: "passed" }]);
  });

  it("separa el total de aprobadas de los créditos optativos informados por SIU", () => {
    const result = parseAnalyticDocument([
      "PROFESORADO EN ARTES PLÁSTICAS CON ORIENTACIÓN EN DIBUJO", "Plan: 2006",
      "Aprobadas", "Lenguaje Visual I 9 (Nueve) 29/11/2019 26704",
      "Créditos / Optativas", "Taller Complementario Grabado 9 (Nueve) 15/07/2020 27986",
      "Total de asignaturas aprobadas: 1", "Total de créditos/optativas: 1",
    ].join("\n"));
    expect(result.subjects).toHaveLength(2);
    expect(result).toMatchObject({ detectedOrientation: "dibujo", reportedApprovedCount: 1, reportedElectiveCount: 1 });
  });
});
