"""QuantumGuard AI - Simulator API Routes"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional

from app.api.schemas import SimulationRunRequest
from app.simulator.models import SimulationConfig, SimulationRunResult
from app.simulator.bb84 import BB84Simulator
from app.simulator.scenarios import get_all_scenarios, get_scenario_by_id
from app.analytics.features import extract_features
from app.analytics.baseline import BaselineCalibration
from app.analytics.detectors.hybrid import HybridDetectionEngine, HybridDetectionResult
from app.analytics.detectors.rule_based import RuleBasedDetector
from app.analytics.detectors.statistical import StatisticalDetector
from app.analytics.detectors.ml_detector import MLIsolationForestDetector
from app.analytics.alerts import AlertEngine, SecurityAlert
from app.database.repository import DatabaseRepository

router = APIRouter(prefix="/simulator", tags=["simulator"])

# Persistent in-memory detector engine instances for API session
rule_detector = RuleBasedDetector()
stat_detector = StatisticalDetector(significance_alpha=0.01)
ml_detector = MLIsolationForestDetector(contamination=0.05)
hybrid_engine = HybridDetectionEngine(rule_detector, stat_detector, ml_detector)
alert_engine = AlertEngine()


@router.get("/scenarios", response_model=List[Dict[str, Any]])
def list_scenarios():
    """Retrieve list of all 10 standard simulation scenarios."""
    return get_all_scenarios()


@router.post("/run")
def run_simulation(req: SimulationRunRequest):
    """
    Execute a BB84 QKD simulation, evaluate channel against active baseline,
    generate explainable alert, and persist run and alert to SQLite.
    """
    config = SimulationConfig(
        scenario_id=req.scenario_id or "custom",
        scenario_name=req.scenario_name or "Custom Run",
        num_pulses=req.num_pulses,
        noise_prob=req.noise_prob,
        loss_prob=req.loss_prob,
        eve_prob=req.eve_prob,
        test_bit_fraction=req.test_bit_fraction,
        random_seed=req.random_seed,
        notes=req.notes or "",
    )

    # 1. Run BB84 Simulator
    sim = BB84Simulator(config)
    run_result = sim.run()

    # 2. Persist simulation run to database
    DatabaseRepository.save_run(run_result)

    # 3. Retrieve active baseline
    active_baseline = DatabaseRepository.get_active_baseline()

    # 4. Extract observable features (no leakage)
    features = extract_features(run_result.metrics, active_baseline)

    # 5. Execute hybrid detection
    detection_res = hybrid_engine.analyze(features, active_baseline)

    # 6. Generate explainable alert
    alert = alert_engine.generate_alert(run_result, features, detection_res, active_baseline)
    if alert is not None:
        DatabaseRepository.save_alert(alert)

    return {
        "run": run_result.model_dump(),
        "features": features.model_dump(),
        "detection": detection_res.model_dump(),
        "alert": alert.model_dump() if alert else None,
        "active_baseline_id": active_baseline.baseline_id if active_baseline else None,
    }


@router.get("/runs/{run_id}")
def get_simulation_run(run_id: str):
    """Retrieve full details of a past simulation run including sample pulses."""
    run = DatabaseRepository.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Simulation run '{run_id}' not found.")
    return run.model_dump()
