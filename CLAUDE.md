# Peakd — CLAUDE.md

## Project Overview
Peakd is an RPE-based meet prep tracker built for competitive powerlifters. It is simultaneously a personal training tool and a portfolio project. The user competes in the 93kg class, PA federation.

## Tech Stack
- **Backend:** FastAPI, SQLAlchemy (ORM), PostgreSQL, Pydantic v2, python-jose (JWT), passlib (bcrypt)
- **Frontend (not yet started):** React + Vite + Tailwind CSS + Recharts
- **Deploy target:** Railway (API + PostgreSQL), Vercel (frontend)
- **AI features (v2 only, deferred):** Anthropic API / Claude — weekly coaching check-in

## Backend Structure
```
app/
  main.py          # FastAPI app, CORS, router registration
  config.py        # pydantic-settings Settings class
  database.py      # SQLAlchemy engine, SessionLocal, Base, get_db()
  models.py        # SQLAlchemy models: User, Meet, TrainingLog, WeighIn, NutritionLog, CheckIn
  calculations.py  # e1RM (RTS table), DOTS score, training phase, weight cut projection
  auth_utils.py    # hash_password, verify_password, create_access_token, get_current_user
  routers/
    auth.py        # POST /auth/register, POST /auth/login, GET /auth/me
    meets.py       # CRUD + attempt planning + DOTS results
    training.py    # log sets, PR detection, e1RM history, weekly volume
    nutrition.py   # nutrition logs + weigh-ins
    dashboard.py   # GET /dashboard/summary (aggregated view)
    checkin.py     # AI check-in — NOT registered in main.py, deferred to v2
```

## Active Routes
- `/health`
- `/auth/register`, `/auth/login`, `/auth/me`
- `/meets/`, `/meets/active`, `/meets/{id}/attempts`, `/meets/{id}/results`
- `/training/`, `/training/prs`, `/training/e1rm-history`, `/training/weekly-volume`
- `/nutrition/`, `/nutrition/averages`, `/nutrition/weigh-ins`
- `/dashboard/summary`

## Key Conventions

### Pydantic / datetime
Always use `import datetime` and refer to types as `datetime.date`, `datetime.datetime`, etc. **Never** use `from datetime import date` inside a Pydantic model — the field name `date` shadowed the type and caused a Pydantic v2 `FieldInfo` build error. Use `Field(default_factory=datetime.date.today)` for default date fields.

### Authentication
All non-auth routes require a Bearer JWT. Use `user: User = Depends(get_current_user)` and always filter queries by `user.id` to enforce ownership.

### e1RM Calculation
Uses the RTS percentage lookup table (RPE 7.0–10.0, reps 1–10). Only calculated when `rpe` is provided. PR detection (`is_pr`) only fires for main lifts: `squat`, `bench`, `deadlift`.

### DOTS Score
Calculated on meet results using male coefficients. Stored directly on the Meet row when results are patched.

### Training Phase
Auto-detected from days to meet: off_season → hypertrophy → strength → peaking → deload → meet_week → post_meet.

### Weekly Volume
Grouped by ISO week (Monday). Returns `total_tonnage`, `total_sets`, and per-lift breakdowns. Tonnage = `weight_kg × reps`.

## Local Dev
```bash
# activate venv
source .venv/bin/activate

# start server
uvicorn app.main:app --reload

# Swagger UI
http://localhost:8000/docs
```

Database: `postgresql://dbueno3@localhost:5432/peakd` (no password, local trust auth)
Tables created automatically via `Base.metadata.create_all(bind=engine)` on startup (no Alembic migrations yet).

## Environment Variables
See `.env.example`. Real values live in `.env` (gitignored) and Railway/Vercel dashboards.
- `DATABASE_URL` — PostgreSQL connection string
- `SECRET_KEY` — JWT signing key
- `ALGORITHM` — HS256
- `ACCESS_TOKEN_EXPIRE_MINUTES` — 10080 (7 days)
- `ANTHROPIC_API_KEY` — placeholder until v2

## What's Next (v1)
1. React frontend — Vite + React + Tailwind + Recharts
   - Dashboard page: meet countdown, training phase badge, weight cut projection
   - Training page: e1RM line graph (`/training/e1rm-history`), weekly volume bar chart (`/training/weekly-volume`)
   - Meets page: attempt planner
   - Nutrition page: macro tracking + weigh-in trend

2. Postman collection for API stress testing

## Deferred (v2)
- AI weekly check-in (checkin.py is scaffolded, not wired up)
- Alembic migrations
