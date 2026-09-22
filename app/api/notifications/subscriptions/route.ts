import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { data, error } = await supabase.from("push_subscriptions").select("id,endpoint,disabled_at,created_at,last_success_at,failure_count").eq("user_id", user.id);
  return error ? NextResponse.json({ error: error.message }, { status: 422 }) : NextResponse.json({ subscriptions: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!body.endpoint || !body.keys?.p256dh || !body.keys.auth) return NextResponse.json({ error: "Suscripción inválida." }, { status: 400 });
  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: user.id, endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth,
    user_agent: request.headers.get("user-agent"), disabled_at: null, failure_count: 0, updated_at: new Date().toISOString()
  }, { onConflict: "endpoint" });
  return error ? NextResponse.json({ error: error.message }, { status: 422 }) : NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { endpoint?: string };
  if (!body.endpoint) return NextResponse.json({ error: "Endpoint requerido." }, { status: 400 });
  const { error } = await supabase.from("push_subscriptions").update({ disabled_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("user_id", user.id).eq("endpoint", body.endpoint);
  return error ? NextResponse.json({ error: error.message }, { status: 422 }) : NextResponse.json({ ok: true });
}
