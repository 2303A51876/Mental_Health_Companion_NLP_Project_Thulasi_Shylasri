# Mental Health Companion and Stress Sentiment Tracker

> **This tool provides general support only. It is not a medical diagnosis or a substitute for professional care.**

NLP-based web app: Text -> Preprocessing -> Sentiment -> Emotion -> Stress -> Trend -> Supportive response,
with a crisis-safety layer, four roles (Client, Staff, Psychologist, Admin) and an ML admin console.

**Build status:** full-stack Phase 1 of 12 complete, plus a **finished standalone web app** (see below and `docs/PROGRESS.md`).

## Standalone web app (open and use right now)
`standalone/mental-health-companion-app.html` is one self-contained file. Double-click it, or host it anywhere static.
No server, database or install. It contains the landing page, guest demo, onboarding, dashboard, entry analysis, crisis screen,
companion chat, journal, tracker charts, self-help toolkit, PHQ-9/GAD-7/PSS-10, goals, recommendations, safety plan and helplines,
privacy center, settings (theme, text size, contrast, EN/HI/TE nav labels) and admin tools (crisis keywords, stress bands, engine checks).

- Analysis uses a transparent lexicon-and-rules engine (`standalone/src/engine.js`), **not** the trained ML models.
- Data lives in the browser's local storage, unencrypted. Care-team portals, accounts, alerts to professionals and model training
  need the full-stack project (Phases 2 to 12).
- Rebuild after editing sources: `python3 standalone/build.py`. Tests: `node standalone/test_engine.js`; browser smoke test: `python3 standalone/smoke.py` (needs Playwright).

## Quick start (Docker)

```bash
cp .env.example .env
# generate real secrets and paste them into .env
python -c "import secrets; print(secrets.token_urlsafe(64))"                    # JWT_SECRET
python -c "import os,base64; print(base64.b64encode(os.urandom(32)).decode())"  # DATA_ENCRYPTION_KEY

docker compose up --build -d         # db, redis, backend (runs migrations), frontend, nginx
docker compose exec backend python -m app.db.seed          # demo data
# docker compose exec backend python -m app.db.seed --reset  # wipe + reseed
```

- App: http://localhost:8080  - API health: http://localhost:8080/health  - Swagger: http://localhost:8080/docs

## Demo credentials (seed data only)
Password for every demo account: value of `SEED_DEMO_PASSWORD` (default `Demo@12345`). **Never use in production.**

| Role | Email |
|---|---|
| Admin | admin@mhc.demo |
| Staff | staff1@mhc.demo, staff2@mhc.demo |
| Psychologist | psychologist1@mhc.demo ... psychologist3@mhc.demo |
| Client | client1@mhc.demo ... client10@mhc.demo |

`client1` has an upward stress trend plus a critical crisis alert; `client5` has an elevated alert; `client2`/`client10` trend downward.

## What Phase 1 contains
- `database/schema.sql` - 44 tables (UUID PKs, CHECK enums, indexes, `updated_at` triggers, append-only `audit_logs`).
- `database/er_diagram.mmd` - Mermaid ER diagram. `backend/alembic/versions/0001_initial_schema.py` applies the schema.
- `backend/app/core/crypto.py` - AES-256-GCM field encryption (journal, chat, messages, clinical notes).
- `backend/app/db/seed.py` - 16 users, 231 analysed entries over 60 days, alerts, appointments, questionnaires, helplines, crisis keywords.
- Docker (db, redis, backend, frontend, nginx), `.env.example`, GitHub Actions CI, minimal frontend shell with the Section 5 design tokens.

## Tests
```bash
cd backend && pytest        # crypto + seed-integrity tests (no DB needed)
```

## Safety notes
- Seeded helpline numbers are marked `verified = false`. **Verify every number before production.**
- Seeded analyses use synthetic labels, not real model output. The demo journal text is invented.
- The bundled sample dataset (Phase 3) will be synthetic; real data requires ethics approval (see `datasets.ethics_approval_ref`).
