from datetime import date, datetime
from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float, ForeignKey,
    Integer, String, Text
)
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    federation = Column(String, default="Powerlifting America")
    weight_class = Column(Float, default=93.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    meets = relationship("Meet", back_populates="user")
    training_logs = relationship("TrainingLog", back_populates="user")
    weigh_ins = relationship("WeighIn", back_populates="user")
    nutrition_logs = relationship("NutritionLog", back_populates="user")
    check_ins = relationship("CheckIn", back_populates="user")


class Meet(Base):
    __tablename__ = "meets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    meet_date = Column(Date, nullable=False)
    location = Column(String)
    federation = Column(String)
    weight_class = Column(Float)
    is_active = Column(Boolean, default=True)

    # Attempt goals
    squat_opener = Column(Float)
    squat_second = Column(Float)
    squat_third = Column(Float)
    bench_opener = Column(Float)
    bench_second = Column(Float)
    bench_third = Column(Float)
    deadlift_opener = Column(Float)
    deadlift_second = Column(Float)
    deadlift_third = Column(Float)

    # Meet results
    squat_result = Column(Float)
    bench_result = Column(Float)
    deadlift_result = Column(Float)
    total_result = Column(Float)
    dots_result = Column(Float)

    user = relationship("User", back_populates="meets")


class TrainingLog(Base):
    __tablename__ = "training_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False, default=date.today)
    lift = Column(String, nullable=False)  # squat, bench, deadlift, etc.
    variation = Column(String)             # paused, close grip, etc.
    weight_kg = Column(Float, nullable=False)
    reps = Column(Integer, nullable=False)
    rpe = Column(Float)
    e1rm = Column(Float)
    notes = Column(Text)
    is_pr = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="training_logs")


class WeighIn(Base):
    __tablename__ = "weigh_ins"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False, default=date.today)
    weight_kg = Column(Float, nullable=False)
    notes = Column(Text)

    user = relationship("User", back_populates="weigh_ins")


class NutritionLog(Base):
    __tablename__ = "nutrition_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False, default=date.today)
    calories = Column(Integer)
    protein_g = Column(Float)
    carbs_g = Column(Float)
    fat_g = Column(Float)
    notes = Column(Text)

    user = relationship("User", back_populates="nutrition_logs")


class CheckIn(Base):
    __tablename__ = "check_ins"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    week_start = Column(Date, nullable=False)
    summary = Column(Text)           # user-written summary
    ai_response = Column(Text)       # Claude response
    training_phase = Column(String)
    avg_bodyweight = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="check_ins")
