---
layout: default
title: Strain Finder
nav: finder
---

<section class="finder-hero panel reveal" data-reveal>
  <p class="eyebrow">Decision support / threshold ranking</p>
  <h1>Strain Finder</h1>
  <p class="finder-hero__lede">Select the conditions you want relief for. The ranking weighs fit first, then subtracts visible risk so the result stays conservative.</p>
  <p class="subtle">This is a filtering tool, not a directive. The more conditions you stack, the narrower and stricter the answer becomes. Risk labels are driven by negative tags and activation balance, not a generic vibe check.</p>

  <div class="finder-legend" aria-label="Risk legend">
    <span class="tag tag--low">Low risk</span>
    <span class="tag tag--mod">Moderate risk</span>
    <span class="tag tag--high">High risk</span>
  </div>
</section>

{% include autonomy-cue.html eyebrow="Autonomy cue" title="Treat the result as a checkpoint, not a command" text="Risk bands stay visible, reasons stay explicit, and nothing on the page is trying to force a yes. The design is here to help you read more slowly, not to talk you into a faster answer." points="Fewer conditions usually means a cleaner, less biased read.|If you are altered or anxious, rerun later instead of deciding now.|A high-risk label is an invitation to slow down." %}

<section class="panel panel--soft reveal" data-reveal>
  <div class="section-head">
    <p class="eyebrow">Risk rubric</p>
    <h2>What moves a strain into each band</h2>
    <p>The band is conservative by design. A strain is only called low, moderate, or high after the negative tags and the activation/anchor balance are checked together.</p>
  </div>

  <div class="grid grid--risks">
    <article class="risk-card">
      <span class="risk-card__label">Low risk</span>
      <h3>Few caution tags, stable anchor</h3>
      <p>Low risk means no major paranoia or anxiety signal, a modest negative load, and a relaxed/focused profile that stays anchored instead of spiking.</p>
      <ul class="risk-card__list">
        <li>Negative load stays below the moderate threshold.</li>
        <li>Relaxation and focus hold the activation in place.</li>
      </ul>
    </article>

    <article class="risk-card">
      <span class="risk-card__label">Moderate risk</span>
      <h3>Visible caution, but not a hard stop</h3>
      <p>Moderate risk usually means a few negative tags, some dryness or nervousness, or a profile that looks a little more activated than it is anchored.</p>
      <ul class="risk-card__list">
        <li>One or two caution signals need attention.</li>
        <li>The profile may still fit, but it deserves a measured read.</li>
      </ul>
    </article>

    <article class="risk-card">
      <span class="risk-card__label">High risk</span>
      <h3>Paranoia, anxiety, or unanchored activation</h3>
      <p>High risk is reserved for strains with strong paranoia/anxiety signals, stacked negatives, or activation that outruns the relaxation/focus anchor.</p>
      <ul class="risk-card__list">
        <li>Paranoia/anxiety crosses the caution line.</li>
        <li>Negative load or activation gap is meaningfully higher than the low/mod bands.</li>
      </ul>
    </article>
  </div>
</section>

<section class="finder-shell panel reveal" data-reveal>
  <div class="section-head">
    <p class="eyebrow">Choose conditions</p>
    <h2>Pick the drivers that actually matter</h2>
    <p>Group the conditions by what you are trying to stabilize. The ranking uses the bundled strain dataset and a conservative fit model.</p>
  </div>

  <div id="gate-prompt" class="gate-prompt panel panel--warning">
    <p class="warning-band__label">Before you rank</p>
    <h3>Did you actually read the risk rubric above?</h3>
    <p>The form unlocks once you confirm. This is a deliberate pause — not a legal checkbox. If you skipped the risk bands and autonomy cue, scroll back up first.</p>
    <label class="gate-check">
      <input type="checkbox" id="gate-checkbox">
      <span>I read the risk rubric and autonomy cue. I understand this tool filters — it does not prescribe.</span>
    </label>
  </div>

  <div id="example-profiles" class="example-profiles">
    <p class="warning-band__label">Example profiles</p>
    <p class="subtle">Fictional personas that pre-select a condition combination so you can see how the lens changes. They are not you, and not advice. Pick one, then edit the boxes.</p>
    <div class="example-profiles__grid">
      {% for p in site.data.example_profiles %}
      <button type="button" class="example-card" data-preset="{{ p.conditions | join: ',' }}" disabled>
        <span class="example-card__name">{{ p.name }}</span>
        <span class="example-card__story">{{ p.story }}</span>
        <span class="example-card__caution">{{ p.caution }}</span>
      </button>
      {% endfor %}
    </div>
  </div>
  <form id="condition-form" class="finder-form" data-gated>
    <fieldset class="finder-group">
      <legend class="finder-group__title">Mood stability</legend>
      <div class="finder-group__grid">
        <label class="toggle-chip"><input type="checkbox" name="conditions" value="bp1"><span>Bipolar I</span></label>
        <label class="toggle-chip"><input type="checkbox" name="conditions" value="bp2"><span>Bipolar II</span></label>
        <label class="toggle-chip"><input type="checkbox" name="conditions" value="cyclo"><span>Cyclothymia</span></label>
        <label class="toggle-chip"><input type="checkbox" name="conditions" value="sza_bp"><span>Schizoaffective · Bipolar</span></label>
        <label class="toggle-chip"><input type="checkbox" name="conditions" value="sza_dep"><span>Schizoaffective · Depressive</span></label>
      </div>
    </fieldset>

    <fieldset class="finder-group">
      <legend class="finder-group__title">Depressive / seasonal</legend>
      <div class="finder-group__grid">
        <label class="toggle-chip"><input type="checkbox" name="conditions" value="mdd"><span>Major Depressive Disorder</span></label>
        <label class="toggle-chip"><input type="checkbox" name="conditions" value="pdd"><span>Persistent Depressive Disorder</span></label>
        <label class="toggle-chip"><input type="checkbox" name="conditions" value="pmdd"><span>PMDD</span></label>
        <label class="toggle-chip"><input type="checkbox" name="conditions" value="sad_seasonal"><span>Seasonal Affective Disorder</span></label>
      </div>
    </fieldset>

    <fieldset class="finder-group">
      <legend class="finder-group__title">Anxiety / trauma</legend>
      <div class="finder-group__grid">
        <label class="toggle-chip"><input type="checkbox" name="conditions" value="gad"><span>Generalized Anxiety</span></label>
        <label class="toggle-chip"><input type="checkbox" name="conditions" value="social_anx"><span>Social Anxiety</span></label>
        <label class="toggle-chip"><input type="checkbox" name="conditions" value="panic"><span>Panic Disorder</span></label>
        <label class="toggle-chip"><input type="checkbox" name="conditions" value="ptsd"><span>PTSD</span></label>
      </div>
    </fieldset>

    <fieldset class="finder-group">
      <legend class="finder-group__title">Compulsion proxies</legend>
      <div class="finder-group__grid">
        <label class="toggle-chip"><input type="checkbox" name="conditions" value="gaming_add"><span>Gaming Addiction Proxy</span></label>
        <label class="toggle-chip"><input type="checkbox" name="conditions" value="porn_add"><span>Porn Addiction Proxy</span></label>
      </div>
    </fieldset>

    <div class="finder-actions">
      <p class="finder-note">More boxes mean a stricter filter. If you are trying to regain sleep, focus, or calm, the output should stay visibly cautious.</p>
      <button type="submit" class="button button--primary">Run threshold ranking</button>
    </div>
  </form>
</section>

<section class="section reveal" data-reveal>
  <div class="section-head">
    <p class="eyebrow">Ranked output</p>
    <h2>Conservative matches</h2>
    <p>Results are sorted by fit and filtered through the selected risk lens. Higher scores mean closer alignment, not moral permission.</p>
  </div>

  <div id="results" class="results-wrap" aria-live="polite">
    <p class="finder-empty">Select one or more conditions and run the ranking.</p>
  </div>
</section>

<script>
(() => {
  const load = src => new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = () => fail(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
  fetch("{{ '/data/strains.min.json' | relative_url }}")
    .then(r => { if (!r.ok) throw new Error('strain data HTTP ' + r.status); return r.json(); })
    .then(data => { window.__STRAIN_DATA__ = data; })
    .then(() => load("{{ '/js/risk.js' | relative_url }}"))
    .then(() => load("{{ '/js/strains.js' | relative_url }}"))
    .then(() => load("{{ '/js/ranker.js' | relative_url }}"))
    .catch(err => {
      const el = document.getElementById('results');
      if (el) el.innerHTML = '<p class="finder-empty">Could not load the strain dataset (' + String(err.message).replace(/</g, '&lt;') + '). Reload to try again.</p>';
    });
})();
</script>
<script>
(() => {
  const gate = document.getElementById('gate-checkbox');
  const form = document.getElementById('condition-form');
  const prompt = document.getElementById('gate-prompt');
  if (!gate || !form) return;
  const presetButtons = Array.from(document.querySelectorAll('[data-preset]'));
  const applyPreset = btn => {
    const wanted = btn.dataset.preset.split(',').filter(Boolean);
    form.querySelectorAll('input[name="conditions"]').forEach(i => { i.checked = wanted.includes(i.value); });
    presetButtons.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    form.dispatchEvent(new Event('change', { bubbles: true }));
  };
  presetButtons.forEach(btn => btn.addEventListener('click', () => applyPreset(btn)));
  gate.addEventListener('change', () => {
    presetButtons.forEach(b => { b.disabled = !gate.checked; });
    if (gate.checked) {
      form.removeAttribute('data-gated');
      prompt.hidden = true;
    } else {
      form.setAttribute('data-gated', '');
      prompt.hidden = false;
    }
  });
})();
</script>

