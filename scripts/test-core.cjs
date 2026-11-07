const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(file) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const moduleObj = { exports: {} };
  new Function('exports', 'module', 'require', output)(moduleObj.exports, moduleObj, require);
  return moduleObj.exports;
}

const model = load('lib/model.ts');
const dates = load('lib/dates.ts');
const empty = model.emptyDay();
assert.equal(model.dayScore(empty, 60), 0);
const full = { ...empty, duolingo: true, creatine: true, gym: true, noAlcohol: true,
  studyMinutes: 60, meals: Object.fromEntries(model.MEALS.map((meal) => [meal.id, true])) };
assert.equal(model.dayScore(full, 60), model.MAX_SCORE);
assert.equal(model.normalizeExerciseName('SUPINO RETO'), model.normalizeExerciseName('Supino R\u00e9to!'));
assert.equal(dates.shiftDate('2026-12-31', 1), '2027-01-01');
assert.equal(dates.weekdayOf('2026-11-07'), 5);

const data = model.emptyData();
const id = 'same-exercise-id';
data.exercises[id] = { id, name: 'Supino Reto', weight: 60 };
data.plans[0].push({ id: 'monday', exerciseId: id, sets: 3, reps: 10 });
data.plans[3].push({ id: 'thursday', exerciseId: id, sets: 4, reps: 8 });
const restored = model.sanitizeImportedData(JSON.parse(JSON.stringify(data)));
restored.exercises[id].weight = 70;
assert.equal(restored.exercises[restored.plans[0][0].exerciseId].weight, 70);
assert.equal(restored.exercises[restored.plans[3][0].exerciseId].weight, 70);
assert.equal(restored.plans[0][0].sets, 3);
assert.equal(restored.plans[3][0].sets, 4);
assert.throws(() => model.sanitizeImportedData({ version: 1 }), /backup/i);
console.log('OK - score, 11 metas, datas, nome canonico, sincronizacao de cargas e backups.');
