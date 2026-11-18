const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const logic = require('../js/region.js');

const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const J = JSON.parse(read('_data/jurisdictions.json'));

test('jurisdiction data: unique codes; allowed entries carry age, source and verification level', () => {
  assert.strictEqual(new Set(J.map(j => j.code)).size, J.length);
  for (const j of J) {
    assert.ok(['allowed', 'blocked'].includes(j.status), j.code);
    if (j.status === 'allowed') {
      if (j.group === 'Canada' || (j.group === 'United States' && j.use === 'adult-use')) assert.ok(Number.isInteger(j.minAge) && j.minAge >= 18 && j.minAge <= 21, `${j.code} minAge`);
      else assert.ok(j.minAge == null || (Number.isInteger(j.minAge) && j.minAge >= 18), `${j.code} minAge`);
      assert.ok(/^https:\/\//.test(j.source), `${j.code} source`);
      assert.ok(j.verified && j.verified.length > 10, `${j.code} verified`);
    }
  }
  const by = Object.fromEntries(J.map(j => [j.code, j]));
  assert.strictEqual(J.filter(j => j.group === 'Canada').length, 13);
  assert.strictEqual(by['CA-AB'].minAge, 18);
  assert.strictEqual(by['CA-QC'].minAge, 21);
  assert.strictEqual(by['CA-ON'].minAge, 19);
});

test('fails closed: unknown, unselected, other and blocked regions never allow', () => {
  assert.strictEqual(logic.decide(J, null, 'yes').allowed, false);
  assert.strictEqual(logic.decide(J, 'nowhere', 'yes').allowed, false);
  assert.strictEqual(logic.decide(J, 'other', 'yes').allowed, false);
  const blocked = [...J, { code: 'XX-1', group: 'X', name: 'Blocked place', status: 'blocked' }];
  assert.strictEqual(logic.decide(blocked, 'XX-1', 'yes').reason, 'region-blocked');
});

test('age answer: only "yes" opens; unsure/no/missing do not', () => {
  assert.strictEqual(logic.decide(J, 'CA-ON').reason, 'age-pending');
  assert.strictEqual(logic.decide(J, 'CA-ON', 'no').allowed, false);
  assert.strictEqual(logic.decide(J, 'CA-ON', 'unsure').allowed, false);
  assert.strictEqual(logic.decide(J, 'CA-ON', 'yes').allowed, true);
});

test('age question names the region minimum and includes medical authorization', () => {
  const q = logic.ageQuestion(J.find(j => j.code === 'CA-QC'));
  assert.match(q, /21 or older/);
  assert.match(q, /Quebec/);
  assert.match(q, /medical authorization or support/);
  assert.match(logic.ageQuestion(null), /legal age of majority/);
});

function runGate(script, preset) {
  const handlers = {};
  const els = {};
  const gate = {
    hidden: false, innerHTML: '',
    addEventListener: (ev, fn) => { handlers[ev] = fn; },
    querySelector: sel => {
      if (sel === 'h1') return null;
      if (sel === '#region-select') return els.select || (els.select = { value: '' });
      return els.btn || (els.btn = { disabled: true });
    }
  };
  const store = {};
  if (preset) store['cdr-region-v1'] = JSON.stringify(preset);
  const html = { dataset: { regionGate: 'pending' } };
  let released = null;
  const window = { __JURISDICTIONS__: J, __releaseRegionGate: j => { released = j; } };
  const ctx = vm.createContext({
    window, JSON,
    document: { getElementById: id => (id === 'region-gate' ? gate : null), documentElement: html },
    sessionStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } }
  });
  ['js/region.js', 'js/gate.js'].forEach(f => vm.runInContext(read(f), ctx, { filename: f }));
  const click = (act, data = {}) => handlers.click({ target: { closest: () => ({ dataset: { act, ...data } }) } });
  script({ click, gate, html, els, window, store, released: () => released });
  return { gate, html, released: () => released, window };
}

test('gate UI: starts closed and asks for region first', () => {
  const r = runGate(() => {});
  assert.strictEqual(r.html.dataset.regionGate, 'pending');
  assert.match(r.gate.innerHTML, /Where are you right now/);
  assert.match(r.gate.innerHTML, /not sent anywhere or looked up from your IP/);
  assert.doesNotMatch(r.gate.innerHTML, /Strain|strain/);
});

test('gate UI: Canadian region then "yes" opens the site and releases the promise', () => {
  const r = runGate(({ click, els }) => {
    els.select = { value: 'CA-QC' };
    click('region');
    click('age', { val: 'yes' });
  });
  assert.strictEqual(r.html.dataset.regionGate, 'open');
  assert.strictEqual(r.gate.hidden, true);
  assert.strictEqual(r.released().code, 'CA-QC');
  assert.strictEqual(r.window.regionJurisdiction.minAge, 21);
});

test('gate UI: "Somewhere else" stays blocked with no way past it', () => {
  const r = runGate(({ click, els }) => { els.select = { value: 'other' }; click('region'); click('age', { val: 'yes' }); });
  assert.strictEqual(r.html.dataset.regionGate, 'blocked');
  assert.match(r.gate.innerHTML, /isn't available in your region/);
  assert.strictEqual(r.released(), null);
});

test('gate UI: age "no" and "not sure" block and never release', () => {
  for (const val of ['no', 'unsure']) {
    const r = runGate(({ click, els }) => { els.select = { value: 'CA-ON' }; click('region'); click('age', { val }); });
    assert.strictEqual(r.html.dataset.regionGate, 'blocked', val);
    assert.strictEqual(r.released(), null, val);
  }
});

test('gate UI: tampered session value for an unknown region cannot open the gate', () => {
  const r = runGate(() => {}, { region: 'CA-ZZ', age: 'yes' });
  assert.notStrictEqual(r.html.dataset.regionGate, 'open');
  assert.strictEqual(r.released(), null);
});

test('layout wiring is fail-closed and data loaders wait for the gate', () => {
  const layout = read('_layouts/default.html');
  assert.match(layout, /data-region-gate="pending"/);
  assert.match(layout, /<noscript>/);
  assert.match(layout, /window\.regionGate = new Promise/);
  assert.match(read('css/style.css'), /data-region-gate="pending"\] \.site-frame/);
  assert.match(read('finder.md'), /window\.regionGate/);
  assert.match(read('quiz.md'), /window\.regionGate/);
});

test('world list invariants: complete US, sane groups, provenance on every allowed entry', () => {
  const us = J.filter(j => j.group === 'United States');
  assert.strictEqual(us.length, 51, '50 states + DC');
  assert.ok(us.some(j => j.name === 'District of Columbia'));
  const adult = us.filter(j => j.use === 'adult-use');
  assert.ok(adult.length >= 20);
  assert.ok(adult.every(j => j.status === 'allowed' && j.minAge === 21), 'US adult-use is 21');
  assert.ok(us.filter(j => j.status === 'blocked').every(j => j.use === 'none' && j.minAge == null));
  const others = J.filter(j => j.group === 'Other countries');
  assert.ok(others.length > 30);
  assert.ok(others.every(j => j.status === 'allowed' && ['adult-use', 'medical'].includes(j.use)));
  assert.ok(!others.some(j => ['Canada', 'United States'].includes(j.name)), 'handled by subnational entries');
  assert.ok(J.filter(j => j.status === 'allowed').every(j => j.use || j.group === 'Canada'));
  assert.ok(J.every(j => j.verified && /secondary|official/.test(j.verified)), 'every entry states how it was verified');
});

test('a blocked US state from the data is blocked and never opens, even with yes', () => {
  const blocked = J.find(j => j.group === 'United States' && j.status === 'blocked');
  assert.ok(blocked);
  assert.strictEqual(logic.decide(J, blocked.code, 'yes').reason, 'region-blocked');
});

test('medical-only places get the generic age + medical-authorization question', () => {
  const med = J.find(j => j.use === 'medical');
  assert.ok(med);
  assert.match(logic.ageQuestion(med), /legal age of majority/);
  assert.match(logic.ageQuestion(med), /medical authorization or support/);
  const adult = J.find(j => j.group === 'United States' && j.use === 'adult-use');
  assert.match(logic.ageQuestion(adult), /21 or older/);
});