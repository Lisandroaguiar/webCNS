import { describe, expect, it } from "vitest";
import { parseAnalyticDocument } from "./analytic-parser";
import { detectAnalyticTrajectory, findMatchingEnrollment } from "./analytic-trajectory";

const programs = [
  { id: "plastica-prof", family: "Artes Plásticas", degree_type: "profesorado" as const, name: "Profesorado en Artes Plásticas" },
  { id: "plastica-lic", family: "Artes Plásticas", degree_type: "licenciatura" as const, name: "Licenciatura en Artes Plásticas" },
];
const plans = [{ id: "plastica-2006", family: "Artes Plásticas", requires_orientation: true, display_name: "Plan 2006" }];
const orientations = [{ id: "dibujo", family: "Artes Plásticas", name: "Dibujo" }];

describe("trayectoria declarada en el analítico", () => {
  for (const [title, programId] of [["Profesorado", "plastica-prof"], ["Licenciatura", "plastica-lic"]] as const) {
    it(`detecta ${title} Dibujo 2006 en el primer parseo`, () => {
      const parsed = parseAnalyticDocument(`${title} en Artes Plásticas con orientación en Dibujo\nPlan: 2006\nAnalítico con regularizadas\nAprobadas\nArte Contemporáneo 8 (Ocho) 16/12/2019`);
      const target = detectAnalyticTrajectory(parsed, programs, plans, orientations);
      expect(target).toEqual({ programId, curriculumId: "plastica-2006", orientationId: "dibujo", degreeType: title.toLowerCase() });
      expect(findMatchingEnrollment(target!, [{ programId, curriculumId: "plastica-2006", orientationId: "dibujo" }])).toBeDefined();
    });
  }

  it("no inventa una orientación si el documento no la identifica", () => {
    const parsed = parseAnalyticDocument("Profesorado en Artes Plásticas\nPlan: 2006\nAnalítico con regularizadas\nAprobadas\nArte Contemporáneo 8 (Ocho) 16/12/2019");
    expect(detectAnalyticTrajectory(parsed, programs, plans, orientations)).toBeNull();
  });
});
