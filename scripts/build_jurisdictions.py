"""Regenerate _data/jurisdictions.json: Canada (kept as curated), US states + DC, and countries.

Source: English Wikipedia (secondary), pinned by revision id and retrieval date in each entry's
`verified` field. Wikipedia colour/status classes are mapped like this:

  recreational "yes"  -> use "adult-use"  (allowed)
  medical "yes"       -> use "medical"    (allowed)
  anything else       -> blocked ("partial" = decriminalised / limited / de facto, NOT counted as legal)

US states are all listed (blocked ones included, so a visitor in e.g. Kansas gets the blocked page
rather than having to pick "Somewhere else"). Only countries that are allowed are listed.
Run:  python scripts/build_jurisdictions.py
Review the diff before committing: this is a legal-status list and must be rechecked against
official sources before anyone relies on it.
"""
import datetime
import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "_data" / "jurisdictions.json"
UA = {"User-Agent": "cannabis-done-right-build/1.0 (github.com/TimeLordRaps/cannabis-done-right)"}
TODAY = datetime.date.today().isoformat()


def wikitext(page):
    q = urllib.parse.urlencode({"action": "parse", "page": page, "prop": "wikitext|revid", "format": "json", "formatversion": 2})
    req = urllib.request.Request("https://en.wikipedia.org/w/api.php?" + q, headers=UA)
    with urllib.request.urlopen(req, timeout=40) as r:
        d = json.load(r)["parse"]
    return d["wikitext"], d["revid"]


def strip(t):
    t = re.sub(r"<!--[\s\S]*?-->", "", t)
    t = re.sub(r"<ref[^>]*/>", "", t)
    return re.sub(r"<ref[\s\S]*?</ref>", "", t)


def klass(cell):
    if re.search(r"\{\{\s*yes", cell, re.I):
        return "yes"
    if re.search(r"\{\{\s*partial", cell, re.I):
        return "partial"
    if re.search(r"\{\{\s*no", cell, re.I):
        return "no"
    return None


def parse_countries(text):
    s = text.index("== By country ==")
    e = text.index("==See also==")
    rows = re.split(r"\n\|-\s*\n", strip(text[s:e]))
    out = {}
    for r in rows:
        m = re.search(r"\{\{[Ff]lag(?:icon)?\|([^}|]+)(?:\|[^}]*)?\}\}\s*\n\|\s*([\s\S]*?)\|\|\s*([\s\S]*?)\|\|", r)
        if not m:
            continue
        rec, med = klass(m.group(2)), klass(m.group(3))
        if rec is None or med is None:
            sys.exit(f"unclassified row: {m.group(1)}")
        out[m.group(1).strip()] = (rec, med)
    return out


STATE_COLORS = {"#196E92": "adult-use", "#80CE69": "medical", "#C4C9CD": "none"}


def parse_states(text):
    states = {}
    for m in re.finditer(r'\|- id="?([^"\n]+)"?\n\|\s*\{\{flag\|([^}]+)\}\}\n\|\s*style="background:(#[0-9A-Fa-f]+)', strip(text)):
        states[m.group(1).strip()] = STATE_COLORS[m.group(3).upper()]
    return states


def main():
    keep = [j for j in json.loads(OUT.read_text(encoding="utf-8")) if j.get("group") == "Canada"]

    world, wrev = wikitext("Legality_of_cannabis")
    us, urev = wikitext("Legality_of_cannabis_by_U.S._jurisdiction")
    countries = parse_countries(world)
    states = parse_states(us)

    adult = sorted(n for n, u in states.items() if u == "adult-use")
    if len(states) != 50:
        sys.exit(f"expected 50 states, parsed {len(states)}")
    if len(adult) != 24:
        sys.exit(f"expected 24 adult-use states (NCSL cross-check 2026-11-18), got {len(adult)}: {adult}")

    wsrc = f"https://en.wikipedia.org/w/index.php?title=Legality_of_cannabis&oldid={wrev}"
    usrc = f"https://en.wikipedia.org/w/index.php?title=Legality_of_cannabis_by_U.S._jurisdiction&oldid={urev}"
    entries = list(keep)

    for name in sorted(states):
        use = states[name]
        entries.append({
            "code": "US-" + re.sub(r"[^A-Z]", "", name.upper())[:12],
            "group": "United States",
            "name": name,
            "status": "blocked" if use == "none" else "allowed",
            "use": use,
            "minAge": 21 if use == "adult-use" else None,
            "source": usrc,
            "verified": f"secondary: Wikipedia revision {urev}, retrieved {TODAY}; adult-use count (24) matches the NCSL summary. Official state law not checked.",
        })
    entries.append({
        "code": "US-DC", "group": "United States", "name": "District of Columbia", "status": "allowed",
        "use": "adult-use", "minAge": 21,
        "source": "https://www.ncsl.org/health/state-medical-cannabis-laws",
        "verified": f"secondary: listed as an adult-use jurisdiction in an NCSL summary found by web search, {TODAY}. Not in the Wikipedia state table. Official law not checked.",
    })

    for name in sorted(countries):
        rec, med = countries[name]
        if name in ("Canada", "United States"):
            continue  # handled by province / state entries
        if rec != "yes" and med != "yes":
            continue
        use = "adult-use" if rec == "yes" else "medical"
        entries.append({
            "code": "WORLD-" + re.sub(r"[^A-Z]", "", name.upper())[:14],
            "group": "Other countries",
            "name": name,
            "status": "allowed",
            "use": use,
            "minAge": None,
            "source": wsrc,
            "verified": f"secondary: Wikipedia revision {wrev}, retrieved {TODAY}. Table says recreational={rec}, medical={med}. Official law not checked.",
        })

    codes = [e["code"] for e in entries]
    dup = {c for c in codes if codes.count(c) > 1}
    if dup:
        sys.exit(f"duplicate codes: {dup}")
    OUT.write_text(json.dumps(entries, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    allowed = [e for e in entries if e["status"] == "allowed"]
    print(f"{len(entries)} entries, {len(allowed)} allowed "
          f"(Canada {sum(e['group']=='Canada' for e in allowed)}, US {sum(e['group']=='United States' for e in allowed)}, "
          f"countries {sum(e['group']=='Other countries' for e in allowed)})")


if __name__ == "__main__":
    main()
