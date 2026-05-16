import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from ..database import get_db
from ..models import TrainingLog, User
from ..auth_utils import get_current_user
from ..calculations import calculate_e1rm

router = APIRouter(prefix="/training", tags=["training"])

MAIN_LIFTS = {"squat", "bench", "deadlift"}


class SetCreate(BaseModel):
    date: datetime.date = Field(default_factory=datetime.date.today)
    lift: str
    variation: Optional[str] = None
    weight_kg: float
    reps: int
    rpe: Optional[float] = None
    notes: Optional[str] = None


class SetResponse(BaseModel):
    id: int
    date: datetime.date
    lift: str
    variation: Optional[str]
    weight_kg: float
    reps: int
    rpe: Optional[float]
    e1rm: Optional[float]
    notes: Optional[str]
    is_pr: bool

    class Config:
        from_attributes = True


def _check_pr(db: Session, user_id: int, lift: str, e1rm: float) -> bool:
    best = (
        db.query(TrainingLog)
        .filter(TrainingLog.user_id == user_id, TrainingLog.lift == lift, TrainingLog.e1rm.isnot(None))
        .order_by(TrainingLog.e1rm.desc())
        .first()
    )
    return best is None or e1rm > best.e1rm


@router.post("/", response_model=SetResponse, status_code=201)
def log_set(payload: SetCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    e1rm = None
    is_pr = False

    if payload.rpe is not None:
        e1rm = calculate_e1rm(payload.weight_kg, payload.reps, payload.rpe)
        if e1rm and payload.lift.lower() in MAIN_LIFTS:
            is_pr = _check_pr(db, user.id, payload.lift.lower(), e1rm)

    log = TrainingLog(
        user_id=user.id,
        lift=payload.lift.lower(),
        e1rm=e1rm,
        is_pr=is_pr,
        **{k: v for k, v in payload.model_dump().items() if k != "lift"},
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/", response_model=list[SetResponse])
def get_logs(
    lift: Optional[str] = Query(None),
    start: Optional[datetime.date] = Query(None),
    end: Optional[datetime.date] = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(TrainingLog).filter(TrainingLog.user_id == user.id)
    if lift:
        q = q.filter(TrainingLog.lift == lift.lower())
    if start:
        q = q.filter(TrainingLog.date >= start)
    if end:
        q = q.filter(TrainingLog.date <= end)
    return q.order_by(TrainingLog.date.desc(), TrainingLog.id.desc()).limit(limit).all()


@router.get("/prs", response_model=list[SetResponse])
def get_prs(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return (
        db.query(TrainingLog)
        .filter(TrainingLog.user_id == user.id, TrainingLog.is_pr == True)
        .order_by(TrainingLog.lift, TrainingLog.e1rm.desc())
        .all()
    )


@router.get("/e1rm-history")
def e1rm_history(
    lift: str = Query(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = (
        db.query(TrainingLog)
        .filter(
            TrainingLog.user_id == user.id,
            TrainingLog.lift == lift.lower(),
            TrainingLog.e1rm.isnot(None),
        )
        .order_by(TrainingLog.date)
        .all()
    )
    return [{"date": r.date, "e1rm": r.e1rm, "weight_kg": r.weight_kg, "reps": r.reps, "rpe": r.rpe} for r in rows]


@router.get("/weekly-volume")
def weekly_volume(
    weeks: int = Query(12, le=52),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    since = datetime.date.today() - datetime.timedelta(weeks=weeks)
    rows = (
        db.query(TrainingLog)
        .filter(TrainingLog.user_id == user.id, TrainingLog.date >= since)
        .order_by(TrainingLog.date)
        .all()
    )

    # Group by ISO week start (Monday) and lift
    weeks_map: dict = {}
    for r in rows:
        monday = r.date - datetime.timedelta(days=r.date.weekday())
        week_key = monday.isoformat()
        tonnage = round(r.weight_kg * r.reps, 1)

        if week_key not in weeks_map:
            weeks_map[week_key] = {"week": week_key, "total_tonnage": 0.0, "total_sets": 0, "lifts": {}}

        weeks_map[week_key]["total_tonnage"] = round(weeks_map[week_key]["total_tonnage"] + tonnage, 1)
        weeks_map[week_key]["total_sets"] += 1

        lift = r.lift
        if lift not in weeks_map[week_key]["lifts"]:
            weeks_map[week_key]["lifts"][lift] = {"tonnage": 0.0, "sets": 0}
        weeks_map[week_key]["lifts"][lift]["tonnage"] = round(weeks_map[week_key]["lifts"][lift]["tonnage"] + tonnage, 1)
        weeks_map[week_key]["lifts"][lift]["sets"] += 1

    return sorted(weeks_map.values(), key=lambda x: x["week"])
