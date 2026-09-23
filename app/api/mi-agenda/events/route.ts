import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";
import { validatePersonalEvent } from "@/lib/academic/personal-calendar";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Iniciá sesión para guardar eventos." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const values = validatePersonalEvent(body);
  if (!values) return NextResponse.json({ error: "Revisá el título, la fecha y las horas del evento." }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.from("user_calendar_events").insert({ ...values, user_id: user.id }).select("id").single();
  if (error) return NextResponse.json({ error: "No pudimos guardar el evento." }, { status: 422 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Iniciá sesión para editar eventos." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const values = validatePersonalEvent(body);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !values) return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.from("user_calendar_events").update({ ...values, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "No pudimos editar el evento." }, { status: 422 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Iniciá sesión para quitar eventos." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.from("user_calendar_events").delete().eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "No pudimos quitar el evento." }, { status: 422 });
  return NextResponse.json({ ok: true });
}
