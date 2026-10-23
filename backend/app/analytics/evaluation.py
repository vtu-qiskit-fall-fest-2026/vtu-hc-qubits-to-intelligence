"""QuantumGuard AI - Independent Performance Evaluation Engine

Conducts rigorous, leakage-free benchmark evaluations of Rule-Based, Statistical,
and Machine Learning anomaly detectors across held-out test scenarios.
Calculates precision, recall, F1, FPR, confusion matrices, and scenario-by-scenario breakdowns.
"""

import time
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Any, Tuple, Optional
import numpy as np
from pydantic import BaseModel, Field

from app.simulator.models import SimulationConfig, SimulationRunResult
from app.simulator.bb84 import BB84Simulator
from app.simulator.scenarios import SCENARIO_PRESETS
from app.analytics.features import extract_features, ObservableFeatures
from app.analytics.baseline import calibrate_baseline, BaselineCalibration
from app.analytics.detectors.rule_based import RuleBasedDetector
from app.analytics.detectors.statistical import StatisticalDetector
from app.analytics.detectors.ml_detector import MLIsolationForestDetector
from app.analytics.detectors.hybrid import HybridDetectionEngine


class ConfusionMatrix(BaseModel):
    true_positives: int
    false_positives: int
    true_negatives: int
    false_negatives: int
    total_samples: int


class DetectorMetrics(BaseModel):
    detector_name: str
    detector_type: str
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1_score: Optional[float] = None
    false_positive_rate: Optional[float] = None
    accuracy: float
    confusion_matrix: ConfusionMatrix
    avg_latency_ms: float


class ScenarioEvaluationSummary(BaseModel):
    scenario_id: str
    scenario_name: str
    ground_truth: str
    sample_count: int
    rule_detected_count: int
    stat_detected_count: int
    ml_detected_count: int
    hybrid_detected_count: int


class BenchmarkEvaluationReport(BaseModel):
    eval_id: str = Field(default_factory=lambda: f"eval-{uuid.uuid4().hex[:8]}")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    num_samples_evaluated: int
    num_calibration_samples: int
    num_training_samples: int
    detector_metrics: Dict[str, DetectorMetrics]
    scenario_breakdowns: List[ScenarioEvaluationSummary]
    baseline_id_used: str
    evaluation_notes: str = (
        "Evaluation conducted on strictly held-out simulation batches. "
        "Training data comprised only normal reference runs without ground-truth attack leakage."
    )


def compute_metrics_from_counts(tp: int, fp: int, tn: int, fn: int, latency_ms: float, name: str, det_type: str) -> DetectorMetrics:
    total = tp + fp + tn + fn
    accuracy = (tp + tn) / total if total > 0 else 0.0

    precision = (tp / (tp + fp)) if (tp + fp) > 0 else None
    recall = (tp / (tp + fn)) if (tp + fn) > 0 else None

    if precision is not None and recall is not None and (precision + recall) > 0:
        f1 = 2.0 * (precision * recall) / (precision + recall)
    else:
        f1 = None

    fpr = (fp / (fp + tn)) if (fp + tn) > 0 else None

    return DetectorMetrics(
        detector_name=name,
        detector_type=det_type,
        precision=round(precision, 4) if precision is not None else None,
        recall=round(recall, 4) if recall is not None else None,
        f1_score=round(f1, 4) if f1 is not None else None,
        false_positive_rate=round(fpr, 4) if fpr is not None else None,
        accuracy=round(accuracy, 4),
        confusion_matrix=ConfusionMatrix(
            true_positives=tp,
            false_positives=fp,
            true_negatives=tn,
            false_negatives=fn,
            total_samples=total
        ),
        avg_latency_ms=round(latency_ms, 3)
    )


class BenchmarkRunner:
    """Orchestrates independent synthetic dataset generation and multi-detector evaluation."""

    def __init__(self, runs_per_scenario: int = 5, base_seed: int = 42):
        self.runs_per_scenario = runs_per_scenario
        self.base_seed = base_seed

    def run_benchmark(self) -> BenchmarkEvaluationReport:
        """
        Execute full benchmark:
        1. Generate separate calibration dataset
        2. Calibrate baseline
        3. Generate separate training dataset & train ML Isolation Forest
        4. Generate strictly held-out test dataset
        5. Evaluate Rule-based, Statistical, and ML detectors on held-out test data
        6. Compute verifiable performance metrics
        """
        rng = np.random.default_rng(self.base_seed)

        # 1. Generate Calibration Dataset (only normal operational scenario)
        calibration_runs: List[SimulationRunResult] = []
        normal_config = SCENARIO_PRESETS["normal_background_noise"]["config"]
        for i in range(8):
            seed = int(rng.integers(100000, 999999))
            cfg = normal_config.model_copy(update={"random_seed": seed, "num_pulses": 1200})
            calibration_runs.append(BB84Simulator(cfg).run())

        baseline = calibrate_baseline(
            calibration_runs,
            name="Benchmark Reference Baseline",
            version="eval-1.0",
            sensitivity="medium"
        )

        # 2. Generate ML Training Dataset (strictly normal reference data, independent runs)
        ml_detector = MLIsolationForestDetector(contamination=0.04, random_state=int(rng.integers(1, 10000)))
        train_vectors = []
        for i in range(25):
            seed = int(rng.integers(100000, 999999))
            # Vary normal parameters slightly to prevent overfitting to a single exact noise value
            noise_v = float(rng.uniform(0.005, 0.025))
            loss_v = float(rng.uniform(0.05, 0.20))
            cfg = SimulationConfig(
                scenario_id="normal_train",
                scenario_name="Normal Training",
                num_pulses=1200,
                noise_prob=noise_v,
                loss_prob=loss_v,
                eve_prob=0.0,
                random_seed=seed
            )
            sim_res = BB84Simulator(cfg).run()
            feats = extract_features(sim_res.metrics, baseline)
            train_vectors.append(feats.to_vector())

        ml_detector.fit(np.array(train_vectors))

        rule_detector = RuleBasedDetector()
        stat_detector = StatisticalDetector(significance_alpha=0.01)
        hybrid_engine = HybridDetectionEngine(rule_detector, stat_detector, ml_detector)

        # 3. Generate Independent Held-Out Test Dataset across all scenarios
        test_samples: List[Tuple[SimulationRunResult, str]] = []  # (run, ground_truth)
        scenario_summaries: Dict[str, Dict[str, Any]] = {}

        for s_id, s_info in SCENARIO_PRESETS.items():
            base_cfg = s_info["config"]
            gt = s_info["ground_truth"]
            scenario_summaries[s_id] = {
                "id": s_id,
                "name": s_info["name"],
                "ground_truth": gt,
                "count": self.runs_per_scenario,
                "rule_hits": 0,
                "stat_hits": 0,
                "ml_hits": 0,
                "hybrid_hits": 0,
            }

            for r_idx in range(self.runs_per_scenario):
                seed = int(rng.integers(100000, 999999))
                # Add minor stochastic jitter to test generalization
                jitter_noise = max(0.0, base_cfg.noise_prob + float(rng.uniform(-0.003, 0.003))) if base_cfg.noise_prob > 0 else 0.0
                test_cfg = base_cfg.model_copy(update={
                    "random_seed": seed,
                    "noise_prob": jitter_noise
                })
                sim_res = BB84Simulator(test_cfg).run()
                test_samples.append((sim_res, gt))

        # 4. Evaluate each detector on the held-out test data
        tp_r, fp_r, tn_r, fn_r = 0, 0, 0, 0
        tp_s, fp_s, tn_s, fn_s = 0, 0, 0, 0
        tp_m, fp_m, tn_m, fn_m = 0, 0, 0, 0
        tp_h, fp_h, tn_h, fn_h = 0, 0, 0, 0

        rule_times, stat_times, ml_times, hybrid_times = [], [], [], []

        for run_res, ground_truth in test_samples:
            s_id = run_res.config.scenario_id
            feats = extract_features(run_res.metrics, baseline)
            is_positive = (ground_truth == "anomaly")

            # A. Rule Detector
            t0 = time.perf_counter()
            v_r = rule_detector.detect(feats, baseline)
            rule_times.append((time.perf_counter() - t0) * 1000.0)
            pred_r = v_r.is_anomaly
            if pred_r:
                if s_id in scenario_summaries:
                    scenario_summaries[s_id]["rule_hits"] += 1
                if is_positive:
                    tp_r += 1
                else:
                    fp_r += 1
            else:
                if is_positive:
                    fn_r += 1
                else:
                    tn_r += 1

            # B. Statistical Detector
            t0 = time.perf_counter()
            v_s = stat_detector.detect(feats, baseline)
            stat_times.append((time.perf_counter() - t0) * 1000.0)
            pred_s = v_s.is_anomaly
            if pred_s:
                if s_id in scenario_summaries:
                    scenario_summaries[s_id]["stat_hits"] += 1
                if is_positive:
                    tp_s += 1
                else:
                    fp_s += 1
            else:
                if is_positive:
                    fn_s += 1
                else:
                    tn_s += 1

            # C. ML Detector
            t0 = time.perf_counter()
            v_m = ml_detector.detect(feats, baseline)
            ml_times.append((time.perf_counter() - t0) * 1000.0)
            pred_m = v_m.is_anomaly
            if pred_m:
                if s_id in scenario_summaries:
                    scenario_summaries[s_id]["ml_hits"] += 1
                if is_positive:
                    tp_m += 1
                else:
                    fp_m += 1
            else:
                if is_positive:
                    fn_m += 1
                else:
                    tn_m += 1

            # D. Hybrid Engine
            t0 = time.perf_counter()
            v_h = hybrid_engine.analyze(feats, baseline)
            hybrid_times.append((time.perf_counter() - t0) * 1000.0)
            pred_h = v_h.is_anomaly
            if pred_h:
                if s_id in scenario_summaries:
                    scenario_summaries[s_id]["hybrid_hits"] += 1
                if is_positive:
                    tp_h += 1
                else:
                    fp_h += 1
            else:
                if is_positive:
                    fn_h += 1
                else:
                    tn_h += 1

        # Calculate metrics
        detector_metrics = {
            "rule_based": compute_metrics_from_counts(
                tp_r, fp_r, tn_r, fn_r, float(np.mean(rule_times)), "Rule-Based Detector", "rule_based"
            ),
            "statistical": compute_metrics_from_counts(
                tp_s, fp_s, tn_s, fn_s, float(np.mean(stat_times)), "Statistical Hypothesis Detector", "statistical"
            ),
            "machine_learning": compute_metrics_from_counts(
                tp_m, fp_m, tn_m, fn_m, float(np.mean(ml_times)), "Unsupervised Isolation Forest", "machine_learning"
            ),
            "hybrid": compute_metrics_from_counts(
                tp_h, fp_h, tn_h, fn_h, float(np.mean(hybrid_times)), "Hybrid Multi-Engine Fusion", "hybrid"
            ),
        }

        breakdowns = [
            ScenarioEvaluationSummary(
                scenario_id=s["id"],
                scenario_name=s["name"],
                ground_truth=s["ground_truth"],
                sample_count=s["count"],
                rule_detected_count=s["rule_hits"],
                stat_detected_count=s["stat_hits"],
                ml_detected_count=s["ml_hits"],
                hybrid_detected_count=s["hybrid_hits"],
            )
            for s in scenario_summaries.values()
        ]

        return BenchmarkEvaluationReport(
            num_samples_evaluated=len(test_samples),
            num_calibration_samples=len(calibration_runs),
            num_training_samples=len(train_vectors),
            detector_metrics=detector_metrics,
            scenario_breakdowns=breakdowns,
            baseline_id_used=baseline.baseline_id,
        )
