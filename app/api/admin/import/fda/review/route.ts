import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recalculatePendingRemindersForEvent } from "@/lib/notifications/push";

function isAdmin(email?: string | null) {
  const allowed = (process.env.CRONOPIOS_ADMIN_EMAILS ?? "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  return Boolean(email && allowed.includes(email.toLowerCase()));
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { table?: string; id?: number; action?: "publish" | "discard" };
  if (!["academic_events", "course_schedules"].includes(body.table ?? "") || !body.id || !["publish", "discard"].includes(body.action ?? "")) {
    return NextResponse.json({ error: "Revisión inválida." }, { status: 400 });
  }
  const admin = createAdminClient();
  const status = body.action === "publish" ? "published" : "stale";
  const { error } = await admin.from(body.table!).update({ status, updated_at: new Date().toISOString() }).eq("id", body.id);
  if (error) {
    const message = error.message.toLowerCase().includes("invalid api key")
      ? "La clave server-side de Supabase no es válida para este proyecto. Revisá SUPABASE_SERVICE_ROLE_KEY y reiniciá Next.js."
      : error.message;
    return NextResponse.json({ error: message }, { status: 422 });
  }
  if (body.table === "academic_events" && body.action === "publish") await recalculatePendingRemindersForEvent(body.id);
  revalidateTag(body.table === "academic_events" ? "academic-events" : "course-schedules");
  return NextResponse.json({ ok: true });
}
