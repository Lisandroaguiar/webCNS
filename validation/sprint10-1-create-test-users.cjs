const { loadEnvConfig } = require('@next/env');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('node:crypto');

loadEnvConfig(process.cwd());
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const suffix = crypto.randomBytes(5).toString('hex');
  const users = [];
  for (const label of ['A', 'B']) {
    const email = `sprint10-1-${label.toLowerCase()}-${suffix}@example.test`;
    const password = crypto.randomBytes(24).toString('base64url');
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { test_run: 'sprint10-1' } });
    if (error || !data.user) throw error ?? new Error(`No se creó TEST ${label}`);
    users.push({ label, id: data.user.id, email, password });
  }
  process.stdout.write(JSON.stringify(users));
}

main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
