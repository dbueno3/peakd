from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import auth, meets, training, nutrition, dashboard

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Peakd API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://peakd.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(meets.router)
app.include_router(training.router)
app.include_router(nutrition.router)
app.include_router(dashboard.router)


@app.get("/health")
def health():
    return {"status": "ok"}
