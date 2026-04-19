---
layout: default
title: Strain Finder
nav: finder
---

<div class="finder-hero">
  <h1>🔍 MaxSAT Strain Finder</h1>
  <p>Select conditions/symptoms for optimal rankings (pysat RC2, 48 DSM clauses). Harm thresholds: <span class="low">Low</span> <span class="mod">Mod</span> <span class="high">High</span>.</p>
</div>

<form id="condition-form" class="max-w-4xl mx-auto p-12">
  <label class="block text-2xl font-bold mb-8 text-center">DSM Conditions (Multi-Select)</label>
  <select multiple id="conditions" class="w-full h-64 p-6 border-4 border-indigo-300 rounded-3xl bg-gradient-to-b from-indigo-50 to-purple-50 text-xl shadow-inner focus:border-emerald-400 focus:outline-none">
    <option value="bp1">Bipolar I</option>
    <option value="bp2">Bipolar II</option>
    <option value="cyclo">Cyclothymia</option>
    <option value="mdd">Major Depressive Disorder</option>
    <option value="pdd">Persistent Depressive (Dysthymia)</option>
    <option value="pmdd">PMDD</option>
    <option value="sad_seasonal">Seasonal Affective Disorder</option>
    <option value="sza_bp">Schizoaffective Bipolar</option>
    <option value="sza_dep">Schizoaffective Depressive</option>
    <option value="gad">Generalized Anxiety</option>
    <option value="social_anx">Social Anxiety</option>
    <option value="panic">Panic Disorder</option>
    <option value="ptsd">PTSD</option>
    <option value="gaming_add">Gaming Addiction Proxy</option>
    <option value="porn_add">Porn Addiction Proxy</option>
  </select>
  <button type="submit" class="w-full mt-12 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-8 px-12 rounded-3xl text-2xl font-bold shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300">Find Optimal Strains</button>
</form>

<div id="results" class="results-grid"></div>

<script src="{{ '/js/strains.js' | relative_url }}"></script>
<script src="{{ '/js/ranker.js' | relative_url }}"></script>

