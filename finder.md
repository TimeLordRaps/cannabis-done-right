---
layout: default
title: Strain Finder
nav: finder
---

<div class="finder-hero">
  <h1>Strain Finder</h1>
  <p>Enter your symptoms or conditions for a ranked list of strains. Harm thresholds shown: <span class="low">Low</span> <span class="mod">Mod</span> <span class="high">High</span> risk.</p>
</div>

<form id="condition-form">
  <div class="condition-select">
    <label>Conditions:</label>
    <select multiple id="conditions">
      <option value="bp1">Bipolar I</option>
      <option value="bp2">Bipolar II</option>
      <option value="cyclo">Cyclothymia</option>
      <option value="mdd">Major Depressive Disorder</option>
      <!-- Add more from condition_profiles.py -->
    </select>
  </div>
  <button type="submit">Find Strains</button>
</form>

<div id="results"></div>

<script src="{{ '/js/strains.js' | relative_url }}"></script>
<script src="{{ '/js/ranker.js' | relative_url }}"></script>
