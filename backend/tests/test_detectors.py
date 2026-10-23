"""Unit Tests for Rule-Based, Statistical, and ML Detectors"""

import pytest
import numpy as np

from app.simulator.models import SimulationConfig
from app.simulator.bb84 import BB84Simulator
from app.analytics.features import extract_features, ObservableFeatures
from app.analytics.baseline import calibrate_baseline
from app.analytics.detectors.rule_based import RuleBasedDetector
from app.analytics.detectors.statistical import StatisticalDetector
from app.analytics.detectors.ml_detector import MLIsolationForestDetector
from app.analytics.detectors.hybrid import HybridDetectionEngine


@pytest.fixture
def calibrated_baseline():
    runs = []
    for i in range(6):
        cfg = SimulationConfig(
            scenario_id="cal_normal",
            num_pulses=1200,
            noise_prob=0.015,
            loss_prob=0.10,
            eve_prob=0.0,
            random_seed=300 + i
        )
        runs.append(BB84Simulator(cfg).run())
    return calibrate_baseline(runs, name="Test Cal Baseline")


def test_rule_detector_normal_and_anomaly(calibrated_baseline):
    detector = RuleBasedDetector()

    # 1. Normal run
    normal_cfg = SimulationConfig(num_pulses=1000, noise_prob=0.015, loss_prob=0.10, eve_prob=0.0, random_seed=777)
    normal_run = BB84Simulator(normal_cfg).run()
    f_norm = extract_features(normal_run.metrics, calibrated_baseline)
    v_norm = detector.detect(f_norm, calibrated_baseline)
    assert v_norm.is_anomaly is False
    assert v_norm.status == "NORMAL"

    # 2. Shor-Preskill excursion (QBER > 11%)
    attack_cfg = SimulationConfig(num_pulses=1000, noise_prob=0.01, loss_prob=0.10, eve_prob=0.80, random_seed=888)
    attack_run = BB84Simulator(attack_cfg).run()
    f_att = extract_features(attack_run.metrics, calibrated_baseline)
    v_att = detector.detect(f_att, calibrated_baseline)
    assert v_att.is_anomaly is True
    assert v_att.status == "INVESTIGATION REQUIRED"
    assert any("Shor-Preskill" in r or "exceeds" in r for r in v_att.trigger_reasons)


def test_statistical_detector_binomial_z_test(calibrated_baseline):
    detector = StatisticalDetector(significance_alpha=0.01)

    # 1. Normal run: should not reject H0
    norm_cfg = SimulationConfig(num_pulses=1500, noise_prob=0.015, loss_prob=0.10, eve_prob=0.0, random_seed=444)
    norm_run = BB84Simulator(norm_cfg).run()
    f_norm = extract_features(norm_run.metrics, calibrated_baseline)
    v_norm = detector.detect(f_norm, calibrated_baseline)
    assert v_norm.is_anomaly is False
    assert v_norm.status == "NORMAL"
    assert v_norm.statistical_details["p_value"] > 0.01

    # 2. Partial eavesdropping (Eve=40% -> QBER ~11%): should reject H0
    att_cfg = SimulationConfig(num_pulses=1500, noise_prob=0.01, loss_prob=0.10, eve_prob=0.40, random_seed=555)
    att_run = BB84Simulator(att_cfg).run()
    f_att = extract_features(att_run.metrics, calibrated_baseline)
    v_att = detector.detect(f_att, calibrated_baseline)
    assert v_att.is_anomaly is True
    assert v_att.statistical_details["p_value"] < 0.01
    assert v_att.statistical_details["binomial_z_score"] > 3.0


def test_statistical_detector_insufficient_data():
    """Verify small sample size (<30 test bits) returns INSUFFICIENT DATA."""
    detector = StatisticalDetector()
    f_small = ObservableFeatures(
        qber=0.03,
        detection_rate=0.8,
        photon_loss_rate=0.2,
        sifted_ratio=0.5,
        test_bits_count=12,  # < 30
        error_count=1,
        sample_size_sufficient=False,
    )
    v = detector.detect(f_small)
    assert v.status == "INSUFFICIENT DATA"
    assert v.is_anomaly is False


def test_ml_isolation_forest(calibrated_baseline):
    """Verify ML Isolation Forest trains on normal runs and flags high anomalies."""
    ml = MLIsolationForestDetector(contamination=0.05, random_state=42)

    # Train on 20 normal reference runs
    train_vecs = []
    for i in range(20):
        cfg = SimulationConfig(num_pulses=800, noise_prob=0.015, loss_prob=0.10, random_seed=1000 + i)
        r = BB84Simulator(cfg).run()
        train_vecs.append(extract_features(r.metrics, calibrated_baseline).to_vector())

    ml.fit(np.array(train_vecs))
    assert ml.is_trained is True

    # Test on normal
    test_norm = BB84Simulator(SimulationConfig(num_pulses=800, noise_prob=0.015, loss_prob=0.10, random_seed=2000)).run()
    f_norm = extract_features(test_norm.metrics, calibrated_baseline)
    v_norm = ml.detect(f_norm, calibrated_baseline)
    assert v_norm.is_anomaly is False

    # Test on extreme attack
    test_att = BB84Simulator(SimulationConfig(num_pulses=800, noise_prob=0.01, loss_prob=0.10, eve_prob=0.90, random_seed=3000)).run()
    f_att = extract_features(test_att.metrics, calibrated_baseline)
    v_att = ml.detect(f_att, calibrated_baseline)
    assert v_att.is_anomaly is True
    assert v_att.confidence_score > 0.50
