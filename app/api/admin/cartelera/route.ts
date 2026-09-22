import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/current-user";

function isAdmin(email?: string | null) {
  const allowed = (process.env.CRONOPIOS_ADMIN_EMAILS ?? "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  return Boolean(email && allowed.includes(email.toLowerCase()));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.email)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = String(body.action ?? "save");
  const admin = createAdminClient();

  if (action === "delete") {
    const { error } = await admin.from("community_posts").delete().eq("id", String(body.id));
    if (error) return NextResponse.json({ error: error.message }, { status: 422 });
  } else if (action === "toggle") {
    const { error } = await admin.from("community_posts").update({ is_published: Boolean(body.isPublished), updated_at: new Date().toISOString() }).eq("id", String(body.id));
    if (error) return NextResponse.json({ error: error.message }, { status: 422 });
  } else {
    const title = String(body.title ?? "").trim();
    const content = String(body.body ?? "").trim();
    if (!title || !content) return NextResponse.json({ error: "Título y resumen son obligatorios." }, { status: 400 });
    const row = {
      author_id: user.id, title, body: content,
      event_type: ["evento", "aviso", "convocatoria", "cultural", "fecha_examen"].includes(String(body.eventType)) ? String(body.eventType) : "evento",
      event_date: body.eventDate || null, event_time: body.eventTime || null,
      location: String(body.location ?? "").trim() || null,
      image_url: String(body.imageUrl ?? "").trim() || null,
      link_url: String(body.linkUrl ?? "").trim() || null,
      accent: ["lime", "fuchsia", "cyan"].includes(String(body.accent)) ? body.accent : "fuchsia",
      is_published: Boolean(body.isPublished), updated_at: new Date().toISOString()
    };
    const query = body.id ? admin.from("community_posts").update(row).eq("id", String(body.id)) : admin.from("community_posts").insert(row);
    const { error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 422 });
  }
  revalidateTag("community-posts");
  return NextResponse.json({ ok: true });
}
