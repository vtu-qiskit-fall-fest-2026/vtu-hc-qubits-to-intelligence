"""QuantumGuard AI - Hybrid Detection Engine

Synthesizes verdicts from Rule-Based, Statistical, and Unsupervised Machine Learning
detectors to produce an explainable, multi-faceted channel assessment.
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

from app.analytics.detectors.base import BaseDetector, DetectorVerdict
from app.analytics.detectors.rule_based import RuleBasedDetector
from app.analytics.detectors.statistical import StatisticalDetector
from app.analytics.detectors.ml_detector import MLIsolationForestDetector
from app.analytics.features import ObservableFeatures
from app.analytics.baseline import BaselineCalibration


class HybridDetectionResult(BaseModel):
    """Integrated detection verdict combining all active detector engines."""
    overall_status: str  # 'NORMAL', 'ANOMALY SUSPECTED', 'INSUFFICIENT DATA', 'INVESTIGATION REQUIRED'
    is_anomaly: bool
    consensus_score: float = Field(ge=0.0, le=1.0)
    primary_reason: str
    all_reasons: List[str] = Field(default_factory=list)
    individual_verdicts: Dict[str, DetectorVerdict] = Field(default_factory=dict)
    agreement_level: str  # 'unanimous', 'majority', 'single_detector', 'normal'


class HybridDetectionEngine:
    """Orchestrator for multi-model anomaly detection."""

    def __init__(
        self,
        rule_detector: Optional[RuleBasedDetector] = None,
        stat_detector: Optional[StatisticalDetector] = None,
        ml_detector: Optional[MLIsolationForestDetector] = None
    ):
        self.rule_detector = rule_detector or RuleBasedDetector()
        self.stat_detector = stat_detector or StatisticalDetector()
        self.ml_detector = ml_detector or MLIsolationForestDetector()

    def analyze(
        self,
        features: ObservableFeatures,
        baseline: Optional[BaselineCalibration] = None
    ) -> HybridDetectionResult:
        v_rule = self.rule_detector.detect(features, baseline)
        v_stat = self.stat_detector.detect(features, baseline)
        v_ml = self.ml_detector.detect(features, baseline)

        verdicts = {
            "rule_based": v_rule,
            "statistical": v_stat,
            "machine_learning": v_ml,
        }

        # Check for insufficient data
        if v_rule.status == "INSUFFICIENT DATA" and v_stat.status == "INSUFFICIENT DATA":
            return HybridDetectionResult(
                overall_status="INSUFFICIENT DATA",
                is_anomaly=False,
                consensus_score=0.0,
                primary_reason="Measurement count is below the minimum threshold required for reliable detection.",
                all_reasons=v_rule.trigger_reasons + v_stat.trigger_reasons,
                individual_verdicts=verdicts,
                agreement_level="unanimous"
            )

        # Count anomalies
        anomalies_flagged = [v for v in [v_rule, v_stat, v_ml] if v.is_anomaly]
        anomaly_count = len(anomalies_flagged)

        # Collect reasons
        all_reasons: List[str] = []
        for v in [v_rule, v_stat, v_ml]:
            all_reasons.extend(v.trigger_reasons)

        # Weighted consensus score
        # Rule: 0.35, Stat: 0.45, ML: 0.20 (when trained)
        w_rule = 0.35
        w_stat = 0.45
        w_ml = 0.20 if self.ml_detector.is_trained else 0.0
        total_w = w_rule + w_stat + w_ml

        consensus_score = (
            v_rule.confidence_score * w_rule +
            v_stat.confidence_score * w_stat +
            (v_ml.confidence_score * w_ml if w_ml > 0 else 0.0)
        ) / total_w

        # Determine overall status
        if v_rule.status == "INVESTIGATION REQUIRED" or v_stat.status == "INVESTIGATION REQUIRED":
            overall_status = "INVESTIGATION REQUIRED"
            is_anomaly = True
        elif anomaly_count >= 1:
            overall_status = "ANOMALY SUSPECTED"
            is_anomaly = True
        elif v_rule.status == "INSUFFICIENT DATA" or v_stat.status == "INSUFFICIENT DATA":
            overall_status = "INSUFFICIENT DATA"
            is_anomaly = False
        else:
            overall_status = "NORMAL"
            is_anomaly = False

        # Agreement level
        if anomaly_count == 3:
            agreement_level = "unanimous"
        elif anomaly_count == 2:
            agreement_level = "majority"
        elif anomaly_count == 1:
            agreement_level = "single_detector"
        else:
            agreement_level = "normal"

        primary_reason = all_reasons[0] if all_reasons else "All detectors report normal channel parameters."

        return HybridDetectionResult(
            overall_status=overall_status,
            is_anomaly=is_anomaly,
            consensus_score=round(float(consensus_score), 3),
            primary_reason=primary_reason,
            all_reasons=all_reasons,
            individual_verdicts=verdicts,
            agreement_level=agreement_level
        )
