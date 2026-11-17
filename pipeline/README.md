# Data pipeline: status and provenance

## What is here

- `strain_pipeline.py` is the script that produced `_data/strains_all.jsonl` and `_data/strains_bipolar.jsonl`.
  Verified: the repo's `strains_all.jsonl` is byte-identical (SHA-256) to the file this pipeline's lineage wrote locally.
- It downloads the Leafly strain dump from `ATreesThrowaway/leafly_strain_vis`, normalizes each strain, evaluates 30 hand-written boolean 3-literal clauses per strain, and writes the JSONL files plus a partial-MaxSAT `.wcnf`.
- `../condition_profiles.py` scores strains against condition profiles and wrote `top100_by_condition.txt`.

## What is NOT here, and was claimed

Commit `97d78f8` says "MaxSAT optimal pipeline: pysat RC2, 42 DSM clauses, r=0.99 validated rankings". Nothing in this repository backs that:

- The commit itself only changed `pages.yml` and one line of `js/strains.js`.
- The only local file matching that description is a ~1 KB stub that imports `pysat` and ends with `# ... rest unchanged until evaluate() ...`. It has no solver call, no 42-clause set, and no validation. Its docstring says `r=0.98`, not 0.99.
- `strain_pipeline.py` here never runs a solver. It only writes a WCNF file. Each strain gets its own disjoint variable block, and the file does not encode the strain's feature values, so a solver run on it would not rank strains or confirm optimality.

So: **no optimality guarantee and no correlation validation exist for the rankings**. The site's finder does not use this pipeline at all. It ranks with the weighted scoring in `js/strains.js` and `js/ranker.js`.

## Provenance and open questions

- Source data: Leafly strain data via a third-party GitHub repo. Redistribution terms of that data are UNVERIFIED. Check them before promoting the site.
- All tag values are crowd-sourced percentages, not measurements of cannabinoid or terpene content.
