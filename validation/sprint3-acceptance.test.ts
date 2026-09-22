import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseAcademicCalendarText } from "@/lib/fda/parsers/academic-calendar-pdf";
import { parseGoogleSheetGrid } from "@/lib/fda/parsers/google-sheet-schedule";
import { importFieldsChanged } from "@/lib/fda/import-comparison";
import { buildAcademicEventExternalKey, planAcademicEventKeyBackfill } from "@/lib/fda/academic-event-key";
import { readFileSync } from "node:fs";
const state = vi.hoisted(() => ({ tables: {} as Record<string, any[]>, result: {} as any, email: "admin@example.test" }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({auth:{getUser:async()=>({data:{user:{id:"tester",email:state.email}}})}}) }));
vi.mock("@/lib/fda/run-source-import", () => ({runSourceImport:async()=>state.result}));
vi.mock("@/lib/notifications/push", () => ({recalculatePendingRemindersForEvent:async()=>undefined}));
vi.mock("@/lib/supabase/admin", () => ({createAdminClient:()=>({from:(table:string)=>{
 let action="select",payload:any,filters:[string,any][]=[];
 const query:any={select:()=>query,eq:(k:string,v:any)=>{filters.push([k,v]);return query;},insert:(p:any)=>{action="insert";payload=p;return query;},upsert:(p:any)=>{action="upsert";payload=p;return query;},update:(p:any)=>{action="update";payload=p;return query;},single:()=>execute(true),maybeSingle:()=>execute(true),then:(resolve:any,reject:any)=>execute(false).then(resolve,reject)};
 async function execute(single:boolean){const rows=state.tables[table]??(state.tables[table]=[]);let found=rows.filter(r=>filters.every(([k,v])=>r[k]===v));
 if(action==="insert"){const row={id:rows.length+1,...payload};rows.push(row);found=[row];}
 if(action==="upsert"){let row=rows.find(r=>r.source_id===payload.source_id&&r.external_key===payload.external_key);if(row)Object.assign(row,payload);else{row={id:rows.length+1,...payload};rows.push(row);}found=[row];}
 if(action==="update")found.forEach(row=>Object.assign(row,payload));
 return {data:single?found[0]??null:found,error:null};}
 return query;
}})}));
import { POST } from "@/app/api/admin/import/fda/route";
const options={sourceUrl:"https://example.test/source",sourceLabel:"Fixture",academicYear:2026,semester:2 as const};
const request=()=>new Request("http://localhost/api/admin/import/fda",{method:"POST",body:JSON.stringify({sourceKey:"academic-calendar-2026-second"})});
beforeEach(()=>{process.env.CRONOPIOS_ADMIN_EMAILS="admin@example.test";state.email="admin@example.test";state.tables={data_sources:[{id:4,key:"academic-calendar-2026-second"}],import_runs:[],subjects:[],academic_events:[],course_schedules:[]};});
describe("Sprint 3 acceptance audit",()=>{
 it("migrates a legacy event key while preserving the original id",()=>{
  const common={source_id:4,title:"Inscripción: 2 al 8 de noviembre.",starts_at:"2026-11-02",ends_at:"2026-11-08",created_at:"2026-01-01"};
  const newKey=buildAcademicEventExternalKey({title:common.title,startsAt:common.starts_at,endsAt:common.ends_at});
  const plan=planAcademicEventKeyBackfill([
   {id:5,...common,status:"published",external_key:"legacy-key"},
   {id:51,...common,status:"draft",external_key:newKey}
  ]);
  expect(plan).toEqual([{canonicalId:5,duplicateId:51,oldKey:"legacy-key",newKey,status:"published"}]);
  const migrated=[{id:5,...common,status:"published",external_key:newKey}];
  expect(planAcademicEventKeyBackfill(migrated)).toEqual([]);
 });
 it("does not count equivalent database and parser times as changes",()=>{
  const existing={start_time:"08:00:00",end_time:null,status:"published"};
  const next={start_time:"08:00",end_time:null,status:"published"};
  expect(importFieldsChanged(existing,next,["start_time","end_time","status"])).toBe(false);
 });
 it("calendar keys survive whitespace and capitalization",()=>{
 const a=parseAcademicCalendarText("Mesa noviembre: inscripción del 2 al 8 de noviembre",options);
 const b=parseAcademicCalendarText("MESA NOVIEMBRE:  INSCRIPCIÓN DEL 2 AL 8 DE NOVIEMBRE",options);
 expect(a.events).toHaveLength(1);expect(b.events).toHaveLength(1);expect(a.events[0].externalKey).toBe(b.events[0].externalKey);
 });
 it("schedule keys survive whitespace and capitalization",()=>{
 const a=parseGoogleSheetGrid('hora,Lunes\n8:00,"Materia A\nComisión 2"',options);
 const b=parseGoogleSheetGrid('hora,LUNES\n8:00,"MATERIA   A\nCOMISIÓN  2"',options);
 expect(a[0].externalKey).toBe(b[0].externalKey);
 });
 it("admin client has a server-only boundary",()=>{expect(readFileSync("lib/supabase/admin.ts","utf8")).toMatch(/import\s+["']server-only["']/);});
 it("normal authenticated users cannot invoke imports",async()=>{state.email="normal@example.test";expect((await POST(request())).status).toBe(403);expect(state.tables.import_runs).toHaveLength(0);});
 it("valid import followed by zero rows preserves published data and emits a warning",async()=>{
 state.result={events:parseAcademicCalendarText("Mesa noviembre: inscripción del 2 al 8 de noviembre",options).events,schedules:[],warnings:[],checksum:"valid"};
 expect((await POST(request())).status).toBe(200);state.tables.academic_events[0].status="published";
 const before=JSON.stringify(state.tables.academic_events);
 state.result={events:[],schedules:[],warnings:[],checksum:"empty"};
 const response=await(await POST(request())).json();
 expect(JSON.stringify(state.tables.academic_events)).toBe(before);
 expect(response.status).toBe("warning");expect(response.recordsFound).toBe(0);
 expect(response.warnings.length).toBeGreaterThan(0);
 });
});
