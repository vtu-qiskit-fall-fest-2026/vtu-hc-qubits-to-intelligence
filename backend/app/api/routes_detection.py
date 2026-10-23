"""QuantumGuard AI - Detection Engine API Routes"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from app.api.schemas import RunAnalysisRequest
from app.analytics.features import extract_features
from app.api.routes_simulator import hybrid_engine, alert_engine, ml_detector
from app.database.repository import DatabaseRepository

router = APIRouter(prefix="/detection", tags=["detection"])


@router.post("/analyze")
def analyze_run(req: RunAnalysisRequest):
    """
    Re-evaluate an existing simulation run against active baseline.
    Returns features, hybrid detection, and generated alert.
    """
    run = DatabaseRepository.get_run(req.run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Simulation run '{req.run_id}' not found.")

    baseline = DatabaseRepository.get_active_baseline()
    features = extract_features(run.metrics, baseline)
    detection = hybrid_engine.analyze(features, baseline)
    alert = alert_engine.generate_alert(run, features, detection, baseline)

    if alert is not None:
        DatabaseRepository.save_alert(alert)

    return {
        "run_id": run.run_id,
        "features": features.model_dump(),
        "detection": detection.model_dump(),
        "alert": alert.model_dump() if alert else None,
        "baseline_used": baseline.baseline_id if baseline else None,
    }


@router.get("/status")
def get_detectors_status():
    """Retrieve operational status of Rule-based, Statistical, and ML detectors."""
    return {
        "rule_based": {"status": "active", "type": "deterministic_rules"},
        "statistical": {"status": "active", "type": "binomial_continuity_z_test", "alpha": 0.01},
        "machine_learning": {
            "status": "active" if ml_detector.is_trained else "untrained",
            "type": "isolation_forest",
            "training_samples": ml_detector.training_sample_count,
            "is_trained": ml_detector.is_trained,
        },
    }
