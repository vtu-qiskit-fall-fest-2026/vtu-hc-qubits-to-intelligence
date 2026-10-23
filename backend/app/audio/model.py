"""QuantumGuard AI - Audio Anomaly Detection ML Model (Isolation Forest)

Trains an unsupervised Isolation Forest model on acoustic feature representations
derived strictly from reference 'Normal' audio recordings.
Calculates continuous anomaly scores, identifies feature deviation drivers,
and generates explainable diagnoses without claiming definitive malice.
"""

from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict, Any
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from app.audio.models import AudioFeatures, AudioAnomalyPrediction


class AudioAnomalyDetector:
    """Unsupervised Isolation Forest detector for acoustic anomaly surveillance."""

    def __init__(self, contamination: float = 0.05, random_state: int = 42):
        self.contamination = contamination
        self.random_state = random_state
        self.model: Optional[IsolationForest] = None
        self.scaler: Optional[StandardScaler] = None
        self.feature_names = AudioFeatures.feature_names()
        self.is_trained: bool = False
        self.trained_sample_count: int = 0
        self.trained_at: Optional[str] = None

        # Statistics of training set for explainability (means & stds)
        self.feature_means: Optional[np.ndarray] = None
        self.feature_stds: Optional[np.ndarray] = None

    def fit(self, normal_features: List[AudioFeatures]) -> None:
        """
        Train the Isolation Forest on normal reference audio samples.

        Args:
            normal_features: List of AudioFeatures from verified normal/inlier recordings.
        """
        if len(normal_features) < 3:
            raise ValueError(f"Training requires at least 3 normal audio samples, got {len(normal_features)}.")

        X = np.array([f.to_feature_vector() for f in normal_features], dtype=float)

        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)

        self.model = IsolationForest(
            contamination=self.contamination,
            random_state=self.random_state,
            n_estimators=100
        )
        self.model.fit(X_scaled)

        self.feature_means = np.mean(X, axis=0)
        self.feature_stds = np.std(X, axis=0)
        # Avoid division by zero
        self.feature_stds[self.feature_stds < 1e-6] = 1.0

        self.is_trained = True
        self.trained_sample_count = len(normal_features)
        self.trained_at = datetime.now(timezone.utc).isoformat()

    def predict(
        self,
        file_id: str,
        filename: str,
        features: AudioFeatures,
        threshold: float = 0.50,
        ground_truth: Optional[str] = None
    ) -> AudioAnomalyPrediction:
        """
        Evaluate an audio sample and produce an explainable prediction.

        Args:
            file_id: Identifier of the audio sample.
            filename: Original audio filename.
            features: Extracted acoustic features.
            threshold: Anomaly score decision threshold [0.0, 1.0] (default 0.50).
            ground_truth: Optional ground truth category ('normal' / 'anomalous').

        Returns:
            AudioAnomalyPrediction object.
        """
        timestamp = datetime.now(timezone.utc).isoformat()

        if not self.is_trained or self.model is None or self.scaler is None:
            return AudioAnomalyPrediction(
                file_id=file_id,
                filename=filename,
                timestamp=timestamp,
                is_anomaly=False,
                status="INSUFFICIENT DATA",
                anomaly_score=0.0,
                threshold_used=threshold,
                features=features,
                explanation="Model is not yet trained. Please upload at least 3 normal audio samples and train the model.",
                contributing_factors=["Model untrained: baseline reference dataset required."],
                ground_truth=ground_truth,
            )

        x_raw = np.array([features.to_feature_vector()], dtype=float)
        x_scaled = self.scaler.transform(x_raw)

        # Raw decision score in [-0.5, 0.5] (lower means more anomalous in Isolation Forest)
        raw_score = float(self.model.decision_function(x_scaled)[0])
        base_score = 0.5 - raw_score

        # Diagnose contributing features via z-score deviations from training baseline
        contributing_factors = []
        max_z = 0.0
        if self.feature_means is not None and self.feature_stds is not None:
            z_scores = np.abs((x_raw[0] - self.feature_means) / self.feature_stds)
            max_z = float(np.max(z_scores))
            # Find features with highest z-score deviation
            top_indices = np.argsort(z_scores)[::-1][:3]
            for idx in top_indices:
                if z_scores[idx] > 1.5:
                    feat_name = self.feature_names[idx].replace("_", " ").title()
                    dev = z_scores[idx]
                    val = x_raw[0][idx]
                    ref_mean = self.feature_means[idx]
                    direction = "elevated" if val > ref_mean else "suppressed"
                    contributing_factors.append(
                        f"{feat_name} is significantly {direction} ({val:.2f} vs reference mean {ref_mean:.2f}, z={dev:.1f}σ)"
                    )

        # Combine Isolation Forest decision boundary with extreme feature deviations (z > 3.0σ)
        z_penalty = float(np.clip((max_z - 3.0) / 10.0, 0.0, 0.5)) if max_z > 3.0 else 0.0
        anomaly_score = float(np.clip(base_score + z_penalty, 0.0, 1.0))

        is_anomaly = bool(anomaly_score >= threshold)
        status = "ANOMALY DETECTED" if is_anomaly else "NORMAL"


        if is_anomaly:
            if contributing_factors:
                explanation = (
                    f"Acoustic anomaly detected with an anomaly score of {anomaly_score:.3f} (threshold: {threshold:.2f}). "
                    f"Primary acoustic deviations: {'; '.join(contributing_factors[:2])}."
                )
            else:
                explanation = (
                    f"Acoustic anomaly detected with an outlier score of {anomaly_score:.3f} (threshold: {threshold:.2f}). "
                    "Multidimensional spectral features deviate from the reference baseline."
                )
        else:
            explanation = (
                f"Audio sample conforms to the trained normal acoustic distribution (outlier score: {anomaly_score:.3f} < {threshold:.2f})."
            )

        return AudioAnomalyPrediction(
            file_id=file_id,
            filename=filename,
            timestamp=timestamp,
            is_anomaly=is_anomaly,
            status=status,
            anomaly_score=round(anomaly_score, 4),
            threshold_used=threshold,
            features=features,
            explanation=explanation,
            contributing_factors=contributing_factors,
            ground_truth=ground_truth,
        )
