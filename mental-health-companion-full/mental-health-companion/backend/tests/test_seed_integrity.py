"""Seed data must satisfy schema.sql (enums, NOT NULL, FKs, uniqueness) and the spec's volume targets."""
import re
from collections import Counter
from pathlib import Path

import pytest

from app.db.seed import build

SCHEMA = (Path(__file__).resolve().parents[2] / "database" / "schema.sql").read_text()


@pytest.fixture(scope="module")
def seed():
    return build(lambda t, aad: "enc", lambda p: "hash", "x")


def _enums(table: str) -> dict[str, set[str]]:
    body = re.search(rf"CREATE TABLE {table} \((.*?)\n\);", SCHEMA, re.S).group(1)
    out = {}
    # \1 back-reference: the CHECK must be about the same column (may sit on a following line)
    for m in re.finditer(r"(\w+)\s+[A-Za-z0-9_\(\)]+[^,]*?CHECK \(\1 IN\s*\((.*?)\)\)", body, re.S):
        out[m.group(1)] = set(re.findall(r"'([^']*)'", m.group(2)))
    return out


def test_user_role_counts(seed):
    roles = Counter(u["role"] for u in seed["users"])
    assert roles == {"admin": 1, "staff": 2, "psychologist": 3, "client": 10}


def test_volume_targets(seed):
    assert len(seed["journal_entries"]) >= 200
    assert len(seed["analysis_results"]) == len(seed["journal_entries"])
    days = {a["created_at"].date() for a in seed["analysis_results"]}
    assert (max(days) - min(days)).days >= 55  # spans ~60 days


@pytest.mark.parametrize("table", ["analysis_results", "crisis_alerts", "users", "consents", "appointments"])
def test_enum_values_match_schema(seed, table):
    for col, allowed in _enums(table).items():
        for row in seed[table]:
            if row.get(col) is not None:
                assert row[col] in allowed, f"{table}.{col}={row[col]}"


def test_foreign_keys_resolve(seed):
    ids = {t: {r.get("id") for r in rows} for t, rows in seed.items()}
    for row in seed["journal_entries"]:
        assert row["user_id"] in ids["users"]
    for row in seed["analysis_results"]:
        assert row["entry_id"] in ids["journal_entries"] and row["user_id"] in ids["users"]
    for row in seed["appointments"]:
        assert row["patient_id"] in ids["users"] and row["psychologist_id"] in ids["users"]


def test_stress_score_matches_level(seed):
    for a in seed["analysis_results"]:
        lvl = "low" if a["stress_score"] <= 33 else "moderate" if a["stress_score"] <= 66 else "high"
        assert a["stress_level"] == lvl


def test_no_plaintext_journal_text_stored(seed):
    assert all(e["text_encrypted"] == "enc" for e in seed["journal_entries"])
    assert all("text" not in e for e in seed["journal_entries"])


def test_helplines_unverified_by_default(seed):
    assert all(h["verified"] is False for h in seed["resources_helplines"])
    numbers = {h["phone"] for h in seed["resources_helplines"]}
    assert {"112", "14416", "1800-599-0019"} <= numbers


def test_trend_data_shows_directions(seed):
    assert {t["direction"] for t in seed["trend_summaries"]} >= {"increasing", "decreasing", "stable"}


def test_questionnaire_scores_in_range(seed):
    maxes = {q["id"]: q["scoring_rules"]["max"] for q in seed["questionnaires"]}
    for r in seed["questionnaire_responses"]:
        assert 0 <= r["total_score"] <= maxes[r["questionnaire_id"]]
