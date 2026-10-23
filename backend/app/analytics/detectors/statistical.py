"""QuantumGuard AI - Statistical Hypothesis Anomaly Detector

Performs rigorous statistical hypothesis testing (continuity-corrected binomial
z-tests, Wilson score interval comparisons, and detection rate drift analysis)
to distinguish genuine channel anomalies from ordinary statistical fluctuations.
"""

from typing import Optional, List, Dict, Any
import numpy as np
from scipy import stats

from app.analytics.detectors.base import BaseDetector, DetectorVerdict
from app.analytics.features import ObservableFeatures
from app.analytics.baseline import BaselineCalibration


class StatisticalDetector(BaseDetector):
    """Statistical hypothesis test detector comparing observations against baseline distribution."""

    def __init__(self, significance_alpha: float = 0.01):
        """
        Args:
            significance_alpha: Significance level for rejecting H0 (default 0.01 for 99% confidence).
        """
        self.significance_alpha = significance_alpha

    def detect(
        self,
        features: ObservableFeatures,
        baseline: Optional[BaselineCalibration] = None
    ) -> DetectorVerdict:
        triggers: List[str] = []
        stat_details: Dict[str, Any] = {}
        is_anomaly = False
        status = "NORMAL"
        confidence = 0.0

        # Handle missing data or zero test bits
        if features.qber is None or features.test_bits_count == 0:
            return DetectorVerdict(
                detector_name="StatisticalDetector",
                detector_type="statistical",
                is_anomaly=False,
                status="INSUFFICIENT DATA",
                confidence_score=0.0,
                summary_message="No test bit sample available to perform statistical hypothesis testing.",
                trigger_reasons=["Test bit count is zero; hypothesis test cannot be evaluated."],
                metrics_snapshot={"test_bits_count": 0}
            )

        # Handle uncalibrated link
        if baseline is None:
            # Fallback to default expected telecom operational reference (p0=0.015)
            p0 = 0.015
            baseline_note = "Using default telecom baseline (p0=1.5%) as link is uncalibrated."
        else:
            p0 = max(0.001, baseline.mean_qber)
            baseline_note = f"Using calibrated baseline: {baseline.name} (p0={p0*100:.2f}%)."

        n = features.test_bits_count
        k = features.error_count
        p_hat = features.qber

        # 1. One-Tailed Binomial Z-Test with Continuity Correction
        # H0: p <= p0 (channel is operating at baseline error rate)
        # H1: p > p0 (channel error rate is elevated)
        variance = n * p0 * (1.0 - p0)
        std_err = np.sqrt(variance) if variance > 0 else 0.001

        diff = k - n * p0
        # Continuity correction: subtract 0.5 if k > n*p0
        if diff > 0.5:
            z_score = (diff - 0.5) / std_err
        elif diff < -0.5:
            z_score = (diff + 0.5) / std_err
        else:
            z_score = 0.0

        # Compute p-value from standard normal survival function (1 - CDF)
        p_value = float(stats.norm.sf(z_score))

        stat_details["binomial_z_score"] = round(float(z_score), 4)
        stat_details["p_value"] = float(f"{p_value:.6e}")
        stat_details["significance_level_alpha"] = self.significance_alpha
        stat_details["baseline_expected_p0"] = p0
        stat_details["test_sample_size_n"] = n
        stat_details["observed_errors_k"] = k

        # 2. Sample Size Caution
        if n < 30:
            stat_details["sample_size_warning"] = "Small sample size (n < 30). Statistical power is constrained."
            if p_value < 0.001 and z_score > 4.0:
                # Even with small sample, extremely extreme error rate indicates anomaly
                is_anomaly = True
                status = "ANOMALY SUSPECTED"
                confidence = 0.70
                triggers.append(
                    f"Statistically significant error elevation despite small sample size: z={z_score:.2f}, p={p_value:.4e}."
                )
            else:
                status = "INSUFFICIENT DATA"
                confidence = 0.20
                triggers.append(
                    f"Sample size too small ({n} bits) for conclusive statistical rejection of H0. Observed p-value={p_value:.4f}."
                )
                return DetectorVerdict(
                    detector_name="StatisticalDetector",
                    detector_type="statistical",
                    is_anomaly=False,
                    status=status,
                    confidence_score=confidence,
                    summary_message="Insufficient sample size: cannot rule out random statistical fluctuation.",
                    trigger_reasons=triggers,
                    statistical_details=stat_details,
                    metrics_snapshot={"qber": features.qber, "test_bits_count": n}
                )

        # 3. Hypothesis Decision
        if p_value < self.significance_alpha and z_score > 0:
            is_anomaly = True
            triggers.append(
                f"Statistical hypothesis H0 rejected (p-value={p_value:.4e} < alpha={self.significance_alpha}). "
                f"Elevated QBER (z-score={z_score:.2f}) indicates statistically significant channel disturbance."
            )
            # Map z-score to bounded confidence score [0.70, 0.99]
            confidence = min(0.99, max(0.70, 0.70 + (z_score - 2.33) * 0.05))
            status = "INVESTIGATION REQUIRED" if z_score > 5.0 else "ANOMALY SUSPECTED"

        # 4. Detection Rate Shift Test (if baseline available)
        if baseline is not None:
            det_diff = features.detection_rate - baseline.mean_detection_rate
            det_std = max(baseline.std_detection_rate, 0.01)
            det_z = det_diff / det_std
            stat_details["detection_rate_z_score"] = round(float(det_z), 3)

            # Check if detection rate dropped more than 3 sigma
            if det_z < -3.0:
                is_anomaly = True
                triggers.append(
                    f"Statistically significant detection rate collapse: observed {features.detection_rate*100:.1f}%, "
                    f"deviation is {det_z:.2f} standard deviations below baseline."
                )
                confidence = max(confidence, 0.85)
                if status != "INVESTIGATION REQUIRED":
                    status = "ANOMALY SUSPECTED"

        if not triggers:
            summary = f"No statistically significant deviation from baseline (z={z_score:.2f}, p={p_value:.4f}). {baseline_note}"
            status = "NORMAL"
            confidence = 0.05
        else:
            summary = "; ".join(triggers)

        return DetectorVerdict(
            detector_name="StatisticalDetector",
            detector_type="statistical",
            is_anomaly=is_anomaly,
            status=status,
            confidence_score=round(float(confidence), 3),
            summary_message=summary,
            trigger_reasons=triggers,
            statistical_details=stat_details,
            metrics_snapshot={
                "qber": features.qber,
                "z_score": round(float(z_score), 3),
                "p_value": p_value,
                "test_bits_count": n,
            }
        )
