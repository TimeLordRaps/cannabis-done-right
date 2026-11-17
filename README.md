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

## Known limits

- Risk thresholds in `js/risk.js` are heuristics over crowd-sourced tag percentages, not clinical cutoffs.
- Example profiles are fictional and carry per-profile cautions. For mood disorders, talk to a prescriber before using cannabis.
