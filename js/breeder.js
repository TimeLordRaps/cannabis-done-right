(() => {
  const form = document.getElementById('breeder-form');
  const output = document.getElementById('breeder-output');

  if (!form || !output) {
    return;
  }

  const goalEl = document.getElementById('breeder-goal');
  const volatilityEl = document.getElementById('breeder-volatility');
  const contextEl = document.getElementById('breeder-context');

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
      emphasize: ['Relaxation-weighted expression', 'Sleep continuity', 'Body ease'],
      suppress: ['Racing activation', 'Hard spikes', 'Late-night escalation'],
      guardrails: ['Keep the profile narrow', 'Treat next-day fog as a cost']
    },
    stability: {
      title: 'Low-volatility stabilizer',
      summary: 'Prioritize predictability and reduce swings.',
      emphasize: ['Calm state', 'Steady focus', 'Lower volatility'],
      suppress: ['Over-activation', 'Loud euphoria', 'Erratic edges'],
      guardrails: ['Favor consistency over intensity', 'Watch for creeping tolerance']
    },
    focus: {
      title: 'Daytime clarity profile',
      summary: 'Keep the experience clean enough to work inside.',
      emphasize: ['Focus retention', 'Functional calm', 'Clear sensory edges'],
      suppress: ['Sedation', 'Mental fog', 'Volatile uplift'],
      guardrails: ['Protect attentional bandwidth', 'Avoid using this to power through fatigue']
    },
    pain: {
      title: 'Body-ease profile',
      summary: 'Lean toward relief without losing all shape.',
      emphasize: ['Muscle calm', 'Pain relief', 'Relaxed body tone'],
      suppress: ['Jitter', 'Overstimulation', 'Fast escalation'],
      guardrails: ['Use relief as a boundary, not a fantasy', 'Watch for next-day heaviness']
    },
    social: {
      title: 'Social ease profile',
      summary: 'Calm enough to soften friction, not enough to make the profile sloppy.',
      emphasize: ['Conversation ease', 'Relaxed presence', 'Stable focus'],
      suppress: ['Overthinking', 'Nervous spirals', 'High volatility'],
      guardrails: ['Prefer composure over spectacle', 'Avoid chasing artificial confidence']
    },
    balance: {
      title: 'Balanced dossier',
      summary: 'A measured middle ground with the edges kept visible.',
      emphasize: ['Moderation', 'Functional calm', 'Low surprise'],
      suppress: ['Excess intensity', 'Runaway sedation', 'Sharp volatility'],
      guardrails: ['Keep the cross disciplined', 'Do not confuse balance with blandness']
    }
  };

  const volatilityMap = {
    low: {
      label: 'Low volatility',
      summary: 'Keep the structure tight and predictable.',
      modifier: 'The profile should read like a precision instrument, not a fireworks display.'
    },
    medium: {
      label: 'Moderate volatility',
      summary: 'Allow a little more expression without losing control.',
      modifier: 'Some character is fine; drift is not.'
    },
    high: {
      label: 'High expression',
      summary: 'Still deliberate, but with more vivid edges.',
      modifier: 'Use only if the use case can absorb a louder profile.'
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

  const buildList = items => `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;

  const render = () => {
    const goal = goalMap[goalEl?.value || 'balance'] || goalMap.balance;
    const volatility = volatilityMap[volatilityEl?.value || 'medium'] || volatilityMap.medium;
    const context = contextMap[contextEl?.value || 'mixed'] || contextMap.mixed;

    output.innerHTML = `
      <div class="breeder-callout">
        <span class="breeder-result__label">Conceptual cross</span>
        <h3>${escapeHtml(goal.title)}</h3>
        <p>${escapeHtml(goal.summary)} ${escapeHtml(volatility.modifier)} ${escapeHtml(context.note)}</p>
      </div>

      <div class="breeder-grid">
        <article class="breeder-card">
          <span class="tool-card__tag">Trait architecture</span>
          <h3>${escapeHtml(goal.label || goal.title)}</h3>
          <p>${escapeHtml(volatility.summary)} ${escapeHtml(context.summary)}</p>
          ${buildList(goal.emphasize)}
        </article>

        <article class="breeder-card">
          <span class="tool-card__tag">Guardrails and suppression</span>
          <h3>What should not dominate</h3>
          <p>${escapeHtml(goal.suppress.length ? 'The cross should resist these traits:' : 'No suppression cues were supplied.')}</p>
          ${buildList(goal.suppress)}
          <div class="divider"></div>
          <p class="breeder-note">${escapeHtml(goal.guardrails.join(' · '))}</p>
        </article>
      </div>

      <div class="breeder-callout">
        <p><strong>Context:</strong> ${escapeHtml(context.label)} · ${escapeHtml(volatility.label)}</p>
        <p>${escapeHtml(context.note)} ${escapeHtml(volatility.summary)}</p>
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
