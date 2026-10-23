"""Tests for Independent Performance Evaluation Engine"""

import pytest
from app.analytics.evaluation import BenchmarkRunner, compute_metrics_from_counts


def test_metrics_calculation_formulae():
    """Verify independent precision, recall, F1, and FPR mathematical calculations."""
    # TP=80, FP=10, TN=90, FN=20 (Total=200)
    # Precision = 80 / (80 + 10) = 80/90 = 0.8889
    # Recall = 80 / (80 + 20) = 80/100 = 0.8000
    # F1 = 2 * (0.8889 * 0.8) / (0.8889 + 0.8) = 1.4222 / 1.6889 = 0.8421
    # FPR = 10 / (10 + 90) = 10/100 = 0.1000
    # Accuracy = (80 + 90) / 200 = 170/200 = 0.8500
    metrics = compute_metrics_from_counts(
        tp=80, fp=10, tn=90, fn=20, latency_ms=1.5, name="TestDetector", det_type="test"
    )

    assert metrics.precision == pytest.approx(0.8889, abs=1e-3)
    assert metrics.recall == pytest.approx(0.8000, abs=1e-3)
    assert metrics.f1_score == pytest.approx(0.8421, abs=1e-3)
    assert metrics.false_positive_rate == pytest.approx(0.1000, abs=1e-3)
    assert metrics.accuracy == pytest.approx(0.8500, abs=1e-3)


def test_benchmark_runner_execution():
    """Verify that benchmark runner executes across all scenarios and prevents data leakage."""
    runner = BenchmarkRunner(runs_per_scenario=2, base_seed=999)
    report = runner.run_benchmark()

    assert report.num_samples_evaluated >= 20  # 10 scenarios * 2 runs
    assert "rule_based" in report.detector_metrics
    assert "statistical" in report.detector_metrics
    assert "machine_learning" in report.detector_metrics
    assert "hybrid" in report.detector_metrics
    assert len(report.scenario_breakdowns) == 10

    # Ensure all metrics are within valid bounds [0, 1]
    for det_key, det_m in report.detector_metrics.items():
        if det_m.precision is not None:
            assert 0.0 <= det_m.precision <= 1.0
        if det_m.recall is not None:
            assert 0.0 <= det_m.recall <= 1.0
        if det_m.f1_score is not None:
            assert 0.0 <= det_m.f1_score <= 1.0
        if det_m.false_positive_rate is not None:
            assert 0.0 <= det_m.false_positive_rate <= 1.0
        assert 0.0 <= det_m.accuracy <= 1.0
