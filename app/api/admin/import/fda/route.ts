import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runSourceImport } from "@/lib/fda/run-source-import";
import { sourceRegistry } from "@/lib/fda/source-registry";
import { importFieldsChanged } from "@/lib/fda/import-comparison";
import { recalculatePendingRemindersForEvent } from "@/lib/notifications/push";

export const runtime = "nodejs";

function isAdmin(email?: string | null) {
  const allowed = (process.env.CRONOPIOS_ADMIN_EMAILS ?? "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  return Boolean(email && allowed.includes(email.toLowerCase()));
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { sourceKey?: string };
  const sourceKey = body.sourceKey;
  if (!sourceKey || !sourceRegistry[sourceKey]) return NextResponse.json({ error: "Fuente no permitida." }, { status: 400 });
  let admin: ReturnType<typeof createAdminClient> | null = null;
  let runId: number | null = null;
  try {
    admin = createAdminClient();
    const { data: source, error: sourceError } = await admin.from("data_sources").select("id").eq("key", sourceKey).single();
    if (sourceError) {
      if (sourceError.message.toLowerCase().includes("invalid api key")) {
        throw new Error("La clave server-side de Supabase no es válida para este proyecto. Revisá SUPABASE_SERVICE_ROLE_KEY y reiniciá Next.js.");
      }
      throw new Error(`No se pudo consultar data_sources: ${sourceError.message}`);
    }
    if (!source) throw new Error("La fuente todavía no está registrada en data_sources. Verificá que la migración Sprint 3 se haya aplicado en este proyecto.");
    const { data: run, error: runError } = await admin.from("import_runs").insert({ source_id: source.id, status: "running" }).select("id").single();
    if (runError || !run) throw new Error(runError?.message ?? "No se pudo crear la ejecución.");
    runId = run.id;
    const result = await runSourceImport(sourceKey);
    const { data: subjects } = await admin.from("subjects").select("id, name");
    const normalized = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const now = new Date().toISOString();
    const errors: string[] = [];
    let recordsChanged = 0;
    for (const item of result.schedules) {
      const subject = subjects?.find(candidate => normalized(candidate.name) === normalized(item.rawSubjectName));
      const scheduleRow = {
        source_id: source.id,
        external_key: item.externalKey,
        subject_id: subject?.id == null ? null : String(subject.id),
        raw_subject_name: item.rawSubjectName,
        curriculum: item.curriculum ?? null,
        academic_year: item.academicYear,
        semester: item.semester ?? null,
        course_year: item.courseYear ?? null,
        commission: item.commission ?? null,
        weekday: item.weekday,
        start_time: item.startTime,
        end_time: item.endTime ?? null,
        campus: item.campus ?? null,
        classroom: item.classroom ?? null,
        notes: item.notes ?? null,
        source_url: item.sourceUrl,
        source_label: item.sourceLabel,
        last_seen_at: now,
        updated_at: now
      };
      const { data: existing } = await admin.from("course_schedules").select("id,status,raw_subject_name,weekday,start_time,end_time,commission,classroom,campus,notes,subject_id").eq("source_id", source.id).eq("external_key", item.externalKey).maybeSingle();
      const status = existing?.status === "published" || existing?.status === "verified" ? existing.status : "draft";
      const next = { ...scheduleRow, status };
      const changed = importFieldsChanged(existing, next, ["raw_subject_name", "weekday", "start_time", "end_time", "commission", "classroom", "campus", "notes", "subject_id", "status"]);
      const { error } = await admin.from("course_schedules").upsert(next, { onConflict: "source_id,external_key" });
      if (error) errors.push(`Horario ${item.rawSubjectName}: ${error.message}`);
      else if (changed) recordsChanged += 1;
    }
    for (const item of result.events) {
      const eventRow = {
        source_id: source.id,
        external_key: item.externalKey,
        title: item.title,
        event_type: item.eventType,
        registration_start: item.registrationStart ?? null,
        registration_end: item.registrationEnd ?? null,
        starts_at: item.startsAt ?? null,
        ends_at: item.endsAt ?? null,
        academic_year: item.academicYear,
        semester: item.semester ?? null,
        degree: item.degree ?? null,
        curriculum: item.curriculum ?? null,
        source_url: item.sourceUrl,
        source_label: item.sourceLabel,
        status: "draft",
        last_seen_at: now,
        updated_at: now
      };
      const { data: existing } = await admin.from("academic_events").select("id,status,title,event_type,registration_start,registration_end,starts_at,ends_at,semester").eq("source_id", source.id).eq("external_key", item.externalKey).maybeSingle();
      const status = existing?.status === "published" || existing?.status === "verified" ? existing.status : "draft";
      const next = { ...eventRow, status };
      const changed = importFieldsChanged(existing, next, ["title", "event_type", "registration_start", "registration_end", "starts_at", "ends_at", "semester", "status"]);
      const { error } = await admin.from("academic_events").upsert(next, { onConflict: "source_id,external_key" });
      if (error) errors.push(`Evento ${item.title}: ${error.message}`);
      else if (changed) {
        recordsChanged += 1;
        if (existing?.id && status === "published") await recalculatePendingRemindersForEvent(existing.id);
      }
    }
    const recordsFound = result.schedules.length + result.events.length;
    const emptyResultWarnings = recordsFound === 0 ? ["La fuente no produjo registros. Se conservaron los datos existentes y no se marcaron como obsoletos."] : [];
    const warnings = [...result.warnings, ...emptyResultWarnings, ...errors];
    const status = recordsFound === 0 || warnings.length ? "warning" : "success";
    await admin.from("import_runs").update({ finished_at: new Date().toISOString(), status, checksum: result.checksum, records_found: recordsFound, records_changed: recordsChanged, warning_count: warnings.length, error_summary: warnings.join(" | ") || null }).eq("id", run.id);
    await admin.from("data_sources").update({ last_checked_at: new Date().toISOString(), last_success_at: new Date().toISOString(), last_checksum: result.checksum, updated_at: new Date().toISOString() }).eq("id", source.id);
    return NextResponse.json({ sourceKey, status, recordsFound, recordsChanged, warnings });
  } catch (error) {
    if (admin && runId) await admin.from("import_runs").update({ finished_at: new Date().toISOString(), status: "failed", error_summary: error instanceof Error ? error.message : "Error desconocido" }).eq("id", runId);
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo ejecutar el import." }, { status: 422 });
  }
}
