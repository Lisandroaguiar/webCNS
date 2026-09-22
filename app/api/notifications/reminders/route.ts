import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { availableReminderTypes, calculateReminderDate, REMINDER_TYPES, type ReminderType } from "@/lib/notifications/reminders";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { data, error } = await supabase.from("event_reminders").select("id,academic_event_id,reminder_type,scheduled_for,enabled,academic_events(title)").eq("user_id", user.id).eq("enabled", true).order("scheduled_for");
  return error ? NextResponse.json({ error: error.message }, { status: 422 }) : NextResponse.json({ reminders: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { eventId?: number; reminderTypes?: ReminderType[] };
  const types = Array.from(new Set(body.reminderTypes ?? [])).filter(type => REMINDER_TYPES.includes(type));
  if (!body.eventId || !types.length) return NextResponse.json({ error: "Elegí al menos un aviso." }, { status: 400 });
  const { data: event } = await supabase.from("academic_events").select("id,registration_start,registration_end,starts_at,status").eq("id", body.eventId).eq("status", "published").single();
  if (!event) return NextResponse.json({ error: "Evento no disponible." }, { status: 404 });
  const available = availableReminderTypes(event);
  const rows = types.filter(type => available.includes(type)).map(type => ({ user_id: user.id, academic_event_id: event.id, reminder_type: type, scheduled_for: calculateReminderDate(event, type)!.toISOString(), enabled: true, updated_at: new Date().toISOString() }));
  if (!rows.length) return NextResponse.json({ error: "Esos avisos ya pasaron o no aplican al evento." }, { status: 400 });
  await supabase.from("event_reminders").update({ enabled: false, updated_at: new Date().toISOString() }).eq("user_id", user.id).eq("academic_event_id", event.id);
  const { error } = await supabase.from("event_reminders").upsert(rows, { onConflict: "user_id,academic_event_id,reminder_type" });
  return error ? NextResponse.json({ error: error.message }, { status: 422 }) : NextResponse.json({ ok: true, reminders: rows });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { eventId?: number };
  const { error } = await supabase.from("event_reminders").update({ enabled: false, updated_at: new Date().toISOString() }).eq("user_id", user.id).eq("academic_event_id", body.eventId);
  return error ? NextResponse.json({ error: error.message }, { status: 422 }) : NextResponse.json({ ok: true });
}
