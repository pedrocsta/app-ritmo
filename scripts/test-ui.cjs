const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname,'../app/globals.css'),'utf8');
const fixes=css.split('RYVMO 2.1 - dark interaction & contrast audit')[1];
assert.ok(fixes, 'Dark interaction audit section exists');
const tests = [
  [/\.meal-row:hover\s*,\s*\.meal-row:focus-visible\s*\{[^}]*background:\s*var\(--ui-hover\)/, 'meal hover is dark'],
  [/\.meal-row\.completed:hover\s*,\s*\.meal-row\.completed:focus-visible\s*\{[^}]*background:\s*var\(--ui-hover-green\)/, 'completed meal hover is dark'],
  [/\.check-action:hover:not\(\.checked\)\s*\{[^}]*background:\s*#274134/, 'habit action hover is dark'],
  [/\.habit-go:hover\s*\{[^}]*background:\s*#2a4435/, 'habit shortcut hover is dark'],
  [/\.icon-quiet:hover\s*\{[^}]*background:\s*#462e30/, 'delete icon hover is dark'],
  [/\.btn-danger:hover\s*\{[^}]*background:\s*#543235/, 'danger button hover is dark'],
  [/\.view-history:hover\s*\{[^}]*background:\s*#294437/, 'history button hover is dark'],
  [/\.set-chip:hover:not\(\.done\)\s*\{[^}]*background:\s*#274034/, 'set chip hover is dark'],
  [/\.diet-streak\s*\{[^}]*border-top-color:\s*#2e4148/, 'diet divider is dark'],
  [/\@media\s*\(hover:\s*none\)/, 'touchscreen tap styling'],
  [/input:-webkit-autofill/, 'dark browser autofill'],
];
for (const [pattern, label] of tests) assert.match(fixes,pattern,label);
const layout = fs.readFileSync(path.join(__dirname,'../app/layout.tsx'),'utf8');
assert.match(layout,/<body suppressHydrationWarning>/,'ColorZilla body attr warning can be silenced');
console.log('OK - 11 dark states, touch behavior, autofill and body extension hydration warning.');
