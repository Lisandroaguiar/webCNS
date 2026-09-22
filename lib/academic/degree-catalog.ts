import type { CurriculumValue, DegreeValue } from "./curriculum";

export const plan2006Source = "https://www2.fba.unlp.edu.ar/multimedia/wp-content/uploads/sites/3/2023/03/PLAN-DISENO-MULTIMEDIAL_actualizado.pdf";
const licenciaturaOnly = ["DM-4-TEORIA", "DM-4-SEMINARIO-GENERAL", "DM-5-TALLER", "DM-5-SEMINARIO-1", "DM-5-SEMINARIO-2"];
const profesoradoOnly = ["DM-4-FUNDAMENTOS", "DM-5-DIDACTICA"];
export function subjectsForDegree<T extends { code: string | null }>(subjects: T[], degree: DegreeValue, curriculum: CurriculumValue): T[] {
  if (curriculum !== "old") return subjects;
  const excluded = degree === "profesorado" ? licenciaturaOnly : profesoradoOnly;
  return subjects.filter(subject => !excluded.includes(subject.code ?? ""));
}

/** Official requirements to enroll. `regular` means cursada, `passed` aprobada. */
export const requirements2006: Record<string, { regular: string[]; passed: string[] }> = {
  "DM-2-TALLER": { regular: [], passed: ["DM-1-TALLER", "DM-1-LENGUAJE", "DM-1-TECNOLOGIA"] },
  "DM-2-LENGUAJE": { regular: [], passed: ["DM-1-LENGUAJE"] },
  "DM-2-TECNOLOGIA": { regular: [], passed: ["DM-1-TECNOLOGIA"] },
  "DM-2-IDENTIDAD": { regular: ["DM-1-HISTORIA", "DM-1-TEXTOS"], passed: [] },
  "DM-3-TALLER": { regular: [], passed: ["DM-2-TALLER", "DM-2-LENGUAJE", "DM-2-TECNOLOGIA"] },
  "DM-3-LENGUAJE": { regular: [], passed: ["DM-1-TECNOLOGIA", "DM-1-ARTE", "DM-2-LENGUAJE"] },
  "DM-3-TECNOLOGIA": { regular: [], passed: ["DM-1-LENGUAJE", "DM-2-TECNOLOGIA"] },
  "DM-3-ESTETICA": { regular: ["DM-2-IDENTIDAD"], passed: ["DM-1-TALLER", "DM-1-HISTORIA", "DM-1-TEXTOS", "DM-1-ARTE"] },
  "DM-4-TALLER": { regular: [], passed: ["DM-3-TALLER", "DM-3-LENGUAJE", "DM-3-TECNOLOGIA"] },
  "DM-4-LENGUAJE": { regular: [], passed: ["DM-2-TECNOLOGIA", "DM-3-LENGUAJE"] },
  "DM-4-TECNOLOGIA": { regular: [], passed: ["DM-2-LENGUAJE", "DM-3-TECNOLOGIA"] },
  "DM-4-GESTION": { regular: [], passed: ["DM-2-IDENTIDAD", "DM-3-TALLER"] },
  "DM-4-TEORIA": { regular: ["DM-3-ESTETICA"], passed: ["DM-2-IDENTIDAD", "DM-3-TALLER"] },
  "DM-4-EPISTEMOLOGIA": { regular: [], passed: ["DM-3-LENGUAJE"] },
  "DM-4-METODOLOGIA": { regular: ["DM-4-EPISTEMOLOGIA"], passed: ["DM-2-IDENTIDAD"] },
  "DM-4-SEMINARIO-GENERAL": { regular: [], passed: ["DM-3-TALLER"] },
  "DM-4-FUNDAMENTOS": { regular: [], passed: ["DM-3-TALLER", "DM-3-LENGUAJE", "DM-3-TECNOLOGIA"] },
  "DM-5-TALLER": { regular: ["DM-4-METODOLOGIA"], passed: ["DM-4-TALLER", "DM-4-LENGUAJE", "DM-4-TECNOLOGIA"] },
  "DM-5-SEMINARIO-1": { regular: ["DM-4-METODOLOGIA"], passed: [] },
  "DM-5-SEMINARIO-2": { regular: ["DM-4-METODOLOGIA"], passed: [] },
  "DM-5-DIDACTICA": { regular: ["DM-4-METODOLOGIA", "DM-4-FUNDAMENTOS"], passed: ["DM-4-TALLER", "DM-4-LENGUAJE", "DM-4-TECNOLOGIA"] }
};
