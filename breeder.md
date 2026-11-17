---
layout: default
title: Strain Breeder
nav: breeder
---

<section class="breeder-hero panel reveal" data-reveal>
  <p class="eyebrow">Named genetics / starter stock</p>
  <h1>Strain Breeder</h1>
  <p class="breeder-hero__lede">A genetics-first recommendation tool that names real strains, shows their parent stock, and prefers data-rich profiles over hype.</p>
  <p class="subtle">Use it to compare fit, evidence strength, and risk together. If you found the page while high, treat it like a brake pedal: slow down, breathe, and read the lineage before making any call.</p>
</section>

{% include autonomy-cue.html eyebrow="Pause first" title="If you’re reading this while high, step back before deciding" text="The page is intentionally low-noise: strong contrast, plain language, and real parent lines. That keeps the signal readable when your head is not at baseline, and it keeps your choice intact." points="Put the phone down for ten minutes.|Drink water before you compare anything.|Come back only to read the strain names and parent stock, not to chase a mood." %}

<section class="breeder-shell panel reveal" data-reveal>
  <div class="section-head">
    <p class="eyebrow">Set the evidence floor</p>
    <h2>Recommend the most buildable strains</h2>
    <p>Pick the outcome you want, the amount of volatility you can tolerate, the use window, and how strict the evidence floor should be. The tool then ranks named strains with stronger report volume behind their symptom profiles and visible parent stock.</p>
  </div>

  <form id="breeder-form" class="breeder-form">
    <label class="breeder-field">
      <span>Primary objective</span>
      <select id="breeder-goal">
        <option value="sleep">Sleep / downshift</option>
        <option value="stability">Stability / low volatility</option>
        <option value="focus">Focus / daytime clarity</option>
        <option value="pain">Pain / body ease</option>
        <option value="social">Social ease</option>
        <option value="balance">Balanced profile</option>
      </select>
    </label>

    <label class="breeder-field">
      <span>Volatility posture</span>
      <select id="breeder-volatility">
        <option value="low">Low volatility</option>
        <option value="medium">Moderate volatility</option>
        <option value="high">High expression</option>
      </select>
    </label>

    <label class="breeder-field">
      <span>Use window</span>
      <select id="breeder-context">
        <option value="day">Daytime</option>
        <option value="mixed">Mixed</option>
        <option value="night">Evening</option>
      </select>
    </label>

    <label class="breeder-field">
      <span>Evidence floor</span>
      <select id="breeder-evidence">
        <option value="strong">Strong support</option>
        <option value="very-strong">Very strong support</option>
        <option value="elite">Elite support</option>
      </select>
    </label>

    <div class="finder-actions breeder-form__actions">
      <p class="breeder-note">The output prioritizes strains with a meaningful number of user reports, then shows the parent line so genetics-minded readers can see what is actually buildable.</p>
      <button type="submit" class="button button--primary">Rank starter stock</button>
    </div>
  </form>

  <div id="breeder-output" class="breeder-result" aria-live="polite">
    <p class="finder-empty">Choose a brief and evidence floor to see ranked starter strains and their parent stock.</p>
  </div>
</section>

<script>window.__BREEDER_STRAIN_DATA__ = {{ site.data.breeder_strains | jsonify }};</script>
<script src="{{ '/js/tags.js' | relative_url }}"></script>
<script src="{{ '/js/breeder.js' | relative_url }}"></script>
