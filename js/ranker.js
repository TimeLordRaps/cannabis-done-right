(() => {
  const form = document.getElementById('condition-form');
  const results = document.getElementById('results');

  if (!form || !results) {
    return;
  }

  const escapeHtml = value => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const { titleFromTag, topEntries, analyzeRisk } = window.finderRisk;

  const selectedConditions = () => Array.from(form.querySelectorAll('input[name="conditions"]:checked'))
    .map(input => input.value)
    .filter(Boolean);


  const evaluateProfile = (strain, profile) => {
    let fit = 0;
    let risk = 0;
    const signals = [];
    const cautions = [];

    Object.entries(profile.fitEffects || {}).forEach(([tag, weight]) => {
      const value = Number(strain.effects?.[tag] || 0);
      if (value > 0) {
        fit += (value / 100) * weight;
        signals.push({ kind: 'effect', tag, value });
      }
    });

    Object.entries(profile.fitSymptoms || {}).forEach(([tag, weight]) => {
      const value = Number(strain.symptoms?.[tag] || 0);
      if (value > 0) {
        fit += (value / 100) * weight;
        signals.push({ kind: 'symptom', tag, value });
      }
    });

    Object.entries(profile.avoidEffects || {}).forEach(([tag, weight]) => {
      const value = Number(strain.effects?.[tag] || 0);
      if (value > 0) {
        const normalized = (value / 100) * weight;
        risk += normalized;
        fit -= normalized * 0.45;
        cautions.push(tag);
      }
    });

    Object.entries(profile.avoidSymptoms || {}).forEach(([tag, weight]) => {
      const value = Number(strain.symptoms?.[tag] || 0);
      if (value > 0) {
        const normalized = (value / 100) * weight;
        risk += normalized;
        fit -= normalized * 0.4;
        cautions.push(tag);
      }
    });

    // Condition-tag boost: if the strain's user-reported conditions data
    // matches this profile's condition tags, reward proportionally.
    (profile.conditionTags || []).forEach(tag => {
      const value = Number(strain.conditions?.[tag] || 0);
      if (value > 0) {
        fit += (value / 100) * 1.5;
        signals.push({ kind: 'condition', tag, value });
      }
    });

    risk *= profile.riskBias || 1;

    const score = Math.max(0, (fit * 11.5) - (risk * 8.4));

    return { score, risk, signals, cautions, riskBand: analyzeRisk(strain) };
  };

  const buildRationale = (strain, signals, cautions, riskBand) => {
    const effectLabels = topEntries(strain.effects, 2).map(([tag]) => titleFromTag(tag));
    const symptomLabels = topEntries(strain.symptoms, 2).map(([tag]) => titleFromTag(tag));
    const conditionLabels = topEntries(strain.conditions, 2).map(([tag]) => titleFromTag(tag));
    const cautionLabels = [...new Set(cautions)].slice(0, 2).map(titleFromTag);
    const signalLine = effectLabels.length ? effectLabels.join(' · ') : 'no strong effect signal';
    const symptomLine = symptomLabels.length ? symptomLabels.join(' · ') : 'no strong symptom signal';
    const conditionLine = conditionLabels.length ? `Reported for: ${conditionLabels.join(' · ')}.` : '';
    const cautionLine = cautionLabels.length
      ? `Watch ${cautionLabels.join(' · ')}.`
      : (signals.length ? 'Low-volatility fit.' : 'Balanced by default, not by miracle.');
    const riskLine = riskBand.reasons.length ? `Risk read: ${riskBand.reasons[0]}` : `Risk read: ${riskBand.message}`;

    return `Best signals: ${signalLine}. Symptom support: ${symptomLine}. ${conditionLine} ${cautionLine} ${riskLine}`;
  };

  const rankStrains = selectedKeys => {
    const profiles = (selectedKeys.length ? selectedKeys : ['baseline'])
      .map(key => window.finderProfiles?.[key])
      .filter(Boolean);

    return window.strains
      .map(strain => {
        const evaluations = profiles.map(profile => ({ profile, ...evaluateProfile(strain, profile) }));
        const fitScore = evaluations.reduce((sum, item) => sum + item.score, 0) / Math.max(1, evaluations.length);
        const riskScore = evaluations.reduce((sum, item) => sum + item.risk, 0) / Math.max(1, evaluations.length);
        const allCautions = evaluations.flatMap(item => item.cautions);
        const profileLabel = profiles.map(profile => profile.label).join(' · ');
        const riskBand = evaluations[0]?.riskBand || analyzeRisk(strain);

        return {
          ...strain,
          fitScore,
          riskScore,
          riskBand,
          profileLabel,
          rationale: buildRationale(strain, evaluations.flatMap(item => item.signals), allCautions, riskBand),
          topEffects: topEntries(strain.effects, 2).map(([tag]) => titleFromTag(tag)),
          topSymptoms: topEntries(strain.symptoms, 2).map(([tag]) => titleFromTag(tag))
        };
      })
      .sort((a, b) => b.fitScore - a.fitScore)
      .slice(0, 12);
  };

  const renderResults = selectedKeys => {
    if (!window.strains.length) {
      results.innerHTML = '<p class="finder-empty">No strain data was found in the bundled dataset.</p>';
      return;
    }

    const ranked = rankStrains(selectedKeys);
    const labels = (selectedKeys.length ? selectedKeys : ['baseline'])
      .map(key => window.finderProfiles?.[key]?.label)
      .filter(Boolean);

    const summary = labels.length
      ? `Filtering for ${labels.map(escapeHtml).join(' · ')}.`
      : 'Using the baseline balance lens.';

    results.innerHTML = `
      <div class="quote-panel panel panel--soft results-summary">
        <p class="warning-band__label">Current lens</p>
        <div class="results-meta">
          ${labels.map(label => `<span class="tag tag--neutral">${escapeHtml(label)}</span>`).join('')}
        </div>
        <p class="subtle">${summary} The score is a fit score with a conservative risk penalty layered in. Risk bands now spell out the caution tags, paranoia/anxiety load, and activation-vs-anchor balance.</p>
      </div>

      <div class="results-grid">
        ${ranked.map((strain, index) => `
          <article class="strain-card reveal is-visible">
            <div class="strain-card__head">
              <div>
                <span class="strain-card__index">${String(index + 1).padStart(2, '0')}</span>
                <h3 class="strain-card__name">${escapeHtml(strain.name)}</h3>
                <p class="strain-card__sub">${escapeHtml(strain.category || '')}${strain.category ? ' · ' : ''}${escapeHtml(strain.profileLabel || 'Conservative profile fit')}</p>
              </div>
              <div class="strain-card__score">
                <strong>${strain.fitScore.toFixed(1)}</strong>
                <span>Fit</span>
              </div>
            </div>

            <div class="strain-card__chips">
              <span class="tag ${strain.riskBand.className}">${escapeHtml(strain.riskBand.label)} risk</span>
              ${strain.topEffects.map(tag => `<span class="tag tag--neutral">${escapeHtml(tag)}</span>`).join('')}
              ${strain.topSymptoms.map(tag => `<span class="tag tag--neutral">${escapeHtml(tag)}</span>`).join('')}
            </div>

            <p class="strain-card__explanation">${escapeHtml(strain.rationale)}</p>

            <div class="strain-card__risk">
              <span class="strain-card__risk-title">Why this band landed here</span>
              <ul class="strain-card__risk-list">
                ${strain.riskBand.reasons.slice(0, 3).map(reason => `<li>${escapeHtml(reason)}</li>`).join('')}
              </ul>
            </div>

            <div class="strain-card__footer">
              <span>Score built from visible fit + risk penalty</span>
              <span class="muted">${escapeHtml(strain.riskBand.message)}</span>
            </div>
          </article>
        `).join('')}
      </div>
    `;
  };

  const refresh = () => {
    if (form.hasAttribute('data-gated')) return;
    renderResults(selectedConditions());
  };

  form.addEventListener('submit', event => {
    event.preventDefault();
    refresh();
  });

  form.addEventListener('change', refresh);
  refresh();
})();
