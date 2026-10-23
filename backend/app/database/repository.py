"""QuantumGuard AI - Database Repository Operations"""

import json
from typing import List, Optional, Dict, Any

from app.database.db import get_db_connection
from app.simulator.models import SimulationRunResult, SimulationConfig, SimulationMetrics, PulseDetail
from app.analytics.baseline import BaselineCalibration
from app.analytics.alerts import SecurityAlert


class DatabaseRepository:
    """Provides validated CRUD operations for simulation records, baselines, and alerts."""

    # --- Simulation Runs ---

    @staticmethod
    def save_run(run: SimulationRunResult) -> None:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT OR REPLACE INTO simulation_runs (
                    run_id, timestamp, scenario_id, scenario_name, ground_truth_label,
                    qber, detection_rate, photon_loss_rate, sifted_bits_count, test_bits_count,
                    config_json, metrics_json, sample_pulses_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run.run_id,
                    run.timestamp,
                    run.config.scenario_id,
                    run.config.scenario_name,
                    run.ground_truth_label,
                    run.metrics.qber,
                    run.metrics.detection_rate,
                    run.metrics.photon_loss_rate,
                    run.metrics.sifted_bits_count,
                    run.metrics.test_bits_count,
                    run.config.model_dump_json(),
                    run.metrics.model_dump_json(),
                    json.dumps([p.model_dump() for p in run.sample_pulses]),
                )
            )

    @staticmethod
    def get_run(run_id: str) -> Optional[SimulationRunResult]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM simulation_runs WHERE run_id = ?", (run_id,))
            row = cursor.fetchone()
            if not row:
                return None

            config_dict = json.loads(row["config_json"])
            metrics_dict = json.loads(row["metrics_json"])
            pulses_dict = json.loads(row["sample_pulses_json"])

            return SimulationRunResult(
                run_id=row["run_id"],
                timestamp=row["timestamp"],
                config=SimulationConfig(**config_dict),
                metrics=SimulationMetrics(**metrics_dict),
                sample_pulses=[PulseDetail(**p) for p in pulses_dict],
                ground_truth_label=row["ground_truth_label"],
                ground_truth_category=row["scenario_id"],
            )

    @staticmethod
    def list_runs(limit: int = 50, scenario_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            if scenario_id:
                cursor.execute(
                    """
                    SELECT run_id, timestamp, scenario_id, scenario_name, ground_truth_label,
                           qber, detection_rate, photon_loss_rate, sifted_bits_count, test_bits_count
                    FROM simulation_runs WHERE scenario_id = ? ORDER BY timestamp DESC LIMIT ?
                    """,
                    (scenario_id, limit)
                )
            else:
                cursor.execute(
                    """
                    SELECT run_id, timestamp, scenario_id, scenario_name, ground_truth_label,
                           qber, detection_rate, photon_loss_rate, sifted_bits_count, test_bits_count
                    FROM simulation_runs ORDER BY timestamp DESC LIMIT ?
                    """,
                    (limit,)
                )
            rows = cursor.fetchall()
            return [dict(r) for r in rows]

    # --- Baselines ---

    @staticmethod
    def save_baseline(baseline: BaselineCalibration, set_active: bool = True) -> None:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            if set_active:
                cursor.execute("UPDATE baselines SET is_active = 0")

            cursor.execute(
                """
                INSERT OR REPLACE INTO baselines (
                    baseline_id, name, version, created_at, calibration_scenario,
                    num_runs, total_test_bits, mean_qber, std_qber, qber_upper_threshold,
                    mean_detection_rate, mean_loss_rate, sensitivity, is_active, full_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    baseline.baseline_id,
                    baseline.name,
                    baseline.version,
                    baseline.created_at,
                    baseline.calibration_scenario,
                    baseline.num_runs,
                    baseline.total_test_bits,
                    baseline.mean_qber,
                    baseline.std_qber,
                    baseline.qber_upper_threshold,
                    baseline.mean_detection_rate,
                    baseline.mean_loss_rate,
                    baseline.sensitivity,
                    1 if set_active else 0,
                    baseline.model_dump_json(),
                )
            )

    @staticmethod
    def get_active_baseline() -> Optional[BaselineCalibration]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT full_json FROM baselines WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1")
            row = cursor.fetchone()
            if not row:
                return None
            return BaselineCalibration(**json.loads(row["full_json"]))

    @staticmethod
    def list_baselines() -> List[BaselineCalibration]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT full_json FROM baselines ORDER BY created_at DESC")
            rows = cursor.fetchall()
            return [BaselineCalibration(**json.loads(r["full_json"])) for r in rows]

    # --- Security Alerts ---

    @staticmethod
    def save_alert(alert: SecurityAlert) -> None:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT OR REPLACE INTO security_alerts (
                    alert_id, run_id, timestamp, severity, status, detector_type,
                    explanation, recommended_next_step, acknowledged, full_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    alert.alert_id,
                    alert.run_id,
                    alert.timestamp,
                    alert.severity,
                    alert.status,
                    alert.detector_type,
                    alert.explanation,
                    alert.recommended_next_step,
                    1 if alert.acknowledged else 0,
                    alert.model_dump_json(),
                )
            )

    @staticmethod
    def list_alerts(limit: int = 50, status_filter: Optional[str] = None) -> List[SecurityAlert]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            if status_filter:
                cursor.execute(
                    "SELECT full_json FROM security_alerts WHERE status = ? ORDER BY timestamp DESC LIMIT ?",
                    (status_filter, limit)
                )
            else:
                cursor.execute(
                    "SELECT full_json FROM security_alerts ORDER BY timestamp DESC LIMIT ?",
                    (limit,)
                )
            rows = cursor.fetchall()
            return [SecurityAlert(**json.loads(r["full_json"])) for r in rows]

    @staticmethod
    def acknowledge_alert(alert_id: str) -> bool:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT full_json FROM security_alerts WHERE alert_id = ?", (alert_id,))
            row = cursor.fetchone()
            if not row:
                return False

            alert_data = json.loads(row["full_json"])
            alert_data["acknowledged"] = True

            cursor.execute(
                "UPDATE security_alerts SET acknowledged = 1, full_json = ? WHERE alert_id = ?",
                (json.dumps(alert_data), alert_id)
            )
            return True

    # --- Evaluations ---

    @staticmethod
    def save_evaluation(eval_id: str, timestamp: str, num_samples: int, full_data: Dict[str, Any]) -> None:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO evaluations (eval_id, timestamp, num_samples, full_json) VALUES (?, ?, ?, ?)",
                (eval_id, timestamp, num_samples, json.dumps(full_data))
            )

    @staticmethod
    def get_latest_evaluation() -> Optional[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT full_json FROM evaluations ORDER BY timestamp DESC LIMIT 1")
            row = cursor.fetchone()
            if not row:
                return None
            return json.loads(row["full_json"])
