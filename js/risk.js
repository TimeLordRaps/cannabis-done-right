(() => {
  const titleFromTag = tag => tag
    .replace(/^logtags-/, '')
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  const topEntries = (map, limit = 2) => Object.entries(map || {})
    .filter(([, value]) => Number(value) > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  const analyzeRisk = strain => {
    const negatives = strain.negatives || {};
    const effects = strain.effects || {};
    const topNegatives = topEntries(negatives, 3).map(([tag, value]) => ({
      tag,
      label: titleFromTag(tag),
      value: Number(value)
    }));

    const negativeLoad = Object.values(negatives).reduce((sum, value) => sum + Number(value || 0), 0);
    // Data keys are 'logtags-*'; unprefixed keys kept for back-compat with older exports.
    const paranoiaLoad = ['logtags-paranoid', 'logtags-anxious', 'logtags-paranoia', 'logtags-anxiety', 'paranoid', 'anxious', 'paranoia']
      .reduce((sum, key) => sum + Number(negatives[key] || 0), 0);
    const activation = Number(effects['logtags-uplifted'] || 0)
      + Number(effects['logtags-euphoric'] || 0)
      + Number(effects['logtags-energetic'] || 0)
      + Number(effects['logtags-talkative'] || 0);
    const anchor = Number(effects['logtags-relaxed'] || 0)
      + Number(effects['logtags-sleepy'] || 0)
      + Number(effects['logtags-sedating'] || 0)
      + Number(effects['logtags-focused'] || 0)
      + Number(effects['logtags-balanced'] || 0);
    const gap = Math.max(0, activation - anchor);

    let label = 'Low';
    let className = 'tag--low';
    let message = 'Lower penalty than most.';
    const reasons = [];

    if (paranoiaLoad >= 18 || negativeLoad >= 36 || gap >= 24) {
      label = 'High';
      className = 'tag--high';
      message = 'Activation or volatility risk is higher here.';
      reasons.push('Paranoia or anxiety signals are strong enough to push the band upward.');
      reasons.push(gap >= 24 ? 'Activation outruns the relaxation/focus anchor.' : 'The anchor is present, but not strong enough to fully contain the activation side.');
      if (topNegatives.length) {
        reasons.push(`Top caution tags: ${topNegatives.slice(0, 2).map(item => item.label).join(' · ')}.`);
      }
    } else if (paranoiaLoad >= 10 || negativeLoad >= 15 || gap >= 11) {
      label = 'Moderate';
      className = 'tag--mod';
      message = 'Tradeoff visible; stay cautious.';
      reasons.push('Visible caution tags are present, but not dominant enough for a hard stop.');
      reasons.push(gap >= 11 ? 'Activation is a little ahead of the anchor.' : 'The anchor is present, but only moderately strong.');
      if (topNegatives.length) {
        reasons.push(`Main caution tags: ${topNegatives.slice(0, 2).map(item => item.label).join(' · ')}.`);
      }
    } else {
      reasons.push('Negative load stays modest.');
      reasons.push('Activation and anchor stay reasonably balanced.');
      if (topNegatives.length) {
        reasons.push(`Small caution signals are visible, especially ${topNegatives.slice(0, 2).map(item => item.label).join(' · ')}.`);
      } else {
        reasons.push('No major caution tags surfaced in the bundled data slice.');
      }
    }

    return {
      label,
      className,
      message,
      reasons,
      negativeLoad,
      paranoiaLoad,
      activation,
      anchor,
      gap,
      topNegatives
    };
  };

  const api = { titleFromTag, topEntries, analyzeRisk };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.finderRisk = api;
})();

