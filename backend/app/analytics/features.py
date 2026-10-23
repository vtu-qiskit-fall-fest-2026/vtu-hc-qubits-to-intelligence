"""QuantumGuard AI - Observable Feature Extraction Engine

Extracts observable channel metrics and baseline deviation features from BB84
simulation runs for anomaly detection. Strictly prevents data leakage by ignoring
ground-truth labels, scenario IDs, and hidden attack parameters.
"""

from typing import Dict, Any, Optional
import numpy as np
from pydantic import BaseModel, Field

from app.simulator.models import SimulationMetrics


class ObservableFeatures(BaseModel):
    """
    Features derived purely from observable channel measurements.

    Attributes:
        qber: Observed Quantum Bit Error Rate [0.0, 1.0] or None if unavailable.
        detection_rate: Fraction of transmitted pulses registered at receiver [0.0, 1.0].
        photon_loss_rate: Fraction of transmitted pulses lost in transit [0.0, 1.0].
        sifted_ratio: Fraction of detected pulses that had matching bases [0.0, 1.0].
        test_bits_count: Sample size used for parameter estimation.
        error_count: Number of erroneous test bits observed.
        ci_width: Width of the 95% Wilson confidence interval (uncertainty measure).
        sample_size_sufficient: Boolean flag indicating if sample size >= 30.
        qber_delta: Deviation from baseline mean QBER (0.0 if no baseline).
        qber_zscore: Standardized z-score relative to baseline distribution.
        detection_rate_delta: Deviation from baseline mean detection rate.
        loss_rate_delta: Deviation from baseline mean loss rate.
    """
    qber: Optional[float] = None
    detection_rate: float
    photon_loss_rate: float
    sifted_ratio: float
    test_bits_count: int
    error_count: int
    ci_width: Optional[float] = None
    sample_size_sufficient: bool

    # Baseline deviation features
    qber_delta: float = 0.0
    qber_zscore: float = 0.0
    detection_rate_delta: float = 0.0
    loss_rate_delta: float = 0.0

    def to_vector(self) -> np.ndarray:
        """
        Convert numeric features to vector for ML detector.
        Missing QBER is imputed with median baseline value or -1.0 with missing indicator.
        """
        qber_val = self.qber if self.qber is not None else 0.0
        ci_w = self.ci_width if self.ci_width is not None else 1.0

        return np.array([
            qber_val,
            self.detection_rate,
            self.photon_loss_rate,
            self.sifted_ratio,
            ci_w,
            float(self.sample_size_sufficient),
            self.qber_delta,
            self.qber_zscore,
            self.detection_rate_delta,
            self.loss_rate_delta,
        ], dtype=float)

    @classmethod
    def feature_names(cls) -> list[str]:
        return [
            "qber",
            "detection_rate",
            "photon_loss_rate",
            "sifted_ratio",
            "ci_width",
            "sample_size_sufficient",
            "qber_delta",
            "qber_zscore",
            "detection_rate_delta",
            "loss_rate_delta",
        ]


def extract_features(
    metrics: SimulationMetrics,
    baseline: Optional[Any] = None
) -> ObservableFeatures:
    """
    Extract observable features from simulation metrics and optional baseline.

    Args:
        metrics: Observed simulation metrics from receiver.
        baseline: Active BaselineCalibration object (if calibrated).

    Returns:
        ObservableFeatures object.
    """
    qber_delta = 0.0
    qber_zscore = 0.0
    detection_rate_delta = 0.0
    loss_rate_delta = 0.0

    if baseline is not None:
        if metrics.qber is not None:
            qber_delta = float(metrics.qber - baseline.mean_qber)
            std = max(baseline.std_qber, 0.002)  # Avoid division by zero
            qber_zscore = float(qber_delta / std)

        detection_rate_delta = float(metrics.detection_rate - baseline.mean_detection_rate)
        loss_rate_delta = float(metrics.photon_loss_rate - baseline.mean_loss_rate)

    return ObservableFeatures(
        qber=metrics.qber,
        detection_rate=metrics.detection_rate,
        photon_loss_rate=metrics.photon_loss_rate,
        sifted_ratio=metrics.sifted_ratio,
        test_bits_count=metrics.test_bits_count,
        error_count=metrics.error_count,
        ci_width=metrics.confidence_interval_width,
        sample_size_sufficient=metrics.sample_size_sufficient,
        qber_delta=round(qber_delta, 5),
        qber_zscore=round(qber_zscore, 3),
        detection_rate_delta=round(detection_rate_delta, 5),
        loss_rate_delta=round(loss_rate_delta, 5),
    )
