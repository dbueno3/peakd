from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import anthropic
from ..database import get_db
from ..models import CheckIn, TrainingLog, WeighIn, NutritionLog, Meet, User
from ..auth_utils import get_current_user
from ..calculations import get_training_phase
from ..config import settings

router = APIRouter(prefix="/checkin", tags=["checkin"])


class CheckInRequest(BaseModel):
    summary: str
    week_start: Optional[date] = None


class CheckInResponse(BaseModel):
    id: int
    week_start: date
    summary: str
    ai_response: Optional[str]
    training_phase: Optional[str]
    avg_bodyweight: Optional[float]
    created_at: str

    class Config:
        from_attributes = True


def _build_context(user: User, week_start: date, db: Session) -> str:
    week_end = week_start + timedelta(days=6)

    meet = db.query(Meet).filter(Meet.user_id == user.id, Meet.is_active == True).first()
    phase = get_training_phase(meet.meet_date) if meet else "unknown"
    days_out = (meet.meet_date - date.today()).days if meet else None

    sets = db.query(TrainingLog).filter(
        TrainingLog.user_id == user.id,
        TrainingLog.date >= week_start,
        TrainingLog.date <= week_end,
    ).all()

    weigh_ins = db.query(WeighIn).filter(
        WeighIn.user_id == user.id,
        WeighIn.date >= week_start,
        WeighIn.date <= week_end,
    ).all()

    nutrition = db.query(NutritionLog).filter(
        NutritionLog.user_id == user.id,
        NutritionLog.date >= week_start,
        NutritionLog.date <= week_end,
    ).all()

    avg_bw = round(sum(w.weight_kg for w in weigh_ins) / len(weigh_ins), 2) if weigh_ins else None
    avg_cal = round(sum(n.calories for n in nutrition if n.calories) / max(len(nutrition), 1), 0) if nutrition else None

    set_summary = "\n".join(
        f"  {s.date} | {s.lift} {s.variation or ''} {s.weight_kg}kg x{s.reps} @{s.rpe} RPE (e1RM: {s.e1rm})"
        for s in sets
    ) or "  No sets logged"

    return f"""
Athlete: {user.name}
Weight class: {user.weight_class}kg | Federation: {user.federation}
Training phase: {phase} | Days to meet: {days_out}
Meet: {meet.name if meet else 'None'} on {meet.meet_date if meet else 'N/A'}

Week {week_start} to {week_end}:
Average bodyweight: {avg_bw}kg
Average calories: {avg_cal} kcal/day

Training sets this week:
{set_summary}
""".strip()


@router.post("/", response_model=CheckInResponse, status_code=201)
def submit_checkin(
    payload: CheckInRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    week_start = payload.week_start or (date.today() - timedelta(days=date.today().weekday()))
    context = _build_context(user, week_start, db)

    weigh_ins = db.query(WeighIn).filter(
        WeighIn.user_id == user.id,
        WeighIn.date >= week_start,
        WeighIn.date <= week_start + timedelta(days=6),
    ).all()
    avg_bw = round(sum(w.weight_kg for w in weigh_ins) / len(weigh_ins), 2) if weigh_ins else None

    meet = db.query(Meet).filter(Meet.user_id == user.id, Meet.is_active == True).first()
    phase = get_training_phase(meet.meet_date) if meet else "unknown"

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    message = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=1024,
        system=(
            "You are an experienced powerlifting coach providing weekly check-in feedback. "
            "Be specific, data-driven, and encouraging. Focus on RPE trends, weight cut progress, "
            "and readiness for the upcoming meet. Keep responses under 300 words."
        ),
        messages=[
            {
                "role": "user",
                "content": f"Here is my weekly training data:\n\n{context}\n\nMy own notes:\n{payload.summary}\n\nPlease give me your coaching feedback for this week.",
            }
        ],
    )

    ai_response = message.content[0].text if message.content else None

    checkin = CheckIn(
        user_id=user.id,
        week_start=week_start,
        summary=payload.summary,
        ai_response=ai_response,
        training_phase=phase,
        avg_bodyweight=avg_bw,
    )
    db.add(checkin)
    db.commit()
    db.refresh(checkin)

    result = checkin.__dict__.copy()
    result["created_at"] = str(checkin.created_at)
    return result


@router.get("/", response_model=list[CheckInResponse])
def list_checkins(
    limit: int = 10,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    checkins = (
        db.query(CheckIn)
        .filter(CheckIn.user_id == user.id)
        .order_by(CheckIn.week_start.desc())
        .limit(limit)
        .all()
    )
    return [
        {**c.__dict__, "created_at": str(c.created_at)}
        for c in checkins
    ]
