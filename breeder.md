---
layout: default
title: Strain Breeder
nav: breeder
---

<section class="breeder-hero panel reveal" data-reveal>
  <p class="eyebrow">Concept simulator / trait architecture</p>
  <h1>Strain Breeder</h1>
  <p class="breeder-hero__lede">A conceptual genetics simulator for thinking in profiles, trait tradeoffs, and guardrails. It is not a cultivation manual.</p>
  <p class="subtle">Use it to reason about emphasis, suppression, and risk — not to romanticize output.</p>
</section>

<section class="breeder-shell panel reveal" data-reveal>
  <div class="section-head">
    <p class="eyebrow">Input the brief</p>
    <h2>Simulate a trait profile</h2>
    <p>Pick the outcome you want, the amount of volatility you can tolerate, and the context in which the profile would need to behave.</p>
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

    <div class="finder-actions breeder-form__actions">
      <p class="breeder-note">The simulator maps the brief to a trait architecture and a risk lens. It should feel like a dossier, not a sales pitch.</p>
      <button type="submit" class="button button--primary">Simulate profile</button>
    </div>
  </form>

  <div id="breeder-output" class="breeder-result" aria-live="polite">
    <p class="finder-empty">Choose a brief and simulate a conceptual lineage profile.</p>
  </div>
</section>

<script src="{{ '/js/breeder.js' | relative_url }}"></script>
