from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_db
from ..models import Meet, User
from ..auth_utils import get_current_user
from ..calculations import get_training_phase, calculate_dots

router = APIRouter(prefix="/meets", tags=["meets"])


class MeetCreate(BaseModel):
    name: str
    meet_date: date
    location: Optional[str] = None
    federation: Optional[str] = None
    weight_class: Optional[float] = None


class AttemptUpdate(BaseModel):
    squat_opener: Optional[float] = None
    squat_second: Optional[float] = None
    squat_third: Optional[float] = None
    bench_opener: Optional[float] = None
    bench_second: Optional[float] = None
    bench_third: Optional[float] = None
    deadlift_opener: Optional[float] = None
    deadlift_second: Optional[float] = None
    deadlift_third: Optional[float] = None


class ResultUpdate(BaseModel):
    squat_result: Optional[float] = None
    bench_result: Optional[float] = None
    deadlift_result: Optional[float] = None
    bodyweight_kg: Optional[float] = None


class MeetResponse(BaseModel):
    id: int
    name: str
    meet_date: date
    location: Optional[str]
    federation: Optional[str]
    weight_class: Optional[float]
    is_active: bool
    days_out: int
    training_phase: str
    squat_opener: Optional[float]
    squat_second: Optional[float]
    squat_third: Optional[float]
    bench_opener: Optional[float]
    bench_second: Optional[float]
    bench_third: Optional[float]
    deadlift_opener: Optional[float]
    deadlift_second: Optional[float]
    deadlift_third: Optional[float]
    squat_result: Optional[float]
    bench_result: Optional[float]
    deadlift_result: Optional[float]
    total_result: Optional[float]
    dots_result: Optional[float]

    class Config:
        from_attributes = True


def _enrich(meet: Meet) -> dict:
    d = {c.name: getattr(meet, c.name) for c in meet.__table__.columns}
    d["days_out"] = (meet.meet_date - date.today()).days
    d["training_phase"] = get_training_phase(meet.meet_date)
    return d


@router.post("/", response_model=MeetResponse, status_code=201)
def create_meet(payload: MeetCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    # deactivate previous active meets
    db.query(Meet).filter(Meet.user_id == user.id, Meet.is_active == True).update({"is_active": False})
    meet = Meet(user_id=user.id, **payload.model_dump())
    db.add(meet)
    db.commit()
    db.refresh(meet)
    return _enrich(meet)


@router.get("/active", response_model=MeetResponse)
def get_active_meet(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    meet = db.query(Meet).filter(Meet.user_id == user.id, Meet.is_active == True).first()
    if not meet:
        raise HTTPException(status_code=404, detail="No active meet found")
    return _enrich(meet)


@router.get("/", response_model=list[MeetResponse])
def list_meets(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    meets = db.query(Meet).filter(Meet.user_id == user.id).order_by(Meet.meet_date.desc()).all()
    return [_enrich(m) for m in meets]


@router.patch("/{meet_id}/attempts", response_model=MeetResponse)
def update_attempts(
    meet_id: int,
    payload: AttemptUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    meet = db.query(Meet).filter(Meet.id == meet_id, Meet.user_id == user.id).first()
    if not meet:
        raise HTTPException(status_code=404, detail="Meet not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(meet, field, value)
    db.commit()
    db.refresh(meet)
    return _enrich(meet)


@router.patch("/{meet_id}/results", response_model=MeetResponse)
def update_results(
    meet_id: int,
    payload: ResultUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    meet = db.query(Meet).filter(Meet.id == meet_id, Meet.user_id == user.id).first()
    if not meet:
        raise HTTPException(status_code=404, detail="Meet not found")

    for field in ("squat_result", "bench_result", "deadlift_result"):
        val = getattr(payload, field)
        if val is not None:
            setattr(meet, field, val)

    s = meet.squat_result or 0
    b = meet.bench_result or 0
    d = meet.deadlift_result or 0
    if s + b + d > 0:
        meet.total_result = s + b + d
        if payload.bodyweight_kg:
            meet.dots_result = calculate_dots(meet.total_result, payload.bodyweight_kg)

    db.commit()
    db.refresh(meet)
    return _enrich(meet)
