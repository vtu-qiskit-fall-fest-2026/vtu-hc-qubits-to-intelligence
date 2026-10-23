"""QuantumGuard AI - API Request and Response Schemas"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from app.simulator.models import SimulationConfig, SimulationMetrics, PulseDetail, SimulationRunResult
from app.analytics.baseline import BaselineCalibration
from app.analytics.alerts import SecurityAlert
from app.analytics.detectors.hybrid import HybridDetectionResult
from app.analytics.evaluation import BenchmarkEvaluationReport


class SimulationRunRequest(BaseModel):
    """Request payload to execute a BB84 simulation."""
    scenario_id: Optional[str] = "custom"
    scenario_name: Optional[str] = "Custom Simulation"
    num_pulses: int = Field(default=1500, ge=10, le=50000)
    noise_prob: float = Field(default=0.015, ge=0.0, le=1.0)
    loss_prob: float = Field(default=0.10, ge=0.0, le=1.0)
    eve_prob: float = Field(default=0.0, ge=0.0, le=1.0)
    test_bit_fraction: float = Field(default=0.5, ge=0.05, le=0.9)
    random_seed: Optional[int] = None
    notes: Optional[str] = ""


class CalibrateBaselineRequest(BaseModel):
    """Request payload to calibrate a new baseline."""
    name: str = Field(default="Telecom Optical Fiber Baseline")
    version: str = Field(default="1.0.0")
    num_runs: int = Field(default=8, ge=3, le=50)
    num_pulses_per_run: int = Field(default=1500, ge=100, le=10000)
    noise_prob: float = Field(default=0.015, ge=0.0, le=0.08)
    loss_prob: float = Field(default=0.10, ge=0.0, le=0.60)
    sensitivity: str = Field(default="medium", pattern="^(low|medium|high)$")


class RunAnalysisRequest(BaseModel):
    """Request to trigger full anomaly detection on a specific simulation run."""
    run_id: str


class BenchmarkRunRequest(BaseModel):
    """Request to execute benchmark evaluation."""
    runs_per_scenario: int = Field(default=5, ge=2, le=20)
    base_seed: int = Field(default=42)


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    database_connected: bool
    active_baseline: Optional[str] = None
    total_runs_recorded: int
