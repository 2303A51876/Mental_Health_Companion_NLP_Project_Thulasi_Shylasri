# Progress and feature-completion checklist

Legend: [x] done and verified  [~] scaffolded / partially done  [ ] not started

## Phase 1 - Scaffold, Docker, env, schema, migrations, seed  (COMPLETE)
- [x] Folder structure (Section 14)
- [x] docker-compose (frontend, backend, db, redis, nginx), `.env.example`, `.gitignore`
- [x] PostgreSQL DDL - `database/schema.sql` (44 tables incl. supporting tables not listed in spec)
- [x] Alembic config + migration 0001
- [x] Mermaid ER diagram - `database/er_diagram.mmd`
- [x] Seed: 1 admin, 2 staff, 3 psychologists, 10 clients, 231 entries/analyses over 60 days, recommendations,
      helplines, PHQ-9/GAD-7/PSS-10, crisis keywords, templates, settings, RBAC matrix
- [x] AES-256-GCM field encryption + tests
- [x] CI workflow, minimal frontend shell with theme tokens
- [x] Static checks: FK ordering, seed rows vs CHECK/NOT NULL/UNIQUE/FK (mutation-tested)

### Not verified in this environment (no network / no Postgres available)
- [ ] `schema.sql` executed against a real PostgreSQL 15 - **run `docker compose up` to confirm**
- [ ] Alembic migration and `python -m app.db.seed` against a live DB
- [ ] `docker compose build` (pip/npm installs), real `pytest` run (tests were exercised with a stand-in runner)

## Dataset intake (uploaded Mental_Health_Dataset.xlsx)  (AUDITED, not yet used for training)
- [x] De-identified CSV: `ml/datasets/mental_health_dataset_deidentified.csv` (identifiers dropped, `text_group` added)
- [x] Audit: `docs/ml_guide/DATASET_AUDIT.md`, `ml/datasets/dataset_audit.json`, script `ml/scripts/prepare_dataset.py`
- Key result: 11 unique sentences in 1,500 rows -> random-split metrics are leakage; crisis flag has no textual signal.

## Standalone web app (COMPLETE, verified in headless Chromium)
- [x] `standalone/mental-health-companion-app.html` (158 KB, single file); sources in `standalone/src`
- [x] Engine: preprocessing, sentiment, emotion, stress score, crisis layer, explainability, trends, response generator
- [x] Spec test inputs pass: pressure/sleep -> Negative, Anxiety, High; great day -> Positive, Joy, Low; work annoying but manageable -> Neutral, Stress, Moderate; "can't go on" -> Crisis flow
- [x] Client module pages: dashboard, new entry + result, chat, journal, tracker, toolkit, assessments, goals, recommendations, professionals (sample), safety plan, privacy, settings, help
- [x] Admin tools subset: crisis keywords with test-a-phrase, stress bands, built-in checks
- [ ] Not in standalone: accounts, 2FA, psychologist/staff portals, real alert delivery, trained models, server-side encryption

## Phases 2-12
- [ ] 2 Auth, RBAC, users, profiles, consents, audit logging
- [ ] 3 NLP engine, baseline model, crisis detector, explainability, /analyze
- [ ] 4 Trends, recommendation engine, response generator
- [ ] 5 Frontend foundation + Client module
- [ ] 6 Chat, self-help, assessments, goals, safety plan, emergency flow
- [ ] 7 Psychologist module
- [ ] 8 Staff module
- [ ] 9 Admin module + model training (TF-IDF+LR, DistilBERT, RoBERTa)
- [ ] 10 Notifications, jobs, exports, i18n
- [ ] 11 Tests, hardening, accessibility, docs
- [ ] 12 Final checklist mapping every prompt section to code
