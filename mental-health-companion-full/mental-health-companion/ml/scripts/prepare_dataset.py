"""Convert the uploaded Mental_Health_Dataset.xlsx into a de-identified training CSV and an audit summary.

    python ml/scripts/prepare_dataset.py path/to/Mental_Health_Dataset.xlsx [--out ml/datasets]

Data minimisation: direct identifiers and quasi-identifiers (name, candidate id, state, district,
institution, exact age, gender) are DROPPED. Only what a model or the admin dataset module needs is kept.
Output columns follow Section 4.7: text, sentiment, emotion, stress_level (+ optional context columns).
"""
import argparse
import json
from pathlib import Path

import pandas as pd

COLUMN_MAP = {  # source column -> output column
    "TEXT INPUT": "text",
    "BASIC SENTIMENT": "sentiment",
    "EMOTION DETECTED": "emotion",
    "STRESS LEVEL": "stress_level",
    "STRESS INTENSITY SCORE": "stress_score",
    "SENTIMENT SCORE": "sentiment_score",
    "ISSUE CATEGORY": "issue_category",
    "CANDIDATE TYPE": "candidate_type",
    "CLINICAL - PHQ8 - SCORE": "phq8",
    "CLINICAL - GAD7 - SCORE": "gad7",
    "SLEEP HOURS": "sleep_hours",
    "PHYSICAL ACTIVITY LEVEL": "activity_level",
    "PREVIOUS STRESS LEVEL": "previous_stress_level",
    "STRESS TREND LEVEL": "trend",
    "CRISIS SAFETY FLAG": "crisis_flag",
}
DROPPED = ["CANDIDATE ID", "CANDIDATE NAME", "STATE", "DISTRICT", "INSTITUTION", "AGES", "GENDER", "ACADEMIC YEAR",
           "PRIMARY ISSUE", "INTERVENTION TRIGGER ACTION"]  # last two: near-duplicates of labels / prescriptive actions


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("xlsx")
    ap.add_argument("--out", default="ml/datasets")
    a = ap.parse_args()
    src = pd.read_excel(a.xlsx)
    missing = [c for c in COLUMN_MAP if c not in src.columns]
    if missing:
        raise SystemExit(f"Missing expected columns: {missing}")

    df = src[list(COLUMN_MAP)].rename(columns=COLUMN_MAP)
    for c in ["sentiment", "emotion", "stress_level", "trend", "previous_stress_level", "activity_level"]:
        df[c] = df[c].str.strip().str.lower()
    df["crisis_flag"] = (df["crisis_flag"].str.strip().str.lower() == "yes").astype(int)
    df["text"] = df["text"].str.strip()
    df.insert(0, "text_group", df["text"].factorize()[0])   # identical sentences share a group -> use for GROUPED splits

    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    df.to_csv(out / "mental_health_dataset_deidentified.csv", index=False)

    by_text = df.groupby("text")
    audit = {
        "rows": len(df), "unique_texts": int(df["text"].nunique()),
        "class_distribution": {c: df[c].value_counts().to_dict() for c in ["sentiment", "emotion", "stress_level"]},
        "crisis_flag_yes": int(df["crisis_flag"].sum()),
        "text_only_ceiling_accuracy": {c: round(float(by_text[c].agg(lambda s: s.value_counts().iloc[0]).sum() / len(df)), 3)
                                       for c in ["sentiment", "emotion", "stress_level", "crisis_flag"]},
        "stress_score_range_by_level": df.groupby("stress_level")["stress_score"].agg(["min", "max"]).to_dict("index"),
        "dropped_columns": DROPPED,
    }
    (out / "dataset_audit.json").write_text(json.dumps(audit, indent=2, default=int))
    print(json.dumps(audit, indent=2, default=int))


if __name__ == "__main__":
    main()
