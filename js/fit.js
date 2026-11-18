(() => {
  const risk = (typeof require !== 'undefined' && typeof module !== 'undefined') ? require('./risk.js') : window.finderRisk;
  const { analyzeRisk } = risk;

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


  // Score every strain against one or more profiles; returns the full ranked list.
  const rankStrains = (strains, profiles) => strains
    .map(strain => {
      const evaluations = profiles.map(profile => ({ profile, ...evaluateProfile(strain, profile) }));
      const fitScore = evaluations.reduce((sum, item) => sum + item.score, 0) / Math.max(1, evaluations.length);
      const riskScore = evaluations.reduce((sum, item) => sum + item.risk, 0) / Math.max(1, evaluations.length);
      return { strain, evaluations, fitScore, riskScore, riskBand: analyzeRisk(strain) };
    })
    .sort((a, b) => b.fitScore - a.fitScore);

  const api = { evaluateProfile, rankStrains };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.finderFit = api;
})();
