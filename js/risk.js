"use strict";
// Dataset-relative risk bands for the strain finder.
//
// THRESHOLDS are percentile anchored, not clinical cutoffs. Inputs are crowd-sourced tag
// percentages, so a band means "high compared with the other strains in this dataset".
//   negativeLoad  = sum of negative-effect tag values   (High ~ p89, Moderate ~ p62)
//   gap           = activation - anchor (sum of % tag values, can exceed 100) (High ~ p90, Moderate ~ p75)
//   paranoiaLoad  = paranoid + anxious tag values       (kept from the original design; High ~ p97, Moderate ~ p94)
// Regenerate the table with `node scripts/calibrate_risk.js` after the dataset changes;
// test/risk.test.js fails if the cutoffs drift away from those percentiles.
(() => {
  const THRESHOLDS = {
    high: { paranoia: 18, negative: 36, gap: 125 },
    moderate: { paranoia: 10, negative: 15, gap: 61 },
    lowEvidenceRatings: 10
  };

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

  // Effect tags that actually exist in the dataset. (The old anchor also listed
  // sedating/balanced, which no strain has; removing them changes no result.)
  const ACTIVATION_TAGS = ['logtags-uplifted', 'logtags-euphoric', 'logtags-energetic', 'logtags-talkative'];
  const ANCHOR_TAGS = ['logtags-relaxed', 'logtags-sleepy', 'logtags-focused'];
  // Data keys are 'logtags-*'; unprefixed keys kept for back-compat with older exports.
  const PARANOIA_TAGS = ['logtags-paranoid', 'logtags-anxious', 'logtags-paranoia', 'logtags-anxiety', 'paranoid', 'anxious', 'paranoia'];

  const sum = (map, keys) => keys.reduce((total, key) => total + Number((map || {})[key] || 0), 0);

  const analyzeRisk = strain => {
    const negatives = strain.negatives || {};
    const effects = strain.effects || {};
    const topNegatives = topEntries(negatives, 3).map(([tag, value]) => ({
      tag,
      label: titleFromTag(tag),
      value: Number(value)
    }));

    const negativeLoad = Object.values(negatives).reduce((total, value) => total + Number(value || 0), 0);
    const paranoiaLoad = sum(negatives, PARANOIA_TAGS);
    const activation = sum(effects, ACTIVATION_TAGS);
    const anchor = sum(effects, ANCHOR_TAGS);
    const gap = Math.max(0, activation - anchor);
    const ratings = Number(strain.rating_count);
    const lowEvidence = Number.isFinite(ratings) && ratings < THRESHOLDS.lowEvidenceRatings;

    const triggers = band => {
      const t = THRESHOLDS[band];
      const list = [];
      if (paranoiaLoad >= t.paranoia) list.push('paranoia');
      if (negativeLoad >= t.negative) list.push('negative');
      if (gap >= t.gap) list.push('gap');
      return list;
    };
    const explain = (fired, strong) => {
      const out = [];
      if (fired.includes('paranoia')) out.push(`Paranoia/anxiety tags are ${strong ? 'strong' : 'visible'} (${paranoiaLoad.toFixed(0)}).`);
      if (fired.includes('negative')) out.push(`Combined negative-effect load is ${strong ? 'high' : 'elevated'} (${negativeLoad.toFixed(0)}).`);
      if (fired.includes('gap')) out.push(strong ? 'Activation outruns the relaxation/focus anchor by a wide margin.' : 'Activation is ahead of the relaxation/focus anchor.');
      return out;
    };

    let label = 'Low';
    let className = 'tag--low';
    let message = 'Lower penalty than most.';
    const reasons = [];
    const high = triggers('high');
    const moderate = triggers('moderate');

    if (high.length) {
      label = 'High';
      className = 'tag--high';
      message = 'Activation or volatility risk is higher here.';
      reasons.push(...explain(high, true));
      if (topNegatives.length) {
        reasons.push(`Top caution tags: ${topNegatives.slice(0, 2).map(item => item.label).join(' · ')}.`);
      }
    } else if (moderate.length) {
      label = 'Moderate';
      className = 'tag--mod';
      message = 'Tradeoff visible; stay cautious.';
      reasons.push(...explain(moderate, false));
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

    if (lowEvidence) {
      reasons.push(`Based on only ${ratings} ratings, so this band is noisy.`);
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
      topNegatives,
      lowEvidence
    };
  };

  const api = { titleFromTag, topEntries, analyzeRisk, THRESHOLDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.finderRisk = api;
})();
