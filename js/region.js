(() => {
  // Region + age gate logic. Pure so it is unit tested.
  // A jurisdiction entry: { code, group, name, status: 'allowed'|'blocked', minAge, source, verified }.
  // Anything not listed as 'allowed' is blocked (fail closed), including "somewhere else".
  const OTHER = { code: 'other', group: 'Elsewhere', name: 'Somewhere else', status: 'blocked' };

  const find = (jurisdictions, code) => [...jurisdictions, OTHER].find(j => j.code === code) || null;

  // age: 'yes' | 'no' | 'unsure' (answer to: over the legal age where you live, or have medical authorization?)
  const decide = (jurisdictions, code, age) => {
    const j = find(jurisdictions, code);
    if (!j) return { allowed: false, stage: 'region', reason: 'no-region' };
    if (j.status !== 'allowed') return { allowed: false, stage: 'region', reason: 'region-blocked', jurisdiction: j };
    if (age === undefined || age === null) return { allowed: false, stage: 'age', reason: 'age-pending', jurisdiction: j };
    if (age !== 'yes') return { allowed: false, stage: 'age', reason: 'age-not-confirmed', jurisdiction: j };
    return { allowed: true, stage: 'done', jurisdiction: j };
  };

  const ageQuestion = j => j && j.minAge
    ? `Are you ${j.minAge} or older (the legal age in ${j.name}), or do you have medical authorization or support to use cannabis?`
    : 'Are you over the legal age of majority to consume cannabis where you live, or do you have medical authorization or support for use?';

  const api = { OTHER, find, decide, ageQuestion };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.regionGateLogic = api;
})();
