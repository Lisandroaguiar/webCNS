import { describe, expect, it } from "vitest";
import { parseSaeMultimedia } from "./sae-multimedia";

const options = { academicYear: 2026, sourceUrl: "https://example.edu/multimedia", sourceLabel: "SAE" };

describe("planillas SAE Multimedia", () => {
  it("conserva plan, comisión, días y hora de fin sin importar espacios o mayúsculas", () => {
    const csv = 'Año,Materias,Teóricos,Comisión,Día,Horario,Aula\n,"Taller de diseño digital (C)\nPlan nuevo",,Comisión 1,lunes y miércoles,18 a 20 hs,2 Fonseca\n,,,Comisión 2,jueves,20 a 22 hs,8 Fonseca\nSeminarios,,,,,,\n,Seminario optativo 1,,Comisión 1,jueves,14 a 18 hs,1 Central';
    const parsed = parseSaeMultimedia(csv, "annual-first", options);
    expect(parsed.schedules).toHaveLength(3);
    expect(parsed.schedules.map(row => row.weekday)).toEqual(["Lunes", "Miércoles", "Jueves"]);
    expect(parsed.schedules[0]).toMatchObject({ curriculum: "new", semester: 1, startTime: "18:00", endTime: "20:00", commission: "Comisión 1" });
    const changedCase = parseSaeMultimedia(csv.replace("Comisión 1", "  COMISIÓN   1 "), "annual-first", options);
    expect(changedCase.schedules[0].externalKey).toBe(parsed.schedules[0].externalKey);
  });

  it("recoge comisiones continuadas y deja fuera seminarios", () => {
    const csv = 'Materias,Teóricos,Prácticos\nINTRODUCCION A LAS NARRATIVAS TRANSMEDIAS,,Comisión 1: jueves 8 a 12 hs / Aula 101 Sede Fonseca\n,,Comisión 2: jueves 8 a 12 hs / Aula 108 Sede Fonseca\nSEMINARIOS,,\nOtro seminario,Lunes 8 a 10 hs,';
    const parsed = parseSaeMultimedia(csv, "second", options);
    expect(parsed.schedules).toHaveLength(2);
    expect(parsed.schedules.map(row => row.commission)).toEqual(["Comisión 1", "Comisión 2"]);
    expect(parsed.schedules.every(row => row.semester === 2 && row.endTime === "12:00")).toBe(true);
  });

  it("limita un teórico del primer cuatrimestre aunque la materia sea anual", () => {
    const csv = 'Año,Materias,Teóricos,Comisión,Día,Horario,Aula\n,"Tecnología Multimedial 1 (A) Plan viejo","Jueves 20 a 22 hs (V) 1° cuatrimestre",Comisión 4,martes,18 a 20 hs,8 Fonseca';
    const parsed = parseSaeMultimedia(csv, "annual-first", options);
    expect(parsed.schedules).toHaveLength(2);
    expect(parsed.schedules.find(row => row.commission === "Teórico")).toMatchObject({ semester: 1, weekday: "Jueves", startTime: "20:00", endTime: "22:00", notes: "Encuentro virtual" });
    expect(parsed.schedules.find(row => row.commission === "Comisión 4")?.semester).toBeUndefined();
  });
});
