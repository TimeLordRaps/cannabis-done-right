// Prints the dataset percentiles that js/risk.js THRESHOLDS are anchored to.
//   node scripts/calibrate_risk.js
const path = require('node:path');
const { analyzeRisk, THRESHOLDS } = require('../js/risk.js');

const data = require(path.join(__dirname, '..', '_data', 'strains_all.json'));
const rows = data.map(analyzeRisk);
const pctRank = (values, cutoff) => values.filter(v => v < cutoff).length / values.length;
const metrics = { paranoia: 'paranoiaLoad', negative: 'negativeLoad', gap: 'gap' };

const out = {};
for (const band of ['moderate', 'high']) {
  out[band] = {};
  for (const [key, field] of Object.entries(metrics)) {
    out[band][key] = { cutoff: THRESHOLDS[band][key], percentile: +(100 * pctRank(rows.map(r => r[field]), THRESHOLDS[band][key])).toFixed(1) };
  }
}
const share = label => +(100 * rows.filter(r => r.label === label).length / rows.length).toFixed(1);
const report = { strains: rows.length, out, bandShare: { Low: share('Low'), Moderate: share('Moderate'), High: share('High') } };
if (require.main === module) console.log(JSON.stringify(report, null, 2));
module.exports = report;

