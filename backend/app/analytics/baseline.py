"""QuantumGuard AI - Baseline Calibration Engine

Establishes empirical reference baselines for channel parameters using designated
clean/operational reference runs. Supports configurable sensitivity thresholds,
sample size validation, and version tracking.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
import numpy as np
from pydantic import BaseModel, Field

from app.simulator.models import SimulationRunResult


class BaselineCalibration(BaseModel):
    """Empirically calibrated baseline for a quantum communication link."""
    baseline_id: str = Field(default_factory=lambda: f"base-{uuid.uuid4().hex[:8]}")
    name: str = Field(default="Standard Operational Baseline")
    version: str = Field(default="1.0.0")
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    calibration_scenario: str
    num_runs: int
    total_transmitted_pulses: int
    total_test_bits: int

    # QBER distribution parameters
    mean_qber: float
    std_qber: float
    min_qber: float
    max_qber: float

    # Detection & loss distribution
    mean_detection_rate: float
    std_detection_rate: float
    mean_loss_rate: float
    std_loss_rate: float

    # Alert threshold boundaries
    sensitivity: str = Field(default="medium", description="'low', 'medium', or 'high'")
    qber_upper_threshold: float
    detection_rate_lower_threshold: float
    loss_rate_upper_threshold: float

    # Data sufficiency & health
    is_sufficient: bool
    is_stable: bool
    warning_messages: List[str] = Field(default_factory=list)
    is_active: bool = True


def calibrate_baseline(
    runs: List[SimulationRunResult],
    name: str = "Calibrated Optical Fiber Baseline",
    version: str = "1.0.0",
    sensitivity: str = "medium"
) -> BaselineCalibration:
    """
    Calibrate baseline from reference simulation runs.

    Args:
        runs: List of SimulationRunResult objects (must be reference/clean runs).
        name: Custom baseline identifier.
        version: Semantic version string.
        sensitivity: 'low' (4-sigma), 'medium' (3-sigma), 'high' (2-sigma).

    Returns:
        BaselineCalibration object with computed statistical thresholds.
    """
    if not runs:
        raise ValueError("Cannot calibrate baseline with zero runs.")

    warnings = []
    if len(runs) < 5:
        warnings.append(f"Small calibration sample ({len(runs)} runs). At least 5 runs recommended for statistical stability.")

    qber_values = []
    detection_rates = []
    loss_rates = []
    total_pulses = 0
    total_test_bits = 0
    scenario_ids = set()

    for r in runs:
        total_pulses += r.metrics.transmitted_pulses
        total_test_bits += r.metrics.test_bits_count
        scenario_ids.add(r.config.scenario_id)

        if r.metrics.qber is not None:
            qber_values.append(r.metrics.qber)
        detection_rates.append(r.metrics.detection_rate)
        loss_rates.append(r.metrics.photon_loss_rate)

    if not qber_values:
        raise ValueError("No valid QBER measurements found in calibration runs (all photons lost or zero comparison bits).")

    if total_test_bits < 100:
        warnings.append(f"Total test bits ({total_test_bits}) is low. Confidence intervals may be broad.")

    # Compute statistical aggregates
    qber_arr = np.array(qber_values, dtype=float)
    det_arr = np.array(detection_rates, dtype=float)
    loss_arr = np.array(loss_rates, dtype=float)

    mean_qber = float(np.mean(qber_arr))
    std_qber = float(np.std(qber_arr, ddof=1)) if len(qber_arr) > 1 else 0.005
    min_qber = float(np.min(qber_arr))
    max_qber = float(np.max(qber_arr))

    mean_det = float(np.mean(det_arr))
    std_det = float(np.std(det_arr, ddof=1)) if len(det_arr) > 1 else 0.02

    mean_loss = float(np.mean(loss_arr))
    std_loss = float(np.std(loss_arr, ddof=1)) if len(loss_arr) > 1 else 0.02

    # Check stability (standard deviation shouldn't exceed 50% of mean for clean channel)
    is_stable = True
    if std_qber > 0.04:
        is_stable = False
        warnings.append(f"High variance observed in calibration QBER (std={std_qber:.4f}). Baseline may be unstable.")

    # Sensitivity multipliers
    sigma_multipliers = {
        "low": 4.0,     # Fewer false alarms, higher threshold
        "medium": 3.0,  # Balanced 99.7% Gaussian confidence limit
        "high": 2.0,    # Very sensitive, triggers on subtle deviations
    }
    k = sigma_multipliers.get(sensitivity.lower(), 3.0)

    # Calculate empirical thresholds
    # Theoretical Shor-Preskill asymptotic security threshold for standard BB84 is 11.0% (0.11)
    SHOR_PRESKILL_LIMIT = 0.11

    # Threshold is baseline mean + k * std, capped at Shor-Preskill limit
    computed_qber_threshold = mean_qber + k * max(std_qber, 0.004)
    qber_upper_threshold = min(SHOR_PRESKILL_LIMIT, max(0.04, float(computed_qber_threshold)))

    det_lower_threshold = max(0.02, float(mean_det - k * max(std_det, 0.01)))
    loss_upper_threshold = min(0.95, float(mean_loss + k * max(std_loss, 0.01)))

    is_sufficient = len(runs) >= 3 and total_test_bits >= 60

    scenario_label = ", ".join(sorted(scenario_ids))

    return BaselineCalibration(
        name=name,
        version=version,
        calibration_scenario=scenario_label,
        num_runs=len(runs),
        total_transmitted_pulses=total_pulses,
        total_test_bits=total_test_bits,
        mean_qber=round(mean_qber, 5),
        std_qber=round(std_qber, 5),
        min_qber=round(min_qber, 5),
        max_qber=round(max_qber, 5),
        mean_detection_rate=round(mean_det, 4),
        std_detection_rate=round(std_det, 4),
        mean_loss_rate=round(mean_loss, 4),
        std_loss_rate=round(std_loss, 4),
        sensitivity=sensitivity.lower(),
        qber_upper_threshold=round(qber_upper_threshold, 5),
        detection_rate_lower_threshold=round(det_lower_threshold, 4),
        loss_rate_upper_threshold=round(loss_upper_threshold, 4),
        is_sufficient=is_sufficient,
        is_stable=is_stable,
        warning_messages=warnings,
        is_active=True,
    )
