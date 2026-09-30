import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = JSON.parse(readFileSync(resolve(root, "data/plastic-prerequisite-source.json"), "utf8"));
const migrationPath = resolve(root, "supabase/migrations/20260930100000_plastic_prerequisites_by_code.sql");
const auditPath = resolve(root, "informe-correlatividades-plastica-por-codigo.txt");
const pdf = {
  "2006": "PROGRAMA LIC Y PROF PLASTICA 2006_modif 2025.pdf",
  "2023": "PLAN DE ESTUDIOS_Prof y Lic AV 2023.pdf",
};
const cells = [
  ["enroll", "regular", 1],
  ["enroll", "passed", 2],
  ["pass", "regular", 3],
  ["pass", "passed", 4],
];
const rules = [];
for (const [year, rows] of Object.entries(source)) {
  for (const [index, row] of rows.entries()) {
    const [target, ...rest] = row;
    for (const [purpose, requiredStatus, cellIndex] of cells) {
      const codes = String(rest[cellIndex - 1] ?? "").trim().split(/\s+/).filter(Boolean);
      const distinct = [...new Set(codes)];
      for (const required of distinct) {
        const count = codes.filter(item => item === required).length;
        rules.push({
          id: `plastica-${year}-${String(index + 1).padStart(2, "0")}-${purpose}-${requiredStatus}-${required.toLowerCase()}`,
          curriculum: `plastica-${year}`, target, required, purpose, requiredStatus, count,
          source: `${pdf[year]}#fila=${index + 1};columna=${purpose}-${requiredStatus}`,
          manual: row[5] === "manual" || (count > 1 && required !== "P0083"),
        });
      }
    }
  }
}
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const values = rules.map(rule => `  (${[rule.id, rule.curriculum, rule.target, rule.required, rule.purpose, rule.requiredStatus, rule.count, rule.source, rule.manual]
  .map((value, index) => index === 6 ? value : index === 8 ? value : quote(value)).join(",")})`).join(",\n");
const sql = `-- Generated from the two official FDA Plastica plan PDFs. Regenerate with scripts/generate-plastic-prerequisite-migration.mjs.
-- Legacy curriculum_prerequisites remains for compatibility; Plastica reads this code-based table.
create table if not exists public.curriculum_prerequisite_rules (
  id text primary key,
  curriculum_id text not null references public.curricula(id),
  target_code text not null,
  required_code text not null,
  purpose text not null check (purpose in ('enroll','pass')),
  required_status text not null check (required_status in ('regular','passed')),
  required_count smallint not null check (required_count > 0),
  source text not null,
  source_review_required boolean not null default false,
  resolution_status text not null default 'MANUAL_REVIEW'
    check (resolution_status in ('VERIFIED_BY_CODE','CODE_GROUP','AMBIGUOUS_CODE','MISSING_CODE','MANUAL_REVIEW')),
  target_curriculum_subject_id text references public.curriculum_subjects(id),
  required_curriculum_subject_id text references public.curriculum_subjects(id),
  target_requirement_id text references public.curriculum_requirements(id),
  required_requirement_id text references public.curriculum_requirements(id)
);
create index if not exists curriculum_prerequisite_rules_curriculum on public.curriculum_prerequisite_rules(curriculum_id,target_code);
alter table public.curriculum_prerequisite_rules enable row level security;
drop policy if exists curriculum_prerequisite_rules_read on public.curriculum_prerequisite_rules;
create policy curriculum_prerequisite_rules_read on public.curriculum_prerequisite_rules for select to anon,authenticated using (true);
grant select on public.curriculum_prerequisite_rules to anon,authenticated;

insert into public.curriculum_prerequisite_rules
  (id,curriculum_id,target_code,required_code,purpose,required_status,required_count,source,source_review_required)
values
${values}
on conflict (id) do update set
  curriculum_id=excluded.curriculum_id,target_code=excluded.target_code,required_code=excluded.required_code,
  purpose=excluded.purpose,required_status=excluded.required_status,required_count=excluded.required_count,
  source=excluded.source,source_review_required=excluded.source_review_required;

-- Link by curriculum + exact official code only. Repeated P0083 is the complementary-workshop group.
with resolved as (
  select r.id,
    (select count(*) from public.curriculum_subjects s where s.curriculum_id=r.curriculum_id and upper(trim(s.official_code))=r.target_code) as target_matches,
    (select min(s.id) from public.curriculum_subjects s where s.curriculum_id=r.curriculum_id and upper(trim(s.official_code))=r.target_code) as target_id,
    (select count(*) from public.curriculum_subjects s where s.curriculum_id=r.curriculum_id and upper(trim(s.official_code))=r.required_code) as required_matches,
    (select min(s.id) from public.curriculum_subjects s where s.curriculum_id=r.curriculum_id and upper(trim(s.official_code))=r.required_code) as required_id,
    (select min(g.id) from public.curriculum_requirements g where g.curriculum_id=r.curriculum_id and g.pool='complementary_workshops') as group_id
  from public.curriculum_prerequisite_rules r where r.curriculum_id in ('plastica-2006','plastica-2023')
)
update public.curriculum_prerequisite_rules r set
  target_curriculum_subject_id=case when r.target_code<>'P0083' and x.target_matches=1 then x.target_id else null end,
  required_curriculum_subject_id=case when r.required_code<>'P0083' and x.required_matches=1 then x.required_id else null end,
  target_requirement_id=case when r.target_code='P0083' then x.group_id else null end,
  required_requirement_id=case when r.required_code='P0083' then x.group_id else null end,
  resolution_status=case
    when r.source_review_required or (r.required_count>1 and r.required_code<>'P0083') then 'MANUAL_REVIEW'
    when (r.target_code<>'P0083' and x.target_matches>1) or (r.required_code<>'P0083' and x.required_matches>1) then 'AMBIGUOUS_CODE'
    when (r.target_code='P0083' and x.group_id is null) or (r.required_code='P0083' and x.group_id is null)
      or (r.target_code<>'P0083' and x.target_matches=0) or (r.required_code<>'P0083' and x.required_matches=0) then 'MISSING_CODE'
    when r.target_code='P0083' or r.required_code='P0083' then 'CODE_GROUP'
    else 'VERIFIED_BY_CODE' end
from resolved x where r.id=x.id;

-- Promote only subjects whose entire transcribed prerequisite set resolved unambiguously.
update public.curriculum_subjects s set review_status='verified'
where s.curriculum_id in ('plastica-2006','plastica-2023') and s.requirement_kind<>'choice'
  and exists (select 1 from public.curriculum_prerequisite_rules r where r.target_curriculum_subject_id=s.id)
  and not exists (select 1 from public.curriculum_prerequisite_rules r where r.target_curriculum_subject_id=s.id
    and r.resolution_status not in ('VERIFIED_BY_CODE','CODE_GROUP'));

-- Do not use the legacy subject-id rules for Plastica after this migration.
-- No personal academic history is updated or deleted.
`;
writeFileSync(migrationPath, sql, "utf8");

const catalog = readFileSync(resolve(root, "supabase/migrations/20260927121000_sprint9_plastica_plans.sql"), "utf8");
const codeCounts = new Map();
for (const match of catalog.matchAll(/\('(2006|2023)','[^']+','[^']+','([A-Z][0-9]{4})','/g)) {
  const key = `plastica-${match[1]}:${match[2]}`;
  codeCounts.set(key, (codeCounts.get(key) ?? 0) + 1);
}
function expectedStatus(rule) {
  if (rule.manual) return "MANUAL_REVIEW";
  const target = codeCounts.get(`${rule.curriculum}:${rule.target}`) ?? 0;
  const required = codeCounts.get(`${rule.curriculum}:${rule.required}`) ?? 0;
  if ((rule.target !== "P0083" && target > 1) || (rule.required !== "P0083" && required > 1)) return "AMBIGUOUS_CODE";
  if ((rule.target !== "P0083" && !target) || (rule.required !== "P0083" && !required)) return "MISSING_CODE";
  return rule.target === "P0083" || rule.required === "P0083" ? "CODE_GROUP" : "VERIFIED_BY_CODE";
}
const totals = Object.fromEntries(["VERIFIED_BY_CODE","CODE_GROUP","AMBIGUOUS_CODE","MISSING_CODE","MANUAL_REVIEW"].map(status => [status, rules.filter(rule => expectedStatus(rule) === status).length]));
writeFileSync(auditPath, [
  "AUDITORÍA LOCAL — CORRELATIVIDADES DE ARTES PLÁSTICAS POR CÓDIGO",
  "Fuente: los dos PDFs oficiales entregados por el usuario. No contiene datos personales.",
  `Reglas transcritas: ${rules.length} (Plan 2006: ${rules.filter(rule => rule.curriculum.endsWith('2006')).length}; Plan 2023: ${rules.filter(rule => rule.curriculum.endsWith('2023')).length}).`,
  ...Object.entries(totals).map(([status, count]) => `${status}: ${count}`),
  "",
  "Estos conteos son esperados contra el catálogo local; confirmar la auditoría SQL tras aplicar la migración remota.",
  "Los códigos repetidos no se enlazan al primer slot. P0083 se vincula al grupo de talleres; 715 queda sin coincidencia.",
  "Algunas celdas densas del póster 2006 están marcadas MANUAL_REVIEW para cotejo adicional; no se usó fuzzy matching.",
  "",
  ...rules.filter(rule => expectedStatus(rule) !== "VERIFIED_BY_CODE").map(rule => `${expectedStatus(rule)} | ${rule.curriculum} | ${rule.target} <- ${rule.required} x${rule.count} | ${rule.purpose}/${rule.requiredStatus} | ${rule.source}`),
].join("\n") + "\n", "utf8");
console.log(`Generated ${rules.length} rules; ${JSON.stringify(totals)}`);
