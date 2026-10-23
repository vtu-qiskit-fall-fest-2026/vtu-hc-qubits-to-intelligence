"""QuantumGuard AI - Main FastAPI Application Server

AI-Powered Anomaly Detection for Quantum Communication Networks.
Serves simulation, baseline calibration, explainable alerts, detection engines,
and independent benchmark evaluation APIs.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
from pathlib import Path

from app.database.db import init_db
from app.database.repository import DatabaseRepository
from app.simulator.models import SimulationConfig
from app.simulator.bb84 import BB84Simulator
from app.analytics.baseline import calibrate_baseline
from app.analytics.features import extract_features
from app.api.routes_simulator import ml_detector, router as simulator_router
from app.api.routes_baseline import router as baseline_router
from app.api.routes_detection import router as detection_router
from app.api.routes_alerts import router as alerts_router
from app.api.routes_history import router as history_router
from app.api.routes_evaluation import router as evaluation_router
from app.api.routes_audio import router as audio_router
import numpy as np


def seed_default_baseline_if_empty() -> None:
    """Ensure at least one active calibrated baseline exists on clean startup."""
    active = DatabaseRepository.get_active_baseline()
    if active is None:
        runs = []
        vectors = []
        for i in range(8):
            cfg = SimulationConfig(
                scenario_id="normal_background_noise",
                scenario_name=f"Operational Fiber Reference (Seed {i+1})",
                num_pulses=1500,
                noise_prob=0.015,
                loss_prob=0.10,
                eve_prob=0.0,
                test_bit_fraction=0.5,
                random_seed=1000 + i,
            )
            sim = BB84Simulator(cfg)
            res = sim.run()
            runs.append(res)
            DatabaseRepository.save_run(res)

        baseline = calibrate_baseline(
            runs=runs,
            name="Default Operational Telecom Baseline",
            version="1.0.0",
            sensitivity="medium"
        )

        for r in runs:
            feats = extract_features(r.metrics, baseline)
            vectors.append(feats.to_vector())

        if len(vectors) >= 5:
            ml_detector.fit(np.array(vectors))

        DatabaseRepository.save_baseline(baseline, set_active=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables and default baseline
    init_db()
    seed_default_baseline_if_empty()
    yield
    # Shutdown logic if needed


app = FastAPI(
    title="QuantumGuard AI - Anomaly Detection API",
    description="Scientific BB84 simulation, channel monitoring, baseline calibration, and explainable cybersecurity alerts.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration for local React / Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Local development environment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(simulator_router, prefix="/api")
app.include_router(baseline_router, prefix="/api")
app.include_router(detection_router, prefix="/api")
app.include_router(alerts_router, prefix="/api")
app.include_router(history_router, prefix="/api")
app.include_router(evaluation_router, prefix="/api")
app.include_router(audio_router, prefix="/api")


@app.get("/api/health")
def health_check() -> Dict[str, Any]:
    """Application health and database connectivity status."""
    active_b = DatabaseRepository.get_active_baseline()
    runs = DatabaseRepository.list_runs(limit=1)
    return {
        "status": "healthy",
        "service": "QuantumGuard AI API",
        "version": "1.0.0",
        "database_connected": True,
        "active_baseline": active_b.name if active_b else None,
        "baseline_version": active_b.version if active_b else None,
        "total_runs_recorded": len(DatabaseRepository.list_runs(limit=500)),
        "ml_detector_trained": ml_detector.is_trained,
    }


# Mount built frontend assets if dist exists
FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse

    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="static_assets")

    @app.get("/")
    def serve_frontend_root():
        index_file = FRONTEND_DIST / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        return {"status": "Frontend build pending", "api_docs": "/docs"}

    @app.get("/{full_path:path}")
    def serve_spa_fallback(full_path: str):
        # Allow /docs, /redoc, /openapi.json and /api to bypass fallback
        if full_path.startswith("api") or full_path in ["docs", "redoc", "openapi.json"]:
            return {"error": "Not Found"}
        index_file = FRONTEND_DIST / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        return {"error": "Not Found"}
else:
    @app.get("/")
    def root():
        return {
            "name": "QuantumGuard AI Backend",
            "status": "operational",
            "docs_url": "/docs",
            "health_check": "/api/health"
        }
