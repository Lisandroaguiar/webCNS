import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { planAcademicEventKeyBackfill, type AcademicEventKeyRow } from "../lib/fda/academic-event-key.ts";

// One-off server script: it is not imported by the application or exposed as an endpoint.
if (typeof window !== "undefined") throw new Error("Este backfill sólo puede ejecutarse en el servidor.");

const apply = process.argv.includes("--apply");
if (!apply && !process.argv.includes("--dry-run")) throw new Error("Usá --dry-run o --apply.");

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line)).map(line => {
    const separator = line.indexOf("=");
    return [line.slice(0, separator), line.slice(separator + 1).replace(/^['"]|['"]$/g, "")];
  })
);
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Faltan credenciales server-side de Supabase.");

async function main() {
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data, error } = await admin.from("academic_events").select("id,source_id,external_key,title,status,starts_at,ends_at,created_at");
  if (error) throw new Error(error.message);
  const rows = data as AcademicEventKeyRow[];
  const plans = planAcademicEventKeyBackfill(rows);

  for (const plan of plans) {
    console.log(`${plan.canonicalId} ${plan.status} ${plan.oldKey} -> ${plan.newKey} duplicate=${plan.duplicateId ?? "none"}`);
  }
  console.log(`mode=${apply ? "apply" : "dry-run"} changes=${plans.length}`);

  if (apply) {
    for (const plan of plans) {
      if (plan.duplicateId != null) {
        const { error: deleteError } = await admin.from("academic_events").delete().eq("id", plan.duplicateId).eq("status", "draft");
        if (deleteError) throw new Error(`No se pudo eliminar draft ${plan.duplicateId}: ${deleteError.message}`);
      }
      const { error: updateError } = await admin.from("academic_events").update({ external_key: plan.newKey }).eq("id", plan.canonicalId);
      if (updateError) throw new Error(`No se pudo migrar evento ${plan.canonicalId}: ${updateError.message}`);
    }
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
