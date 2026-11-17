#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["httpx", "rich"]
# ///
"""
Cannabis Strain JSONL Pipeline + Bipolar MaxSAT Scorer
Tyler Roost / The TimeLord
Source: https://github.com/ATreesThrowaway/leafly_strain_vis/blob/master/strains.json

30 boolean variables per strain,
30 proper 3-literal CNF clauses, WCNF output for MaxSAT solver.
Shadow-gradient insight: bipolar regulation requires simultaneous
ascending (depressive floor) AND descending (manic ceiling) paths.
A strain is a solution when it satisfies both paths at once.

Outputs:
  strains_all.jsonl         — all strains, normalized + clause results
  strains_bipolar.jsonl     — clause_count >= 20
  lineage_candidates.jsonl  — full solutions (clause_count == 30)
  limitless_candidates.wcnf — MaxSAT WCNF for external solver
"""

import json
import httpx
from pathlib import Path
from rich.console import Console
from rich.table import Table

console = Console()

STRAINS_URL = (
    "https://raw.githubusercontent.com/ATreesThrowaway/"
    "leafly_strain_vis/master/strains.json"
)
OUT_DIR      = Path(__file__).parent
ALL_JSONL    = OUT_DIR / "strains_all.jsonl"
BIPOLAR_JSONL = OUT_DIR / "strains_bipolar.jsonl"
LINEAGE_JSONL = OUT_DIR / "lineage_candidates.jsonl"
WCNF_OUT     = OUT_DIR / "limitless_candidates.wcnf"

# High-CBD parent strains — lineage proxy for CBD genetics
CBD_ANCESTORS = {
    "harlequin", "acdc", "cannatonic", "charlotte", "ringo",
    "harle-tsu", "canna-tsu", "penelope", "remedy", "elektra",
    "lifter", "sour tsunami", "cbd critical", "r4",
}


# ---------------------------------------------------------------------------
# Normalize raw Leafly strain to flat dict
# ---------------------------------------------------------------------------
def normalize(raw: dict) -> dict:
    tags     = {t["Id"]: t["Score"] for t in raw.get("Tags", [])}
    negs     = {t["Id"]: t["Score"] for t in raw.get("NegativeEffects", [])}
    symptoms = {t["Id"]: t["Score"] for t in raw.get("Symptoms", [])}
    conds    = {t["Id"]: t["Score"] for t in raw.get("Conditions", [])}
    flavors  = {t["Id"]: t["Score"] for t in raw.get("Flavors", [])}
    parents  = [{"name": p["Name"], "category": p["Category"]}
                for p in raw.get("Parents", [])]
    parent_names = " ".join(p["name"].lower() for p in parents)

    return {
        "id":           raw.get("Id"),
        "name":         raw.get("Name"),
        "slug":         raw.get("UrlName"),
        "category":     raw.get("Category", ""),
        "pct_indica":   raw.get("PercentIndica") or 0,
        "pct_sativa":   raw.get("PercentSativa") or 0,
        "rating":       raw.get("Rating", 0.0),
        "rating_count": raw.get("RatingCount", 0),
        "parents":      parents,
        "parent_names": parent_names,
        "effects":      tags,
        "negatives":    negs,
        "symptoms":     symptoms,
        "conditions":   conds,
        "flavors":      flavors,
        "abstract":     raw.get("Abstract", ""),
    }


# ---------------------------------------------------------------------------
# Boolean variable extraction (30 variables, v1..v30)
# Each returns True/False for a normalized strain.
# ---------------------------------------------------------------------------
def fx(s, k):   return s["effects"].get(k, 0.0)
def fn(s, k):   return s["negatives"].get(k, 0.0)
def fsym(s, k): return s["symptoms"].get(k, 0.0)
def fc(s, k):   return s["conditions"].get(k, 0.0)
def ffl(s, k):  return s["flavors"].get(k, 0.0)


def extract_vars(s: dict) -> list[bool]:
    """
    Returns boolean vector [v1..v31].
    Variables are grouped by phase + property type.
    v31: anchored_euphoria — the epiphanic window.
         Euphoria present but anchored by strong relaxation.
         This is the therapeutic working surface between floor and ceiling.
         Not mania. Not sedation. The gap where insight lives.
    """
    pnames = s["parent_names"]

    # --- DEPRESSIVE PHASE FLOOR (v1-v10) ---
    v1  = fsym(s, "logtags-depression")   >= 12.0   # relieves depression
    v2  = fsym(s, "logtags-fatigue")      >= 8.0    # relieves fatigue/lethargy
    v3  = fx(s,  "logtags-uplifted")      >= 25.0   # uplifting signal
    v4  = fx(s,  "logtags-euphoric")      >= 20.0   # euphoric signal
    v5  = fx(s,  "logtags-energetic")     >= 12.0   # energetic (lifts inertia)
    v6  = fx(s,  "logtags-focused")       >= 10.0   # focus preserved
    v7  = fx(s,  "logtags-creative")      >= 10.0   # creative preserved
    v8  = fx(s,  "logtags-happy")         >= 20.0   # happy signal present
    v9  = fx(s,  "logtags-sleepy")        <= 25.0   # NOT too sedating
    v10 = fx(s,  "logtags-lazy")          <= 20.0   # NOT lazy-trapping

    # --- MANIC PHASE CEILING (v11-v18) ---
    v11 = fsym(s, "logtags-stress")       >= 15.0   # stress relief
    v12 = fsym(s, "logtags-insomnia")     >= 5.0    # sleep support (mania interrupt)
    v13 = fc(s,  "logtags-anxiety")       >= 5.0    # anxiety condition relief
    v14 = fn(s,  "logtags-paranoid")      <= 2.5    # low paranoia induction
    v15 = fn(s,  "logtags-anxious")       <= 1.8    # low anxiety induction
    v16 = fn(s,  "logtags-dizzy")         <= 2.0    # low dizziness
    v17 = not (fx(s, "logtags-euphoric")  >= 60.0
               and fx(s, "logtags-energetic") >= 40.0
               and fx(s, "logtags-relaxed")    < 20.0)  # no unanchored mania
    v18 = fx(s,  "logtags-relaxed")       >= 20.0   # relaxation present

    # --- BIPHASIC BALANCE — must work for BOTH phases (v19-v24) ---
    v19 = fc(s,  "logtags-bipolar-disorder") >= 3.0  # user-validated for bipolar
    v20 = fc(s,  "logtags-ptsd")             >= 2.0  # PTSD (comorbid regulation)
    v21 = (fx(s, "logtags-uplifted") - fx(s, "logtags-sleepy")) >= 0  # net upward
    v22 = (fx(s, "logtags-uplifted") + fx(s, "logtags-euphoric")
           + fx(s, "logtags-happy")) >= 55.0             # compound mood signal
    v23 = (fx(s, "logtags-uplifted") >= 15.0
           and fx(s, "logtags-relaxed") >= 15.0)         # paradox resolved: both up & calm
    v24 = (fsym(s, "logtags-depression") + fsym(s, "logtags-stress")) >= 25.0  # spanning

    # --- NEUROCHEMISTRY TERPENE PROXIES (v25-v27) ---
    limonene_fl   = (ffl(s, "logtags-citrus") + ffl(s, "logtags-lemon")
                     + ffl(s, "logtags-orange") + ffl(s, "logtags-lime"))
    caryo_fl      = (ffl(s, "logtags-pepper") + ffl(s, "logtags-spicy")
                     + ffl(s, "logtags-woody") + ffl(s, "logtags-earthy"))
    linalool_fl   = (ffl(s, "logtags-flowery") + ffl(s, "logtags-lavender")
                     + ffl(s, "logtags-sweet"))
    v25 = limonene_fl  >= 10.0   # limonene proxy: mood lift + anti-anxiety
    v26 = caryo_fl     >= 15.0   # caryophyllene proxy: CB2 anchor
    v27 = linalool_fl  >= 10.0   # linalool proxy: GABAergic ceiling

    # --- GENETIC + QUALITY GATES (v28-v30) ---
    cbd_hit = any(cbd in pnames for cbd in CBD_ANCESTORS)
    v28 = cbd_hit or fc(s, "logtags-bipolar-disorder") >= 8.0  # CBD ancestry or strong validation
    v29 = s["rating_count"]  >= 20 and s["rating"] >= 7.0      # quality gate
    v30 = s["category"] != "Indica" or s["pct_sativa"] >= 20   # not pure indica

    # --- EPIPHANIC WINDOW (v31) ---
    # Anchored euphoria: euphoria present AND strongly anchored by relaxation.
    # This is NOT mania. Mania is euphoric >= 60 + energetic >= 40 + relaxed < 20.
    # This is the therapeutic gap between the floor and ceiling where cognitive
    # reframes, emotional releases, and genuine insight occur.
    # Terpene mechanism: limonene (dopamine/serotonin carrier) +
    #                    caryophyllene (CB2 anchor = the brake)
    # Clinical analog: ketamine's therapeutic window — controlled dissociative
    #                  euphoria that enables memory reconsolidation.
    # Myelination relevance: endocannabinoid signaling modulates oligodendrocyte
    #                        function; CBD + anchored THC states may support
    #                        remyelination (requires wet-lab verification —
    #                        no proxy available in Leafly data).
    v31 = (fx(s, "logtags-euphoric") >= 10.0 and
           fx(s, "logtags-relaxed")  >= 30.0)

    # --- PSYCHOSIS / THOUGHT ANCHORING CLUSTER (v32-v35) ---
    #
    # Thought relaying (thought insertion/broadcasting) is a first-rank
    # Schneiderian symptom: thoughts feel transmitted or received externally.
    # Mechanism: excess mesolimbic dopamine -> aberrant salience assignment.
    # CBD addresses this via 5-HT1A agonism + D2 partial agonism + CB1 modulation.
    # These four variables triangulate the psychosis-safe window from available
    # Leafly proxy signals.

    # v32: no_thought_racing
    # Thought racing proxy: high euphoria + high focus WITHOUT relaxation grounding.
    # Distinct from no_mania_unanchored (which also requires energetic).
    # Thought relaying often presents with euphoria+focus but not motor activation —
    # the pressure of ideas without the physical drive. When relaxation is absent,
    # this pattern can escalate into insertion/broadcast phenomenology.
    v32 = not (fx(s, "logtags-euphoric") >= 45.0
               and fx(s, "logtags-focused") >= 25.0
               and fx(s, "logtags-relaxed") <  15.0)

    # v33: psychosis_safe
    # Ultra-strict dual paranoia+anxiety gate. v14 (no_paranoia) allows <= 2.5,
    # v15 (no_anxiety_fx) allows <= 1.8. This requires BOTH <= 1.0 simultaneously.
    # The conjunction is the key — paranoia AND anxiety together is the break state.
    # A strain can have mild paranoia or mild anxiety induction alone and still be
    # manageable; having both at any meaningful level is the psychotic break door.
    v33 = (fn(s, "logtags-paranoid") <= 1.0 and
           fn(s, "logtags-anxious")  <= 1.0)

    # v34: grounded
    # Physical groundedness prevents derealization and dissociation.
    # Three-axis requirement: strong relaxation (soma present) +
    # low dizziness (vestibular stable = no depersonalization) +
    # low headache (vascular calm = no cerebrovascular activation).
    # Dizziness in cannabis is a marker of excessive CB1 activation in cerebellum;
    # headache induction tracks with vasodilation events that can amplify
    # hyperarousal and perceptual distortion.
    v34 = (fx(s, "logtags-relaxed")      >= 35.0 and
           fn(s, "logtags-dizzy")         <= 1.0  and
           fn(s, "logtags-headache")      <= 1.5)

    # v35: sza_anchor
    # The three-way SZA anchor: CBD genetics + ultra-strict paranoia ceiling +
    # sufficient relaxation. All three must be present simultaneously.
    # CBD genetics = antipsychotic mechanism (hard).
    # fn(paranoid) <= 1.5 = stricter than no_paranoia (2.5) but less than
    # psychosis_safe (1.0) — the SZA-specific intermediate threshold.
    # relaxed >= 25 = grounding floor (lower than grounded's 35 to allow
    # strains that hit the CBD+paranoia gate without full body sedation).
    v35 = (cbd_hit and
           fn(s, "logtags-paranoid") <= 1.5 and
           fx(s, "logtags-relaxed")  >= 25.0)

    return [v1,v2,v3,v4,v5,v6,v7,v8,v9,v10,
            v11,v12,v13,v14,v15,v16,v17,v18,
            v19,v20,v21,v22,v23,v24,
            v25,v26,v27,
            v28,v29,v30,
            v31,
            v32,v33,v34,v35]


VAR_NAMES = [
    # Depressive floor
    "dep_relief", "fatigue_relief", "uplifted", "euphoric", "energetic",
    "focused", "creative", "happy", "not_sleepy", "not_lazy",
    # Manic ceiling
    "stress_relief", "insomnia_relief", "anxiety_cond", "no_paranoia",
    "no_anxiety_fx", "no_dizziness", "no_mania_unanchored", "relaxed",
    # Biphasic balance
    "bipolar_validated", "ptsd_cond", "net_upward", "compound_mood",
    "paradox_resolved", "symptom_spanning",
    # Terpene proxies
    "limonene_proxy", "caryophyllene_proxy", "linalool_proxy",
    # Genetic + quality
    "cbd_ancestry", "quality_gate", "not_pure_indica",
    # Epiphanic window
    "anchored_euphoria",
    # Psychosis / thought anchoring cluster
    "no_thought_racing", "psychosis_safe", "grounded", "sza_anchor",
]

# ---------------------------------------------------------------------------
# 30 proper 3-literal clauses
# Each clause is (i, j, k) where positive = var must be True,
# negative = var must be False. 1-indexed matching var list.
#
# Grouped by function:
#   A: Depressive floor (both phases need mood up)
#   B: Manic ceiling (both phases need calm down)
#   C: Biphasic paradox resolution
#   D: Terpene signal coverage
#   E: Clinical validation
#   F: Functional preservation
#   G: Safety hard floors
#   H: Compound/quality
# ---------------------------------------------------------------------------
CLAUSES = [
    # GROUP A — Depressive floor: must lift mood, counter inertia
    ("A1",  "dep_relief OR uplifted OR euphoric",          ( 1,  3,  4)),
    ("A2",  "fatigue_relief OR energetic OR focused",       ( 2,  5,  6)),
    ("A3",  "uplifted OR happy OR creative",                ( 3,  8,  7)),
    ("A4",  "not_sleepy OR uplifted OR euphoric",           ( 9,  3,  4)),
    ("A5",  "not_lazy OR energetic OR focused",             (10,  5,  6)),
    ("A6",  "happy OR dep_relief OR compound_mood",         ( 8,  1, 22)),

    # GROUP B — Manic ceiling: must prevent escalation
    ("B1",  "stress_relief OR anxiety_cond OR relaxed",     (11, 13, 18)),
    ("B2",  "insomnia_relief OR no_anxiety_fx OR relaxed",  (12, 15, 18)),
    ("B3",  "no_paranoia OR relaxed OR no_mania_unanchored",(14, 18, 17)),
    ("B4",  "no_anxiety_fx OR no_paranoia OR stress_relief",(15, 14, 11)),
    ("B5",  "no_mania_unanchored OR relaxed OR not_sleepy", (17, 18,  9)),
    ("B6",  "insomnia_relief OR bipolar_validated OR relaxed",(12,19, 18)),

    # GROUP C — Biphasic paradox: simultaneous floor AND ceiling
    ("C1",  "paradox_resolved OR uplifted OR relaxed",      (23,  3, 18)),
    ("C2",  "net_upward OR uplifted OR euphoric",           (21,  3,  4)),
    ("C3",  "compound_mood OR dep_relief OR uplifted",      (22,  1,  3)),
    ("C4",  "symptom_spanning OR stress_relief OR dep_relief",(24,11,  1)),
    ("C5",  "bipolar_validated OR paradox_resolved OR anxiety_cond",(19,23,13)),
    ("C6",  "net_upward OR not_lazy OR not_sleepy",         (21, 10,  9)),

    # GROUP D — Terpene coverage: at least one anchor terpene
    ("D1",  "limonene_proxy OR caryophyllene_proxy OR linalool_proxy",(25,26,27)),
    ("D2",  "caryophyllene_proxy OR relaxed OR anxiety_cond",(26,18, 13)),
    ("D3",  "limonene_proxy OR uplifted OR happy",          (25,  3,  8)),
    ("D4",  "linalool_proxy OR relaxed OR no_paranoia",     (27, 18, 14)),
    # GROUP E — Clinical validation
    ("E1",  "bipolar_validated OR anxiety_cond OR ptsd_cond",(19,13, 20)),
    ("E2",  "cbd_ancestry OR bipolar_validated OR anxiety_cond",(28,19,13)),
    ("E3",  "bipolar_validated OR symptom_spanning OR compound_mood",(19,24,22)),

    # GROUP F — Functional preservation
    ("F1",  "focused OR creative OR energetic",             ( 6,  7,  5)),
    ("F2",  "happy OR focused OR dep_relief",               ( 8,  6,  1)),

    # GROUP G — Safety hard floors (paranoia and anxiety together)
    ("G1",  "no_paranoia OR no_anxiety_fx OR relaxed",      (14, 15, 18)),
    ("G2",  "not_pure_indica OR uplifted OR paradox_resolved",(30,3, 23)),

    # GROUP H — Quality + compound
    ("H1",  "quality_gate OR bipolar_validated OR compound_mood",(29,19,22)),

    # GROUP I — Epiphanic window
    # Rewards the anchored euphoria state — the therapeutic working surface.
    # If you have neither the window NOR paradox resolution NOR bipolar validation,
    # the strain is not doing the hard therapeutic work.
    ("I1",  "anchored_euphoria OR paradox_resolved OR bipolar_validated",(31,23,19)),

    # GROUP J — Psychosis / thought anchoring
    # Four clauses covering the thought-relaying / insertion / psychosis window.
    # Each clause requires at least one of the three strongest psychosis guards.
    # J1: primary psychosis triangle — all three new vars as alternatives
    ("J1",  "no_thought_racing OR psychosis_safe OR grounded",          (32,33,34)),
    # J2: sza_anchor must appear with at least one of the original safety gates
    ("J2",  "sza_anchor OR no_thought_racing OR no_paranoia",           (35,32,14)),
    # J3: groundedness reinforced by relaxation + original paranoia gate
    ("J3",  "grounded OR relaxed OR no_paranoia",                       (34,18,14)),
    # J4: psychosis_safe reinforced by CBD ancestry + mania ceiling
    ("J4",  "psychosis_safe OR cbd_ancestry OR no_mania_unanchored",    (33,28,17)),
]

assert len(CLAUSES) == 35, f"Expected 35 clauses, got {len(CLAUSES)}"


# ---------------------------------------------------------------------------
# MaxSAT evaluation
# ---------------------------------------------------------------------------
def evaluate(s: dict) -> dict:
    bvars = extract_vars(s)  # [v1..v30], 0-indexed list

    clause_results = {}
    for name, desc, literals in CLAUSES:
        # Evaluate: clause is satisfied if ANY literal is satisfied
        # Positive literal k: bvars[k-1] must be True
        # Negative literal -k: bvars[k-1] must be False
        sat = any(
            (bvars[abs(lit) - 1] == True  if lit > 0 else
             bvars[abs(lit) - 1] == False)
            for lit in literals
        )
        clause_results[name] = sat

    clause_count = sum(clause_results.values())
    is_solution  = clause_count == len(CLAUSES)   # 35/35

    # Continuous bipolar score — weighted combination of key signals
    bipolar_score = round(
        fsym(s, "logtags-depression")      * 2.0 +
        fsym(s, "logtags-stress")          * 1.5 +
        fc(s,   "logtags-bipolar-disorder")* 4.0 +
        fc(s,   "logtags-anxiety")         * 2.0 +
        fc(s,   "logtags-ptsd")            * 1.5 +
        fx(s,   "logtags-uplifted")        * 1.2 +
        fx(s,   "logtags-euphoric")        * 1.0 +
        fx(s,   "logtags-relaxed")         * 1.0 +
        fx(s,   "logtags-focused")         * 0.8 +
        fx(s,   "logtags-happy")           * 0.8 -
        fn(s,   "logtags-paranoid")        * 6.0 -
        fn(s,   "logtags-anxious")         * 6.0 -
        fn(s,   "logtags-dizzy")           * 2.0,
        2,
    )

    failed = [n for n, v in clause_results.items() if not v]
    return {
        "clause_count": clause_count,
        "is_sat":        is_solution,
        "bipolar_score": bipolar_score,
        "clauses":       clause_results,
        "failed":        failed,
        "bvars":         {VAR_NAMES[i]: bvars[i] for i in range(35)},
    }


# ---------------------------------------------------------------------------
# WCNF encoder — Partial MaxSAT format
# One WCNF per strain family (top N candidates) for solver pipeline
# ---------------------------------------------------------------------------
def write_wcnf(solutions: list[dict], out_path: Path) -> None:
    """
    Encode top lineage candidates as Partial MaxSAT WCNF.
    Hard clauses: each strain's satisfied clauses (must hold).
    Soft clauses: failed clauses (penalized).
    This lets a MaxSAT solver optimize over the space.
    """
    lines = ["c Cannabis Bipolar MaxSAT — Tyler Roost / The TimeLord\n",
             "c Variables: 30 per strain (biphasic self-regulation)\n",
             "c Format: WCNF partial MaxSAT (hard weight = 1e9)\n"]

    top = solutions[:50]  # top 50 for solver
    n_vars   = 30
    n_strains = len(top)
    total_vars = n_vars * n_strains

    hard_w = 1_000_000_000
    soft_w = 1

    all_clauses = []
    for si, strain in enumerate(top):
        bvars = extract_vars(strain)
        offset = si * n_vars  # strain i's v1 = DIMACS var (offset+1)

        for ci, (name, desc, literals) in enumerate(CLAUSES):
            # Translate literals to DIMACS (1-indexed, global offset)
            dimacs_lits = []
            for lit in literals:
                var_idx = abs(lit)
                global_var = offset + var_idx
                dimacs_lits.append(global_var if lit > 0 else -global_var)

            # Is this clause satisfied by the strain?
            sat = strain["sat"]["clauses"].get(name, False)
            weight = hard_w if sat else soft_w
            all_clauses.append((weight, dimacs_lits))

    lines.append(f"p wcnf {total_vars} {len(all_clauses)} {hard_w}\n")
    for weight, lits in all_clauses:
        lines.append(f"{weight} {' '.join(str(l) for l in lits)} 0\n")

    with open(out_path, "w", encoding="utf-8") as f:
        f.writelines(lines)
    console.print(f"[cyan]WCNF written -> {out_path}[/]")
    console.print(f"  {total_vars} variables, {len(all_clauses)} clauses, {n_strains} strains encoded")


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------
def fetch_strains() -> list[dict]:
    console.print("[bold cyan]Fetching strains...[/]")
    with httpx.Client(timeout=60) as c:
        r = c.get(STRAINS_URL)
        r.raise_for_status()
    raw = r.json()
    console.print(f"  [green]Loaded {len(raw)} strains[/]")
    return raw


def run_pipeline(raw_strains: list[dict]) -> None:
    scored = []
    for raw in raw_strains:
        s = normalize(raw)
        s["sat"] = evaluate(s)
        scored.append(s)

    with open(ALL_JSONL, "w", encoding="utf-8") as f:
        for s in scored:
            f.write(json.dumps(s, ensure_ascii=False) + "\n")
    console.print(f"[green]Wrote {len(scored)} strains -> {ALL_JSONL}[/]")

    bipolar = [s for s in scored if s["sat"]["clause_count"] >= 21]
    bipolar.sort(key=lambda s: (-s["sat"]["clause_count"],
                                -s["sat"]["bipolar_score"]))
    with open(BIPOLAR_JSONL, "w", encoding="utf-8") as f:
        for s in bipolar:
            f.write(json.dumps(s, ensure_ascii=False) + "\n")
    console.print(f"[green]Wrote {len(bipolar)} strains (>=21/35 clauses) -> {BIPOLAR_JSONL}[/]")

    solutions = [s for s in scored if s["sat"]["is_sat"]]
    solutions.sort(key=lambda s: -s["sat"]["bipolar_score"])
    with open(LINEAGE_JSONL, "w", encoding="utf-8") as f:
        for s in solutions:
            f.write(json.dumps(s, ensure_ascii=False) + "\n")
    console.print(f"[bold green]Wrote {len(solutions)} full solutions (35/35) -> {LINEAGE_JSONL}[/]")

    write_wcnf(solutions, WCNF_OUT)

    # Print results table
    table = Table(title=f"Top Lineage Candidates (35/35 clauses, {len(solutions)} total)",
                  show_lines=True)
    table.add_column("Rank", style="dim")
    table.add_column("Strain",        style="bold cyan", no_wrap=True)
    table.add_column("Cat",           style="magenta")
    table.add_column("Score",         justify="right", style="green")
    table.add_column("Clauses",       justify="center")
    table.add_column("Parents")

    for i, s in enumerate(solutions[:15], 1):
        parents = " x ".join(p["name"] for p in s["parents"]) or "-"
        table.add_row(
            str(i),
            s["name"],
            s["category"],
            str(s["sat"]["bipolar_score"]),
            f"{s['sat']['clause_count']}/35",
            parents,
        )
    console.print(table)

    # Also show Wedding Cake specifically
    wc = next((s for s in scored if "wedding cake" in s["name"].lower()), None)
    if wc:
        console.print(f"\n[yellow]Wedding Cake:[/] {wc['sat']['clause_count']}/35 clauses | "
                      f"score={wc['sat']['bipolar_score']} | "
                      f"failed={wc['sat']['failed']}")


if __name__ == "__main__":
    raw = fetch_strains()
    run_pipeline(raw)
    console.print("\n[bold]Done. Feed limitless_candidates.wcnf to MaxSAT solver.[/]")
