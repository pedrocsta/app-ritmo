const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

process.env.SUPABASE_URL = 'https://test-project.supabase.co';
process.env.SUPABASE_SECRET_KEY = 'sb_secret_test_example';

function load(file, aliases = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const moduleObj = { exports: {} };
  new Function('require', 'module', 'exports', code)(
    (name) => name in aliases ? aliases[name] : require(name), moduleObj, moduleObj.exports,
  );
  return moduleObj.exports;
}

const model = load('lib/model.ts');
const empty = model.emptyData();
let database = { id: 'personal', data: empty, revision: 0, updated_at: '2026-11-07T00:00:00Z' };
let requestCount = 0;
let apikeyPresent = true;
let authorizationAbsent = true;

global.fetch = async (url, init = {}) => {
  requestCount++;
  const target = new URL(url);
  assert.equal(target.host, 'test-project.supabase.co');
  assert.ok(target.pathname.startsWith('/rest/v1/ritmo_state'));
  apikeyPresent &&= init.headers.get('apikey') === 'sb_secret_test_example';
  authorizationAbsent &&= !init.headers.has('Authorization');
  const method = init.method || 'GET';
  if (method === 'GET') return Response.json([database]);
  if (method === 'PATCH') {
    const wanted = Number(target.searchParams.get('revision')?.replace('eq.', ''));
    if (database.revision !== wanted) return Response.json([]);
    const patch = JSON.parse(init.body);
    database = { ...database, ...patch };
    return Response.json([{ revision: database.revision, updated_at: database.updated_at }]);
  }
  throw new Error('Unexpected method');
};

const supabaseServer = load('lib/supabase-server.ts');
const route = load('app/api/state/route.ts', {
  '@/lib/model': model,
  '@/lib/supabase-server': supabaseServer,
  'next/server': { NextResponse: { json: (value, options) => Response.json(value, options) } },
});

async function send(data, expectedRevision) {
  return route.PUT(new Request('http://localhost/api/state', {
    method: 'PUT', body: JSON.stringify({ data, expectedRevision }),
  }));
}

(async () => {
  const initial = await route.GET();
  assert.equal(initial.status, 200);
  assert.equal((await initial.json()).revision, 0);
  const changed = model.emptyData();
  changed.days['2026-11-07'] = { ...model.emptyDay(), creatine: true };
  const saved = await send(changed, 0);
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).revision, 1);
  assert.equal(database.data.days['2026-11-07'].creatine, true);
  const stale = await send(changed, 0);
  assert.equal(stale.status, 409);
  assert.equal(database.revision, 1);
  const invalid = await send({ version: 1 }, 1);
  assert.equal(invalid.status, 400);
  const next = await route.GET();
  assert.equal((await next.json()).data.days['2026-11-07'].creatine, true);
  assert.equal(apikeyPresent, true);
  assert.equal(authorizationAbsent, true);
  assert.equal(requestCount, 4);
  console.log('OK - Supabase server-only, GET/PUT, revision conflict and validation.');
})().catch((err) => { console.error(err); process.exitCode = 1; });
