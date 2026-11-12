"""Demo seed: 1 admin, 2 staff, 3 psychologists, 10 clients, 200+ analysed entries over 60 days.

Usage (inside the backend container or a venv with requirements installed):
    python -m app.db.seed            # seed if the demo users do not exist yet
    python -m app.db.seed --reset    # TRUNCATE everything, then seed
    python -m app.db.seed --dry-run  # build data in memory, print counts, touch nothing

Seeded analyses use SYNTHETIC LABELS (model_version_id = NULL). Real predictions come from the
NLP engine in Phase 3. All demo accounts share SEED_DEMO_PASSWORD -- never use in production.

Encryption AAD convention (must match the services layer):
    journal_entries / chat_messages -> str(user_id)   clinical_notes -> str(patient_id)
    messages -> str(sender_id)
"""
from __future__ import annotations

import argparse
import random
import uuid
from collections import Counter, OrderedDict, defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Callable

from app.db import seed_content as C

EMOTIONS = ["anxiety", "sadness", "anger", "fear", "joy", "stress", "neutral"]

# text, tags
TEXT_POOL: dict[str, list[tuple[str, list[str]]]] = {
    "anxiety": [
        ("I am under a lot of pressure and I am unable to sleep properly.", ["sleep", "work"]),
        ("My mind keeps racing at night and I can't switch off my worries.", ["sleep"]),
        ("I feel on edge all day, like something bad is about to happen.", ["health"]),
        ("I'm so nervous about the presentation tomorrow that my stomach hurts.", ["work"]),
        ("I keep checking my phone and worrying about what people think of me.", ["relationship"]),
    ],
    "sadness": [
        ("I feel really low today and don't have the energy to do anything.", ["health"]),
        ("I miss my friends and the house feels very quiet.", ["family", "relationship"]),
        ("Nothing seems to make me happy lately and I just want to stay in bed.", ["sleep"]),
        ("I cried on the way home and I'm not even sure why.", ["health"]),
    ],
    "anger": [
        ("My manager dismissed my idea again in front of everyone and I'm furious.", ["work"]),
        ("I snapped at my sister over something small and now I feel awful.", ["family"]),
        ("I'm so annoyed that nobody listens to me at home.", ["family"]),
    ],
    "fear": [
        ("I'm scared about my exam results and what happens if I fail.", ["study"]),
        ("I'm afraid the medical report will show something serious.", ["health"]),
        ("I dread going into the office because of the layoffs rumours.", ["work", "finance"]),
    ],
    "joy": [
        ("I had a great day and felt really relaxed.", ["health"]),
        ("Went for a long walk this morning and felt so much lighter.", ["health"]),
        ("Dinner with family was lovely and I laughed a lot.", ["family"]),
        ("I finished my assignment early and feel proud of myself.", ["study"]),
    ],
    "stress": [
        ("Work is annoying but manageable.", ["work"]),
        ("Deadlines are piling up and I don't know where to start.", ["work", "study"]),
        ("Money is tight this month and I keep going over the budget in my head.", ["finance"]),
        ("There is too much on my plate and I feel stretched thin.", ["work", "study"]),
        ("Back-to-back meetings all day and no time to even eat lunch.", ["work"]),
    ],
    "neutral": [
        ("Just a regular day, nothing special happened.", []),
        ("Did some laundry and cooked dinner. Quiet evening.", ["family"]),
        ("Went to work, came home, watched an episode of a show.", ["work"]),
    ],
}

# (name, start_stress, end_stress, label)
CLIENT_PROFILES = [
    ("Aarav Sharma", 42, 84, "increasing"), ("Diya Reddy", 78, 34, "decreasing"),
    ("Kabir Nair", 50, 52, "stable"), ("Meera Iyer", 28, 30, "stable-low"),
    ("Rohan Gupta", 58, 88, "increasing"), ("Sneha Rao", 56, 44, "decreasing"),
    ("Vikram Singh", 82, 72, "stable-high"), ("Ananya Das", 24, 32, "stable-low"),
    ("Ishaan Patel", 44, 66, "increasing"), ("Lakshmi Menon", 72, 38, "decreasing"),
]
PSYCHOLOGISTS = [
    ("Dr. Priya Kulkarni", "PSY-KA-10021", "Anxiety and stress management", 12, ["en", "hi"]),
    ("Dr. Arjun Venkatesh", "PSY-TS-20345", "Depression and mood disorders", 9, ["en", "te"]),
    ("Dr. Fatima Khan", "PSY-MH-30877", "Workplace and student wellbeing", 7, ["en", "hi"]),
]
STOP = set("i a an the and or of to in on at my me is am are was it that this so but for with not no just all really very".split())


def stress_level(score: float, low_max=33, mod_max=66) -> str:
    return "low" if score <= low_max else "moderate" if score <= mod_max else "high"


def questionnaire_band(q: dict, total: int) -> str:
    for b in q["scoring_rules"]["bands"]:
        if b["min"] <= total <= b["max"]:
            return b["label"]
    return "Unknown"


def build(encrypt: Callable[[str, str], str], hash_pw: Callable[[str], str], demo_password: str,
          now: datetime | None = None, seed: int = 42) -> "OrderedDict[str, list[dict]]":
    rng = random.Random(seed)
    now = now or datetime.now(timezone.utc)
    T: "OrderedDict[str, list[dict]]" = OrderedDict((k, []) for k in [
        "users", "profiles", "psychologist_profiles", "notification_preferences", "emergency_contacts", "consents",
        "availability_slots", "patient_assignments", "journal_entries", "analysis_results", "crisis_alerts",
        "alert_actions", "chat_sessions", "chat_messages", "trend_summaries", "recommendations", "response_templates",
        "recommendation_history", "resources_helplines", "articles", "faqs", "questionnaires",
        "questionnaire_responses", "appointments", "clinical_notes", "assignments", "messages", "announcements",
        "notifications", "goals_habits", "habit_logs", "safety_plans", "feedback", "prediction_reviews",
        "crisis_keywords", "audit_logs", "support_tickets", "role_permissions", "settings"])

    def uid() -> str:
        return str(uuid.UUID(int=rng.getrandbits(128), version=4))

    pw = hash_pw(demo_password)  # one hash reused: demo only

    def add_user(email, role, name, lang="en", phone=None, age=None):
        u = uid()
        T["users"].append(dict(id=u, email=email, phone=phone, password_hash=pw, role=role, approval_status="approved",
                               is_active=True, is_verified=True, created_at=now - timedelta(days=70)))
        T["profiles"].append(dict(user_id=u, full_name=name, age=age, language=lang, timezone="Asia/Kolkata",
                                  onboarding_done=(role == "client")))
        T["notification_preferences"].append(dict(user_id=u))
        return u

    admin = add_user("admin@mhc.demo", "admin", "Site Admin", age=40)
    staff = [add_user(f"staff{i}@mhc.demo", "staff", n, phone=f"+91900000010{i}", age=30 + i)
             for i, n in enumerate(["Neha Joshi", "Rahul Verma"], 1)]
    psys = []
    for i, (n, lic, spec, yrs, langs) in enumerate(PSYCHOLOGISTS, 1):
        p = add_user(f"psychologist{i}@mhc.demo", "psychologist", n, age=35 + i)
        psys.append(p)
        T["psychologist_profiles"].append(dict(
            user_id=p, license_no=lic, specialization=spec, experience_years=yrs, qualifications="M.Phil. Clinical Psychology",
            bio=f"{n} supports adults with {spec.lower()}. (Demo profile.)", languages=langs, fee_placeholder=800 + 100 * i,
            verification_status="approved", rating=round(4.2 + 0.2 * i, 2)))
    clients = []
    for i, (n, *_r) in enumerate(CLIENT_PROFILES, 1):
        clients.append(add_user(f"client{i}@mhc.demo", "client", n, lang=["en", "hi", "te"][i % 3],
                                phone=f"+91900000{2000 + i}", age=19 + 2 * i))

    # consents, contacts, assignments --------------------------------------------------------
    for i, c in enumerate(clients):
        for typ, granted in [("disclaimer", True), ("data_use", True),
                             ("share_with_professionals", i < 8), ("research_anonymized", i % 2 == 0),
                             ("emergency_notify", i < 5)]:
            T["consents"].append(dict(id=uid(), user_id=c, type=typ, granted=granted, granted_at=now - timedelta(days=68)))
        T["emergency_contacts"].append(dict(id=uid(), user_id=c, name=f"Contact of {CLIENT_PROFILES[i][0].split()[0]}",
                                            relationship=["Parent", "Sibling", "Friend", "Partner"][i % 4],
                                            phone=f"+91988800{3000 + i}", email=f"contact{i + 1}@example.com",
                                            notify_in_crisis=(i < 5)))
        T["patient_assignments"].append(dict(id=uid(), patient_id=c, psychologist_id=psys[i % 3], staff_id=staff[i % 2],
                                             status="active", assigned_at=now - timedelta(days=65)))
    psy_of = {c: psys[i % 3] for i, c in enumerate(clients)}

    # entries + analyses across 60 days -------------------------------------------------------
    analyses_by_client: dict[str, list[dict]] = defaultdict(list)
    entries_by_client: dict[str, list[dict]] = defaultdict(list)

    def make_entry(c, ts, text, tags, mood, score, emotion, sentiment, risk="none", conf_base=0.78):
        eid, aid = uid(), uid()
        probs = {e: rng.random() * 0.1 for e in EMOTIONS}
        probs[emotion] += 0.55 + rng.random() * 0.2
        tot = sum(probs.values())
        probs = {e: round(v / tot, 4) for e, v in probs.items()}
        words = [w.strip(".,!?'").lower() for w in text.split()]
        kws = [w for w in dict.fromkeys(words) if w not in STOP and len(w) > 3][:4]
        entry = dict(id=eid, user_id=c, text_encrypted=encrypt(text, c), tags=tags, mood_emoji=mood,
                     is_locked=False, shared_with_psychologist=False, source="journal", created_at=ts, updated_at=ts)
        an = dict(id=aid, entry_id=eid, user_id=c, cleaned_text_encrypted=encrypt(" ".join(words), c), sentiment=sentiment,
                  sentiment_conf=round(conf_base + rng.random() * 0.15, 4), emotion_scores=probs, top_emotion=emotion,
                  stress_level=stress_level(score), stress_score=round(score, 2), stress_conf=round(0.7 + rng.random() * 0.2, 4),
                  risk_level=risk, keywords=[{"word": k, "weight": round(0.2 + rng.random() * 0.6, 3)} for k in kws],
                  model_version_id=None, latency_ms=rng.randint(40, 180), created_at=ts)
        T["journal_entries"].append(entry)
        T["analysis_results"].append(an)
        entries_by_client[c].append(entry)
        analyses_by_client[c].append(an)
        return entry, an

    for i, c in enumerate(clients):
        _, s0, s1, _lab = CLIENT_PROFILES[i]
        n_entries = 22 + (i % 3)
        days = sorted(rng.sample(range(0, 60), n_entries))
        for d in days:
            base = s0 + (s1 - s0) * d / 59
            score = max(2, min(98, rng.gauss(base, 7)))
            lvl = stress_level(score)
            weights = {"high": [("anxiety", .35), ("stress", .30), ("fear", .10), ("sadness", .10), ("anger", .15)],
                       "moderate": [("stress", .35), ("sadness", .2), ("anxiety", .2), ("anger", .15), ("neutral", .10)],
                       "low": [("joy", .40), ("neutral", .40), ("sadness", .10), ("stress", .10)]}[lvl]
            emotion = rng.choices([w[0] for w in weights], [w[1] for w in weights])[0]
            sentiment = "positive" if emotion == "joy" else "neutral" if emotion == "neutral" else "negative"
            text, tags = rng.choice(TEXT_POOL[emotion])
            hour = rng.choice([8, 9, 13, 21, 22, 23]) if i % 2 else rng.choice([7, 12, 18, 20])
            ts = (now - timedelta(days=59 - d)).replace(hour=hour, minute=rng.randint(0, 59), second=0, microsecond=0)
            mood = 5 if lvl == "low" else 3 if lvl == "moderate" else (2 if score <= 80 else 1)
            e, a = make_entry(c, ts, text, tags, mood, score, emotion, sentiment)
            if i < 8 and rng.random() < 0.3:
                e["shared_with_psychologist"] = True

    # two crisis entries + alerts -------------------------------------------------------------
    crit_e, _ = make_entry(clients[0], now - timedelta(days=1, hours=2), "I feel like I can't go on anymore.", ["health"],
                           1, 95, "sadness", "negative", risk="critical", conf_base=0.85)
    elev_e, _ = make_entry(clients[4], now - timedelta(hours=6), "Everything feels hopeless lately and I'm so tired.", ["sleep"],
                           1, 88, "sadness", "negative", risk="elevated", conf_base=0.8)
    a1, a2 = uid(), uid()
    T["crisis_alerts"] += [
        dict(id=a1, user_id=clients[0], entry_id=crit_e["id"], risk_level="critical", matched_terms=["can't go on"],
             status="in_progress", assigned_to=psy_of[clients[0]], notified_at=now - timedelta(days=1, hours=2),
             acknowledged_at=now - timedelta(days=1, hours=1, minutes=40), sla_due_at=now - timedelta(days=1, hours=1, minutes=30),
             created_at=now - timedelta(days=1, hours=2)),
        dict(id=a2, user_id=clients[4], entry_id=elev_e["id"], risk_level="elevated", matched_terms=["hopeless"],
             status="created", assigned_to=None, sla_due_at=now + timedelta(minutes=30), created_at=now - timedelta(hours=6)),
    ]
    T["alert_actions"] += [
        dict(id=uid(), alert_id=a1, actor_id=psy_of[clients[0]], action="acknowledge", note="Reviewing.", created_at=now - timedelta(days=1, hours=1, minutes=40)),
        dict(id=uid(), alert_id=a1, actor_id=psy_of[clients[0]], action="call_logged", note="Reached client; safety plan reviewed. (Demo)", created_at=now - timedelta(days=1, hours=1)),
    ]

    # weekly trend summaries -------------------------------------------------------------------
    for c in clients:
        weeks: dict[date, list[dict]] = defaultdict(list)
        for a in analyses_by_client[c]:
            d = a["created_at"].date()
            weeks[d - timedelta(days=d.weekday())].append(a)
        prev = None
        for start in sorted(weeks):
            rows = weeks[start]
            avg = sum(r["stress_score"] for r in rows) / len(rows)
            pct = None if prev in (None, 0) else round((avg - prev) / prev * 100, 2)
            direction = "stable" if pct is None or abs(pct) < 5 else "increasing" if pct > 0 else "decreasing"
            T["trend_summaries"].append(dict(id=uid(), user_id=c, period_type="weekly", period_start=start,
                                             avg_stress=round(avg, 2), dominant_emotion=Counter(r["top_emotion"] for r in rows).most_common(1)[0][0],
                                             direction=direction, pct_change=pct, entries_count=len(rows)))
            prev = avg

    # chat, recommendations, content -----------------------------------------------------------
    sess = uid()
    T["chat_sessions"].append(dict(id=sess, user_id=clients[1], started_at=now - timedelta(days=3), ended_at=now - timedelta(days=3) + timedelta(minutes=9)))
    for k, (who, txt) in enumerate([("user", "Work has been overwhelming this week."), ("bot", C.TEMPLATES[5][3] + " What feels heaviest right now?"),
                                    ("user", "Mostly the deadlines. I can't sleep well either.")]):
        T["chat_messages"].append(dict(id=uid(), session_id=sess, sender=who, text_encrypted=encrypt(txt, clients[1]),
                                       created_at=now - timedelta(days=3) + timedelta(minutes=2 * k)))
    reco_ids = []
    for cat, title, body, emo, stress, trend in C.RECOMMENDATIONS:
        rid = uid(); reco_ids.append(rid)
        T["recommendations"].append(dict(id=rid, category=cat, title=title, body=body, target_emotion=emo, target_stress=stress, target_trend=trend))
    for st in ("shown", "done", "saved"):
        T["recommendation_history"].append(dict(id=uid(), user_id=clients[0], recommendation_id=rng.choice(reco_ids), status=st,
                                                feedback=1 if st == "done" else None, created_at=now - timedelta(days=2)))
    for kind, emo, stress, body in C.TEMPLATES:
        T["response_templates"].append(dict(id=uid(), kind=kind, target_emotion=emo, target_stress=stress, body=body))
    for country, region, name, phone, web, hours, lang, typ in C.HELPLINES:
        T["resources_helplines"].append(dict(id=uid(), country=country, region=region, name=name, phone=phone, website=web,
                                             hours=hours, language=lang, type=typ, verified=False))
    T["articles"] += [dict(id=uid(), title="Understanding everyday stress", body="Stress is the body's response to demands. Short-term stress is normal; ongoing stress deserves attention...", category="stress", published=True),
                      dict(id=uid(), title="Getting better sleep", body="Keep a regular schedule, limit caffeine after noon, and wind down without screens...", category="sleep", published=True)]
    for n, (q, a) in enumerate(C.FAQS):
        T["faqs"].append(dict(id=uid(), question=q, answer=a, sort_order=n))
    qids = {}
    for q in C.QUESTIONNAIRES:
        qids[q["code"]] = uid()
        T["questionnaires"].append(dict(id=qids[q["code"]], code=q["code"], title=q["title"], questions=q["questions"], scoring_rules=q["scoring_rules"]))
    qmap = {q["code"]: q for q in C.QUESTIONNAIRES}
    for i, c in enumerate(clients[:5]):
        for code in ("PHQ9", "GAD7", "PSS10"):
            q = qmap[code]; items = q["questions"]["items"]; top = len(q["questions"]["options"]) - 1
            hi = CLIENT_PROFILES[i][2] / 100
            answers = [min(top, max(0, round(rng.gauss(hi * top, 0.8)))) for _ in items]
            rev = q["scoring_rules"].get("reverse_items", [])
            total = sum((top - a) if k in rev else a for k, a in enumerate(answers))
            T["questionnaire_responses"].append(dict(id=uid(), user_id=c, questionnaire_id=qids[code], answers=answers, total_score=total,
                                                     band=questionnaire_band(q, total), created_at=now - timedelta(days=rng.randint(1, 30))))
    for phrase, sev, lang in C.CRISIS_KEYWORDS:
        T["crisis_keywords"].append(dict(id=uid(), phrase=phrase, severity=sev, language=lang))
    for role, perms in C.PERMISSIONS.items():
        for p in perms:
            T["role_permissions"].append(dict(role=role, permission=p, allowed=True))
    for k, v in C.SETTINGS.items():
        T["settings"].append(dict(key=k, value=v))

    # availability, appointments, notes, assignments, messages --------------------------------
    slots_by_psy: dict[str, list[dict]] = defaultdict(list)
    base_day = now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    for p in psys:
        for d in range(7):
            for h in (4, 8, 11):  # UTC hours ~ 09:30 / 13:30 / 16:30 IST
                s0_ = base_day + timedelta(days=d, hours=h)
                slot = dict(id=uid(), psychologist_id=p, start_at=s0_, end_at=s0_ + timedelta(hours=1), is_booked=False)
                slots_by_psy[p].append(slot)
                T["availability_slots"].append(slot)
    for n, c in enumerate(clients[:4]):
        p = psy_of[c]
        slot = next(sl for sl in slots_by_psy[p] if not sl["is_booked"])
        slot["is_booked"] = True
        T["appointments"].append(dict(id=uid(), patient_id=c, psychologist_id=p, slot_id=slot["id"], start_at=slot["start_at"],
                                      end_at=slot["end_at"], status="confirmed" if n % 2 == 0 else "requested", mode="video",
                                      video_link="https://meet.example.com/demo-room"))
    past_appts = []
    for c in clients[:3]:
        aid = uid(); past_appts.append((aid, c))
        s = now - timedelta(days=10)
        T["appointments"].append(dict(id=aid, patient_id=c, psychologist_id=psy_of[c], start_at=s, end_at=s + timedelta(hours=1), status="completed", mode="video"))
    n1 = uid()
    T["clinical_notes"] += [
        dict(id=n1, psychologist_id=psy_of[clients[0]], patient_id=clients[0], appointment_id=past_appts[0][0],
             note_encrypted=encrypt("Session 1: Client reports work pressure and disturbed sleep. Explored routines. (Demo note)", clients[0]),
             plan_encrypted=encrypt("Sleep hygiene plan; weekly check-ins.", clients[0]), follow_up_date=(now + timedelta(days=7)).date(), version=1, created_at=now - timedelta(days=10)),
        dict(id=uid(), psychologist_id=psy_of[clients[0]], patient_id=clients[0], note_encrypted=encrypt("Session 1 (revised): added coping-skill review. (Demo note)", clients[0]),
             plan_encrypted=encrypt("Sleep hygiene plan; weekly check-ins; introduce grounding.", clients[0]), follow_up_date=(now + timedelta(days=7)).date(), version=2, parent_note_id=n1, created_at=now - timedelta(days=9)),
    ]
    for c, title in [(clients[0], "Practice 4-7-8 breathing daily"), (clients[0], "Keep a worry notebook by the bed"),
                     (clients[1], "Ten-minute walk after lunch"), (clients[2], "Complete a CBT thought record")]:
        T["assignments"].append(dict(id=uid(), psychologist_id=psy_of[c], patient_id=c, title=title, due_date=(now + timedelta(days=5)).date(), status="assigned"))
    p1, c1 = psy_of[clients[0]], clients[0]
    for k, (snd, rcv, txt) in enumerate([(c1, p1, "Hi, could we move our next session earlier?"), (p1, c1, "Of course - I'll check my availability."),
                                         (p1, c1, "Tomorrow morning works. Please keep journaling until then.")]):
        T["messages"].append(dict(id=uid(), sender_id=snd, receiver_id=rcv, body_encrypted=encrypt(txt, snd),
                                  read_at=now if k < 2 else None, created_at=now - timedelta(hours=8 - 2 * k)))
    T["announcements"] += [dict(id=uid(), author_id=staff[0], audience="clients", title="Weekly check-in reminder", body="Remember to log how you're feeling this week."),
                           dict(id=uid(), author_id=admin, audience="all", title="Welcome to the demo", body="This is demo data. Nothing here is real.")]
    for c in clients:
        T["notifications"].append(dict(id=uid(), user_id=c, channel="in_app", kind="reminder", title="Time to check in", body="How are you feeling today?", is_read=False))

    # goals / habits / safety plan --------------------------------------------------------------
    for c in clients[:3]:
        for typ, target, unit in [("sleep", 7.5, "hours"), ("meditation", 10, "minutes")]:
            gid = uid()
            T["goals_habits"].append(dict(id=gid, user_id=c, type=typ, target=target, unit=unit, frequency="daily", streak=rng.randint(1, 9), best_streak=12))
            for d in range(14):
                T["habit_logs"].append(dict(id=uid(), goal_id=gid, log_date=(now - timedelta(days=d)).date(), value=round(target * rng.uniform(0.6, 1.1), 1)))
    T["safety_plans"].append(dict(id=uid(), user_id=clients[0], warning_signs=["Not sleeping for 2+ nights", "Withdrawing from friends"],
                                  coping_steps=["4-7-8 breathing", "Walk around the block", "Listen to calming music"],
                                  safe_places=["Living room", "Neighbourhood park"], environment_safety=["Ask a family member to hold medication"],
                                  contacts=[{"name": "Sibling", "phone": "+919888003000"}],
                                  professional_contacts=[{"name": PSYCHOLOGISTS[0][0], "phone": ""}, {"name": "Tele-MANAS", "phone": "14416"}]))
    T["feedback"] += [dict(id=uid(), user_id=clients[0], target_type="app", rating=5, comment="Calming design."),
                      dict(id=uid(), user_id=clients[1], target_type="analysis", target_id=analyses_by_client[clients[1]][0]["id"], rating=4, comment="Mostly accurate.")]
    T["support_tickets"] += [dict(id=uid(), user_id=clients[2], subject="Cannot change language", body="The language selector does not save.", status="open", priority="normal"),
                             dict(id=uid(), user_id=clients[3], subject="Export my data", body="How do I download my journal?", status="in_progress", priority="low", assigned_to=staff[0])]
    # human-in-the-loop reviews on consented patient c1 (psy1)
    for a in analyses_by_client[clients[0]][:3]:
        ok = rng.random() > 0.35
        T["prediction_reviews"].append(dict(id=uid(), analysis_id=a["id"], reviewer_id=psy_of[clients[0]], is_correct=ok,
                                            corrected_emotion=None if ok else "stress", corrected_stress=None if ok else "moderate",
                                            comment=None if ok else "Reads as work stress rather than anxiety. (Demo)"))
    for k, (actor, action) in enumerate([(admin, "auth.login"), (psys[0], "auth.login"), (psys[0], "patient.view"), (admin, "seed.completed")]):
        T["audit_logs"].append(dict(id=uid(), actor_id=actor, action=action, target_type="system", ip="127.0.0.1",
                                    metadata={"note": "seeded demo event"}, created_at=now - timedelta(minutes=10 * (4 - k))))
    return T


# --------------------------------------------------------------------------------------------
def _run(reset: bool, dry: bool) -> None:
    import os
    os.environ.setdefault("JWT_SECRET", "change_me_seed")
    if dry:
        os.environ.setdefault("DATA_ENCRYPTION_KEY", "change_me")

    if dry:
        T = build(lambda t, aad: f"enc({len(t)})", lambda p: "hash", "x")
    else:
        from sqlalchemy import MetaData, text, func, select
        from app.core.config import get_settings
        from app.core.crypto import get_cipher
        from app.core.security import hash_password
        from app.db.session import engine
        s = get_settings()
        cipher = get_cipher()
        meta = MetaData()
        meta.reflect(bind=engine)
        with engine.begin() as conn:
            if reset:
                names = ", ".join(f'"{t}"' for t in meta.tables if t != "alembic_version")
                conn.execute(text(f"TRUNCATE {names} RESTART IDENTITY CASCADE"))
            elif conn.execute(select(func.count()).select_from(meta.tables["users"]).where(meta.tables["users"].c.email == "admin@mhc.demo")).scalar():
                print("Demo data already present. Use --reset to re-seed.")
                return
            T = build(lambda t, aad: cipher.encrypt(t, aad=aad), hash_password, s.SEED_DEMO_PASSWORD)
            for name, rows in T.items():
                if not rows:
                    continue
                groups: dict[frozenset, list[dict]] = defaultdict(list)
                for r in rows:
                    groups[frozenset(r)].append(r)
                for grp in groups.values():
                    conn.execute(meta.tables[name].insert(), grp)
    for name, rows in T.items():
        print(f"{name:28s}{len(rows):>5d}")
    print("\nDry run only - nothing written." if dry else f"\nSeeded. Demo password: {os.environ.get('SEED_DEMO_PASSWORD', 'see .env')}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--reset", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    _run(args.reset, args.dry_run)
