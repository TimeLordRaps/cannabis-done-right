(() => {
  const logic = window.regionGateLogic;
  const gate = document.getElementById('region-gate');
  const html = document.documentElement;
  if (!logic || !gate) return;
  const jurisdictions = Array.isArray(window.__JURISDICTIONS__) ? window.__JURISDICTIONS__ : [];
  const KEY = 'cdr-region-v1';
  const esc = v => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

  let state = { region: null, age: null };
  try { const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (saved && typeof saved === 'object') state = { region: saved.region || null, age: saved.age || null }; } catch (_e) { /* storage unavailable */ }
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (_e) { /* ignore */ } };


  const groups = () => {
    const by = {};
    [...jurisdictions, logic.OTHER].forEach(j => { (by[j.group] = by[j.group] || []).push(j); });
    return by;
  };

  const show = (name, body) => {
    html.dataset.regionGate = name;
    gate.innerHTML = body;
    const t = gate.querySelector('h1');
    if (t) { t.setAttribute('tabindex', '-1'); t.focus(); }
  };

  const render = () => {
    const d = logic.decide(jurisdictions, state.region, state.age);
    if (d.allowed) {
      html.dataset.regionGate = 'open';
      gate.innerHTML = '';
      gate.hidden = true;
      window.regionJurisdiction = d.jurisdiction;
      if (window.__releaseRegionGate) window.__releaseRegionGate(d.jurisdiction);
      return;
    }
    gate.hidden = false;
    if (d.reason === 'region-blocked') {
      show('blocked', `<section class="panel region-card"><h1>This content isn't available in your region.</h1>
        <p>Laws about showing cannabis information vary by place, and this site isn't offered where that is uncertain. Nothing here is a judgment about you.</p>
        <button type="button" class="button button--ghost" data-act="reset">Choose a different region</button></section>`);
      return;
    }
    if (d.reason === 'age-not-confirmed') {
      show('blocked', `<section class="panel region-card"><h1>This content is for adults, or people with medical support.</h1>
        <p>Come back when you are of legal age in your region, or if a clinician has authorized or supports your use.</p>
        <p>If you are worried about your own or someone else's use, SAMHSA's free helpline (US) is 1-800-662-4357, and 988 is the US crisis line.</p>
        <button type="button" class="button button--ghost" data-act="reset">Start over</button></section>`);
      return;
    }
    if (d.reason === 'age-pending') {
      show('age', `<section class="panel region-card"><p class="eyebrow">Step 2 of 2 · ${esc(d.jurisdiction.name)}</p>
        <h1>${esc(logic.ageQuestion(d.jurisdiction))}</h1>
        <div class="quiz-options quiz-options--row">
          <button type="button" class="quiz-option" data-act="age" data-val="yes">Yes</button>
          <button type="button" class="quiz-option" data-act="age" data-val="no">No</button>
          <button type="button" class="quiz-option" data-act="age" data-val="unsure">Not sure</button></div>
        <button type="button" class="button button--ghost" data-act="reset">Change region</button></section>`);
      return;
    }
    const opts = Object.entries(groups()).map(([g, items]) => `<optgroup label="${esc(g)}">${items.map(j => `<option value="${esc(j.code)}">${esc(j.name)}</option>`).join('')}</optgroup>`).join('');
    show('pending', `<section class="panel region-card"><p class="eyebrow">Step 1 of 2</p><h1>Where are you right now?</h1>
      <p class="subtle">The law on cannabis information depends on where you are. This stays in your browser tab; it is not sent anywhere or looked up from your IP address.</p>
      <label class="region-label" for="region-select">Region</label>
      <select id="region-select" class="region-select"><option value="">Choose…</option>${opts}</select>
      <button type="button" class="button button--primary" data-act="region" disabled>Continue</button></section>`);
  };

  gate.addEventListener('change', e => {
    if (e.target.id === 'region-select') { const b = gate.querySelector('[data-act="region"]'); if (b) b.disabled = !e.target.value; }
  });
  gate.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    if (el.dataset.act === 'region') { const v = gate.querySelector('#region-select').value; if (!v) return; state = { region: v, age: null }; save(); render(); }
    else if (el.dataset.act === 'age') { state.age = el.dataset.val; save(); render(); }
    else if (el.dataset.act === 'reset') { state = { region: null, age: null }; save(); render(); }
  });

  window.regionGateState = () => ({ ...state });
  render();
})();
