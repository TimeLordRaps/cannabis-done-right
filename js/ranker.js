document.getElementById('condition-form').addEventListener('submit', e => {
  e.preventDefault();
  const conditions = Array.from(document.getElementById('conditions').selectedOptions).map(opt => opt.value);
  const results = rankStrains(conditions);
  displayResults(results);
});

function rankStrains(conds) {
  return window.strains
    .map(s => ({
      ...s,
      score: calculateScore(s, conds)
    }))
    .sort((a,b) => b.score - a.score)
    .slice(0,20);
}

function calculateScore(strain, conds) {
  let score = 0;
  conds.forEach(c => {
    const profile = window.profiles[c];
    // Port scoring logic here
    score += profileScore(strain, profile);
  });
  return score;
}

function profileScore(strain, profile) {
  let score = 0;

  // Hard requirements
  for (let v of profile.target_vars) {
    if (strain.sat.bvars[v]) score += 10;
  }
  for (let v of profile.anti_vars) {
    if (!strain.sat.bvars[v]) return 0; // Fail hard contraindication
  }

  // Weighted bvars
  for (let [v, w] of Object.entries(profile.weight_map)) {
    if (strain.sat.bvars[v]) score += w * strain.sat.bipolar_score / 100;
  }

  // Epiphanic
  if (profile.epiphanic !== null) {
    const anchored = anchoredEuphoria(strain);
    score += profile.epiphanic ? (anchored ? 20 : -10) : 0;
  }

  // THC risk adjustment
  if (profile.thc_risk === 'HIGH' && !strain.sat.bvars.cbd_ancestry) score *= 0.5;

  return score;
}

function anchoredEuphoria(s) {
  const eu = s.effects['logtags-euphoric'] || 0;
  const rx = s.effects['logtags-relaxed'] || 0;
  return eu >= 10 && rx >= 30;
}

function displayResults(results) {
  // Render table with harm thresholds
  document.getElementById('results').innerHTML = `
    <table>
      <tr><th>Rank</th><th>Strain</th><th>Score</th><th>Harm Risk</th></tr>
      ${results.map((r,i) => `<tr><td>${i+1}</td><td>${r.name}</td><td>${r.score.toFixed(1)}</td><td>${riskLevel(r)}</td></tr>`).join('')}
    </table>
  `;
}

function riskLevel(s) {
  const paranoia = s.negatives?.['logtags-paranoid'] || 0;
  const anxiety = s.negatives?.['logtags-anxious'] || 0;
  const totalNeg = Object.values(s.negatives || {}).reduce((a,b)=>a+b,0);
  if (paranoia > 5 || anxiety > 5 || totalNeg > 20) return 'High';
  if (totalNeg > 10) return 'Mod';
  return 'Low';
}
