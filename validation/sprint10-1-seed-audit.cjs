const { loadEnvConfig } = require('@next/env');
const { createClient } = require('@supabase/supabase-js');

loadEnvConfig(process.cwd());
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function rows(table, columns) {
  const result = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from(table).select(columns).range(from, from + 999);
    if (error) throw error;
    result.push(...data);
    if (data.length < 1000) return result;
  }
}

async function main() {
  const [enrollments, subjects, workshops, pending, matches, activations] = await Promise.all([
    rows('user_enrollments', 'id,program_id,curriculum_id,orientation_id,is_active,created_at,updated_at,deleted_at'),
    rows('user_enrollment_subjects', 'enrollment_id'),
    rows('user_workshop_history', 'enrollment_id'),
    rows('user_pending_academic_records', 'enrollment_id'),
    rows('user_academic_import_matches', 'enrollment_id'),
    rows('enrollment_activation_log', 'from_enrollment_id,to_enrollment_id'),
  ]);
  const used = new Set([...subjects, ...workshops, ...pending, ...matches].map(row => row.enrollment_id).filter(Boolean));
  for (const row of activations) { if (row.from_enrollment_id) used.add(row.from_enrollment_id); used.add(row.to_enrollment_id); }
  const byDay = {};
  for (const row of enrollments.filter(row => row.program_id.startsWith('multimedia-'))) {
    const day = row.created_at.slice(0, 10);
    const stat = byDay[day] ??= { total: 0, empty: 0, untouched: 0, active: 0, deleted: 0 };
    stat.total++;
    if (!used.has(row.id)) stat.empty++;
    if (!used.has(row.id) && row.created_at === row.updated_at) stat.untouched++;
    if (row.is_active) stat.active++;
    if (row.deleted_at) stat.deleted++;
  }
  process.stdout.write(JSON.stringify({ multimediaByCreationDay: byDay, totalEnrollments: enrollments.length }));
}

main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
