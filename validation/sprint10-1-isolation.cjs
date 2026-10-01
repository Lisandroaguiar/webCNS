const { loadEnvConfig } = require('@next/env');
const { createClient } = require('@supabase/supabase-js');

loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function login(email, password) {
  const client = createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

async function check(viewer, targetId) {
  const tables = ['user_enrollments', 'user_enrollment_subjects', 'user_workshop_history', 'user_pending_academic_records', 'user_academic_import_matches'];
  const visible = {};
  for (const table of tables) {
    const field = table === 'user_enrollments' ? 'id' : 'enrollment_id';
    const { data, error } = await viewer.from(table).select('*').eq(field, targetId);
    if (error) throw error;
    visible[table] = data.length;
  }
  const actions = {};
  for (const [name, args] of [
    ['activate_user_enrollment', { selected_id: targetId }],
    ['soft_delete_user_enrollment', { p_enrollment_id: targetId }],
    ['restore_user_enrollment', { p_enrollment_id: targetId }],
  ]) {
    const { error } = await viewer.rpc(name, args);
    actions[name] = Boolean(error);
  }
  const { data: after, error: afterError } = await viewer.from('user_enrollments').select('id,is_active,deleted_at').eq('id', targetId);
  if (afterError) throw afterError;
  return { visible, actionsRejected: actions, visibleAfterAttempts: after.length };
}

async function main() {
  const a = await login(process.env.TEST_A_EMAIL, process.env.TEST_A_PASSWORD);
  const b = await login(process.env.TEST_B_EMAIL, process.env.TEST_B_PASSWORD);
  const { data: rowsA, error: errorA } = await a.from('user_enrollments').select('id');
  const { data: rowsB, error: errorB } = await b.from('user_enrollments').select('id');
  if (errorA || errorB || !rowsA.length || !rowsB.length) throw errorA ?? errorB ?? new Error('Faltan trayectorias de prueba');
  const output = { bToA: await check(b, rowsA[0].id), aToB: await check(a, rowsB[0].id) };
  process.stdout.write(JSON.stringify(output));
}

main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
