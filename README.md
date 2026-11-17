# Cannabis Done Right

A static harm-reduction / decision-support site (Jekyll on GitHub Pages). Educational only, not medical advice.

- **Strain Finder** (`finder.md`): ranks ~2,100 strains against selected conditions with a conservative risk penalty. Includes fictional **example profiles** that pre-select condition combinations.
- **Strain Breeder** (`breeder.md`): concept simulator.
- **Myths** (`myths.md`) and a quit-first reset on the home page.

## Layout

| Path | Purpose |
|---|---|
| `_data/strains_all.json` | Source strain dataset (`.jsonl` copy is used by `condition_profiles.py`) |
| `_data/example_profiles.json` | Example personas for the finder; add an entry and it appears automatically |
| `data/strains.min.json` | Generated slim copy fetched by the finder (`python scripts/build_min_data.py`) |
| `js/risk.js` | Risk-band logic (pure, unit-tested) |
| `js/strains.js`, `js/ranker.js` | Condition profiles and ranking UI |
| `test/` | `npm test` (Node 18+, no dependencies) |

## Develop

```
python scripts/build_min_data.py   # after changing _data/strains_all.json
npm test
bundle exec jekyll serve
```

## Deploy

GitHub Actions workflow `pages.yml`. In the repo settings, Pages → Source must be set to **GitHub Actions** (the workflow token cannot create the Pages site itself).

## Pipeline status

See [pipeline/README.md](pipeline/README.md). In short: the earlier claim of a validated, provably optimal MaxSAT ranking is not supported by any code in this repo; the finder uses weighted scoring in JS.

## Known limits

- Risk bands in `js/risk.js` are relative to this dataset (cutoffs anchored to percentiles; see `node scripts/calibrate_risk.js`), not clinical cutoffs.
- Strains with fewer than 10 ratings are flagged as noisy.
- Only two claims on the Myths page are cited to published studies; the rest is interpretive guidance.
- Example profiles are fictional and carry per-profile cautions. For mood disorders, talk to a prescriber before using cannabis.
