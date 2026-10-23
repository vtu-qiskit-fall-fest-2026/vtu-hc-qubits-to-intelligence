"""QuantumGuard AI - Benchmark Evaluation API Routes"""

from fastapi import APIRouter
from typing import Dict, Any, Optional

from app.api.schemas import BenchmarkRunRequest
from app.analytics.evaluation import BenchmarkRunner, BenchmarkEvaluationReport
from app.database.repository import DatabaseRepository

router = APIRouter(prefix="/evaluation", tags=["evaluation"])


@router.post("/run", response_model=BenchmarkEvaluationReport)
def execute_benchmark(req: BenchmarkRunRequest):
    """
    Execute full independent benchmark evaluation:
    - Generates separate calibration, training, and held-out test datasets
    - Evaluates Rule-based, Statistical, and ML detectors on identical test samples
    - Computes confusion matrix, precision, recall, F1, FPR, and scenario breakdown
    """
    runner = BenchmarkRunner(runs_per_scenario=req.runs_per_scenario, base_seed=req.base_seed)
    report = runner.run_benchmark()

    # Save to SQLite database
    DatabaseRepository.save_evaluation(
        eval_id=report.eval_id,
        timestamp=report.timestamp,
        num_samples=report.num_samples_evaluated,
        full_data=report.model_dump()
    )

    return report


@router.get("/latest")
def get_latest_benchmark():
    """Retrieve most recent benchmark evaluation report."""
    latest = DatabaseRepository.get_latest_evaluation()
    if not latest:
        return {"exists": False, "message": "No evaluation has been executed yet."}
    return {"exists": True, "report": latest}
