from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Meet, TrainingLog, WeighIn, NutritionLog, CheckIn, User
from ..auth_utils import get_current_user
from ..calculations import get_training_phase, project_weight_cut

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def summary(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    meet = db.query(Meet).filter(Meet.user_id == user.id, Meet.is_active == True).first()

    # Meet countdown
    meet_info = None
    if meet:
        days_out = (meet.meet_date - date.today()).days
        phase = get_training_phase(meet.meet_date)
        meet_info = {
            "name": meet.name,
            "date": meet.meet_date,
            "days_out": days_out,
            "training_phase": phase,
        }

    # Latest bodyweight + weight cut projection
    weigh_ins = (
        db.query(WeighIn)
        .filter(WeighIn.user_id == user.id)
        .order_by(WeighIn.date.desc())
        .limit(8)
        .all()
    )
    latest_bw = weigh_ins[0].weight_kg if weigh_ins else None
    weight_cut = None
    if latest_bw and meet:
        weight_cut = project_weight_cut(
            current_weight=latest_bw,
            target_weight=user.weight_class,
            days_to_meet=(meet.meet_date - date.today()).days,
            weekly_logs=[w.weight_kg for w in weigh_ins],
        )

    # This week's nutrition averages
    week_ago = date.today() - timedelta(days=7)
    nutrition = db.query(NutritionLog).filter(
        NutritionLog.user_id == user.id, NutritionLog.date >= week_ago
    ).all()

    def avg(field):
        vals = [getattr(n, field) for n in nutrition if getattr(n, field) is not None]
        return round(sum(vals) / len(vals), 1) if vals else None

    nutrition_summary = {
        "days_logged": len(nutrition),
        "avg_calories": avg("calories"),
        "avg_protein_g": avg("protein_g"),
    }

    # Recent PRs
    recent_prs = (
        db.query(TrainingLog)
        .filter(TrainingLog.user_id == user.id, TrainingLog.is_pr == True)
        .order_by(TrainingLog.date.desc())
        .limit(5)
        .all()
    )
    prs = [{"date": p.date, "lift": p.lift, "weight_kg": p.weight_kg, "reps": p.reps, "rpe": p.rpe, "e1rm": p.e1rm} for p in recent_prs]

    # Latest check-in
    last_checkin = (
        db.query(CheckIn)
        .filter(CheckIn.user_id == user.id)
        .order_by(CheckIn.week_start.desc())
        .first()
    )
    checkin_summary = None
    if last_checkin:
        checkin_summary = {
            "week_start": last_checkin.week_start,
            "training_phase": last_checkin.training_phase,
            "avg_bodyweight": last_checkin.avg_bodyweight,
            "ai_response_preview": (last_checkin.ai_response or "")[:200],
        }

    return {
        "athlete": {"name": user.name, "weight_class": user.weight_class, "federation": user.federation},
        "meet": meet_info,
        "weight_cut": weight_cut,
        "nutrition": nutrition_summary,
        "recent_prs": prs,
        "last_checkin": checkin_summary,
    }
