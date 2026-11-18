(() => {
  const root = document.getElementById('quiz-root');
  if (!root || !window.riskQuiz || !window.finderFit) return;
  const { REASONS, SAFETY, CHECKS, assess, pickMatches } = window.riskQuiz;
  const profiles = window.finderProfiles || {};

  const esc = value => String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  const base = root.dataset.base || '';
  const questionText = item => (item.id === 'age' && window.regionGateLogic && window.regionJurisdiction)
    ? window.regionGateLogic.ageQuestion(window.regionJurisdiction)
    : item.q;

  // steps: intro, reason, safety x N, check x M, result
  const steps = [{ type: 'intro' }, { type: 'reason' }]
    .concat(SAFETY.map(item => ({ type: 'safety', item })))
    .concat(CHECKS.map(item => ({ type: 'check', item })))
    .concat([{ type: 'result' }]);
  const questionSteps = steps.length - 2; // excludes intro and result

  let index = 0;
  let answers = { reason: null, safety: {}, checks: {} };

  const progress = () => {
    if (index === 0) return '';
    if (index >= steps.length - 1) return '<div class="quiz-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100" aria-label="Quiz complete"><span style="width:100%"></span></div>';
    const pct = Math.round(((index - 1) / questionSteps) * 100);
    return `<div class="quiz-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Quiz progress"><span style="width:${pct}%"></span></div>
      <p class="quiz-step-label">Question ${index} of ${questionSteps}</p>`;
  };

  const backButton = () => (index > 1 ? '<button type="button" class="button button--ghost quiz-back" data-act="back">Back</button>' : '');

  const view = {
    intro: () => `
      <p class="eyebrow">Risk check / about 2 minutes</p>
      <h1>See your own risks first. Then see your match.</h1>
      <p class="hero__lede">${questionSteps} quick taps: who you are, what to watch for, three things worth knowing. Finish them and the strains that fit you best, at the lowest risk, are unlocked.</p>
      <ul class="principles">
        <li class="principle">Your answers stay in this tab. Nothing is saved or sent.</li>
        <li class="principle">There are no grades. A wrong answer just shows you the evidence.</li>
        <li class="principle">"No strain for you right now" is a real, respected result.</li>
      </ul>
      <button type="button" class="button button--primary" data-act="start">Start my risk check</button>`,

    reason: () => `
      ${progress()}
      <fieldset class="quiz-fieldset"><legend class="quiz-q">What brings you here?</legend>
        <p class="subtle">Pick the closest one. It only changes how matches are scored.</p>
        <div class="quiz-options">${REASONS.map(r => `<button type="button" class="quiz-option${answers.reason === r.id ? ' is-picked' : ''}" data-act="reason" data-id="${esc(r.id)}">${esc(r.label)}</button>`).join('')}</div>
      </fieldset>${backButton()}`,

    safety: step => {
      const a = answers.safety[step.item.id];
      const btn = (val, label) => `<button type="button" class="quiz-option${a === val ? ' is-picked' : ''}" data-act="safety" data-id="${esc(step.item.id)}" data-val="${val}">${label}</button>`;
      return `${progress()}
      <fieldset class="quiz-fieldset"><legend class="quiz-q">${esc(questionText(step.item))}</legend>
        <p class="subtle quiz-why"><strong>Why we ask:</strong> ${esc(step.item.why)}</p>
        <div class="quiz-options quiz-options--row">${btn('yes', 'Yes')}${btn('no', 'No')}${btn('unsure', 'Not sure')}</div>
      </fieldset>${backButton()}`;
    },

    check: step => {
      const picked = answers.checks[step.item.id];
      const done = picked !== undefined;
      const right = done && picked === step.item.answer;
      return `${progress()}
      <fieldset class="quiz-fieldset"><legend class="quiz-q">${esc(step.item.q)}</legend>
        <div class="quiz-options">${step.item.options.map((o, i) => `<button type="button" class="quiz-option${picked === i ? ' is-picked' : ''}${done && i === step.item.answer ? ' is-right' : ''}" data-act="check" data-id="${esc(step.item.id)}" data-val="${i}" ${done ? 'disabled' : ''}>${esc(o)}</button>`).join('')}</div>
      </fieldset>
      ${done ? `<div class="quiz-feedback" role="status"><strong>${right ? 'Yes.' : 'Not quite.'}</strong> ${esc(step.item.learn)}
        <a href="${/^https?:/.test(step.item.source.href) ? esc(step.item.source.href) : esc(base + '/' + step.item.source.href)}" rel="noopener">${esc(step.item.source.label)}</a></div>
        <button type="button" class="button button--primary" data-act="next">Continue</button>` : ''}
      ${backButton()}`;
    },

    result: () => {
      const a = assess(answers);
      const checksDone = CHECKS.filter(c => answers.checks[c.id] !== undefined).length;
      const head = `${progress()}
        <p class="eyebrow">Risk check complete: ${checksDone} of ${CHECKS.length} checks, ${SAFETY.length} of ${SAFETY.length} safety questions</p>`;
      const reasonsList = list => `<ul class="warning-list">${list.map(i => `<li>${esc(i.why)}</li>`).join('')}</ul>`;
      const footer = `<div class="cta-row">
          <button type="button" class="button button--ghost" data-act="restart">Retake</button>
          <a class="button button--ghost" href="${esc(base)}/finder">Open the full finder</a>
          <a class="button button--ghost" href="${esc(base)}/#reset">Quit-first reset</a>
        </div>
        <p class="subtle">Educational only, not medical advice, not a diagnosis. Your answers were not saved or sent anywhere.</p>`;

      if (a.tier === 'pause') {
        return `${head}<section class="quiz-result quiz-result--pause panel panel--warning"><h2>Your best match right now is a conversation, not a strain.</h2>
          <p>This is the result of taking your risks seriously, and it is the right result for these answers:</p>${reasonsList(a.hardStops)}
          <p>Good next steps: your prescriber or pharmacist for medication and mental-health questions. In the US, the SAMHSA helpline is 1-800-662-4357 (free, 24/7), and 988 is the crisis line.</p></section>${footer}`;
      }
      if (a.tier === 'later') {
        return `${head}<section class="quiz-result panel panel--soft"><h2>Your match is ready when you are.</h2>
          <p>Nothing is lost by waiting:</p>${reasonsList(a.defers)}<p>Come back and retake this when that is behind you.</p></section>${footer}`;
      }
      const matches = pickMatches(a, window.strains || [], profiles, window.finderFit.rankStrains);
      const caution = a.tier === 'elevated'
        ? `<div class="panel panel--warning quiz-caution"><p class="warning-band__label">Elevated caution</p><p>Based on your answers, matches come only from the lowest-risk pool, and anything with notable paranoia or anxiety tags is excluded. Still check with a professional about:</p>${reasonsList(a.elevated)}</div>`
        : '';
      const cards = matches.length ? matches.map((m, i) => {
        const s = m.strain; const r = m.riskBand;
        const effects = window.finderRisk.topEntries(s.effects, 3).map(([t]) => window.finderRisk.titleFromTag(t));
        const watch = r.topNegatives.slice(0, 2).map(n => n.label);
        return `<article class="strain-card quiz-match"><div class="strain-card__head"><div><span class="strain-card__index">${String(i + 1).padStart(2, '0')}</span>
          <h3 class="strain-card__name">${esc(s.name)}</h3><p class="strain-card__sub">${esc(s.category || '')} · ${esc(String(s.rating_count))} ratings</p></div>
          <div class="strain-card__score"><strong>${m.fitScore.toFixed(1)}</strong><span>Fit</span></div></div>
          <div class="strain-card__chips"><span class="tag ${esc(r.className)}">${esc(r.label)} risk</span>${effects.map(e => `<span class="tag tag--neutral">${esc(e)}</span>`).join('')}</div>
          <p class="strain-card__explanation"><strong>Why it fits:</strong> top reported effects are ${esc(effects.join(', ') || 'mixed')}.${watch.length ? ` <strong>What to watch:</strong> ${esc(watch.join(', '))}.` : ''}</p></article>`;
      }).join('') : '<p class="finder-empty">No strain met the conservative bar (Low risk band, at least 40 ratings) for your answers. That is a real result. Fewer, safer options beats a weak match.</p>';
      return `${head}<section class="quiz-result quiz-unlock"><h2>Your match is unlocked.</h2>
        <p class="subtle">You looked at the risks first, and these are the strains that fit ${a.reason.id === 'curious' ? 'a balanced, low-volatility lens' : `"${esc(a.reason.label)}"`} at the lowest risk in this dataset.</p>
        ${caution}<div class="results-grid">${cards}</div>
        <p class="subtle"><strong>Harm-reduction basics:</strong> start with the smallest amount, wait long enough to feel it before more, and treat next-day fog, worse sleep or rising anxiety as data. Not using is always an option.</p></section>${footer}`;
    }
  };

  const render = () => {
    const step = steps[index];
    root.innerHTML = `<div class="quiz-card panel reveal is-visible">${view[step.type](step)}</div>`;
    const target = root.querySelector('legend, h1, h2');
    if (target) { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: false }); }
  };

  const go = delta => { index = Math.max(0, Math.min(steps.length - 1, index + delta)); render(); };

  root.addEventListener('click', event => {
    const el = event.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const act = el.dataset.act;
    if (act === 'start') go(1);
    else if (act === 'back') go(-1);
    else if (act === 'next') go(1);
    else if (act === 'restart') { answers = { reason: null, safety: {}, checks: {} }; index = 0; render(); }
    else if (act === 'reason') { answers.reason = el.dataset.id; go(1); }
    else if (act === 'safety') { answers.safety[el.dataset.id] = el.dataset.val; go(1); }
    else if (act === 'check') { answers.checks[el.dataset.id] = Number(el.dataset.val); render(); }
  });

  render();
})();
