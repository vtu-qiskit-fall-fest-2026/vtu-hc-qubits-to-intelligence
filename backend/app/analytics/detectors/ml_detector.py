"""QuantumGuard AI - Machine Learning Anomaly Detector (Isolation Forest)

Unsupervised anomaly detector utilizing Scikit-learn's Isolation Forest trained
strictly on reference baseline feature vectors.
Provides explainable outlier scoring without leaking ground-truth labels or attack metadata.
"""

from typing import Optional, List, Dict, Any
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from app.analytics.detectors.base import BaseDetector, DetectorVerdict
from app.analytics.features import ObservableFeatures
from app.analytics.baseline import BaselineCalibration


class MLIsolationForestDetector(BaseDetector):
    """
    Unsupervised Isolation Forest anomaly detector for QKD observable metrics.

    IMPORTANT SCIENTIFIC DISCLAIMER:
    The output anomaly score reflects statistical outlierness in the multidimensional
    feature space relative to the training distribution. It represents an isolation depth,
    NOT the objective probability of an intentional attack.
    """

    def __init__(self, contamination: float = 0.05, random_state: int = 42):
        self.contamination = contamination
        self.random_state = random_state
        self.model: Optional[IsolationForest] = None
        self.scaler: Optional[StandardScaler] = None
        self.is_trained: bool = False
        self.training_sample_count: int = 0

    def fit(self, feature_vectors: np.ndarray) -> None:
        """
        Train Isolation Forest on reference baseline feature vectors.

        Args:
            feature_vectors: 2D numpy array of shape (N_samples, N_features).
                             Must contain ONLY reference/clean baseline observations.
        """
        if feature_vectors.ndim != 2 or feature_vectors.shape[0] < 5:
            raise ValueError(f"Training requires at least 5 sample vectors, got shape {feature_vectors.shape}")

        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(feature_vectors)

        self.model = IsolationForest(
            contamination=self.contamination,
            random_state=self.random_state,
            n_estimators=100
        )
        self.model.fit(X_scaled)
        self.is_trained = True
        self.training_sample_count = feature_vectors.shape[0]

    def detect(
        self,
        features: ObservableFeatures,
        baseline: Optional[BaselineCalibration] = None
    ) -> DetectorVerdict:
        if not self.is_trained or self.model is None or self.scaler is None:
            return DetectorVerdict(
                detector_name="MLIsolationForestDetector",
                detector_type="machine_learning",
                is_anomaly=False,
                status="INSUFFICIENT DATA",
                confidence_score=0.0,
                summary_message="ML Isolation Forest model is not yet trained on reference baseline data.",
                trigger_reasons=["Untrained model: reference baseline dataset required for unsupervised fitting."],
                metrics_snapshot={"is_trained": False}
            )

        if features.qber is None or features.test_bits_count == 0:
            return DetectorVerdict(
                detector_name="MLIsolationForestDetector",
                detector_type="machine_learning",
                is_anomaly=False,
                status="INSUFFICIENT DATA",
                confidence_score=0.0,
                summary_message="No QBER measurement available; cannot evaluate ML feature vector.",
                trigger_reasons=["Missing QBER observation."],
                metrics_snapshot={"test_bits_count": 0}
            )

        # Extract numeric vector
        x_raw = features.to_vector().reshape(1, -1)
        x_scaled = self.scaler.transform(x_raw)

        # Isolation forest raw decision function: positive = inlier, negative = outlier
        raw_score = float(self.model.decision_function(x_scaled)[0])
        pred_label = int(self.model.predict(x_scaled)[0])  # +1 = inlier, -1 = outlier

        # Transform raw decision function to normalized outlier score in [0.0, 1.0]
        # In scikit-learn, decision_function is typically in [-0.5, 0.5]
        # Lower means more anomalous.
        normalized_anomaly_score = float(np.clip(0.5 - raw_score, 0.0, 1.0))

        is_anomaly = bool(pred_label == -1 or normalized_anomaly_score > 0.55)

        triggers = []
        if is_anomaly:
            status = "ANOMALY SUSPECTED"
            triggers.append(
                f"Multi-metric isolation anomaly detected (outlier score={normalized_anomaly_score:.3f}, decision_function={raw_score:.3f})."
            )
            summary = "Observable channel metrics occupy an anomalous low-density region in feature space."
        else:
            status = "NORMAL"
            summary = "Observable metrics conform to the multi-dimensional distribution of reference training runs."

        return DetectorVerdict(
            detector_name="MLIsolationForestDetector",
            detector_type="machine_learning",
            is_anomaly=is_anomaly,
            status=status,
            confidence_score=round(normalized_anomaly_score, 3),
            summary_message=summary,
            trigger_reasons=triggers,
            statistical_details={
                "raw_decision_score": round(raw_score, 4),
                "normalized_outlier_score": round(normalized_anomaly_score, 4),
                "is_outlier_flag": is_anomaly,
                "scientific_limitation_note": (
                    "Score represents unsupervised feature-space isolation distance, NOT the objective probability of an attack."
                )
            },
            metrics_snapshot={
                "qber": features.qber,
                "detection_rate": features.detection_rate,
                "photon_loss_rate": features.photon_loss_rate,
                "sifted_ratio": features.sifted_ratio,
            }
        )
