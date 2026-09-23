import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  email: "admin@example.com" as string | null,
  schedule: { id: 9, status: "draft", source_label: "Importado desde PDF" } as Record<string, unknown>,
  override: null as Record<string, unknown> | null,
}));

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.email ? { email: state.email } : null } }) } }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: (table: string) => {
  if (table === "admin_schedule_overrides") return { upsert: async (value: Record<string, unknown>) => { state.override = value; return { error: null }; } };
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: state.schedule, error: null }),
    update: (value: Record<string, unknown>) => ({ eq: async () => { Object.assign(state.schedule, value); return { error: null }; } }),
  };
  return query;
} }) }));

import { PATCH } from "./route";

const values = { id: 9, raw_subject_name: "Lenguaje visual 1", curriculum: null, academic_year: 2025, semester: 2, commission: "Comisión 1", weekday: "Martes", start_time: "10:00", end_time: "12:00", classroom: "Aula 8", campus: "Fonseca", subject_id: null };
const request = (body: object) => new Request("http://localhost/api/admin/horarios", { method: "PATCH", body: JSON.stringify(body) });

beforeEach(() => { process.env.CRONOPIOS_ADMIN_EMAILS = "admin@example.com"; state.email = "admin@example.com"; state.schedule = { id: 9, status: "draft", source_label: "Importado desde PDF" }; state.override = null; });

describe("edición administrativa de horarios importados", () => {
  it("corrige un borrador de otro año y conserva la corrección para futuras importaciones", async () => {
    const response = await PATCH(request(values));
    expect(response.status).toBe(200);
    expect(state.schedule.status).toBe("draft");
    expect(state.schedule.classroom).toBe("Aula 8");
    expect(state.override).toMatchObject({ course_schedule_id: 9, changes: { classroom: "Aula 8", curriculum: null } });
  });

  it("publica un horario importado solo cuando el administrador lo elige", async () => {
    const response = await PATCH(request({ ...values, publish: true }));
    expect(response.status).toBe(200);
    expect(state.schedule.status).toBe("published");
  });

  it("rechaza a una cuenta sin permisos de administrador", async () => {
    state.email = "student@example.com";
    expect((await PATCH(request(values))).status).toBe(403);
    expect(state.override).toBeNull();
  });
});
