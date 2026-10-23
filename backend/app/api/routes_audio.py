"""QuantumGuard AI - Audio Anomaly Detection API Routes

Endpoints for:
- WAV file uploads and safe ZIP archive dataset importing
- Audio playback streaming
- Acoustic feature extraction and downsampled waveform visualization
- Dataset inventory, stats, and categorization (Normal vs Anomalous)
- Model training (Isolation Forest) and evaluation (Accuracy, Precision, Recall, F1)
- Audio analysis history and CSV export
"""

import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query, Response
from fastapi.responses import FileResponse

from app.audio.models import (
    AudioFeatures,
    AudioSampleMetadata,
    AudioAnomalyPrediction,
    AudioDatasetStats,
    AudioEvaluationMetrics,
)
from app.audio.processor import (
    validate_wav_file,
    load_audio_signal,
    extract_zip_dataset,
    get_audio_storage_dir,
)
from app.audio.features import extract_audio_features
from app.audio.model import AudioAnomalyDetector
from app.audio.repository import AudioRepository

router = APIRouter(prefix="/audio", tags=["audio"])

# Persistent in-memory audio anomaly detector instance
audio_detector = AudioAnomalyDetector(contamination=0.05, random_state=42)


@router.post("/upload")
async def upload_audio_file(
    file: UploadFile = File(...),
    category: str = Form(default="unlabeled"),
    auto_analyze: bool = Form(default=True),
    threshold: float = Form(default=0.50),
):
    """
    Upload and process a single WAV audio file:
    1. Validates format and decodability
    2. Saves to audio storage directory
    3. Extracts waveform preview and acoustic features (RMS, ZCR, Centroid, Rolloff, Bandwidth, MFCCs)
    4. Evaluates with trained ML model if available
    """
    file_bytes = await file.read()
    filename = file.filename or "upload.wav"

    is_valid, err_msg = validate_wav_file(filename, file_bytes)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err_msg)

    file_id = f"aud-{uuid.uuid4().hex[:10]}"
    storage_dir = get_audio_storage_dir()
    save_path = storage_dir / f"{file_id}_{filename}"

    with open(save_path, "wb") as f:
        f.write(file_bytes)

    # Load audio signal & extract features
    try:
        y, sr, duration = load_audio_signal(str(save_path))
        features = extract_audio_features(y, sr)
    except Exception as e:
        if save_path.exists():
            save_path.unlink()
        raise HTTPException(status_code=400, detail=f"Failed to process audio signal: {str(e)}")

    valid_cat = category.lower() if category.lower() in ["normal", "anomalous"] else "unlabeled"
    timestamp = datetime.now(timezone.utc).isoformat()

    sample = AudioSampleMetadata(
        file_id=file_id,
        filename=filename,
        filepath=str(save_path),
        file_size_bytes=len(file_bytes),
        duration_sec=round(duration, 2),
        sample_rate=sr,
        channels=1,
        category=valid_cat,
        uploaded_at=timestamp,
        features=features,
    )
    AudioRepository.save_audio_file(sample)

    prediction = None
    if auto_analyze:
        prediction = audio_detector.predict(
            file_id=file_id,
            filename=filename,
            features=features,
            threshold=threshold,
            ground_truth=valid_cat if valid_cat != "unlabeled" else None,
        )
        if prediction.status != "INSUFFICIENT DATA":
            AudioRepository.save_analysis(prediction)

    return {
        "sample": sample.model_dump(),
        "prediction": prediction.model_dump() if prediction else None,
    }


@router.post("/dataset/upload-zip")
async def upload_zip_dataset(file: UploadFile = File(...)):
    """
    Safely extract a ZIP archive containing multiple WAV files:
    - Protects against zip-slip attacks
    - Automatically categorizes files based on directory naming (e.g. normal/ vs anomaly/)
    - Extracts acoustic features and registers each sample in the dataset
    """
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a .zip archive.")

    zip_bytes = await file.read()
    storage_dir = get_audio_storage_dir()

    try:
        extracted = extract_zip_dataset(zip_bytes, storage_dir)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to extract zip archive: {str(e)}")

    if not extracted:
        raise HTTPException(status_code=400, detail="No valid .wav files found inside the uploaded ZIP archive.")

    registered_samples = []
    timestamp = datetime.now(timezone.utc).isoformat()

    for item in extracted:
        filepath = item["saved_path"]
        try:
            y, sr, duration = load_audio_signal(filepath)
            features = extract_audio_features(y, sr)
            file_id = f"aud-{uuid.uuid4().hex[:10]}"

            sample = AudioSampleMetadata(
                file_id=file_id,
                filename=item["original_name"],
                filepath=filepath,
                file_size_bytes=item["file_size"],
                duration_sec=round(duration, 2),
                sample_rate=sr,
                channels=1,
                category=item["category"],
                uploaded_at=timestamp,
                features=features,
            )
            AudioRepository.save_audio_file(sample)
            registered_samples.append(sample)
        except Exception:
            # Skip unreadable individual files
            continue

    return {
        "total_extracted": len(extracted),
        "total_registered": len(registered_samples),
        "message": f"Successfully imported {len(registered_samples)} audio files into dataset.",
    }


@router.post("/dataset/upload-files")
async def upload_multiple_audio_files(
    files: List[UploadFile] = File(...),
    category: str = Form(default="unlabeled"),
):
    """Batch upload multiple individual WAV audio files with a specified category."""
    storage_dir = get_audio_storage_dir()
    registered = []
    timestamp = datetime.now(timezone.utc).isoformat()
    valid_cat = category.lower() if category.lower() in ["normal", "anomalous"] else "unlabeled"

    for file in files:
        file_bytes = await file.read()
        filename = file.filename or "audio.wav"

        is_valid, _ = validate_wav_file(filename, file_bytes)
        if not is_valid:
            continue

        file_id = f"aud-{uuid.uuid4().hex[:10]}"
        save_path = storage_dir / f"{file_id}_{filename}"
        with open(save_path, "wb") as f:
            f.write(file_bytes)

        try:
            y, sr, duration = load_audio_signal(str(save_path))
            features = extract_audio_features(y, sr)

            sample = AudioSampleMetadata(
                file_id=file_id,
                filename=filename,
                filepath=str(save_path),
                file_size_bytes=len(file_bytes),
                duration_sec=round(duration, 2),
                sample_rate=sr,
                channels=1,
                category=valid_cat,
                uploaded_at=timestamp,
                features=features,
            )
            AudioRepository.save_audio_file(sample)
            registered.append(sample)
        except Exception:
            if save_path.exists():
                save_path.unlink()
            continue

    return {
        "uploaded_count": len(registered),
        "message": f"Successfully uploaded and cataloged {len(registered)} audio samples.",
    }


@router.get("/dataset/stats", response_model=AudioDatasetStats)
def get_dataset_stats():
    """Retrieve aggregated dataset statistics and model training status."""
    return AudioRepository.get_dataset_stats(
        is_trained=audio_detector.is_trained,
        trained_count=audio_detector.trained_sample_count,
        trained_at=audio_detector.trained_at,
    )


@router.get("/dataset/files", response_model=List[AudioSampleMetadata])
def list_dataset_files(
    category: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
):
    """List audio files in the dataset with optional category filtering."""
    return AudioRepository.list_audio_files(category=category, limit=limit)


@router.get("/files/{file_id}/stream")
def stream_audio(file_id: str):
    """Stream audio file for browser <audio> playback."""
    sample = AudioRepository.get_audio_file(file_id)
    if not sample:
        raise HTTPException(status_code=404, detail="Audio file record not found.")

    path = Path(sample.filepath)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Audio file missing from storage disk.")

    return FileResponse(
        path=str(path),
        media_type="audio/wav",
        filename=sample.filename,
    )


@router.post("/model/train")
def train_audio_model(
    contamination: float = Form(default=0.05),
):
    """
    Train the Isolation Forest model on all 'normal' audio samples in the dataset.
    Requires at least 3 normal samples.
    """
    normal_samples = AudioRepository.list_audio_files(category="normal", limit=1000)
    if len(normal_samples) < 3:
        raise HTTPException(
            status_code=400,
            detail=f"At least 3 'normal' audio recordings are required for baseline training (currently have {len(normal_samples)}). "
                   "Please upload more normal samples or assign the 'Normal' category to baseline files."
        )

    features_list = [s.features for s in normal_samples if s.features is not None]
    if len(features_list) < 3:
        raise HTTPException(status_code=400, detail="Insufficient feature data extracted from normal samples.")

    audio_detector.contamination = contamination
    audio_detector.fit(features_list)

    return {
        "success": True,
        "message": f"Successfully trained Audio Isolation Forest on {len(features_list)} normal reference recordings.",
        "trained_samples_count": len(features_list),
        "trained_at": audio_detector.trained_at,
    }


@router.post("/model/evaluate", response_model=AudioEvaluationMetrics)
def evaluate_audio_model(threshold: float = Form(default=0.50)):
    """
    Evaluate the trained Isolation Forest on labeled samples ('normal' and 'anomalous').
    Calculates Confusion Matrix, Accuracy, Precision, Recall, F1, and FPR.
    """
    if not audio_detector.is_trained:
        raise HTTPException(status_code=400, detail="Cannot evaluate model: model is not yet trained.")

    normal_samples = AudioRepository.list_audio_files(category="normal", limit=500)
    anomalous_samples = AudioRepository.list_audio_files(category="anomalous", limit=500)

    labeled_samples = normal_samples + anomalous_samples
    if not labeled_samples:
        raise HTTPException(
            status_code=400,
            detail="No labeled samples found. Please upload or categorize files as 'normal' or 'anomalous' to evaluate."
        )

    tp, fp, tn, fn = 0, 0, 0, 0

    for s in labeled_samples:
        if not s.features:
            continue
        pred = audio_detector.predict(
            file_id=s.file_id,
            filename=s.filename,
            features=s.features,
            threshold=threshold,
            ground_truth=s.category,
        )

        is_pos = (s.category == "anomalous")
        if pred.is_anomaly:
            if is_pos:
                tp += 1
            else:
                fp += 1
        else:
            if is_pos:
                fn += 1
            else:
                tn += 1

    total = tp + fp + tn + fn
    accuracy = (tp + tn) / total if total > 0 else 0.0
    precision = (tp / (tp + fp)) if (tp + fp) > 0 else None
    recall = (tp / (tp + fn)) if (tp + fn) > 0 else None
    f1 = (2.0 * precision * recall / (precision + recall)) if (precision and recall and (precision + recall) > 0) else None
    fpr = (fp / (fp + tn)) if (fp + tn) > 0 else None

    return AudioEvaluationMetrics(
        accuracy=round(accuracy, 4),
        precision=round(precision, 4) if precision is not None else None,
        recall=round(recall, 4) if recall is not None else None,
        f1_score=round(f1, 4) if f1 is not None else None,
        false_positive_rate=round(fpr, 4) if fpr is not None else None,
        confusion_matrix={"tp": tp, "fp": fp, "tn": tn, "fn": fn},
        evaluated_samples_count=total,
        notes="Evaluated using active Isolation Forest decision boundary against ground-truth dataset labels.",
    )


@router.post("/analyze/{file_id}", response_model=AudioAnomalyPrediction)
def analyze_audio_file(file_id: str, threshold: float = Query(default=0.50)):
    """Analyze a specific audio sample from the dataset."""
    sample = AudioRepository.get_audio_file(file_id)
    if not sample:
        raise HTTPException(status_code=404, detail="Audio file not found.")

    if not sample.features:
        y, sr, _ = load_audio_signal(sample.filepath)
        sample.features = extract_audio_features(y, sr)
        AudioRepository.save_audio_file(sample)

    pred = audio_detector.predict(
        file_id=sample.file_id,
        filename=sample.filename,
        features=sample.features,
        threshold=threshold,
        ground_truth=sample.category if sample.category != "unlabeled" else None,
    )
    if pred.status != "INSUFFICIENT DATA":
        AudioRepository.save_analysis(pred)

    return pred


@router.get("/history")
def get_analysis_history(limit: int = Query(default=50, ge=1, le=200)):
    """Retrieve history of past audio anomaly analyses."""
    return AudioRepository.list_analyses(limit=limit)


@router.get("/history/export-csv")
def export_history_csv():
    """Export past audio anomaly analysis records as a downloadable CSV."""
    csv_data = AudioRepository.export_analyses_csv()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="audio_anomaly_analysis_report.csv"'}
    )


@router.delete("/dataset/files/{file_id}")
def delete_dataset_file(file_id: str):
    """Delete an individual audio file from the dataset and disk."""
    success = AudioRepository.delete_audio_file(file_id)
    if not success:
        raise HTTPException(status_code=404, detail="Audio file not found.")
    return {"success": True, "file_id": file_id, "message": "File deleted successfully."}


@router.delete("/dataset/clear")
def clear_all_dataset_files():
    """Clear all audio dataset files and storage."""
    count = AudioRepository.clear_dataset()
    return {"success": True, "cleared_count": count, "message": f"Cleared {count} files from dataset."}
