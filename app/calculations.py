from datetime import date
from typing import Optional

# RTS e1RM table: rpe -> {reps: percentage_of_1rm}
RTS_TABLE = {
    10.0: {1: 1.000, 2: 0.955, 3: 0.922, 4: 0.892, 5: 0.863, 6: 0.837, 7: 0.811, 8: 0.786, 9: 0.762, 10: 0.739},
    9.5:  {1: 0.978, 2: 0.933, 3: 0.900, 4: 0.871, 5: 0.843, 6: 0.817, 7: 0.791, 8: 0.767, 9: 0.743, 10: 0.720},
    9.0:  {1: 0.955, 2: 0.922, 3: 0.889, 4: 0.860, 5: 0.832, 6: 0.807, 7: 0.781, 8: 0.758, 9: 0.734, 10: 0.711},
    8.5:  {1: 0.933, 2: 0.900, 3: 0.868, 4: 0.840, 5: 0.812, 6: 0.787, 7: 0.762, 8: 0.739, 9: 0.716, 10: 0.693},
    8.0:  {1: 0.911, 2: 0.878, 3: 0.847, 4: 0.820, 5: 0.793, 6: 0.768, 7: 0.743, 8: 0.720, 9: 0.697, 10: 0.674},
    7.5:  {1: 0.889, 2: 0.857, 3: 0.826, 4: 0.799, 5: 0.773, 6: 0.748, 7: 0.724, 8: 0.700, 9: 0.678, 10: 0.656},
    7.0:  {1: 0.868, 2: 0.836, 3: 0.805, 4: 0.779, 5: 0.753, 6: 0.729, 7: 0.705, 8: 0.681, 9: 0.659, 10: 0.638},
}

# DOTS coefficients (male)
DOTS_COEFFICIENTS = [-307.75076, 24.0900756, -0.1918759221, 0.0007391293, -0.000001093]


def calculate_e1rm(weight_kg: float, reps: int, rpe: float) -> Optional[float]:
    rpe = round(rpe * 2) / 2  # round to nearest 0.5
    rpe = max(7.0, min(10.0, rpe))
    reps = max(1, min(10, reps))

    row = RTS_TABLE.get(rpe)
    if row is None:
        return None
    pct = row.get(reps)
    if pct is None:
        return None

    return round(weight_kg / pct, 2)


def calculate_dots(total_kg: float, bodyweight_kg: float) -> float:
    bw = bodyweight_kg
    denom = sum(c * (bw ** i) for i, c in enumerate(DOTS_COEFFICIENTS))
    denom = max(denom, 1.0)
    return round(500 / denom * total_kg, 2)


def get_training_phase(meet_date: date, today: Optional[date] = None) -> str:
    if today is None:
        today = date.today()
    days_out = (meet_date - today).days

    if days_out < 0:
        return "post_meet"
    elif days_out <= 7:
        return "meet_week"
    elif days_out <= 21:
        return "deload"
    elif days_out <= 49:
        return "peaking"
    elif days_out <= 105:
        return "strength"
    elif days_out <= 175:
        return "hypertrophy"
    else:
        return "off_season"


def project_weight_cut(
    current_weight: float,
    target_weight: float,
    days_to_meet: int,
    weekly_logs: list[float],
) -> dict:
    if not weekly_logs:
        avg_rate = 0.0
    else:
        avg_rate = (weekly_logs[0] - weekly_logs[-1]) / max(len(weekly_logs) - 1, 1)

    weeks_out = days_to_meet / 7
    projected_weight = current_weight - (avg_rate * weeks_out)
    kg_to_cut = current_weight - target_weight
    on_track = projected_weight <= target_weight

    return {
        "current_weight": current_weight,
        "target_weight": target_weight,
        "kg_to_cut": round(kg_to_cut, 2),
        "avg_weekly_loss": round(avg_rate, 3),
        "projected_meet_weight": round(projected_weight, 2),
        "on_track": on_track,
        "weeks_out": round(weeks_out, 1),
    }
