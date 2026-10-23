"""QuantumGuard AI - SQLite Database Connection and Schema Initialization"""

import sqlite3
import os
from pathlib import Path
from contextlib import contextmanager

# Default database path
DB_DIR = Path(__file__).resolve().parent.parent.parent / "data"
DB_PATH = DB_DIR / "quantumguard.db"


def get_db_path() -> Path:
    """Return database path and ensure directory exists."""
    DB_DIR.mkdir(parents=True, exist_ok=True)
    return DB_PATH


def init_db(db_file: Path = None) -> None:
    """Initialize database tables and indexes."""
    path = db_file or get_db_path()
    conn = sqlite3.connect(path)
    cursor = conn.cursor()

    # Enable WAL mode for better concurrency and foreign keys
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA foreign_keys=ON;")

    # 1. Simulation Runs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS simulation_runs (
        run_id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        scenario_id TEXT NOT NULL,
        scenario_name TEXT NOT NULL,
        ground_truth_label TEXT NOT NULL,
        qber REAL,
        detection_rate REAL NOT NULL,
        photon_loss_rate REAL NOT NULL,
        sifted_bits_count INTEGER NOT NULL,
        test_bits_count INTEGER NOT NULL,
        config_json TEXT NOT NULL,
        metrics_json TEXT NOT NULL,
        sample_pulses_json TEXT NOT NULL
    );
    """)

    # 2. Baselines Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS baselines (
        baseline_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        version TEXT NOT NULL,
        created_at TEXT NOT NULL,
        calibration_scenario TEXT NOT NULL,
        num_runs INTEGER NOT NULL,
        total_test_bits INTEGER NOT NULL,
        mean_qber REAL NOT NULL,
        std_qber REAL NOT NULL,
        qber_upper_threshold REAL NOT NULL,
        mean_detection_rate REAL NOT NULL,
        mean_loss_rate REAL NOT NULL,
        sensitivity TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        full_json TEXT NOT NULL
    );
    """)

    # 3. Security Alerts Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS security_alerts (
        alert_id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        severity TEXT NOT NULL,
        status TEXT NOT NULL,
        detector_type TEXT NOT NULL,
        explanation TEXT NOT NULL,
        recommended_next_step TEXT NOT NULL,
        acknowledged INTEGER NOT NULL DEFAULT 0,
        full_json TEXT NOT NULL,
        FOREIGN KEY (run_id) REFERENCES simulation_runs(run_id) ON DELETE CASCADE
    );
    """)

    # 4. Independent Evaluations Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS evaluations (
        eval_id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        num_samples INTEGER NOT NULL,
        full_json TEXT NOT NULL
    );
    """)

    # 5. Audio Dataset Files Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audio_dataset_files (
        file_id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        file_size_bytes INTEGER NOT NULL,
        duration_sec REAL NOT NULL,
        sample_rate INTEGER NOT NULL,
        channels INTEGER NOT NULL,
        category TEXT NOT NULL DEFAULT 'unlabeled',
        uploaded_at TEXT NOT NULL,
        features_json TEXT
    );
    """)

    # 6. Audio Analysis Records Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audio_analyses (
        analysis_id TEXT PRIMARY KEY,
        file_id TEXT,
        filename TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        is_anomaly INTEGER NOT NULL,
        status TEXT NOT NULL,
        anomaly_score REAL NOT NULL,
        threshold_used REAL NOT NULL,
        features_json TEXT NOT NULL,
        explanation TEXT NOT NULL,
        ground_truth TEXT
    );
    """)

    # 7. Audio Model State Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audio_model_state (
        model_id TEXT PRIMARY KEY,
        trained_at TEXT NOT NULL,
        training_sample_count INTEGER NOT NULL,
        contamination REAL NOT NULL,
        feature_names_json TEXT NOT NULL,
        model_binary BLOB
    );
    """)

    # Create indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_runs_timestamp ON simulation_runs(timestamp DESC);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_runs_scenario ON simulation_runs(scenario_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON security_alerts(timestamp DESC);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_run_id ON security_alerts(run_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_baselines_active ON baselines(is_active);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audio_category ON audio_dataset_files(category);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audio_uploaded ON audio_dataset_files(uploaded_at DESC);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audio_analyses_time ON audio_analyses(timestamp DESC);")

    conn.commit()
    conn.close()


@contextmanager
def get_db_connection(db_file: Path = None):
    """Context manager for SQLite connections."""
    path = db_file or get_db_path()
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
