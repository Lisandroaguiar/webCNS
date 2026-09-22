export type CurriculumValue = "old" | "new";
export type DegreeValue = "licenciatura" | "profesorado";

export const degreeOptions: Array<{ value: DegreeValue; label: string; profileValue: string }> = [
  { value: "licenciatura", label: "Licenciatura en Diseño Multimedial", profileValue: "Licenciatura en Diseño Multimedial" },
  { value: "profesorado", label: "Profesorado en Diseño Multimedial", profileValue: "Profesorado en Diseño Multimedial" }
];

export const curriculumOptions: Array<{ value: CurriculumValue; label: string }> = [
  { value: "old", label: "Plan 2006" },
  { value: "new", label: "Plan 2024" }
];

export function profileDegreeLabel(value?: string | null) {
  return degreeOptions.find(option => option.profileValue === value)?.label ?? value ?? "Diseño Multimedial";
}

export function detectDegree(text: string): DegreeValue | undefined {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.includes("profesorado en diseno multimedial")) return "profesorado";
  if (normalized.includes("licenciatura en diseno multimedial")) return "licenciatura";
  return undefined;
}

export function detectCurriculum(text: string): CurriculumValue | undefined {
  const match = text.match(/plan\s*[:\-]?\s*(2006|2023|2024)/i);
  if (match?.[1] === "2006") return "old";
  if (match?.[1] === "2023" || match?.[1] === "2024") return "new";
  return undefined;
}
