"""QuantumGuard AI - Explainable Security Alert Engine

Generates mathematically traceable, evidence-based alerts with:
- Observed metrics and baseline references
- Statistical uncertainty bounds (Wilson score intervals)
- Objective explanation of why the alert triggered
- Multi-hypothesis alternative causes (thermal noise, optical misalignment, fiber bend vs eavesdropping)
- Actionable investigation checklists
- Duplicate grouping and deduplication
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from app.analytics.detectors.hybrid import HybridDetectionResult
from app.analytics.features import ObservableFeatures
from app.analytics.baseline import BaselineCalibration
from app.simulator.models import SimulationRunResult


class SecurityAlert(BaseModel):
    """Explainable Security Alert with full scientific traceability."""
    alert_id: str = Field(default_factory=lambda: f"alt-{uuid.uuid4().hex[:8]}")
    run_id: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    severity: str = Field(description="'INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'")
    status: str = Field(description="'NORMAL', 'ANOMALY SUSPECTED', 'INSUFFICIENT DATA', 'INVESTIGATION REQUIRED'")
    detector_type: str = Field(description="'rule_based', 'statistical', 'machine_learning', or 'hybrid'")
    
    # Quantitative measurements
    observed_metrics: Dict[str, Any]
    baseline_reference: Optional[Dict[str, Any]] = None
    sample_size: int
    confidence_interval: Optional[Dict[str, float]] = None
    test_or_rule_used: str

    # Explainability & Root Cause Analysis
    explanation: str
    alternative_causes: List[str] = Field(default_factory=list)
    recommended_next_step: str
    scientific_disclaimer: str = (
        "IMPORTANT: High QBER or photon loss does NOT independently prove eavesdropping. "
        "Physical disturbances (thermal noise, dark counts, mechanical strain) produce indistinguishable "
        "statistical signatures on raw quantum channels. Further classical protocol analysis is required."
    )
    acknowledged: bool = False


class AlertEngine:
    """Processes detection results and generates explainable security alerts."""

    def __init__(self, cooldown_seconds: int = 10):
        self.cooldown_seconds = cooldown_seconds
        self.last_alert_time: Optional[datetime] = None
        self.last_alert_signature: Optional[str] = None

    def generate_alert(
        self,
        run: SimulationRunResult,
        features: ObservableFeatures,
        detection: HybridDetectionResult,
        baseline: Optional[BaselineCalibration] = None
    ) -> Optional[SecurityAlert]:
        """
        Synthesize an explainable security alert from detection results.
        Returns SecurityAlert, or None if channel is completely normal and no notification needed.
        """
        # If normal, we can still generate an informational report if requested,
        # or return a NORMAL alert status for historical logging.
        status = detection.overall_status

        # Determine severity
        if status == "INVESTIGATION REQUIRED":
            severity = "CRITICAL"
        elif status == "ANOMALY SUSPECTED":
            severity = "HIGH" if detection.consensus_score > 0.75 else "MEDIUM"
        elif status == "INSUFFICIENT DATA":
            severity = "LOW"
        else:
            severity = "INFO"

        # Build observed metrics snapshot
        obs = {
            "qber": features.qber,
            "qber_percent": round(features.qber * 100, 2) if features.qber is not None else None,
            "detection_rate_percent": round(features.detection_rate * 100, 2),
            "photon_loss_rate_percent": round(features.photon_loss_rate * 100, 2),
            "sifted_bits_count": run.metrics.sifted_bits_count,
            "test_bits_count": features.test_bits_count,
            "error_count": features.error_count,
        }

        # Build baseline reference snapshot
        base_ref = None
        if baseline is not None:
            base_ref = {
                "baseline_name": baseline.name,
                "baseline_version": baseline.version,
                "mean_qber_percent": round(baseline.mean_qber * 100, 2),
                "qber_upper_threshold_percent": round(baseline.qber_upper_threshold * 100, 2),
                "expected_detection_rate_percent": round(baseline.mean_detection_rate * 100, 2),
                "loss_upper_threshold_percent": round(baseline.loss_rate_upper_threshold * 100, 2),
                "sensitivity": baseline.sensitivity,
            }

        # Confidence interval
        ci = None
        if run.metrics.qber_confidence_lower is not None and run.metrics.qber_confidence_upper is not None:
            ci = {
                "ci_lower_percent": round(run.metrics.qber_confidence_lower * 100, 2),
                "ci_upper_percent": round(run.metrics.qber_confidence_upper * 100, 2),
                "ci_width_percent": round(run.metrics.confidence_interval_width * 100, 2) if run.metrics.confidence_interval_width else None,
            }

        # Deduce primary trigger and test used
        if detection.individual_verdicts.get("rule_based") and detection.individual_verdicts["rule_based"].is_anomaly:
            test_used = "Rule-Based Deterministic Boundary Check"
        elif detection.individual_verdicts.get("statistical") and detection.individual_verdicts["statistical"].is_anomaly:
            test_used = "Binomial Continuity-Corrected Z-Test (Hypothesis Testing)"
        elif detection.individual_verdicts.get("machine_learning") and detection.individual_verdicts["machine_learning"].is_anomaly:
            test_used = "Unsupervised Isolation Forest Outlier Metric Score"
        else:
            test_used = "Standard Multi-Factor Surveillance"

        # Construct explainable narrative & alternative causes
        if status == "INVESTIGATION REQUIRED":
            explanation = (
                f"Critical channel disturbance observed. The observed QBER ({obs['qber_percent']}%) exceeds the "
                f"theoretical unconditional security boundary or baseline limit. Key distillation must be paused."
            )
            alternatives = [
                "Active intercept-resend eavesdropping by an unauthorized party (Eve).",
                "Severe optical fiber misalignment, splice failure, or laser diode wavelength drift.",
                "High environmental temperature inducing avalanche photodiode (APD) dark-count saturation.",
                "Electromagnetic interference on single-photon detector electronics."
            ]
            recommended = (
                "Immediately halt key distillation. Inspect optical fiber physical path for unauthorized tapping or bends. "
                "Calibrate APD dark counts and repeat reference test before resuming."
            )

        elif status == "ANOMALY SUSPECTED":
            explanation = (
                f"Statistically significant channel anomaly detected. Observed QBER ({obs['qber_percent']}%) or "
                f"loss rate ({obs['photon_loss_rate_percent']}%) deviates from calibrated baseline expectations."
            )
            alternatives = [
                "Partial intercept-resend eavesdropping on a fraction of quantum pulses.",
                "Increased background ambient light leakage or thermal noise.",
                "Fiber optic macro-bending or mechanical stress along the deployment route.",
                "Detector efficiency degradation or laser power fluctuation."
            ]
            recommended = (
                "Review recent environmental temperature and optical power logs. "
                "Increase transmission sample size to narrow confidence interval and verify if disturbance is transient."
            )

        elif status == "INSUFFICIENT DATA":
            explanation = (
                f"Low detection count ({features.test_bits_count} test bits). Measurement uncertainty is too broad "
                f"to reliably confirm or reject channel security."
            )
            alternatives = [
                "Heavy channel attenuation or broken fiber link (photon loss).",
                "Receiver gating synchronization mismatch.",
                "Insufficient transmitted pulse batch size configured by user."
            ]
            recommended = (
                "Increase the number of transmitted pulses (minimum 1000 recommended). "
                "Check detector clock synchronization and verify optical link continuity."
            )

        else:
            explanation = "Channel parameters conform to normal operational baseline. No anomalous behavior detected."
            alternatives = ["Channel is operating within expected stochastic physical variation."]
            recommended = "Continue routine channel monitoring and periodic baseline recalibration."

        return SecurityAlert(
            run_id=run.run_id,
            severity=severity,
            status=status,
            detector_type="hybrid",
            observed_metrics=obs,
            baseline_reference=base_ref,
            sample_size=features.test_bits_count,
            confidence_interval=ci,
            test_or_rule_used=test_used,
            explanation=explanation,
            alternative_causes=alternatives,
            recommended_next_step=recommended,
        )
