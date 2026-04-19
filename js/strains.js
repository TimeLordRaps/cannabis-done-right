// Load strains data
fetch('/data/strains_optimal.jsonl').then(r => r.json()).then(data => data = data.map(JSON.parse)) // Optimal MaxSAT data
  .then(r => r.json())
  .then(data => window.strains = data);

// Profiles from condition_profiles.py (port to JS)
window.profiles = {
  bp1: {
    target_vars: ['no_mania_unanchored', 'relaxed', 'stress_relief', 'no_paranoia', 'no_anxiety_fx', 'not_pure_indica', 'symptom_spanning'],
    anti_vars: [],
    weight_map: {
      'no_mania_unanchored': 3.0,
      'relaxed': 2.5,
      'stress_relief': 2.0,
      'no_paranoia': 2.0,
      'no_anxiety_fx': 2.0,
      'bipolar_validated': 3.0,
      'paradox_resolved': 2.5,
      'dep_relief': 1.5,
      'uplifted': 1.0
    },
    epiphanic: true,
    thc_risk: 'MODERATE'
  }
  // Add more profiles from condition_profiles.py as needed
};
