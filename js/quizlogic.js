(() => {
  // Risk-first quiz: situation -> safety screen -> three evidence-backed risk checks -> profile -> match.
  // Pure data + logic so it can be unit tested. Nothing here talks to the network.

  const REASONS = [
    { id: 'anxious', label: 'Anxious or on edge', conditions: ['gad'] },
    { id: 'social', label: 'Nervous around people', conditions: ['social_anx'] },
    { id: 'panic', label: 'Panic spikes', conditions: ['panic'] },
    { id: 'sleep-trauma', label: "Can't settle, replaying bad memories", conditions: ['ptsd'] },
    { id: 'low', label: 'Low or flat mood', conditions: ['mdd'] },
    { id: 'winter', label: 'Seasonal winter low', conditions: ['sad_seasonal'] },
    { id: 'cycle', label: 'Tension around my cycle', conditions: ['pmdd'] },
    { id: 'curious', label: 'Nothing specific, just curious', conditions: [] }
  ];

  // effect: hardStop -> no strain is shown. defer -> no strain is shown right now.
  // elevated -> strains are shown only from the lowest-risk pool. `unsure` is how "Not sure" counts.
  const SAFETY = [
    { id: 'age', q: 'Are you over the legal age of majority to consume cannabis where you live, or do you have medical authorization or support for use?', yesIs: 'ok', noEffect: 'hardStop', unsure: 'hardStop',
      why: 'No match is shown unless you are of legal age or have medical authorization or support for use.' },
    { id: 'pregnancy', q: 'Are you pregnant, trying to conceive, or breastfeeding?', effect: 'hardStop', unsure: 'hardStop',
      why: 'Cannabis use in pregnancy and breastfeeding is something to discuss with your clinician first.' },
    { id: 'personal-mania', q: 'Have you ever been diagnosed with bipolar disorder, mania, or a psychotic disorder?', effect: 'hardStop', unsure: 'elevated',
      why: 'A published review found cannabis use associated with worse manic symptoms in people with bipolar disorder (see the checks below).' },
    { id: 'family-psychosis', q: 'Does a close relative have schizophrenia or another psychotic disorder?', effect: 'elevated', unsure: 'elevated',
      why: 'Family history raises how much weight to give the paranoia and anxiety signals.' },
    { id: 'medication', q: 'Do you take prescription medication, especially sedatives, blood thinners, antipsychotics, or antidepressants?', effect: 'elevated', unsure: 'elevated',
      why: 'Interactions are a pharmacist question. Ask before combining.' },
    { id: 'control', q: 'Have you ever used more than you planned, or struggled to cut back?', effect: 'elevated', unsure: 'elevated',
      why: 'Past loss of control is the clearest personal signal for dependence risk.' },
    { id: 'frequency', q: 'Do you use, or expect to use, more than four days a week?', effect: 'elevated', unsure: 'elevated',
      why: 'Frequent use is where sleep, motivation and tolerance costs tend to stack up.' },
    { id: 'driving', q: 'Will you drive, operate machinery, or look after children in the next six hours?', effect: 'defer', unsure: 'defer',
      why: 'Come back to the match when none of that is ahead of you.' }
  ];

  const CHECKS = [
    {
      id: 'dependence',
      q: 'In a US national survey of adults who used marijuana in the past year (2012-2013), about how many in 100 met criteria for marijuana use disorder?',
      options: ['About 3', 'About 10', 'About 30', 'About 60'],
      answer: 2,
      learn: '30.6 in 100 past-year adult users met DSM-IV criteria for marijuana use disorder. It is self-reported survey data and older diagnostic criteria, so treat it as a ballpark, not a personal prediction.',
      source: { label: 'Hasin et al., JAMA Psychiatry 2015', href: 'https://pubmed.ncbi.nlm.nih.gov/26502112/' }
    },
    {
      id: 'mood',
      q: 'In people with bipolar disorder, cannabis use was associated with what, in a systematic review of prospective studies?',
      options: ['Fewer manic symptoms', 'No difference', 'Worse manic symptoms'],
      answer: 2,
      learn: 'The review linked cannabis use to worse manic symptoms in bipolar disorder, and about 3x the odds of new-onset manic symptoms in a meta-analysis of two studies. The authors call it tentative: six studies of variable quality, and association is not proof of cause.',
      source: { label: 'Gibbs et al., J Affect Disord 2015', href: 'https://pubmed.ncbi.nlm.nih.gov/25285897/' }
    },
    {
      id: 'tool',
      q: 'On this site, what does a strain\u2019s "Low risk" band actually mean?',
      options: ['A clinical safety rating', 'Low compared with other strains in this dataset', 'A guarantee it will not cause anxiety'],
      answer: 1,
      learn: 'Bands are cutoffs anchored to percentiles of crowd-sourced tag percentages. "Low" means lower than most strains here. It does not say anything about you, your dose, or your medication.',
      source: { label: 'How the bands are set', href: 'finder#risk-rubric' }
    }
  ];

  const SERIOUS_SAFETY_ID = new Set(SAFETY.filter(s => s.effect === 'hardStop' || s.noEffect === 'hardStop').map(s => s.id));

  // answers: { reason: id, safety: { id: 'yes'|'no'|'unsure' } }
  const assess = answers => {
    const reason = REASONS.find(r => r.id === answers.reason) || REASONS[REASONS.length - 1];
    const hardStops = [];
    const elevated = [];
    const defers = [];
    SAFETY.forEach(item => {
      const a = (answers.safety || {})[item.id];
      let effect = null;
      if (item.id === 'age') {
        if (a === 'no') effect = item.noEffect;
        else if (a === 'unsure') effect = item.unsure;
      } else if (a === 'yes') effect = item.effect;
      else if (a === 'unsure') effect = item.unsure;
      if (effect === 'hardStop') hardStops.push(item);
      else if (effect === 'defer') defers.push(item);
      else if (effect === 'elevated') elevated.push(item);
    });
    // Unanswered safety items are treated as unsure: never show a match on missing safety data.
    const unanswered = SAFETY.filter(s => (answers.safety || {})[s.id] === undefined);
    unanswered.forEach(item => {
      const effect = item.unsure;
      if (effect === 'hardStop') hardStops.push(item);
      else if (effect === 'defer') defers.push(item);
      else elevated.push(item);
    });

    let tier = 'standard';
    if (hardStops.length) tier = 'pause';
    else if (defers.length) tier = 'later';
    else if (elevated.length) tier = 'elevated';
    return { tier, reason, conditions: reason.conditions, hardStops, defers, elevated };
  };

  // Matches: only for 'standard' and 'elevated'. Pool is always conservative (Low band, >= 40 ratings);
  // 'elevated' additionally requires a low paranoia/anxiety load.
  const pickMatches = (assessment, strains, profiles, rankStrains, limit = 3) => {
    if (assessment.tier !== 'standard' && assessment.tier !== 'elevated') return [];
    const keys = assessment.conditions.length ? assessment.conditions : ['baseline'];
    const chosen = keys.map(k => profiles[k]).filter(Boolean);
    const ranked = rankStrains(strains, chosen);
    return ranked
      .filter(r => r.riskBand.label === 'Low'
        && Number(r.strain.rating_count) >= 40
        && (assessment.tier === 'standard' || r.riskBand.paranoiaLoad < 5))
      .slice(0, limit);
  };

  const api = { REASONS, SAFETY, CHECKS, assess, pickMatches, SERIOUS_SAFETY_ID };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.riskQuiz = api;
})();
