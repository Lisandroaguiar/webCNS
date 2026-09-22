export type ParsedAnalitico = {
  text: string;
  grades: Map<string, { grade?: string; date?: string }>;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function dateToIso(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : undefined;
}

function aliasesFor(name: string) {
  const normalized = normalize(name);
  const aliases = [normalized];
  if (normalized === "produccion de textos b") aliases.push("produccion de textos");
  if (normalized === "epistemologia de las artes") aliases.push("epistemologia del arte");
  if (normalized.includes("identidad, estado y sociedad")) {
    aliases.push("identidad, estado y sociedad en latinoamerica y argentina");
  }
  return aliases;
}

export function parseAnalitico(text: string, subjects: Array<{ id: string | number; nombre: string }>): ParsedAnalitico {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const grades = new Map<string, { grade?: string; date?: string }>();

  for (const subject of subjects) {
    const aliases = aliasesFor(subject.nombre);
    const index = lines.findIndex(line => aliases.some(alias => normalize(line).includes(alias)));
    if (index < 0) continue;

    const nearby = lines.slice(Math.max(0, index - 5), Math.min(lines.length, index + 6));
    const date = nearby.map(dateToIso).find(Boolean);
    const grade = nearby
      .map(line => line.match(/^(10|[1-9](?:[.,]\d)?)\s*(?:\(|$)/)?.[1])
      .find(Boolean)
      ?.replace(",", ".");
    grades.set(String(subject.id), { grade, date });
  }

  return { text, grades };
}
