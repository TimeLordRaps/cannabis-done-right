(() => {
  // Maps the short tag names used in breeder goal definitions to the real `logtags-*`
  // keys in the dataset. Names with no counterpart in the data resolve to [] (contribute 0)
  // rather than silently reading an undefined key.
  const NEGATIVE_ALIASES = {
    paranoia: { negatives: ['logtags-paranoid'] },
    paranoid: { negatives: ['logtags-paranoid'] },
    anxious: { negatives: ['logtags-anxious'] },
    dizzy: { negatives: ['logtags-dizzy'] },
    dry: { negatives: ['logtags-dry-mouth', 'logtags-dry-eyes'] },
    sleepy: { effects: ['logtags-sleepy'] },
    sedated: { effects: ['logtags-sleepy'] }
    // jittery, racing, overstimulated: no data counterpart.
  };
  const SYMPTOM_ALIASES = {
    spasm: ['logtags-muscle-spasms'],
    brain_fog: [],
    social_anx: []
  };
  const prefixed = tag => (String(tag).startsWith('logtags-') ? tag : 'logtags-' + String(tag).replace(/_/g, '-'));

  const pick = (map, keys) => keys.reduce((best, k) => Math.max(best, Number((map || {})[k]) || 0), 0);

  const negativeValue = (strain, tag) => {
    const alias = NEGATIVE_ALIASES[tag] || { negatives: [prefixed(tag)] };
    return Math.max(pick(strain.negatives, alias.negatives || []), pick(strain.effects, alias.effects || []));
  };
  const symptomValue = (strain, tag) => pick(strain.symptoms, SYMPTOM_ALIASES[tag] || [prefixed(tag)]);
  const conditionValue = (strain, tag) => pick(strain.conditions, SYMPTOM_ALIASES[tag] || [prefixed(tag)]);

  const api = { negativeValue, symptomValue, conditionValue, pick, NEGATIVE_ALIASES, SYMPTOM_ALIASES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.finderTags = api;
})();
