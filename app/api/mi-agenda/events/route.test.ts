import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ userId: "user-a" as string | null, rows: [] as Array<Record<string, unknown>> }));
vi.mock("@/lib/supabase/current-user", () => ({ getCurrentUser: async () => state.userId ? { id: state.userId } : null }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: () => {
  let action: "insert" | "update" | "delete" = "insert";
  let payload: Record<string, unknown> = {};
  const filters: Array<[string, unknown]> = [];
  const query = {
    insert(value: Record<string, unknown>) { action = "insert"; payload = value; return query; },
    update(value: Record<string, unknown>) { action = "update"; payload = value; return query; },
    delete() { action = "delete"; return query; },
    select() { return query; },
    eq(key: string, value: unknown) { filters.push([key, value]); return query; },
    async single() { const row = { id: "11111111-1111-4111-8111-111111111111", ...payload }; state.rows.push(row); return { data: row, error: null }; },
    async maybeSingle() { const index = state.rows.findIndex(row => filters.every(([key, value]) => row[key] === value)); if (index < 0) return { data: null, error: null }; if (action === "delete") return { data: state.rows.splice(index, 1)[0], error: null }; Object.assign(state.rows[index], payload); return { data: state.rows[index], error: null }; },
  };
  return query;
} }) }));
import { DELETE, PATCH, POST } from "./route";

const id = "11111111-1111-4111-8111-111111111111";
const request = (method: string, body: object) => new Request("http://localhost/api/mi-agenda/events", { method, body: JSON.stringify(body) });
const fields = { title: "Dentista", event_date: "2026-09-23", start_time: null, end_time: null, category: "personal", recurrence_type: "none" };
beforeEach(() => { state.userId = "user-a"; state.rows = []; });

describe("eventos personales", () => {
  it("crea con el usuario de sesión aunque el cliente envíe otro user_id", async () => {
    const response = await POST(request("POST", { ...fields, user_id: "user-b" }));
    expect(response.status).toBe(200);
    expect(state.rows[0].user_id).toBe("user-a");
  });
  it("permite editar y eliminar solo eventos propios", async () => {
    state.rows = [{ id, user_id: "user-b", ...fields }];
    expect((await PATCH(request("PATCH", { id, ...fields, title: "Otro" }))).status).toBe(422);
    expect((await DELETE(request("DELETE", { id }))).status).toBe(422);
    expect(state.rows).toHaveLength(1);
    state.rows[0].user_id = "user-a";
    expect((await PATCH(request("PATCH", { id, ...fields, title: "Editado" }))).status).toBe(200);
    expect(state.rows[0].title).toBe("Editado");
    expect((await DELETE(request("DELETE", { id }))).status).toBe(200);
    expect(state.rows).toHaveLength(0);
  });
  it("rechaza llamadas anónimas", async () => {
    state.userId = null;
    expect((await POST(request("POST", fields))).status).toBe(401);
  });
});
