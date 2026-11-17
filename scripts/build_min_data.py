"""Build data/strains.min.json (the file the finder fetches) from _data/strains_all.json.

Keeps only the fields js/strains.js + js/ranker.js read. Run after the source data changes:
    python scripts/build_min_data.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "_data" / "strains_all.json"
DST = ROOT / "data" / "strains.min.json"
KEEP = ("id", "name", "slug", "category", "effects", "symptoms", "negatives", "conditions")

rows = json.loads(SRC.read_text(encoding="utf-8"))
out = [{k: r.get(k, {} if k in ("effects", "symptoms", "negatives", "conditions") else "") for k in KEEP} for r in rows]
DST.parent.mkdir(exist_ok=True)
DST.write_text(json.dumps(out, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
print(f"{len(out)} strains -> {DST} ({DST.stat().st_size:,} bytes)")
