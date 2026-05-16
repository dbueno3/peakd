import datetime
from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from ..database import get_db
from ..models import NutritionLog, WeighIn, User
from ..auth_utils import get_current_user

router = APIRouter(prefix="/nutrition", tags=["nutrition"])


class NutritionCreate(BaseModel):
    date: datetime.date = Field(default_factory=datetime.date.today)
    calories: Optional[int] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    notes: Optional[str] = None


class WeighInCreate(BaseModel):
    date: datetime.date = Field(default_factory=datetime.date.today)
    weight_kg: float
    notes: Optional[str] = None


class NutritionResponse(BaseModel):
    id: int
    date: datetime.date
    calories: Optional[int]
    protein_g: Optional[float]
    carbs_g: Optional[float]
    fat_g: Optional[float]
    notes: Optional[str]

    class Config:
        from_attributes = True


class WeighInResponse(BaseModel):
    id: int
    date: datetime.date
    weight_kg: float
    notes: Optional[str]

    class Config:
        from_attributes = True


# --- Nutrition ---

@router.post("/", response_model=NutritionResponse, status_code=201)
def log_nutrition(payload: NutritionCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    log = NutritionLog(user_id=user.id, **payload.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/", response_model=list[NutritionResponse])
def get_nutrition(
    start: Optional[datetime.date] = Query(None),
    end: Optional[datetime.date] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(NutritionLog).filter(NutritionLog.user_id == user.id)
    if start:
        q = q.filter(NutritionLog.date >= start)
    if end:
        q = q.filter(NutritionLog.date <= end)
    return q.order_by(NutritionLog.date.desc()).all()


@router.get("/averages")
def weekly_averages(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    week_ago = datetime.date.today() - timedelta(days=7)
    logs = db.query(NutritionLog).filter(
        NutritionLog.user_id == user.id, NutritionLog.date >= week_ago
    ).all()

    if not logs:
        return {"days_logged": 0, "avg_calories": None, "avg_protein_g": None, "avg_carbs_g": None, "avg_fat_g": None}

    def avg(field):
        vals = [getattr(l, field) for l in logs if getattr(l, field) is not None]
        return round(sum(vals) / len(vals), 1) if vals else None

    return {
        "days_logged": len(logs),
        "avg_calories": avg("calories"),
        "avg_protein_g": avg("protein_g"),
        "avg_carbs_g": avg("carbs_g"),
        "avg_fat_g": avg("fat_g"),
    }


# --- Weigh-ins ---

@router.post("/weigh-ins", response_model=WeighInResponse, status_code=201)
def log_weigh_in(payload: WeighInCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    entry = WeighIn(user_id=user.id, **payload.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/weigh-ins", response_model=list[WeighInResponse])
def get_weigh_ins(
    limit: int = Query(30, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return (
        db.query(WeighIn)
        .filter(WeighIn.user_id == user.id)
        .order_by(WeighIn.date.desc())
        .limit(limit)
        .all()
    )
