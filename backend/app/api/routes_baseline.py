"""QuantumGuard AI - Baseline Calibration API Routes"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
import numpy as np

from app.api.schemas import CalibrateBaselineRequest
from app.simulator.models import SimulationConfig, SimulationRunResult
from app.simulator.bb84 import BB84Simulator
from app.analytics.baseline import calibrate_baseline, BaselineCalibration
from app.analytics.features import extract_features
from app.api.routes_simulator import ml_detector
from app.database.repository import DatabaseRepository

router = APIRouter(prefix="/baseline", tags=["baseline"])


@router.post("/calibrate", response_model=BaselineCalibration)
def perform_calibration(req: CalibrateBaselineRequest):
    """
    Execute empirical baseline calibration from reference runs.
    Also trains the unsupervised ML Isolation Forest model on the reference feature vectors.
    """
    runs: List[SimulationRunResult] = []
    feature_vectors = []

    for i in range(req.num_runs):
        cfg = SimulationConfig(
            scenario_id="calibration_reference",
            scenario_name=f"{req.name} (Run {i+1})",
            num_pulses=req.num_pulses_per_run,
            noise_prob=req.noise_prob,
            loss_prob=req.loss_prob,
            eve_prob=0.0,  # Calibration MUST be reference clean/normal channel
            test_bit_fraction=0.5,
        )
        sim = BB84Simulator(cfg)
        run_res = sim.run()
        runs.append(run_res)
        DatabaseRepository.save_run(run_res)

    baseline = calibrate_baseline(
        runs=runs,
        name=req.name,
        version=req.version,
        sensitivity=req.sensitivity
    )

    # Train ML Isolation Forest detector strictly on these baseline reference runs
    for r in runs:
        feats = extract_features(r.metrics, baseline)
        feature_vectors.append(feats.to_vector())

    if len(feature_vectors) >= 5:
        ml_detector.fit(np.array(feature_vectors))

    # Save to SQLite database and mark active
    DatabaseRepository.save_baseline(baseline, set_active=True)

    return baseline


@router.get("/active")
def get_active_baseline():
    """Retrieve currently active baseline calibration."""
    baseline = DatabaseRepository.get_active_baseline()
    if not baseline:
        return {"active": False, "message": "No calibrated baseline exists. Please run calibration."}
    return {"active": True, "baseline": baseline.model_dump()}


@router.get("/history", response_model=List[BaselineCalibration])
def list_baseline_history():
    """Retrieve versioned history of all calibrated baselines."""
    return DatabaseRepository.list_baselines()
