const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

function boot(selected) {
  const listeners = {};
  const results = { innerHTML: '' };
  const form = {
    hasAttribute: () => false,
    addEventListener: (ev, fn) => { listeners[ev] = fn; },
    querySelectorAll: () => selected.map(value => ({ value }))
  };
  const document = { getElementById: id => (id === 'condition-form' ? form : id === 'results' ? results : null) };
  const window = { __STRAIN_DATA__: JSON.parse(read('data/strains.min.json')) };
  const ctx = vm.createContext({ window, document, console });
  ['js/risk.js', 'js/strains.js', 'js/ranker.js'].forEach(f => vm.runInContext(read(f), ctx, { filename: f }));
  return { window, results };
}

const presets = JSON.parse(read('_data/example_profiles.json'));

test('every example profile references a real finder condition', () => {
  const { window } = boot([]);
  for (const p of presets) {
    for (const c of p.conditions) assert.ok(window.finderProfiles[c], `${p.id}: unknown condition ${c}`);
    assert.ok(p.caution && p.story && p.name, `${p.id}: missing text`);
  }
});

test('example profiles also exist as checkboxes in finder.md', () => {
  const html = read('finder.md');
  for (const p of presets) for (const c of p.conditions) assert.ok(html.includes(`value="${c}"`), `${c} has no checkbox`);
});

test('each preset renders 12 ranked cards with risk bands', () => {
  for (const p of presets) {
    const { results } = boot(p.conditions);
    const cards = (results.innerHTML.match(/class="strain-card /g) || []).length;
    assert.strictEqual(cards, 12, `${p.id}: ${cards} cards`);
    assert.match(results.innerHTML, /(Low|Moderate|High) risk/);
  }
});

test('min data matches source dataset size and has required fields', () => {
  const src = JSON.parse(read('_data/strains_all.json'));
  const min = JSON.parse(read('data/strains.min.json'));
  assert.strictEqual(min.length, src.length);
  assert.ok(min.every(s => s.name && s.effects && s.negatives));
});
