#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["rich"]
# ///
"""
condition_profiles.py — DSM-mapped cannabis strain pathways
Tyler Roost / The TimeLord

Each condition profile defines:
  - target_vars: which booleans MUST be True (hard requirements)
  - anti_vars:   which booleans MUST be False (contraindications)
  - weight_map:  per-variable scoring weight multiplier
  - epiphanic:   whether anchored_euphoria is therapeutic or risky
  - thc_risk:    LOW / MODERATE / HIGH — affects CBD-ancestry weighting
  - notes:       clinical rationale

Architecture:
  Each profile scores strains from lineage_candidates.jsonl using
  the existing 30-variable booleans + the anchored_euphoria signal.
  Output: top 10 per condition with profile match score.

Terpene-mechanism map (proxies from flavor data):
  limonene    → serotonin/dopamine reuptake modulation → floor lift
  caryophyllene → CB2 agonist → anti-inflammatory, anxiety ceiling
  linalool    → GABAergic → sedation, panic ceiling
  myrcene     → (no direct proxy in Leafly flavors — inferred from indica ratio)
  pinene      → acetylcholinesterase inhibition → memory, focus (ADHD)
  terpinolene → mild stimulant, uplifting → energy without mania

DSM coverage (cannabis-relevant conditions only):
  Neurodevelopmental: ADHD-I, ADHD-HI, ADHD-C
  Schizophrenia spectrum: Schizoaffective-Bipolar, Schizoaffective-Depressive
  Bipolar spectrum: Bipolar-I, Bipolar-II, Cyclothymia
  Depressive: MDD, Persistent-DD, PMDD, SAD
  Anxiety: GAD, Social-Anxiety, Panic-Disorder, PTSD
  OCD: OCD (evidence mixed — noted)
  Personality: BPD
  Sleep: Insomnia-primary
  Somatic: Chronic-Pain (CBD-forward)
  Mixed: [user-specific — ask Tyler]
"""

from __future__ import annotations
import json
from dataclasses import dataclass, field
from pathlib import Path
from rich.console import Console
from rich.table import Table

console = Console()

LINEAGE_JSONL = Path(__file__).parent / "lineage_candidates.jsonl"
ALL_JSONL     = Path(__file__).parent / "strains_all.jsonl"


# ---------------------------------------------------------------------------
# Anchored euphoria signal (the epiphanic window)
# euphoric present but relaxed is the anchor
# ---------------------------------------------------------------------------
def anchored_euphoria(s: dict) -> bool:
    eff = s["effects"]
    return (eff.get("logtags-euphoric", 0) >= 10.0 and
            eff.get("logtags-relaxed",  0) >= 30.0)


def anchored_euphoria_score(s: dict) -> float:
    """Continuous score for the epiphanic window — euphoria anchored by relaxation."""
    eff = s["effects"]
    eu  = eff.get("logtags-euphoric", 0.0)
    rx  = eff.get("logtags-relaxed",  0.0)
    if eu < 5.0 or rx < 20.0:
        return 0.0
    return min(eu, 60.0) * (rx / 100.0)  # caps at 60% euphoria, weighted by anchor


# ---------------------------------------------------------------------------
# Profile dataclass
# ---------------------------------------------------------------------------
@dataclass
class ConditionProfile:
    name:        str
    dsm:         str          # DSM-5-TR code
    short:       str          # slug
    description: str
    # Hard requirements from existing 30 bvars
    target_vars: list[str] = field(default_factory=list)
    anti_vars:   list[str] = field(default_factory=list)
    # Scoring weights per bvar (default 1.0)
    weight_map:  dict[str, float] = field(default_factory=dict)
    # Epiphanic window: True = reward it, False = neutral, None = penalize
    epiphanic:   bool | None = True
    # THC risk level: controls cbd_ancestry weighting
    thc_risk:    str = "MODERATE"   # LOW / MODERATE / HIGH
    # Additional continuous score modifiers
    notes:       str = ""
    # Spectro-Astronomical Epistemology — constellation mapping
    # See constellation_taxonomy.py for the full 88-constellation ring
    constellation: str = ""     # constellation name (links to constellation_taxonomy.CONSTELLATION_INDEX)


# ---------------------------------------------------------------------------
# DSM-mapped profiles
# ---------------------------------------------------------------------------
PROFILES: list[ConditionProfile] = [

    # =========================================================================
    # BIPOLAR SPECTRUM
    # =========================================================================
    ConditionProfile(
        name="Bipolar I",
        dsm="F31.x",
        short="bp1",
        constellation="Lyra",   # Orpheus — descent to underworld and return
        description="Manic episodes dominant. Primary risk is ceiling escape. "
                    "Floor lift secondary to ceiling control.",
        target_vars=["no_mania_unanchored", "relaxed", "stress_relief",
                     "no_paranoia", "no_anxiety_fx", "not_pure_indica",
                     "symptom_spanning"],
        anti_vars=[],
        weight_map={
            "no_mania_unanchored": 3.0,
            "relaxed":            2.5,
            "stress_relief":      2.0,
            "no_paranoia":        2.0,
            "no_anxiety_fx":      2.0,
            "bipolar_validated":  3.0,
            "paradox_resolved":   2.5,
            "dep_relief":         1.5,
            "uplifted":           1.0,
        },
        epiphanic=True,   # window is therapeutic — but anchoring is critical
        thc_risk="MODERATE",
        notes="Epiphanic window required — but unanchored euphoria is the primary "
              "failure mode. caryophyllene (CB2) is the non-negotiable anchor.",
    ),

    ConditionProfile(
        name="Bipolar II",
        dsm="F31.81",
        short="bp2",
        constellation="Gemini",  # Castor & Pollux — mortal/immortal twins cycling
        description="Hypomanic + depressive cycling. Depressive phase is dominant "
                    "and more functionally disabling. Ceiling lighter than BP-I.",
        target_vars=["dep_relief", "uplifted", "compound_mood", "not_lazy",
                     "not_sleepy", "net_upward", "paradox_resolved"],
        anti_vars=[],
        weight_map={
            "dep_relief":         3.0,
            "uplifted":           2.5,
            "compound_mood":      2.0,
            "net_upward":         2.0,
            "not_lazy":           2.0,
            "not_sleepy":         1.5,
            "paradox_resolved":   2.0,
            "bipolar_validated":  2.5,
            "no_mania_unanchored":1.5,
            "happy":              1.5,
        },
        epiphanic=True,   # window is primary therapeutic target
        thc_risk="LOW",
        notes="The depressive phase is the clinical burden. Uplifted + compound_mood "
              "are the primary targets. Epiphanic window is where actual insight work "
              "happens. Less ceiling risk than BP-I.",
    ),

    ConditionProfile(
        name="Cyclothymia",
        dsm="F34.0",
        short="cyclo",
        constellation="Libra",   # The Scales — perpetual mild oscillation
        description="Milder cycling — sub-threshold hypomania and depressive episodes. "
                    "Stability and consistency matter more than peak intervention.",
        target_vars=["paradox_resolved", "relaxed", "uplifted", "not_lazy",
                     "no_mania_unanchored", "quality_gate"],
        anti_vars=[],
        weight_map={
            "paradox_resolved":   3.0,
            "relaxed":            2.0,
            "uplifted":           2.0,
            "not_lazy":           1.5,
            "quality_gate":       2.0,  # consistency matters — high-rated strains only
            "symptom_spanning":   2.0,
            "compound_mood":      1.5,
            "no_mania_unanchored":2.0,
        },
        epiphanic=None,   # neutral — not primary target
        thc_risk="LOW",
        notes="Consistency is the primary goal. Strain-to-strain variance is the "
              "enemy. quality_gate weight elevated.",
    ),

    # =========================================================================
    # DEPRESSIVE DISORDERS
    # =========================================================================
    ConditionProfile(
        name="Major Depressive Disorder",
        dsm="F32.x / F33.x",
        short="mdd",
        constellation="Leo",     # Nemean Lion — invulnerable hide, requires bare-handed confrontation
        description="Unipolar depression. No mania risk. Maximize floor lift. "
                    "Energy + motivation are primary targets.",
        target_vars=["dep_relief", "uplifted", "euphoric", "energetic",
                     "focused", "not_lazy", "not_sleepy", "happy"],
        anti_vars=[],
        weight_map={
            "dep_relief":   3.0,
            "uplifted":     2.5,
            "euphoric":     2.5,
            "energetic":    2.5,
            "focused":      2.0,
            "not_lazy":     2.0,
            "not_sleepy":   2.0,
            "happy":        2.0,
            "compound_mood":2.0,
            "creative":     1.5,
        },
        epiphanic=True,
        thc_risk="LOW",
        notes="No mania ceiling needed. Go for maximum floor lift. Euphoria is "
              "therapeutic here — the higher the anchored euphoria the better "
              "for breakthrough depressive episodes. Limonene is the primary "
              "terpene target.",
    ),

    ConditionProfile(
        name="Persistent Depressive Disorder (Dysthymia)",
        dsm="F34.1",
        short="pdd",
        constellation="Hydra",   # Many-headed serpent — cut one head, two grow back
        description="Chronic low-grade depression. Need sustained floor lift "
                    "without sedation. Daily-use tolerability is key.",
        target_vars=["dep_relief", "uplifted", "not_lazy", "not_sleepy",
                     "focused", "quality_gate"],
        anti_vars=[],
        weight_map={
            "dep_relief":    3.0,
            "uplifted":      2.5,
            "not_lazy":      3.0,
            "not_sleepy":    3.0,
            "focused":       2.0,
            "quality_gate":  2.5,   # consistent daily use — no variance
            "cbd_ancestry":  1.5,   # tolerance management
            "creative":      1.5,
            "fatigue_relief":2.0,
        },
        epiphanic=None,
        thc_risk="LOW",
        notes="Chronic use tolerance is the enemy. CBD ancestry helps tolerance "
              "management. Consistency (quality_gate) matters as much as peak "
              "effect. Daytime strains only — not_sleepy is weighted higher.",
    ),

    ConditionProfile(
        name="PMDD",
        dsm="F32.81",
        short="pmdd",
        constellation="Carina",  # Keel of the Argo — structural underpinning rides the waves
        description="Cyclical dysphoria tied to luteal phase. Irritability, "
                    "mood instability, physical discomfort. Anti-inflammatory "
                    "terpenes + mood floor both needed.",
        target_vars=["dep_relief", "stress_relief", "relaxed", "happy",
                     "caryophyllene_proxy", "no_paranoia", "no_anxiety_fx"],
        anti_vars=[],
        weight_map={
            "dep_relief":           2.5,
            "stress_relief":        3.0,
            "relaxed":              2.5,
            "happy":                2.0,
            "caryophyllene_proxy":  3.0,  # CB2 anti-inflammatory is primary
            "no_paranoia":          2.0,
            "no_anxiety_fx":        2.0,
            "symptom_spanning":     2.0,
        },
        epiphanic=None,
        thc_risk="LOW",
        notes="Caryophyllene (CB2) anti-inflammatory is the mechanism — menstrual "
              "inflammation + mood dysregulation respond to CB2 agonism. "
              "Not euphoria-seeking. Stress relief primary.",
    ),

    ConditionProfile(
        name="Seasonal Affective Disorder",
        dsm="F32.x/F33.x seasonal specifier",
        short="sad_seasonal",
        constellation="Virgo",   # Persephone/Demeter — the seasonal cycle IS the myth
        description="Light-cycle driven depression. Energy and mood lift primary. "
                    "Limonene-forward strains target the serotonin deficit.",
        target_vars=["dep_relief", "uplifted", "energetic", "happy",
                     "limonene_proxy", "not_sleepy", "focused"],
        anti_vars=["insomnia_relief"],  # insomnia_relief = sedating = wrong direction
        weight_map={
            "dep_relief":    3.0,
            "uplifted":      3.0,
            "energetic":     3.0,
            "happy":         2.5,
            "limonene_proxy":3.0,  # serotonin pathway is the target
            "not_sleepy":    2.5,
            "focused":       2.0,
            "euphoric":      2.0,
        },
        epiphanic=True,
        thc_risk="LOW",
        notes="Limonene is the primary terpene target — it modulates the "
              "serotonin/dopamine deficit that underlies SAD. Daytime use only. "
              "Strains that sedate are contraindicated.",
    ),

    # =========================================================================
    # SCHIZOPHRENIA SPECTRUM
    # =========================================================================
    ConditionProfile(
        name="Schizoaffective — Bipolar Type",
        dsm="F25.0",
        short="sza_bp",
        constellation="Cygnus",  # Zeus as swan — divine identity in alien form (2615 ly, ABYSSAL)
        description="Psychotic features + bipolar cycling. CBD is the primary "
                    "target — antipsychotic mechanism. THC ratio must be carefully "
                    "controlled. CBD ancestry is hard requirement.",
        target_vars=["cbd_ancestry", "bipolar_validated", "relaxed",
                     "no_paranoia", "no_anxiety_fx", "no_mania_unanchored",
                     "stress_relief",
                     "no_thought_racing", "psychosis_safe", "grounded", "sza_anchor"],
        anti_vars=["euphoric"],   # high euphoria can trigger psychotic features
        weight_map={
            "cbd_ancestry":        5.0,  # hard anchor — must have CBD genetics
            "no_paranoia":         4.0,
            "no_mania_unanchored": 4.0,
            "relaxed":             3.0,
            "no_anxiety_fx":       3.0,
            "bipolar_validated":   3.0,
            "stress_relief":       2.0,
            "paradox_resolved":    2.0,
            # Psychosis / thought anchoring — primary reason for this profile
            "no_thought_racing":   5.0,
            "psychosis_safe":      5.0,
            "grounded":            4.0,
            "sza_anchor":          5.0,
        },
        epiphanic=False,  # epiphanic window contraindicated — psychosis risk
        thc_risk="HIGH",
        notes="CBD:THC ratio is the primary intervention. High-THC strains are "
              "contraindicated. CBD ancestry is the hardest requirement here — "
              "Harlequin, ACDC, Cannatonic lineage strains only. "
              "Euphoria is soft-contraindicated (psychotic feature trigger).",
    ),

    ConditionProfile(
        name="Schizoaffective — Depressive Type",
        dsm="F25.1",
        short="sza_dep",
        constellation="Corvus",  # Apollo's crow — the corrupted messenger
        description="Psychotic features + persistent depression. CBD-forward "
                    "floor lift. No ceiling escape. No euphoria.",
        target_vars=["cbd_ancestry", "dep_relief", "uplifted", "relaxed",
                     "no_paranoia", "no_anxiety_fx", "not_lazy",
                     "no_thought_racing", "psychosis_safe", "grounded", "sza_anchor"],
        anti_vars=["euphoric"],
        weight_map={
            "cbd_ancestry":      5.0,
            "no_paranoia":       4.0,
            "dep_relief":        3.0,
            "uplifted":          2.5,
            "relaxed":           2.5,
            "no_anxiety_fx":     3.0,
            "not_lazy":          2.0,
            "no_thought_racing": 5.0,
            "psychosis_safe":    5.0,
            "grounded":          4.0,
            "sza_anchor":        5.0,
        },
        epiphanic=False,
        thc_risk="HIGH",
        notes="Same CBD requirement as SZA-BP but depressive floor is the primary "
              "symptom target. Harlequin, ACDC, and Good Medicine family are "
              "the target strains.",
    ),

    # =========================================================================
    # ANXIETY DISORDERS
    # =========================================================================
    ConditionProfile(
        name="Generalized Anxiety Disorder",
        dsm="F41.1",
        short="gad",
        constellation="Cancer",  # The Crab Hera sent — pinches at your heels during the real fight
        description="Persistent excessive worry. Ceiling control is primary. "
                    "Linalool (GABAergic) + caryophyllene (CB2) are the terpene targets.",
        target_vars=["stress_relief", "anxiety_cond", "relaxed", "no_paranoia",
                     "no_anxiety_fx", "no_mania_unanchored", "linalool_proxy",
                     "caryophyllene_proxy"],
        anti_vars=[],
        weight_map={
            "stress_relief":       3.0,
            "anxiety_cond":        3.0,
            "relaxed":             3.0,
            "no_paranoia":         3.0,
            "no_anxiety_fx":       3.0,
            "linalool_proxy":      3.0,
            "caryophyllene_proxy": 3.0,
            "no_mania_unanchored": 2.0,
            "dep_relief":          1.5,  # anxiety often has depressive floor
        },
        epiphanic=None,
        thc_risk="MODERATE",
        notes="GABAergic ceiling (linalool) + CB2 anti-inflammatory (caryophyllene) "
              "are the dual mechanism targets. Low-dose approach. Paranoia risk "
              "is the primary contraindication.",
    ),

    ConditionProfile(
        name="Social Anxiety / Social Depression",
        dsm="F40.10",
        short="social_anx",
        constellation="Andromeda",  # Princess chained to the rock — exposure IS punishment
        description="Fear of social scrutiny + secondary depression from isolation. "
                    "Low-dose uplifted + euphoric for social ease. "
                    "Anti-paranoia is the hard constraint — paranoia is catastrophic.",
        target_vars=["uplifted", "happy", "no_paranoia", "no_anxiety_fx",
                     "relaxed", "creative", "not_sleepy"],
        anti_vars=[],
        weight_map={
            "no_paranoia":    5.0,   # hardest constraint — paranoia destroys social use
            "no_anxiety_fx":  4.0,
            "uplifted":       3.0,
            "happy":          3.0,
            "relaxed":        2.5,
            "creative":       2.5,   # social creativity / conversation flow
            "not_sleepy":     2.0,
            "limonene_proxy": 2.0,
        },
        epiphanic=True,
        thc_risk="LOW",
        notes="Paranoia is the single most dangerous failure mode for social anxiety. "
              "Low-dose THC (or CBD-moderated) with limonene for social mood lift. "
              "Epiphanic window is therapeutic — social insight and connection. "
              "Start low. Never a high-THC sativa solo.",
    ),

    ConditionProfile(
        name="Panic Disorder",
        dsm="F41.0",
        short="panic",
        constellation="Capricornus",  # Pan — the word 'panic' derives from him
        description="Recurrent unexpected panic attacks. Ultra-low paranoia + "
                    "strong anxiolytic. Stimulating strains are contraindicated.",
        target_vars=["no_paranoia", "no_anxiety_fx", "no_mania_unanchored",
                     "relaxed", "linalool_proxy", "caryophyllene_proxy",
                     "stress_relief", "no_dizziness"],
        anti_vars=["euphoric", "energetic"],  # stimulants can trigger panic
        weight_map={
            "no_paranoia":         5.0,
            "no_anxiety_fx":       5.0,
            "relaxed":             4.0,
            "no_mania_unanchored": 3.0,
            "linalool_proxy":      4.0,
            "caryophyllene_proxy": 3.0,
            "stress_relief":       3.0,
            "no_dizziness":        3.0,
        },
        epiphanic=False,
        thc_risk="HIGH",
        notes="THC is contraindicated in panic disorder — it reliably triggers "
              "panic attacks in susceptible individuals. CBD-dominant strains only. "
              "No energetic, no euphoric, no stimulating profiles. "
              "Linalool (GABAergic) is the primary target.",
    ),

    ConditionProfile(
        name="PTSD",
        dsm="F43.10",
        short="ptsd",
        constellation="Scorpius",  # The scorpion that killed Orion — opposite side of sky forever
        description="Trauma-related hyperarousal + intrusive re-experiencing. "
                    "Dual target: anxiety ceiling (hyperarousal) + memory "
                    "reconsolidation window (extinction learning). "
                    "CBD + anchored euphoria together enable reconsolidation.",
        target_vars=["ptsd_cond", "stress_relief", "anxiety_cond", "relaxed",
                     "no_paranoia", "dep_relief", "no_mania_unanchored"],
        anti_vars=[],
        weight_map={
            "ptsd_cond":           5.0,   # user-validated for PTSD
            "stress_relief":       3.0,
            "anxiety_cond":        3.0,
            "relaxed":             3.0,
            "no_paranoia":         3.0,
            "dep_relief":          2.5,
            "caryophyllene_proxy": 2.5,   # CB2 extinction learning support
            "cbd_ancestry":        2.0,
            "bipolar_validated":   1.0,   # bipolar + PTSD comorbid common
        },
        epiphanic=True,
        thc_risk="MODERATE",
        notes="The epiphanic window is the extinction learning window. PTSD "
              "patients need a controlled therapeutic environment where the trauma "
              "memory can be reconsolidated without hyperarousal hijacking the "
              "process. Anchored euphoria + relaxed = the state. "
              "Caryophyllene's CB2 mechanism has been specifically linked to "
              "extinction learning in rodent PTSD models.",
    ),

    # =========================================================================
    # OCD SPECTRUM
    # =========================================================================
    ConditionProfile(
        name="OCD",
        dsm="F42.x",
        short="ocd",
        constellation="Hercules",  # The twelve labors — each completed, another assigned by Hera
        description="Obsessions + compulsions. Evidence for cannabis is mixed — "
                    "THC can worsen rumination; CBD shows modest promise. "
                    "Treat cautiously. Focus preservation and anti-anxiety primary.",
        target_vars=["anxiety_cond", "stress_relief", "relaxed", "focused",
                     "no_anxiety_fx", "no_paranoia"],
        anti_vars=["euphoric"],  # euphoria can amplify obsessive looping
        weight_map={
            "anxiety_cond":  3.0,
            "stress_relief": 2.5,
            "relaxed":       2.5,
            "focused":       3.0,   # focus without loop amplification
            "no_anxiety_fx": 3.0,
            "no_paranoia":   3.0,
            "cbd_ancestry":  2.0,
        },
        epiphanic=False,
        thc_risk="HIGH",
        notes="Evidence is genuinely mixed. THC can amplify obsessive loops "
              "(it's the same ruminative mechanism). CBD shows modest promise. "
              "If using: CBD-dominant, focused not euphoric, low dose. "
              "Euphoric is soft-contraindicated.",
    ),

    # =========================================================================
    # NEURODEVELOPMENTAL
    # =========================================================================
    ConditionProfile(
        name="ADHD — Inattentive (solo morbid)",
        dsm="F90.0",
        short="adhd_i",
        constellation="Aquila",  # Zeus's eagle — predatory focus that locks on and dives
        description="Attention deficit without hyperactivity. Pure focus deficit. "
                    "Pinene (acetylcholinesterase inhibition) + energetic + focused "
                    "are the primary targets. No ceiling needed — no mania risk.",
        target_vars=["focused", "energetic", "creative", "uplifted", "not_sleepy",
                     "not_lazy", "limonene_proxy"],
        anti_vars=["insomnia_relief"],  # sedating is the opposite of what's needed
        weight_map={
            "focused":        5.0,
            "energetic":      4.0,
            "creative":       3.0,
            "uplifted":       3.0,
            "not_sleepy":     3.0,
            "not_lazy":       3.0,
            "limonene_proxy": 2.5,  # dopamine/serotonin for focus
            "happy":          1.5,
            "compound_mood":  1.5,
        },
        epiphanic=True,   # the hyperfocus state is the working state
        thc_risk="LOW",
        notes="Pinene is the primary terpene target (not trackable directly "
              "from Leafly flavor proxies — needs actual terpene testing). "
              "Sativa-dominant strains skew correct. The ADHD 'working state' "
              "is the epiphanic window — laser hyperfocus. "
              "Energetic + focused without sedation is the entire target.",
    ),

    ConditionProfile(
        name="ADHD — Hyperactive/Impulsive (solo morbid)",
        dsm="F90.1",
        short="adhd_hi",
        constellation="Pegasus",  # Winged horse — uncontainable energy, throws the rider
        description="Motor hyperactivity + impulsivity without attention deficit. "
                    "Paradox target: calm the body, don't sedate the mind. "
                    "Relaxed + uplifted simultaneously — same paradox as bipolar "
                    "but on the somatic/cognitive axis.",
        target_vars=["relaxed", "uplifted", "paradox_resolved", "no_mania_unanchored",
                     "stress_relief", "not_lazy"],
        anti_vars=["energetic"],  # energetic feeds hyperactivity
        weight_map={
            "relaxed":             4.0,
            "uplifted":            3.0,
            "paradox_resolved":    4.0,  # somatic calm + mental presence
            "no_mania_unanchored": 3.0,
            "stress_relief":       3.0,
            "not_lazy":            3.0,
            "caryophyllene_proxy": 2.5,  # CB2 somatic calming
            "linalool_proxy":      2.5,  # GABAergic motor settling
        },
        epiphanic=None,
        thc_risk="LOW",
        notes="The paradox is identical to bipolar in structure but on a different "
              "axis: body-calm without mind-sedation. Caryophyllene + linalool "
              "are the somatic anchor terpenes. Indica-leaning hybrids with "
              "preserved mental clarity.",
    ),

    ConditionProfile(
        name="ADHD — Combined (solo morbid)",
        dsm="F90.2",
        short="adhd_c",
        constellation="Sagittarius",  # Chiron the centaur-archer — half-beast half-precision
        description="Full ADHD — both inattention and hyperactivity/impulsivity. "
                    "Hardest to target. Needs: calm body, active mind, focus, "
                    "no sedation, no mania escalation.",
        target_vars=["focused", "relaxed", "paradox_resolved", "not_sleepy",
                     "not_lazy", "uplifted", "no_mania_unanchored"],
        anti_vars=["energetic"],  # energetic tips hyperactivity
        weight_map={
            "focused":             5.0,
            "relaxed":             4.0,
            "paradox_resolved":    4.0,
            "not_sleepy":          3.0,
            "not_lazy":            3.0,
            "uplifted":            2.5,
            "no_mania_unanchored": 3.0,
            "limonene_proxy":      2.0,
            "caryophyllene_proxy": 2.0,
        },
        epiphanic=True,   # hyperfocus state
        thc_risk="LOW",
        notes="The ADHD-C working state is: body settled, mind activated, task-locked. "
              "This is the narrowest therapeutic window in the neurodevelopmental "
              "conditions. Strain + dose precision matters more here than anywhere else.",
    ),

    # =========================================================================
    # PERSONALITY
    # =========================================================================
    ConditionProfile(
        name="Borderline Personality Disorder",
        dsm="F60.3",
        short="bpd",
        constellation="Phoenix",  # Death and rebirth from fire — identity burns and reconstitutes
        description="Emotional dysregulation — rapid mood shifts, fear of abandonment, "
                    "identity disturbance. Similar mechanism to bipolar ceiling but "
                    "triggered by interpersonal events rather than cycle phase.",
        target_vars=["stress_relief", "anxiety_cond", "relaxed", "no_paranoia",
                     "no_anxiety_fx", "dep_relief", "paradox_resolved"],
        anti_vars=[],
        weight_map={
            "stress_relief":    3.0,
            "anxiety_cond":     3.0,
            "relaxed":          3.0,
            "no_paranoia":      4.0,   # paranoia in BPD = interpersonal catastrophizing
            "no_anxiety_fx":    3.0,
            "dep_relief":       2.5,
            "paradox_resolved": 2.5,
            "bipolar_validated":1.5,   # cross-validates
            "ptsd_cond":        1.5,   # BPD + PTSD comorbidity common
        },
        epiphanic=None,
        thc_risk="MODERATE",
        notes="BPD emotional storms are interpersonally triggered. Anti-paranoia "
              "is the highest-weight constraint — paranoia in BPD feeds the "
              "abandonment schema directly. Ceiling-focused, not floor-focused.",
    ),

    # =========================================================================
    # SLEEP
    # =========================================================================
    ConditionProfile(
        name="Primary Insomnia",
        dsm="G47.00",
        short="insomnia",
        constellation="Draco",   # Ladon — the dragon that never sleeps, guarding the golden apples
        description="Chronic difficulty initiating/maintaining sleep. "
                    "Myrcene (sedating) + linalool (GABAergic) primary targets. "
                    "Indica-dominant. CBD for sleep architecture.",
        target_vars=["insomnia_relief", "relaxed", "linalool_proxy", "stress_relief"],
        anti_vars=["energetic", "focused", "uplifted"],  # activating = wrong
        weight_map={
            "insomnia_relief": 5.0,
            "relaxed":         4.0,
            "linalool_proxy":  4.0,
            "stress_relief":   3.0,
            "dep_relief":      1.5,   # insomnia + depression comorbid
            "caryophyllene_proxy": 2.0,
        },
        epiphanic=False,
        thc_risk="LOW",
        notes="Myrcene is the primary sedating terpene — not directly proxied "
              "from Leafly flavor data but correlates with indica-dominant strains. "
              "Linalool (GABAergic) supports sleep onset. "
              "Tolerance develops to sedating effects — rotation needed.",
    ),

    # =========================================================================
    # SOMATIC
    # =========================================================================
    ConditionProfile(
        name="Chronic Pain",
        dsm="G89.29",
        short="chronic_pain",
        constellation="Centaurus",  # Chiron — the wounded healer, unable to die, unable to heal
        description="Persistent pain interfering with function. CBD + THC balanced "
                    "for analgesia. Caryophyllene (CB2 anti-inflammatory) primary.",
        target_vars=["caryophyllene_proxy", "relaxed", "stress_relief",
                     "cbd_ancestry", "linalool_proxy"],
        anti_vars=[],
        weight_map={
            "caryophyllene_proxy": 5.0,
            "relaxed":             3.0,
            "stress_relief":       2.5,
            "cbd_ancestry":        4.0,
            "linalool_proxy":      2.5,
            "dep_relief":          2.0,   # pain + depression comorbid
            "uplifted":            2.0,
            "quality_gate":        2.5,
        },
        epiphanic=None,
        thc_risk="LOW",
        notes="CB2 agonism (caryophyllene) is the anti-inflammatory mechanism. "
              "CBD + THC balanced ratio for analgesia without tolerance escalation. "
              "CBD ancestry is weighted heavily for CB2/CB1 ratio control.",
    ),
    # =========================================================================
    # TYLER'S MIX — Non-Fungible-Genes Target Profile
    # BP-I + BP-II (7-state cycling: 3 depressive phenotypes, 4 elevated)
    # ADHD-I + ADHD-HI + ADHD-C (phase-conditioned on bipolar state)
    # PTSD
    # OCD
    # Schizoaffective-Bipolar
    # BPD with dissociative/schizotypal features
    #
    # Epigenetic attractor model:
    # This is NOT a simple pharmacogenomic target. The ECS modulates
    # epigenetic marks (HDAC, DNMT, BDNF methylation) creating self-referential
    # strange loops. The strain must apply a force vector capable of navigating
    # a 7-state bipolar attractor landscape PLUS ADHD phase-conditioning,
    # OCD loop dynamics, PTSD hyperarousal, schizoaffective psychosis ceiling,
    # and BPD dissociative paranoia — simultaneously.
    #
    # Core constraint tensions and resolutions:
    # OCD: euphoria amplifies loops → soft-contraindicate high euphoria
    # PTSD: needs epiphanic window for reconsolidation → need anchored euphoria
    # → RESOLUTION: anchored_euphoria at low-moderate level (eu≥10, relaxed≥40)
    #   The OCD safe zone is euphoric <40. The PTSD window opens at euphoric ≥10.
    #   Strong relaxation (≥40) prevents loop escalation.
    #
    # ADHD-I: needs focus + energetic
    # ADHD-HI: energetic feeds hyperactivity
    # → RESOLUTION: paradox_resolved (focused AND relaxed) is the unified target.
    #   NOT energetic as anti-var — energetic is phase-conditional.
    #   The strain must express paradox_resolved regardless of phase.
    #
    # SzaA: CBD ancestry hard requirement (antipsychotic mechanism)
    # BPD dissociative: no_paranoia is the hardest single constraint.
    #   Paranoia + dissociation in BPD = psychotic break territory.
    #
    # 7-state cycling: quality_gate and cbd_ancestry weighted for
    #   cross-state consistency. A strain that works in one state
    #   must not be catastrophic in another.
    # =========================================================================
    ConditionProfile(
        name="Tyler's Mix — Non-Fungible-Genes Target",
        dsm="F31.x + F25.0 + F90.2 + F43.10 + F42.x + F60.3",
        short="tyler",
        constellation="Orion",   # The Hunter — every star a different wavelength, belt bridges hemispheres
        description="BP-I/II complex cycling (7 states) + ADHD-C phase-conditioned "
                    "+ PTSD + OCD + Schizoaffective-Bipolar + BPD-dissociative. "
                    "Target: epigenetic attractor navigation across all states. "
                    "The force vector must work bidirectionally across all 7 mood states.",
        target_vars=[
            # Floor lift (BP-II depressive + ADHD-I anergic)
            "dep_relief", "uplifted", "compound_mood", "net_upward",
            # Ceiling (BP-I + SzaA + BPD)
            "no_mania_unanchored", "relaxed", "stress_relief",
            # Safety absolutes (BPD-dissociative + SzaA + PTSD)
            "no_paranoia", "no_anxiety_fx",
            # ADHD paradox (works in ALL phases)
            "paradox_resolved", "focused",
            # Clinical validation
            "bipolar_validated", "ptsd_cond",
            # Genetic anchor (SzaA requirement)
            "cbd_ancestry",
            # Quality (7-state consistency)
            "quality_gate", "not_pure_indica",
            # Terpene coverage
            "caryophyllene_proxy", "limonene_proxy",
            # Psychosis / thought anchoring (SZA-BP + BPD-dissociative)
            "no_thought_racing", "psychosis_safe", "grounded", "sza_anchor",
        ],
        anti_vars=[],   # no hard anti-vars — phase-conditionality means
                        # energetic/euphoric are context-dependent, not banned
        weight_map={
            # === TIER 1: ABSOLUTE SAFETY (BPD-dissociative + SzaA) ===
            "no_paranoia":         6.0,  # hardest single constraint
            "no_anxiety_fx":       5.0,  # dissociation + anxiety = break
            "no_mania_unanchored": 5.0,  # BP-I escape = catastrophic
            "cbd_ancestry":        5.0,  # SzaA antipsychotic requirement

            # === TIER 2: CORE THERAPEUTIC TARGETS ===
            "bipolar_validated":   4.5,  # direct user validation
            "paradox_resolved":    4.5,  # ADHD-C unified target
            "relaxed":             4.0,  # anchor for every ceiling condition
            "dep_relief":          4.0,  # 3 depressive phenotypes need it
            "ptsd_cond":           4.0,  # PTSD direct validation
            "stress_relief":       3.5,  # BPD + PTSD + BP all need it

            # === TIER 3: FUNCTIONAL + MOOD ===
            "compound_mood":       3.0,  # 7-state spanning
            "uplifted":            3.0,  # floor lift
            "net_upward":          3.0,  # directional
            "focused":             3.0,  # ADHD-I
            "symptom_spanning":    3.0,  # crosses all conditions
            "anxiety_cond":        3.0,  # PTSD + BPD + SzaA

            # === TIER 4: TERPENE + QUALITY ===
            "caryophyllene_proxy": 3.0,  # CB2 across the board
            "limonene_proxy":      2.5,  # serotonin/dopamine floor
            "linalool_proxy":      2.5,  # GABA ceiling
            "quality_gate":        3.0,  # cross-state consistency
            "not_pure_indica":     2.0,
            "not_sleepy":          2.5,  # ADHD + BP mixed states
            "not_lazy":            2.5,

            # === TIER 5: OCD LOOP MANAGEMENT ===
            # OCD: creative can feed loops — mild negative weight
            # But creative preservation is needed for functional output
            "creative":            1.5,  # wanted but not weighted high (OCD risk)
            "happy":               2.0,

            # === TIER 6: PSYCHOSIS / THOUGHT ANCHORING (SZA-BP + BPD-dissociative) ===
            # Thought relaying (insertion/broadcasting) is the primary SZA-BP risk.
            # All four new variables are required for the psychosis-safe window.
            "no_thought_racing":   5.0,  # high-euphoria + high-focus without grounding = relaying risk
            "psychosis_safe":      5.0,  # ultra-strict dual gate (paranoid <= 1.0 AND anxious <= 1.0)
            "grounded":            4.5,  # relaxed >= 35 + low dizziness + low headache = no derealization
            "sza_anchor":          4.5,  # CBD genetics + paranoid <= 1.5 + relaxed >= 25 (three-way anchor)
        },
        # Epiphanic window: YES — PTSD reconsolidation requires it.
        # OCD loop risk is managed by the relaxed anchor (≥30 in v31 definition).
        # euphoric at 10-30 range with relaxed ≥30 = PTSD window without OCD amplification.
        epiphanic=True,
        thc_risk="HIGH",   # SzaA pushes this to HIGH — CBD ancestry is mandatory
        notes="The 7-state cycling demands a strain that is simultaneously the floor "
              "and the ceiling. The epigenetic attractor model: this strain doesn't just "
              "treat symptoms — it applies a force vector that can shift between attractor "
              "basins regardless of entry state. CBD ancestry (Harlequin lineage) is the "
              "non-negotiable anchor for the schizoaffective component. "
              "no_paranoia is the single hardest constraint — BPD-dissociative + SzaA "
              "makes paranoia a psychotic-break risk, not just discomfort. "
              "The ADHD paradox (focused + relaxed) must hold across all 7 mood states, "
              "which is why paradox_resolved is Tier 2. "
              "OCD is managed via the relaxed anchor on anchored_euphoria — "
              "not by removing the window, but by holding it steady.",
    ),
]

# Build index
PROFILE_INDEX: dict[str, ConditionProfile] = {p.short: p for p in PROFILES}


# ---------------------------------------------------------------------------
# Scorer — apply profile to a strain
# ---------------------------------------------------------------------------
def score_for_profile(strain: dict, profile: ConditionProfile) -> float:
    bvars  = strain["sat"]["bvars"]
    score  = 0.0

    # Hard anti-var check — if any anti-var is True, heavy penalty
    for v in profile.anti_vars:
        if bvars.get(v, False):
            score -= 200.0

    # Weighted bvar scoring
    for v, w in profile.weight_map.items():
        if bvars.get(v, False):
            score += w * 10.0

    # Target var bonus (must-have)
    for v in profile.target_vars:
        if bvars.get(v, False):
            score += 5.0
        else:
            score -= 10.0  # missing target = mild penalty

    # Epiphanic window
    ae = anchored_euphoria(strain)
    if profile.epiphanic is True:
        score += anchored_euphoria_score(strain) * 0.5
    elif profile.epiphanic is False and ae:
        score -= 50.0  # penalize when epiphanic is contraindicated

    # THC risk adjustment — boost CBD ancestry when risk is HIGH
    cbd = bvars.get("cbd_ancestry", False)
    if profile.thc_risk == "HIGH" and cbd:
        score += 50.0
    elif profile.thc_risk == "HIGH" and not cbd:
        score -= 30.0

    # Base bipolar score from pipeline weighted down
    score += strain["sat"]["bipolar_score"] * 0.1

    return round(score, 2)


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------
def run_profiles(source_jsonl: Path = ALL_JSONL, top_n: int = 8) -> None:
    strains = [json.loads(l) for l in open(source_jsonl, encoding="utf-8")]
    console.print(f"[cyan]Loaded {len(strains)} strains[/]")

    for profile in PROFILES:
        ranked = sorted(strains, key=lambda s: score_for_profile(s, profile),
                        reverse=True)[:top_n]

        table = Table(
            title=f"[bold]{profile.name}[/] ({profile.dsm})",
            show_lines=True,
        )
        table.add_column("Rank", style="dim")
        table.add_column("Strain",     style="bold cyan", no_wrap=True)
        table.add_column("Cat",        style="magenta")
        table.add_column("ProfScore",  justify="right", style="green")
        table.add_column("Clauses",    justify="center")
        table.add_column("AnchoredEu", justify="center")
        table.add_column("Parents")

        for i, s in enumerate(ranked, 1):
            ps = score_for_profile(s, profile)
            ae = "YES" if anchored_euphoria(s) else "-"
            parents = " x ".join(p["name"] for p in s["parents"][:2]) or "-"
            table.add_row(
                str(i),
                s["name"],
                s["category"],
                str(ps),
                f"{s['sat']['clause_count']}/31",
                ae,
                parents,
            )
        console.print(table)
        console.print(f"[dim]{profile.notes}[/]\n")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        short = sys.argv[1]
        if short not in PROFILE_INDEX:
            console.print(f"[red]Unknown profile: {short}[/]")
            console.print(f"Available: {', '.join(PROFILE_INDEX.keys())}")
            sys.exit(1)
        profile = PROFILE_INDEX[short]
        strains = [json.loads(l) for l in open(ALL_JSONL, encoding="utf-8")]
        ranked = sorted(strains, key=lambda s: score_for_profile(s, profile),
                        reverse=True)[:10]
        console.print(f"\n[bold]Top 10 for {profile.name}:[/]")
        for i, s in enumerate(ranked, 1):
            ae = "epiphanic" if anchored_euphoria(s) else "-"
            parents = " x ".join(p["name"] for p in s["parents"][:2]) or "-"
            console.print(
                f"  {i:2}. [cyan]{s['name']:30}[/] "
                f"score={score_for_profile(s, profile):7.1f} "
                f"clauses={s['sat']['clause_count']}/31 "
                f"[yellow]{ae}[/] | {parents}"
            )
        console.print(f"\n[dim]{profile.notes}[/]")
    else:
        run_profiles()
