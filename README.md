# Peakd

An RPE-based meet prep tracker built for competitive powerlifters. Log training, track e1RM trends, plan attempts, monitor nutrition, and project weight cuts — all in one place.

> Built for the 93kg class, PA federation. Also a portfolio project.

---

## Features

- **Training logs** — log sets with weight, reps, and RPE; auto-calculates e1RM using the RTS table
- **PR detection** — automatically flags personal records on squat, bench, and deadlift
- **e1RM history** — week-over-week strength trend per lift
- **Weekly volume** — tonnage and set count grouped by ISO week with per-lift breakdowns
- **Meet management** — create meets, plan openers/seconds/thirds, record results with auto DOTS scoring
- **Nutrition tracking** — log daily macros and body weight, view 7-day averages
- **Dashboard** — meet countdown, training phase badge, weight cut projection, recent PRs
- **JWT auth** — all routes are user-scoped with Bearer token authentication

---

## Tech Stack

| Layer | Tech |
|---|---|
| API | FastAPI |
| ORM | SQLAlchemy |
| Database | PostgreSQL |
| Auth | python-jose (JWT) + passlib (bcrypt) |
| Validation | Pydantic v2 |
| Frontend *(planned)* | React + Vite + Tailwind CSS + Recharts |
| Deploy | Railway (API + DB) · Vercel (frontend) |

---

## Getting Started

### Prerequisites
- Python 3.11+
- PostgreSQL

### Setup

```bash
# Clone the repo
git clone https://github.com/dbueno3/peakd.git
cd peakd

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and SECRET_KEY

# Start the server
uvicorn app.main:app --reload
```

API will be running at `http://localhost:8000`
Interactive docs at `http://localhost:8000/docs`

---

## API Overview

| Method | Route | Description |
|---|---|---|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Get JWT token |
| GET | `/auth/me` | Current user info |
| GET/POST | `/training/` | Log and retrieve sets |
| GET | `/training/prs` | All-time PRs |
| GET | `/training/e1rm-history` | e1RM trend for a lift |
| GET | `/training/weekly-volume` | Tonnage grouped by week |
| GET/POST | `/meets/` | Create and list meets |
| GET | `/meets/active` | Upcoming meet |
| PATCH | `/meets/{id}/attempts` | Plan openers/seconds/thirds |
| PATCH | `/meets/{id}/results` | Record results + auto DOTS |
| GET/POST | `/nutrition/` | Log and retrieve macros |
| GET | `/nutrition/averages` | 7-day macro averages |
| GET/POST | `/nutrition/weigh-ins` | Body weight log |
| GET | `/dashboard/summary` | Aggregated dashboard data |

---

## Environment Variables

See `.env.example` for the full list.

```
DATABASE_URL=postgresql://user:password@localhost:5432/peakd
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
ANTHROPIC_API_KEY=your-key-here  # v2 only
```

---

## Roadmap

**v1 — in progress**
- [ ] React frontend (Vite + Tailwind + Recharts)
  - Dashboard: countdown, phase badge, weight cut projection
  - Training: e1RM line graph, weekly volume bar chart
  - Meets: attempt planner
  - Nutrition: macro log + weigh-in trend

**v2 — deferred**
- [ ] AI weekly coaching check-in (Anthropic API)
- [ ] Alembic migrations
