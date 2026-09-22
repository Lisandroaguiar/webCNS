import { describe, it, expect } from "vitest";
import { subjectsForDegree, requirements2006 } from "./degree-catalog";
import { readFileSync } from "node:fs";
describe("Profesorado plan 2006", () => {
  const source = readFileSync("supabase/seed-subjects.sql", "utf8") + readFileSync("supabase/seed-profesorado-2006.sql", "utf8");
  const catalog = Array.from(new Set(source.match(/DM-[1-5]-[A-Z0-9-]+/g))).map(code => ({code}));
  it("separates degree-specific subjects without duplicating shared subjects", () => {
    const teaching = subjectsForDegree(catalog, "profesorado", "old");
    const bachelor = subjectsForDegree(catalog, "licenciatura", "old");
    expect(teaching).toHaveLength(22);
    expect(bachelor).toHaveLength(25);
    expect(teaching.map(s=>s.code)).toContain("DM-4-FUNDAMENTOS");
    expect(teaching.map(s=>s.code)).toContain("DM-5-DIDACTICA");
    expect(teaching.map(s=>s.code)).not.toContain("DM-5-TALLER");
    expect(teaching.map(s=>s.code)).not.toContain("DM-4-TEORIA");
    expect(bachelor.map(s=>s.code)).not.toContain("DM-4-FUNDAMENTOS");
  });
  it("all teaching prerequisites belong to its own catalog", () => {
    const teaching = subjectsForDegree(catalog, "profesorado", "old").map(s=>s.code);
    for(const code of teaching) {
      const requirement = requirements2006[code];
      if(requirement) for(const required of [...requirement.regular,...requirement.passed]) expect(teaching).toContain(required);
    }
    expect(requirements2006["DM-5-DIDACTICA"].regular).toEqual(["DM-4-METODOLOGIA","DM-4-FUNDAMENTOS"]);
    expect(requirements2006["DM-5-DIDACTICA"].passed).toHaveLength(3);
  });
});
