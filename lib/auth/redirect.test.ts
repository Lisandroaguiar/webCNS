import { describe, expect, it } from "vitest";
import { authCallbackUrl, safeNextPath } from "./redirect";

describe("auth redirects", () => {
  it("preserves a local destination and rejects external redirects", () => {
    expect(safeNextPath("/dashboard/recorrido")).toBe("/dashboard/recorrido");
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
    expect(safeNextPath("/\\evil.example")).toBe("/dashboard");
  });

  it("uses the current origin for OAuth and keeps next", () => {
    expect(authCallbackUrl("http://localhost:3200", "/dashboard/recorrido"))
      .toBe("http://localhost:3200/auth/callback?next=%2Fdashboard%2Frecorrido");
    expect(authCallbackUrl("https://web-cns.vercel.app", "/dashboard/recorrido"))
      .toBe("https://web-cns.vercel.app/auth/callback?next=%2Fdashboard%2Frecorrido");
  });
});
