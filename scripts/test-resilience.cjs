const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file, aliases = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }}).outputText;
  const mod = { exports: {} };
  new Function('require','module','exports',js)(name => name in aliases ? aliases[name] : require(name), mod, mod.exports);
  return mod.exports;
}
const originalLog = console.error;
console.error = () => {}; // Expected mocked outages are intentionally quiet during tests.
(async () => {
  let publicConfig = true;
  let userId = 'owner-user';
  let authError = null;
  let shouldThrow = false;
  let createCalls = 0;
  const supabaseServer = { createClient: async () => {
    createCalls++;
    if (shouldThrow) throw Error('Auth network failure');
    return { auth: { getUser: async () => ({ data: { user: userId ? {id:userId} : null }, error: authError }) } };
  }};
  const config = { isPublicSupabaseConfigured: () => publicConfig };
  process.env.OWNER_USER_ID = 'owner-user';
  const auth = load('lib/auth.ts', { 'server-only': {}, '@/lib/supabase/server': supabaseServer, '@/lib/supabase/config': config });
  assert.equal(await auth.ownerStatus(), 'owner');
  userId = 'visitor-user';
  assert.equal(await auth.ownerStatus(), 'forbidden');
  userId = null;
  assert.equal(await auth.ownerStatus(), 'anonymous');
  shouldThrow = true;
  assert.equal(await auth.ownerStatus(), 'unavailable');
  shouldThrow = false;
  authError = { name:'AuthRetryableFetchError', status:503 };
  assert.equal(await auth.ownerStatus(), 'unavailable');
  authError = { name:'AuthSessionMissingError', status:400 };
  assert.equal(await auth.ownerStatus(), 'anonymous');
  publicConfig = false;
  const count = createCalls;
  assert.equal(await auth.ownerStatus(), 'unavailable');
  assert.equal(createCalls, count, 'Missing auth env must never initialize Supabase');
  publicConfig = true;
  delete process.env.OWNER_USER_ID;
  assert.equal(await auth.ownerStatus(), 'unavailable');
  process.env.OWNER_USER_ID = 'owner-user';

  let apiStatus = 'owner';
  const me = load('app/api/auth/me/route.ts', {
    '@/lib/auth': {ownerStatus:async()=>apiStatus},
    'next/server': {NextResponse: {json:(body,options)=>Response.json(body, options)}},
  });
  for(const [status, http] of [['owner',200], ['anonymous',401], ['forbidden',403], ['unavailable',503]]) {
    apiStatus=status;
    const res=await me.GET();
    assert.equal(res.status,http);
    assert.equal((await res.json()).authorized,status==='owner');
  }

  let createSSRCalls = 0;
  let refreshThrows = true;
  publicConfig = false;
  const NextResponse = { next: () => ({ headers:new Headers(), cookies:{set(){}} }) };
  const proxyModule = load('proxy.ts', {
    '@/lib/supabase/config':config,
    '@supabase/ssr': {createServerClient:()=> {
      createSSRCalls++;
      return {auth:{getClaims:async()=> {if(refreshThrows) throw Error('temporary network failure');}}};
    }},
    'next/server':{NextResponse},
  });
  const request = {cookies:{getAll:()=>[],set:()=>{}},nextUrl:{pathname:'/login'}};
  const noConfigResponse=await proxyModule.proxy(request);
  assert.equal(noConfigResponse.headers.get('Cache-Control'),'private, no-store, max-age=0');
  assert.equal(createSSRCalls,0);
  publicConfig = true;
  const networkFailResponse=await proxyModule.proxy(request);
  assert.equal(networkFailResponse.headers.get('Cache-Control'),'private, no-store, max-age=0');
  assert.equal(createSSRCalls,1);
  refreshThrows = false;
  const okResponse=await proxyModule.proxy(request);
  assert.equal(okResponse.headers.get('Cache-Control'),'private, no-store, max-age=0');
  assert.equal(createSSRCalls,2);
  originalLog('OK - auth isolates outages and missing environment without unhandled 500s; status remains fail-closed.');
})().catch(err=>{console.error=originalLog; console.error(err);process.exitCode=1;});
