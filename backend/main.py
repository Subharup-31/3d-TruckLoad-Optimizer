import sys
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings
from backend.database import engine, Base
from backend.seed import seed_database
from backend.routers import (
    auth_router,
    shipments_router,
    fleet_router,
    ai_prediction_router,
    ai_anomaly_router,
    ai_vision_router,
    ai_optimization_router,
    ai_chat_router,
    telemetry_router
)

# Auto-create tables & seed if empty
Base.metadata.create_all(bind=engine)
try:
    seed_database()
except Exception as e:
    print("Database already initialized or seeding skipped:", e)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs"
)

# CORS Configuration allowing Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 Routers
app.include_router(auth_router.router, prefix=settings.API_V1_STR)
app.include_router(shipments_router.router, prefix=settings.API_V1_STR)
app.include_router(fleet_router.router, prefix=settings.API_V1_STR)
app.include_router(ai_prediction_router.router, prefix=settings.API_V1_STR)
app.include_router(ai_anomaly_router.router, prefix=settings.API_V1_STR)
app.include_router(ai_vision_router.router, prefix=settings.API_V1_STR)
app.include_router(ai_optimization_router.router, prefix=settings.API_V1_STR)
app.include_router(ai_chat_router.router, prefix=settings.API_V1_STR)
app.include_router(telemetry_router.router)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "ai_models_loaded": {
            "delay_model": "active",
            "cost_model": "active",
            "demand_lstm": "active",
            "anomaly_detector": "active",
            "transport_gnn": "active",
            "drl_packer": "active",
            "cargo_vision": "active"
        }
    }

@app.get("/")
def root_info():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "docs": f"{settings.API_V1_STR}/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
