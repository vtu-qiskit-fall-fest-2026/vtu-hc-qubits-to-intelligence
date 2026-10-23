"""QuantumGuard AI - Rule-Based Anomaly Detector

Evaluates strict deterministic rules, physical validity boundaries, sample size
prerequisites, and threshold excursions on quantum communication channels.
"""

from typing import Optional, List, Dict, Any

from app.analytics.detectors.base import BaseDetector, DetectorVerdict
from app.analytics.features import ObservableFeatures
from app.analytics.baseline import BaselineCalibration


class RuleBasedDetector(BaseDetector):
    """Deterministic rule-based detector for QKD channel surveillance."""

    SHOR_PRESKILL_BB84_LIMIT = 0.11  # 11% theoretical maximum QBER for unconditionally secure BB84 key distillation

    def __init__(self, fallback_qber_limit: float = 0.08, min_sample_size: int = 30):
        self.fallback_qber_limit = fallback_qber_limit
        self.min_sample_size = min_sample_size

    def detect(
        self,
        features: ObservableFeatures,
        baseline: Optional[BaselineCalibration] = None
    ) -> DetectorVerdict:
        triggers: List[str] = []
        is_anomaly = False
        status = "NORMAL"
        confidence = 0.0

        # Rule 1: Physical Data Validity & Consistency Check
        if features.detection_rate < 0.0 or features.detection_rate > 1.0:
            triggers.append(f"Invalid detection rate: {features.detection_rate:.4f} outside [0.0, 1.0]")
            return DetectorVerdict(
                detector_name="RuleBasedDetector",
                detector_type="rule_based",
                is_anomaly=True,
                status="INVESTIGATION REQUIRED",
                confidence_score=1.0,
                summary_message="Physical measurement inconsistency detected in receiver registration.",
                trigger_reasons=triggers,
                metrics_snapshot={"detection_rate": features.detection_rate}
            )

        # Rule 2: Zero Comparison Bits or Missing QBER
        if features.qber is None or features.test_bits_count == 0:
            triggers.append(f"No valid sifted comparison bits available (test_bits={features.test_bits_count}).")
            return DetectorVerdict(
                detector_name="RuleBasedDetector",
                detector_type="rule_based",
                is_anomaly=False,
                status="INSUFFICIENT DATA",
                confidence_score=0.0,
                summary_message="Insufficient channel detections: cannot compute QBER without valid test bits.",
                trigger_reasons=triggers,
                metrics_snapshot={
                    "test_bits_count": features.test_bits_count,
                    "photon_loss_rate": features.photon_loss_rate
                }
            )

        # Rule 3: Small Sample Warning (Insufficient Data)
        if features.test_bits_count < self.min_sample_size:
            triggers.append(
                f"Small sample size ({features.test_bits_count} test bits < threshold {self.min_sample_size}). "
                "Measurement error margin is wide."
            )
            # Not automatically an anomaly, but status must reflect insufficient data
            status = "INSUFFICIENT DATA"
            confidence = 0.25

        # Rule 4: Theoretical Asymptotic Security Limit Exceeded (Shor-Preskill Threshold)
        if features.qber >= self.SHOR_PRESKILL_BB84_LIMIT:
            triggers.append(
                f"Observed QBER ({features.qber * 100:.2f}%) exceeds the Shor-Preskill asymptotic security threshold "
                f"({self.SHOR_PRESKILL_BB84_LIMIT * 100:.1f}%). Secret key generation must be aborted."
            )
            is_anomaly = True
            status = "INVESTIGATION REQUIRED"
            confidence = 1.0

        # Rule 5: Baseline Excursion Check
        active_qber_limit = baseline.qber_upper_threshold if baseline else self.fallback_qber_limit
        if features.qber > active_qber_limit and not is_anomaly:
            triggers.append(
                f"Observed QBER ({features.qber * 100:.2f}%) exceeds calibrated baseline limit ({active_qber_limit * 100:.2f}%)."
            )
            is_anomaly = True
            status = "ANOMALY SUSPECTED"
            confidence = max(confidence, min(0.95, (features.qber - active_qber_limit) / 0.10 + 0.6))

        # Rule 6: Abrupt High Photon Loss Check
        active_loss_limit = baseline.loss_rate_upper_threshold if baseline else 0.80
        if features.photon_loss_rate > active_loss_limit:
            triggers.append(
                f"High photon loss rate ({features.photon_loss_rate * 100:.1f}%) exceeds upper bound ({active_loss_limit * 100:.1f}%)."
            )
            is_anomaly = True
            if status != "INVESTIGATION REQUIRED":
                status = "ANOMALY SUSPECTED"
            confidence = max(confidence, 0.70)

        # Rule 7: Severe Detection Collapse Check
        active_det_limit = baseline.detection_rate_lower_threshold if baseline else 0.05
        if features.detection_rate < active_det_limit:
            triggers.append(
                f"Receiver detection rate ({features.detection_rate * 100:.1f}%) dropped below operational limit ({active_det_limit * 100:.1f}%)."
            )
            is_anomaly = True
            if status != "INVESTIGATION REQUIRED":
                status = "ANOMALY SUSPECTED"
            confidence = max(confidence, 0.75)

        if not triggers:
            summary = "Channel metrics comply with deterministic rules and baseline thresholds."
            status = "NORMAL"
            confidence = 0.05
        else:
            summary = "; ".join(triggers)

        return DetectorVerdict(
            detector_name="RuleBasedDetector",
            detector_type="rule_based",
            is_anomaly=is_anomaly,
            status=status,
            confidence_score=round(confidence, 3),
            summary_message=summary,
            trigger_reasons=triggers,
            metrics_snapshot={
                "qber": features.qber,
                "qber_limit": active_qber_limit,
                "detection_rate": features.detection_rate,
                "photon_loss_rate": features.photon_loss_rate,
                "test_bits_count": features.test_bits_count,
            }
        )
