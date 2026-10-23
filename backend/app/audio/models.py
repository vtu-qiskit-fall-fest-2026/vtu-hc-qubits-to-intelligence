"""QuantumGuard AI - Audio Anomaly Detection Data Models

Pydantic models representing audio metadata, extracted acoustic features,
waveform telemetry, anomaly predictions, and dataset statistics.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class AudioFeatures(BaseModel):
    """Acoustic feature representation extracted from an audio signal."""
    rms_energy: float = Field(description="Root Mean Square energy measuring signal amplitude/power")
    zero_crossing_rate: float = Field(description="Rate of sign-changes along signal indicating noisiness/frequency")
    spectral_centroid: float = Field(description="Center of mass of frequency spectrum (spectral brightness in Hz)")
    spectral_rolloff: float = Field(description="Frequency below which 85% of spectral energy lies in Hz")
    spectral_bandwidth: float = Field(description="Spectral spread/width around the centroid in Hz")
    mfccs: List[float] = Field(description="13 Mel-Frequency Cepstral Coefficients capturing timbre and spectral envelope")
    waveform_preview: List[float] = Field(default_factory=list, description="Downsampled normalized waveform amplitude points for UI visualization")

    def to_feature_vector(self) -> List[float]:
        """Flatten acoustic features into a 1D vector for ML anomaly detection."""
        return [
            self.rms_energy,
            self.zero_crossing_rate,
            self.spectral_centroid,
            self.spectral_rolloff,
            self.spectral_bandwidth,
            *self.mfccs[:13],
        ]

    @classmethod
    def feature_names(cls) -> List[str]:
        return [
            "rms_energy",
            "zero_crossing_rate",
            "spectral_centroid",
            "spectral_rolloff",
            "spectral_bandwidth",
            *[f"mfcc_{i+1}" for i in range(13)],
        ]


class AudioSampleMetadata(BaseModel):
    """Metadata for an uploaded audio file in the dataset."""
    file_id: str
    filename: str
    filepath: str
    file_size_bytes: int
    duration_sec: float
    sample_rate: int
    channels: int
    category: str = Field(default="unlabeled", description="'normal', 'anomalous', or 'unlabeled'")
    uploaded_at: str
    features: Optional[AudioFeatures] = None


class AudioAnomalyPrediction(BaseModel):
    """Result of unsupervised acoustic anomaly detection on an audio sample."""
    file_id: str
    filename: str
    timestamp: str
    is_anomaly: bool
    status: str = Field(description="'NORMAL', 'ANOMALY DETECTED', 'INSUFFICIENT DATA'")
    anomaly_score: float = Field(ge=0.0, le=1.0, description="Normalized outlier score [0.0 = completely normal, 1.0 = highly anomalous]")
    threshold_used: float = Field(default=0.50)
    features: AudioFeatures
    explanation: str
    contributing_factors: List[str] = Field(default_factory=list)
    ground_truth: Optional[str] = None
    scientific_disclaimer: str = Field(
        default="PREDICTION ONLY: Model anomaly score reflects unsupervised statistical deviation from the trained normal acoustic distribution. "
                "Physical noise, recording equipment variance, or background events may also cause high anomaly scores."
    )


class AudioDatasetStats(BaseModel):
    """Aggregated statistics of the managed audio dataset."""
    total_files: int
    normal_samples: int
    anomalous_samples: int
    unlabeled_samples: int
    total_duration_sec: float
    avg_sample_rate: int
    is_model_trained: bool = False
    trained_sample_count: int = 0
    model_trained_at: Optional[str] = None


class AudioEvaluationMetrics(BaseModel):
    """Evaluation metrics when ground-truth labels are present in the dataset."""
    accuracy: float
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1_score: Optional[float] = None
    false_positive_rate: Optional[float] = None
    confusion_matrix: Dict[str, int]
    evaluated_samples_count: int
    notes: str
