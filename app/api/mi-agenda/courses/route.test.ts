import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ userId: "student-a" as string | null, activePlastic: false, queried: [] as string[], rows: [] as Array<Record<string, unknown>> }));
vi.mock("@/lib/supabase/current-user", () => ({ getCurrentUser: async () => state.userId ? { id: state.userId } : null }));
vi.mock("@/lib/academic/weekly-schedule", async importOriginal => ({ ...(await importOriginal() as object), currentAcademicPeriod: () => ({ academicYear: 2026, semester: 2 }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: (table: string) => {
  state.queried.push(table);
  let action: "read" | "insert" | "update" = "read";
  let payload: Record<string, unknown> = {};
  const filters: Array<[string, unknown]> = [];
  const query = {
    select: () => query,
    eq(key: string, value: unknown) { filters.push([key, value]); return query; },
    insert(value: Record<string, unknown>) { action = "insert"; payload = value; return query; },
    update(value: Record<string, unknown>) { action = "update"; payload = value; return query; },
    async single() { const row = { id: 1, ...payload }; state.rows.push(row); return { data: row, error: null }; },
    async maybeSingle() {
      if (table === "profiles") return { data: { curriculum: "old" }, error: null };
      if (table === "subjects") return { data: { id: "11", name: "Tecnología", curriculum: "old" }, error: null };
      if (table === "user_enrollments") return { data: state.activePlastic ? { id: "entry", curriculum_id: "plastica-2023", program_id: "plastica-lic", orientation_id: "pintura" } : null, error: null };
      if (table === "curricula") return { data: { catalog_kind: "curriculum_subjects" }, error: null };
      if (table === "curriculum_subjects") return { data: { official_name: "Lenguaje Visual 1", degree_scope: "both", orientation_condition: "all" }, error: null };
      if (table === "academic_programs") return { data: { degree_type: "licenciatura" }, error: null };
      const row = state.rows.find(candidate => filters.every(([key, value]) => candidate[key] === value));
      if (action === "update" && row) Object.assign(row, payload);
      return { data: row ?? null, error: null };
    },
  };
  return query;
} }) }));

import { PATCH, POST } from "./route";
const request = (method: string, body: object) => new Request("http://localhost/api/mi-agenda/courses", { method, body: JSON.stringify(body) });
beforeEach(() => { state.userId = "student-a"; state.activePlastic = false; state.rows = []; state.queried = []; });

describe("cursadas personales", () => {
  it("agrega una materia sin día ni horario usando solo la tabla personal", async () => {
    const response = await POST(request("POST", { subjectId: "11", notes: "Confirmar aula" }));
    expect(response.status).toBe(200);
    expect(state.queried).toEqual(["profiles", "subjects", "user_enrollments", "user_course_entries"]);
    expect(state.rows[0]).toMatchObject({ user_id: "student-a", subject_id: "11", weekday: null, notes: "Confirmar aula" });
    expect(state.rows[0]).not.toHaveProperty("source_schedule_id");
  });

  it("guarda aula y hora propias e ignora cualquier ID de fuente enviado", async () => {
    const response = await POST(request("POST", { subjectId: "11", sourceScheduleId: 17, weekday: "Miércoles", start_time: "14:00", end_time: "18:00", classroom: "Aula 8", location: "Sede propia", commission: "2" }));
    expect(response.status).toBe(200);
    expect(state.rows[0]).toMatchObject({ weekday: "Miércoles", start_time: "14:00", classroom: "Aula 8", location: "Sede propia" });
    expect(state.rows[0]).not.toHaveProperty("source_schedule_id");
    expect(state.queried).not.toContain("course_schedules");
  });

  it("agrega una materia de Plástica sin consultar horarios institucionales", async () => {
    state.activePlastic = true;
    const response = await POST(request("POST", { subjectId: "plastica-2023-lenguaje-1", weekday: "Martes", start_time: "10:00", end_time: "12:00", classroom: "Aula propia" }));
    expect(response.status).toBe(200);
    expect(state.rows[0]).toMatchObject({ subject_id: "plastica-2023-lenguaje-1", subject_name: "Lenguaje Visual 1", classroom: "Aula propia" });
    expect(state.queried).not.toContain("course_schedules");
  });

  it("edita aula y hora sin consultar datos institucionales", async () => {
    state.rows = [{ id: 1, user_id: "student-a", subject_id: "11", classroom: "Aula 8", start_time: "14:00" }];
    const response = await PATCH(request("PATCH", { id: 1, weekday: "Miércoles", start_time: "15:00", end_time: "19:00", classroom: "Aula 9" }));
    expect(response.status).toBe(200);
    expect(state.queried).toEqual(["user_course_entries"]);
    expect(state.rows[0]).toMatchObject({ start_time: "15:00", classroom: "Aula 9" });
  });
});
