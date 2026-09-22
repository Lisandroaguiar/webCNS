const fs=require('node:fs'),crypto=require('node:crypto');const {createClient}=require('@supabase/supabase-js');
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).replace(/^['"]|['"]$/g,'')]}));
const opts={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,opts),anon=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,opts);
const result={timestamp:new Date().toISOString(),roles:{}};const fixtures=[],cleanup=[];let testUser;
const ok=r=>{if(r.error)throw new Error(r.error.message);return r.data;};
(async()=>{try {
 const sources=ok(await admin.from('data_sources').select('id,source_type'));
 for(const [table,type] of [['academic_events','academic_calendar'],['course_schedules','course_schedule']]){
  const row=table==='academic_events'?{title:'E2E RLS fixture - do not publish',event_type:'other',starts_at:'2099-01-01',ends_at:'2099-01-01'}:{raw_subject_name:'E2E RLS fixture - do not publish',weekday:'Lunes',start_time:'08:00:00'};
  const inserted=ok(await admin.from(table).insert({...row,source_id:sources.find(s=>s.source_type===type).id,external_key:`e2e-${crypto.randomUUID()}`,academic_year:2099,source_url:'https://example.invalid/e2e',source_label:'E2E fixture',status:'draft'}).select('*').single());fixtures.push({table,row:inserted});cleanup.push({table,id:inserted.id});
 }
 const email=`cronopios-e2e-${Date.now()}@example.com`,password=crypto.randomBytes(32).toString('base64url');
 testUser=ok(await admin.auth.admin.createUser({email,password,email_confirm:true})).user;
 const cookieJar=new Map(); const {createServerClient}=require('@supabase/ssr'); const normal=createServerClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>Array.from(cookieJar,([name,value])=>({name,value})),setAll:items=>items.forEach(({name,value})=>cookieJar.set(name,value))}});ok(await normal.auth.signInWithPassword({email,password}));
 for(const [role,client] of [['anonymous',anon],['authenticated_normal',normal]]){
  const checks={};
  for(const {table,row} of fixtures){
   const published=await client.from(table).select('id,status').eq('status','published');
   const drafts=await client.from(table).select('id,status').eq('status','draft');
   const probe=await client.from(table).update({status:'draft'}).eq('id',row.id).select('id');
   const sample=published.data?.[0];const updatePublished=sample?await client.from(table).update({status:'published'}).eq('id',sample.id).select('id'):null;
   const deletion=await client.from(table).delete().eq('id',row.id).select('id'); const {id,created_at,updated_at,...copy}=row;
   const insertion=await client.from(table).insert({...copy,external_key:`e2e-write-${crypto.randomUUID()}`}).select('id');
   if(insertion.data?.length)for(const added of insertion.data)cleanup.push({table,id:added.id});
   checks[table]={deletedFixtureRows:deletion.data?.length,deleteError:deletion.error,publishedCount:published.data?.length,readError:published.error,draftsVisible:drafts.data?.length,draftReadError:drafts.error,updateDraftRows:probe.data?.length,updateDraftError:probe.error,updatePublishedRows:updatePublished?.data?.length,updatePublishedError:updatePublished?.error,insertError:insertion.error,insertRows:insertion.data?.length};
  }
  const runs=await client.from('import_runs').select('id');checks.import_runs={count:runs.data?.length,error:runs.error};result.roles[role]=checks;
 }
 result.normalAdminEndpoint=(await fetch('http://localhost:3000/api/admin/import/fda',{method:'POST',headers:{'content-type':'application/json',cookie:Array.from(cookieJar,([name,value])=>`${name}=${value}`).join('; ')},body:JSON.stringify({sourceKey:'academic-calendar-2026-second'})})).status;
 result.anonymousAdminEndpoint=(await fetch('http://localhost:3000/api/admin/import/fda',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sourceKey:'academic-calendar-2026-second'})})).status;
}finally{
 for(const {table,id} of cleanup)ok(await admin.from(table).delete().eq('id',id));
 if(testUser)ok(await admin.auth.admin.deleteUser(testUser.id));
 result.fixturesRemoved=true;fs.writeFileSync('output/sprint3-e2e/rls.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}})().catch(e=>{console.error(e.message);process.exitCode=1});
