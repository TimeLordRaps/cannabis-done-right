---
layout: default
title: Strain Finder
nav: finder
---

<section class="finder-hero panel reveal" data-reveal>
  <p class="eyebrow">Decision support / threshold ranking</p>
  <h1>Strain Finder</h1>
  <p class="finder-hero__lede">Select the conditions you want relief for. The ranking weighs fit first, then subtracts visible risk so the result stays conservative.</p>
  <p class="subtle">This is a filtering tool, not a directive. The more conditions you stack, the narrower and stricter the answer becomes.</p>

  <div class="finder-legend" aria-label="Risk legend">
    <span class="tag tag--low">Low risk</span>
    <span class="tag tag--mod">Moderate risk</span>
    <span class="tag tag--high">High risk</span>
  </div>
</section>

<section class="finder-shell panel reveal" data-reveal>
  <div class="section-head">
    <p class="eyebrow">Choose conditions</p>
    <h2>Pick the drivers that actually matter</h2>
    <p>Group the conditions by what you are trying to stabilize. The ranking uses the bundled strain dataset and a conservative fit model.</p>
  </div>

  <form id="condition-form" class="finder-form">
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

<script>window.__STRAIN_DATA__ = {{ site.data.strains_bipolar | jsonify }};</script>
<script src="{{ '/js/strains.js' | relative_url }}"></script>
<script src="{{ '/js/ranker.js' | relative_url }}"></script>

