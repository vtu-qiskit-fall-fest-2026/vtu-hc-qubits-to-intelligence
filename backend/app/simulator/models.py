"""QuantumGuard AI - Simulator Data Models

Pydantic models representing BB84 simulation configurations, pulse-level
measurements, sifted key statistics, and summary metrics.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


class SimulationConfig(BaseModel):
    """Configuration parameters for a BB84 QKD simulation run."""
    scenario_id: str = Field(default="ideal_normal", description="Identifier of the scenario")
    scenario_name: str = Field(default="Ideal Channel", description="Descriptive scenario name")
    num_pulses: int = Field(default=1000, ge=10, le=50000, description="Total number of transmitted photon pulses")
    noise_prob: float = Field(default=0.0, ge=0.0, le=1.0, description="Probability of channel background noise (depolarizing/bit flip)")
    loss_prob: float = Field(default=0.0, ge=0.0, le=1.0, description="Probability of photon loss in fiber channel")
    eve_prob: float = Field(default=0.0, ge=0.0, le=1.0, description="Probability of Eve intercept-resend attack")
    test_bit_fraction: float = Field(default=0.5, ge=0.05, le=0.9, description="Fraction of sifted bits used for parameter estimation (QBER)")
    random_seed: Optional[int] = Field(default=None, description="Random seed for deterministic reproducibility")
    notes: Optional[str] = Field(default="", description="Optional operator notes")

    @field_validator("num_pulses")
    @classmethod
    def validate_pulses(cls, v: int) -> int:
        if v < 10:
            raise ValueError("Simulation requires at least 10 pulses to generate meaningful statistics.")
        return v


class PulseDetail(BaseModel):
    """Detailed record of an individual quantum pulse in BB84."""
    pulse_index: int
    alice_bit: int
    alice_basis: str  # '+' (rectilinear) or 'x' (diagonal)
    alice_state: str  # '|0>', '|1>', '|+>', '|->'
    photon_lost: bool
    eve_intercepted: bool
    eve_basis: Optional[str] = None
    eve_measured_bit: Optional[int] = None
    bob_basis: Optional[str] = None
    bob_detection: bool
    bob_measured_bit: Optional[int] = None
    bases_match: bool
    is_sifted: bool
    is_test_bit: bool
    is_error: Optional[bool] = None


class SimulationMetrics(BaseModel):
    """Calculated metrics and statistics from a simulation run."""
    transmitted_pulses: int
    detected_pulses: int
    detection_rate: float
    photon_loss_rate: float
    sifted_bits_count: int
    sifted_ratio: float
    test_bits_count: int
    candidate_key_bits_count: int
    error_count: int
    qber: Optional[float] = None  # None if test_bits_count == 0
    qber_confidence_lower: Optional[float] = None
    qber_confidence_upper: Optional[float] = None
    confidence_interval_width: Optional[float] = None
    sample_size_sufficient: bool
    theoretical_expected_qber: Optional[float] = None
    simulation_duration_ms: float = 0.0


class SimulationRunResult(BaseModel):
    """Complete output of a BB84 simulation run."""
    run_id: str
    timestamp: str
    config: SimulationConfig
    metrics: SimulationMetrics
    sample_pulses: List[PulseDetail] = Field(default_factory=list, description="Sample of first N pulses for inspection/visualization")
    ground_truth_label: str = Field(description="'normal' or 'anomaly'")
    ground_truth_category: str = Field(description="Scenario category for evaluation")
    scientific_disclaimer: str = Field(
        default="SIMULATION ONLY: Candidate key bits are raw and have not undergone privacy amplification or authentication. "
                "This prototype simulates theoretical channel conditions and does not monitor physical quantum hardware."
    )
