"""QuantumGuard AI - Acoustic Feature Extraction Engine

Extracts standard industrial/environmental acoustic features from audio signals:
- Root Mean Square (RMS) energy
- Zero Crossing Rate (ZCR)
- Spectral Centroid (frequency brightness in Hz)
- Spectral Rolloff (85% energy cutoff frequency in Hz)
- Spectral Bandwidth (spectral spread in Hz)
- 13 Mel-Frequency Cepstral Coefficients (MFCCs)
- Downsampled amplitude waveform preview for frontend rendering
"""

from typing import List
import numpy as np
import librosa

from app.audio.models import AudioFeatures
from app.audio.processor import generate_waveform_preview


def extract_audio_features(y: np.ndarray, sr: int) -> AudioFeatures:
    """
    Extract acoustic feature set and waveform envelope from an audio signal.

    Args:
        y: Normalized audio signal array (1D float32).
        sr: Sample rate in Hz.

    Returns:
        AudioFeatures object.
    """
    if len(y) == 0:
        return AudioFeatures(
            rms_energy=0.0,
            zero_crossing_rate=0.0,
            spectral_centroid=0.0,
            spectral_rolloff=0.0,
            spectral_bandwidth=0.0,
            mfccs=[0.0] * 13,
            waveform_preview=[]
        )

    # 1. RMS Energy
    rms_arr = librosa.feature.rms(y=y)
    rms_mean = float(np.mean(rms_arr))

    # 2. Zero-Crossing Rate
    zcr_arr = librosa.feature.zero_crossing_rate(y=y)
    zcr_mean = float(np.mean(zcr_arr))

    # 3. Spectral Centroid
    cent_arr = librosa.feature.spectral_centroid(y=y, sr=sr)
    cent_mean = float(np.mean(cent_arr))

    # 4. Spectral Rolloff (85%)
    rolloff_arr = librosa.feature.spectral_rolloff(y=y, sr=sr, roll_percent=0.85)
    rolloff_mean = float(np.mean(rolloff_arr))

    # 5. Spectral Bandwidth
    bw_arr = librosa.feature.spectral_bandwidth(y=y, sr=sr)
    bw_mean = float(np.mean(bw_arr))

    # 6. MFCCs (13 coefficients)
    n_mfcc = 13
    mfcc_matrix = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc)
    mfccs_mean = [float(np.mean(mfcc_matrix[i, :])) for i in range(n_mfcc)]

    # 7. Waveform preview for UI
    waveform_preview = generate_waveform_preview(y, num_points=120)

    return AudioFeatures(
        rms_energy=round(rms_mean, 5),
        zero_crossing_rate=round(zcr_mean, 5),
        spectral_centroid=round(cent_mean, 2),
        spectral_rolloff=round(rolloff_mean, 2),
        spectral_bandwidth=round(bw_mean, 2),
        mfccs=[round(val, 4) for val in mfccs_mean],
        waveform_preview=waveform_preview
    )
