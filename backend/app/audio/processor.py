"""QuantumGuard AI - Audio Signal Processor & Validation Engine

Handles:
- Safe file upload validation (format, header, size, duration)
- Safe ZIP archive extraction and folder-based automatic categorization
- Audio signal loading (via soundfile / scipy.io.wavfile)
- Downsampled waveform envelope calculation for UI charts
"""

import io
import os
import zipfile
from pathlib import Path
from typing import Tuple, List, Dict, Any, Optional
import numpy as np
import soundfile as sf

# Storage directory for audio files
AUDIO_STORAGE_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "audio_files"
AUDIO_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB
ALLOWED_EXTENSIONS = {".wav"}


def get_audio_storage_dir() -> Path:
    AUDIO_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    return AUDIO_STORAGE_DIR


def validate_wav_file(filename: str, file_bytes: bytes) -> Tuple[bool, str]:
    """
    Validate that uploaded file is a legitimate, uncorrupted WAV audio file.

    Returns:
        (is_valid: bool, error_message: str)
    """
    if not file_bytes or len(file_bytes) < 44:
        return False, "File is empty or too small to be a valid WAV file."

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        return False, f"File size ({len(file_bytes) / (1024*1024):.1f} MB) exceeds maximum limit (50 MB)."

    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Unsupported file extension '{ext}'. Only standard .wav audio files are supported."

    # Validate RIFF header
    if file_bytes[:4] != b"RIFF" or file_bytes[8:12] != b"WAVE":
        return False, "Invalid audio header. File is not a valid RIFF WAVE container."

    try:
        # Check soundfile read compatibility
        with io.BytesIO(file_bytes) as bio:
            with sf.SoundFile(bio) as sfile:
                if sfile.frames <= 0 or sfile.samplerate <= 0:
                    return False, "Corrupted audio stream: invalid duration or sample rate."
    except Exception as e:
        return False, f"Unable to decode WAV audio data: {str(e)}"

    return True, ""


def load_audio_signal(filepath: str) -> Tuple[np.ndarray, int, float]:
    """
    Load audio signal from file path, converting stereo to mono if needed.

    Returns:
        (y: np.ndarray, sr: int, duration_sec: float)
    """
    y, sr = sf.read(filepath, dtype="float32")

    # If multi-channel, average to mono
    if y.ndim > 1:
        y = np.mean(y, axis=1)

    # Normalize amplitude to [-1.0, 1.0] if not already
    max_val = np.max(np.abs(y))
    if max_val > 0.0:
        y = y / max_val

    duration = float(len(y) / sr) if sr > 0 else 0.0
    return y, int(sr), duration


def generate_waveform_preview(y: np.ndarray, num_points: int = 120) -> List[float]:
    """
    Downsample an audio signal into a small list of peak amplitudes for frontend waveform charting.
    """
    if len(y) == 0:
        return []

    if len(y) <= num_points:
        return [round(float(v), 3) for v in y]

    step = len(y) / float(num_points)
    preview = []
    for i in range(num_points):
        start = int(i * step)
        end = int((i + 1) * step)
        chunk = y[start:end]
        if len(chunk) > 0:
            # Maximum absolute amplitude in this window
            val = float(np.max(np.abs(chunk)))
            preview.append(round(val, 3))
        else:
            preview.append(0.0)

    return preview


def extract_zip_dataset(zip_bytes: bytes, target_dir: Path) -> List[Dict[str, Any]]:
    """
    Safely extract a ZIP archive of WAV files and infer categories from subfolder names.

    Safety:
    - Protects against Path Traversal (Zip Slip) attacks.
    - Rejects nested zip bombs (> 100MB uncompressed).

    Returns:
        List of dicts: [{"filename": str, "saved_path": str, "category": str, "file_size": int}]
    """
    extracted_files = []
    total_uncompressed_size = 0
    MAX_UNCOMPRESSED_SIZE = 150 * 1024 * 1024  # 150 MB

    with io.BytesIO(zip_bytes) as bio:
        with zipfile.ZipFile(bio, "r") as zf:
            for zip_info in zf.infolist():
                # Check for zip bomb
                total_uncompressed_size += zip_info.file_size
                if total_uncompressed_size > MAX_UNCOMPRESSED_SIZE:
                    raise ValueError("ZIP archive exceeds maximum allowable uncompressed size (150 MB).")

                filename = zip_info.filename
                # Skip directory entries and macOS metadata
                if zip_info.is_dir() or "__MACOSX" in filename or Path(filename).name.startswith("."):
                    continue

                if not filename.lower().endswith(".wav"):
                    continue

                # Zip slip prevention: ensure resolved path is within target_dir
                dest_path = (target_dir / Path(filename).name).resolve()
                if not str(dest_path).startswith(str(target_dir.resolve())):
                    raise ValueError(f"Illegal path in zip archive: {filename}")

                # Infer category from directory path or filename
                lower_full = filename.lower()
                category = "unlabeled"
                if any(k in lower_full for k in ["normal", "good", "baseline", "healthy", "inlier"]):
                    category = "normal"
                elif any(k in lower_full for k in ["anomaly", "anomalous", "fault", "defect", "abnormal", "damage", "bad"]):
                    category = "anomalous"

                # Write file safely
                with zf.open(zip_info) as source, open(dest_path, "wb") as target:
                    content = source.read()
                    target.write(content)

                extracted_files.append({
                    "original_name": Path(filename).name,
                    "saved_path": str(dest_path),
                    "file_size": len(content),
                    "category": category,
                })

    return extracted_files
