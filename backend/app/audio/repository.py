"""QuantumGuard AI - Audio Database Repository

Persists and queries audio dataset files, acoustic feature sets, and analysis records in SQLite.
"""

import io
import csv
import json
from pathlib import Path
from typing import List, Optional, Dict, Any

from app.database.db import get_db_connection
from app.audio.models import (
    AudioSampleMetadata,
    AudioFeatures,
    AudioAnomalyPrediction,
    AudioDatasetStats,
)


class AudioRepository:
    """Manages audio files and analysis records in SQLite."""

    @staticmethod
    def save_audio_file(sample: AudioSampleMetadata) -> None:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            features_json = sample.features.model_dump_json() if sample.features else None
            cursor.execute(
                """
                INSERT OR REPLACE INTO audio_dataset_files (
                    file_id, filename, filepath, file_size_bytes, duration_sec,
                    sample_rate, channels, category, uploaded_at, features_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    sample.file_id,
                    sample.filename,
                    sample.filepath,
                    sample.file_size_bytes,
                    sample.duration_sec,
                    sample.sample_rate,
                    sample.channels,
                    sample.category,
                    sample.uploaded_at,
                    features_json,
                )
            )

    @staticmethod
    def get_audio_file(file_id: str) -> Optional[AudioSampleMetadata]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM audio_dataset_files WHERE file_id = ?", (file_id,))
            row = cursor.fetchone()
            if not row:
                return None

            features = AudioFeatures(**json.loads(row["features_json"])) if row["features_json"] else None
            return AudioSampleMetadata(
                file_id=row["file_id"],
                filename=row["filename"],
                filepath=row["filepath"],
                file_size_bytes=row["file_size_bytes"],
                duration_sec=row["duration_sec"],
                sample_rate=row["sample_rate"],
                channels=row["channels"],
                category=row["category"],
                uploaded_at=row["uploaded_at"],
                features=features,
            )

    @staticmethod
    def list_audio_files(category: Optional[str] = None, limit: int = 100) -> List[AudioSampleMetadata]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            if category and category != "all":
                cursor.execute(
                    "SELECT * FROM audio_dataset_files WHERE category = ? ORDER BY uploaded_at DESC LIMIT ?",
                    (category, limit)
                )
            else:
                cursor.execute(
                    "SELECT * FROM audio_dataset_files ORDER BY uploaded_at DESC LIMIT ?",
                    (limit,)
                )
            rows = cursor.fetchall()

            results = []
            for r in rows:
                features = AudioFeatures(**json.loads(r["features_json"])) if r["features_json"] else None
                results.append(AudioSampleMetadata(
                    file_id=r["file_id"],
                    filename=r["filename"],
                    filepath=r["filepath"],
                    file_size_bytes=r["file_size_bytes"],
                    duration_sec=r["duration_sec"],
                    sample_rate=r["sample_rate"],
                    channels=r["channels"],
                    category=r["category"],
                    uploaded_at=r["uploaded_at"],
                    features=features,
                ))
            return results

    @staticmethod
    def delete_audio_file(file_id: str) -> bool:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT filepath FROM audio_dataset_files WHERE file_id = ?", (file_id,))
            row = cursor.fetchone()
            if not row:
                return False

            filepath = row["filepath"]
            # Delete record
            cursor.execute("DELETE FROM audio_dataset_files WHERE file_id = ?", (file_id,))

            # Safely remove physical file from disk
            try:
                p = Path(filepath)
                if p.exists():
                    p.unlink()
            except Exception:
                pass

            return True

    @staticmethod
    def clear_dataset() -> int:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT filepath FROM audio_dataset_files")
            rows = cursor.fetchall()
            for r in rows:
                try:
                    p = Path(r["filepath"])
                    if p.exists():
                        p.unlink()
                except Exception:
                    pass

            cursor.execute("DELETE FROM audio_dataset_files")
            return len(rows)

    @staticmethod
    def get_dataset_stats(is_trained: bool, trained_count: int, trained_at: Optional[str]) -> AudioDatasetStats:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*), SUM(duration_sec), AVG(sample_rate) FROM audio_dataset_files")
            row = cursor.fetchone()
            total_files = row[0] or 0
            total_duration = row[1] or 0.0
            avg_sr = int(row[2]) if row[2] else 0

            cursor.execute("SELECT COUNT(*) FROM audio_dataset_files WHERE category = 'normal'")
            normal_count = cursor.fetchone()[0] or 0

            cursor.execute("SELECT COUNT(*) FROM audio_dataset_files WHERE category = 'anomalous'")
            anomalous_count = cursor.fetchone()[0] or 0

            unlabeled_count = total_files - (normal_count + anomalous_count)

            return AudioDatasetStats(
                total_files=total_files,
                normal_samples=normal_count,
                anomalous_samples=anomalous_count,
                unlabeled_samples=unlabeled_count,
                total_duration_sec=round(float(total_duration), 2),
                avg_sample_rate=avg_sr,
                is_model_trained=is_trained,
                trained_sample_count=trained_count,
                model_trained_at=trained_at,
            )

    @staticmethod
    def save_analysis(pred: AudioAnomalyPrediction) -> None:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            import uuid
            analysis_id = f"aud-{uuid.uuid4().hex[:8]}"
            cursor.execute(
                """
                INSERT INTO audio_analyses (
                    analysis_id, file_id, filename, timestamp, is_anomaly,
                    status, anomaly_score, threshold_used, features_json, explanation, ground_truth
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    analysis_id,
                    pred.file_id,
                    pred.filename,
                    pred.timestamp,
                    1 if pred.is_anomaly else 0,
                    pred.status,
                    pred.anomaly_score,
                    pred.threshold_used,
                    pred.features.model_dump_json(),
                    pred.explanation,
                    pred.ground_truth,
                )
            )

    @staticmethod
    def list_analyses(limit: int = 50) -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM audio_analyses ORDER BY timestamp DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            results = []
            for r in rows:
                results.append({
                    "analysis_id": r["analysis_id"],
                    "file_id": r["file_id"],
                    "filename": r["filename"],
                    "timestamp": r["timestamp"],
                    "is_anomaly": bool(r["is_anomaly"]),
                    "status": r["status"],
                    "anomaly_score": r["anomaly_score"],
                    "threshold_used": r["threshold_used"],
                    "explanation": r["explanation"],
                    "ground_truth": r["ground_truth"],
                    "features": json.loads(r["features_json"]) if r["features_json"] else {},
                })
            return results

    @staticmethod
    def export_analyses_csv() -> str:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM audio_analyses ORDER BY timestamp DESC")
            rows = cursor.fetchall()

            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow([
                "Analysis ID",
                "Timestamp",
                "Filename",
                "Prediction Status",
                "Is Anomaly",
                "Anomaly Score",
                "Threshold Used",
                "Ground Truth",
                "RMS Energy",
                "Zero Crossing Rate",
                "Spectral Centroid (Hz)",
                "Spectral Rolloff (Hz)",
                "Spectral Bandwidth (Hz)",
                "Explanation"
            ])

            for r in rows:
                feat_dict = json.loads(r["features_json"]) if r["features_json"] else {}
                writer.writerow([
                    r["analysis_id"],
                    r["timestamp"],
                    r["filename"],
                    r["status"],
                    "Yes" if r["is_anomaly"] else "No",
                    r["anomaly_score"],
                    r["threshold_used"],
                    r["ground_truth"] or "N/A",
                    feat_dict.get("rms_energy", "N/A"),
                    feat_dict.get("zero_crossing_rate", "N/A"),
                    feat_dict.get("spectral_centroid", "N/A"),
                    feat_dict.get("spectral_rolloff", "N/A"),
                    feat_dict.get("spectral_bandwidth", "N/A"),
                    r["explanation"]
                ])

            return output.getvalue()
