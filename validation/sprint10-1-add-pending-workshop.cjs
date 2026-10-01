const { loadEnvConfig } = require('@next/env');
const { createClient } = require('@supabase/supabase-js');

loadEnvConfig(process.cwd());
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: signed, error: loginError } = await client.auth.signInWithPassword({ email: process.env.TEST_B_EMAIL, password: process.env.TEST_B_PASSWORD });
  if (loginError || !signed.user) throw loginError ?? new Error('Sin sesión B');
  const { data: enrollment, error: enrollmentError } = await client.from('user_enrollments').select('id').eq('user_id', signed.user.id).eq('program_id', 'plastica-lic').eq('curriculum_id', 'plastica-2006').single();
  if (enrollmentError || !enrollment) throw enrollmentError ?? new Error('Sin trayectoria B');
  const { error } = await client.from('user_pending_academic_records').insert({
    user_id: signed.user.id,
    enrollment_id: enrollment.id,
    raw_name: process.env.TEST_WORKSHOP_RAW ?? 'Taller de Escultura — prueba Sprint 10.1',
    status: 'passed',
    grade: 7,
    passed_at: '2025-12-10',
    match_kind: 'UNMATCHED',
    record_type: 'workshop',
    resolution_status: 'pending',
    source_reference: 'sprint10-1-synthetic',
  });
  if (error) throw error;
  process.stdout.write('Pending sintético de taller creado en TEST B');
}

main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
