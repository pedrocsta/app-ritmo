const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file){const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8');const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;const m={exports:{}};new Function('exports','module','require',js)(m.exports,m,require);return m.exports;}
const {emptyData,sanitizeImportedData}=load('lib/model.ts');
const root=path.join(__dirname,'..');
const c=JSON.parse(fs.readFileSync(path.join(root,'supabase/hipertrofia-estetica.catalog.json'),'utf8'));
const sql=fs.readFileSync(path.join(root,'supabase/importar-treino-pedro.sql'),'utf8');
assert.equal(c.ownerEmail,'pedrohdcosta@outlook.com');
assert.equal(c.exercises.length,28);
assert.deepEqual([0,1,2,3,4,5,6].map(day=>c.plans[day].length),[1,7,0,1,9,8,8]);
assert.equal(c.trainingDays[2].kind,'rest');
assert.equal(c.trainingDays[0].title,'Corrida');
assert.equal(c.trainingDays[3].title,'Corrida');
const ids=c.exercises.map(item=>item.id);
assert.equal(new Set(ids).size,28);
const planIds=[];for(const items of Object.values(c.plans)){for(const item of items){assert(ids.includes(item.exerciseId),'Every plan exercise must be in library');assert(item.id.length<100);planIds.push(item.id);}}
assert.equal(new Set(planIds).size,34);
assert.equal(c.plans[0][0].durationMinutes,40);assert.equal(c.plans[3][0].warmupMinutes,5);assert.equal(c.plans[3][0].mainMinutes,30);assert.equal(c.plans[3][0].cooldownMinutes,5);
for(const ex of c.exercises){const asset=path.join(root,'public/exercises',ex.imageKey+'.svg');assert(fs.existsSync(asset),`Missing art ${ex.imageKey}`);const svg=fs.readFileSync(asset,'utf8');assert(svg.includes('<svg')&&svg.includes('</svg>'));assert(svg.includes(ex.imageKey==='corrida'?'Corrida':'EXERCÍCIO'));}
assert.equal(fs.readdirSync(path.join(root,'public/exercises')).filter(f=>f.endsWith('.svg')).length,28);
assert(!c.exercises.some(ex=>/alongamento|mobilidade|gato-camelo|rock back|figura 4/i.test(ex.name)));
// Duplicate movements share one exercise ID in different days, even with different reference loads.
function get(day,key){return c.plans[day].find(p=>p.exerciseId===`ryvmo-ex-${key}`);}
assert.equal(get(1,'cadeira-flexora').exerciseId,get(5,'cadeira-flexora').exerciseId);
assert.equal(get(1,'cadeira-flexora').referenceWeight,60);assert.equal(get(5,'cadeira-flexora').referenceWeight,55);
assert.equal(get(4,'puxada-neutra').referenceWeight,60);assert.equal(get(6,'puxada-neutra').referenceWeight,65);
assert.equal(get(1,'abdominal-polia').referenceWeight,50);assert.equal(get(5,'abdominal-polia').referenceWeight,45);
const data=emptyData();
for(const ex of c.exercises)data.exercises[ex.id]=ex;
for(const day of [0,1,2,3,4,5,6])data.plans[day]=c.plans[day];
data.trainingDays=c.trainingDays;
data.workoutChecks={'2026-11-03':{[c.plans[1][0].id]:[true,false,true]}};
data.workoutDetails={'2026-11-03':{[c.plans[1][0].id]:[{reps:8,weight:100},{reps:7,weight:100},{reps:6,weight:102.5}]}};
data.sessions=[{id:'legacy',date:'2026-11-03',planDay:1,createdAt:'2026-11-03T09:00:00.000Z',exercises:[{exerciseId:c.plans[1][0].exerciseId,name:'Agachamento Livre com Barra',weight:100,plannedSets:3,performedSets:2,reps:8,setsDone:[{setNumber:1,reps:8,weight:100},{setNumber:3,reps:6,weight:102.5}]}]}];
const roundtrip=sanitizeImportedData(data);
assert.equal(roundtrip.trainingDays[2].kind,'rest');
assert.equal(roundtrip.plans[1][0].restSeconds,180);
assert.equal(roundtrip.plans[3][0].durationMinutes,40);
assert.equal(roundtrip.exercises[c.plans[1][0].exerciseId].imageKey,'agachamento-livre');
assert.equal(roundtrip.sessions[0].exercises[0].setsDone[1].weight,102.5);
assert.equal(roundtrip.workoutDetails['2026-11-03'][c.plans[1][0].id][2].reps,6);
assert.match(sql,/lower\(email\) = 'pedrohdcosta@outlook\.com'/);
assert.match(sql,/for update/);
assert.match(sql,/ryvmo_import_backups/);
assert.match(sql,/where item\.value->>'id' = v_plan_item->>'id'/);
assert.match(sql,/revision = revision \+ 1/);
console.log('OK - 28 illustrations, 34 plan items, complete week, SQL owner check/backup, roundtrip set details.');
