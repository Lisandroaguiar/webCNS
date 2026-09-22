// Re-runnable import of the two specific subjects. Never changes student records.
const fs = require('node:fs');
const { createClient } = require('@supabase/supabase-js');
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => {
  const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^['"]|['"]$/g, '')];
}));
async function main() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Falta la clave de administración del servidor.');
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const ensure = result => { if (result.error) throw new Error(result.error.message); return result.data; };
  const before = ensure(await db.from('subjects').select('id,code').eq('curriculum', 'old'));
  ensure(await db.from('subjects').upsert([
    { code: 'DM-4-FUNDAMENTOS', name: 'Fundamentos Psicopedagógicos de la Educación', year: 4, semester: 2, curriculum: 'old' },
    { code: 'DM-5-DIDACTICA', name: 'Didáctica Especial y Práctica de la Enseñanza', year: 5, semester: 1, curriculum: 'old' }
  ], { onConflict: 'code' }));
  for (const [code, name] of [
    ['DM-1-TEXTOS', 'Producción de Textos'],
    ['DM-4-EPISTEMOLOGIA', 'Epistemología del Arte'],
    ['DM-2-IDENTIDAD', 'Identidad, Estado y Sociedad en Latinoamérica y Argentina']
  ]) ensure(await db.from('subjects').update({ name }).eq('code', code));
  const subjects = ensure(await db.from('subjects').select('id,code,name').eq('curriculum', 'old'));
  const id = code => { const item = subjects.find(s => s.code === code); if (!item) throw new Error(`Falta ${code}`); return item.id; };
  const pairs = [
    ...['DM-3-TALLER','DM-3-LENGUAJE','DM-3-TECNOLOGIA'].map(code => ['DM-4-FUNDAMENTOS',code]),
    ...['DM-4-METODOLOGIA','DM-4-FUNDAMENTOS','DM-4-TALLER','DM-4-LENGUAJE','DM-4-TECNOLOGIA'].map(code => ['DM-5-DIDACTICA',code])
  ];
  ensure(await db.from('correlatives').upsert(pairs.map(([target, required]) => ({ subject_id: id(target), required_subject_id: id(required) })), { onConflict: 'subject_id,required_subject_id' }));
  if (!before.every(item => subjects.some(after => after.code === item.code && after.id === item.id))) throw new Error('Falló la comprobación de IDs existentes.');
  console.log(JSON.stringify({ catalogCount: subjects.length, existingIdsPreserved: true, addedSubjects: ['Fundamentos Psicopedagógicos de la Educación', 'Didáctica Especial y Práctica de la Enseñanza'], prerequisitePairs: pairs.length }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
