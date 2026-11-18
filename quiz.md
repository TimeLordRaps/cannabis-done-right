---
layout: default
title: Risk Check
permalink: /quiz
nav: quiz
---

<section class="panel quiz-shell" aria-live="polite">
  <div id="quiz-root" data-base="{{ site.baseurl }}">
    <noscript><p>The risk check needs JavaScript. The <a href="{{ '/finder' | relative_url }}">finder</a> and the <a href="{{ '/myths' | relative_url }}">risks page</a> work without it.</p></noscript>
    <p class="subtle">Loading the risk check…</p>
  </div>
</section>

<script>
(() => {
  const load = src => new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = () => fail(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
  (window.regionGate || Promise.resolve())
    .then(() => fetch("{{ '/data/strains.min.json' | relative_url }}"))
    .then(r => { if (!r.ok) throw new Error('strain data HTTP ' + r.status); return r.json(); })
    .then(data => { window.__STRAIN_DATA__ = data; })
    .then(() => load("{{ '/js/risk.js' | relative_url }}"))
    .then(() => load("{{ '/js/fit.js' | relative_url }}"))
    .then(() => load("{{ '/js/strains.js' | relative_url }}"))
    .then(() => load("{{ '/js/quizlogic.js' | relative_url }}"))
    .then(() => load("{{ '/js/quiz.js' | relative_url }}"))
    .catch(err => {
      const el = document.getElementById('quiz-root');
      if (el) el.innerHTML = '<p class="finder-empty">Could not load the risk check (' + String(err.message).replace(/</g, '&lt;') + '). Reload to try again.</p>';
    });
})();
</script>
