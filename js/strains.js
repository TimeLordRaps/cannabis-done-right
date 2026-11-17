(() => {
  const rawStrains = Array.isArray(window.__STRAIN_DATA__) ? window.__STRAIN_DATA__ : [];

  const normalizeMap = value => (value && typeof value === 'object' ? value : {});

  const normalizeStrain = strain => ({
    ...strain,
    id: strain.id || strain.slug || strain.name || '',
    name: strain.name || 'Unnamed strain',
    slug: strain.slug || '',
    category: strain.category || '',
    effects: normalizeMap(strain.effects),
    symptoms: normalizeMap(strain.symptoms),
    negatives: normalizeMap(strain.negatives),
    conditions: normalizeMap(strain.conditions)
  });

  const profile = (label, summary, fitEffects, fitSymptoms, avoidEffects, avoidSymptoms, riskBias = 1, note = '', conditionTags = []) => ({
    label,
    summary,
    fitEffects,
    fitSymptoms,
    avoidEffects,
    avoidSymptoms,
    riskBias,
    note,
    conditionTags
  });

  window.strains = rawStrains.map(normalizeStrain);

  window.finderProfiles = {
    baseline: profile(
      'Baseline balance',
      'Lower-volatility fit for general clarity and calmer support.',
      {
        'logtags-relaxed': 1.2,
        'logtags-focused': 0.8,
        'logtags-happy': 0.6,
        'logtags-creative': 0.4
      },
      {
        'logtags-stress': 1.1,
        'logtags-pain': 0.5,
        'logtags-depression': 0.4,
        'logtags-insomnia': 0.3
      },
      {
        'logtags-euphoric': 0.6,
        'logtags-sleepy': 0.4
      },
      {
        'logtags-fatigue': 0.3,
        'logtags-headaches': 0.2
      },
      0.9,
      'Conservative default for general clarity.',
      ['logtags-anxiety']
    ),
    bp1: profile(
      'Bipolar I',
      'Stability first: lower activation, more sleep, less volatility.',
      {
        'logtags-relaxed': 1.3,
        'logtags-sleepy': 1.1,
        'logtags-focused': 0.4,
        'logtags-happy': 0.3
      },
      {
        'logtags-stress': 1.3,
        'logtags-insomnia': 0.8,
        'logtags-pain': 0.4
      },
      {
        'logtags-euphoric': 1.2,
        'logtags-creative': 0.8,
        'logtags-happy': 0.5
      },
      {
        'logtags-depression': 0.2
      },
      1.25,
      'Keep activation low; if the product pushes the edges, it loses points.',
      ['logtags-bipolar-disorder']
    ),
    bp2: profile(
      'Bipolar II',
      'Supportive but restrained: calm, grounded, and less likely to overshoot.',
      {
        'logtags-relaxed': 1.1,
        'logtags-focused': 0.7,
        'logtags-happy': 0.6,
        'logtags-sleepy': 0.7
      },
      {
        'logtags-stress': 1.1,
        'logtags-depression': 0.8,
        'logtags-insomnia': 0.5
      },
      {
        'logtags-euphoric': 0.9,
        'logtags-creative': 0.6,
        'logtags-sleepy': 0.4
      },
      {},
      1.15,
      'Prefer steadiness over bright spikes.',
      ['logtags-bipolar-disorder']
    ),
    cyclo: profile(
      'Cyclothymia',
      'Gentle balance: reduce volatility without flattening the whole profile.',
      {
        'logtags-relaxed': 1.2,
        'logtags-sleepy': 0.9,
        'logtags-focused': 0.5
      },
      {
        'logtags-stress': 1.1,
        'logtags-insomnia': 0.7,
        'logtags-pain': 0.4
      },
      {
        'logtags-euphoric': 1.0,
        'logtags-creative': 0.7
      },
      {},
      1.12,
      'Keep the profile quiet and precise.',
      ['logtags-bipolar-disorder']
    ),
    mdd: profile(
      'Major depressive disorder',
      'Mood lift and relief from heaviness without drifting into chaos.',
      {
        'logtags-happy': 1.4,
        'logtags-euphoric': 1.0,
        'logtags-relaxed': 0.7,
        'logtags-creative': 0.8,
        'logtags-focused': 0.4
      },
      {
        'logtags-depression': 1.3,
        'logtags-stress': 0.9,
        'logtags-fatigue': 0.5
      },
      {
        'logtags-sleepy': 0.7
      },
      {},
      1,
      'Aim for lift, not overcorrection.',
      []
    ),
    pdd: profile(
      'Persistent depressive disorder',
      'A steadier version of relief: less drag, more usable energy.',
      {
        'logtags-relaxed': 1.0,
        'logtags-focused': 0.8,
        'logtags-happy': 0.7,
        'logtags-creative': 0.4
      },
      {
        'logtags-depression': 1.1,
        'logtags-stress': 1.0,
        'logtags-fatigue': 0.5
      },
      {
        'logtags-euphoric': 0.7,
        'logtags-sleepy': 0.5
      },
      {},
      1.02,
      'Prefer durable clarity over a loud spike.',
      []
    ),
    pmdd: profile(
      'PMDD',
      'Body-weighted relief with the volatility kept low.',
      {
        'logtags-relaxed': 1.1,
        'logtags-sleepy': 0.8,
        'logtags-happy': 0.5
      },
      {
        'logtags-cramps': 1.4,
        'logtags-stress': 1.1,
        'logtags-pain': 1.0,
        'logtags-insomnia': 0.4
      },
      {
        'logtags-euphoric': 0.6
      },
      {},
      1.05,
      'Keep the relief clean and the edges soft.',
      ['logtags-pms']
    ),
    sad_seasonal: profile(
      'Seasonal affective disorder',
      'Light, lift, and motion without turning the profile into a rocket.',
      {
        'logtags-happy': 1.3,
        'logtags-euphoric': 1.0,
        'logtags-creative': 0.9,
        'logtags-focused': 0.6,
        'logtags-relaxed': 0.4
      },
      {
        'logtags-depression': 1.3,
        'logtags-fatigue': 1.0,
        'logtags-stress': 0.5
      },
      {
        'logtags-sleepy': 0.7
      },
      {},
      1,
      'Seasonal support should still feel grounded.',
      []
    ),
    sza_bp: profile(
      'Schizoaffective · bipolar',
      'Very cautious by design: favor calm, sleep, and low activation.',
      {
        'logtags-relaxed': 1.2,
        'logtags-sleepy': 1.2,
        'logtags-focused': 0.3
      },
      {
        'logtags-stress': 1.1,
        'logtags-insomnia': 0.7,
        'logtags-pain': 0.3
      },
      {
        'logtags-euphoric': 1.6,
        'logtags-creative': 1.0,
        'logtags-happy': 0.6
      },
      {},
      1.35,
      'Keep activation low; the safest answer is usually the quieter one.',
      ['logtags-bipolar-disorder']
    ),
    sza_dep: profile(
      'Schizoaffective · depressive',
      'Relief without over-activation or needless brightness.',
      {
        'logtags-relaxed': 1.1,
        'logtags-sleepy': 1.0,
        'logtags-focused': 0.4
      },
      {
        'logtags-depression': 1.0,
        'logtags-stress': 1.0,
        'logtags-insomnia': 0.7
      },
      {
        'logtags-euphoric': 1.3,
        'logtags-creative': 0.8
      },
      {},
      1.25,
      'Favor stability and visible caution.',
      []
    ),
    gad: profile(
      'Generalized anxiety',
      'Calm first: soften the nervous system without pushing it sideways.',
      {
        'logtags-relaxed': 1.4,
        'logtags-focused': 0.8,
        'logtags-sleepy': 0.7
      },
      {
        'logtags-stress': 1.2,
        'logtags-insomnia': 0.6
      },
      {
        'logtags-euphoric': 1.0,
        'logtags-creative': 0.6,
        'logtags-happy': 0.4
      },
      {},
      1.15,
      'Lower volatility is usually the safer default.',
      ['logtags-anxiety']
    ),
    social_anx: profile(
      'Social anxiety',
      'Confidence without the wobble: calmer state, workable focus.',
      {
        'logtags-relaxed': 1.3,
        'logtags-focused': 1.0,
        'logtags-happy': 0.5
      },
      {
        'logtags-stress': 1.1
      },
      {
        'logtags-euphoric': 1.0,
        'logtags-creative': 0.7
      },
      {},
      1.1,
      'Prefer social ease over theatrical uplift.',
      ['logtags-anxiety']
    ),
    panic: profile(
      'Panic disorder',
      'Very low activation, more calm, less edge.',
      {
        'logtags-relaxed': 1.5,
        'logtags-sleepy': 1.2,
        'logtags-focused': 0.3
      },
      {
        'logtags-stress': 1.2,
        'logtags-insomnia': 0.9
      },
      {
        'logtags-euphoric': 1.4,
        'logtags-creative': 0.8,
        'logtags-happy': 0.5
      },
      {},
      1.3,
      'The safest answer is the one least likely to intensify the spike.',
      ['logtags-anxiety']
    ),
    ptsd: profile(
      'PTSD',
      'Calm the system, reduce reactivity, and avoid over-stimulating edges.',
      {
        'logtags-relaxed': 1.4,
        'logtags-sleepy': 1.0,
        'logtags-focused': 0.4
      },
      {
        'logtags-stress': 1.2,
        'logtags-insomnia': 0.8,
        'logtags-pain': 0.6
      },
      {
        'logtags-euphoric': 1.2,
        'logtags-creative': 0.7
      },
      {},
      1.18,
      'Use a low-volatility lens; reactivity is the cost to watch.',
      ['logtags-ptsd']
    ),
    gaming_add: profile(
      'Gaming addiction proxy',
      'If the use pattern is a loop, keep the loop from getting stronger.',
      {
        'logtags-relaxed': 1.1,
        'logtags-focused': 0.9,
        'logtags-sleepy': 0.7
      },
      {
        'logtags-stress': 1.0,
        'logtags-fatigue': 0.7
      },
      {
        'logtags-euphoric': 1.5,
        'logtags-happy': 0.9,
        'logtags-creative': 0.8
      },
      {},
      1.35,
      'If this is another ritual loop, treat it as a warning sign.',
      []
    ),
    porn_add: profile(
      'Porn addiction proxy',
      'Keep the reward loop from becoming a second dependency.',
      {
        'logtags-relaxed': 1.1,
        'logtags-focused': 0.9,
        'logtags-sleepy': 0.7
      },
      {
        'logtags-stress': 1.0,
        'logtags-fatigue': 0.7
      },
      {
        'logtags-euphoric': 1.5,
        'logtags-happy': 0.9,
        'logtags-creative': 0.8
      },
      {},
      1.35,
      'Treat escapist reinforcement as part of the problem, not a solution.',
      []
    )
  };
})();
