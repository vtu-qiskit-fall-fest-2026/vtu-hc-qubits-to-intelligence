"""Unit & Integration Tests for Audio Anomaly Detection Module"""

import io
import pytest
import numpy as np
import soundfile as sf
from fastapi.testclient import TestClient

from app.main import app
from app.database.db import init_db
from app.audio.models import AudioFeatures
from app.audio.processor import validate_wav_file, load_audio_signal, generate_waveform_preview
from app.audio.features import extract_audio_features
from app.audio.model import AudioAnomalyDetector
from app.audio.repository import AudioRepository

# Ensure all database tables exist
init_db()


def create_synthetic_wav(freq: float = 440.0, duration: float = 1.0, sr: int = 16000, noise_level: float = 0.0) -> bytes:
    """Generate a valid in-memory WAV audio byte buffer."""
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    y = np.sin(2 * np.pi * freq * t)
    if noise_level > 0:
        y += np.random.normal(0, noise_level, size=len(y))
    y = y / np.max(np.abs(y))  # Normalize

    bio = io.BytesIO()
    sf.write(bio, y, sr, format="WAV", subtype="PCM_16")
    return bio.getvalue()


def test_validate_wav_file():
    """Verify WAV validation rejects corrupted files and accepts valid WAV files."""
    valid_bytes = create_synthetic_wav(freq=440.0)
    is_valid, err = validate_wav_file("test.wav", valid_bytes)
    assert is_valid is True
    assert err == ""

    # Corrupted / invalid header
    bad_bytes = b"NOT_A_WAV_HEADER" + b"\x00" * 100
    is_valid_bad, err_bad = validate_wav_file("test.wav", bad_bytes)
    assert is_valid_bad is False
    assert "Invalid audio header" in err_bad

    # Empty file
    is_valid_empty, err_empty = validate_wav_file("empty.wav", b"")
    assert is_valid_empty is False
    assert "empty" in err_empty.lower()

    # Wrong extension
    is_valid_ext, err_ext = validate_wav_file("test.txt", valid_bytes)
    assert is_valid_ext is False
    assert "Unsupported file extension" in err_ext


def test_extract_audio_features():
    """Verify extraction of acoustic features: RMS, ZCR, Centroid, Rolloff, MFCCs, waveform preview."""
    wav_bytes = create_synthetic_wav(freq=880.0, duration=1.0, sr=16000)
    with io.BytesIO(wav_bytes) as bio:
        y, sr = sf.read(bio, dtype="float32")

    features = extract_audio_features(y, sr)

    assert features.rms_energy > 0.0
    assert 0.0 <= features.zero_crossing_rate <= 1.0
    assert features.spectral_centroid > 0.0
    assert features.spectral_rolloff > 0.0
    assert features.spectral_bandwidth > 0.0
    assert len(features.mfccs) == 13
    assert len(features.waveform_preview) > 0
    assert len(features.to_feature_vector()) == 18


def test_audio_anomaly_detector_training_and_prediction():
    """Verify Isolation Forest training on normal acoustic samples and outlier scoring."""
    detector = AudioAnomalyDetector(contamination=0.10, random_state=42)

    # Need at least 3 samples to train
    normal_samples = []
    for freq in [440.0, 442.0, 438.0, 445.0, 439.0]:
        wav_b = create_synthetic_wav(freq=freq, duration=0.8, noise_level=0.01)
        y, sr = sf.read(io.BytesIO(wav_b), dtype="float32")
        normal_samples.append(extract_audio_features(y, sr))

    detector.fit(normal_samples)
    assert detector.is_trained is True
    assert detector.trained_sample_count == 5

    # 1. Test normal sample (similar frequency)
    norm_wav = create_synthetic_wav(freq=440.5, duration=0.8, noise_level=0.01)
    y_norm, sr = sf.read(io.BytesIO(norm_wav), dtype="float32")
    f_norm = extract_audio_features(y_norm, sr)
    pred_norm = detector.predict("test-norm", "norm.wav", f_norm, threshold=0.60)
    assert pred_norm.is_anomaly is False
    assert pred_norm.status == "NORMAL"

    # 2. Test anomalous sample (drastically different frequency and high noise)
    anom_wav = create_synthetic_wav(freq=4000.0, duration=0.8, noise_level=0.8)
    y_anom, sr = sf.read(io.BytesIO(anom_wav), dtype="float32")
    f_anom = extract_audio_features(y_anom, sr)
    pred_anom = detector.predict("test-anom", "anom.wav", f_anom, threshold=0.50)
    assert pred_anom.is_anomaly is True
    assert pred_anom.status == "ANOMALY DETECTED"
    assert pred_anom.anomaly_score > 0.50


def test_audio_api_upload_and_stats():
    """Verify FastAPI audio upload, dataset stats, and history endpoints."""
    client = TestClient(app)

    # 1. Upload valid WAV file
    wav_bytes = create_synthetic_wav(freq=500.0, duration=0.5)
    files = {"file": ("normal_sample_1.wav", wav_bytes, "audio/wav")}
    data = {"category": "normal", "auto_analyze": "true", "threshold": "0.50"}

    res = client.post("/api/audio/upload", files=files, data=data)
    assert res.status_code == 200
    res_data = res.json()
    assert "sample" in res_data
    assert res_data["sample"]["filename"] == "normal_sample_1.wav"
    assert res_data["sample"]["features"] is not None
    assert res_data["sample"]["duration_sec"] > 0

    # 2. Upload invalid file
    bad_files = {"file": ("corrupted.wav", b"GARBAGE_DATA", "audio/wav")}
    res_bad = client.post("/api/audio/upload", files=bad_files, data=data)
    assert res_bad.status_code == 400

    # 3. Check dataset stats endpoint
    res_stats = client.get("/api/audio/dataset/stats")
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert stats["total_files"] >= 1
    assert stats["normal_samples"] >= 1

    # 4. Check CSV export endpoint
    res_csv = client.get("/api/audio/history/export-csv")
    assert res_csv.status_code == 200
    assert "Filename" in res_csv.text
    assert "Analysis ID" in res_csv.text
