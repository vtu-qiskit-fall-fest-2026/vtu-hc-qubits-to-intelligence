"""QuantumGuard AI - Anomaly Detector Base Interface & Schemas"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

from app.analytics.features import ObservableFeatures
from app.analytics.baseline import BaselineCalibration


class DetectorVerdict(BaseModel):
    """Structured verdict from an anomaly detector."""
    detector_name: str
    detector_type: str  # 'rule_based', 'statistical', 'machine_learning', or 'hybrid'
    is_anomaly: bool
    status: str  # 'NORMAL', 'ANOMALY SUSPECTED', 'INSUFFICIENT DATA', 'INVESTIGATION REQUIRED'
    confidence_score: float = Field(ge=0.0, le=1.0, description="Normalized score [0.0 = completely normal, 1.0 = highly anomalous]")
    summary_message: str
    trigger_reasons: List[str] = Field(default_factory=list)
    metrics_snapshot: Dict[str, Any] = Field(default_factory=dict)
    statistical_details: Dict[str, Any] = Field(default_factory=dict)


class BaseDetector(ABC):
    """Abstract base class for all anomaly detectors in QuantumGuard AI."""

    @abstractmethod
    def detect(
        self,
        features: ObservableFeatures,
        baseline: Optional[BaselineCalibration] = None
    ) -> DetectorVerdict:
        """
        Evaluate observable features and return a structured verdict.

        Args:
            features: Observable channel measurements (no ground truth).
            baseline: Calibrated channel baseline (if available).

        Returns:
            DetectorVerdict with status, confidence, and triggers.
        """
        pass
