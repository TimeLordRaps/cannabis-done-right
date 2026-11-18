const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const quiz = require('../js/quizlogic.js');
const fit = require('../js/fit.js');

const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

function load() {
  const window = { __STRAIN_DATA__: JSON.parse(read('data/strains.min.json')) };
  const ctx = vm.createContext({ window });
  ['js/risk.js', 'js/fit.js', 'js/strains.js'].forEach(f => vm.runInContext(read(f), ctx, { filename: f }));
  return window;
}
const W = load();

const allSafe = (over = {}) => ({
  age: 'yes', pregnancy: 'no', 'personal-mania': 'no', 'family-psychosis': 'no',
  medication: 'no', control: 'no', frequency: 'no', driving: 'no', ...over
});

test('every quiz reason maps only to real finder conditions', () => {
  for (const r of quiz.REASONS) for (const c of r.conditions) assert.ok(W.finderProfiles[c], `${r.id}: ${c}`);
});

test('fails closed: unanswered safety questions never produce a match tier', () => {
  const a = quiz.assess({ reason: 'anxious', safety: {} });
  assert.strictEqual(a.tier, 'pause');
  assert.deepStrictEqual(quiz.pickMatches(a, W.strains, W.finderProfiles, fit.rankStrains), []);
});

test('age: under legal age or unsure is a hard stop; yes is fine', () => {
  assert.strictEqual(quiz.assess({ reason: 'anxious', safety: allSafe({ age: 'no' }) }).tier, 'pause');
  assert.strictEqual(quiz.assess({ reason: 'anxious', safety: allSafe({ age: 'unsure' }) }).tier, 'pause');
  assert.strictEqual(quiz.assess({ reason: 'anxious', safety: allSafe() }).tier, 'standard');
});

test('pregnancy and personal bipolar/psychosis history yield no strain', () => {
  for (const id of ['pregnancy', 'personal-mania']) {
    const a = quiz.assess({ reason: 'low', safety: allSafe({ [id]: 'yes' }) });
    assert.strictEqual(a.tier, 'pause', id);
    assert.deepStrictEqual(quiz.pickMatches(a, W.strains, W.finderProfiles, fit.rankStrains), []);
  }
  assert.strictEqual(quiz.assess({ reason: 'low', safety: allSafe({ 'personal-mania': 'unsure' }) }).tier, 'elevated');
});

test('driving defers instead of matching', () => {
  const a = quiz.assess({ reason: 'anxious', safety: allSafe({ driving: 'yes' }) });
  assert.strictEqual(a.tier, 'later');
  assert.deepStrictEqual(quiz.pickMatches(a, W.strains, W.finderProfiles, fit.rankStrains), []);
});

test('hard stop outranks defer and elevated', () => {
  const a = quiz.assess({ reason: 'anxious', safety: allSafe({ pregnancy: 'yes', driving: 'yes', control: 'yes' }) });
  assert.strictEqual(a.tier, 'pause');
});

test('matches are only Low band with >= 40 ratings; elevated also needs low paranoia', () => {
  for (const reason of quiz.REASONS) {
    for (const over of [{}, { control: 'yes' }]) {
      const a = quiz.assess({ reason: reason.id, safety: allSafe(over) });
      const ms = quiz.pickMatches(a, W.strains, W.finderProfiles, fit.rankStrains);
      assert.ok(ms.length > 0, `${reason.id}/${a.tier}: no matches`);
      for (const m of ms) {
        assert.strictEqual(m.riskBand.label, 'Low');
        assert.ok(m.strain.rating_count >= 40);
        if (a.tier === 'elevated') assert.ok(m.riskBand.paranoiaLoad < 5);
      }
    }
  }
});

test('quiz check answers are internally consistent', () => {
  for (const c of quiz.CHECKS) {
    assert.ok(c.answer >= 0 && c.answer < c.options.length, c.id);
    assert.ok(c.learn.length > 40 && c.source.label && c.source.href);
  }
});

// ---- UI walk-through with a minimal fake DOM ----
function runUi(script) {
  const handlers = {};
  const root = {
    dataset: { base: '/cannabis-done-right' },
    innerHTML: '',
    addEventListener: (ev, fn) => { handlers[ev] = fn; },
    querySelector: () => null
  };
  const window = Object.assign({}, W);
  const ctx = vm.createContext({ window, document: { getElementById: id => (id === 'quiz-root' ? root : null) } });
  ['js/risk.js', 'js/fit.js', 'js/strains.js', 'js/quizlogic.js', 'js/quiz.js'].forEach(f => vm.runInContext(read(f), ctx, { filename: f }));
  const click = (act, data = {}) => handlers.click({ target: { closest: () => ({ dataset: { act, ...data }, disabled: false }) } });
  script(click, root);
  return root.innerHTML;
}

function walk(click, safetyOver = {}, wrongCheck = false) {
  click('start');
  click('reason', { id: 'anxious' });
  const s = allSafe(safetyOver);
  for (const item of quiz.SAFETY) click('safety', { id: item.id, val: s[item.id] });
  for (const c of quiz.CHECKS) {
    click('check', { id: c.id, val: String(wrongCheck ? (c.answer + 1) % c.options.length : c.answer) });
    click('next');
  }
}

test('UI: clean walk-through ends in an unlocked match with sources', () => {
  const html = runUi(click => walk(click));
  assert.match(html, /Your match is unlocked/);
  assert.strictEqual((html.match(/quiz-match/g) || []).length, 3);
  assert.match(html, /Low risk/);
});

test('UI: wrong check answers are not punished and still reach the result', () => {
  const html = runUi(click => walk(click, {}, true));
  assert.match(html, /Your match is unlocked/);
});

test('UI: a feedback panel with a source link follows each check answer', () => {
  const html = runUi(click => {
    click('start'); click('reason', { id: 'low' });
    const s = allSafe();
    for (const item of quiz.SAFETY) click('safety', { id: item.id, val: s[item.id] });
    click('check', { id: quiz.CHECKS[0].id, val: '0' });
  });
  assert.match(html, /Not quite\./);
  assert.match(html, /pubmed\.ncbi\.nlm\.nih\.gov\/26502112/);
});

test('UI: pregnancy yields the conversation result with helplines and no strain cards', () => {
  const html = runUi(click => walk(click, { pregnancy: 'yes' }));
  assert.match(html, /conversation, not a strain/);
  assert.match(html, /1-800-662-4357/);
  assert.doesNotMatch(html, /quiz-match/);
});

test('UI: user-controlled and dataset strings are escaped', () => {
  const html = runUi(click => walk(click));
  assert.doesNotMatch(html, /<script/i);
});

test('site wiring: nav, CTA, quiz page and finder anchor exist', () => {
  assert.match(read('_includes/nav.html'), /\/quiz/);
  assert.match(read('index.md'), /\/quiz/);
  assert.match(read('quiz.md'), /quiz\.js/);
  assert.match(read('finder.md'), /id="risk-rubric"/);
});
