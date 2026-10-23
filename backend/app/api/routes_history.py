"""QuantumGuard AI - History & Trends API Routes"""

from fastapi import APIRouter, Query
from typing import List, Optional, Dict, Any

from app.database.repository import DatabaseRepository

router = APIRouter(prefix="/history", tags=["history"])


@router.get("/runs")
def list_history_runs(
    limit: int = Query(default=50, ge=1, le=500),
    scenario_id: Optional[str] = Query(default=None)
):
    """Retrieve history of past simulation runs."""
    return DatabaseRepository.list_runs(limit=limit, scenario_id=scenario_id)


@router.get("/channel-trends")
def get_channel_trends(limit: int = Query(default=30, ge=5, le=100)):
    """
    Retrieve chronologically ordered channel metrics (QBER, loss, detection rate)
    for channel analysis trend charts.
    """
    runs = DatabaseRepository.list_runs(limit=limit)
    # Reverse to chronological order (oldest to newest)
    runs_chronological = list(reversed(runs))

    trend_points = []
    for r in runs_chronological:
        trend_points.append({
            "run_id": r["run_id"],
            "timestamp": r["timestamp"],
            "scenario_name": r["scenario_name"],
            "qber_percent": round(r["qber"] * 100, 2) if r["qber"] is not None else None,
            "detection_rate_percent": round(r["detection_rate"] * 100, 2),
            "photon_loss_rate_percent": round(r["photon_loss_rate"] * 100, 2),
            "sifted_bits_count": r["sifted_bits_count"],
            "test_bits_count": r["test_bits_count"],
            "ground_truth": r["ground_truth_label"],
        })

    return {
        "count": len(trend_points),
        "data": trend_points
    }
