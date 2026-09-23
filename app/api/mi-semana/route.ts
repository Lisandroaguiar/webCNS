import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";
import { getSelectedWeekSchedules } from "@/lib/academic/selected-week";
import { currentAcademicPeriod, isCurrentSchedule, sameSubject, type WeekSchedule } from "@/lib/academic/weekly-schedule";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Iniciá sesión para armar tu semana." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const scheduleId = Number(body.scheduleId);
  if (!Number.isSafeInteger(scheduleId) || scheduleId < 1) return NextResponse.json({ error: "Horario inválido." }, { status: 400 });
  const supabase = await createClient();
  const [{ data: schedule, error: scheduleError }, { data: profile, error: profileError }] = await Promise.all([
    supabase.from("course_schedules").select("id,subject_id,raw_subject_name,weekday,start_time,end_time,commission,classroom,campus,curriculum,academic_year,semester,status").eq("id", scheduleId).eq("status", "published").maybeSingle(),
    supabase.from("profiles").select("curriculum").eq("id", user.id).maybeSingle(),
  ]);
  if (scheduleError || profileError) return NextResponse.json({ error: "No pudimos comprobar este horario." }, { status: 503 });
  if (!schedule || !profile?.curriculum || !isCurrentSchedule(schedule as WeekSchedule, currentAcademicPeriod(), profile.curriculum)) return NextResponse.json({ error: "Este horario no corresponde a tu plan y período actual." }, { status: 422 });
  let selected: WeekSchedule[];
  try { selected = await getSelectedWeekSchedules(user.id); } catch { return NextResponse.json({ error: "No pudimos cargar tu semana." }, { status: 503 }); }
  const alternatives = selected.filter(item => item.id !== scheduleId && isCurrentSchedule(item, currentAcademicPeriod(), profile.curriculum) && sameSubject(item, schedule as WeekSchedule));
  const { error } = await supabase.from("user_schedule_selections").insert({ user_id: user.id, course_schedule_id: scheduleId });
  if (error && error.code !== "23505") return NextResponse.json({ error: "No pudimos agregar este horario." }, { status: 422 });
  if (body.replaceSameSubject === true && alternatives.length) {
    const { error: deleteError } = await supabase.from("user_schedule_selections").delete().eq("user_id", user.id).in("course_schedule_id", alternatives.map(item => item.id));
    if (deleteError) return NextResponse.json({ error: "Agregamos la comisión, pero no pudimos quitar la anterior. Revisá Mi semana." }, { status: 409 });
  }
  return NextResponse.json({ ok: true, replacedIds: body.replaceSameSubject === true ? alternatives.map(item => item.id) : [] });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Iniciá sesión para editar tu semana." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const scheduleId = Number(body.scheduleId);
  if (!Number.isSafeInteger(scheduleId) || scheduleId < 1) return NextResponse.json({ error: "Horario inválido." }, { status: 400 });
  const supabase = await createClient();
  const { error } = await supabase.from("user_schedule_selections").delete().eq("user_id", user.id).eq("course_schedule_id", scheduleId);
  if (error) return NextResponse.json({ error: "No pudimos quitar este horario." }, { status: 422 });
  return NextResponse.json({ ok: true });
}
