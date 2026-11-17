(() => {
  const form = document.getElementById('breeder-form');
  const output = document.getElementById('breeder-output');

  if (!form || !output) {
    return;
  }

  const goalEl = document.getElementById('breeder-goal');
  const volatilityEl = document.getElementById('breeder-volatility');
  const contextEl = document.getElementById('breeder-context');
  const evidenceEl = document.getElementById('breeder-evidence');
  const strains = Array.isArray(window.__BREEDER_STRAIN_DATA__) ? window.__BREEDER_STRAIN_DATA__ : [];

  const escapeHtml = value => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const goalMap = {
    sleep: {
      title: 'Sleep-forward stabilizer',
      summary: 'Quiet the signal and preserve recovery.',
      effectWeights: {
        'logtags-sleepy': 1.45,
        'logtags-sedating': 1.2,
        'logtags-relaxed': 1.0,
        'logtags-calm': 0.9
      },
      symptomWeights: {
        insomnia: 1.25,
        stress: 0.8,
        pain: 0.55
      },
      avoidNegatives: {
        paranoia: 1.6,
        anxious: 1.4,
        dizzy: 0.8,
        dry: 0.55
      },
      emphasis: ['Relaxation-weighted expression', 'Sleep continuity', 'Body ease'],
      tradeoffs: ['Late-night activation', 'Hard spikes', 'Fog that lingers into the next day'],
      guardrails: ['Keep the profile narrow', 'Treat next-day fog as a cost']
    },
    stability: {
      title: 'Low-volatility stabilizer',
      summary: 'Prioritize predictability and reduce swings.',
      effectWeights: {
        'logtags-relaxed': 1.25,
        'logtags-balanced': 1.0,
        'logtags-clear-headed': 0.8,
        'logtags-focused': 0.7
      },
      symptomWeights: {
        anxiety: 1.0,
        stress: 0.95,
        depression: 0.5
      },
      avoidNegatives: {
        paranoia: 1.5,
        anxious: 1.3,
        jittery: 1.0,
        racing: 0.95
      },
      emphasis: ['Calm state', 'Steady focus', 'Lower volatility'],
      tradeoffs: ['Over-activation', 'Loud euphoria', 'Erratic edges'],
      guardrails: ['Favor consistency over intensity', 'Watch for creeping tolerance']
    },
    focus: {
      title: 'Daytime clarity profile',
      summary: 'Keep the experience clean enough to work inside.',
      effectWeights: {
        'logtags-focused': 1.4,
        'logtags-clear-headed': 1.2,
        'logtags-uplifted': 0.55,
        'logtags-creative': 0.35
      },
      symptomWeights: {
        fatigue: 0.95,
        depression: 0.7,
        brain_fog: 1.15
      },
      avoidNegatives: {
        sedated: 1.2,
        sleepy: 1.0,
        anxious: 1.0,
        paranoid: 1.35
      },
      emphasis: ['Focus retention', 'Functional calm', 'Clear sensory edges'],
      tradeoffs: ['Sedation', 'Mental fog', 'Volatile uplift'],
      guardrails: ['Protect attentional bandwidth', 'Avoid using this to power through fatigue']
    },
    pain: {
      title: 'Body-ease profile',
      summary: 'Lean toward relief without losing all shape.',
      effectWeights: {
        'logtags-body-buzz': 1.15,
        'logtags-relaxed': 1.05,
        'logtags-sedating': 0.95,
        'logtags-euphoric': 0.35
      },
      symptomWeights: {
        pain: 1.4,
        inflammation: 0.7,
        spasm: 0.9
      },
      avoidNegatives: {
        jittery: 1.0,
        anxious: 0.95,
        racing: 0.8,
        dry: 0.45
      },
      emphasis: ['Muscle calm', 'Pain relief', 'Relaxed body tone'],
      tradeoffs: ['Jitter', 'Overstimulation', 'Fast escalation'],
      guardrails: ['Use relief as a boundary, not a fantasy', 'Watch for next-day heaviness']
    },
    social: {
      title: 'Social ease profile',
      summary: 'Calm enough to soften friction, not enough to make the profile sloppy.',
      effectWeights: {
        'logtags-talkative': 1.05,
        'logtags-relaxed': 0.95,
        'logtags-uplifted': 0.8,
        'logtags-focused': 0.45
      },
      symptomWeights: {
        anxiety: 1.1,
        stress: 0.85,
        social_anx: 1.15
      },
      avoidNegatives: {
        paranoid: 1.25,
        anxious: 1.15,
        overstimulated: 0.95,
        racing: 0.8
      },
      emphasis: ['Conversation ease', 'Relaxed presence', 'Stable focus'],
      tradeoffs: ['Overthinking', 'Nervous spirals', 'High volatility'],
      guardrails: ['Prefer composure over spectacle', 'Avoid chasing artificial confidence']
    },
    balance: {
      title: 'Balanced dossier',
      summary: 'A measured middle ground with the edges kept visible.',
      effectWeights: {
        'logtags-balanced': 1.25,
        'logtags-relaxed': 0.85,
        'logtags-focused': 0.8,
        'logtags-uplifted': 0.45
      },
      symptomWeights: {
        anxiety: 0.85,
        stress: 0.85,
        pain: 0.45,
        depression: 0.45
      },
      avoidNegatives: {
        paranoia: 1.1,
        anxious: 1.0,
        jittery: 0.9,
        sleepy: 0.65
      },
      emphasis: ['Moderation', 'Functional calm', 'Low surprise'],
      tradeoffs: ['Excess intensity', 'Runaway sedation', 'Sharp volatility'],
      guardrails: ['Keep the cross disciplined', 'Do not confuse balance with blandness']
    }
  };

  const volatilityMap = {
    low: {
      label: 'Low volatility',
      summary: 'Keep the structure tight and predictable.',
      modifier: 'The profile should read like a precision instrument, not a fireworks display.',
      activationPenalty: 1.15
    },
    medium: {
      label: 'Moderate volatility',
      summary: 'Allow a little more expression without losing control.',
      modifier: 'Some character is fine; drift is not.',
      activationPenalty: 1
    },
    high: {
      label: 'High expression',
      summary: 'Still deliberate, but with more vivid edges.',
      modifier: 'Use only if the use case can absorb a louder profile.',
      activationPenalty: 0.82
    }
  };

  const contextMap = {
    day: {
      label: 'Daytime',
      summary: 'The profile needs to remain legible inside work and conversation.',
      note: 'Daytime profiles should protect function first.'
    },
    mixed: {
      label: 'Mixed',
      summary: 'The profile needs to behave across several settings.',
      note: 'Mixed contexts reward discipline over novelty.'
    },
    night: {
      label: 'Evening',
      summary: 'The profile can lean softer, but still should not become sloppy.',
      note: 'Evening relief is still a tradeoff, not a blank check.'
    }
  };

  const evidenceMap = {
    strong: {
      label: 'Strong support',
      minimumRatings: 40,
      summary: 'Prioritize strains with at least a solid sample size behind them.'
    },
    'very-strong': {
      label: 'Very strong support',
      minimumRatings: 90,
      summary: 'Bias harder toward strains with a deeper report base.'
    },
    elite: {
      label: 'Elite support',
      minimumRatings: 180,
      summary: 'Only surface strains with unusually deep evidence coverage unless the pool is too small.'
    }
  };

  const supportTier = ratingCount => {
    if (ratingCount >= 250) {
      return { label: 'Elite support', className: 'tag--elite' };
    }

    if (ratingCount >= 100) {
      return { label: 'Very strong support', className: 'tag--strong' };
    }

    if (ratingCount >= 40) {
      return { label: 'Strong support', className: 'tag--mod' };
    }

    return { label: 'Limited support', className: 'tag--limited' };
  };

  const topEntries = (map, limit = 2) => Object.entries(map || {})
    .filter(([, value]) => Number(value) > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  const titleFromTag = tag => String(tag)
    .replace(/^logtags-/, '')
    .replace(/_/g, ' ')
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  const normalizeLabel = value => String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  const formatLineage = strain => {
    const parentNames = Array.isArray(strain.parents)
      ? strain.parents.map(parent => parent?.name).filter(Boolean)
      : [];
    const explicitLineage = String(strain.parent_names || '').trim();
    const abstract = String(strain.abstract || '').trim();

    let lineageText = '';

    if (parentNames.length >= 2) {
      lineageText = parentNames.join(' × ');
    } else if (parentNames.length === 1) {
      lineageText = `${parentNames[0]} × undisclosed partner`;
    } else if (explicitLineage) {
      lineageText = normalizeLabel(explicitLineage);
    } else {
      const crossMatch = abstract.match(/cross(?:ed)?(?: between)?\s+([^.,]+?)\s+(?:and|with)\s+([^.,]+?)(?:[.,]|$)/i);
      if (crossMatch) {
        lineageText = `${crossMatch[1].trim()} × ${crossMatch[2].trim()}`;
      }
    }

    if (!lineageText) {
      lineageText = 'Lineage not disclosed in this dataset';
    }

    let label = 'Lineage opaque';
    let className = 'tag--limited';

    if (parentNames.length >= 2) {
      label = 'Known parent stock';
      className = 'tag--strong';
    } else if (parentNames.length === 1 || explicitLineage || lineageText !== 'Lineage not disclosed in this dataset') {
      label = 'Partial lineage';
      className = 'tag--mod';
    }

    return {
      text: lineageText,
      label,
      className,
      parentCount: parentNames.length,
      hasDisclosedLineage: lineageText !== 'Lineage not disclosed in this dataset'
    };
  };

  const analyzeStrain = (strain, goal, volatility) => {
    const effects = strain.effects || {};
    const symptoms = strain.symptoms || {};
    const negatives = strain.negatives || {};
    const conditions = strain.conditions || {};
    const lineage = formatLineage(strain);

    let fit = 0;
    let risk = 0;
    const cautionSignals = [];

    Object.entries(goal.effectWeights || {}).forEach(([tag, weight]) => {
      const value = Number(effects[tag] || 0);
      if (value > 0) {
        fit += (value / 100) * weight;
      }
    });

    Object.entries(goal.symptomWeights || {}).forEach(([tag, weight]) => {
      const value = window.finderTags.symptomValue(strain, tag);
      if (value > 0) {
        fit += (value / 100) * weight;
      }

      const conditionValue = window.finderTags.conditionValue(strain, tag);
      if (conditionValue > 0) {
        fit += (conditionValue / 100) * (weight * 0.35);
      }
    });

    Object.entries(goal.avoidNegatives || {}).forEach(([tag, weight]) => {
      const value = window.finderTags.negativeValue(strain, tag);
      if (value > 0) {
        const penalty = (value / 100) * weight;
        risk += penalty;
        fit -= penalty * 0.45;
        cautionSignals.push(`${titleFromTag(tag)} (${value.toFixed(0)})`);
      }
    });

    const activation = Number(effects['logtags-uplifted'] || 0)
      + Number(effects['logtags-euphoric'] || 0)
      + Number(effects['logtags-energetic'] || 0);
    const anchor = Number(effects['logtags-relaxed'] || 0)
      + Number(effects['logtags-sedating'] || 0)
      + Number(effects['logtags-balanced'] || 0)
      + Number(effects['logtags-focused'] || 0);
    const activationGap = Math.max(0, activation - anchor);

    risk += (activationGap / 100) * 0.45 * volatility.activationPenalty;
    risk += (activation / 100) * (volatility.activationPenalty - 0.9) * 0.3;

    if (volatility.label === 'Low volatility') {
      const overstimulation = Number(effects['logtags-euphoric'] || 0) + Number(effects['logtags-energetic'] || 0);
      risk += (overstimulation / 100) * 0.35;
    }

    if (volatility.label === 'High expression') {
      fit += (activation / 100) * 0.2;
    }

    const ratingCount = Number(strain.rating_count || 0);
    const symptomCount = Object.keys(symptoms).length;
    const effectCount = Object.keys(effects).length;
    const conditionCount = Object.keys(conditions).length;
    const evidenceCoverage = symptomCount + effectCount + conditionCount;
    const evidenceBoost = Math.log10(ratingCount + 1) * 1.9 + (evidenceCoverage * 0.12);
    const supportScore = (ratingCount * 0.01) + evidenceBoost;
    const lineageBoost = lineage.parentCount >= 2 ? 0.85 : lineage.parentCount === 1 ? 0.45 : (lineage.hasDisclosedLineage ? 0.2 : -0.15);
    const finalScore = Math.max(0, (fit * 10.5) + (supportScore * 4.2) - (risk * 8.4) + lineageBoost);
    const support = supportTier(ratingCount);

    const bestEffects = topEntries(effects, 2).map(([tag]) => titleFromTag(tag));
    const bestSymptoms = topEntries(symptoms, 2).map(([tag]) => titleFromTag(tag));
    const supportSummary = `${ratingCount} ratings · ${symptomCount} symptom tags · ${conditionCount} condition tags`;

    const paranoiaValue = window.finderTags.negativeValue(strain, 'paranoia');
    const anxiousValue = window.finderTags.negativeValue(strain, 'anxious');
    let riskLabel = 'Low';
    let riskClass = 'tag--low';
    let riskMessage = 'Lower penalty than most.';
    const reasons = [];

    if (paranoiaValue >= 18 || anxiousValue >= 18 || activationGap >= 24 || risk >= 3.1) {
      riskLabel = 'High';
      riskClass = 'tag--high';
      riskMessage = 'Activation or volatility risk is higher here.';
      reasons.push('Paranoia or anxiety signals are elevated.');
      reasons.push(activationGap >= 24 ? 'Activation outruns the relaxation/focus anchor.' : 'The anchor is not fully holding the activation in place.');
      if (risk >= 3.1) {
        reasons.push('The negative load is high enough to push the band upward.');
      }
    } else if (paranoiaValue >= 10 || anxiousValue >= 10 || activationGap >= 12 || risk >= 1.5) {
      riskLabel = 'Moderate';
      riskClass = 'tag--mod';
      riskMessage = 'Tradeoff visible; stay cautious.';
      reasons.push('There are visible caution tags in the profile.');
      reasons.push(activationGap >= 12 ? 'Activation is a little ahead of the anchoring signals.' : 'The anchor is present, but not especially strong.');
    } else {
      reasons.push('Negative load stays modest.');
      reasons.push('Activation and anchor are reasonably balanced.');
      if (cautionSignals.length) {
        reasons.push(`The main visible cautions are ${cautionSignals.slice(0, 2).join(' · ')}.`);
      } else {
        reasons.push('No major caution tags surfaced in the bundled data slice.');
      }
    }

    const rationale = [
      bestEffects.length ? `Best signals: ${bestEffects.join(' · ')}.` : 'Best signals: no strong effect match surfaced.',
      bestSymptoms.length ? `Symptom support: ${bestSymptoms.join(' · ')}.` : 'Symptom support: no strong symptom match surfaced.',
      cautionSignals.length ? `Cautions: ${cautionSignals.slice(0, 2).join(' · ')}.` : 'Cautions: no dominant negative tags surfaced.',
      `Lineage: ${lineage.text}.`
    ].join(' ');

    return {
      ...strain,
      fitScore: fit,
      riskScore: risk,
      finalScore,
      support,
      lineage,
      supportSummary,
      riskBand: { label: riskLabel, className: riskClass, message: riskMessage },
      riskReasons: reasons,
      rationale,
      bestEffects,
      bestSymptoms,
      ratingCount,
      evidenceCoverage
    };
  };

  const render = () => {
    if (!strains.length) {
      output.innerHTML = '<p class="finder-empty">No supporting strain data was found in the bundled dataset.</p>';
      return;
    }

    const goal = goalMap[goalEl?.value || 'balance'] || goalMap.balance;
    const volatility = volatilityMap[volatilityEl?.value || 'medium'] || volatilityMap.medium;
    const context = contextMap[contextEl?.value || 'mixed'] || contextMap.mixed;
    const evidence = evidenceMap[evidenceEl?.value || 'strong'] || evidenceMap.strong;

    const scored = strains
      .map(strain => analyzeStrain(strain, goal, volatility))
      .sort((a, b) => b.finalScore - a.finalScore);

    const floor = evidence.minimumRatings;
    let shortlist = scored.filter(strain => strain.ratingCount >= floor);
    let relaxedNotice = '';

    if (shortlist.length < 4) {
      const relaxedFloor = Math.max(10, Math.round(floor * 0.55));
      const relaxed = scored.filter(strain => strain.ratingCount >= relaxedFloor);
      if (relaxed.length > shortlist.length) {
        shortlist = relaxed;
        relaxedNotice = `The ${evidence.label.toLowerCase()} floor was too strict for a useful shortlist, so the pool widened to strains with at least ${relaxedFloor} ratings.`;
      }
    }

    if (!shortlist.length) {
      shortlist = scored.slice(0, 6);
      relaxedNotice = 'The requested evidence floor was too high for the current dataset, so the shortlist fell back to the most supported strains available.';
    }

    const namedShortlist = shortlist.filter(strain => strain.lineage.hasDisclosedLineage);
    const opaqueShortlist = shortlist.filter(strain => !strain.lineage.hasDisclosedLineage);
    let lineageNotice = '';

    if (namedShortlist.length) {
      shortlist = [...namedShortlist, ...opaqueShortlist].slice(0, 6);
      if (opaqueShortlist.length) {
        lineageNotice = 'Named parent stock is prioritized first; any lineage-opaque strain is pushed behind the buildable lines.';
      }
    } else {
      shortlist = shortlist.slice(0, 6);
      lineageNotice = 'No disclosed parent stock was available in the current shortlist, so the fallback is used sparingly.';
    }

    const labels = [goal.title, volatility.label, context.label, evidence.label];
    const supportCapsule = `Ranking for ${goal.title.toLowerCase()} in a ${context.label.toLowerCase()} context, with ${evidence.label.toLowerCase()} as the evidence floor.`;
    const starterNames = shortlist.slice(0, 3)
      .map(strain => `${strain.name} — ${strain.lineage.text}`)
      .filter(Boolean);

    output.innerHTML = `
      <div class="breeder-callout">
        <span class="breeder-result__label">Named starter stock</span>
        <h3>${escapeHtml(goal.title)}</h3>
        <p>${escapeHtml(goal.summary)} ${escapeHtml(volatility.modifier)} ${escapeHtml(context.note)}</p>
        <p>${escapeHtml(evidence.summary)} ${relaxedNotice ? escapeHtml(relaxedNotice) : ''}</p>
        <p>${escapeHtml(lineageNotice)}</p>
        <div class="results-meta">
          ${labels.map(label => `<span class="tag tag--neutral">${escapeHtml(label)}</span>`).join('')}
        </div>
        <p class="breeder-note">${escapeHtml(supportCapsule)}</p>
        ${starterNames.length ? `
          <div class="breeder-starting-lines">
            <span class="strain-card__risk-title">Top named starting lines</span>
            <ul class="breeder-starting-lines__list">
              ${starterNames.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>

      <div class="breeder-grid">
        ${shortlist.map((strain, index) => `
          <article class="strain-card breeder-card">
            <div class="strain-card__head">
              <div>
                <span class="strain-card__index">${String(index + 1).padStart(2, '0')}</span>
                <h3 class="strain-card__name">${escapeHtml(strain.name)}</h3>
                <p class="strain-card__sub">${escapeHtml(strain.support.label)} · ${escapeHtml(strain.lineage.label)}</p>
              </div>
              <div class="strain-card__score">
                <strong>${strain.finalScore.toFixed(1)}</strong>
                <span>Rank</span>
              </div>
            </div>

            <div class="strain-card__chips">
              <span class="tag ${strain.support.className}">${escapeHtml(strain.support.label)}</span>
              <span class="tag ${strain.lineage.className}">${escapeHtml(strain.lineage.label)}</span>
              <span class="tag tag--neutral">${escapeHtml(String(strain.ratingCount))} ratings</span>
              <span class="tag tag--neutral">${escapeHtml(String(strain.evidenceCoverage))} evidence signals</span>
              <span class="tag ${strain.riskBand.className}">${escapeHtml(strain.riskBand.label)} risk</span>
            </div>

            <div class="strain-card__lineage">
              <span class="strain-card__lineage-title">Parent stock</span>
              <p class="strain-card__lineage-text">${escapeHtml(strain.lineage.text)}</p>
            </div>

            <p class="strain-card__explanation">${escapeHtml(strain.rationale)}</p>

            <div class="strain-card__risk">
              <span class="strain-card__risk-title">Why this recommendation landed here</span>
              <ul class="strain-card__risk-list">
                <li>${escapeHtml(strain.supportSummary)}</li>
                <li>${escapeHtml(strain.riskReasons[0] || 'The risk profile stayed manageable.')}</li>
                <li>${escapeHtml(strain.riskReasons[1] || strain.riskBand.message)}</li>
              </ul>
            </div>

            <div class="strain-card__footer">
              <span>${escapeHtml(goal.summary)}</span>
              <span class="muted">${escapeHtml(strain.riskBand.message)}</span>
            </div>
          </article>
        `).join('')}
      </div>
    `;
  };

  form.addEventListener('submit', event => {
    event.preventDefault();
    render();
  });

  form.addEventListener('change', render);
  render();
})();