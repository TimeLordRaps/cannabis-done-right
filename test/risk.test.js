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
  const r = analyzeRisk(strain({ 'logtags-energetic': 90, 'logtags-euphoric': 60, 'logtags-relaxed': 10 }, {}));
  assert.strictEqual(r.label, 'High');
});

test('legacy unprefixed keys still tolerated', () => {
  const r = analyzeRisk(strain({ 'logtags-relaxed': 80 }, { paranoid: 30 }));
  assert.strictEqual(r.paranoiaLoad, 30); // tolerated for back-compat
});


test('reasons name the trigger that actually fired (gap-only High does not blame paranoia)', () => {
  const r = analyzeRisk(strain({ 'logtags-energetic': 90, 'logtags-euphoric': 60, 'logtags-relaxed': 10 }, {}));
  assert.strictEqual(r.label, 'High');
  assert.ok(r.reasons.some(x => /Activation outruns/.test(x)));
  assert.ok(!r.reasons.some(x => /Paranoia/.test(x)));
});

test('low rating_count adds a noisy-band note without changing the band', () => {
  const base = { effects: { 'logtags-relaxed': 80 }, negatives: {} };
  const few = analyzeRisk({ ...base, rating_count: 3 });
  const many = analyzeRisk({ ...base, rating_count: 300 });
  assert.strictEqual(few.label, many.label);
  assert.ok(few.lowEvidence && few.reasons.some(x => /only 3 ratings/.test(x)));
  assert.ok(!many.lowEvidence);
});

test('THRESHOLDS stay anchored to dataset percentiles (re-run scripts/calibrate_risk.js on drift)', () => {
  const { out } = require('../scripts/calibrate_risk.js');
  const near = (actual, want, tol) => assert.ok(Math.abs(actual - want) <= tol, `percentile ${actual} not within ${tol} of ${want}`);
  near(out.high.gap.percentile, 90, 3);
  near(out.high.negative.percentile, 90, 3);
  near(out.moderate.gap.percentile, 75, 3);
  near(out.moderate.negative.percentile, 62, 5);
});
