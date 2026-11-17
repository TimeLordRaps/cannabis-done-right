const test = require('node:test');
const assert = require('node:assert');
const { analyzeRisk } = require('../js/risk.js');

const strain = (effects = {}, negatives = {}) => ({ effects, negatives });

test('strong paranoid/anxious tags push band to High (real logtags- keys)', () => {
  const r = analyzeRisk(strain({ 'logtags-relaxed': 60, 'logtags-focused': 40 }, { 'logtags-paranoid': 20 }));
  assert.strictEqual(r.label, 'High');
  assert.ok(r.paranoiaLoad >= 18, `paranoiaLoad=${r.paranoiaLoad}`);
});

test('anxious tag alone contributes to paranoiaLoad', () => {
  const r = analyzeRisk(strain({ 'logtags-relaxed': 80 }, { 'logtags-anxious': 12 }));
  assert.strictEqual(r.paranoiaLoad, 12);
  assert.strictEqual(r.label, 'Moderate');
});

test('clean anchored strain is Low', () => {
  const r = analyzeRisk(strain({ 'logtags-relaxed': 80, 'logtags-euphoric': 10 }, { 'logtags-dry-mouth': 5 }));
  assert.strictEqual(r.label, 'Low');
});

test('activation outrunning anchor is High', () => {
  const r = analyzeRisk(strain({ 'logtags-energetic': 50, 'logtags-euphoric': 20, 'logtags-relaxed': 10 }, {}));
  assert.strictEqual(r.label, 'High');
});

test('legacy unprefixed keys still tolerated', () => {
  const r = analyzeRisk(strain({ 'logtags-relaxed': 80 }, { paranoid: 30 }));
  assert.strictEqual(r.paranoiaLoad, 30); // tolerated for back-compat
});

