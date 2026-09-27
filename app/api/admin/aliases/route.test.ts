import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ email: "admin@example.com" as string | null, inserted: null as Record<string, unknown> | null }));
vi.mock("@/lib/supabase/current-user", () => ({ getCurrentUser: async () => state.email ? { email: state.email } : null }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: (table: string) => {
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: table === "subjects" ? { id: 11, curriculum: "old" } : null, error: null }),
    insert(value: Record<string, unknown>) { state.inserted = value; return query; },
    single: async () => ({ data: { id: 7 }, error: null }),
  };
  return query;
} }) }));
import { POST } from "./route";

const request = (body: object) => new Request("http://localhost/api/admin/aliases", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => { process.env.CRONOPIOS_ADMIN_EMAILS = "admin@example.com"; state.email = "admin@example.com"; state.inserted = null; });

describe("aliases académicos verificados", () => {
  it("solo un administrador puede verificar un alias del plan de la materia", async () => {
    expect((await POST(request({ subjectId: "11", alias: "Tec Multi 3", source: "Revisión del plan" }))).status).toBe(200);
    expect(state.inserted).toMatchObject({ subject_id: "11", curriculum: "old", alias: "Tec Multi 3", verified: true });
  });
  it("rechaza usuarios normales", async () => {
    state.email = "student@example.com";
    expect((await POST(request({ subjectId: "11", alias: "Tec Multi 3" }))).status).toBe(403);
    expect(state.inserted).toBeNull();
  });
});
