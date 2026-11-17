const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const tags = require('../js/tags.js');

const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

test('tag aliases resolve to real logtags-* data keys', () => {
  const s = {
    negatives: { 'logtags-paranoid': 22, 'logtags-dry-mouth': 30, 'logtags-dry-eyes': 10, 'logtags-dizzy': 5 },
    symptoms: { 'logtags-insomnia': 40, 'logtags-muscle-spasms': 15 },
    conditions: { 'logtags-anxiety': 25 },
    effects: { 'logtags-sleepy': 60 }
  };
  assert.strictEqual(tags.negativeValue(s, 'paranoia'), 22);
  assert.strictEqual(tags.negativeValue(s, 'paranoid'), 22);
  assert.strictEqual(tags.negativeValue(s, 'dry'), 30);
  assert.strictEqual(tags.negativeValue(s, 'sedated'), 60);
  assert.strictEqual(tags.negativeValue(s, 'jittery'), 0); // no data counterpart, not a crash
  assert.strictEqual(tags.symptomValue(s, 'insomnia'), 40);
  assert.strictEqual(tags.symptomValue(s, 'spasm'), 15);
  assert.strictEqual(tags.conditionValue(s, 'anxiety'), 25);
  assert.strictEqual(tags.symptomValue(s, 'brain_fog'), 0);
});

test('every finder profile weight key exists in the dataset (no dead keys)', () => {
  const data = JSON.parse(read('data/strains.min.json'));
  const keys = { effects: new Set(), symptoms: new Set(), conditions: new Set() };
  data.forEach(s => Object.keys(keys).forEach(k => Object.keys(s[k] || {}).forEach(t => keys[k].add(t))));
  const window = { __STRAIN_DATA__: data };
  vm.runInContext(read('js/strains.js'), vm.createContext({ window }));
  const map = { fitEffects: 'effects', avoidEffects: 'effects', fitSymptoms: 'symptoms', avoidSymptoms: 'symptoms' };
  const dead = [];
  for (const [id, p] of Object.entries(window.finderProfiles)) {
    for (const [field, src] of Object.entries(map)) for (const t of Object.keys(p[field] || {})) if (!keys[src].has(t)) dead.push(`${id}.${field}.${t}`);
    for (const t of p.conditionTags || []) if (!keys.conditions.has(t)) dead.push(`${id}.conditionTags.${t}`);
  }
  assert.deepStrictEqual(dead, []);
});

function runBreeder(goal, volatility = 'low', context = 'mixed', evidence = 'strong') {
  const els = {
    'breeder-form': { addEventListener() {} },
    'breeder-output': { innerHTML: '' },
    'breeder-goal': { value: goal },
    'breeder-volatility': { value: volatility },
    'breeder-context': { value: context },
    'breeder-evidence': { value: evidence }
  };
  const window = { __BREEDER_STRAIN_DATA__: JSON.parse(read('_data/breeder_strains.json')) };
  const ctx = vm.createContext({ window, document: { getElementById: id => els[id] || null }, console });
  ['js/tags.js', 'js/breeder.js'].forEach(f => vm.runInContext(read(f), ctx, { filename: f }));
  return els['breeder-output'].innerHTML;
}

test('breeder renders for every goal and surfaces caution signals from real negatives', () => {
  const goals = [...read('breeder.md').matchAll(/<option value="([\w-]+)"/g)].map(m => m[1]);
  assert.ok(goals.length >= 3);
  let sawCaution = false;
  for (const g of goals) {
    const html = runBreeder(g);
    assert.match(html, /strain-card/, `goal ${g} rendered no cards`);
    if (/(Paranoid|Anxious|Dizzy|Dry)/.test(html)) sawCaution = true;
  }
  assert.ok(sawCaution, 'no caution signal ever surfaced: negative keys likely dead again');
});
