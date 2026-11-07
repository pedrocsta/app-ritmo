const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
process.env.SUPABASE_URL='https://test-project.supabase.co';
process.env.SUPABASE_SECRET_KEY='sb_secret_test_example';
function load(file,aliases={}) {
  const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const obj={exports:{}};
  new Function('require','module','exports',code)((name)=>name in aliases?aliases[name]:require(name),obj,obj.exports);
  return obj.exports;
}
const model=load('lib/model.ts');
let database={id:'personal',data:model.emptyData(),revision:0,updated_at:'2026-11-07T00:00:00Z'};
let requests=0;let apiKeyGood=true;let authorizationAbsent=true;
global.fetch=async(url,init={})=>{
  requests++;const target=new URL(url);
  assert.equal(target.host,'test-project.supabase.co');
  assert.ok(target.pathname.startsWith('/rest/v1/ritmo_state'));
  apiKeyGood &&= init.headers.get('apikey')==='sb_secret_test_example';
  authorizationAbsent &&= !init.headers.has('Authorization');
  if((init.method||'GET')==='GET') return Response.json([database]);
  if(init.method==='PATCH') {
    const expected=Number(target.searchParams.get('revision')?.replace('eq.',''));
    if(database.revision!==expected) return Response.json([]);
    database={...database,...JSON.parse(init.body)};
    return Response.json([{revision:database.revision,updated_at:database.updated_at}]);
  }
  throw new Error('Unexpected method');
};
const supabaseServer=load('lib/supabase-server.ts');
let status='anonymous';
const route=load('app/api/state/route.ts',{
  '@/lib/model':model,
  '@/lib/supabase-server':supabaseServer,
  '@/lib/auth':{ownerStatus:async()=>status},
  'next/server':{NextResponse:{json:(value,options)=>Response.json(value,options)}},
});
const send=(data,expectedRevision)=>route.PUT(new Request('http://localhost/api/state',{method:'PUT',body:JSON.stringify({data,expectedRevision})}));
(async()=>{
  assert.equal((await route.GET()).status,401);
  assert.equal((await send(model.emptyData(),0)).status,401);
  assert.equal(requests,0);
  status='forbidden';
  assert.equal((await route.GET()).status,403);
  assert.equal((await send(model.emptyData(),0)).status,403);
  assert.equal(requests,0);
  status='owner';
  const first=await route.GET();assert.equal(first.status,200);
  assert.equal((await first.json()).revision,0);
  const change=model.emptyData();change.days['2026-11-07']={...model.emptyDay(),creatine:true};
  change.habits.push({id:'water',title:'Agua',subtitle:'',icon:'sun',tone:'sky'});
  assert.equal((await send(change,0)).status,200);
  assert.equal(database.data.days['2026-11-07'].creatine,true);
  assert.equal(database.data.habits.length,6);
  assert.equal((await send(change,0)).status,409);
  assert.equal((await send({version:1},1)).status,400);
  const next=await route.GET();assert.equal((await next.json()).data.habits.length,6);
  assert.equal(apiKeyGood,true);assert.equal(authorizationAbsent,true);
  assert.equal(requests,4);
  console.log('OK - API requires single owner, denies anonymous/other accounts, handles sync and conflicts.');
})().catch(err=>{console.error(err);process.exitCode=1});
